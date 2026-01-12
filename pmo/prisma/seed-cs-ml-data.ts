/**
 * Customer Success ML Data Seed Script
 * Creates test data for CS ML features including:
 * - AccountHealthScoreHistory (90 days of health data per account)
 * - CRMActivity (meetings, emails, calls, tasks)
 * - Sets up accounts for churn prediction testing
 */

import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

// Prisma 7 requires the adapter pattern for PostgreSQL connections
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Helper to generate date N days ago
function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(9, 0, 0, 0);
  return date;
}

// Helper to add random variance
function randomVariance(base: number, variance: number): number {
  return Math.max(
    0,
    Math.min(100, base + (Math.random() * variance * 2 - variance)),
  );
}

// Health score category based on score (matches HealthScoreCategory enum)
function getHealthCategory(score: number): 'HEALTHY' | 'AT_RISK' | 'CRITICAL' {
  if (score >= 71) return 'HEALTHY';
  if (score >= 31) return 'AT_RISK';
  return 'CRITICAL';
}

// Score trend based on previous
function getScoreTrend(
  current: number,
  previous: number,
): { trend: string; percentage: number } {
  const diff = current - previous;
  const percentage = previous > 0 ? (diff / previous) * 100 : 0;
  if (diff > 2) return { trend: 'UP', percentage };
  if (diff < -2) return { trend: 'DOWN', percentage };
  return { trend: 'STABLE', percentage: 0 };
}

// Account health profiles for different scenarios
const accountProfiles = [
  {
    accountId: 1, // Acme Manufacturing
    name: 'Healthy Customer',
    baseHealth: 85,
    trend: 'stable', // stable high performer
    usageBase: 90,
    supportBase: 85,
    engagementBase: 80,
    sentimentBase: 88,
    activityLevel: 'high',
    churnRisk: 0.08,
  },
  {
    accountId: 2, // Brightside Health Group
    name: 'Healthy but Declining',
    baseHealth: 75,
    trend: 'declining', // warning signs
    usageBase: 70,
    supportBase: 65,
    engagementBase: 75,
    sentimentBase: 80,
    activityLevel: 'medium',
    churnRisk: 0.22,
  },
  {
    accountId: 3, // TechForward Inc
    name: 'At Risk Prospect',
    baseHealth: 50,
    trend: 'declining', // needs attention
    usageBase: 45,
    supportBase: 40,
    engagementBase: 55,
    sentimentBase: 60,
    activityLevel: 'low',
    churnRisk: 0.45,
  },
  {
    accountId: 4, // GreenEnergy Solutions
    name: 'Critical Risk',
    baseHealth: 35,
    trend: 'critical', // high churn risk
    usageBase: 25,
    supportBase: 30,
    engagementBase: 35,
    sentimentBase: 45,
    activityLevel: 'very_low',
    churnRisk: 0.72,
  },
  {
    accountId: 5, // Velocity Logistics
    name: 'Recovering Customer',
    baseHealth: 68,
    trend: 'improving', // coming back from at-risk
    usageBase: 70,
    supportBase: 72,
    engagementBase: 65,
    sentimentBase: 68,
    activityLevel: 'medium',
    churnRisk: 0.18,
  },
];

