/**
 * Multi-Tenant UAT Seed Script
 *
 * This script creates test data for v6.0 UAT tenant isolation testing.
 * It creates 3 tenants with deliberately overlapping entity names to verify
 * proper data isolation.
 *
 * Run with: npx ts-node prisma/seed-multi-tenant.ts
 *
 * Test Credentials:
 * - Tenant 1 (default): admin@pmo.test / AdminDemo123!
 * - Tenant 2 (acme-corp): acme.admin@pmo.test / AcmeDemo123!
 * - Tenant 3 (global-tech): global.admin@pmo.test / GlobalDemo123!
 */

import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

import {
  PrismaClient,
  UserRole,
  TenantRole,
  AccountType,
  AccountEmployeeCount,
  ContactLifecycle,
  CRMLeadSource,
  PipelineStageType,
  OpportunityStatus,
  ProjectStatus,
  ProjectHealthStatus,
  TaskStatus,
  Priority,
  MilestoneStatus,
  LeadStatus,
  LeadSource,
  ServiceInterest,
  IssueType,
  IssueStatus,
  IssuePriority,
  IssueSource,
  ExpenseStatus,
  BudgetPeriod,
  RecurringFrequency,
} from '@prisma/client';

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    process.env.POSTGRES_PRISMA_URL ??
    'postgresql://postgres:postgres@localhost:5432/pmo';
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const BCRYPT_SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS ?? '10');

// ============================================================================
// TENANT CONFIGURATION
// ============================================================================

interface TenantConfig {
  slug: string;
  name: string;
  plan: 'TRIAL' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  users: {
    email: string;
    name: string;
    password: string;
    globalRole: UserRole;
    tenantRole: TenantRole;
  }[];
}

const TENANTS: TenantConfig[] = [
  {
    slug: 'default',
    name: 'Elipse Consulting',
    plan: 'PROFESSIONAL',
    users: [
      {
        email: 'admin@pmo.test',
        name: 'Admin User',
        password: 'AdminDemo123!',
        globalRole: UserRole.ADMIN,
        tenantRole: TenantRole.OWNER,
      },
      {
        email: 'avery.chen@pmo.test',
        name: 'Avery Chen',
        password: 'PmoDemo123!',
        globalRole: UserRole.USER,
        tenantRole: TenantRole.MEMBER,
      },
      {
        email: 'priya.desai@pmo.test',
        name: 'Priya Desai',
        password: 'PmoDemo123!',
        globalRole: UserRole.USER,
        tenantRole: TenantRole.MEMBER,
      },
      {
        email: 'marco.silva@pmo.test',
        name: 'Marco Silva',
        password: 'PmoDemo123!',
        globalRole: UserRole.USER,
        tenantRole: TenantRole.MEMBER,
      },
    ],
  },
  {
    slug: 'acme-corp',
    name: 'Acme Corporation',
    plan: 'PROFESSIONAL',
    users: [
      {
        email: 'acme.admin@pmo.test',
        name: 'Acme Admin',
        password: 'AcmeDemo123!',
        globalRole: UserRole.ADMIN,
        tenantRole: TenantRole.OWNER,
      },
      {
        email: 'acme.user1@pmo.test',
        name: 'Acme User One',
        password: 'AcmeDemo123!',
        globalRole: UserRole.USER,
        tenantRole: TenantRole.MEMBER,
      },
      {
        email: 'acme.user2@pmo.test',
        name: 'Acme User Two',
        password: 'AcmeDemo123!',
        globalRole: UserRole.USER,
        tenantRole: TenantRole.MEMBER,
      },
    ],
  },
  {
    slug: 'global-tech',
    name: 'Global Technologies',
    plan: 'STARTER',
    users: [
      {
        email: 'global.admin@pmo.test',
        name: 'Global Admin',
        password: 'GlobalDemo123!',
        globalRole: UserRole.ADMIN,
        tenantRole: TenantRole.OWNER,
      },
      {
        email: 'global.user1@pmo.test',
        name: 'Global User One',
        password: 'GlobalDemo123!',
        globalRole: UserRole.USER,
        tenantRole: TenantRole.MEMBER,
      },
    ],
  },
];

// ============================================================================
// OVERLAPPING ENTITY DATA
// Names are deliberately duplicated across tenants to test isolation
// ============================================================================

