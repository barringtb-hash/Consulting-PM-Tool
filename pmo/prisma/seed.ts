import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

import {
  AiMaturity,
  BrandAssetType,
  CompanySize,
  AssetType,
  MilestoneStatus,
  PrismaClient,
  Priority,
  ProjectStatus,
  ProjectHealthStatus,
  TaskStatus,
  UserRole,
  ContentType,
  ContentStatus,
  ContentChannel,
  CampaignStatus,
  TenantRole,
  // CRM enums
  AccountType,
  AccountEmployeeCount,
  ContactLifecycle,
  CRMLeadSource,
  PipelineStageType,
  OpportunityStatus,
  // Bug tracking enums
  IssueType,
  IssueStatus,
  IssuePriority,
  IssueSource,
  // Lead enums
  LeadStatus,
  LeadSource,
  ServiceInterest,
  // AI Projects enums
  DependencyType,
  ProjectDocumentType,
  ProjectDocumentCategory,
  ProjectDocumentStatus,
  RiskSourceType,
  RiskSeverity,
  RiskCategory,
  RiskStatus,
  DigestRecipientType,
  DigestFrequency,
  DigestDetailLevel,
} from '@prisma/client';

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    process.env.POSTGRES_PRISMA_URL ??
    'postgresql://postgres:postgres@localhost:5432/pmo';
}

// Prisma 7 requires the adapter pattern for PostgreSQL connections
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type SeedUser = {
  name: string;
  email: string;
  password: string;
  timezone: string;
  role: UserRole;
};

const users: SeedUser[] = [
  {
    name: 'Bryant Barrington',
    email: 'Bryant.Barrington@elipseconsulting.ai',
    password: 'ElipseAdmin2024!',
    timezone: 'America/Chicago',
    role: UserRole.SUPER_ADMIN,
  },
  {
    name: 'Admin User',
    email: 'Admin@pmo.test',
    password: 'Seattleu21*',
    timezone: 'America/Chicago',
    role: UserRole.ADMIN,
  },
  {
    name: 'Avery Chen',
    email: 'avery.chen@pmo.test',
    password: 'PmoDemo123!',
    timezone: 'America/Chicago',
    role: UserRole.USER,
  },
  {
    name: 'Priya Desai',
    email: 'priya.desai@pmo.test',
    password: 'PmoDemo123!',
    timezone: 'America/New_York',
    role: UserRole.USER,
  },
  {
    name: 'Marco Silva',
    email: 'marco.silva@pmo.test',
    password: 'PmoDemo123!',
    timezone: 'America/Los_Angeles',
    role: UserRole.USER,
  },
  {
    name: 'Testing Admin',
    email: 'admin@pmo.test',
    password: 'AdminDemo123!',
    timezone: 'UTC',
    role: UserRole.ADMIN,
  },
];

const clients = [
  {
    name: 'Acme Manufacturing',
    industry: 'Industrial Manufacturing',
    companySize: CompanySize.MEDIUM,
    timezone: 'America/Chicago',
    aiMaturity: AiMaturity.LOW,
    notes:
      'Pilot predictive maintenance use cases with OT data cleanup underway.',
    contacts: [
      {
        name: 'Dana Patel',
        email: 'dana.patel@acme.test',
        role: 'Operations Director',
        phone: '+1-312-555-0101',
        notes: 'Executive sponsor focused on downtime reduction and safety.',
      },
      {
        name: 'Miguel Rodriguez',
        email: 'miguel.rodriguez@acme.test',
        role: 'Maintenance Manager',
        phone: '+1-312-555-0118',
        notes: 'Coordinates data pulls from the plant historian and CMMS.',
      },
    ],
  },
  {
    name: 'Brightside Health Group',
    industry: 'Healthcare',
    companySize: CompanySize.SMALL,
    timezone: 'America/Los_Angeles',
    aiMaturity: AiMaturity.MEDIUM,
    notes: 'Document automation and patient triage assistant under evaluation.',
    contacts: [
      {
        name: 'Sarah Kim',
        email: 'sarah.kim@brightside.test',
        role: 'Innovation Lead',
        phone: '+1-415-555-0199',
        notes: 'Owns the AI roadmap and stakeholder communications.',
      },
      {
        name: 'Omar Greene',
        email: 'omar.greene@brightside.test',
        role: 'IT Manager',
        phone: '+1-415-555-0142',
        notes: 'Security and access point; schedules integration reviews.',
      },
    ],
  },
  {
    name: 'Elipse Consulting',
    industry: 'Consulting',
    companySize: CompanySize.SMALL,
    timezone: 'America/New_York',
    aiMaturity: AiMaturity.HIGH,
    notes: 'AI consulting firm specializing in strategy and implementation.',
    contacts: [],
  },
];

const projectSeeds = [
  // Admin-owned project for demo purposes
  {
    name: 'AI Strategy Roadmap',
    clientName: 'Elipse Consulting',
    ownerEmail: 'admin@pmo.test',
    status: ProjectStatus.IN_PROGRESS,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-06-30'),
    healthStatus: ProjectHealthStatus.ON_TRACK,
    statusSummary:
      'Q1 thought leadership campaign launched successfully. Content pipeline healthy with 8 pieces in various stages.',
    statusUpdatedAt: new Date('2024-02-15'),
    meetings: [
      {
        title: 'Q1 Marketing Planning',
        date: new Date('2024-01-10'),
        time: '10:00 AM ET',
        attendees: ['Testing Admin', 'Marketing Team'],
        notes:
          'Outlined Q1 content strategy focusing on AI thought leadership and case studies.',
        decisions: 'Prioritize LinkedIn and blog content for B2B audience.',
        risks: 'Content production capacity may limit output.',
      },
      {
        title: 'Content Performance Review',
        date: new Date('2024-02-01'),
        time: '02:00 PM ET',
        attendees: ['Testing Admin', 'Analytics Team'],
        notes:
          'Reviewed January content performance. LinkedIn posts averaging 500+ impressions.',
        decisions:
          'Double down on case study content based on engagement data.',
        risks: 'Need more client testimonials for case studies.',
      },
    ],
    milestones: [
      {
        name: 'Q1 Content Launch',
        description: 'Publish initial batch of thought leadership content.',
        status: MilestoneStatus.COMPLETED,
        dueDate: new Date('2024-01-31'),
        tasks: [
          {
            title: 'Publish AI customer service blog post',
            description: 'Final review and publish the flagship blog post.',
            status: TaskStatus.DONE,
            priority: Priority.P1,
            dueDate: new Date('2024-01-15'),
          },
          {
            title: 'Schedule LinkedIn campaign',
            description: 'Set up LinkedIn posts for Q1 with scheduling tool.',
            status: TaskStatus.DONE,
            priority: Priority.P1,
            dueDate: new Date('2024-01-20'),
          },
        ],
      },
      {
        name: 'Case Study Development',
        description: 'Develop detailed case studies from client projects.',
        status: MilestoneStatus.IN_PROGRESS,
        dueDate: new Date('2024-03-15'),
        tasks: [
          {
            title: 'Draft manufacturing case study',
            description:
              'Write case study based on predictive maintenance project.',
            status: TaskStatus.IN_PROGRESS,
            priority: Priority.P1,
            dueDate: new Date('2024-02-28'),
          },
          {
            title: 'Client approval for healthcare case study',
            description:
              'Get sign-off from Brightside Health for public case study.',
            status: TaskStatus.BACKLOG,
            priority: Priority.P2,
            dueDate: new Date('2024-03-10'),
          },
        ],
      },
      {
        name: 'Q2 Campaign Planning',
        description: 'Plan manufacturing-focused campaign for Q2.',
        status: MilestoneStatus.NOT_STARTED,
        dueDate: new Date('2024-04-01'),
        tasks: [],
      },
    ],
    tasks: [
      {
        title: 'Review content calendar',
        description: 'Weekly review of upcoming content and deadlines.',
        status: TaskStatus.IN_PROGRESS,
        priority: Priority.P2,
      },
      {
        title: 'Update brand guidelines',
        description: 'Refresh brand guidelines with new color palette.',
        status: TaskStatus.BACKLOG,
        priority: Priority.P3,
      },
    ],
  },
  {
    name: 'Predictive Maintenance Rollout',
    clientName: 'Acme Manufacturing',
    ownerEmail: 'avery.chen@pmo.test',
    status: ProjectStatus.IN_PROGRESS,
    startDate: new Date('2024-01-15'),
    endDate: new Date('2024-08-30'),
    // M7 - Status & Reporting
    healthStatus: ProjectHealthStatus.AT_RISK,
    statusSummary:
      'Data pipeline delays due to pending historian credentials. Working to unblock access this week.',
    statusUpdatedAt: new Date('2024-02-10'),
    meetings: [
      {
        title: 'Operations Pulse Check',
        date: new Date('2024-02-05'),
        time: '09:00 AM CT',
        attendees: [
          'Avery Chen',
          'Dana Patel',
          'Miguel Rodriguez',
          'Priya Desai',
        ],
        notes: 'Reviewed historian export progress and CMMS cleanup blockers.',
        decisions:
          'Agreed to prioritize validation on the top three bottleneck assets.',
        risks:
          'Data pipeline delay if historian credentials are not provisioned.',
      },
      {
        title: 'Pilot Kickoff Prep',
        date: new Date('2024-02-15'),
        time: '02:00 PM CT',
        attendees: ['Avery Chen', 'Dana Patel', 'Plant 3 supervisors'],
        notes: 'Walked through pilot plan and asset readiness checklist.',
        decisions: 'Pilot scope limited to extrusion and packing lines.',
        risks: 'Need final sign-off on OT change window.',
      },
    ],
    milestones: [
      {
        name: 'Data Lake Readiness',
        description: 'Ensure historian exports and CMMS data are normalized.',
        status: MilestoneStatus.IN_PROGRESS,
        dueDate: new Date('2024-03-15'),
        tasks: [
          {
            title: 'Validate ETL transformations',
            description:
              'Review dbt jobs and confirm downtime tags are mapped.',
            status: TaskStatus.IN_PROGRESS,
            priority: Priority.P1,
            dueDate: new Date('2024-02-29'),
            sourceMeetingTitle: 'Operations Pulse Check',
          },
          {
            title: 'Finalize historian access policy',
            description: 'Security review for historian role-based access.',
            status: TaskStatus.BLOCKED,
            priority: Priority.P0,
            dueDate: new Date('2024-02-20'),
            ownerEmail: 'priya.desai@pmo.test',
          },
        ],
      },
      {
        name: 'Pilot Deployment',
        description: 'Deploy the predictive models to Plant 3 lines.',
        status: MilestoneStatus.NOT_STARTED,
        dueDate: new Date('2024-05-31'),
        tasks: [
          {
            title: 'Edge gateway sizing',
            description: 'Confirm memory footprint and redundancy plans.',
            status: TaskStatus.BACKLOG,
            priority: Priority.P1,
            sourceMeetingTitle: 'Pilot Kickoff Prep',
          },
        ],
      },
      {
        name: 'Executive Readout',
        description: 'Summarize KPI impact and next-phase budget ask.',
        status: MilestoneStatus.NOT_STARTED,
        dueDate: new Date('2024-07-15'),
        tasks: [],
      },
    ],
    tasks: [
      {
        title: 'Weekly ops sync',
        description: 'Standing meeting with plant ops and data team.',
        status: TaskStatus.DONE,
        priority: Priority.P2,
        sourceMeetingTitle: 'Operations Pulse Check',
      },
      {
        title: 'Model drift alerts',
        description: 'Design alert thresholds for pressure sensors.',
        status: TaskStatus.IN_PROGRESS,
        priority: Priority.P1,
        milestoneName: 'Pilot Deployment',
      },
    ],
  },
  {
    name: 'AI Intake Modernization',
    clientName: 'Brightside Health Group',
    ownerEmail: 'priya.desai@pmo.test',
    status: ProjectStatus.PLANNING,
    startDate: new Date('2024-02-01'),
    endDate: new Date('2024-06-15'),
    // M7 - Status & Reporting
    healthStatus: ProjectHealthStatus.ON_TRACK,
    statusSummary:
      'Care team interviews completed. Moving forward with journey mapping and prototype planning.',
    statusUpdatedAt: new Date('2024-02-08'),
    meetings: [
      {
        title: 'Care Team Interviews Readout',
        date: new Date('2024-02-08'),
        time: '11:30 AM PT',
        attendees: ['Priya Desai', 'Sarah Kim', 'Omar Greene', 'Marco Silva'],
        notes:
          'Summarized interview insights and mapped automation candidates.',
        decisions: 'Prototype should cover referral intake and triage routing.',
        risks: 'Need anonymization plan for sample transcripts.',
      },
    ],
    milestones: [
      {
        name: 'Patient Journey Mapping',
        description: 'Map pain points from referral to onboarding.',
        status: MilestoneStatus.IN_PROGRESS,
        dueDate: new Date('2024-03-10'),
        tasks: [
          {
            title: 'Interview care coordinators',
            description: 'Capture manual steps and exception handling.',
            status: TaskStatus.IN_PROGRESS,
            priority: Priority.P1,
            dueDate: new Date('2024-02-26'),
            sourceMeetingTitle: 'Care Team Interviews Readout',
          },
          {
            title: 'Journey artifacts sign-off',
            description: 'Ensure legal approves anonymized data usage.',
            status: TaskStatus.BACKLOG,
            priority: Priority.P2,
            ownerEmail: 'marco.silva@pmo.test',
          },
        ],
      },
      {
        name: 'Automation Prototype',
        description: 'Prototype triage flows in the intake assistant.',
        status: MilestoneStatus.NOT_STARTED,
        dueDate: new Date('2024-04-25'),
        tasks: [],
      },
    ],
    tasks: [
      {
        title: 'Define success metrics',
        description: 'Agree on CSAT, handle time, and RN coverage goals.',
        status: TaskStatus.BACKLOG,
        priority: Priority.P0,
      },
      {
        title: 'Security questionnaire',
        description: 'Complete vendor diligence package.',
        status: TaskStatus.IN_PROGRESS,
        priority: Priority.P1,
        ownerEmail: 'marco.silva@pmo.test',
        milestoneName: 'Automation Prototype',
        sourceMeetingTitle: 'Care Team Interviews Readout',
      },
    ],
  },
];

