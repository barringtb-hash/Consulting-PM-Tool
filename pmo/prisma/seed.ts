import bcrypt from 'bcryptjs';

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
} from '@prisma/client';

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    process.env.POSTGRES_PRISMA_URL ??
    'postgresql://postgres:postgres@localhost:5432/pmo';
}

const prisma = new PrismaClient();

type SeedUser = {
  name: string;
  email: string;
  password: string;
  timezone: string;
  role: UserRole;
};

const users: SeedUser[] = [
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
    name: 'Launchpad Consulting Partners',
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
    clientName: 'Launchpad Consulting Partners',
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
    clientName: 'Launchpad Consulting Partners',
    name: 'Launchpad Consulting Partners',
    description:
      'A rising sun/sunrise icon with radiating rays above a horizon line, paired with "LAUNCHPAD" in bold text and "CONSULTING PARTNERS" as a subtitle with letter spacing.',
    primaryColor: '#9F1239', // Rose - used for main headings and "LAUNCHPAD" text
    secondaryColor: '#F97316', // Orange - central color in the sunrise gradient
    accentColor: '#FCD34D', // Yellow - sun rays/accents
    fonts: {
      primary: {
        name: 'Primary Font',
        usage: 'LAUNCHPAD heading text - bold weight',
      },
      secondary: {
        name: 'Secondary Font',
        usage: 'CONSULTING PARTNERS subtitle - letter spacing applied',
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
          'Primary horizontal logo for light backgrounds - full color sunrise with LAUNCHPAD text',
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
    clientName: 'Launchpad Consulting Partners',
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
    clientName: 'Launchpad Consulting Partners',
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
    clientName: 'Launchpad Consulting Partners',
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
    clientName: 'Launchpad Consulting Partners',
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
    clientName: 'Launchpad Consulting Partners',
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
    clientName: 'Launchpad Consulting Partners',
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
    clientName: 'Launchpad Consulting Partners',
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
The Launchpad Team`,
    },
    tags: ['email', 'lead-nurture', 'assessment', 'marketing'],
  },
  // Ideas
  {
    name: 'Webinar: AI for Small Business',
    type: ContentType.VIDEO_SCRIPT,
    channel: ContentChannel.WEB,
    status: ContentStatus.IDEA,
    clientName: 'Launchpad Consulting Partners',
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
      'Establish Launchpad as the go-to AI consulting firm through thought leadership content',
    clientName: 'Launchpad Consulting Partners',
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
    clientName: 'Launchpad Consulting Partners',
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
      name: 'Launchpad Consulting Partners',
    },
    create: {
      name: 'Launchpad Consulting Partners',
      slug: 'default',
      plan: 'PROFESSIONAL',
      status: 'ACTIVE',
    },
  });
  console.log(`  ✓ Default tenant created/updated: ${defaultTenant.name}`);

  // Link all users to the default tenant
  for (const [email, userId] of userMap) {
    const isAdmin =
      users.find((u) => u.email === email)?.role === UserRole.ADMIN;
    await prisma.tenantUser.upsert({
      where: {
        tenantId_userId: {
          tenantId: defaultTenant.id,
          userId,
        },
      },
      update: {
        role: isAdmin ? TenantRole.OWNER : TenantRole.MEMBER,
      },
      create: {
        tenantId: defaultTenant.id,
        userId,
        role: isAdmin ? TenantRole.OWNER : TenantRole.MEMBER,
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
  });