// Accounts with same names across tenants (to test isolation)
const OVERLAPPING_ACCOUNTS = [
  {
    name: 'Acme Manufacturing', // Present in Tenant 1 and 2
    tenants: ['default', 'acme-corp'],
    type: AccountType.CUSTOMER,
    industry: 'Manufacturing',
    employeeCount: AccountEmployeeCount.MEDIUM,
    annualRevenue: 50000000,
    healthScore: 72,
  },
  {
    name: 'TechForward Inc', // Present in all 3 tenants
    tenants: ['default', 'acme-corp', 'global-tech'],
    type: AccountType.PROSPECT,
    industry: 'Technology',
    employeeCount: AccountEmployeeCount.LARGE,
    annualRevenue: 200000000,
    healthScore: 50,
  },
  {
    name: 'Brightside Health Group', // Tenant 1 only
    tenants: ['default'],
    type: AccountType.CUSTOMER,
    industry: 'Healthcare',
    employeeCount: AccountEmployeeCount.SMALL,
    annualRevenue: 15000000,
    healthScore: 85,
  },
  {
    name: 'GreenEnergy Solutions', // Tenant 1 and 2
    tenants: ['default', 'acme-corp'],
    type: AccountType.PROSPECT,
    industry: 'Energy',
    employeeCount: AccountEmployeeCount.MEDIUM,
    annualRevenue: 75000000,
    healthScore: 60,
  },
  {
    name: 'Velocity Logistics', // Tenant 1 only
    tenants: ['default'],
    type: AccountType.CUSTOMER,
    industry: 'Logistics',
    employeeCount: AccountEmployeeCount.LARGE,
    annualRevenue: 120000000,
    healthScore: 68,
  },
  {
    name: 'Summit Enterprises', // Tenant 2 only
    tenants: ['acme-corp'],
    type: AccountType.CUSTOMER,
    industry: 'Consulting',
    employeeCount: AccountEmployeeCount.MEDIUM,
    annualRevenue: 35000000,
    healthScore: 78,
  },
  {
    name: 'Pacific Innovations', // Tenant 3 only
    tenants: ['global-tech'],
    type: AccountType.CUSTOMER,
    industry: 'Technology',
    employeeCount: AccountEmployeeCount.SMALL,
    annualRevenue: 10000000,
    healthScore: 82,
  },
];

// Contacts with same names across tenants
const OVERLAPPING_CONTACTS = [
  {
    firstName: 'John',
    lastName: 'Smith', // Present in all 3 tenants (but different entities)
    tenants: ['default', 'acme-corp', 'global-tech'],
    email: 'john.smith', // Will be suffixed with tenant domain
    jobTitle: 'Operations Director',
    department: 'Operations',
    lifecycle: ContactLifecycle.CUSTOMER,
    leadSource: CRMLeadSource.REFERRAL,
  },
  {
    firstName: 'Sarah',
    lastName: 'Johnson', // Tenant 1 and 2
    tenants: ['default', 'acme-corp'],
    email: 'sarah.johnson',
    jobTitle: 'VP of Sales',
    department: 'Sales',
    lifecycle: ContactLifecycle.SQL,
    leadSource: CRMLeadSource.LINKEDIN,
  },
  {
    firstName: 'Michael',
    lastName: 'Chen', // Tenant 1 only
    tenants: ['default'],
    email: 'michael.chen',
    jobTitle: 'CTO',
    department: 'Technology',
    lifecycle: ContactLifecycle.CUSTOMER,
    leadSource: CRMLeadSource.EVENT,
  },
  {
    firstName: 'Emma',
    lastName: 'Williams', // Tenant 2 only
    tenants: ['acme-corp'],
    email: 'emma.williams',
    jobTitle: 'Marketing Director',
    department: 'Marketing',
    lifecycle: ContactLifecycle.MQL,
    leadSource: CRMLeadSource.WEBSITE,
  },
  {
    firstName: 'David',
    lastName: 'Lee', // Tenant 3 only
    tenants: ['global-tech'],
    email: 'david.lee',
    jobTitle: 'Product Manager',
    department: 'Product',
    lifecycle: ContactLifecycle.LEAD,
    leadSource: CRMLeadSource.COLD_CALL,
  },
];

// Opportunities with same names across tenants
const OVERLAPPING_OPPORTUNITIES = [
  {
    name: 'Enterprise Deal Q1', // Tenant 1 and 2
    tenants: ['default', 'acme-corp'],
    amount: 250000,
    probability: 50,
    stageName: 'Proposal',
  },
  {
    name: 'Platform Modernization', // All 3 tenants
    tenants: ['default', 'acme-corp', 'global-tech'],
    amount: 175000,
    probability: 75,
    stageName: 'Negotiation',
  },
  {
    name: 'AI Integration Project', // Tenant 1 only
    tenants: ['default'],
    amount: 500000,
    probability: 25,
    stageName: 'Discovery',
  },
  {
    name: 'Cloud Migration', // Tenant 2 only
    tenants: ['acme-corp'],
    amount: 320000,
    probability: 60,
    stageName: 'Proposal',
  },
  {
    name: 'Security Audit', // Tenant 3 only
    tenants: ['global-tech'],
    amount: 85000,
    probability: 80,
    stageName: 'Negotiation',
  },
];

// Projects with same names across tenants
const OVERLAPPING_PROJECTS = [
  {
    name: 'Digital Transformation', // All 3 tenants
    tenants: ['default', 'acme-corp', 'global-tech'],
    status: ProjectStatus.IN_PROGRESS,
    healthStatus: ProjectHealthStatus.ON_TRACK,
    statusSummary: 'Project progressing well with key milestones on track.',
  },
  {
    name: 'AI Strategy Roadmap', // Tenant 1 and 2
    tenants: ['default', 'acme-corp'],
    status: ProjectStatus.IN_PROGRESS,
    healthStatus: ProjectHealthStatus.AT_RISK,
    statusSummary: 'Some delays due to resource constraints.',
  },
  {
    name: 'Process Automation', // Tenant 1 only
    tenants: ['default'],
    status: ProjectStatus.PLANNING,
    healthStatus: ProjectHealthStatus.ON_TRACK,
    statusSummary: 'In planning phase, gathering requirements.',
  },
  {
    name: 'Data Analytics Platform', // Tenant 2 only
    tenants: ['acme-corp'],
    status: ProjectStatus.IN_PROGRESS,
    healthStatus: ProjectHealthStatus.ON_TRACK,
    statusSummary: 'MVP delivered, working on phase 2.',
  },
  {
    name: 'Customer Portal', // Tenant 3 only
    tenants: ['global-tech'],
    status: ProjectStatus.PLANNING,
    healthStatus: ProjectHealthStatus.ON_TRACK,
    statusSummary: 'Kickoff scheduled for next week.',
  },
];