const aiAssetSeeds = [
  {
    name: 'Discovery Workshop Prompt Kit',
    type: AssetType.PROMPT_TEMPLATE,
    description:
      'System and user prompt templates to summarize discovery calls with clients.',
    content: {
      systemPrompt:
        'You are an AI project analyst. Summarize discovery notes with risks, blockers, and next actions.',
      placeholders: ['client_context', 'meeting_notes', 'next_steps'],
    },
    tags: ['template', 'prompt', 'discovery'],
    isTemplate: true,
    createdByEmail: 'avery.chen@pmo.test',
  },
  {
    name: 'Guardrail - PHI Redaction',
    type: AssetType.GUARDRAIL,
    description:
      'Regex and policy snippets to prevent PHI leakage in chat transcripts and summaries.',
    content: {
      blockedPatterns: ['SSN', 'MRN', 'phone', 'address'],
      action: 'mask',
    },
    tags: ['guardrail', 'compliance', 'healthcare'],
    isTemplate: true,
    createdByEmail: 'priya.desai@pmo.test',
  },
  {
    name: 'Plant 3 Downtime Playbook',
    type: AssetType.WORKFLOW,
    clientName: 'Acme Manufacturing',
    projectNames: ['Predictive Maintenance Rollout'],
    description:
      'Workflow for triaging downtime anomalies on Plant 3 extrusion lines.',
    content: {
      steps: [
        'Collect 24h historian window with pressure/temperature tags',
        'Run anomaly notebook and attach plots',
        'Draft Slack update using maintenance template',
      ],
      outputs: ['notebook_link', 'slack_update'],
    },
    tags: ['workflow', 'maintenance', 'pilot'],
    createdByEmail: 'avery.chen@pmo.test',
  },
  {
    name: 'Intake Triage Evaluation Set',
    type: AssetType.EVALUATION,
    clientName: 'Brightside Health Group',
    projectNames: ['AI Intake Modernization'],
    description:
      'Sample referral transcripts and expected routing labels for triage quality checks.',
    content: {
      examples: [
        {
          transcript: 'Referral for oncology consult with urgent symptoms',
          label: 'urgent',
        },
        {
          transcript: 'New patient seeking therapist with Spanish fluency',
          label: 'standard',
        },
      ],
    },
    tags: ['evaluation', 'routing', 'healthcare'],
    createdByEmail: 'marco.silva@pmo.test',
  },
];

const brandProfileSeeds = [
  {
    clientName: 'Elipse Consulting',
    name: 'Elipse Consulting',
    description:
      'A modern consulting brand with "ELIPSE" in bold text and "CONSULTING" as a subtitle with letter spacing.',
    primaryColor: '#9F1239', // Rose - used for main headings and "ELIPSE" text
    secondaryColor: '#F97316', // Orange - central color in the sunrise gradient
    accentColor: '#FCD34D', // Yellow - sun rays/accents
    fonts: {
      primary: {
        name: 'Primary Font',
        usage: 'ELIPSE heading text - bold weight',
      },
      secondary: {
        name: 'Secondary Font',
        usage: 'CONSULTING subtitle - letter spacing applied',
      },
    },
    toneVoiceGuidelines:
      'Professional, innovative, and approachable. Emphasizes partnership and launching successful initiatives.',
    valueProposition:
      'Expert consulting partners helping organizations launch and scale their strategic initiatives.',
    targetAudience:
      'Organizations seeking strategic consulting for digital transformation and business growth.',
    keyMessages: [
      'Launching success together',
      'Strategic partnerships for growth',
      'From vision to reality',
    ],
    brandColors: {
      gradient: {
        top: { name: 'Red', hex: '#EF4444', usage: 'Gradient top (sunrise)' },
        middle: {
          name: 'Orange',
          hex: '#F97316',
          usage: 'Gradient middle (sunrise)',
        },
        bottom: {
          name: 'Amber',
          hex: '#F59E0B',
          usage: 'Gradient bottom (sunrise)',
        },
      },
      accents: {
        yellow: { name: 'Yellow', hex: '#FCD34D', usage: 'Sun rays/accents' },
      },
      text: {
        primary: {
          name: 'Rose',
          hex: '#9F1239',
          usage: 'Primary text & horizon line (light backgrounds)',
        },
        primaryDark: {
          name: 'Pink',
          hex: '#FDA4AF',
          usage: 'Horizon line (dark backgrounds)',
        },
        secondary: {
          name: 'Slate',
          hex: '#64748B',
          usage: 'Subtitle/secondary text (light backgrounds)',
        },
        secondaryDark: {
          name: 'Light Slate',
          hex: '#CBD5E1',
          usage: 'Subtitle/secondary text (dark backgrounds)',
        },
      },
    },
    assets: [
      {
        name: 'Primary Logo (Light Background)',
        type: BrandAssetType.LOGO,
        description:
          'Primary horizontal logo for light backgrounds - full color with ELIPSE text',
        tags: ['primary', 'horizontal', 'light-bg'],
      },
      {
        name: 'Primary Logo (Dark Background)',
        type: BrandAssetType.LOGO,
        description:
          'Primary horizontal logo for dark backgrounds - adapted colors for dark mode',
        tags: ['primary', 'horizontal', 'dark-bg'],
      },
      {
        name: 'Stacked/Vertical Logo',
        type: BrandAssetType.LOGO,
        description:
          'Stacked/vertical version of the logo for square format usage',
        tags: ['stacked', 'vertical', 'square'],
      },
      {
        name: 'Icon Only (Light Background)',
        type: BrandAssetType.LOGO,
        description:
          'Sunrise icon only for light backgrounds - no text, suitable for favicons and app icons',
        tags: ['icon', 'light-bg', 'favicon'],
      },
      {
        name: 'Icon Only (Dark Background)',
        type: BrandAssetType.LOGO,
        description:
          'Sunrise icon only for dark backgrounds - adapted colors for dark mode',
        tags: ['icon', 'dark-bg', 'favicon'],
      },
      {
        name: 'Favicon Pack',
        type: BrandAssetType.IMAGE,
        description:
          'Complete favicon pack with sizes: 16px, 32px, 48px, 64px, 128px, 256px, 512px',
        tags: ['favicon', 'icon', 'web', 'multiple-sizes'],
      },
    ],
    fileFormats: ['SVG', 'PNG', 'PDF'],
  },
];

// Demo marketing content for showcasing the marketing tools
// All content is created by admin and linked to the AI Strategy Roadmap project
// so it's visible when logged in as the admin user
const marketingContentSeeds = [
  // Published content
  {
    name: 'AI Consulting Success: 60% Support Cost Reduction',
    type: ContentType.LINKEDIN_POST,
    channel: ContentChannel.LINKEDIN,
    status: ContentStatus.PUBLISHED,
    clientName: 'Elipse Consulting',
    projectName: 'AI Strategy Roadmap',
    createdByEmail: 'admin@pmo.test',
    summary: 'Case study highlighting AI chatbot implementation results',
    content: {
      body: `Digital transformation isn't just a buzzword - it's the key to staying competitive.

Our latest case study shows how one client achieved:
• 60% reduction in support tickets
• 45% faster response times
• 92% customer satisfaction scores

The secret? AI-powered automation that enhances, not replaces, human connection.

Want to learn how AI can transform your business? Drop a comment below or visit our website.

#DigitalTransformation #AI #CustomerSuccess #Innovation`,
    },
    tags: ['case-study', 'ai', 'customer-success', 'digital-transformation'],
    publishedAt: new Date('2024-01-20'),
  },
  {
    name: '5 Ways AI is Revolutionizing Customer Service',
    type: ContentType.BLOG_POST,
    channel: ContentChannel.WEB,
    status: ContentStatus.PUBLISHED,
    clientName: 'Elipse Consulting',
    projectName: 'AI Strategy Roadmap',
    createdByEmail: 'admin@pmo.test',
    summary: 'Comprehensive guide to AI in customer service',
    content: {
      title: '5 Ways AI is Revolutionizing Customer Service in 2024',
      body: `## Introduction
The customer service landscape is evolving rapidly, and AI is at the forefront of this transformation.

## 1. 24/7 Intelligent Support
Modern AI chatbots don't just answer FAQs - they understand context, sentiment, and can handle complex inquiries around the clock.

## 2. Predictive Customer Insights
AI analyzes patterns to predict customer needs before they even reach out, enabling proactive support.

## 3. Seamless Human-AI Collaboration
The best AI systems know when to escalate to human agents, ensuring customers always get the right level of support.

## 4. Personalized Experiences at Scale
AI enables hyper-personalization for every customer interaction, regardless of volume.

## 5. Continuous Learning and Improvement
Machine learning algorithms constantly improve from every interaction, making your support better over time.

## Conclusion
The future of customer service isn't about replacing humans with machines - it's about empowering teams to deliver exceptional experiences.`,
      metaDescription:
        'Discover how AI is transforming customer service with 24/7 support, predictive insights, and personalized experiences.',
    },
    tags: ['ai', 'customer-service', 'thought-leadership', 'guide'],
    publishedAt: new Date('2024-01-15'),
  },
  // Scheduled content
  {
    name: 'Manufacturing AI: Predictive Maintenance ROI',
    type: ContentType.LINKEDIN_POST,
    channel: ContentChannel.LINKEDIN,
    status: ContentStatus.READY,
    clientName: 'Elipse Consulting',
    projectName: 'AI Strategy Roadmap',
    createdByEmail: 'admin@pmo.test',
    summary: 'Sharing insights from our predictive maintenance project',
    content: {
      body: `Predictive maintenance isn't science fiction - it's saving manufacturers millions.

Here's what our latest implementation achieved:
📊 35% reduction in unplanned downtime
💰 $2.1M annual savings in maintenance costs
🔧 42% fewer emergency repairs

The key? Combining IoT sensor data with ML models that learn from your specific equipment patterns.

Ready to stop reactive maintenance and start predicting failures before they happen?

#Manufacturing #AI #PredictiveMaintenance #Industry40`,
    },
    tags: ['manufacturing', 'predictive-maintenance', 'iot', 'case-study'],
    scheduledFor: new Date('2024-02-20'),
  },
  {
    name: 'Healthcare AI: Patient Intake Automation',
    type: ContentType.CASE_STUDY,
    channel: ContentChannel.WEB,
    status: ContentStatus.READY,
    clientName: 'Elipse Consulting',
    projectName: 'AI Strategy Roadmap',
    createdByEmail: 'admin@pmo.test',
    summary: 'Detailed case study on healthcare AI implementation',
    content: {
      title: 'How Brightside Health Reduced Patient Intake Time by 70%',
      sections: [
        {
          heading: 'The Challenge',
          content:
            'Manual intake processes were causing delays and frustrating patients.',
        },
        {
          heading: 'The Solution',
          content:
            'AI-powered intake forms with intelligent document analysis.',
        },
        {
          heading: 'The Results',
          content:
            '70% faster intake, 85% patient satisfaction, zero compliance issues.',
        },
      ],
    },
    tags: ['healthcare', 'patient-intake', 'automation', 'case-study'],
    scheduledFor: new Date('2024-02-25'),
  },
  // Draft content
  {
    name: 'Q1 2024 AI Consulting Newsletter',
    type: ContentType.NEWSLETTER,
    channel: ContentChannel.EMAIL,
    status: ContentStatus.DRAFT,
    clientName: 'Elipse Consulting',
    projectName: 'AI Strategy Roadmap',
    createdByEmail: 'admin@pmo.test',
    summary: 'Monthly newsletter showcasing AI trends and company updates',
    content: {
      subject: 'AI Insights: What We Learned in Q1 2024',
      sections: [
        {
          title: 'Featured Case Study',
          content: 'How we helped a manufacturing client save $2M annually',
        },
        {
          title: 'Industry Trends',
          content: 'The rise of specialized AI assistants',
        },
        { title: 'Tips & Tricks', content: 'Getting started with AI chatbots' },
      ],
    },
    tags: ['newsletter', 'quarterly-update', 'trends'],
  },
  {
    name: 'Twitter Thread: AI Implementation Tips',
    type: ContentType.TWITTER_POST,
    channel: ContentChannel.TWITTER,
    status: ContentStatus.DRAFT,
    clientName: 'Elipse Consulting',
    projectName: 'AI Strategy Roadmap',
    createdByEmail: 'admin@pmo.test',
    summary: 'Thread sharing practical AI implementation advice',
    content: {
      thread: [
        '🧵 Thread: 10 lessons from implementing AI across 50+ companies. (1/11)',
        '1. Start small. Pick ONE process, perfect it, then scale. (2/11)',
        '2. Data quality > model complexity. Clean data beats fancy algorithms. (3/11)',
        '3. Involve end users from day 1. The best tech fails without adoption. (4/11)',
        '4. Set realistic expectations. AI is powerful, not magic. (5/11)',
        '5. Plan for maintenance. Models drift. Build monitoring from the start. (6/11)',
      ],
    },
    tags: ['tips', 'ai-implementation', 'thread', 'advice'],
  },
  // In Review content
  {
    name: 'Email Campaign: AI Readiness Assessment',
    type: ContentType.EMAIL_TEMPLATE,
    channel: ContentChannel.EMAIL,
    status: ContentStatus.IN_REVIEW,
    clientName: 'Elipse Consulting',
    projectName: 'AI Strategy Roadmap',
    createdByEmail: 'admin@pmo.test',
    summary: 'Lead nurture email offering free AI readiness assessment',
    content: {
      subject: 'Is Your Business Ready for AI? Free Assessment Inside',
      preheader: 'Discover your AI readiness score in 5 minutes',
      body: `Hi {{FirstName}},

Are you wondering if your business is ready to leverage AI?

Take our free 5-minute AI Readiness Assessment and get:
✅ Your personalized AI readiness score
✅ Identification of quick-win opportunities
✅ Custom recommendations for your industry

No sales pitch. Just actionable insights.

[Take the Assessment →]

Best,
The Elipse Team`,
    },
    tags: ['email', 'lead-nurture', 'assessment', 'marketing'],
  },
  // Ideas
  {
    name: 'Webinar: AI for Small Business',
    type: ContentType.VIDEO_SCRIPT,
    channel: ContentChannel.WEB,
    status: ContentStatus.IDEA,
    clientName: 'Elipse Consulting',
    projectName: 'AI Strategy Roadmap',
    createdByEmail: 'admin@pmo.test',
    summary: 'Webinar concept targeting small business owners',
    content: {
      concept:
        'Live webinar showing small businesses how to leverage AI without a big budget',
      targetAudience: 'Small business owners with 10-50 employees',
      proposedTopics: [
        'Free and low-cost AI tools',
        'Automating customer service on a budget',
        'AI-powered marketing for small teams',
      ],
    },
    tags: ['webinar', 'small-business', 'idea', 'video'],
  },
];

