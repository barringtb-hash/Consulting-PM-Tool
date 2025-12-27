/**
 * Project Templates Configuration
 *
 * Pre-built project structures that the AI assistant can use to quickly
 * scaffold new projects with milestones and tasks.
 */

export interface TaskTemplate {
  title: string;
  description?: string;
  priority: 'P0' | 'P1' | 'P2';
  subtasks?: Array<{
    title: string;
    description?: string;
  }>;
}

export interface MilestoneTemplate {
  name: string;
  description?: string;
  /** Offset in days from project start date */
  dueDateOffsetDays?: number;
  tasks: TaskTemplate[];
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: 'consulting' | 'software' | 'marketing' | 'operations' | 'general';
  /** Default project duration in days */
  defaultDurationDays: number;
  milestones: MilestoneTemplate[];
}

/**
 * Pre-built project templates
 */
export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'software-implementation',
    name: 'Software Implementation',
    description:
      'Standard template for implementing new software solutions for clients',
    category: 'software',
    defaultDurationDays: 90,
    milestones: [
      {
        name: 'Discovery & Requirements',
        description: 'Gather requirements and understand client needs',
        dueDateOffsetDays: 14,
        tasks: [
          {
            title: 'Conduct stakeholder interviews',
            description: 'Interview key stakeholders to gather requirements',
            priority: 'P0',
          },
          {
            title: 'Document current state processes',
            description: 'Map existing workflows and pain points',
            priority: 'P1',
          },
          {
            title: 'Create requirements document',
            description: 'Compile all requirements into a formal document',
            priority: 'P0',
            subtasks: [
              { title: 'Define functional requirements' },
              { title: 'Define non-functional requirements' },
              { title: 'Get stakeholder sign-off' },
            ],
          },
          {
            title: 'Define success metrics',
            description: 'Establish KPIs to measure project success',
            priority: 'P1',
          },
        ],
      },
      {
        name: 'Design & Architecture',
        description: 'Design the solution architecture and user experience',
        dueDateOffsetDays: 28,
        tasks: [
          {
            title: 'Create solution architecture',
            description: 'Design the technical architecture',
            priority: 'P0',
          },
          {
            title: 'Design user interface mockups',
            description: 'Create UI/UX designs for key screens',
            priority: 'P1',
          },
          {
            title: 'Plan data migration strategy',
            description: 'Define how existing data will be migrated',
            priority: 'P1',
          },
          {
            title: 'Document integration requirements',
            description: 'Identify and document all system integrations',
            priority: 'P1',
          },
        ],
      },
      {
        name: 'Development',
        description: 'Build and configure the solution',
        dueDateOffsetDays: 56,
        tasks: [
          {
            title: 'Set up development environment',
            description: 'Configure development and testing environments',
            priority: 'P0',
          },
          {
            title: 'Develop core functionality',
            description: 'Build the main features of the solution',
            priority: 'P0',
          },
          {
            title: 'Implement integrations',
            description: 'Build connections to external systems',
            priority: 'P1',
          },
          {
            title: 'Perform data migration',
            description: 'Execute the data migration plan',
            priority: 'P1',
          },
        ],
      },
      {
        name: 'Testing & QA',
        description: 'Comprehensive testing before deployment',
        dueDateOffsetDays: 70,
        tasks: [
          {
            title: 'Execute unit testing',
            description: 'Run automated unit tests',
            priority: 'P0',
          },
          {
            title: 'Conduct user acceptance testing',
            description: 'Have client users test the solution',
            priority: 'P0',
            subtasks: [
              { title: 'Create UAT test cases' },
              { title: 'Schedule UAT sessions' },
              { title: 'Document and fix issues' },
              { title: 'Get UAT sign-off' },
            ],
          },
          {
            title: 'Performance testing',
            description: 'Ensure the solution performs under load',
            priority: 'P1',
          },
          {
            title: 'Security review',
            description: 'Conduct security assessment',
            priority: 'P1',
          },
        ],
      },
      {
        name: 'Deployment & Go-Live',
        description: 'Deploy to production and support go-live',
        dueDateOffsetDays: 84,
        tasks: [
          {
            title: 'Create deployment runbook',
            description: 'Document step-by-step deployment process',
            priority: 'P0',
          },
          {
            title: 'Deploy to production',
            description: 'Execute production deployment',
            priority: 'P0',
          },
          {
            title: 'Conduct user training',
            description: 'Train end users on the new system',
            priority: 'P0',
          },
          {
            title: 'Monitor post-deployment',
            description: 'Monitor system health after go-live',
            priority: 'P1',
          },
        ],
      },
      {
        name: 'Project Closeout',
        description: 'Wrap up project and transition to support',
        dueDateOffsetDays: 90,
        tasks: [
          {
            title: 'Document lessons learned',
            description: 'Capture project retrospective insights',
            priority: 'P2',
          },
          {
            title: 'Create support documentation',
            description: 'Prepare runbooks and support guides',
            priority: 'P1',
          },
          {
            title: 'Transition to support team',
            description: 'Hand off to ongoing support',
            priority: 'P1',
          },
        ],
      },
    ],
  },
  {
    id: 'website-redesign',
    name: 'Website Redesign',
    description: 'Template for website redesign and development projects',
    category: 'marketing',
    defaultDurationDays: 60,
    milestones: [
      {
        name: 'Discovery & Strategy',
        description: 'Research and define website strategy',
        dueDateOffsetDays: 10,
        tasks: [
          {
            title: 'Audit current website',
            description: 'Analyze current site performance and issues',
            priority: 'P0',
            subtasks: [
              { title: 'Review analytics data' },
              { title: 'Conduct SEO audit' },
              { title: 'Identify content gaps' },
            ],
          },
          {
            title: 'Competitive analysis',
            description: 'Research competitor websites',
            priority: 'P1',
          },
          {
            title: 'Define target audience personas',
            description: 'Create user personas for the website',
            priority: 'P1',
          },
          {
            title: 'Create content strategy',
            description: 'Plan the content structure and messaging',
            priority: 'P0',
          },
        ],
      },
      {
        name: 'Design',
        description: 'Create visual design and UX',
        dueDateOffsetDays: 25,
        tasks: [
          {
            title: 'Create wireframes',
            description: 'Design low-fidelity page layouts',
            priority: 'P0',
          },
          {
            title: 'Design visual concepts',
            description: 'Create high-fidelity design mockups',
            priority: 'P0',
          },
          {
            title: 'Create responsive designs',
            description: 'Design for mobile and tablet',
            priority: 'P1',
          },
          {
            title: 'Get design approval',
            description: 'Present and get client sign-off on designs',
            priority: 'P0',
          },
        ],
      },
      {
        name: 'Development',
        description: 'Build the website',
        dueDateOffsetDays: 45,
        tasks: [
          {
            title: 'Set up development environment',
            description: 'Configure CMS and hosting',
            priority: 'P0',
          },
          {
            title: 'Develop page templates',
            description: 'Build reusable page templates',
            priority: 'P0',
          },
          {
            title: 'Implement responsive design',
            description: 'Ensure mobile compatibility',
            priority: 'P1',
          },
          {
            title: 'Add content',
            description: 'Populate pages with content',
            priority: 'P1',
          },
          {
            title: 'Configure SEO settings',
            description: 'Set up meta tags, sitemaps, etc.',
            priority: 'P1',
          },
        ],
      },
      {
        name: 'Testing & Launch',
        description: 'Test and launch the new website',
        dueDateOffsetDays: 55,
        tasks: [
          {
            title: 'Cross-browser testing',
            description: 'Test on all major browsers',
            priority: 'P0',
          },
          {
            title: 'Mobile testing',
            description: 'Test on various mobile devices',
            priority: 'P0',
          },
          {
            title: 'Performance optimization',
            description: 'Optimize page load speed',
            priority: 'P1',
          },
          {
            title: 'Set up analytics',
            description: 'Configure tracking and analytics',
            priority: 'P1',
          },
          {
            title: 'Launch website',
            description: 'Deploy to production',
            priority: 'P0',
          },
        ],
      },
      {
        name: 'Post-Launch',
        description: 'Post-launch monitoring and handoff',
        dueDateOffsetDays: 60,
        tasks: [
          {
            title: 'Monitor for issues',
            description: 'Watch for post-launch problems',
            priority: 'P0',
          },
          {
            title: 'Create training materials',
            description: 'Document how to update the site',
            priority: 'P1',
          },
          {
            title: 'Train content editors',
            description: 'Train client on CMS usage',
            priority: 'P1',
          },
        ],
      },
    ],
  },
  {
    id: 'ai-strategy-assessment',
    name: 'AI Strategy Assessment',
    description:
      'Template for conducting AI readiness and strategy assessments',
    category: 'consulting',
    defaultDurationDays: 30,
    milestones: [
      {
        name: 'Initial Assessment',
        description: 'Evaluate current AI maturity and capabilities',
        dueDateOffsetDays: 7,
        tasks: [
          {
            title: 'Conduct executive interviews',
            description: 'Interview leadership on AI vision and goals',
            priority: 'P0',
          },
          {
            title: 'Assess current AI capabilities',
            description: 'Evaluate existing AI tools and processes',
            priority: 'P0',
          },
          {
            title: 'Review data infrastructure',
            description: 'Assess data quality and availability',
            priority: 'P1',
          },
          {
            title: 'Evaluate technical readiness',
            description: 'Review IT infrastructure for AI adoption',
            priority: 'P1',
          },
        ],
      },
      {
        name: 'Opportunity Identification',
        description: 'Identify AI use cases and opportunities',
        dueDateOffsetDays: 14,
        tasks: [
          {
            title: 'Map business processes',
            description: 'Document key business processes',
            priority: 'P0',
          },
          {
            title: 'Identify automation opportunities',
            description: 'Find processes suitable for AI automation',
            priority: 'P0',
          },
          {
            title: 'Prioritize use cases',
            description: 'Rank opportunities by value and feasibility',
            priority: 'P0',
            subtasks: [
              { title: 'Score by business impact' },
              { title: 'Score by technical feasibility' },
              { title: 'Create prioritization matrix' },
            ],
          },
          {
            title: 'Research vendor solutions',
            description: 'Evaluate relevant AI tools and platforms',
            priority: 'P2',
          },
        ],
      },
      {
        name: 'Strategy Development',
        description: 'Develop AI strategy and roadmap',
        dueDateOffsetDays: 21,
        tasks: [
          {
            title: 'Draft AI strategy document',
            description: 'Create comprehensive AI strategy',
            priority: 'P0',
          },
          {
            title: 'Create implementation roadmap',
            description: 'Plan phased AI implementation',
            priority: 'P0',
          },
          {
            title: 'Estimate resource requirements',
            description: 'Define team and budget needs',
            priority: 'P1',
          },
          {
            title: 'Identify risks and mitigations',
            description: 'Document risks and mitigation strategies',
            priority: 'P1',
          },
        ],
      },
      {
        name: 'Final Delivery',
        description: 'Present findings and recommendations',
        dueDateOffsetDays: 30,
        tasks: [
          {
            title: 'Prepare executive presentation',
            description: 'Create leadership presentation',
            priority: 'P0',
          },
          {
            title: 'Deliver final report',
            description: 'Present findings and recommendations',
            priority: 'P0',
          },
          {
            title: 'Conduct Q&A session',
            description: 'Answer stakeholder questions',
            priority: 'P1',
          },
          {
            title: 'Define next steps',
            description: 'Outline immediate action items',
            priority: 'P1',
          },
        ],
      },
    ],
  },
  {
    id: 'process-improvement',
    name: 'Process Improvement',
    description: 'Template for business process improvement initiatives',
    category: 'operations',
    defaultDurationDays: 45,
    milestones: [
      {
        name: 'Current State Analysis',
        description: 'Document and analyze existing processes',
        dueDateOffsetDays: 10,
        tasks: [
          {
            title: 'Map current processes',
            description: 'Create process flow diagrams',
            priority: 'P0',
          },
          {
            title: 'Identify pain points',
            description: 'Document inefficiencies and bottlenecks',
            priority: 'P0',
          },
          {
            title: 'Collect performance metrics',
            description: 'Gather baseline performance data',
            priority: 'P1',
          },
          {
            title: 'Interview process owners',
            description: 'Get insights from people who run the processes',
            priority: 'P1',
          },
        ],
      },
      {
        name: 'Future State Design',
        description: 'Design improved processes',
        dueDateOffsetDays: 20,
        tasks: [
          {
            title: 'Design future state processes',
            description: 'Create optimized process flows',
            priority: 'P0',
          },
          {
            title: 'Identify required changes',
            description: 'Document changes needed to reach future state',
            priority: 'P0',
          },
          {
            title: 'Define success metrics',
            description: 'Establish KPIs for improved processes',
            priority: 'P1',
          },
          {
            title: 'Get stakeholder buy-in',
            description: 'Present and validate future state design',
            priority: 'P0',
          },
        ],
      },
      {
        name: 'Implementation Planning',
        description: 'Plan the implementation of process changes',
        dueDateOffsetDays: 30,
        tasks: [
          {
            title: 'Create implementation plan',
            description: 'Develop detailed implementation roadmap',
            priority: 'P0',
          },
          {
            title: 'Identify training needs',
            description: 'Plan training for affected staff',
            priority: 'P1',
          },
          {
            title: 'Develop change management plan',
            description: 'Plan communication and change activities',
            priority: 'P1',
          },
          {
            title: 'Define pilot approach',
            description: 'Plan initial pilot implementation',
            priority: 'P1',
          },
        ],
      },
      {
        name: 'Pilot & Rollout',
        description: 'Implement and roll out process improvements',
        dueDateOffsetDays: 45,
        tasks: [
          {
            title: 'Execute pilot',
            description: 'Run pilot implementation',
            priority: 'P0',
          },
          {
            title: 'Gather pilot feedback',
            description: 'Collect and analyze pilot results',
            priority: 'P0',
          },
          {
            title: 'Refine processes based on feedback',
            description: 'Adjust processes based on pilot learnings',
            priority: 'P1',
          },
          {
            title: 'Roll out to full organization',
            description: 'Expand implementation across the organization',
            priority: 'P0',
          },
          {
            title: 'Monitor and measure results',
            description: 'Track KPIs and report on improvements',
            priority: 'P1',
          },
        ],
      },
    ],
  },
  {
    id: 'blank-project',
    name: 'Blank Project',
    description: 'Empty project template for custom project structures',
    category: 'general',
    defaultDurationDays: 30,
    milestones: [
      {
        name: 'Project Kickoff',
        description: 'Initial project setup and planning',
        dueDateOffsetDays: 7,
        tasks: [
          {
            title: 'Define project scope',
            description: 'Document project objectives and deliverables',
            priority: 'P0',
          },
          {
            title: 'Identify stakeholders',
            description: 'List key stakeholders and their roles',
            priority: 'P1',
          },
          {
            title: 'Create project timeline',
            description: 'Develop project schedule',
            priority: 'P0',
          },
        ],
      },
      {
        name: 'Project Completion',
        description: 'Final deliverables and project closeout',
        dueDateOffsetDays: 30,
        tasks: [
          {
            title: 'Complete final deliverables',
            description: 'Finish all project deliverables',
            priority: 'P0',
          },
          {
            title: 'Conduct project retrospective',
            description: 'Review project successes and lessons learned',
            priority: 'P2',
          },
        ],
      },
    ],
  },
];