// Tasks with same titles across tenants
const OVERLAPPING_TASKS = [
  {
    title: 'Kick-off Meeting', // All 3 tenants
    tenants: ['default', 'acme-corp', 'global-tech'],
    status: TaskStatus.DONE,
    priority: Priority.P1,
  },
  {
    title: 'Requirements Gathering', // All 3 tenants
    tenants: ['default', 'acme-corp', 'global-tech'],
    status: TaskStatus.IN_PROGRESS,
    priority: Priority.P1,
  },
  {
    title: 'Technical Design Review', // Tenant 1 and 2
    tenants: ['default', 'acme-corp'],
    status: TaskStatus.BACKLOG,
    priority: Priority.P2,
  },
  {
    title: 'User Testing', // Tenant 1 only
    tenants: ['default'],
    status: TaskStatus.TODO,
    priority: Priority.P2,
  },
  {
    title: 'Security Assessment', // Tenant 2 only
    tenants: ['acme-corp'],
    status: TaskStatus.IN_PROGRESS,
    priority: Priority.P1,
  },
  {
    title: 'Documentation Update', // Tenant 3 only
    tenants: ['global-tech'],
    status: TaskStatus.BACKLOG,
    priority: Priority.P3,
  },
];

// Leads with same names across tenants
const OVERLAPPING_LEADS = [
  {
    name: 'Sarah Johnson', // Tenant 1 and 2 (same name as contact!)
    tenants: ['default', 'acme-corp'],
    email: 'sarah.johnson.lead',
    company: 'Potential Corp',
    source: LeadSource.WEBSITE_CONTACT,
    serviceInterest: ServiceInterest.STRATEGY,
    status: LeadStatus.NEW,
  },
  {
    name: 'Robert Martinez', // All 3 tenants
    tenants: ['default', 'acme-corp', 'global-tech'],
    email: 'robert.martinez',
    company: 'Future Industries',
    source: LeadSource.LINKEDIN,
    serviceInterest: ServiceInterest.IMPLEMENTATION,
    status: LeadStatus.CONTACTED,
  },
  {
    name: 'Lisa Wang', // Tenant 1 only
    tenants: ['default'],
    email: 'lisa.wang',
    company: 'Innovation Labs',
    source: LeadSource.REFERRAL,
    serviceInterest: ServiceInterest.POC,
    status: LeadStatus.QUALIFIED,
  },
  {
    name: 'James Brown', // Tenant 2 only
    tenants: ['acme-corp'],
    email: 'james.brown',
    company: 'Enterprise Solutions',
    source: LeadSource.EVENT,
    serviceInterest: ServiceInterest.TRAINING,
    status: LeadStatus.NEW,
  },
];

// Expenses with same descriptions across tenants
const OVERLAPPING_EXPENSES = [
  {
    description: 'Office Supplies', // All 3 tenants
    tenants: ['default', 'acme-corp', 'global-tech'],
    amount: 250.0,
    status: ExpenseStatus.APPROVED,
    vendor: 'Staples',
  },
  {
    description: 'Software Licenses', // Tenant 1 and 2
    tenants: ['default', 'acme-corp'],
    amount: 5000.0,
    status: ExpenseStatus.PENDING,
    vendor: 'Microsoft',
  },
  {
    description: 'Travel Expenses', // Tenant 1 only
    tenants: ['default'],
    amount: 1500.0,
    status: ExpenseStatus.APPROVED,
    vendor: 'United Airlines',
  },
  {
    description: 'Marketing Materials', // Tenant 2 only
    tenants: ['acme-corp'],
    amount: 3200.0,
    status: ExpenseStatus.PENDING,
    vendor: 'PrintShop',
  },
  {
    description: 'Cloud Services', // Tenant 3 only
    tenants: ['global-tech'],
    amount: 8500.0,
    status: ExpenseStatus.APPROVED,
    vendor: 'AWS',
  },
];

// Budgets with same names across tenants
const OVERLAPPING_BUDGETS = [
  {
    name: 'Q1 Marketing', // Tenant 1 and 2
    tenants: ['default', 'acme-corp'],
    amount: 50000.0,
    period: BudgetPeriod.QUARTERLY,
  },
  {
    name: 'IT Infrastructure', // All 3 tenants
    tenants: ['default', 'acme-corp', 'global-tech'],
    amount: 100000.0,
    period: BudgetPeriod.ANNUAL,
  },
  {
    name: 'Professional Development', // Tenant 1 only
    tenants: ['default'],
    amount: 25000.0,
    period: BudgetPeriod.ANNUAL,
  },
  {
    name: 'Research & Development', // Tenant 2 only
    tenants: ['acme-corp'],
    amount: 200000.0,
    period: BudgetPeriod.ANNUAL,
  },
  {
    name: 'Operations', // Tenant 3 only
    tenants: ['global-tech'],
    amount: 75000.0,
    period: BudgetPeriod.QUARTERLY,
  },
];