// Demo campaigns - created by admin for visibility
const campaignSeeds = [
  {
    name: 'Q1 2024 Thought Leadership',
    description:
      'Establish Elipse as the go-to AI consulting firm through thought leadership content',
    clientName: 'Elipse Consulting',
    status: CampaignStatus.ACTIVE,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-03-31'),
    goals: {
      linkedinFollowers: 500,
      websiteTraffic: 10000,
      leadGeneration: 50,
    },
    createdByEmail: 'admin@pmo.test',
  },
  {
    name: 'Manufacturing AI Solutions Launch',
    description:
      'Launch campaign for predictive maintenance and industrial AI solutions',
    clientName: 'Elipse Consulting',
    status: CampaignStatus.PLANNING,
    startDate: new Date('2024-02-15'),
    endDate: new Date('2024-05-15'),
    goals: {
      qualifiedLeads: 25,
      demoRequests: 15,
      pipelineValue: 500000,
    },
    createdByEmail: 'admin@pmo.test',
  },
];

// ============================================================================
// CRM SEED DATA
// ============================================================================

// CRM Accounts - mirrors clients but as proper CRM entities
const accountSeeds = [
  {
    name: 'Acme Manufacturing',
    website: 'https://acme-mfg.example.com',
    phone: '+1-312-555-0100',
    type: AccountType.CUSTOMER,
    industry: 'Industrial Manufacturing',
    employeeCount: AccountEmployeeCount.MEDIUM,
    annualRevenue: 50000000,
    ownerEmail: 'avery.chen@pmo.test',
    healthScore: 72,
    engagementScore: 65,
    churnRisk: 0.15,
    tags: ['manufacturing', 'predictive-maintenance', 'pilot'],
  },
  {
    name: 'Brightside Health Group',
    website: 'https://brightside-health.example.com',
    phone: '+1-415-555-0100',
    type: AccountType.CUSTOMER,
    industry: 'Healthcare',
    employeeCount: AccountEmployeeCount.SMALL,
    annualRevenue: 15000000,
    ownerEmail: 'priya.desai@pmo.test',
    healthScore: 85,
    engagementScore: 78,
    churnRisk: 0.08,
    tags: ['healthcare', 'automation', 'document-analysis'],
  },
  {
    name: 'TechForward Inc',
    website: 'https://techforward.example.com',
    phone: '+1-650-555-0200',
    type: AccountType.PROSPECT,
    industry: 'Technology',
    employeeCount: AccountEmployeeCount.LARGE,
    annualRevenue: 200000000,
    ownerEmail: 'marco.silva@pmo.test',
    healthScore: 50,
    engagementScore: 60,
    churnRisk: 0.25,
    tags: ['technology', 'ai-strategy', 'enterprise'],
  },
  {
    name: 'GreenEnergy Solutions',
    website: 'https://greenenergy.example.com',
    phone: '+1-303-555-0300',
    type: AccountType.PROSPECT,
    industry: 'Energy & Utilities',
    employeeCount: AccountEmployeeCount.MEDIUM,
    annualRevenue: 75000000,
    ownerEmail: 'avery.chen@pmo.test',
    healthScore: 50,
    engagementScore: 45,
    churnRisk: 0.3,
    tags: ['energy', 'sustainability', 'iot'],
  },
  {
    name: 'Velocity Logistics',
    website: 'https://velocity-logistics.example.com',
    phone: '+1-214-555-0400',
    type: AccountType.CUSTOMER,
    industry: 'Transportation & Logistics',
    employeeCount: AccountEmployeeCount.LARGE,
    annualRevenue: 120000000,
    ownerEmail: 'admin@pmo.test',
    healthScore: 68,
    engagementScore: 70,
    churnRisk: 0.12,
    tags: ['logistics', 'supply-chain', 'optimization'],
  },
];

// CRM Contacts linked to accounts
const crmContactSeeds = [
  // Acme Manufacturing contacts
  {
    accountName: 'Acme Manufacturing',
    firstName: 'Dana',
    lastName: 'Patel',
    email: 'dana.patel@acme-mfg.example.com',
    phone: '+1-312-555-0101',
    jobTitle: 'Operations Director',
    department: 'Operations',
    lifecycle: ContactLifecycle.CUSTOMER,
    leadSource: CRMLeadSource.REFERRAL,
    isPrimary: true,
    ownerEmail: 'avery.chen@pmo.test',
  },
  {
    accountName: 'Acme Manufacturing',
    firstName: 'Miguel',
    lastName: 'Rodriguez',
    email: 'miguel.rodriguez@acme-mfg.example.com',
    phone: '+1-312-555-0118',
    jobTitle: 'Maintenance Manager',
    department: 'Maintenance',
    lifecycle: ContactLifecycle.CUSTOMER,
    leadSource: CRMLeadSource.REFERRAL,
    isPrimary: false,
    ownerEmail: 'avery.chen@pmo.test',
  },
  // Brightside Health contacts
  {
    accountName: 'Brightside Health Group',
    firstName: 'Sarah',
    lastName: 'Kim',
    email: 'sarah.kim@brightside-health.example.com',
    phone: '+1-415-555-0199',
    jobTitle: 'Innovation Lead',
    department: 'Innovation',
    lifecycle: ContactLifecycle.CUSTOMER,
    leadSource: CRMLeadSource.LINKEDIN,
    isPrimary: true,
    ownerEmail: 'priya.desai@pmo.test',
  },
  {
    accountName: 'Brightside Health Group',
    firstName: 'Omar',
    lastName: 'Greene',
    email: 'omar.greene@brightside-health.example.com',
    phone: '+1-415-555-0142',
    jobTitle: 'IT Manager',
    department: 'IT',
    lifecycle: ContactLifecycle.CUSTOMER,
    leadSource: CRMLeadSource.LINKEDIN,
    isPrimary: false,
    ownerEmail: 'priya.desai@pmo.test',
  },
  // TechForward prospects
  {
    accountName: 'TechForward Inc',
    firstName: 'Jennifer',
    lastName: 'Walsh',
    email: 'jennifer.walsh@techforward.example.com',
    phone: '+1-650-555-0201',
    jobTitle: 'VP of Engineering',
    department: 'Engineering',
    lifecycle: ContactLifecycle.SQL,
    leadSource: CRMLeadSource.EVENT,
    leadScore: 85,
    isPrimary: true,
    ownerEmail: 'marco.silva@pmo.test',
  },
  // GreenEnergy prospects
  {
    accountName: 'GreenEnergy Solutions',
    firstName: 'Marcus',
    lastName: 'Thompson',
    email: 'marcus.thompson@greenenergy.example.com',
    phone: '+1-303-555-0301',
    jobTitle: 'CTO',
    department: 'Technology',
    lifecycle: ContactLifecycle.MQL,
    leadSource: CRMLeadSource.WEBSITE,
    leadScore: 65,
    isPrimary: true,
    ownerEmail: 'avery.chen@pmo.test',
  },
  // Velocity Logistics contacts
  {
    accountName: 'Velocity Logistics',
    firstName: 'Robert',
    lastName: 'Chen',
    email: 'robert.chen@velocity-logistics.example.com',
    phone: '+1-214-555-0401',
    jobTitle: 'Director of Operations',
    department: 'Operations',
    lifecycle: ContactLifecycle.CUSTOMER,
    leadSource: CRMLeadSource.COLD_CALL,
    isPrimary: true,
    ownerEmail: 'admin@pmo.test',
  },
];

// Default pipeline stages
const pipelineStageSeeds = [
  {
    name: 'Lead',
    description: 'Initial lead qualification',
    order: 1,
    probability: 10,
    type: PipelineStageType.OPEN,
    color: '#6366F1',
    rottenDays: 7,
  },
  {
    name: 'Discovery',
    description: 'Discovery calls and needs assessment',
    order: 2,
    probability: 25,
    type: PipelineStageType.OPEN,
    color: '#8B5CF6',
    rottenDays: 14,
  },
  {
    name: 'Proposal',
    description: 'Proposal preparation and presentation',
    order: 3,
    probability: 50,
    type: PipelineStageType.OPEN,
    color: '#A855F7',
    rottenDays: 21,
  },
  {
    name: 'Negotiation',
    description: 'Contract negotiation and terms discussion',
    order: 4,
    probability: 75,
    type: PipelineStageType.OPEN,
    color: '#D946EF',
    rottenDays: 14,
  },
  {
    name: 'Closed Won',
    description: 'Deal successfully closed',
    order: 5,
    probability: 100,
    type: PipelineStageType.WON,
    color: '#22C55E',
  },
  {
    name: 'Closed Lost',
    description: 'Deal lost to competitor or no decision',
    order: 6,
    probability: 0,
    type: PipelineStageType.LOST,
    color: '#EF4444',
  },
];

// Opportunities - sales pipeline data
const opportunitySeeds = [
  {
    name: 'Acme Predictive Maintenance Phase 2',
    description:
      'Expansion of predictive maintenance system to additional plants',
    accountName: 'Acme Manufacturing',
    stageName: 'Proposal',
    amount: 250000,
    probability: 50,
    expectedCloseDate: new Date('2024-06-30'),
    ownerEmail: 'avery.chen@pmo.test',
    leadSource: CRMLeadSource.REFERRAL,
    tags: ['expansion', 'manufacturing', 'ai'],
  },
  {
    name: 'Brightside Patient Portal AI',
    description: 'AI-powered patient portal with chatbot integration',
    accountName: 'Brightside Health Group',
    stageName: 'Negotiation',
    amount: 175000,
    probability: 75,
    expectedCloseDate: new Date('2024-04-15'),
    ownerEmail: 'priya.desai@pmo.test',
    leadSource: CRMLeadSource.LINKEDIN,
    tags: ['healthcare', 'chatbot', 'patient-experience'],
  },
  {
    name: 'TechForward AI Strategy Engagement',
    description: 'Comprehensive AI strategy and roadmap development',
    accountName: 'TechForward Inc',
    stageName: 'Discovery',
    amount: 500000,
    probability: 25,
    expectedCloseDate: new Date('2024-08-01'),
    ownerEmail: 'marco.silva@pmo.test',
    leadSource: CRMLeadSource.EVENT,
    tags: ['strategy', 'enterprise', 'transformation'],
  },
  {
    name: 'GreenEnergy IoT Analytics Platform',
    description: 'Real-time energy analytics and optimization platform',
    accountName: 'GreenEnergy Solutions',
    stageName: 'Lead',
    amount: 150000,
    probability: 10,
    expectedCloseDate: new Date('2024-09-30'),
    ownerEmail: 'avery.chen@pmo.test',
    leadSource: CRMLeadSource.WEBSITE,
    tags: ['iot', 'analytics', 'sustainability'],
  },
  {
    name: 'Velocity Supply Chain Optimization',
    description: 'AI-driven supply chain optimization and demand forecasting',
    accountName: 'Velocity Logistics',
    stageName: 'Closed Won',
    amount: 325000,
    probability: 100,
    expectedCloseDate: new Date('2024-02-28'),
    actualCloseDate: new Date('2024-02-25'),
    ownerEmail: 'admin@pmo.test',
    leadSource: CRMLeadSource.COLD_CALL,
    tags: ['logistics', 'forecasting', 'optimization'],
  },
  {
    name: 'Velocity Fleet Management AI',
    description: 'Predictive fleet maintenance and route optimization',
    accountName: 'Velocity Logistics',
    stageName: 'Proposal',
    amount: 200000,
    probability: 50,
    expectedCloseDate: new Date('2024-07-15'),
    ownerEmail: 'admin@pmo.test',
    leadSource: CRMLeadSource.REFERRAL,
    tags: ['fleet', 'maintenance', 'routing'],
  },
];

