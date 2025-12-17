/**
 * Test script for PostgreSQL Row-Level Security (RLS)
 *
 * This script verifies that RLS is properly configured and enforcing
 * tenant isolation at the database level.
 *
 * Usage: npx ts-node src/scripts/test-rls.ts
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: ['error'],
});

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

async function setTenantContext(tenantId: string | null) {
  await prisma.$executeRawUnsafe(
    `SELECT set_config('app.current_tenant', $1, false)`,
    tenantId ?? '',
  );
}

async function runTests() {
  console.log('============================================');
  console.log('PostgreSQL Row-Level Security (RLS) Tests');
  console.log('============================================\n');

  // Test 1: Verify RLS is enabled on key tables
  console.log('Test 1: Checking RLS is enabled on tables...');
  try {
    const rlsStatus = await prisma.$queryRaw<
      { tablename: string; rowsecurity: boolean }[]
    >`
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN ('Account', 'CRMContact', 'Opportunity', 'Pipeline', 'CRMActivity')
    `;

    const allEnabled = rlsStatus.every((t) => t.rowsecurity === true);
    results.push({
      name: 'RLS Enabled on CRM Tables',
      passed: allEnabled,
      details: rlsStatus
        .map((t) => `  ${t.tablename}: ${t.rowsecurity ? '✓' : '✗'}`)
        .join('\n'),
    });
    console.log(allEnabled ? '  ✓ Passed' : '  ✗ Failed');
    console.log(
      rlsStatus
        .map(
          (t) =>
            `    ${t.tablename}: ${t.rowsecurity ? 'enabled' : 'disabled'}`,
        )
        .join('\n'),
    );
  } catch (error) {
    results.push({
      name: 'RLS Enabled Check',
      passed: false,
      details: `Error: ${error}`,
    });
    console.log(`  ✗ Error: ${error}`);
  }

  // Test 2: Verify policies exist
  console.log('\nTest 2: Checking RLS policies exist...');
  try {
    const policies = await prisma.$queryRaw<
      { tablename: string; policyname: string }[]
    >`
      SELECT tablename, policyname
      FROM pg_policies
      WHERE schemaname = 'public'
        AND policyname LIKE 'tenant_isolation_%'
      ORDER BY tablename
    `;

    const policyCount = policies.length;
    results.push({
      name: 'RLS Policies Created',
      passed: policyCount >= 10,
      details: `Found ${policyCount} tenant isolation policies`,
    });
    console.log(policyCount >= 10 ? '  ✓ Passed' : '  ✗ Failed');
    console.log(`    Found ${policyCount} tenant isolation policies`);
    policies.slice(0, 5).forEach((p) => {
      console.log(`    - ${p.tablename}: ${p.policyname}`);
    });
    if (policies.length > 5) {
      console.log(`    ... and ${policies.length - 5} more`);
    }
  } catch (error) {
    results.push({
      name: 'RLS Policies Check',
      passed: false,
      details: `Error: ${error}`,
    });
    console.log(`  ✗ Error: ${error}`);
  }

  // Test 3: Get test tenants
  console.log('\nTest 3: Setting up test data...');
  const tenants = await prisma.tenant.findMany({ take: 2 });
  if (tenants.length < 2) {
    console.log('  ⚠ Need at least 2 tenants for isolation tests');
    console.log('  Creating test tenants...');

    // Create test tenants if needed
    const tenant1 = await prisma.tenant.create({
      data: {
        name: 'RLS Test Tenant 1',
        slug: `rls-test-tenant-1-${Date.now()}`,
        plan: 'STARTER',
        status: 'ACTIVE',
      },
    });
    const tenant2 = await prisma.tenant.create({
      data: {
        name: 'RLS Test Tenant 2',
        slug: `rls-test-tenant-2-${Date.now()}`,
        plan: 'STARTER',
        status: 'ACTIVE',
      },
    });
    tenants.push(tenant1, tenant2);
  }
  console.log(`  ✓ Using tenants: ${tenants.map((t) => t.slug).join(', ')}`);

  // Test 4: Test tenant isolation with RLS
  console.log('\nTest 4: Testing tenant isolation...');
  try {
    const [tenantA, tenantB] = tenants;

    // Create an account in tenant A
    await setTenantContext(tenantA.id);

    // Get a user for ownerId
    let testUser = await prisma.user.findFirst();
    if (!testUser) {
      testUser = await prisma.user.create({
        data: {
          name: 'RLS Test User',
          email: `rls-test-${Date.now()}@test.com`,
          passwordHash: 'test-hash',
          role: 'USER',
          timezone: 'UTC',
        },
      });
    }

    const accountA = await prisma.account.create({
      data: {
        tenantId: tenantA.id,
        name: `RLS Test Account A - ${Date.now()}`,
        ownerId: testUser.id,
      },
    });
    console.log(`    Created account in tenant A: ${accountA.id}`);

    // Create an account in tenant B
    await setTenantContext(tenantB.id);
    const accountB = await prisma.account.create({
      data: {
        tenantId: tenantB.id,
        name: `RLS Test Account B - ${Date.now()}`,
        ownerId: testUser.id,
      },
    });
    console.log(`    Created account in tenant B: ${accountB.id}`);

    // Query from tenant A context - should only see tenant A's account
    await setTenantContext(tenantA.id);
    const accountsSeenByA = await prisma.account.findMany({
      where: {
        id: { in: [accountA.id, accountB.id] },
      },
    });

    const isolationWorks =
      accountsSeenByA.length === 1 && accountsSeenByA[0].id === accountA.id;
    results.push({
      name: 'Tenant Isolation via RLS',
      passed: isolationWorks,
      details: isolationWorks
        ? 'Tenant A cannot see Tenant B accounts'
        : `Expected 1 account, got ${accountsSeenByA.length}`,
    });
    console.log(isolationWorks ? '  ✓ Passed' : '  ✗ Failed');
    console.log(
      `    Tenant A sees ${accountsSeenByA.length} of 2 test accounts (expected 1)`,
    );

    // Clean up test accounts
    await setTenantContext(tenantA.id);
    await prisma.account.delete({ where: { id: accountA.id } });
    await setTenantContext(tenantB.id);
    await prisma.account.delete({ where: { id: accountB.id } });
    console.log('    Cleaned up test accounts');
  } catch (error) {
    results.push({
      name: 'Tenant Isolation Test',
      passed: false,
      details: `Error: ${error}`,
    });
    console.log(`  ✗ Error: ${error}`);
  }

  // Test 5: Test system bypass (no tenant context)
  console.log('\nTest 5: Testing system operations (no tenant context)...');
  try {
    // Clear tenant context
    await setTenantContext('');

    // System should be able to query across tenants
    const allTenants = await prisma.tenant.findMany({ take: 5 });
    const hasAccess = allTenants.length > 0;

    results.push({
      name: 'System Bypass Access',
      passed: hasAccess,
      details: `System can access ${allTenants.length} tenants without tenant context`,
    });
    console.log(hasAccess ? '  ✓ Passed' : '  ✗ Failed');
    console.log(
      `    System sees ${allTenants.length} tenants (without tenant context)`,
    );
  } catch (error) {
    results.push({
      name: 'System Bypass Test',
      passed: false,
      details: `Error: ${error}`,
    });
    console.log(`  ✗ Error: ${error}`);
  }

  // Summary
  console.log('\n============================================');
  console.log('Test Results Summary');
  console.log('============================================');
  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  console.log(`\nPassed: ${passed}/${total}\n`);

  results.forEach((r) => {
    console.log(`${r.passed ? '✓' : '✗'} ${r.name}`);
    if (!r.passed) {
      console.log(`  Details: ${r.details}`);
    }
  });

  if (passed === total) {
    console.log('\n✅ All RLS tests passed!');
  } else {
    console.log('\n❌ Some RLS tests failed. Please review the configuration.');
  }

  // Clean up test tenants if we created them
  await prisma.tenant.deleteMany({
    where: { slug: { startsWith: 'rls-test-tenant-' } },
  });
}

async function cleanup() {
  await prisma.$disconnect();
  await pool.end();
}

runTests()
  .catch((error) => {
    console.error('Test script failed:', error);
    process.exit(1);
  })
  .finally(cleanup);