// Recurring costs
const OVERLAPPING_RECURRING_COSTS = [
  {
    name: 'CRM Subscription', // Tenant 1 and 2
    tenants: ['default', 'acme-corp'],
    amount: 500.0,
    frequency: RecurringFrequency.MONTHLY,
    vendor: 'Salesforce',
  },
  {
    name: 'Cloud Hosting', // All 3 tenants
    tenants: ['default', 'acme-corp', 'global-tech'],
    amount: 2500.0,
    frequency: RecurringFrequency.MONTHLY,
    vendor: 'AWS',
  },
  {
    name: 'Security Software', // Tenant 1 only
    tenants: ['default'],
    amount: 1200.0,
    frequency: RecurringFrequency.ANNUAL,
    vendor: 'CrowdStrike',
  },
];

// Issues/Bugs with same titles
const OVERLAPPING_ISSUES = [
  {
    title: 'Login page slow on mobile', // Tenant 1 and 2
    tenants: ['default', 'acme-corp'],
    type: IssueType.BUG,
    status: IssueStatus.OPEN,
    priority: IssuePriority.MEDIUM,
    description: 'Login page takes over 5 seconds to load on mobile devices.',
  },
  {
    title: 'Add export to CSV feature', // All 3 tenants
    tenants: ['default', 'acme-corp', 'global-tech'],
    type: IssueType.FEATURE_REQUEST,
    status: IssueStatus.TRIAGING,
    priority: IssuePriority.LOW,
    description: 'Users want to export data to CSV format.',
  },
  {
    title: 'Dashboard chart not rendering', // Tenant 1 only
    tenants: ['default'],
    type: IssueType.BUG,
    status: IssueStatus.IN_PROGRESS,
    priority: IssuePriority.HIGH,
    description: 'Analytics chart fails to render after data update.',
  },
  {
    title: 'API rate limiting unclear', // Tenant 2 only
    tenants: ['acme-corp'],
    type: IssueType.IMPROVEMENT,
    status: IssueStatus.OPEN,
    priority: IssuePriority.MEDIUM,
    description: 'Error messages for rate limiting are confusing.',
  },
];

// ============================================================================
// SEED FUNCTIONS
// ============================================================================

