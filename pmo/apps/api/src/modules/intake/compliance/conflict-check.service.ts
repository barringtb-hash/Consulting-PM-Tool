/**
 * Conflict Check Service
 *
 * Performs conflict of interest checks for legal and professional services.
 * Checks new intake submissions against existing clients, matters, and contacts.
 */

import { prisma } from '../../../prisma/client';

// ============================================================================
// TYPES
// ============================================================================

export type ConflictSeverity = 'none' | 'low' | 'medium' | 'high' | 'blocking';

export interface ConflictMatch {
  type: 'account' | 'contact' | 'opportunity' | 'matter';
  id: number;
  name: string;
  matchField: string;
  matchValue: string;
  similarity: number;
  severity: ConflictSeverity;
  notes?: string;
}

export interface ConflictCheckResult {
  hasConflicts: boolean;
  severity: ConflictSeverity;
  matches: ConflictMatch[];
  recommendations: string[];
  checkedAt: Date;
  searchCriteria: string[];
}

export interface ConflictCheckConfig {
  checkAccounts: boolean;
  checkContacts: boolean;
  checkOpportunities: boolean;
  checkAdverseParties: boolean;
  minimumSimilarity: number;
  includeArchived: boolean;
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: ConflictCheckConfig = {
  checkAccounts: true,
  checkContacts: true,
  checkOpportunities: true,
  checkAdverseParties: true,
  minimumSimilarity: 0.7,
  includeArchived: false,
};

// ============================================================================
// MAIN CONFLICT CHECK FUNCTIONS
// ============================================================================

/**
 * Perform comprehensive conflict check for an intake submission
 */
export async function checkForConflicts(
  submissionId: number,
  config?: Partial<ConflictCheckConfig>,
): Promise<ConflictCheckResult> {
  const checkConfig = { ...DEFAULT_CONFIG, ...config };

  // Get submission data including client for tenantId
  const submission = await prisma.intakeSubmission.findUnique({
    where: { id: submissionId },
    include: {
      config: {
        include: {
          client: true,
        },
      },
    },
  });

  if (!submission) {
    throw new Error('Submission not found');
  }

  const formData = (submission.formData as Record<string, unknown>) || {};

  // Get tenantId from Client
  const client = submission.config.client;
  if (!client?.tenantId) {
    throw new Error('No tenant associated with intake config');
  }
  const tenantId = client.tenantId;

  // Extract search criteria from form data
  const searchCriteria = extractSearchCriteria(formData);

  if (searchCriteria.length === 0) {
    return {
      hasConflicts: false,
      severity: 'none',
      matches: [],
      recommendations: ['No identifiable parties found in submission'],
      checkedAt: new Date(),
      searchCriteria: [],
    };
  }

  const matches: ConflictMatch[] = [];

  // Check against existing accounts
  if (checkConfig.checkAccounts) {
    const accountMatches = await checkAgainstAccounts(
      tenantId,
      searchCriteria,
      checkConfig,
    );
    matches.push(...accountMatches);
  }

  // Check against existing contacts
  if (checkConfig.checkContacts) {
    const contactMatches = await checkAgainstContacts(
      tenantId,
      searchCriteria,
      checkConfig,
    );
    matches.push(...contactMatches);
  }

  // Check against opportunities/matters
  if (checkConfig.checkOpportunities) {
    const opportunityMatches = await checkAgainstOpportunities(
      tenantId,
      searchCriteria,
      checkConfig,
    );
    matches.push(...opportunityMatches);
  }

  // Check against adverse parties (custom field in form data)
  if (checkConfig.checkAdverseParties) {
    const adverseMatches = await checkAdverseParties(
      tenantId,
      formData,
      checkConfig,
    );
    matches.push(...adverseMatches);
  }

  // Determine overall severity
  const severity = determineOverallSeverity(matches);

  // Generate recommendations
  const recommendations = generateRecommendations(matches, severity);

  return {
    hasConflicts: matches.length > 0,
    severity,
    matches,
    recommendations,
    checkedAt: new Date(),
    searchCriteria,
  };
}

/**
 * Quick conflict check using just names
 */
export async function quickConflictCheck(
  tenantId: string,
  names: string[],
): Promise<{ hasConflicts: boolean; matchCount: number }> {
  if (names.length === 0) {
    return { hasConflicts: false, matchCount: 0 };
  }

  let matchCount = 0;

  for (const name of names) {
    const normalizedName = normalizeName(name);
    if (!normalizedName) continue;

    // Check accounts
    const accountCount = await prisma.account.count({
      where: {
        tenantId,
        name: { contains: normalizedName, mode: 'insensitive' },
      },
    });
    matchCount += accountCount;

    // Check contacts
    const contactCount = await prisma.cRMContact.count({
      where: {
        tenantId,
        OR: [
          { firstName: { contains: normalizedName, mode: 'insensitive' } },
          { lastName: { contains: normalizedName, mode: 'insensitive' } },
        ],
      },
    });
    matchCount += contactCount;
  }

  return {
    hasConflicts: matchCount > 0,
    matchCount,
  };
}

// ============================================================================
// SEARCH CRITERIA EXTRACTION
// ============================================================================

/**
 * Extract searchable names and identifiers from form data
 */
function extractSearchCriteria(formData: Record<string, unknown>): string[] {
  const criteria: string[] = [];
  const seenNormalized = new Set<string>();

  // Fields that typically contain names to check
  const nameFields = [
    'full_name',
    'name',
    'client_name',
    'contact_name',
    'company_name',
    'business_name',
    'organization',
    'first_name',
    'last_name',
    'opposing_party',
    'adverse_party',
    'defendant',
    'plaintiff',
    'other_parties',
    'related_parties',
    'spouse_name',
    'partner_name',
  ];

  for (const field of nameFields) {
    const value = formData[field];
    if (typeof value === 'string' && value.trim()) {
      const normalized = normalizeName(value);
      if (normalized && !seenNormalized.has(normalized)) {
        criteria.push(value.trim());
        seenNormalized.add(normalized);
      }
    }
  }

  // Check for arrays of parties
  const partyArrayFields = [
    'parties',
    'defendants',
    'plaintiffs',
    'other_parties',
  ];
  for (const field of partyArrayFields) {
    const value = formData[field];
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string' && item.trim()) {
          const normalized = normalizeName(item);
          if (normalized && !seenNormalized.has(normalized)) {
            criteria.push(item.trim());
            seenNormalized.add(normalized);
          }
        }
      }
    }
  }

  return criteria;
}