// ============================================================================
// BUG TRACKING SEED DATA
// ============================================================================

// Bug tracking labels
const issueLabelSeeds = [
  {
    name: 'bug',
    color: '#EF4444',
    description: "Something isn't working correctly",
  },
  { name: 'feature', color: '#3B82F6', description: 'New feature request' },
  {
    name: 'enhancement',
    color: '#8B5CF6',
    description: 'Improvement to existing functionality',
  },
  {
    name: 'documentation',
    color: '#6366F1',
    description: 'Documentation improvements',
  },
  {
    name: 'urgent',
    color: '#DC2626',
    description: 'Needs immediate attention',
  },
  {
    name: 'ui/ux',
    color: '#EC4899',
    description: 'User interface or experience issue',
  },
  { name: 'api', color: '#14B8A6', description: 'API-related issue' },
  {
    name: 'performance',
    color: '#F59E0B',
    description: 'Performance optimization needed',
  },
  {
    name: 'security',
    color: '#7C3AED',
    description: 'Security-related concern',
  },
  {
    name: 'good-first-issue',
    color: '#22C55E',
    description: 'Good for newcomers',
  },
];

// Sample issues for testing
const issueSeeds = [
  {
    title: 'Dashboard charts not loading on slow connections',
    description:
      'When loading the operations dashboard on a slow network connection, the charts fail to render and show a blank state instead of a loading indicator.',
    type: IssueType.BUG,
    status: IssueStatus.OPEN,
    priority: IssuePriority.MEDIUM,
    source: IssueSource.MANUAL,
    reportedByEmail: 'priya.desai@pmo.test',
    assignedToEmail: 'marco.silva@pmo.test',
    labels: ['bug', 'ui/ux'],
    environment: 'production',
  },
  {
    title: 'Add bulk export for opportunities',
    description:
      'Users need the ability to export multiple opportunities to CSV/Excel format for reporting purposes.',
    type: IssueType.FEATURE_REQUEST,
    status: IssueStatus.TRIAGING,
    priority: IssuePriority.LOW,
    source: IssueSource.MANUAL,
    reportedByEmail: 'admin@pmo.test',
    labels: ['feature', 'enhancement'],
  },
  {
    title: 'API rate limiting error messages are unclear',
    description:
      "When the API rate limit is hit, the error message doesn't clearly indicate how long to wait before retrying.",
    type: IssueType.IMPROVEMENT,
    status: IssueStatus.IN_PROGRESS,
    priority: IssuePriority.MEDIUM,
    source: IssueSource.MANUAL,
    reportedByEmail: 'avery.chen@pmo.test',
    assignedToEmail: 'priya.desai@pmo.test',
    labels: ['api', 'enhancement'],
    environment: 'production',
  },
  {
    title: 'Health score calculation includes archived accounts',
    description:
      'The portfolio health dashboard incorrectly includes archived accounts in the average health score calculation.',
    type: IssueType.BUG,
    status: IssueStatus.RESOLVED,
    priority: IssuePriority.HIGH,
    source: IssueSource.MANUAL,
    reportedByEmail: 'admin@pmo.test',
    assignedToEmail: 'avery.chen@pmo.test',
    labels: ['bug', 'urgent'],
    environment: 'production',
  },
  {
    title: 'Add dark mode support',
    description:
      'Implement system-wide dark mode theme option for better accessibility and user preference.',
    type: IssueType.FEATURE_REQUEST,
    status: IssueStatus.OPEN,
    priority: IssuePriority.LOW,
    source: IssueSource.AI_ASSISTANT,
    labels: ['feature', 'ui/ux', 'good-first-issue'],
  },
];

// ============================================================================
// LEADS SEED DATA
// ============================================================================

// Inbound leads for testing lead management
const inboundLeadSeeds = [
  {
    name: 'David Chen',
    email: 'david.chen@startup-inc.example.com',
    company: 'StartupInc',
    website: 'https://startup-inc.example.com',
    source: LeadSource.WEBSITE_CONTACT,
    serviceInterest: ServiceInterest.STRATEGY,
    message:
      'Looking for AI strategy consulting for our Series A startup. We have a budget of ~$50k for initial engagement.',
    status: LeadStatus.NEW,
    ownerEmail: 'avery.chen@pmo.test',
    page: '/contact',
    utmSource: 'google',
    utmMedium: 'cpc',
    utmCampaign: 'ai-consulting-2024',
  },
  {
    name: 'Amanda Foster',
    email: 'amanda.foster@retailco.example.com',
    company: 'RetailCo',
    website: 'https://retailco.example.com',
    source: LeadSource.LINKEDIN,
    serviceInterest: ServiceInterest.IMPLEMENTATION,
    message:
      'Need help implementing AI-powered inventory management. Currently using spreadsheets for 50+ locations.',
    status: LeadStatus.CONTACTED,
    ownerEmail: 'priya.desai@pmo.test',
  },
  {
    name: 'James Wilson',
    email: 'james.wilson@finserv.example.com',
    company: 'FinServ Partners',
    website: 'https://finserv-partners.example.com',
    source: LeadSource.REFERRAL,
    serviceInterest: ServiceInterest.POC,
    message:
      'Referred by Velocity Logistics. Interested in fraud detection AI proof of concept.',
    status: LeadStatus.QUALIFIED,
    ownerEmail: 'marco.silva@pmo.test',
  },
  {
    name: 'Lisa Park',
    email: 'lisa.park@edutech.example.com',
    company: 'EduTech Learning',
    source: LeadSource.EVENT,
    serviceInterest: ServiceInterest.TRAINING,
    message:
      'Met at AI Summit 2024. Looking for AI training for our engineering team.',
    status: LeadStatus.CONTACTED,
    ownerEmail: 'admin@pmo.test',
  },
  {
    name: 'Michael Brown',
    email: 'michael.brown@mfg-solutions.example.com',
    company: 'MFG Solutions',
    website: 'https://mfg-solutions.example.com',
    source: LeadSource.WEBSITE_DOWNLOAD,
    serviceInterest: ServiceInterest.PMO_ADVISORY,
    message:
      'Downloaded the predictive maintenance whitepaper. Interested in discussing implementation.',
    status: LeadStatus.NEW,
    ownerEmail: 'avery.chen@pmo.test',
    page: '/resources/predictive-maintenance-whitepaper',
    utmSource: 'linkedin',
    utmMedium: 'social',
  },
];

// ============================================================================
// AI PROJECTS MODULE SEED DATA
// ============================================================================

// Task dependencies for auto-scheduling demonstration
const taskDependencySeeds = [
  {
    projectName: 'Predictive Maintenance Rollout',
    clientName: 'Acme Manufacturing',
    dependencies: [
      {
        dependentTask: 'Model drift alerts',
        blockingTask: 'Validate ETL transformations',
        dependencyType: DependencyType.FINISH_TO_START,
      },
      {
        dependentTask: 'Edge gateway sizing',
        blockingTask: 'Validate ETL transformations',
        dependencyType: DependencyType.FINISH_TO_START,
      },
    ],
  },
  {
    projectName: 'AI Intake Modernization',
    clientName: 'Brightside Health Group',
    dependencies: [
      {
        dependentTask: 'Journey artifacts sign-off',
        blockingTask: 'Interview care coordinators',
        dependencyType: DependencyType.FINISH_TO_START,
      },
    ],
  },
];

// AI-powered task enhancements (estimated hours, scheduling)
const taskAIEnhancements = [
  {
    projectName: 'Predictive Maintenance Rollout',
    clientName: 'Acme Manufacturing',
    tasks: [
      {
        title: 'Validate ETL transformations',
        aiEstimatedHours: 16,
        estimatedHours: 20,
        scheduledStartDate: new Date('2024-02-20'),
        scheduledEndDate: new Date('2024-02-22'),
      },
      {
        title: 'Finalize historian access policy',
        aiEstimatedHours: 4,
        estimatedHours: 8,
        scheduledStartDate: new Date('2024-02-15'),
        scheduledEndDate: new Date('2024-02-16'),
      },
      {
        title: 'Model drift alerts',
        aiEstimatedHours: 12,
        scheduledStartDate: new Date('2024-02-25'),
        scheduledEndDate: new Date('2024-02-28'),
      },
      {
        title: 'Edge gateway sizing',
        aiEstimatedHours: 8,
        scheduledStartDate: new Date('2024-03-01'),
        scheduledEndDate: new Date('2024-03-02'),
      },
    ],
  },
  {
    projectName: 'AI Intake Modernization',
    clientName: 'Brightside Health Group',
    tasks: [
      {
        title: 'Interview care coordinators',
        aiEstimatedHours: 12,
        estimatedHours: 16,
        scheduledStartDate: new Date('2024-02-12'),
        scheduledEndDate: new Date('2024-02-14'),
      },
      {
        title: 'Define success metrics',
        aiEstimatedHours: 4,
        scheduledStartDate: new Date('2024-02-08'),
        scheduledEndDate: new Date('2024-02-08'),
      },
      {
        title: 'Security questionnaire',
        aiEstimatedHours: 6,
        estimatedHours: 8,
        scheduledStartDate: new Date('2024-02-19'),
        scheduledEndDate: new Date('2024-02-20'),
      },
    ],
  },
  {
    projectName: 'AI Strategy Roadmap',
    clientName: 'Elipse Consulting',
    tasks: [
      {
        title: 'Publish AI customer service blog post',
        aiEstimatedHours: 4,
        actualHours: 3.5,
        scheduledStartDate: new Date('2024-01-12'),
        scheduledEndDate: new Date('2024-01-12'),
      },
      {
        title: 'Draft manufacturing case study',
        aiEstimatedHours: 16,
        estimatedHours: 20,
        scheduledStartDate: new Date('2024-02-20'),
        scheduledEndDate: new Date('2024-02-28'),
      },
    ],
  },
];

// Project scope baselines for scope creep detection
const projectScopeBaselineSeeds = [
  {
    projectName: 'Predictive Maintenance Rollout',
    clientName: 'Acme Manufacturing',
    baselineDate: new Date('2024-01-15'),
    originalTaskCount: 6,
    originalMilestoneCount: 3,
    originalScope: {
      goals: [
        'Deploy predictive maintenance models to Plant 3',
        'Reduce unplanned downtime by 35%',
        'Achieve $2.1M annual maintenance cost savings',
      ],
      deliverables: [
        'Data lake integration with historian and CMMS',
        'ML models for extrusion and packing lines',
        'Alert dashboard for operations team',
        'Executive ROI report',
      ],
      exclusions: [
        'Plants 1, 2, and 4 (future phases)',
        'SCADA system upgrades',
        'Hardware replacement',
      ],
    },
    isActive: true,
  },
  {
    projectName: 'AI Intake Modernization',
    clientName: 'Brightside Health Group',
    baselineDate: new Date('2024-02-01'),
    originalTaskCount: 5,
    originalMilestoneCount: 2,
    originalScope: {
      goals: [
        'Reduce patient intake time by 70%',
        'Achieve 85% patient satisfaction scores',
        'Automate referral triage routing',
      ],
      deliverables: [
        'Patient journey maps',
        'AI intake prototype',
        'Integration with EHR system',
        'Training materials',
      ],
      exclusions: [
        'Legacy system migration',
        'Hardware procurement',
        'HIPAA certification (handled separately)',
      ],
    },
    isActive: true,
  },
];

// Project health predictions
const projectHealthPredictionSeeds = [
  {
    projectName: 'Predictive Maintenance Rollout',
    clientName: 'Acme Manufacturing',
    predictions: [
      {
        predictedHealth: ProjectHealthStatus.AT_RISK,
        confidence: 0.78,
        predictedDate: new Date('2024-03-15'),
        factors: {
          taskVelocity: 0.6,
          milestoneRisk: 0.8,
          blockerCount: 0.9,
          resourceUtilization: 0.7,
        },
        actualHealth: ProjectHealthStatus.AT_RISK,
        wasAccurate: true,
      },
      {
        predictedHealth: ProjectHealthStatus.ON_TRACK,
        confidence: 0.65,
        predictedDate: new Date('2024-04-15'),
        factors: {
          taskVelocity: 0.5,
          milestoneRisk: 0.4,
          blockerCount: 0.3,
          resourceUtilization: 0.6,
        },
      },
    ],
  },
  {
    projectName: 'AI Intake Modernization',
    clientName: 'Brightside Health Group',
    predictions: [
      {
        predictedHealth: ProjectHealthStatus.ON_TRACK,
        confidence: 0.85,
        predictedDate: new Date('2024-03-10'),
        factors: {
          taskVelocity: 0.3,
          milestoneRisk: 0.2,
          blockerCount: 0.1,
          resourceUtilization: 0.5,
        },
        actualHealth: ProjectHealthStatus.ON_TRACK,
        wasAccurate: true,
      },
    ],
  },
];