async function main() {
  console.log('Starting Multi-Tenant UAT Seed...\n');

  // Track created entities by tenant
  const tenantMap = new Map<
    string,
    {
      tenantId: string;
      userIds: Map<string, number>;
      accountIds: Map<string, number>;
      pipelineId: number;
      stageIds: Map<string, number>;
      projectIds: Map<string, number>;
      categoryIds: Map<string, number>;
    }
  >();

  // ============================================================================
  // STEP 1: Create Tenants and Users
  // ============================================================================
  console.log('Step 1: Creating tenants and users...');

  for (const tenantConfig of TENANTS) {
    console.log(`  Creating tenant: ${tenantConfig.name} (${tenantConfig.slug})`);

    // Create or update tenant
    const tenant = await prisma.tenant.upsert({
      where: { slug: tenantConfig.slug },
      update: { name: tenantConfig.name, plan: tenantConfig.plan, status: 'ACTIVE' },
      create: {
        slug: tenantConfig.slug,
        name: tenantConfig.name,
        plan: tenantConfig.plan,
        status: 'ACTIVE',
      },
    });

    const userIds = new Map<string, number>();

    // Create users for this tenant
    for (const userConfig of tenantConfig.users) {
      const passwordHash = await bcrypt.hash(userConfig.password, BCRYPT_SALT_ROUNDS);

      const user = await prisma.user.upsert({
        where: { email: userConfig.email },
        update: {
          name: userConfig.name,
          passwordHash,
          role: userConfig.globalRole,
        },
        create: {
          email: userConfig.email,
          name: userConfig.name,
          passwordHash,
          role: userConfig.globalRole,
          timezone: 'America/Chicago',
        },
      });

      userIds.set(userConfig.email, user.id);

      // Link user to tenant
      await prisma.tenantUser.upsert({
        where: {
          tenantId_userId: { tenantId: tenant.id, userId: user.id },
        },
        update: { role: userConfig.tenantRole },
        create: {
          tenantId: tenant.id,
          userId: user.id,
          role: userConfig.tenantRole,
          acceptedAt: new Date(),
        },
      });

      console.log(`    Created user: ${userConfig.email} (${userConfig.tenantRole})`);
    }

    tenantMap.set(tenantConfig.slug, {
      tenantId: tenant.id,
      userIds,
      accountIds: new Map(),
      pipelineId: 0,
      stageIds: new Map(),
      projectIds: new Map(),
      categoryIds: new Map(),
    });
  }

  // ============================================================================
  // STEP 2: Create Pipelines and Stages for each tenant
  // ============================================================================
  console.log('\nStep 2: Creating pipelines and stages...');

  const STAGES = [
    { name: 'Lead', order: 1, probability: 10, type: PipelineStageType.OPEN, color: '#6366F1' },
    { name: 'Discovery', order: 2, probability: 25, type: PipelineStageType.OPEN, color: '#8B5CF6' },
    { name: 'Proposal', order: 3, probability: 50, type: PipelineStageType.OPEN, color: '#A855F7' },
    { name: 'Negotiation', order: 4, probability: 75, type: PipelineStageType.OPEN, color: '#D946EF' },
    { name: 'Closed Won', order: 5, probability: 100, type: PipelineStageType.WON, color: '#22C55E' },
    { name: 'Closed Lost', order: 6, probability: 0, type: PipelineStageType.LOST, color: '#EF4444' },
  ];

  for (const [slug, tenantData] of tenantMap) {
    const pipeline = await prisma.pipeline.upsert({
      where: {
        tenantId_name: { tenantId: tenantData.tenantId, name: 'Default Sales Pipeline' },
      },
      update: { isDefault: true, isActive: true },
      create: {
        tenantId: tenantData.tenantId,
        name: 'Default Sales Pipeline',
        description: 'Standard sales pipeline',
        isDefault: true,
        isActive: true,
      },
    });

    tenantData.pipelineId = pipeline.id;

    for (const stage of STAGES) {
      const createdStage = await prisma.salesPipelineStage.upsert({
        where: {
          pipelineId_name: { pipelineId: pipeline.id, name: stage.name },
        },
        update: { order: stage.order, probability: stage.probability, type: stage.type, color: stage.color },
        create: {
          pipelineId: pipeline.id,
          name: stage.name,
          order: stage.order,
          probability: stage.probability,
          type: stage.type,
          color: stage.color,
        },
      });

      tenantData.stageIds.set(stage.name, createdStage.id);
    }

    console.log(`  Created pipeline and stages for: ${slug}`);
  }

  // ============================================================================
  // STEP 3: Create Expense Categories for each tenant
  // ============================================================================
  console.log('\nStep 3: Creating expense categories...');

  const CATEGORIES = [
    { name: 'Office Supplies', description: 'General office supplies and equipment' },
    { name: 'Software', description: 'Software licenses and subscriptions' },
    { name: 'Travel', description: 'Business travel expenses' },
    { name: 'Marketing', description: 'Marketing and advertising expenses' },
    { name: 'Infrastructure', description: 'IT infrastructure costs' },
  ];

  for (const [slug, tenantData] of tenantMap) {
    for (const category of CATEGORIES) {
      const cat = await prisma.expenseCategory.upsert({
        where: {
          tenantId_name: { tenantId: tenantData.tenantId, name: category.name },
        },
        update: { description: category.description },
        create: {
          tenantId: tenantData.tenantId,
          name: category.name,
          description: category.description,
        },
      });

      tenantData.categoryIds.set(category.name, cat.id);
    }

    console.log(`  Created expense categories for: ${slug}`);
  }

  // ============================================================================
  // STEP 4: Create Accounts (overlapping names across tenants)
  // ============================================================================
  console.log('\nStep 4: Creating accounts...');

  for (const account of OVERLAPPING_ACCOUNTS) {
    for (const tenantSlug of account.tenants) {
      const tenantData = tenantMap.get(tenantSlug);
      if (!tenantData) continue;

      // Get first user as owner
      const ownerEmail = TENANTS.find((t) => t.slug === tenantSlug)?.users[0]?.email;
      const ownerId = ownerEmail ? tenantData.userIds.get(ownerEmail) : undefined;

      const created = await prisma.account.upsert({
        where: {
          tenantId_name: { tenantId: tenantData.tenantId, name: account.name },
        },
        update: {
          type: account.type,
          industry: account.industry,
          employeeCount: account.employeeCount,
          annualRevenue: account.annualRevenue,
          healthScore: account.healthScore,
          ownerId,
        },
        create: {
          tenantId: tenantData.tenantId,
          name: account.name,
          type: account.type,
          industry: account.industry,
          employeeCount: account.employeeCount,
          annualRevenue: account.annualRevenue,
          healthScore: account.healthScore,
          engagementScore: Math.floor(Math.random() * 50) + 50,
          churnRisk: Math.random() * 0.3,
          ownerId,
          tags: [account.industry.toLowerCase(), 'uat-test'],
        },
      });

      tenantData.accountIds.set(account.name, created.id);
      console.log(`  Created account "${account.name}" in tenant: ${tenantSlug}`);
    }
  }

  // ============================================================================
  // STEP 5: Create Contacts (overlapping names)
  // ============================================================================
  console.log('\nStep 5: Creating contacts...');

  for (const contact of OVERLAPPING_CONTACTS) {
    for (const tenantSlug of contact.tenants) {
      const tenantData = tenantMap.get(tenantSlug);
      if (!tenantData) continue;

      const email = `${contact.email}@${tenantSlug}.example.com`;

      // Link to first available account
      const accountName = OVERLAPPING_ACCOUNTS.find((a) => a.tenants.includes(tenantSlug))?.name;
      const accountId = accountName ? tenantData.accountIds.get(accountName) : undefined;

      // Get owner
      const ownerEmail = TENANTS.find((t) => t.slug === tenantSlug)?.users[0]?.email;
      const ownerId = ownerEmail ? tenantData.userIds.get(ownerEmail) : undefined;

      await prisma.cRMContact.upsert({
        where: {
          tenantId_email: { tenantId: tenantData.tenantId, email },
        },
        update: {
          firstName: contact.firstName,
          lastName: contact.lastName,
          jobTitle: contact.jobTitle,
          department: contact.department,
          lifecycle: contact.lifecycle,
          leadSource: contact.leadSource,
          accountId,
          ownerId,
        },
        create: {
          tenantId: tenantData.tenantId,
          firstName: contact.firstName,
          lastName: contact.lastName,
          email,
          jobTitle: contact.jobTitle,
          department: contact.department,
          lifecycle: contact.lifecycle,
          leadSource: contact.leadSource,
          accountId,
          ownerId,
          isPrimary: false,
          leadScore: Math.floor(Math.random() * 50) + 50,
        },
      });

      console.log(`  Created contact "${contact.firstName} ${contact.lastName}" in tenant: ${tenantSlug}`);
    }
  }

  // ============================================================================
  // STEP 6: Create Opportunities (overlapping names)
  // ============================================================================
  console.log('\nStep 6: Creating opportunities...');

  for (const opp of OVERLAPPING_OPPORTUNITIES) {
    for (const tenantSlug of opp.tenants) {
      const tenantData = tenantMap.get(tenantSlug);
      if (!tenantData) continue;

      // Get account
      const accountName = OVERLAPPING_ACCOUNTS.find((a) => a.tenants.includes(tenantSlug))?.name;
      const accountId = accountName ? tenantData.accountIds.get(accountName) : undefined;

      // Get stage
      const stageId = tenantData.stageIds.get(opp.stageName);
      if (!stageId) continue;

      // Get owner
      const ownerEmail = TENANTS.find((t) => t.slug === tenantSlug)?.users[0]?.email;
      const ownerId = ownerEmail ? tenantData.userIds.get(ownerEmail) : undefined;

      const status =
        opp.stageName === 'Closed Won'
          ? OpportunityStatus.WON
          : opp.stageName === 'Closed Lost'
            ? OpportunityStatus.LOST
            : OpportunityStatus.OPEN;

      await prisma.opportunity.upsert({
        where: {
          tenantId_name: { tenantId: tenantData.tenantId, name: opp.name },
        },
        update: {
          amount: opp.amount,
          probability: opp.probability,
          weightedAmount: opp.amount * (opp.probability / 100),
          status,
          stageId,
          accountId,
          ownerId,
        },
        create: {
          tenantId: tenantData.tenantId,
          name: opp.name,
          description: `UAT Test opportunity for ${opp.name}`,
          amount: opp.amount,
          probability: opp.probability,
          weightedAmount: opp.amount * (opp.probability / 100),
          status,
          pipelineId: tenantData.pipelineId,
          stageId,
          accountId,
          ownerId,
          expectedCloseDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days out
          tags: ['uat-test'],
        },
      });

      console.log(`  Created opportunity "${opp.name}" in tenant: ${tenantSlug}`);
    }
  }

  // ============================================================================
  // STEP 7: Create Projects (overlapping names)
  // ============================================================================
  console.log('\nStep 7: Creating projects...');

  for (const project of OVERLAPPING_PROJECTS) {
    for (const tenantSlug of project.tenants) {
      const tenantData = tenantMap.get(tenantSlug);
      if (!tenantData) continue;

      // Get account
      const accountName = OVERLAPPING_ACCOUNTS.find((a) => a.tenants.includes(tenantSlug))?.name;
      const accountId = accountName ? tenantData.accountIds.get(accountName) : undefined;

      // Get owner
      const ownerEmail = TENANTS.find((t) => t.slug === tenantSlug)?.users[0]?.email;
      const ownerId = ownerEmail ? tenantData.userIds.get(ownerEmail) : undefined;

      const created = await prisma.project.upsert({
        where: {
          tenantId_name: { tenantId: tenantData.tenantId, name: project.name },
        },
        update: {
          status: project.status,
          healthStatus: project.healthStatus,
          statusSummary: project.statusSummary,
          ownerId,
          accountId,
        },
        create: {
          tenantId: tenantData.tenantId,
          name: project.name,
          status: project.status,
          healthStatus: project.healthStatus,
          statusSummary: project.statusSummary,
          statusUpdatedAt: new Date(),
          startDate: new Date(),
          endDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
          ownerId: ownerId || 0,
          accountId,
        },
      });

      tenantData.projectIds.set(project.name, created.id);
      console.log(`  Created project "${project.name}" in tenant: ${tenantSlug}`);
    }
  }

  // ============================================================================
  // STEP 8: Create Tasks (overlapping names)
  // ============================================================================
  console.log('\nStep 8: Creating tasks...');

  for (const task of OVERLAPPING_TASKS) {
    for (const tenantSlug of task.tenants) {
      const tenantData = tenantMap.get(tenantSlug);
      if (!tenantData) continue;

      // Get project
      const projectName = OVERLAPPING_PROJECTS.find((p) => p.tenants.includes(tenantSlug))?.name;
      const projectId = projectName ? tenantData.projectIds.get(projectName) : undefined;

      if (!projectId) continue;

      // Get owner
      const ownerEmail = TENANTS.find((t) => t.slug === tenantSlug)?.users[0]?.email;
      const ownerId = ownerEmail ? tenantData.userIds.get(ownerEmail) : undefined;

      const existing = await prisma.task.findFirst({
        where: { projectId, title: task.title },
      });

      if (existing) {
        await prisma.task.update({
          where: { id: existing.id },
          data: { status: task.status, priority: task.priority, ownerId },
        });
      } else {
        await prisma.task.create({
          data: {
            projectId,
            title: task.title,
            description: `UAT Test task: ${task.title}`,
            status: task.status,
            priority: task.priority,
            ownerId: ownerId || 0,
          },
        });
      }

      console.log(`  Created task "${task.title}" in tenant: ${tenantSlug}`);
    }
  }

  // ============================================================================
  // STEP 9: Create Milestones for projects
  // ============================================================================
  console.log('\nStep 9: Creating milestones...');

  const MILESTONES = [
    { name: 'Planning Complete', status: MilestoneStatus.COMPLETED },
    { name: 'Development Phase 1', status: MilestoneStatus.IN_PROGRESS },
    { name: 'Testing & QA', status: MilestoneStatus.NOT_STARTED },
    { name: 'Go Live', status: MilestoneStatus.NOT_STARTED },
  ];

  for (const [slug, tenantData] of tenantMap) {
    for (const projectName of tenantData.projectIds.keys()) {
      const projectId = tenantData.projectIds.get(projectName);
      if (!projectId) continue;

      for (let i = 0; i < MILESTONES.length; i++) {
        const milestone = MILESTONES[i];
        const existing = await prisma.milestone.findFirst({
          where: { projectId, name: milestone.name },
        });

        if (!existing) {
          await prisma.milestone.create({
            data: {
              projectId,
              name: milestone.name,
              description: `${milestone.name} for ${projectName}`,
              status: milestone.status,
              dueDate: new Date(Date.now() + (30 + i * 30) * 24 * 60 * 60 * 1000),
            },
          });
        }
      }
    }
    console.log(`  Created milestones for tenant: ${slug}`);
  }

  // ============================================================================
  // STEP 10: Create Leads (overlapping names)
  // ============================================================================
  console.log('\nStep 10: Creating leads...');

  for (const lead of OVERLAPPING_LEADS) {
    for (const tenantSlug of lead.tenants) {
      const tenantData = tenantMap.get(tenantSlug);
      if (!tenantData) continue;

      const email = `${lead.email}@${tenantSlug}.example.com`;

      // Get owner
      const ownerEmail = TENANTS.find((t) => t.slug === tenantSlug)?.users[0]?.email;
      const ownerUserId = ownerEmail ? tenantData.userIds.get(ownerEmail) : undefined;

      await prisma.inboundLead.upsert({
        where: {
          tenantId_email: { tenantId: tenantData.tenantId, email },
        },
        update: {
          name: lead.name,
          company: lead.company,
          source: lead.source,
          serviceInterest: lead.serviceInterest,
          status: lead.status,
          ownerUserId,
        },
        create: {
          tenantId: tenantData.tenantId,
          name: lead.name,
          email,
          company: lead.company,
          source: lead.source,
          serviceInterest: lead.serviceInterest,
          status: lead.status,
          message: `UAT Test lead: ${lead.name} from ${lead.company}`,
          ownerUserId,
        },
      });

      console.log(`  Created lead "${lead.name}" in tenant: ${tenantSlug}`);
    }
  }

  // ============================================================================
  // STEP 11: Create Expenses (overlapping descriptions)
  // ============================================================================
  console.log('\nStep 11: Creating expenses...');

  for (const expense of OVERLAPPING_EXPENSES) {
    for (const tenantSlug of expense.tenants) {
      const tenantData = tenantMap.get(tenantSlug);
      if (!tenantData) continue;

      // Get category
      const categoryId = tenantData.categoryIds.get('Office Supplies');

      // Get submitter
      const ownerEmail = TENANTS.find((t) => t.slug === tenantSlug)?.users[0]?.email;
      const submittedById = ownerEmail ? tenantData.userIds.get(ownerEmail) : undefined;

      const existing = await prisma.expense.findFirst({
        where: {
          tenantId: tenantData.tenantId,
          description: expense.description,
        },
      });

      if (!existing && submittedById) {
        await prisma.expense.create({
          data: {
            tenantId: tenantData.tenantId,
            description: expense.description,
            amount: expense.amount,
            status: expense.status,
            vendor: expense.vendor,
            categoryId,
            submittedById,
            expenseDate: new Date(),
          },
        });
        console.log(`  Created expense "${expense.description}" in tenant: ${tenantSlug}`);
      }
    }
  }

  // ============================================================================
  // STEP 12: Create Budgets (overlapping names)
  // ============================================================================
  console.log('\nStep 12: Creating budgets...');

  for (const budget of OVERLAPPING_BUDGETS) {
    for (const tenantSlug of budget.tenants) {
      const tenantData = tenantMap.get(tenantSlug);
      if (!tenantData) continue;

      // Get category
      const categoryId = tenantData.categoryIds.get('Marketing');

      // Get owner
      const ownerEmail = TENANTS.find((t) => t.slug === tenantSlug)?.users[0]?.email;
      const createdById = ownerEmail ? tenantData.userIds.get(ownerEmail) : undefined;

      const existing = await prisma.budget.findFirst({
        where: { tenantId: tenantData.tenantId, name: budget.name },
      });

      if (!existing && createdById) {
        await prisma.budget.create({
          data: {
            tenantId: tenantData.tenantId,
            name: budget.name,
            amount: budget.amount,
            period: budget.period,
            categoryId,
            createdById,
            startDate: new Date(),
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          },
        });
        console.log(`  Created budget "${budget.name}" in tenant: ${tenantSlug}`);
      }
    }
  }

  // ============================================================================
  // STEP 13: Create Recurring Costs
  // ============================================================================
  console.log('\nStep 13: Creating recurring costs...');

  for (const cost of OVERLAPPING_RECURRING_COSTS) {
    for (const tenantSlug of cost.tenants) {
      const tenantData = tenantMap.get(tenantSlug);
      if (!tenantData) continue;

      const categoryId = tenantData.categoryIds.get('Software');

      const ownerEmail = TENANTS.find((t) => t.slug === tenantSlug)?.users[0]?.email;
      const createdById = ownerEmail ? tenantData.userIds.get(ownerEmail) : undefined;

      const existing = await prisma.recurringCost.findFirst({
        where: { tenantId: tenantData.tenantId, name: cost.name },
      });

      if (!existing && createdById) {
        await prisma.recurringCost.create({
          data: {
            tenantId: tenantData.tenantId,
            name: cost.name,
            amount: cost.amount,
            frequency: cost.frequency,
            vendor: cost.vendor,
            categoryId,
            createdById,
            startDate: new Date(),
            nextDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });
        console.log(`  Created recurring cost "${cost.name}" in tenant: ${tenantSlug}`);
      }
    }
  }

  // ============================================================================
  // STEP 14: Create Issues (overlapping titles)
  // ============================================================================
  console.log('\nStep 14: Creating issues...');

  for (const issue of OVERLAPPING_ISSUES) {
    for (const tenantSlug of issue.tenants) {
      const tenantData = tenantMap.get(tenantSlug);
      if (!tenantData) continue;

      const ownerEmail = TENANTS.find((t) => t.slug === tenantSlug)?.users[0]?.email;
      const reportedById = ownerEmail ? tenantData.userIds.get(ownerEmail) : undefined;

      const existing = await prisma.issue.findFirst({
        where: { tenantId: tenantData.tenantId, title: issue.title },
      });

      if (!existing) {
        await prisma.issue.create({
          data: {
            tenantId: tenantData.tenantId,
            title: issue.title,
            description: issue.description,
            type: issue.type,
            status: issue.status,
            priority: issue.priority,
            source: IssueSource.MANUAL,
            reportedById,
          },
        });
        console.log(`  Created issue "${issue.title}" in tenant: ${tenantSlug}`);
      }
    }
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n' + '='.repeat(60));
  console.log('Multi-Tenant UAT Seed Complete!');
  console.log('='.repeat(60));
  console.log('\nTenants Created:');
  for (const tenant of TENANTS) {
    console.log(`  - ${tenant.name} (${tenant.slug})`);
    console.log(`    Plan: ${tenant.plan}`);
    console.log(`    Users: ${tenant.users.length}`);
    for (const user of tenant.users) {
      console.log(`      - ${user.email} (${user.tenantRole})`);
    }
  }

  console.log('\nOverlapping Entities Created:');
  console.log(`  - Accounts: ${OVERLAPPING_ACCOUNTS.length} (shared across tenants)`);
  console.log(`  - Contacts: ${OVERLAPPING_CONTACTS.length}`);
  console.log(`  - Opportunities: ${OVERLAPPING_OPPORTUNITIES.length}`);
  console.log(`  - Projects: ${OVERLAPPING_PROJECTS.length}`);
  console.log(`  - Tasks: ${OVERLAPPING_TASKS.length}`);
  console.log(`  - Leads: ${OVERLAPPING_LEADS.length}`);
  console.log(`  - Expenses: ${OVERLAPPING_EXPENSES.length}`);
  console.log(`  - Budgets: ${OVERLAPPING_BUDGETS.length}`);
  console.log(`  - Recurring Costs: ${OVERLAPPING_RECURRING_COSTS.length}`);
  console.log(`  - Issues: ${OVERLAPPING_ISSUES.length}`);

  console.log('\n' + '='.repeat(60));
  console.log('Test Credentials:');
  console.log('='.repeat(60));
  for (const tenant of TENANTS) {
    console.log(`\n${tenant.name} (${tenant.slug}):`);
    for (const user of tenant.users) {
      console.log(`  ${user.email} / ${user.password}`);
    }
  }

  console.log('\n\nReady for v6.0 UAT Tenant Isolation Testing!');
}

main()
  .catch((error) => {
    console.error('Multi-tenant seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