async function main() {
  console.log('Starting Customer Success ML data seed...');

  // Get tenant
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    throw new Error('No tenant found. Run the main seed first.');
  }
  const tenantId = tenant.id;
  console.log(`Using tenant: ${tenantId}`);

  // Get accounts
  const accounts = await prisma.account.findMany({
    where: { tenantId },
    orderBy: { id: 'asc' },
    take: 5,
  });

  if (accounts.length === 0) {
    throw new Error('No accounts found. Run the main seed first.');
  }
  console.log(`Found ${accounts.length} accounts`);

  // Get a user to be the owner of activities
  const user = await prisma.user.findFirst();
  if (!user) {
    throw new Error('No user found. Run the main seed first.');
  }

  // Clear existing CS ML data
  console.log('Clearing existing CS ML data...');
  await prisma.accountMLPrediction.deleteMany({ where: { tenantId } });
  await prisma.accountHealthScoreHistory.deleteMany({ where: { tenantId } });
  await prisma.cRMActivity.deleteMany({ where: { tenantId } });
  console.log('  Cleared existing data');

  // Create health score history for each account
  console.log('Creating health score history...');
  let historyCount = 0;

  for (const profile of accountProfiles) {
    const account = accounts.find((a) => a.id === profile.accountId);
    if (!account) {
      console.log(
        `  Skipping profile for account ${profile.accountId} - not found`,
      );
      continue;
    }

    console.log(
      `  Creating history for ${account.name} (${profile.name} profile)`,
    );

    let previousScore = profile.baseHealth;

    // Create 90 days of history (one entry per day)
    for (let day = 90; day >= 0; day--) {
      // Apply trend modifiers
      let trendModifier = 0;
      if (profile.trend === 'declining') {
        trendModifier = (90 - day) * 0.15; // Gradual decline
      } else if (profile.trend === 'improving') {
        trendModifier = -(90 - day) * 0.12; // Gradual improvement (subtract to increase score from lower start)
      } else if (profile.trend === 'critical') {
        trendModifier = (90 - day) * 0.25; // Faster decline
      }

      // Calculate dimension scores with variance
      const usageScore = Math.round(
        randomVariance(profile.usageBase - trendModifier, 5),
      );
      const supportScore = Math.round(
        randomVariance(profile.supportBase - trendModifier * 0.8, 8),
      );
      const engagementScore = Math.round(
        randomVariance(profile.engagementBase - trendModifier * 0.6, 6),
      );
      const sentimentScore = Math.round(
        randomVariance(profile.sentimentBase - trendModifier * 0.4, 4),
      );
      const financialScore = Math.round(randomVariance(85, 5)); // Generally stable

      // Calculate weighted overall score
      const overallScore = Math.round(
        Math.max(
          0,
          Math.min(
            100,
            usageScore * 0.4 +
              supportScore * 0.25 +
              engagementScore * 0.2 +
              sentimentScore * 0.15,
          ),
        ),
      );

      const { trend, percentage } = getScoreTrend(overallScore, previousScore);

      // Calculate churn risk based on health
      const baseChurnRisk = (100 - overallScore) / 100;
      const churnRisk = Math.min(1, Math.max(0, baseChurnRisk * 1.2));

      await prisma.accountHealthScoreHistory.create({
        data: {
          tenantId,
          accountId: account.id,
          overallScore,
          category: getHealthCategory(overallScore),
          usageScore,
          supportScore,
          engagementScore,
          sentimentScore,
          financialScore,
          usageWeight: 40,
          supportWeight: 25,
          engagementWeight: 20,
          sentimentWeight: 15,
          financialWeight: 0,
          previousScore,
          scoreTrend: trend,
          trendPercentage: percentage,
          churnRisk,
          expansionPotential: overallScore > 70 ? (overallScore - 70) / 30 : 0,
          calculationNotes: `Daily health score calculation. Profile: ${profile.name}`,
          calculatedAt: daysAgo(day),
        },
      });

      previousScore = overallScore;
      historyCount++;
    }

    // Update account with latest health scores
    const latestHistory = await prisma.accountHealthScoreHistory.findFirst({
      where: { accountId: account.id },
      orderBy: { calculatedAt: 'desc' },
    });

    if (latestHistory) {
      await prisma.account.update({
        where: { id: account.id },
        data: {
          healthScore: latestHistory.overallScore,
          engagementScore: latestHistory.engagementScore,
          churnRisk: latestHistory.churnRisk,
        },
      });
    }
  }
  console.log(`  Created ${historyCount} health score history records`);

  // Create CRM activities for each account
  console.log('Creating CRM activities...');
  let activityCount = 0;

  const activityTypes = ['MEETING', 'EMAIL', 'CALL', 'NOTE', 'TASK'] as const;
  const activityStatuses = ['COMPLETED', 'PLANNED', 'CANCELLED'] as const;

  for (const profile of accountProfiles) {
    const account = accounts.find((a) => a.id === profile.accountId);
    if (!account) continue;

    // Determine number of activities based on activity level
    let numActivities: number;
    switch (profile.activityLevel) {
      case 'high':
        numActivities = 45;
        break;
      case 'medium':
        numActivities = 25;
        break;
      case 'low':
        numActivities = 12;
        break;
      case 'very_low':
        numActivities = 5;
        break;
      default:
        numActivities = 15;
    }

    console.log(`  Creating ${numActivities} activities for ${account.name}`);

    for (let i = 0; i < numActivities; i++) {
      const type =
        activityTypes[Math.floor(Math.random() * activityTypes.length)];
      const dayOffset = Math.floor(Math.random() * 60); // Last 60 days
      const activityDate = daysAgo(dayOffset);

      // Most activities are completed, some planned (future), few cancelled
      let status: (typeof activityStatuses)[number];
      if (dayOffset > 0) {
        status = Math.random() > 0.1 ? 'COMPLETED' : 'CANCELLED';
      } else {
        status = Math.random() > 0.3 ? 'COMPLETED' : 'PLANNED';
      }

      const subjects: Record<typeof type, string[]> = {
        MEETING: [
          'Quarterly Business Review',
          'Product Demo',
          'Strategy Session',
          'Kickoff Meeting',
          'Check-in Call',
          'Escalation Meeting',
        ],
        EMAIL: [
          'Follow-up on action items',
          'Product update notification',
          'Renewal discussion',
          'Feature request response',
          'Support case summary',
        ],
        CALL: [
          'Quick sync',
          'Status update',
          'Issue resolution',
          'Feedback collection',
          'Renewal conversation',
        ],
        NOTE: [
          'Internal notes',
          'Customer feedback',
          'Risk assessment',
          'Opportunity identified',
          'Action items',
        ],
        TASK: [
          'Send proposal',
          'Schedule QBR',
          'Review contract',
          'Prepare deck',
          'Follow up on issue',
        ],
      };

      const outcomes: Record<typeof type, string[]> = {
        MEETING: [
          'Positive - customer engaged',
          'Concerns raised about roadmap',
          'Action items assigned',
          'Escalation required',
          'Renewal confirmed',
        ],
        EMAIL: [
          'Response received',
          'No response yet',
          'Meeting scheduled',
          'Issue resolved',
        ],
        CALL: [
          'Connected - positive discussion',
          'Left voicemail',
          'Issue escalated',
          'Next steps agreed',
        ],
        NOTE: ['For internal reference', 'Requires follow-up', 'FYI only'],
        TASK: [
          'Completed successfully',
          'Pending review',
          'Blocked - needs input',
        ],
      };

      await prisma.cRMActivity.create({
        data: {
          tenantId,
          type,
          accountId: account.id,
          subject:
            subjects[type][Math.floor(Math.random() * subjects[type].length)],
          description: `${type} activity for ${account.name}. Profile: ${profile.name}`,
          outcome:
            status === 'COMPLETED'
              ? outcomes[type][
                  Math.floor(Math.random() * outcomes[type].length)
                ]
              : null,
          scheduledAt: activityDate,
          completedAt: status === 'COMPLETED' ? activityDate : null,
          duration:
            type === 'MEETING'
              ? [30, 45, 60, 90][Math.floor(Math.random() * 4)]
              : type === 'CALL'
                ? [15, 30][Math.floor(Math.random() * 2)]
                : null,
          status,
          priority: Math.random() > 0.7 ? 'HIGH' : 'NORMAL',
          ownerId: user.id,
          createdById: user.id,
          metadata: {
            source: 'seed-script',
            profile: profile.name,
          },
        },
      });
      activityCount++;
    }
  }
  console.log(`  Created ${activityCount} CRM activities`);

  // Create some open CTAs for high-risk accounts
  console.log('Creating CTAs for at-risk accounts...');
  let ctaCount = 0;

  const highRiskProfiles = accountProfiles.filter((p) => p.churnRisk > 0.3);
  for (const profile of highRiskProfiles) {
    const account = accounts.find((a) => a.id === profile.accountId);
    if (!account) continue;

    // Create 1-2 CTAs per high-risk account
    const numCTAs = profile.churnRisk > 0.6 ? 2 : 1;

    for (let i = 0; i < numCTAs; i++) {
      const ctaTypes = ['RISK', 'LIFECYCLE'] as const;
      const type = ctaTypes[i % ctaTypes.length];

      await prisma.cTA.create({
        data: {
          tenantId,
          accountId: account.id,
          ownerId: user.id,
          type,
          status: 'OPEN',
          priority: profile.churnRisk > 0.6 ? 'CRITICAL' : 'HIGH',
          title:
            type === 'RISK'
              ? `Churn Risk Alert: ${account.name}`
              : `Engagement Review: ${account.name}`,
          description:
            type === 'RISK'
              ? `Account showing ${Math.round(profile.churnRisk * 100)}% churn risk. Health score declining. Immediate intervention required.`
              : `Low engagement detected. Last meaningful activity was over 2 weeks ago. Schedule check-in.`,
          reason: 'Auto-generated for testing',
          dueDate: daysAgo(-7), // Due in 7 days
          isAutomated: false,
          triggerRule: null,
        },
      });
      ctaCount++;
    }
  }
  console.log(`  Created ${ctaCount} CTAs`);

  // Summary
  console.log('\n=== Customer Success ML Data Seed Complete ===');
  console.log(`Tenant: ${tenantId}`);
  console.log(`Accounts processed: ${accounts.length}`);
  console.log(
    `Health score history: ${historyCount} records (90 days per account)`,
  );
  console.log(`CRM activities: ${activityCount} records`);
  console.log(`CTAs created: ${ctaCount}`);
  console.log('\nAccount Health Summary:');
  for (const profile of accountProfiles) {
    const account = accounts.find((a) => a.id === profile.accountId);
    if (!account) continue;
    const latest = await prisma.accountHealthScoreHistory.findFirst({
      where: { accountId: account.id },
      orderBy: { calculatedAt: 'desc' },
    });
    console.log(
      `  ${account.name}: Health ${latest?.overallScore ?? 'N/A'}, Churn Risk ${Math.round((latest?.churnRisk ?? 0) * 100)}% (${profile.name})`,
    );
  }
}

main()
  .catch((e) => {
    console.error('Error seeding CS ML data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
