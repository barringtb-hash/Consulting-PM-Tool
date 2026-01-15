/**
 * RAID Log Feature Types
 *
 * Type definitions for RAID (Risks, Action Items, Issues, Decisions) management.
 *
 * @module features/raid/types
 */

/**
 * RAID item types
 */
export type RAIDItemType = 'risk' | 'action-item' | 'issue' | 'decision';

/**
 * Status options for risks
 */
export type RiskStatus = 'IDENTIFIED' | 'MITIGATED' | 'ACCEPTED' | 'CLOSED';

/**
 * Status options for action items
 */
export type ActionItemStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

/**
 * Status options for issues (matches ProjectIssueStatus in Prisma)
 */
export type IssueStatus =
  | 'OPEN'
  | 'INVESTIGATING'
  | 'IN_PROGRESS'
  | 'BLOCKED'
  | 'RESOLVED'
  | 'CLOSED'
  | 'WONT_FIX';

/**
 * Status options for decisions (matches DecisionStatus in Prisma)
 */
export type DecisionStatus = 'PENDING' | 'ACTIVE' | 'SUPERSEDED' | 'REVOKED';

/**
 * Priority levels for RAID items
 */
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * Severity levels for issues and risks
 */
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * Probability levels for risks
 */
export type Probability = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';

/**
 * Impact levels for risks and issues
 */
export type Impact = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * Base interface for all RAID items
 */
export interface RAIDItemBase {
  id: number;
  title: string;
  description?: string;
  projectId: number;
  meetingId?: number;
  ownerId?: number;
  owner?: {
    id: number;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Risk item
 */
export interface Risk extends RAIDItemBase {
  type: 'risk';
  status: RiskStatus;
  probability: Probability;
  impact: Impact;
  mitigationPlan?: string;
  contingencyPlan?: string;
}

/**
 * Action item
 */
export interface ActionItem extends RAIDItemBase {
  type: 'action-item';
  status: ActionItemStatus;
  priority: Priority;
  dueDate?: string;
  completedAt?: string;
}

/**
 * Issue item
 */
export interface Issue extends RAIDItemBase {
  type: 'issue';
  status: IssueStatus;
  severity: Severity;
  impact?: string;
  resolution?: string;
  resolvedAt?: string;
}

/**
 * Decision item
 */
export interface Decision extends RAIDItemBase {
  type: 'decision';
  status: DecisionStatus;
  rationale?: string;
  alternatives?: string;
  decidedAt?: string;
  decisionMakers?: string[];
}

/**
 * Union type for all RAID items
 */
export type RAIDItem = Risk | ActionItem | Issue | Decision;

/**
 * RAID summary statistics
 * Contains both nested counts (for structured access) and flat counts (for backward compatibility)
 */
export interface RAIDSummary {
  // Nested counts with total and open/pending
  risks: { total: number; open: number };
  actionItems: { total: number; open: number };
  issues: { total: number; open: number };
  decisions: { total: number; pending: number };
  // Flat counts for backward compatibility with UI components
  openRisks: number;
  overdueActionItems: number;
  openIssues: number;
  highPriorityRisks: number;
  criticalIssues: number;
}

/**
 * Extracted RAID item from AI analysis
 */
export interface ExtractedRAIDItem {
  type: RAIDItemType;
  title: string;
  description?: string;
  confidence: number;
  sourceText?: string;
  suggestedOwner?: string;
  suggestedPriority?: Priority;
  suggestedSeverity?: Severity;
  suggestedDueDate?: string;
}

/**
 * Filter options for RAID items
 */
export type RAIDFilter =
  | 'all'
  | 'risks'
  | 'action-items'
  | 'issues'
  | 'decisions';

/**
 * Form values for creating/editing RAID items
 */
export interface RAIDItemFormValues {
  type: RAIDItemType;
  title: string;
  description: string;
  status: string;
  priority?: Priority;
  severity?: Severity;
  probability?: Probability;
  impact?: Impact;
  dueDate?: string;
  ownerId?: number;
  mitigationPlan?: string;
  contingencyPlan?: string;
  resolution?: string;
  rationale?: string;
}