// Project risks extracted from meetings
const projectRiskSeeds = [
  {
    projectName: 'Predictive Maintenance Rollout',
    clientName: 'Acme Manufacturing',
    risks: [
      {
        sourceType: RiskSourceType.MEETING,
        sourceMeetingTitle: 'Operations Pulse Check',
        title: 'Historian Credentials Delay',
        description:
          'Data pipeline may be blocked if historian credentials are not provisioned on time.',
        severity: RiskSeverity.HIGH,
        category: RiskCategory.TIMELINE,
        suggestedMitigation:
          'Escalate to IT leadership and establish daily check-ins on provisioning status.',
        relatedQuote:
          'Data pipeline delay if historian credentials are not provisioned.',
        status: RiskStatus.MITIGATING,
      },
      {
        sourceType: RiskSourceType.MEETING,
        sourceMeetingTitle: 'Pilot Kickoff Prep',
        title: 'OT Change Window Sign-off',
        description:
          'Final sign-off on OT change window is pending, which could delay pilot deployment.',
        severity: RiskSeverity.MEDIUM,
        category: RiskCategory.SCOPE,
        suggestedMitigation:
          'Schedule dedicated meeting with plant operations to secure change window approval.',
        relatedQuote: 'Need final sign-off on OT change window.',
        status: RiskStatus.IDENTIFIED,
      },
      {
        sourceType: RiskSourceType.AI_DETECTED,
        title: 'Resource Contention Risk',
        description:
          'AI detected potential resource conflict - same team members assigned to multiple critical path tasks.',
        severity: RiskSeverity.MEDIUM,
        category: RiskCategory.RESOURCE,
        suggestedMitigation:
          'Review task assignments and consider bringing in additional support for data pipeline work.',
        status: RiskStatus.ANALYZING,
      },
    ],
  },
  {
    projectName: 'AI Intake Modernization',
    clientName: 'Brightside Health Group',
    risks: [
      {
        sourceType: RiskSourceType.MEETING,
        sourceMeetingTitle: 'Care Team Interviews Readout',
        title: 'Data Anonymization Requirement',
        description:
          'Need anonymization plan for sample transcripts before prototype development can proceed.',
        severity: RiskSeverity.MEDIUM,
        category: RiskCategory.SCOPE,
        suggestedMitigation:
          'Engage compliance team early to develop anonymization guidelines.',
        relatedQuote: 'Need anonymization plan for sample transcripts.',
        status: RiskStatus.IDENTIFIED,
      },
    ],
  },
];

// Project documents
const projectDocumentSeeds = [
  {
    projectName: 'Predictive Maintenance Rollout',
    clientName: 'Acme Manufacturing',
    documents: [
      {
        templateType: ProjectDocumentType.PROJECT_PLAN,
        category: ProjectDocumentCategory.CORE,
        name: 'Predictive Maintenance Implementation Plan',
        description:
          'Comprehensive project plan for Plant 3 predictive maintenance rollout',
        status: ProjectDocumentStatus.APPROVED,
        content: {
          scope: {
            description:
              'Deploy predictive maintenance ML models to Plant 3 extrusion and packing lines',
            objectives: [
              'Reduce unplanned downtime by 35%',
              'Achieve $2.1M annual savings',
              'Establish data pipeline from historian to analytics platform',
            ],
          },
          schedule: {
            phases: [
              {
                name: 'Data Lake Readiness',
                startDate: '2024-01-15',
                endDate: '2024-03-15',
              },
              {
                name: 'Pilot Deployment',
                startDate: '2024-03-16',
                endDate: '2024-05-31',
              },
              {
                name: 'Executive Readout',
                startDate: '2024-06-01',
                endDate: '2024-07-15',
              },
            ],
          },
          stakeholders: [
            { name: 'Dana Patel', role: 'Executive Sponsor' },
            { name: 'Miguel Rodriguez', role: 'Technical Lead' },
            { name: 'Avery Chen', role: 'Project Manager' },
          ],
        },
        version: 2,
        createdByEmail: 'avery.chen@pmo.test',
      },
      {
        templateType: ProjectDocumentType.STATUS_REPORT,
        category: ProjectDocumentCategory.CORE,
        name: 'Week 4 Status Report',
        description: 'Weekly status update for stakeholders',
        status: ProjectDocumentStatus.APPROVED,
        content: {
          reportDate: '2024-02-12',
          overallStatus: 'AT_RISK',
          summary:
            'Data pipeline progress blocked by pending historian credentials. Working on escalation.',
          accomplishments: [
            'Completed ETL transformation design',
            'Finalized pilot scope to extrusion and packing lines',
            'Established weekly ops sync cadence',
          ],
          plannedActivities: [
            'Obtain historian credentials',
            'Complete ETL validation',
            'Begin edge gateway sizing',
          ],
          risks: [
            {
              description: 'Historian credentials not provisioned',
              impact: 'HIGH',
              mitigation: 'Escalating to IT leadership',
            },
          ],
          metrics: {
            tasksCompleted: 3,
            tasksInProgress: 4,
            tasksBlocked: 1,
            milestoneProgress: 33,
          },
        },
        version: 1,
        createdByEmail: 'avery.chen@pmo.test',
      },
      {
        templateType: ProjectDocumentType.RISK_REGISTER,
        category: ProjectDocumentCategory.CORE,
        name: 'Risk Register - Q1 2024',
        description: 'Project risk tracking document',
        status: ProjectDocumentStatus.DRAFT,
        content: {
          risks: [
            {
              id: 'R001',
              title: 'Historian Credentials Delay',
              likelihood: 4,
              impact: 5,
              riskScore: 20,
              status: 'Mitigating',
              owner: 'Priya Desai',
              mitigation: 'Escalate to IT leadership',
            },
            {
              id: 'R002',
              title: 'OT Change Window Approval',
              likelihood: 3,
              impact: 4,
              riskScore: 12,
              status: 'Identified',
              owner: 'Avery Chen',
              mitigation: 'Schedule dedicated approval meeting',
            },
          ],
          lastUpdated: '2024-02-10',
        },
        version: 1,
        createdByEmail: 'avery.chen@pmo.test',
      },
    ],
  },
  {
    projectName: 'AI Intake Modernization',
    clientName: 'Brightside Health Group',
    documents: [
      {
        templateType: ProjectDocumentType.KICKOFF_AGENDA,
        category: ProjectDocumentCategory.LIFECYCLE,
        name: 'Project Kickoff Meeting Agenda',
        description: 'Kickoff meeting structure and talking points',
        status: ProjectDocumentStatus.APPROVED,
        content: {
          meetingDate: '2024-02-01',
          attendees: ['Sarah Kim', 'Omar Greene', 'Priya Desai', 'Marco Silva'],
          agenda: [
            {
              topic: 'Project Overview & Goals',
              duration: 15,
              presenter: 'Priya Desai',
            },
            {
              topic: 'Scope & Deliverables',
              duration: 20,
              presenter: 'Priya Desai',
            },
            {
              topic: 'Timeline & Milestones',
              duration: 15,
              presenter: 'Marco Silva',
            },
            {
              topic: 'Team Introductions & Roles',
              duration: 10,
              presenter: 'All',
            },
            {
              topic: 'Q&A',
              duration: 15,
              presenter: 'All',
            },
          ],
          decisions: [
            'Prototype will cover referral intake and triage routing',
            'Weekly sync meetings on Thursdays at 11:30 AM PT',
          ],
        },
        version: 1,
        createdByEmail: 'priya.desai@pmo.test',
      },
    ],
  },
];

// Project digest configurations
const projectDigestConfigSeeds = [
  {
    projectName: 'Predictive Maintenance Rollout',
    clientName: 'Acme Manufacturing',
    configs: [
      {
        recipientType: DigestRecipientType.STAKEHOLDER,
        customEmails: ['dana.patel@acme.test'],
        frequency: DigestFrequency.WEEKLY,
        dayOfWeek: 1, // Monday
        timeOfDay: '09:00',
        timezone: 'America/Chicago',
        detailLevel: DigestDetailLevel.EXECUTIVE,
        includeSections: ['summary', 'milestones', 'risks'],
        isActive: true,
      },
      {
        recipientType: DigestRecipientType.TEAM,
        customEmails: [],
        frequency: DigestFrequency.DAILY,
        dayOfWeek: null,
        timeOfDay: '08:00',
        timezone: 'America/Chicago',
        detailLevel: DigestDetailLevel.DETAILED,
        includeSections: [
          'summary',
          'tasks',
          'milestones',
          'risks',
          'timeline',
        ],
        isActive: true,
      },
    ],
  },
  {
    projectName: 'AI Intake Modernization',
    clientName: 'Brightside Health Group',
    configs: [
      {
        recipientType: DigestRecipientType.OWNER,
        customEmails: [],
        frequency: DigestFrequency.WEEKLY,
        dayOfWeek: 5, // Friday
        timeOfDay: '16:00',
        timezone: 'America/Los_Angeles',
        detailLevel: DigestDetailLevel.STANDARD,
        includeSections: ['summary', 'tasks', 'milestones'],
        isActive: true,
      },
    ],
  },
];

// Team availability data
const teamAvailabilitySeeds = [
  {
    userEmail: 'avery.chen@pmo.test',
    availability: [
      { date: new Date('2024-02-19'), availableHours: 8, allocatedHours: 6 },
      { date: new Date('2024-02-20'), availableHours: 8, allocatedHours: 8 },
      { date: new Date('2024-02-21'), availableHours: 6, allocatedHours: 4 },
      { date: new Date('2024-02-22'), availableHours: 8, allocatedHours: 7 },
      { date: new Date('2024-02-23'), availableHours: 4, allocatedHours: 2 },
    ],
  },
  {
    userEmail: 'priya.desai@pmo.test',
    availability: [
      { date: new Date('2024-02-19'), availableHours: 8, allocatedHours: 5 },
      { date: new Date('2024-02-20'), availableHours: 8, allocatedHours: 6 },
      { date: new Date('2024-02-21'), availableHours: 8, allocatedHours: 8 },
      { date: new Date('2024-02-22'), availableHours: 4, allocatedHours: 3 },
      { date: new Date('2024-02-23'), availableHours: 8, allocatedHours: 4 },
    ],
  },
  {
    userEmail: 'marco.silva@pmo.test',
    availability: [
      { date: new Date('2024-02-19'), availableHours: 6, allocatedHours: 6 },
      { date: new Date('2024-02-20'), availableHours: 8, allocatedHours: 4 },
      { date: new Date('2024-02-21'), availableHours: 8, allocatedHours: 5 },
      { date: new Date('2024-02-22'), availableHours: 8, allocatedHours: 6 },
      { date: new Date('2024-02-23'), availableHours: 8, allocatedHours: 3 },
    ],
  },
];

