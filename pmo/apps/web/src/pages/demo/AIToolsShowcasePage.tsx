import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../ui/PageHeader';
import { Card, CardBody, CardHeader, CardTitle } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import {
  MessageCircle,
  FileText,
  Calendar,
  ClipboardList,
  FileSearch,
  PenTool,
  Target,
  ShieldCheck,
  Package,
  Scale,
  Wrench,
  DollarSign,
  HardHat,
  Bot,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Zap,
  Brain,
  TrendingUp,
  Play,
  LucideIcon,
} from 'lucide-react';
import { useModules } from '../../modules';

interface AITool {
  id: string;
  name: string;
  phase: 1 | 2 | 3;
  icon: LucideIcon;
  description: string;
  features: string[];
  industries: string[];
  path: string;
  moduleId: string;
  color: string;
  demoScenario: string;
}

const AI_TOOLS: AITool[] = [
  // Phase 1 - Basic Tools
  {
    id: 'chatbot',
    name: 'AI Customer Service Chatbot',
    phase: 1,
    icon: MessageCircle,
    description:
      'Deploy intelligent chatbots that handle customer inquiries 24/7, reducing support costs and improving response times.',
    features: [
      'Multi-channel support (Web, SMS, WhatsApp, Messenger)',
      'Knowledge base management with Q&A pairs',
      'Intent recognition with confidence scoring',
      'Human handoff escalation',
      'Real-time analytics dashboard',
      'Feedback collection and learning',
    ],
    industries: ['Retail', 'Healthcare', 'Finance', 'E-commerce'],
    path: '/ai-tools/chatbot',
    moduleId: 'chatbot',
    color: 'bg-blue-500',
    demoScenario:
      'Watch a demo customer interact with an AI chatbot for product support',
  },
  {
    id: 'product-descriptions',
    name: 'Product Description Generator',
    phase: 1,
    icon: FileText,
    description:
      'Generate SEO-optimized product descriptions for multiple marketplaces with consistent brand voice.',
    features: [
      'Multi-marketplace support (Amazon, eBay, Shopify)',
      'SEO optimization with keyword targeting',
      'Template library with dynamic placeholders',
      'Bulk generation for large catalogs',
      'Brand voice consistency',
      'A/B testing variants',
    ],
    industries: ['E-commerce', 'Retail', 'Manufacturing', 'Wholesale'],
    path: '/ai-tools/product-descriptions',
    moduleId: 'productDescriptions',
    color: 'bg-emerald-500',
    demoScenario:
      'Generate compelling product descriptions for a sample product catalog',
  },
  {
    id: 'scheduling',
    name: 'AI Scheduling Assistant',
    phase: 1,
    icon: Calendar,
    description:
      'Automate appointment scheduling with intelligent time slot suggestions and no-show prediction.',
    features: [
      'Smart time slot optimization',
      'No-show prediction and overbooking',
      'Multi-provider calendar sync',
      'Automated SMS/email reminders',
      'Timezone handling',
      'Rescheduling workflows',
    ],
    industries: [
      'Healthcare',
      'Professional Services',
      'Beauty & Wellness',
      'Education',
    ],
    path: '/ai-tools/scheduling',
    moduleId: 'scheduling',
    color: 'bg-violet-500',
    demoScenario:
      'Schedule appointments with AI-suggested optimal times and automated reminders',
  },
  {
    id: 'intake',
    name: 'Client Intake Automator',
    phase: 1,
    icon: ClipboardList,
    description:
      'Streamline client onboarding with smart forms, document collection, and automated data extraction.',
    features: [
      'Dynamic multi-step questionnaires',
      'Intelligent field validation',
      'Document upload and OCR',
      'AI analysis of responses',
      'Automatic lead/client creation',
      'Compliance-ready workflows',
    ],
    industries: ['Legal', 'Healthcare', 'Financial Services', 'Consulting'],
    path: '/ai-tools/intake',
    moduleId: 'intake',
    color: 'bg-amber-500',
    demoScenario:
      'Experience a smart client intake form with AI-powered document analysis',
  },

  // Phase 2 - Advanced Tools
  {
    id: 'document-analyzer',
    name: 'Smart Document Analyzer',
    phase: 2,
    icon: FileSearch,
    description:
      'Extract insights from documents using AI-powered analysis, OCR, and entity recognition.',
    features: [
      'Multi-format document support (PDF, Images, Text)',
      'Named entity recognition (NER)',
      'Custom field extraction',
      'Sentiment analysis',
      'Compliance checking',
      'Document classification',
    ],
    industries: ['Legal', 'Insurance', 'Real Estate', 'Healthcare'],
    path: '/ai-tools/document-analyzer',
    moduleId: 'documentAnalyzer',
    color: 'bg-cyan-500',
    demoScenario:
      'Upload a document and watch AI extract key information and entities',
  },
  {
    id: 'content-generator',
    name: 'Content Generation Suite',
    phase: 2,
    icon: PenTool,
    description:
      'Create marketing content at scale with brand voice training and multi-format support.',
    features: [
      'Multi-format content (Social, Email, Blog, Ads)',
      'Brand voice training and consistency',
      'Template library with placeholders',
      'SEO optimization',
      'Approval workflow system',
      'A/B variant generation',
    ],
    industries: ['Marketing', 'Media', 'E-commerce', 'SaaS'],
    path: '/ai-tools/content-generator',
    moduleId: 'contentGenerator',
    color: 'bg-pink-500',
    demoScenario:
      'Generate a complete content campaign with multiple formats and channels',
  },
  {
    id: 'lead-scoring',
    name: 'Lead Scoring & CRM Assistant',
    phase: 2,
    icon: Target,
    description:
      'Score leads using ML algorithms and automate nurture sequences for higher conversions.',
    features: [
      'ML-powered lead scoring',
      'Activity tracking and attribution',
      'Automated nurture sequences',
      'Pipeline stage prediction',
      'Lead segmentation',
      'CRM integration',
    ],
    industries: ['SaaS', 'B2B Sales', 'Real Estate', 'Financial Services'],
    path: '/ai-tools/lead-scoring',
    moduleId: 'leadScoring',
    color: 'bg-rose-500',
    demoScenario: 'See how AI scores and prioritizes leads for your sales team',
  },
  {
    id: 'prior-auth',
    name: 'Prior Authorization Bot',
    phase: 2,
    icon: ShieldCheck,
    description:
      'Automate healthcare prior authorization submissions, tracking, and appeals management.',
    features: [
      'Automated PA request submission',
      'Multi-payer integration',
      'Real-time status tracking',
      'Denial management',
      'Appeal letter generation',
      'Compliance documentation',
    ],
    industries: ['Healthcare', 'Insurance', 'Pharmacy', 'Medical Devices'],
    path: '/ai-tools/prior-auth',
    moduleId: 'priorAuth',
    color: 'bg-teal-500',
    demoScenario:
      'Submit a prior authorization request and track its status through approval',
  },

  // Phase 3 - Complex Tools
  {
    id: 'inventory-forecasting',
    name: 'Inventory Forecasting Engine',
    phase: 3,
    icon: Package,
    description:
      'Predict demand and optimize inventory levels using ML models with seasonal trend analysis.',
    features: [
      'ML-powered demand forecasting',
      'Seasonal trend analysis',
      'Multi-location support',
      'Reorder point optimization',
      'Stockout prediction alerts',
      'Supplier lead time tracking',
    ],
    industries: ['Retail', 'Manufacturing', 'Distribution', 'E-commerce'],
    path: '/ai-tools/inventory-forecasting',
    moduleId: 'inventoryForecasting',
    color: 'bg-orange-500',
    demoScenario:
      'View AI-generated inventory forecasts and reorder recommendations',
  },
  {
    id: 'compliance-monitor',
    name: 'Compliance Monitoring System',
    phase: 3,
    icon: Scale,
    description:
      'Monitor compliance in real-time with rule engines, risk scoring, and regulatory reporting.',
    features: [
      'Real-time compliance monitoring',
      'Configurable rule engine',
      'Risk scoring algorithms',
      'Violation detection and alerts',
      'Audit trail logging',
      'Regulatory report generation',
    ],
    industries: ['Finance', 'Healthcare', 'Legal', 'Government'],
    path: '/ai-tools/compliance-monitor',
    moduleId: 'complianceMonitor',
    color: 'bg-indigo-500',
    demoScenario:
      'Set up compliance rules and monitor for violations in real-time',
  },
  {
    id: 'predictive-maintenance',
    name: 'Predictive Maintenance Platform',
    phase: 3,
    icon: Wrench,
    description:
      'Prevent equipment failures with IoT sensor integration and ML anomaly detection.',
    features: [
      'IoT sensor integration',
      'ML anomaly detection',
      'Failure prediction models',
      'Work order automation',
      'Equipment health scoring',
      'Maintenance scheduling',
    ],
    industries: ['Manufacturing', 'Energy', 'Transportation', 'Facilities'],
    path: '/ai-tools/predictive-maintenance',
    moduleId: 'predictiveMaintenance',
    color: 'bg-slate-500',
    demoScenario:
      'Monitor equipment health and view AI-predicted maintenance needs',
  },
  {
    id: 'revenue-management',
    name: 'Revenue Management AI',
    phase: 3,
    icon: DollarSign,
    description:
      'Optimize pricing dynamically with demand forecasting and competitor monitoring.',
    features: [
      'Dynamic pricing algorithms',
      'Demand forecasting',
      'Competitor price monitoring',
      'Revenue optimization',
      'Promotional planning',
      'Price elasticity modeling',
    ],
    industries: ['Hospitality', 'Airlines', 'E-commerce', 'Entertainment'],
    path: '/ai-tools/revenue-management',
    moduleId: 'revenueManagement',
    color: 'bg-green-500',
    demoScenario:
      'See dynamic pricing recommendations based on demand and competition',
  },
  {
    id: 'safety-monitor',
    name: 'Safety & Compliance Monitor',
    phase: 3,
    icon: HardHat,
    description:
      'Digitize safety management with checklists, incident reporting, and OSHA compliance.',
    features: [
      'Digital safety checklists',
      'Incident reporting and tracking',
      'OSHA 300 log automation',
      'Training compliance tracking',
      'Hazard identification',
      'Safety analytics dashboard',
    ],
    industries: ['Construction', 'Manufacturing', 'Oil & Gas', 'Utilities'],
    path: '/ai-tools/safety-monitor',
    moduleId: 'safetyMonitor',
    color: 'bg-yellow-500',
    demoScenario: 'Complete a safety checklist and view compliance analytics',
  },
];

