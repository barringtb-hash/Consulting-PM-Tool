/**
 * Domain Management Service
 *
 * Handles custom domain configuration including:
 * - Domain registration
 * - DNS verification
 * - SSL provisioning
 */

import { prisma } from '../prisma/client';
import { randomBytes } from 'crypto';
import dns from 'dns';
import { promisify } from 'util';

const resolveTxt = promisify(dns.resolveTxt);
const resolveCname = promisify(dns.resolveCname);

// SSL status types
type SslStatus = 'PENDING' | 'PROVISIONING' | 'ACTIVE' | 'FAILED' | 'EXPIRED';

// ============================================================================
// DOMAIN MANAGEMENT
// ============================================================================

/**
 * Add a custom domain for a tenant.
 */
export async function addDomain(
  tenantId: string,
  domain: string,
  isPrimary: boolean = false,
) {
  // Normalize domain
  const normalizedDomain = normalizeDomain(domain);

  // Check if domain is already in use
  const existing = await prisma.tenantDomain.findFirst({
    where: { domain: normalizedDomain },
  });

  if (existing) {
    throw new Error('Domain is already registered');
  }

  // Generate verification token
  const verifyToken = `pmo-verify-${randomBytes(16).toString('hex')}`;

  // If this is primary, unset other primary domains
  if (isPrimary) {
    await prisma.tenantDomain.updateMany({
      where: { tenantId, isPrimary: true },
      data: { isPrimary: false },
    });
  }

  const tenantDomain = await prisma.tenantDomain.create({
    data: {
      tenantId,
      domain: normalizedDomain,
      isPrimary,
      verifyToken,
      verified: false,
      sslStatus: 'PENDING',
    },
  });

  return {
    id: tenantDomain.id,
    domain: tenantDomain.domain,
    verifyToken: tenantDomain.verifyToken,
    isPrimary: tenantDomain.isPrimary,
    verified: tenantDomain.verified,
    sslStatus: tenantDomain.sslStatus,
  };
}

/**
 * Get all domains for a tenant.
 */
export async function getTenantDomains(tenantId: string) {
  return prisma.tenantDomain.findMany({
    where: { tenantId },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
  });
}

/**
 * Get domain by ID.
 */
export async function getDomainById(domainId: string) {
  return prisma.tenantDomain.findUnique({
    where: { id: domainId },
  });
}

/**
 * Remove a custom domain.
 */
export async function removeDomain(domainId: string, tenantId: string) {
  // Verify ownership
  const domain = await prisma.tenantDomain.findFirst({
    where: {
      id: domainId,
      tenantId,
    },
  });

  if (!domain) {
    throw new Error('Domain not found');
  }

  // Delete domain
  await prisma.tenantDomain.delete({
    where: { id: domainId },
  });

  return { success: true };
}

/**
 * Set a domain as primary.
 */
export async function setPrimaryDomain(domainId: string, tenantId: string) {
  // Verify ownership and domain is verified
  const domain = await prisma.tenantDomain.findFirst({
    where: {
      id: domainId,
      tenantId,
    },
  });

  if (!domain) {
    throw new Error('Domain not found');
  }

  if (!domain.verified) {
    throw new Error('Domain must be verified before setting as primary');
  }

  // Transaction to update domains
  await prisma.$transaction([
    // Unset current primary
    prisma.tenantDomain.updateMany({
      where: { tenantId, isPrimary: true },
      data: { isPrimary: false },
    }),
    // Set new primary
    prisma.tenantDomain.update({
      where: { id: domainId },
      data: { isPrimary: true },
    }),
  ]);

  return { success: true };
}

// ============================================================================
// DNS VERIFICATION
// ============================================================================

/**
 * Get DNS verification instructions.
 */
export function getDnsVerificationInstructions(
  domain: string,
  verifyToken: string,
) {
  return {
    method: 'TXT',
    host: `_pmo-verify.${domain}`,
    value: verifyToken,
    ttl: 3600,
    instructions: [
      `Add a TXT record to your DNS configuration:`,
      `Host/Name: _pmo-verify.${domain}`,
      `Type: TXT`,
      `Value: ${verifyToken}`,
      `TTL: 3600 (or your DNS provider's minimum)`,
      ``,
      `DNS propagation typically takes 5-10 minutes but can take up to 48 hours.`,
    ],
    cname: {
      host: domain,
      value: process.env.CUSTOM_DOMAIN_CNAME || 'proxy.pmo-platform.com',
      instructions: [
        `After verification, add a CNAME record:`,
        `Host/Name: ${domain}`,
        `Type: CNAME`,
        `Value: ${process.env.CUSTOM_DOMAIN_CNAME || 'proxy.pmo-platform.com'}`,
      ],
    },
  };
}

/**
 * Verify domain ownership via DNS TXT record.
 */