/**
 * Normalize a name for comparison
 */
function normalizeName(name: string): string | null {
  if (!name) return null;

  const normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Skip very short names or common words
  if (normalized.length < 3) return null;
  if (['the', 'inc', 'llc', 'corp', 'ltd'].includes(normalized)) return null;

  return normalized;
}

// ============================================================================
// CHECK FUNCTIONS
// ============================================================================

/**
 * Check against existing accounts
 */
async function checkAgainstAccounts(
  tenantId: string,
  criteria: string[],
  config: ConflictCheckConfig,
): Promise<ConflictMatch[]> {
  const matches: ConflictMatch[] = [];

  for (const criterion of criteria) {
    const normalizedCriterion = normalizeName(criterion);
    if (!normalizedCriterion) continue;

    const accounts = await prisma.account.findMany({
      where: {
        tenantId,
        name: { contains: normalizedCriterion, mode: 'insensitive' },
        ...(config.includeArchived ? {} : { archived: false }),
      },
      take: 10,
    });

    for (const account of accounts) {
      const similarity = calculateSimilarity(
        normalizedCriterion,
        normalizeName(account.name) || '',
      );

      if (similarity >= config.minimumSimilarity) {
        matches.push({
          type: 'account',
          id: account.id,
          name: account.name,
          matchField: 'name',
          matchValue: criterion,
          similarity,
          severity: determineSeverity(similarity, 'account'),
          notes: `Existing account with ${Math.round(similarity * 100)}% name match`,
        });
      }
    }
  }

  return matches;
}