const PHASE_INFO = {
  1: {
    name: 'Phase 1: Foundation',
    description: 'Core AI tools for customer engagement and automation',
    color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
  },
  2: {
    name: 'Phase 2: Advanced',
    description: 'Sophisticated AI capabilities for content and analysis',
    color:
      'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
  },
  3: {
    name: 'Phase 3: Enterprise',
    description: 'Complex AI solutions for operations and compliance',
    color:
      'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
  },
};

function AIToolCard({ tool }: { tool: AITool }): JSX.Element {
  const { isModuleEnabled } = useModules();
  const enabled = isModuleEnabled(tool.moduleId as never);
  const Icon = tool.icon;

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl ${tool.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}
            >
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-base">{tool.name}</CardTitle>
              <Badge
                variant="neutral"
                className={`mt-1 text-xs ${PHASE_INFO[tool.phase].color}`}
              >
                Phase {tool.phase}
              </Badge>
            </div>
          </div>
          {enabled && (
            <Badge variant="success" className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Enabled
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardBody className="pt-2">
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
          {tool.description}
        </p>

        <div className="space-y-3">
          <div>
            <h4 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-2">
              Key Features
            </h4>
            <div className="flex flex-wrap gap-1">
              {tool.features.slice(0, 4).map((feature) => (
                <span
                  key={feature}
                  className="px-2 py-1 text-xs bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded"
                >
                  {feature}
                </span>
              ))}
              {tool.features.length > 4 && (
                <span className="px-2 py-1 text-xs text-neutral-500 dark:text-neutral-400">
                  +{tool.features.length - 4} more
                </span>
              )}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-2">
              Industries
            </h4>
            <div className="flex flex-wrap gap-1">
              {tool.industries.map((industry) => (
                <Badge key={industry} variant="secondary" className="text-xs">
                  {industry}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
          <span className="text-xs text-neutral-500 dark:text-neutral-400 italic">
            {tool.demoScenario}
          </span>
          <Link to={tool.path}>
            <Button size="sm" variant="primary" className="group/btn">
              <Play className="w-4 h-4 mr-1" />
              Try Demo
              <ArrowRight className="w-3 h-3 ml-1 group-hover/btn:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}

function StatsCard({
  icon: Icon,
  value,
  label,
  color,
}: {
  icon: LucideIcon;
  value: string;
  label: string;
  color: string;
}): JSX.Element {
  return (
    <Card className="text-center">
      <CardBody className="py-6">
        <div
          className={`w-14 h-14 rounded-full ${color} flex items-center justify-center mx-auto mb-3`}
        >
          <Icon className="w-7 h-7 text-white" />
        </div>
        <div className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
          {value}
        </div>
        <div className="text-sm text-neutral-500 dark:text-neutral-400">
          {label}
        </div>
      </CardBody>
    </Card>
  );
}

export default function AIToolsShowcasePage(): JSX.Element {
  const [selectedPhase, setSelectedPhase] = useState<1 | 2 | 3 | 'all'>('all');

  const filteredTools =
    selectedPhase === 'all'
      ? AI_TOOLS
      : AI_TOOLS.filter((tool) => tool.phase === selectedPhase);

  const phase1Tools = AI_TOOLS.filter((t) => t.phase === 1);
  const phase2Tools = AI_TOOLS.filter((t) => t.phase === 2);
  const phase3Tools = AI_TOOLS.filter((t) => t.phase === 3);

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-900 dark:to-neutral-800">
      <PageHeader
        title="AI Tools Showcase"
        description="Explore our comprehensive suite of 13 AI-powered tools designed to transform business operations"
      />

      <div className="container-padding py-8 space-y-8">
        {/* Hero Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatsCard
            icon={Bot}
            value="13"
            label="AI Tools"
            color="bg-gradient-to-br from-blue-500 to-blue-600"
          />
          <StatsCard
            icon={Sparkles}
            value="3"
            label="Implementation Phases"
            color="bg-gradient-to-br from-purple-500 to-purple-600"
          />
          <StatsCard
            icon={Brain}
            value="50+"
            label="AI Features"
            color="bg-gradient-to-br from-pink-500 to-pink-600"
          />
          <StatsCard
            icon={TrendingUp}
            value="20+"
            label="Industries Served"
            color="bg-gradient-to-br from-emerald-500 to-emerald-600"
          />
        </div>

        {/* Phase Filter */}
        <Card>
          <CardBody className="py-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Filter by Phase:
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={selectedPhase === 'all' ? 'primary' : 'secondary'}
                  onClick={() => setSelectedPhase('all')}
                >
                  All Tools ({AI_TOOLS.length})
                </Button>
                <Button
                  size="sm"
                  variant={selectedPhase === 1 ? 'primary' : 'secondary'}
                  onClick={() => setSelectedPhase(1)}
                  className={
                    selectedPhase === 1
                      ? ''
                      : 'hover:bg-blue-50 dark:hover:bg-blue-900/20'
                  }
                >
                  <Zap className="w-4 h-4 mr-1" />
                  Phase 1 ({phase1Tools.length})
                </Button>
                <Button
                  size="sm"
                  variant={selectedPhase === 2 ? 'primary' : 'secondary'}
                  onClick={() => setSelectedPhase(2)}
                  className={
                    selectedPhase === 2
                      ? ''
                      : 'hover:bg-purple-50 dark:hover:bg-purple-900/20'
                  }
                >
                  <Brain className="w-4 h-4 mr-1" />
                  Phase 2 ({phase2Tools.length})
                </Button>
                <Button
                  size="sm"
                  variant={selectedPhase === 3 ? 'primary' : 'secondary'}
                  onClick={() => setSelectedPhase(3)}
                  className={
                    selectedPhase === 3
                      ? ''
                      : 'hover:bg-orange-50 dark:hover:bg-orange-900/20'
                  }
                >
                  <TrendingUp className="w-4 h-4 mr-1" />
                  Phase 3 ({phase3Tools.length})
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Phase Description */}
        {selectedPhase !== 'all' && (
          <Card className={PHASE_INFO[selectedPhase].color}>
            <CardBody className="py-4">
              <h3 className="font-semibold text-lg">
                {PHASE_INFO[selectedPhase].name}
              </h3>
              <p className="text-sm opacity-80">
                {PHASE_INFO[selectedPhase].description}
              </p>
            </CardBody>
          </Card>
        )}

        {/* Tools Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredTools.map((tool) => (
            <AIToolCard key={tool.id} tool={tool} />
          ))}
        </div>

        {/* Call to Action */}
        <Card className="bg-gradient-to-r from-primary-500 to-primary-600 border-0">
          <CardBody className="py-8 text-center text-white">
            <h2 className="text-2xl font-bold mb-2">
              Ready to Transform Your Business with AI?
            </h2>
            <p className="text-primary-100 mb-6 max-w-2xl mx-auto">
              Our AI consulting team can help you identify the right tools for
              your business needs and implement them seamlessly.
            </p>
            <div className="flex justify-center gap-4">
              <Link to="/client-intake">
                <Button
                  variant="secondary"
                  size="lg"
                  className="bg-white text-primary-600 hover:bg-primary-50"
                >
                  Schedule a Consultation
                </Button>
              </Link>
              <Link to="/demo/marketing">
                <Button
                  variant="secondary"
                  size="lg"
                  className="bg-primary-400 text-white border-white/30 hover:bg-primary-300"
                >
                  View Marketing Demo
                </Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