export async function verifyDomainOwnership(domainId: string): Promise<{
  success: boolean;
  message: string;
}> {
  const domain = await prisma.tenantDomain.findUnique({
    where: { id: domainId },
  });

  if (!domain) {
    return { success: false, message: 'Domain not found' };
  }

  if (domain.verified) {
    return { success: true, message: 'Domain already verified' };
  }

  try {
    // Look up TXT records for _pmo-verify subdomain
    const txtRecords = await resolveTxt(`_pmo-verify.${domain.domain}`);

    // Check if any record matches our verification token
    const isVerified = txtRecords.some((records) =>
      records.some((record) => record === domain.verifyToken),
    );

    if (isVerified) {
      // Update domain as verified
      await prisma.tenantDomain.update({
        where: { id: domainId },
        data: {
          verified: true,
          verifiedAt: new Date(),
          sslStatus: 'PROVISIONING',
        },
      });

      // Trigger SSL provisioning
      provisionSsl(domainId).catch((err) => {
        console.error('SSL provisioning failed:', err);
      });

      return { success: true, message: 'Domain verified successfully' };
    }

    return {
      success: false,
      message:
        'TXT record not found. DNS propagation may still be in progress.',
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('ENOTFOUND')) {
      return {
        success: false,
        message: 'TXT record not found. Please check your DNS configuration.',
      };
    }

    return {
      success: false,
      message: `DNS lookup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Verify CNAME record is configured correctly.
 */
export async function verifyCnameConfiguration(domainId: string): Promise<{
  success: boolean;
  message: string;
}> {
  const domain = await prisma.tenantDomain.findUnique({
    where: { id: domainId },
  });

  if (!domain) {
    return { success: false, message: 'Domain not found' };
  }

  const expectedCname =
    process.env.CUSTOM_DOMAIN_CNAME || 'proxy.pmo-platform.com';

  try {
    const cnameRecords = await resolveCname(domain.domain);

    if (cnameRecords.includes(expectedCname)) {
      return { success: true, message: 'CNAME configured correctly' };
    }

    return {
      success: false,
      message: `CNAME should point to ${expectedCname}. Current: ${cnameRecords.join(', ') || 'not set'}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `CNAME lookup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// ============================================================================
// SSL PROVISIONING
// ============================================================================

/**
 * Provision SSL certificate for a domain.
 * In production, this would integrate with Let's Encrypt or a similar CA.
 */
export async function provisionSsl(domainId: string): Promise<{
  success: boolean;
  message: string;
}> {
  const domain = await prisma.tenantDomain.findUnique({
    where: { id: domainId },
  });

  if (!domain) {
    return { success: false, message: 'Domain not found' };
  }

  if (!domain.verified) {
    return {
      success: false,
      message: 'Domain must be verified before SSL provisioning',
    };
  }

  try {
    // Update status to provisioning
    await prisma.tenantDomain.update({
      where: { id: domainId },
      data: { sslStatus: 'PROVISIONING' },
    });

    // In production, this would:
    // 1. Call Let's Encrypt or Cloudflare API
    // 2. Handle HTTP-01 or DNS-01 challenge
    // 3. Store certificate details

    // Simulate provisioning for development
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Update to active
    await prisma.tenantDomain.update({
      where: { id: domainId },
      data: {
        sslStatus: 'ACTIVE',
        sslExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      },
    });

    return {
      success: true,
      message: 'SSL certificate provisioned successfully',
    };
  } catch (error) {
    await prisma.tenantDomain.update({
      where: { id: domainId },
      data: { sslStatus: 'FAILED' },
    });

    return {
      success: false,
      message: `SSL provisioning failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Check SSL certificate status.
 */
export async function checkSslStatus(domainId: string): Promise<{
  status: SslStatus;
  expiresAt?: Date;
  message: string;
}> {
  const domain = await prisma.tenantDomain.findUnique({
    where: { id: domainId },
    select: { sslStatus: true, sslExpiresAt: true },
  });

  if (!domain) {
    return { status: 'PENDING', message: 'Domain not found' };
  }

  const status = domain.sslStatus as SslStatus;
  const expiresAt = domain.sslExpiresAt || undefined;

  // Check if certificate is expired or expiring soon
  if (status === 'ACTIVE' && expiresAt) {
    const daysUntilExpiry = Math.ceil(
      (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntilExpiry <= 0) {
      return {
        status: 'EXPIRED',
        expiresAt,
        message: 'SSL certificate has expired',
      };
    }

    if (daysUntilExpiry <= 30) {
      return {
        status: 'ACTIVE',
        expiresAt,
        message: `SSL certificate expires in ${daysUntilExpiry} days`,
      };
    }
  }

  const messages: Record<SslStatus, string> = {
    PENDING: 'SSL certificate not yet provisioned',
    PROVISIONING: 'SSL certificate is being provisioned',
    ACTIVE: 'SSL certificate is active',
    FAILED: 'SSL certificate provisioning failed',
    EXPIRED: 'SSL certificate has expired',
  };

  return {
    status,
    expiresAt,
    message: messages[status],
  };
}

/**
 * Renew SSL certificate.
 */
export async function renewSslCertificate(domainId: string): Promise<{
  success: boolean;
  message: string;
}> {
  return provisionSsl(domainId);
}

// ============================================================================
// DOMAIN LOOKUP
// ============================================================================

/**
 * Find tenant by custom domain.
 */
export async function findTenantByDomain(
  domain: string,
): Promise<string | null> {
  const normalizedDomain = normalizeDomain(domain);

  const tenantDomain = await prisma.tenantDomain.findFirst({
    where: {
      domain: normalizedDomain,
      verified: true,
    },
    select: { tenantId: true },
  });

  return tenantDomain?.tenantId || null;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normalize domain name.
 */
function normalizeDomain(domain: string): string {
  return domain
    .toLowerCase()
    .replace(/^https?:\/\//, '') // Remove protocol
    .replace(/^www\./, '') // Remove www
    .replace(/\/.*$/, '') // Remove path
    .trim();
}

/**
 * Validate domain format.
 */
export function isValidDomain(domain: string): boolean {
  const domainRegex =
    /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  return domainRegex.test(normalizeDomain(domain));
}