async function main() {
  const bcryptSaltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? '10');

  if (Number.isNaN(bcryptSaltRounds)) {
    throw new Error('BCRYPT_SALT_ROUNDS must be a number');
  }

  const userMap = new Map<string, number>();
  for (const userData of users) {
    const passwordHash = await bcrypt.hash(userData.password, bcryptSaltRounds);

    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        name: userData.name,
        passwordHash,
        timezone: userData.timezone,
        role: userData.role,
      },
      create: {
        name: userData.name,
        email: userData.email,
        passwordHash,
        timezone: userData.timezone,
        role: userData.role,
      },
    });
    userMap.set(user.email, user.id);
  }

  // Create default tenant for multi-tenant support
  const defaultTenant = await prisma.tenant.upsert({
    where: { slug: 'default' },
    update: {
      name: 'Elipse Consulting',
    },
    create: {
      name: 'Elipse Consulting',
      slug: 'default',
      plan: 'PROFESSIONAL',
      status: 'ACTIVE',
    },
  });
  console.log(`  ✓ Default tenant created/updated: ${defaultTenant.name}`);

  // Link all users to the default tenant
  for (const [email, userId] of userMap) {
    const userRole = users.find((u) => u.email === email)?.role;
    const isOwner =
      userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN;
    await prisma.tenantUser.upsert({
      where: {
        tenantId_userId: {
          tenantId: defaultTenant.id,
          userId,
        },
      },
      update: {
        role: isOwner ? TenantRole.OWNER : TenantRole.MEMBER,
      },
      create: {
        tenantId: defaultTenant.id,
        userId,
        role: isOwner ? TenantRole.OWNER : TenantRole.MEMBER,
        acceptedAt: new Date(),
      },
    });
  }
  console.log(`  ✓ Linked ${userMap.size} users to default tenant`);

  const clientMap = new Map<string, number>();
  const projectMap = new Map<string, { id: number; clientId: number }>();
  for (const clientData of clients) {
    const existingClient = await prisma.client.findFirst({
      where: { name: clientData.name },
    });

    const client = existingClient
      ? await prisma.client.update({
          where: { id: existingClient.id },
          data: {
            tenantId: defaultTenant.id,
            industry: clientData.industry,
            companySize: clientData.companySize,
            timezone: clientData.timezone,
            aiMaturity: clientData.aiMaturity,
            notes: clientData.notes,
            archived: false,
          },
        })
      : await prisma.client.create({
          data: {
            tenantId: defaultTenant.id,
            name: clientData.name,
            industry: clientData.industry,
            companySize: clientData.companySize,
            timezone: clientData.timezone,
            aiMaturity: clientData.aiMaturity,
            notes: clientData.notes,
          },
        });

    clientMap.set(client.name, client.id);

    for (const contact of clientData.contacts) {
      await prisma.contact.upsert({
        where: {
          clientId_email: {
            clientId: client.id,
            email: contact.email,
          },
        },
        update: {
          name: contact.name,
          role: contact.role,
          phone: contact.phone,
          notes: contact.notes,
          archived: false,
        },
        create: {
          clientId: client.id,
          name: contact.name,
          email: contact.email,
          role: contact.role,
          phone: contact.phone,
          notes: contact.notes,
        },
      });
    }
  }

  for (const projectSeed of projectSeeds) {
    const clientId = clientMap.get(projectSeed.clientName);
    if (!clientId) {
      throw new Error(
        `Client ${projectSeed.clientName} not found during seeding.`,
      );
    }

    const ownerId = userMap.get(projectSeed.ownerEmail);
    if (!ownerId) {
      throw new Error(
        `Owner ${projectSeed.ownerEmail} not found during seeding.`,
      );
    }

    const existingProject = await prisma.project.findFirst({
      where: { name: projectSeed.name, clientId },
    });

    const project = existingProject
      ? await prisma.project.update({
          where: { id: existingProject.id },
          data: {
            tenantId: defaultTenant.id,
            ownerId,
            status: projectSeed.status,
            startDate: projectSeed.startDate,
            endDate: projectSeed.endDate,
            healthStatus: projectSeed.healthStatus,
            statusSummary: projectSeed.statusSummary,
            statusUpdatedAt: projectSeed.statusUpdatedAt,
          },
        })
      : await prisma.project.create({
          data: {
            tenantId: defaultTenant.id,
            name: projectSeed.name,
            clientId,
            ownerId,
            status: projectSeed.status,
            startDate: projectSeed.startDate,
            endDate: projectSeed.endDate,
            healthStatus: projectSeed.healthStatus,
            statusSummary: projectSeed.statusSummary,
            statusUpdatedAt: projectSeed.statusUpdatedAt,
          },
        });

    const milestoneMap = new Map<string, number>();
    const meetingMap = new Map<string, number>();
    const projectKey = `${projectSeed.clientName}::${projectSeed.name}`;
    projectMap.set(projectKey, { id: project.id, clientId });

    for (const meetingSeed of projectSeed.meetings ?? []) {
      const existingMeeting = await prisma.meeting.findFirst({
        where: {
          projectId: project.id,
          title: meetingSeed.title,
          date: meetingSeed.date,
        },
      });

      const meeting = existingMeeting
        ? await prisma.meeting.update({
            where: { id: existingMeeting.id },
            data: {
              time: meetingSeed.time,
              attendees: meetingSeed.attendees,
              notes: meetingSeed.notes,
              decisions: meetingSeed.decisions,
              risks: meetingSeed.risks,
            },
          })
        : await prisma.meeting.create({
            data: {
              projectId: project.id,
              title: meetingSeed.title,
              date: meetingSeed.date,
              time: meetingSeed.time,
              attendees: meetingSeed.attendees,
              notes: meetingSeed.notes,
              decisions: meetingSeed.decisions,
              risks: meetingSeed.risks,
            },
          });

      meetingMap.set(meeting.title, meeting.id);
    }

    for (const milestoneSeed of projectSeed.milestones) {
      const existingMilestone = await prisma.milestone.findFirst({
        where: { projectId: project.id, name: milestoneSeed.name },
      });

      const milestone = existingMilestone
        ? await prisma.milestone.update({
            where: { id: existingMilestone.id },
            data: {
              description: milestoneSeed.description,
              dueDate: milestoneSeed.dueDate,
              status: milestoneSeed.status,
            },
          })
        : await prisma.milestone.create({
            data: {
              projectId: project.id,
              name: milestoneSeed.name,
              description: milestoneSeed.description,
              dueDate: milestoneSeed.dueDate,
              status: milestoneSeed.status,
            },
          });

      milestoneMap.set(milestone.name, milestone.id);

      for (const taskSeed of milestoneSeed.tasks) {
        const resolvedOwnerEmail =
          taskSeed.ownerEmail ?? projectSeed.ownerEmail;
        const taskOwnerId = userMap.get(resolvedOwnerEmail);
        if (!taskOwnerId) {
          throw new Error(
            `Task owner ${resolvedOwnerEmail} not found during seeding.`,
          );
        }
        const sourceMeetingId = taskSeed.sourceMeetingTitle
          ? meetingMap.get(taskSeed.sourceMeetingTitle)
          : undefined;

        if (taskSeed.sourceMeetingTitle && !sourceMeetingId) {
          throw new Error(
            `Meeting ${taskSeed.sourceMeetingTitle} not found for project ${projectSeed.name}.`,
          );
        }

        await upsertTask({
          projectId: project.id,
          taskSeed,
          ownerId: taskOwnerId,
          milestoneId: milestone.id,
          sourceMeetingId,
        });
      }
    }

    for (const taskSeed of projectSeed.tasks) {
      const milestoneId = taskSeed.milestoneName
        ? milestoneMap.get(taskSeed.milestoneName)
        : undefined;

      const resolvedOwnerEmail = taskSeed.ownerEmail ?? projectSeed.ownerEmail;
      const taskOwnerId = userMap.get(resolvedOwnerEmail);
      if (!taskOwnerId) {
        throw new Error(
          `Task owner ${resolvedOwnerEmail} not found during seeding.`,
        );
      }

      const sourceMeetingId = taskSeed.sourceMeetingTitle
        ? meetingMap.get(taskSeed.sourceMeetingTitle)
        : undefined;

      if (taskSeed.sourceMeetingTitle && !sourceMeetingId) {
        throw new Error(
          `Meeting ${taskSeed.sourceMeetingTitle} not found for project ${projectSeed.name}.`,
        );
      }

      await upsertTask({
        projectId: project.id,
        taskSeed,
        ownerId: taskOwnerId,
        milestoneId,
        sourceMeetingId,
      });
    }
  }

  for (const assetSeed of aiAssetSeeds) {
    const clientId = assetSeed.clientName
      ? clientMap.get(assetSeed.clientName)
      : undefined;

    if (assetSeed.clientName && !clientId) {
      throw new Error(
        `Client ${assetSeed.clientName} not found for AI asset seeding.`,
      );
    }

    const createdById = assetSeed.createdByEmail
      ? userMap.get(assetSeed.createdByEmail)
      : undefined;

    if (assetSeed.createdByEmail && !createdById) {
      throw new Error(
        `Creator ${assetSeed.createdByEmail} not found for AI asset ${assetSeed.name}.`,
      );
    }

    // Handle template assets (clientId is null) differently due to unique constraint
    let asset;
    if (clientId) {
      // Client-specific asset: use upsert with compound key
      asset = await prisma.aIAsset.upsert({
        where: {
          name_clientId: {
            name: assetSeed.name,
            clientId: clientId,
          },
        },
        update: {
          type: assetSeed.type,
          description: assetSeed.description,
          content: assetSeed.content,
          tags: assetSeed.tags ?? [],
          isTemplate: assetSeed.isTemplate ?? false,
          createdById: createdById ?? null,
        },
        create: {
          name: assetSeed.name,
          type: assetSeed.type,
          description: assetSeed.description,
          content: assetSeed.content,
          tags: assetSeed.tags ?? [],
          isTemplate: assetSeed.isTemplate ?? false,
          clientId: clientId,
          createdById: createdById ?? undefined,
        },
      });
    } else {
      // Template asset (clientId is null): find or create
      asset = await prisma.aIAsset.findFirst({
        where: {
          name: assetSeed.name,
          clientId: null,
        },
      });

      if (asset) {
        // Update existing template
        asset = await prisma.aIAsset.update({
          where: { id: asset.id },
          data: {
            type: assetSeed.type,
            description: assetSeed.description,
            content: assetSeed.content,
            tags: assetSeed.tags ?? [],
            isTemplate: assetSeed.isTemplate ?? false,
            createdById: createdById ?? null,
          },
        });
      } else {
        // Create new template
        asset = await prisma.aIAsset.create({
          data: {
            name: assetSeed.name,
            type: assetSeed.type,
            description: assetSeed.description,
            content: assetSeed.content,
            tags: assetSeed.tags ?? [],
            isTemplate: assetSeed.isTemplate ?? false,
            clientId: null,
            createdById: createdById ?? undefined,
          },
        });
      }
    }

    for (const projectName of assetSeed.projectNames ?? []) {
      const projectKey = `${assetSeed.clientName}::${projectName}`;
      const project = projectMap.get(projectKey);

      if (!project) {
        throw new Error(
          `Project ${projectName} not found for client ${assetSeed.clientName} during AI asset linking.`,
        );
      }

      await prisma.projectAIAsset.upsert({
        where: {
          projectId_assetId: {
            projectId: project.id,
            assetId: asset.id,
          },
        },
        update: {
          notes: assetSeed.projectNotes ?? null,
        },
        create: {
          projectId: project.id,
          assetId: asset.id,
          notes: assetSeed.projectNotes,
        },
      });
    }
  }

  // Seed brand profiles and assets
  for (const brandProfileSeed of brandProfileSeeds) {
    const clientId = clientMap.get(brandProfileSeed.clientName);
    if (!clientId) {
      throw new Error(
        `Client ${brandProfileSeed.clientName} not found for brand profile seeding.`,
      );
    }

    // Prepare metadata with extended brand colors and file formats
    const metadata = {
      brandColors: brandProfileSeed.brandColors,
      fileFormats: brandProfileSeed.fileFormats,
    };

    // Upsert brand profile
    const existingBrandProfile = await prisma.brandProfile.findUnique({
      where: { clientId },
    });

    const brandProfile = existingBrandProfile
      ? await prisma.brandProfile.update({
          where: { id: existingBrandProfile.id },
          data: {
            name: brandProfileSeed.name,
            description: brandProfileSeed.description,
            primaryColor: brandProfileSeed.primaryColor,
            secondaryColor: brandProfileSeed.secondaryColor,
            accentColor: brandProfileSeed.accentColor,
            fonts: brandProfileSeed.fonts,
            metadata,
            toneVoiceGuidelines: brandProfileSeed.toneVoiceGuidelines,
            valueProposition: brandProfileSeed.valueProposition,
            targetAudience: brandProfileSeed.targetAudience,
            keyMessages: brandProfileSeed.keyMessages,
            archived: false,
          },
        })
      : await prisma.brandProfile.create({
          data: {
            clientId,
            name: brandProfileSeed.name,
            description: brandProfileSeed.description,
            primaryColor: brandProfileSeed.primaryColor,
            secondaryColor: brandProfileSeed.secondaryColor,
            accentColor: brandProfileSeed.accentColor,
            fonts: brandProfileSeed.fonts,
            metadata,
            toneVoiceGuidelines: brandProfileSeed.toneVoiceGuidelines,
            valueProposition: brandProfileSeed.valueProposition,
            targetAudience: brandProfileSeed.targetAudience,
            keyMessages: brandProfileSeed.keyMessages,
          },
        });

    // Seed brand assets
    for (const assetSeed of brandProfileSeed.assets) {
      const existingAsset = await prisma.brandAsset.findFirst({
        where: {
          brandProfileId: brandProfile.id,
          name: assetSeed.name,
        },
      });

      if (existingAsset) {
        await prisma.brandAsset.update({
          where: { id: existingAsset.id },
          data: {
            type: assetSeed.type,
            description: assetSeed.description,
            tags: assetSeed.tags,
            archived: false,
          },
        });
      } else {
        await prisma.brandAsset.create({
          data: {
            brandProfileId: brandProfile.id,
            name: assetSeed.name,
            type: assetSeed.type,
            url: '', // Placeholder - URL to be added when assets are uploaded
            description: assetSeed.description,
            tags: assetSeed.tags,
          },
        });
      }
    }
  }

  // Seed campaigns first (so we can link content to them)
  const campaignMap = new Map<string, number>();
  for (const campaignSeed of campaignSeeds) {
    const clientId = clientMap.get(campaignSeed.clientName);
    if (!clientId) {
      throw new Error(
        `Client ${campaignSeed.clientName} not found for campaign seeding.`,
      );
    }

    const createdById = userMap.get(campaignSeed.createdByEmail);
    if (!createdById) {
      throw new Error(
        `Creator ${campaignSeed.createdByEmail} not found for campaign seeding.`,
      );
    }

    const existingCampaign = await prisma.campaign.findFirst({
      where: { name: campaignSeed.name, clientId },
    });

    const campaign = existingCampaign
      ? await prisma.campaign.update({
          where: { id: existingCampaign.id },
          data: {
            description: campaignSeed.description,
            status: campaignSeed.status,
            startDate: campaignSeed.startDate,
            endDate: campaignSeed.endDate,
            goals: campaignSeed.goals,
            createdById,
            archived: false,
          },
        })
      : await prisma.campaign.create({
          data: {
            clientId,
            name: campaignSeed.name,
            description: campaignSeed.description,
            status: campaignSeed.status,
            startDate: campaignSeed.startDate,
            endDate: campaignSeed.endDate,
            goals: campaignSeed.goals,
            createdById,
          },
        });

    campaignMap.set(campaign.name, campaign.id);
  }

  // Seed marketing content
  for (const contentSeed of marketingContentSeeds) {
    const clientId = clientMap.get(contentSeed.clientName);
    if (!clientId) {
      throw new Error(
        `Client ${contentSeed.clientName} not found for marketing content seeding.`,
      );
    }

    const createdById = contentSeed.createdByEmail
      ? userMap.get(contentSeed.createdByEmail)
      : undefined;

    // Find project ID if specified
    let projectId: number | undefined;
    if (contentSeed.projectName) {
      const projectKey = `${contentSeed.clientName}::${contentSeed.projectName}`;
      const project = projectMap.get(projectKey);
      if (project) {
        projectId = project.id;
      }
    }

    const existingContent = await prisma.marketingContent.findFirst({
      where: { name: contentSeed.name, clientId },
    });

    if (existingContent) {
      await prisma.marketingContent.update({
        where: { id: existingContent.id },
        data: {
          type: contentSeed.type,
          channel: contentSeed.channel,
          status: contentSeed.status,
          content: contentSeed.content,
          summary: contentSeed.summary,
          tags: contentSeed.tags ?? [],
          projectId,
          createdById,
          publishedAt: contentSeed.publishedAt,
          scheduledFor: contentSeed.scheduledFor,
          archived: false,
        },
      });
    } else {
      await prisma.marketingContent.create({
        data: {
          clientId,
          name: contentSeed.name,
          type: contentSeed.type,
          channel: contentSeed.channel,
          status: contentSeed.status,
          content: contentSeed.content,
          summary: contentSeed.summary,
          tags: contentSeed.tags ?? [],
          projectId,
          createdById,
          publishedAt: contentSeed.publishedAt,
          scheduledFor: contentSeed.scheduledFor,
        },
      });
    }
  }

  // ============================================================================
  // SEED CRM DATA
  // ============================================================================
  console.log('  ✓ Seeding CRM data...');

  // Create CRM Accounts
  const accountMap = new Map<string, number>();
  for (const accountSeed of accountSeeds) {
    const ownerId = userMap.get(accountSeed.ownerEmail);
    if (!ownerId) {
      throw new Error(
        `Owner ${accountSeed.ownerEmail} not found for account seeding.`,
      );
    }

    const existingAccount = await prisma.account.findFirst({
      where: { tenantId: defaultTenant.id, name: accountSeed.name },
    });

    const account = existingAccount
      ? await prisma.account.update({
          where: { id: existingAccount.id },
          data: {
            website: accountSeed.website,
            phone: accountSeed.phone,
            type: accountSeed.type,
            industry: accountSeed.industry,
            employeeCount: accountSeed.employeeCount,
            annualRevenue: accountSeed.annualRevenue,
            healthScore: accountSeed.healthScore,
            engagementScore: accountSeed.engagementScore,
            churnRisk: accountSeed.churnRisk,
            tags: accountSeed.tags,
            ownerId,
            archived: false,
          },
        })
      : await prisma.account.create({
          data: {
            tenantId: defaultTenant.id,
            name: accountSeed.name,
            website: accountSeed.website,
            phone: accountSeed.phone,
            type: accountSeed.type,
            industry: accountSeed.industry,
            employeeCount: accountSeed.employeeCount,
            annualRevenue: accountSeed.annualRevenue,
            healthScore: accountSeed.healthScore,
            engagementScore: accountSeed.engagementScore,
            churnRisk: accountSeed.churnRisk,
            tags: accountSeed.tags,
            ownerId,
          },
        });

    accountMap.set(account.name, account.id);
  }
  console.log(`  ✓ Created/updated ${accountSeeds.length} CRM accounts`);

  // Create default sales pipeline with stages
  const existingPipeline = await prisma.pipeline.findFirst({
    where: { tenantId: defaultTenant.id, isDefault: true },
  });

  const pipeline = existingPipeline
    ? await prisma.pipeline.update({
        where: { id: existingPipeline.id },
        data: {
          name: 'Default Sales Pipeline',
          description: 'Standard sales pipeline for consulting engagements',
          isActive: true,
        },
      })
    : await prisma.pipeline.create({
        data: {
          tenantId: defaultTenant.id,
          name: 'Default Sales Pipeline',
          description: 'Standard sales pipeline for consulting engagements',
          isDefault: true,
          isActive: true,
        },
      });
  console.log(`  ✓ Created/updated default pipeline`);

  // Create pipeline stages
  const stageMap = new Map<string, number>();
  for (const stageSeed of pipelineStageSeeds) {
    // Check by name first, then by order (unique constraint is on pipelineId + order)
    let existingStage = await prisma.salesPipelineStage.findFirst({
      where: { pipelineId: pipeline.id, name: stageSeed.name },
    });

    // If not found by name, check if there's a stage with the same order
    if (!existingStage) {
      existingStage = await prisma.salesPipelineStage.findFirst({
        where: { pipelineId: pipeline.id, order: stageSeed.order },
      });
    }

    const stage = existingStage
      ? await prisma.salesPipelineStage.update({
          where: { id: existingStage.id },
          data: {
            name: stageSeed.name,
            description: stageSeed.description,
            order: stageSeed.order,
            probability: stageSeed.probability,
            type: stageSeed.type,
            color: stageSeed.color,
            rottenDays: stageSeed.rottenDays,
          },
        })
      : await prisma.salesPipelineStage.create({
          data: {
            pipelineId: pipeline.id,
            name: stageSeed.name,
            description: stageSeed.description,
            order: stageSeed.order,
            probability: stageSeed.probability,
            type: stageSeed.type,
            color: stageSeed.color,
            rottenDays: stageSeed.rottenDays,
          },
        });

    stageMap.set(stage.name, stage.id);
  }
  console.log(
    `  ✓ Created/updated ${pipelineStageSeeds.length} pipeline stages`,
  );

  // Create CRM Contacts
  for (const contactSeed of crmContactSeeds) {
    const accountId = accountMap.get(contactSeed.accountName);
    if (!accountId) {
      throw new Error(
        `Account ${contactSeed.accountName} not found for CRM contact seeding.`,
      );
    }

    const ownerId = contactSeed.ownerEmail
      ? userMap.get(contactSeed.ownerEmail)
      : undefined;

    const existingContact = await prisma.cRMContact.findFirst({
      where: {
        tenantId: defaultTenant.id,
        email: contactSeed.email,
      },
    });

    if (existingContact) {
      await prisma.cRMContact.update({
        where: { id: existingContact.id },
        data: {
          accountId,
          firstName: contactSeed.firstName,
          lastName: contactSeed.lastName,
          phone: contactSeed.phone,
          jobTitle: contactSeed.jobTitle,
          department: contactSeed.department,
          lifecycle: contactSeed.lifecycle,
          leadSource: contactSeed.leadSource,
          leadScore: contactSeed.leadScore,
          isPrimary: contactSeed.isPrimary,
          ownerId,
          archived: false,
        },
      });
    } else {
      await prisma.cRMContact.create({
        data: {
          tenantId: defaultTenant.id,
          accountId,
          firstName: contactSeed.firstName,
          lastName: contactSeed.lastName,
          email: contactSeed.email,
          phone: contactSeed.phone,
          jobTitle: contactSeed.jobTitle,
          department: contactSeed.department,
          lifecycle: contactSeed.lifecycle,
          leadSource: contactSeed.leadSource,
          leadScore: contactSeed.leadScore,
          isPrimary: contactSeed.isPrimary,
          ownerId,
        },
      });
    }
  }
  console.log(`  ✓ Created/updated ${crmContactSeeds.length} CRM contacts`);

  // Create Opportunities
  for (const oppSeed of opportunitySeeds) {
    const accountId = accountMap.get(oppSeed.accountName);
    if (!accountId) {
      throw new Error(
        `Account ${oppSeed.accountName} not found for opportunity seeding.`,
      );
    }

    const stageId = stageMap.get(oppSeed.stageName);
    if (!stageId) {
      throw new Error(
        `Stage ${oppSeed.stageName} not found for opportunity seeding.`,
      );
    }

    const ownerId = userMap.get(oppSeed.ownerEmail);
    if (!ownerId) {
      throw new Error(
        `Owner ${oppSeed.ownerEmail} not found for opportunity seeding.`,
      );
    }

    const status =
      oppSeed.stageName === 'Closed Won'
        ? OpportunityStatus.WON
        : oppSeed.stageName === 'Closed Lost'
          ? OpportunityStatus.LOST
          : OpportunityStatus.OPEN;

    const weightedAmount = oppSeed.amount * (oppSeed.probability / 100);

    const existingOpp = await prisma.opportunity.findFirst({
      where: { tenantId: defaultTenant.id, name: oppSeed.name },
    });

    if (existingOpp) {
      await prisma.opportunity.update({
        where: { id: existingOpp.id },
        data: {
          description: oppSeed.description,
          accountId,
          pipelineId: pipeline.id,
          stageId,
          amount: oppSeed.amount,
          probability: oppSeed.probability,
          weightedAmount,
          status,
          expectedCloseDate: oppSeed.expectedCloseDate,
          actualCloseDate: oppSeed.actualCloseDate,
          leadSource: oppSeed.leadSource,
          tags: oppSeed.tags,
          ownerId,
        },
      });
    } else {
      await prisma.opportunity.create({
        data: {
          tenantId: defaultTenant.id,
          name: oppSeed.name,
          description: oppSeed.description,
          accountId,
          pipelineId: pipeline.id,
          stageId,
          amount: oppSeed.amount,
          probability: oppSeed.probability,
          weightedAmount,
          status,
          expectedCloseDate: oppSeed.expectedCloseDate,
          actualCloseDate: oppSeed.actualCloseDate,
          leadSource: oppSeed.leadSource,
          tags: oppSeed.tags,
          ownerId,
        },
      });
    }
  }
  console.log(`  ✓ Created/updated ${opportunitySeeds.length} opportunities`);

  // ============================================================================
  // SEED BUG TRACKING DATA
  // ============================================================================
  console.log('  ✓ Seeding bug tracking data...');

  // Create issue labels
  const labelMap = new Map<string, number>();
  for (const labelSeed of issueLabelSeeds) {
    const existingLabel = await prisma.issueLabel.findFirst({
      where: { tenantId: defaultTenant.id, name: labelSeed.name },
    });

    const label = existingLabel
      ? await prisma.issueLabel.update({
          where: { id: existingLabel.id },
          data: {
            color: labelSeed.color,
            description: labelSeed.description,
          },
        })
      : await prisma.issueLabel.create({
          data: {
            tenantId: defaultTenant.id,
            name: labelSeed.name,
            color: labelSeed.color,
            description: labelSeed.description,
          },
        });

    labelMap.set(label.name, label.id);
  }
  console.log(`  ✓ Created/updated ${issueLabelSeeds.length} issue labels`);

  // Create sample issues
  for (const issueSeed of issueSeeds) {
    const reportedById = issueSeed.reportedByEmail
      ? userMap.get(issueSeed.reportedByEmail)
      : undefined;
    const assignedToId = issueSeed.assignedToEmail
      ? userMap.get(issueSeed.assignedToEmail)
      : undefined;

    const existingIssue = await prisma.issue.findFirst({
      where: { tenantId: defaultTenant.id, title: issueSeed.title },
    });

    const labelIds = issueSeed.labels
      .map((name) => labelMap.get(name))
      .filter((id): id is number => id !== undefined);

    if (existingIssue) {
      await prisma.issue.update({
        where: { id: existingIssue.id },
        data: {
          description: issueSeed.description,
          type: issueSeed.type,
          status: issueSeed.status,
          priority: issueSeed.priority,
          source: issueSeed.source,
          reportedById,
          assignedToId,
          environment: issueSeed.environment,
          labels: {
            set: labelIds.map((id) => ({ id })),
          },
        },
      });
    } else {
      await prisma.issue.create({
        data: {
          tenantId: defaultTenant.id,
          title: issueSeed.title,
          description: issueSeed.description,
          type: issueSeed.type,
          status: issueSeed.status,
          priority: issueSeed.priority,
          source: issueSeed.source,
          reportedById,
          assignedToId,
          environment: issueSeed.environment,
          labels: {
            connect: labelIds.map((id) => ({ id })),
          },
        },
      });
    }
  }
  console.log(`  ✓ Created/updated ${issueSeeds.length} sample issues`);

  // ============================================================================
  // SEED INBOUND LEADS
  // ============================================================================
  console.log('  ✓ Seeding inbound leads...');

  for (const leadSeed of inboundLeadSeeds) {
    const ownerUserId = leadSeed.ownerEmail
      ? userMap.get(leadSeed.ownerEmail)
      : undefined;

    const existingLead = await prisma.inboundLead.findFirst({
      where: { tenantId: defaultTenant.id, email: leadSeed.email },
    });

    if (existingLead) {
      await prisma.inboundLead.update({
        where: { id: existingLead.id },
        data: {
          name: leadSeed.name,
          company: leadSeed.company,
          website: leadSeed.website,
          source: leadSeed.source,
          serviceInterest: leadSeed.serviceInterest,
          message: leadSeed.message,
          status: leadSeed.status,
          ownerUserId,
          page: leadSeed.page,
          utmSource: leadSeed.utmSource,
          utmMedium: leadSeed.utmMedium,
          utmCampaign: leadSeed.utmCampaign,
        },
      });
    } else {
      await prisma.inboundLead.create({
        data: {
          tenantId: defaultTenant.id,
          name: leadSeed.name,
          email: leadSeed.email,
          company: leadSeed.company,
          website: leadSeed.website,
          source: leadSeed.source,
          serviceInterest: leadSeed.serviceInterest,
          message: leadSeed.message,
          status: leadSeed.status,
          ownerUserId,
          page: leadSeed.page,
          utmSource: leadSeed.utmSource,
          utmMedium: leadSeed.utmMedium,
          utmCampaign: leadSeed.utmCampaign,
        },
      });
    }
  }
  console.log(`  ✓ Created/updated ${inboundLeadSeeds.length} inbound leads`);

  // ============================================================================
  // SEED AI PROJECTS MODULE DATA
  // ============================================================================
  console.log('  ✓ Seeding AI Projects module data...');

  // Create a task map for dependency creation
  const taskMap = new Map<string, number>();
  const allTasks = await prisma.task.findMany({
    include: { project: true },
  });
  for (const task of allTasks) {
    const project = await prisma.project.findUnique({
      where: { id: task.projectId },
      include: { client: true },
    });
    if (project?.client) {
      const key = `${project.client.name}::${project.name}::${task.title}`;
      taskMap.set(key, task.id);
    }
  }

  // Create meeting map for risk source linking
  const meetingMap = new Map<string, number>();
  const allMeetings = await prisma.meeting.findMany({
    include: { project: { include: { client: true } } },
  });
  for (const meeting of allMeetings) {
    if (meeting.project?.client) {
      const key = `${meeting.project.client.name}::${meeting.project.name}::${meeting.title}`;
      meetingMap.set(key, meeting.id);
    }
  }

  // Seed task dependencies
  let dependencyCount = 0;
  for (const depSeed of taskDependencySeeds) {
    const projectKey = `${depSeed.clientName}::${depSeed.projectName}`;
    const projectData = projectMap.get(projectKey);
    if (!projectData) {
      console.warn(`  ⚠ Project ${projectKey} not found for task dependencies`);
      continue;
    }

    for (const dep of depSeed.dependencies) {
      const dependentTaskKey = `${depSeed.clientName}::${depSeed.projectName}::${dep.dependentTask}`;
      const blockingTaskKey = `${depSeed.clientName}::${depSeed.projectName}::${dep.blockingTask}`;

      const dependentTaskId = taskMap.get(dependentTaskKey);
      const blockingTaskId = taskMap.get(blockingTaskKey);

      if (!dependentTaskId || !blockingTaskId) {
        console.warn(
          `  ⚠ Task not found for dependency: ${dep.dependentTask} <- ${dep.blockingTask}`,
        );
        continue;
      }

      await prisma.taskDependency.upsert({
        where: {
          dependentTaskId_blockingTaskId: {
            dependentTaskId,
            blockingTaskId,
          },
        },
        update: {
          dependencyType: dep.dependencyType,
        },
        create: {
          dependentTaskId,
          blockingTaskId,
          dependencyType: dep.dependencyType,
        },
      });
      dependencyCount++;
    }
  }
  console.log(`  ✓ Created/updated ${dependencyCount} task dependencies`);

  // Seed AI task enhancements
  let taskEnhancementCount = 0;
  for (const enhSeed of taskAIEnhancements) {
    for (const taskEnh of enhSeed.tasks) {
      const taskKey = `${enhSeed.clientName}::${enhSeed.projectName}::${taskEnh.title}`;
      const taskId = taskMap.get(taskKey);

      if (!taskId) {
        console.warn(`  ⚠ Task not found for AI enhancement: ${taskEnh.title}`);
        continue;
      }

      await prisma.task.update({
        where: { id: taskId },
        data: {
          aiEstimatedHours: taskEnh.aiEstimatedHours,
          estimatedHours: taskEnh.estimatedHours,
          actualHours: taskEnh.actualHours,
          scheduledStartDate: taskEnh.scheduledStartDate,
          scheduledEndDate: taskEnh.scheduledEndDate,
          aiScheduled: true,
          aiEstimateAccepted: taskEnh.estimatedHours ? false : null,
        },
      });
      taskEnhancementCount++;
    }
  }
  console.log(`  ✓ Updated ${taskEnhancementCount} tasks with AI enhancements`);

  // Seed project scope baselines
  for (const baselineSeed of projectScopeBaselineSeeds) {
    const projectKey = `${baselineSeed.clientName}::${baselineSeed.projectName}`;
    const projectData = projectMap.get(projectKey);
    if (!projectData) {
      console.warn(`  ⚠ Project ${projectKey} not found for scope baseline`);
      continue;
    }

    const existingBaseline = await prisma.projectScopeBaseline.findFirst({
      where: {
        projectId: projectData.id,
        baselineDate: baselineSeed.baselineDate,
      },
    });

    if (existingBaseline) {
      await prisma.projectScopeBaseline.update({
        where: { id: existingBaseline.id },
        data: {
          originalTaskCount: baselineSeed.originalTaskCount,
          originalMilestoneCount: baselineSeed.originalMilestoneCount,
          originalScope: baselineSeed.originalScope,
          isActive: baselineSeed.isActive,
        },
      });
    } else {
      await prisma.projectScopeBaseline.create({
        data: {
          tenantId: defaultTenant.id,
          projectId: projectData.id,
          baselineDate: baselineSeed.baselineDate,
          originalTaskCount: baselineSeed.originalTaskCount,
          originalMilestoneCount: baselineSeed.originalMilestoneCount,
          originalScope: baselineSeed.originalScope,
          isActive: baselineSeed.isActive,
        },
      });
    }
  }
  console.log(
    `  ✓ Created/updated ${projectScopeBaselineSeeds.length} project scope baselines`,
  );

  // Seed project health predictions
  let predictionCount = 0;
  for (const predSeed of projectHealthPredictionSeeds) {
    const projectKey = `${predSeed.clientName}::${predSeed.projectName}`;
    const projectData = projectMap.get(projectKey);
    if (!projectData) {
      console.warn(
        `  ⚠ Project ${projectKey} not found for health predictions`,
      );
      continue;
    }

    for (const pred of predSeed.predictions) {
      const existingPrediction = await prisma.projectHealthPrediction.findFirst(
        {
          where: {
            projectId: projectData.id,
            predictedDate: pred.predictedDate,
          },
        },
      );

      if (existingPrediction) {
        await prisma.projectHealthPrediction.update({
          where: { id: existingPrediction.id },
          data: {
            predictedHealth: pred.predictedHealth,
            confidence: pred.confidence,
            factors: pred.factors,
            actualHealth: pred.actualHealth,
            wasAccurate: pred.wasAccurate,
          },
        });
      } else {
        await prisma.projectHealthPrediction.create({
          data: {
            tenantId: defaultTenant.id,
            projectId: projectData.id,
            predictedHealth: pred.predictedHealth,
            confidence: pred.confidence,
            predictedDate: pred.predictedDate,
            factors: pred.factors,
            actualHealth: pred.actualHealth,
            wasAccurate: pred.wasAccurate,
          },
        });
      }
      predictionCount++;
    }
  }
  console.log(
    `  ✓ Created/updated ${predictionCount} project health predictions`,
  );

  // Seed project risks
  let riskCount = 0;
  for (const riskSeed of projectRiskSeeds) {
    const projectKey = `${riskSeed.clientName}::${riskSeed.projectName}`;
    const projectData = projectMap.get(projectKey);
    if (!projectData) {
      console.warn(`  ⚠ Project ${projectKey} not found for risks`);
      continue;
    }

    for (const risk of riskSeed.risks) {
      let sourceId: number | undefined;
      if (
        risk.sourceType === RiskSourceType.MEETING &&
        risk.sourceMeetingTitle
      ) {
        const meetingKey = `${riskSeed.clientName}::${riskSeed.projectName}::${risk.sourceMeetingTitle}`;
        sourceId = meetingMap.get(meetingKey);
      }

      const existingRisk = await prisma.projectRisk.findFirst({
        where: {
          projectId: projectData.id,
          title: risk.title,
        },
      });

      if (existingRisk) {
        await prisma.projectRisk.update({
          where: { id: existingRisk.id },
          data: {
            sourceType: risk.sourceType,
            sourceId,
            description: risk.description,
            severity: risk.severity,
            category: risk.category,
            suggestedMitigation: risk.suggestedMitigation,
            relatedQuote: risk.relatedQuote,
            status: risk.status,
          },
        });
      } else {
        await prisma.projectRisk.create({
          data: {
            tenantId: defaultTenant.id,
            projectId: projectData.id,
            sourceType: risk.sourceType,
            sourceId,
            title: risk.title,
            description: risk.description,
            severity: risk.severity,
            category: risk.category,
            suggestedMitigation: risk.suggestedMitigation,
            relatedQuote: risk.relatedQuote,
            status: risk.status,
          },
        });
      }
      riskCount++;
    }
  }
  console.log(`  ✓ Created/updated ${riskCount} project risks`);

  // Seed project documents
  let documentCount = 0;
  for (const docSeed of projectDocumentSeeds) {
    const projectKey = `${docSeed.clientName}::${docSeed.projectName}`;
    const projectData = projectMap.get(projectKey);
    if (!projectData) {
      console.warn(`  ⚠ Project ${projectKey} not found for documents`);
      continue;
    }

    for (const doc of docSeed.documents) {
      const editorId = doc.createdByEmail
        ? userMap.get(doc.createdByEmail)
        : undefined;

      const existingDoc = await prisma.projectDocument.findFirst({
        where: {
          projectId: projectData.id,
          templateType: doc.templateType,
          name: doc.name,
        },
      });

      if (existingDoc) {
        await prisma.projectDocument.update({
          where: { id: existingDoc.id },
          data: {
            category: doc.category,
            description: doc.description,
            status: doc.status,
            content: doc.content,
            version: doc.version,
            lastEditedBy: editorId,
            lastEditedAt: new Date(),
          },
        });
      } else {
        await prisma.projectDocument.create({
          data: {
            tenantId: defaultTenant.id,
            projectId: projectData.id,
            templateType: doc.templateType,
            category: doc.category,
            name: doc.name,
            description: doc.description,
            status: doc.status,
            content: doc.content,
            version: doc.version,
            lastEditedBy: editorId,
          },
        });
      }
      documentCount++;
    }
  }
  console.log(`  ✓ Created/updated ${documentCount} project documents`);

  // Seed project digest configurations
  let digestConfigCount = 0;
  for (const digestSeed of projectDigestConfigSeeds) {
    const projectKey = `${digestSeed.clientName}::${digestSeed.projectName}`;
    const projectData = projectMap.get(projectKey);
    if (!projectData) {
      console.warn(`  ⚠ Project ${projectKey} not found for digest configs`);
      continue;
    }

    for (const config of digestSeed.configs) {
      const existingConfig = await prisma.projectDigestConfig.findFirst({
        where: {
          projectId: projectData.id,
          recipientType: config.recipientType,
        },
      });

      if (existingConfig) {
        await prisma.projectDigestConfig.update({
          where: { id: existingConfig.id },
          data: {
            customEmails: config.customEmails,
            frequency: config.frequency,
            dayOfWeek: config.dayOfWeek,
            timeOfDay: config.timeOfDay,
            timezone: config.timezone,
            detailLevel: config.detailLevel,
            includeSections: config.includeSections,
            isActive: config.isActive,
          },
        });
      } else {
        await prisma.projectDigestConfig.create({
          data: {
            tenantId: defaultTenant.id,
            projectId: projectData.id,
            recipientType: config.recipientType,
            customEmails: config.customEmails,
            frequency: config.frequency,
            dayOfWeek: config.dayOfWeek,
            timeOfDay: config.timeOfDay,
            timezone: config.timezone,
            detailLevel: config.detailLevel,
            includeSections: config.includeSections,
            isActive: config.isActive,
          },
        });
      }
      digestConfigCount++;
    }
  }
  console.log(
    `  ✓ Created/updated ${digestConfigCount} project digest configurations`,
  );

  // Seed team availability
  let availabilityCount = 0;
  for (const availSeed of teamAvailabilitySeeds) {
    const userId = userMap.get(availSeed.userEmail);
    if (!userId) {
      console.warn(
        `  ⚠ User ${availSeed.userEmail} not found for availability`,
      );
      continue;
    }

    for (const avail of availSeed.availability) {
      await prisma.teamAvailability.upsert({
        where: {
          userId_date: {
            userId,
            date: avail.date,
          },
        },
        update: {
          availableHours: avail.availableHours,
          allocatedHours: avail.allocatedHours,
        },
        create: {
          tenantId: defaultTenant.id,
          userId,
          date: avail.date,
          availableHours: avail.availableHours,
          allocatedHours: avail.allocatedHours,
        },
      });
      availabilityCount++;
    }
  }
  console.log(
    `  ✓ Created/updated ${availabilityCount} team availability records`,
  );

  console.log('\n✅ Seed data complete!');
}