/**
 * Get a project template by ID
 */
export function getProjectTemplate(
  templateId: string,
): ProjectTemplate | undefined {
  return PROJECT_TEMPLATES.find((t) => t.id === templateId);
}

/**
 * Get all project templates, optionally filtered by category
 */
export function listProjectTemplates(category?: string): ProjectTemplate[] {
  if (category) {
    return PROJECT_TEMPLATES.filter((t) => t.category === category);
  }
  return PROJECT_TEMPLATES;
}

/**
 * Calculate milestone and task dates based on project start date
 */
export function calculateTemplateDates(
  template: ProjectTemplate,
  startDate: Date,
): {
  endDate: Date;
  milestones: Array<{
    name: string;
    description?: string;
    dueDate: Date;
    tasks: Array<{
      title: string;
      description?: string;
      priority: 'P0' | 'P1' | 'P2';
      dueDate: Date;
      subtasks?: Array<{ title: string; description?: string }>;
    }>;
  }>;
} {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + template.defaultDurationDays);

  const milestones = template.milestones.map((milestone) => {
    const milestoneDueDate = new Date(startDate);
    milestoneDueDate.setDate(
      milestoneDueDate.getDate() + (milestone.dueDateOffsetDays ?? 0),
    );

    return {
      name: milestone.name,
      description: milestone.description,
      dueDate: milestoneDueDate,
      tasks: milestone.tasks.map((task) => ({
        title: task.title,
        description: task.description,
        priority: task.priority,
        dueDate: milestoneDueDate,
        subtasks: task.subtasks,
      })),
    };
  });

  return { endDate, milestones };
}
