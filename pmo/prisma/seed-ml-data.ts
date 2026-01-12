/**
 * ML Data Seed Script
 * Creates test data for Lead ML features including:
 * - ScoredLeads with various score levels
 * - LeadActivity records for behavioral data
 * - LeadTrainingData for model training
 * - LeadMLModel (rule-based fallback model)
 * - LeadMLPrediction records
 */

import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

// Prisma 7 requires the adapter pattern for PostgreSQL connections
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Helper to generate random date within range
function randomDate(daysAgo: number, daysAgoEnd = 0): Date {
  const start = new Date();
  start.setDate(start.getDate() - daysAgo);
  const end = new Date();
  end.setDate(end.getDate() - daysAgoEnd);
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime()),
  );
}

// Helper to generate future date
function futureDate(daysAhead: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date;
}

async function main() {
  console.log('Starting ML data seed...');

  // Get the existing LeadScoringConfig
  let config = await prisma.leadScoringConfig.findFirst({
    where: { isActive: true },
    include: { client: true },
  });

  if (!config) {
    // Create a config if none exists
    const client = await prisma.client.findFirst();
    if (!client) {
      throw new Error('No client found. Run the main seed first.');
    }

    const tenant = await prisma.tenant.findFirst();

    config = await prisma.leadScoringConfig.create({
      data: {
        clientId: client.id,
        tenantId: tenant?.id,
        hotThreshold: 80,
        warmThreshold: 50,
        coldThreshold: 20,
        trackEmailOpens: true,
        trackEmailClicks: true,
        trackWebsiteVisits: true,
        trackFormSubmissions: true,
        isActive: true,
        scoringWeights: {
          demographic: {
            hasCompany: 10,
            hasTitle: 10,
            emailDomainType: 5,
            titleSeniority: 15,
          },
          behavioral: {
            emailOpenCount: 5,
            emailClickCount: 10,
            formSubmitCount: 20,
            meetingCount: 25,
          },
          engagement: { emailOpenRate: 10, emailClickRate: 15 },
        },
      },
      include: { client: true },
    });
    console.log(`Created LeadScoringConfig: ${config.id}`);
  } else {
    console.log(`Using existing LeadScoringConfig: ${config.id}`);
  }

  const configId = config.id;
  const tenantId = config.tenantId;

  // Define scored leads with varied profiles
  const scoredLeadsData = [
    {
      email: 'sarah.johnson@enterprise-corp.com',
      name: 'Sarah Johnson',
      company: 'Enterprise Corp',
      title: 'Chief Technology Officer',
      phone: '+1-555-0101',
      score: 92,
      scoreLevel: 'HOT' as const,
      conversionProbability: 0.89,
      predictedValue: 250000,
      totalEmailsSent: 8,
      totalEmailsOpened: 7,
      totalEmailsClicked: 5,
      totalWebsiteVisits: 15,
      pipelineStage: 'proposal_sent',
      tags: ['enterprise', 'c-level', 'high-priority'],
    },
    {
      email: 'mike.chen@techstartup.io',
      name: 'Mike Chen',
      company: 'TechStartup Inc',
      title: 'VP of Engineering',
      phone: '+1-555-0102',
      score: 78,
      scoreLevel: 'WARM' as const,
      conversionProbability: 0.72,
      predictedValue: 85000,
      totalEmailsSent: 6,
      totalEmailsOpened: 4,
      totalEmailsClicked: 3,
      totalWebsiteVisits: 8,
      pipelineStage: 'demo_scheduled',
      tags: ['startup', 'tech', 'growth'],
    },
    {
      email: 'jennifer.lee@globalfinance.com',
      name: 'Jennifer Lee',
      company: 'Global Finance Ltd',
      title: 'Director of Digital Transformation',
      phone: '+1-555-0103',
      score: 85,
      scoreLevel: 'HOT' as const,
      conversionProbability: 0.81,
      predictedValue: 175000,
      totalEmailsSent: 10,
      totalEmailsOpened: 9,
      totalEmailsClicked: 6,
      totalWebsiteVisits: 22,
      pipelineStage: 'negotiation',
      tags: ['finance', 'enterprise', 'digital'],
    },
    {
      email: 'robert.smith@mediumbiz.net',
      name: 'Robert Smith',
      company: 'Medium Business Inc',
      title: 'IT Manager',
      phone: '+1-555-0104',
      score: 55,
      scoreLevel: 'WARM' as const,
      conversionProbability: 0.48,
      predictedValue: 45000,
      totalEmailsSent: 5,
      totalEmailsOpened: 2,
      totalEmailsClicked: 1,
      totalWebsiteVisits: 4,
      pipelineStage: 'qualification',
      tags: ['mid-market', 'it'],
    },
    {
      email: 'emma.davis@retail-group.com',
      name: 'Emma Davis',
      company: 'Retail Group Holdings',
      title: 'Head of Operations',
      phone: '+1-555-0105',
      score: 68,
      scoreLevel: 'WARM' as const,
      conversionProbability: 0.58,
      predictedValue: 95000,
      totalEmailsSent: 7,
      totalEmailsOpened: 5,
      totalEmailsClicked: 2,
      totalWebsiteVisits: 11,
      pipelineStage: 'demo_completed',
      tags: ['retail', 'enterprise', 'operations'],
    },
    {
      email: 'alex.martinez@smallco.biz',
      name: 'Alex Martinez',
      company: 'SmallCo LLC',
      title: 'Owner',
      phone: '+1-555-0106',
      score: 35,
      scoreLevel: 'COLD' as const,
      conversionProbability: 0.22,
      predictedValue: 15000,
      totalEmailsSent: 4,
      totalEmailsOpened: 1,
      totalEmailsClicked: 0,
      totalWebsiteVisits: 2,
      pipelineStage: 'initial_contact',
      tags: ['smb', 'owner'],
    },
    {
      email: 'david.wilson@healthcare-plus.org',
      name: 'David Wilson',
      company: 'Healthcare Plus',
      title: 'Chief Information Officer',
      phone: '+1-555-0107',
      score: 88,
      scoreLevel: 'HOT' as const,
      conversionProbability: 0.84,
      predictedValue: 320000,
      totalEmailsSent: 12,
      totalEmailsOpened: 11,
      totalEmailsClicked: 8,
      totalWebsiteVisits: 28,
      pipelineStage: 'contract_review',
      tags: ['healthcare', 'enterprise', 'c-level', 'high-priority'],
    },
    {
      email: 'lisa.brown@consultant-network.com',
      name: 'Lisa Brown',
      company: 'Consultant Network',
      title: 'Managing Partner',
      phone: '+1-555-0108',
      score: 42,
      scoreLevel: 'COLD' as const,
      conversionProbability: 0.31,
      predictedValue: 28000,
      totalEmailsSent: 3,
      totalEmailsOpened: 1,
      totalEmailsClicked: 0,
      totalWebsiteVisits: 3,
      pipelineStage: 'initial_contact',
      tags: ['consulting', 'partner'],
    },
    {
      email: 'james.taylor@manufacturing-co.com',
      name: 'James Taylor',
      company: 'Manufacturing Co',
      title: 'VP of Operations',
      phone: '+1-555-0109',
      score: 72,
      scoreLevel: 'WARM' as const,
      conversionProbability: 0.65,
      predictedValue: 110000,
      totalEmailsSent: 8,
      totalEmailsOpened: 6,
      totalEmailsClicked: 4,
      totalWebsiteVisits: 14,
      pipelineStage: 'proposal_draft',
      tags: ['manufacturing', 'enterprise', 'operations'],
    },
    {
      email: 'nina.patel@edu-institute.edu',
      name: 'Nina Patel',
      company: 'Educational Institute',
      title: 'Dean of Technology',
      phone: '+1-555-0110',
      score: 28,
      scoreLevel: 'COLD' as const,
      conversionProbability: 0.18,
      predictedValue: 35000,
      totalEmailsSent: 2,
      totalEmailsOpened: 0,
      totalEmailsClicked: 0,
      totalWebsiteVisits: 1,
      pipelineStage: 'initial_contact',
      tags: ['education', 'academic'],
    },
    {
      email: 'contact@gmail.com',
      name: 'John Doe',
      company: null,
      title: null,
      phone: null,
      score: 12,
      scoreLevel: 'DEAD' as const,
      conversionProbability: 0.05,
      predictedValue: null,
      totalEmailsSent: 1,
      totalEmailsOpened: 0,
      totalEmailsClicked: 0,
      totalWebsiteVisits: 0,
      pipelineStage: null,
      tags: ['unqualified'],
    },
    {
      email: 'mark.anderson@bigtech.com',
      name: 'Mark Anderson',
      company: 'BigTech Solutions',
      title: 'Senior Director',
      phone: '+1-555-0112',
      score: 81,
      scoreLevel: 'HOT' as const,
      conversionProbability: 0.76,
      predictedValue: 145000,
      totalEmailsSent: 9,
      totalEmailsOpened: 8,
      totalEmailsClicked: 5,
      totalWebsiteVisits: 19,
      pipelineStage: 'demo_scheduled',
      tags: ['tech', 'enterprise', 'director'],
    },
  ];

  // Create scored leads
  console.log('Creating scored leads...');
  const createdLeads: { id: number; email: string; score: number }[] = [];

  for (const leadData of scoredLeadsData) {
    const existingLead = await prisma.scoredLead.findFirst({
      where: { configId, email: leadData.email },
    });

    if (existingLead) {
      console.log(`  Skipping existing lead: ${leadData.email}`);
      createdLeads.push({
        id: existingLead.id,
        email: existingLead.email,
        score: existingLead.score,
      });
      continue;
    }

    const lead = await prisma.scoredLead.create({
      data: {
        configId,
        // Note: ScoredLead doesn't have tenantId - tenant is determined through config
        email: leadData.email,
        name: leadData.name,
        company: leadData.company,
        title: leadData.title,
        phone: leadData.phone,
        score: leadData.score,
        scoreLevel: leadData.scoreLevel,
        scoredAt: randomDate(30, 1),
        conversionProbability: leadData.conversionProbability,
        predictedValue: leadData.predictedValue,
        predictedCloseDate: futureDate(Math.floor(Math.random() * 60) + 14),
        totalEmailsSent: leadData.totalEmailsSent,
        totalEmailsOpened: leadData.totalEmailsOpened,
        totalEmailsClicked: leadData.totalEmailsClicked,
        totalWebsiteVisits: leadData.totalWebsiteVisits,
        lastEngagementAt: randomDate(7, 0),
        pipelineStage: leadData.pipelineStage,
        pipelineValue: leadData.predictedValue,
        tags: leadData.tags,
        segments:
          leadData.score >= 80
            ? ['hot_leads', 'sales_ready']
            : leadData.score >= 50
              ? ['warm_leads']
              : ['cold_leads'],
        scoreBreakdown: {
          demographic: Math.floor(leadData.score * 0.3),
          behavioral: Math.floor(leadData.score * 0.4),
          engagement: Math.floor(leadData.score * 0.3),
        },
        scoreHistory: [
          {
            score: Math.floor(leadData.score * 0.6),
            level: 'COLD',
            scoredAt: randomDate(60, 30).toISOString(),
            reason: 'Initial contact',
          },
          {
            score: leadData.score,
            level: leadData.scoreLevel,
            scoredAt: randomDate(30, 1).toISOString(),
            reason: 'Activity-based update',
          },
        ],
        isActive: true,
      },
    });
    createdLeads.push({ id: lead.id, email: lead.email, score: lead.score });
    console.log(`  Created lead: ${lead.email} (score: ${lead.score})`);
  }

  // Activity types with score impacts
  const activityTypes = [
    { type: 'email_open', impact: 5 },
    { type: 'email_click', impact: 10 },
    { type: 'page_view', impact: 3 },
    { type: 'form_submit', impact: 25 },
    { type: 'meeting', impact: 50 },
    { type: 'call', impact: 15 },
  ];

  // Create activities for each lead
  console.log('Creating lead activities...');
  let activityCount = 0;

  for (const lead of createdLeads) {
    // More activities for higher-scoring leads
    const numActivities = Math.floor((lead.score / 100) * 15) + 3;

    for (let i = 0; i < numActivities; i++) {
      const activityDef =
        activityTypes[Math.floor(Math.random() * activityTypes.length)];

      const activityData: Record<string, unknown> = {};
      if (
        activityDef.type === 'email_open' ||
        activityDef.type === 'email_click'
      ) {
        activityData.emailId = `email_${Math.random().toString(36).substring(7)}`;
        activityData.subject = [
          'New AI Consulting Services',
          'Follow-up on Demo',
          'Exclusive Offer',
          'Case Study',
        ][Math.floor(Math.random() * 4)];
        if (activityDef.type === 'email_click') {
          activityData.linkUrl = 'https://example.com/demo';
        }
      } else if (activityDef.type === 'page_view') {
        activityData.url = [
          '/pricing',
          '/features',
          '/case-studies',
          '/about',
          '/contact',
        ][Math.floor(Math.random() * 5)];
        activityData.timeOnPage = Math.floor(Math.random() * 300) + 10;
      } else if (activityDef.type === 'form_submit') {
        activityData.formId = [
          'demo_request',
          'contact_form',
          'newsletter',
          'whitepaper_download',
        ][Math.floor(Math.random() * 4)];
      } else if (activityDef.type === 'meeting') {
        activityData.meetingType = ['demo', 'discovery', 'follow_up'][
          Math.floor(Math.random() * 3)
        ];
        activityData.duration = [15, 30, 45, 60][Math.floor(Math.random() * 4)];
      } else if (activityDef.type === 'call') {
        activityData.duration = Math.floor(Math.random() * 30) + 5;
        activityData.outcome = ['connected', 'voicemail', 'no_answer'][
          Math.floor(Math.random() * 3)
        ];
      }

      await prisma.leadActivity.create({
        data: {
          configId,
          // Note: LeadActivity doesn't have tenantId - tenant is determined through config
          leadId: lead.id,
          activityType: activityDef.type,
          activityData,
          source: ['email_campaign', 'organic', 'paid_ads', 'referral'][
            Math.floor(Math.random() * 4)
          ],
          medium: ['email', 'web', 'social', 'direct'][
            Math.floor(Math.random() * 4)
          ],
          campaign: ['q1_launch', 'spring_promo', 'webinar_series', null][
            Math.floor(Math.random() * 4)
          ],
          scoreImpact: activityDef.impact,
          deviceType: ['desktop', 'mobile', 'tablet'][
            Math.floor(Math.random() * 3)
          ],
          createdAt: randomDate(45, 0),
        },
      });
      activityCount++;
    }
  }
  console.log(`  Created ${activityCount} activities`);

  // Create training data (historical outcomes)
  console.log('Creating training data...');
  const trainingData = [];

  // Generate realistic training data with both conversions and non-conversions
  for (let i = 0; i < 100; i++) {
    const didConvert = Math.random() < 0.35; // 35% conversion rate
    const baseScore = didConvert
      ? 60 + Math.floor(Math.random() * 35)
      : 20 + Math.floor(Math.random() * 50);

    const features = {
      demographic: {
        hasCompany: Math.random() > 0.2,
        hasTitle: Math.random() > 0.3,
        hasPhone: Math.random() > 0.4,
        emailDomainType: ['corporate', 'free', 'edu'][
          Math.floor(Math.random() * 3)
        ],
        titleSeniority: ['c_level', 'vp', 'director', 'manager', 'individual'][
          Math.floor(Math.random() * 5)
        ],
        companySizeEstimate: ['enterprise', 'mid_market', 'smb', 'startup'][
          Math.floor(Math.random() * 4)
        ],
      },
      behavioral: {
        emailOpenCount: Math.floor(Math.random() * 15),
        emailClickCount: Math.floor(Math.random() * 8),
        pageViewCount: Math.floor(Math.random() * 25),
        formSubmitCount: Math.floor(Math.random() * 3),
        meetingCount: didConvert
          ? Math.floor(Math.random() * 3) + 1
          : Math.floor(Math.random() * 2),
        activityVelocity: Math.random() * 3,
        channelDiversity: Math.floor(Math.random() * 5) + 1,
      },
      temporal: {
        daysSinceCreated: Math.floor(Math.random() * 90) + 7,
        daysSinceLastActivity: didConvert
          ? Math.floor(Math.random() * 5)
          : Math.floor(Math.random() * 30),
        recencyScore: didConvert
          ? 70 + Math.floor(Math.random() * 30)
          : 30 + Math.floor(Math.random() * 50),
        activityBurst: Math.random() > 0.7,
      },
      engagement: {
        totalEngagementScore: baseScore,
        emailOpenRate: Math.random() * 0.9 + 0.1,
        emailClickRate: Math.random() * 0.6,
        sequenceEngagement: Math.random(),
      },
    };

    const snapshotDate = randomDate(120, 30);
    const conversionDate = didConvert
      ? new Date(
          snapshotDate.getTime() +
            (Math.random() * 45 + 5) * 24 * 60 * 60 * 1000,
        )
      : null;

    trainingData.push({
      configId,
      tenantId,
      features,
      didConvert,
      daysToConvert:
        didConvert && conversionDate
          ? Math.floor(
              (conversionDate.getTime() - snapshotDate.getTime()) /
                (24 * 60 * 60 * 1000),
            )
          : null,
      actualValue: didConvert
        ? Math.floor(Math.random() * 200000) + 20000
        : null,
      predictedScore: baseScore,
      predictedProb: (baseScore / 100) * 0.9 + Math.random() * 0.1,
      snapshotDate,
      conversionDate,
    });
  }

  await prisma.leadTrainingData.createMany({ data: trainingData });
  console.log(`  Created ${trainingData.length} training records`);

  // Create an ML model (rule-based fallback)
  console.log('Creating ML model...');
  const existingModel = await prisma.leadMLModel.findFirst({
    where: { configId, modelType: 'conversion', isActive: true },
  });

  let model;
  if (existingModel) {
    console.log(`  Using existing model: ${existingModel.id}`);
    model = existingModel;
  } else {
    model = await prisma.leadMLModel.create({
      data: {
        configId,
        tenantId,
        modelVersion: 'v1.0.0',
        modelType: 'conversion',
        hyperparameters: {
          temperature: 0.3,
          threshold: 0.5,
          llmModel: 'rule-based-fallback',
          weights: {
            demographic: 0.2,
            behavioral: 0.35,
            temporal: 0.15,
            engagement: 0.3,
          },
        },
        trainingDataCount: trainingData.length,
        trainedAt: new Date(),
        trainingDuration: 45,
        accuracy: 0.82,
        precision: 0.78,
        recall: 0.85,
        f1Score: 0.81,
        auc: 0.87,
        featureWeights: {
          emailClickRate: 0.15,
          titleSeniority: 0.12,
          activityBurst: 0.11,
          meetingCount: 0.1,
          recencyScore: 0.09,
          emailOpenRate: 0.08,
          formSubmitCount: 0.08,
          channelDiversity: 0.07,
          hasCompany: 0.06,
          companySizeEstimate: 0.06,
          daysSinceLastActivity: 0.05,
          hasTitle: 0.03,
        },
        isActive: true,
        validUntil: futureDate(90),
      },
    });
    console.log(`  Created model: ${model.id}`);
  }

  // Create ML predictions for each lead
  console.log('Creating ML predictions...');
  let predictionCount = 0;

  for (const lead of createdLeads) {
    // Check if prediction already exists
    const existingPrediction = await prisma.leadMLPrediction.findFirst({
      where: {
        leadId: lead.id,
        predictionType: 'CONVERSION',
        status: 'ACTIVE',
      },
    });

    if (existingPrediction) {
      console.log(`  Skipping existing prediction for lead ${lead.id}`);
      continue;
    }

    const probability = (lead.score / 100) * 0.9 + Math.random() * 0.1;
    const confidence = 0.7 + Math.random() * 0.25;

    const riskFactors = [];
    if (lead.score < 50) {
      riskFactors.push({
        factor: 'Low Engagement',
        impact: 'high',
        currentValue: `${lead.score}%`,
        trend: 'declining',
        description: 'Lead has not engaged with recent outreach',
      });
    }
    if (lead.score >= 70) {
      riskFactors.push({
        factor: 'High Email Engagement',
        impact: 'high',
        currentValue: 'Strong',
        trend: 'improving',
        description: 'Strong email interaction indicates buying intent',
      });
    }
    if (lead.score >= 50 && lead.score < 80) {
      riskFactors.push({
        factor: 'Moderate Activity',
        impact: 'medium',
        currentValue: 'Average',
        trend: 'stable',
        description: 'Lead shows interest but needs nurturing',
      });
    }

    const recommendations = [];
    if (lead.score >= 80) {
      recommendations.push({
        action: 'Send pricing proposal',
        priority: 'urgent',
        rationale: 'Lead is showing strong buying signals',
        expectedImpact: 'Move to contract stage',
        timeframe: 'Within 24 hours',
      });
    } else if (lead.score >= 50) {
      recommendations.push({
        action: 'Schedule follow-up call',
        priority: 'high',
        rationale: 'Maintain momentum with personalized outreach',
        expectedImpact: 'Increase engagement',
        timeframe: 'Within 48 hours',
      });
    } else {
      recommendations.push({
        action: 'Add to nurture sequence',
        priority: 'medium',
        rationale: 'Lead needs more education before sales engagement',
        expectedImpact: 'Gradual warming',
        timeframe: 'Within 1 week',
      });
    }

    await prisma.leadMLPrediction.create({
      data: {
        leadId: lead.id,
        tenantId,
        modelId: model.id,
        predictionType: 'CONVERSION',
        probability,
        confidence,
        predictedValue:
          lead.score >= 50 ? Math.floor(Math.random() * 150000) + 25000 : null,
        predictedDays: Math.floor(Math.random() * 45) + 7,
        riskFactors,
        explanation:
          lead.score >= 80
            ? `${lead.email.split('@')[0]} shows strong conversion signals with high engagement and active pipeline.`
            : lead.score >= 50
              ? `${lead.email.split('@')[0]} demonstrates moderate interest. Continue nurturing to increase conversion likelihood.`
              : `${lead.email.split('@')[0]} needs re-engagement. Consider adding to nurture sequence.`,
        recommendations,
        llmModel: 'rule-based-fallback',
        llmTokensUsed: null,
        llmLatencyMs: 45,
        llmCost: null,
        status: 'ACTIVE',
        validUntil: futureDate(7),
        predictedAt: new Date(),
      },
    });
    predictionCount++;
  }
  console.log(`  Created ${predictionCount} predictions`);

  // Summary
  console.log('\n=== ML Data Seed Complete ===');
  console.log(`LeadScoringConfig: ${configId}`);
  console.log(`ScoredLeads: ${createdLeads.length}`);
  console.log(`LeadActivities: ${activityCount}`);
  console.log(`LeadTrainingData: ${trainingData.length}`);
  console.log(`LeadMLModel: ${model.id}`);
  console.log(`LeadMLPredictions: ${predictionCount}`);
}

main()
  .catch((e) => {
    console.error('Error seeding ML data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