type TaskSeedInput = {
  projectId: number;
  taskSeed: {
    title: string;
    description?: string;
    status: TaskStatus;
    priority: Priority;
    dueDate?: Date;
    ownerEmail?: string;
    milestoneName?: string;
    sourceMeetingTitle?: string;
  };
  ownerId: number;
  milestoneId?: number;
  sourceMeetingId?: number;
};

async function upsertTask({
  projectId,
  taskSeed,
  ownerId,
  milestoneId,
  sourceMeetingId,
}: TaskSeedInput) {
  const existingTask = await prisma.task.findFirst({
    where: { projectId, title: taskSeed.title },
  });

  const taskData = {
    ownerId,
    description: taskSeed.description,
    status: taskSeed.status,
    priority: taskSeed.priority,
    dueDate: taskSeed.dueDate,
    milestoneId: milestoneId ?? null,
    sourceMeetingId: sourceMeetingId ?? null,
  } as const;

  if (existingTask) {
    await prisma.task.update({
      where: { id: existingTask.id },
      data: taskData,
    });
  } else {
    await prisma.task.create({
      data: {
        projectId,
        ownerId,
        milestoneId: milestoneId ?? undefined,
        title: taskSeed.title,
        description: taskSeed.description,
        status: taskSeed.status,
        priority: taskSeed.priority,
        dueDate: taskSeed.dueDate,
        sourceMeetingId: sourceMeetingId ?? undefined,
      },
    });
  }
}

main()
  .catch((error) => {
    console.error('Seeding failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