/**
 * Check against existing contacts
 */
async function checkAgainstContacts(
  tenantId: string,
  criteria: string[],
  config: ConflictCheckConfig,
): Promise<ConflictMatch[]> {
  const matches: ConflictMatch[] = [];

  for (const criterion of criteria) {
    const normalizedCriterion = normalizeName(criterion);
    if (!normalizedCriterion) continue;

    // Split criterion into parts for first/last name matching
    const parts = criterion.split(' ');
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ');

    const contacts = await prisma.cRMContact.findMany({
      where: {
        tenantId,
        OR: [
          {
            AND: [
              { firstName: { contains: firstName, mode: 'insensitive' } },
              lastName
                ? { lastName: { contains: lastName, mode: 'insensitive' } }
                : {},
            ],
          },
          { firstName: { contains: normalizedCriterion, mode: 'insensitive' } },
          { lastName: { contains: normalizedCriterion, mode: 'insensitive' } },
        ],
      },
      include: {
        account: {
          select: { name: true },
        },
      },
      take: 10,
    });

    for (const contact of contacts) {
      const fullName = `${contact.firstName} ${contact.lastName}`.trim();
      const similarity = calculateSimilarity(
        normalizedCriterion,
        normalizeName(fullName) || '',
      );

      if (similarity >= config.minimumSimilarity) {
        matches.push({
          type: 'contact',
          id: contact.id,
          name: fullName,
          matchField: 'name',
          matchValue: criterion,
          similarity,
          severity: determineSeverity(similarity, 'contact'),
          notes: contact.account
            ? `Contact at ${contact.account.name} with ${Math.round(similarity * 100)}% match`
            : `Contact with ${Math.round(similarity * 100)}% name match`,
        });
      }
    }
  }

  return matches;
}

/**
 * Check against existing opportunities
 */
async function checkAgainstOpportunities(
  tenantId: string,
  criteria: string[],
  config: ConflictCheckConfig,
): Promise<ConflictMatch[]> {
  const matches: ConflictMatch[] = [];

  for (const criterion of criteria) {
    const normalizedCriterion = normalizeName(criterion);
    if (!normalizedCriterion) continue;

    const opportunities = await prisma.opportunity.findMany({
      where: {
        tenantId,
        OR: [
          { name: { contains: normalizedCriterion, mode: 'insensitive' } },
          {
            description: { contains: normalizedCriterion, mode: 'insensitive' },
          },
        ],
      },
      include: {
        account: {
          select: { name: true },
        },
      },
      take: 10,
    });

    for (const opp of opportunities) {
      const similarity = calculateSimilarity(
        normalizedCriterion,
        normalizeName(opp.name) || '',
      );

      if (similarity >= config.minimumSimilarity) {
        matches.push({
          type: 'opportunity',
          id: opp.id,
          name: opp.name,
          matchField: 'name',
          matchValue: criterion,
          similarity,
          severity: determineSeverity(similarity, 'opportunity'),
          notes: opp.account
            ? `Matter for ${opp.account.name} with ${Math.round(similarity * 100)}% match`
            : `Opportunity/Matter with ${Math.round(similarity * 100)}% match`,
        });
      }
    }
  }

  return matches;
}

/**
 * Check for adverse party conflicts
 */
async function checkAdverseParties(
  tenantId: string,
  formData: Record<string, unknown>,
  config: ConflictCheckConfig,
): Promise<ConflictMatch[]> {
  const matches: ConflictMatch[] = [];

  // Extract adverse parties from form data
  const adversePartyFields = [
    'opposing_party',
    'adverse_party',
    'defendant',
    'defendants',
    'other_side',
    'opposing_counsel',
    'other_parties',
  ];

  const adverseParties: string[] = [];
  for (const field of adversePartyFields) {
    const value = formData[field];
    if (typeof value === 'string' && value.trim()) {
      adverseParties.push(value.trim());
    } else if (Array.isArray(value)) {
      adverseParties.push(...value.filter((v) => typeof v === 'string'));
    }
  }

  // Check each adverse party against existing clients
  for (const party of adverseParties) {
    const normalizedParty = normalizeName(party);
    if (!normalizedParty) continue;

    // Check if adverse party is an existing client
    const accounts = await prisma.account.findMany({
      where: {
        tenantId,
        type: 'CUSTOMER', // Current clients
        name: { contains: normalizedParty, mode: 'insensitive' },
      },
      take: 5,
    });

    for (const account of accounts) {
      const similarity = calculateSimilarity(
        normalizedParty,
        normalizeName(account.name) || '',
      );

      if (similarity >= config.minimumSimilarity) {
        matches.push({
          type: 'account',
          id: account.id,
          name: account.name,
          matchField: 'adverse_party',
          matchValue: party,
          similarity,
          severity: 'blocking', // Adverse party matches are always blocking
          notes: `ADVERSE PARTY: "${party}" matches existing client "${account.name}"`,
        });
      }
    }
  }

  return matches;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate similarity between two strings (Jaccard similarity)
 */
function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;

  const set1 = new Set(str1.toLowerCase().split(''));
  const set2 = new Set(str2.toLowerCase().split(''));

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

/**
 * Determine severity of a match
 */
function determineSeverity(
  similarity: number,
  _matchType: 'account' | 'contact' | 'opportunity' | 'matter',
): ConflictSeverity {
  if (similarity >= 0.95) return 'high';
  if (similarity >= 0.85) return 'medium';
  if (similarity >= 0.7) return 'low';
  return 'none';
}

/**
 * Determine overall severity from all matches
 */
function determineOverallSeverity(matches: ConflictMatch[]): ConflictSeverity {
  if (matches.length === 0) return 'none';

  if (matches.some((m) => m.severity === 'blocking')) return 'blocking';
  if (matches.some((m) => m.severity === 'high')) return 'high';
  if (matches.some((m) => m.severity === 'medium')) return 'medium';
  if (matches.some((m) => m.severity === 'low')) return 'low';

  return 'none';
}

/**
 * Generate recommendations based on matches
 */
function generateRecommendations(
  matches: ConflictMatch[],
  severity: ConflictSeverity,
): string[] {
  const recommendations: string[] = [];

  if (severity === 'blocking') {
    recommendations.push(
      'STOP: Potential conflict with adverse party detected',
    );
    recommendations.push('Immediate review by supervising attorney required');
    recommendations.push('Do not proceed until conflict is cleared');
  } else if (severity === 'high') {
    recommendations.push('Review required before proceeding');
    recommendations.push('Check relationship history with matched parties');
    recommendations.push('Consider obtaining conflict waivers if appropriate');
  } else if (severity === 'medium') {
    recommendations.push('Review matches to confirm no actual conflict');
    recommendations.push('Document review decision for compliance');
  } else if (severity === 'low') {
    recommendations.push('Low-probability matches found - review if needed');
    recommendations.push('May proceed with standard intake process');
  } else {
    recommendations.push('No conflicts detected');
    recommendations.push('Clear to proceed with intake');
  }

  // Add specific recommendations for match types
  const adverseMatches = matches.filter(
    (m) => m.matchField === 'adverse_party',
  );
  if (adverseMatches.length > 0) {
    recommendations.push(
      `${adverseMatches.length} adverse party match(es) require immediate review`,
    );
  }

  return recommendations;
}

/**
 * Save conflict check result to submission
 */
export async function saveConflictCheckResult(
  submissionId: number,
  result: ConflictCheckResult,
): Promise<void> {
  const submission = await prisma.intakeSubmission.findUnique({
    where: { id: submissionId },
  });

  if (!submission) {
    throw new Error('Submission not found');
  }

  const formData = (submission.formData as Record<string, unknown>) || {};

  await prisma.intakeSubmission.update({
    where: { id: submissionId },
    data: {
      formData: {
        ...formData,
        _conflictCheck: {
          checkedAt: result.checkedAt.toISOString(),
          hasConflicts: result.hasConflicts,
          severity: result.severity,
          matchCount: result.matches.length,
          recommendations: result.recommendations,
        },
      },
    },
  });
}
