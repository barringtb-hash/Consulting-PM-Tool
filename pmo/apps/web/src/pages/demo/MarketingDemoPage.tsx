import React, { useState } from 'react';
import { PageHeader } from '../../ui/PageHeader';
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  CardFooter,
} from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Badge } from '../../ui/Badge';
import { Select } from '../../ui/Select';
import { Textarea } from '../../ui/Textarea';
import {
  Sparkles,
  Megaphone,
  FileText,
  Mail,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  RefreshCw,
  Copy,
  Check,
  Wand2,
  Palette,
  Target,
  TrendingUp,
  Calendar,
  BarChart3,
  ArrowRight,
  Play,
  Lightbulb,
  Globe,
  Hash,
  Clock,
  Zap,
} from 'lucide-react';

// Content types for demo
const CONTENT_TYPES = [
  { id: 'social', name: 'Social Media Post', icon: Instagram },
  { id: 'email', name: 'Email Campaign', icon: Mail },
  { id: 'blog', name: 'Blog Post', icon: FileText },
  { id: 'ad', name: 'Ad Copy', icon: Megaphone },
];

const SOCIAL_PLATFORMS = [
  { id: 'twitter', name: 'Twitter/X', icon: Twitter, maxChars: 280 },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, maxChars: 3000 },
  { id: 'instagram', name: 'Instagram', icon: Instagram, maxChars: 2200 },
  { id: 'youtube', name: 'YouTube', icon: Youtube, maxChars: 5000 },
];

const TONES = [
  'Professional',
  'Casual',
  'Enthusiastic',
  'Informative',
  'Persuasive',
  'Inspirational',
];

const DEMO_TOPICS = [
  'AI-powered customer service solutions',
  'Digital transformation success story',
  'New product launch announcement',
  'Industry insights and trends',
  'Company culture and team updates',
  'Customer success case study',
];

// Sample generated content
const SAMPLE_CONTENT: Record<string, Record<string, string>> = {
  social: {
    twitter:
      "Exciting news! We've helped our clients reduce support tickets by 60% with AI chatbots. Ready to transform your customer service? Let's talk! #AI #CustomerExperience #Innovation",
    linkedin:
      "Digital transformation isn't just a buzzword - it's the key to staying competitive.\n\nOur latest case study shows how one client achieved:\n- 60% reduction in support tickets\n- 45% faster response times\n- 92% customer satisfaction scores\n\nThe secret? AI-powered automation that enhances, not replaces, human connection.\n\nWant to learn how AI can transform your business? Drop a comment below or visit our website.\n\n#DigitalTransformation #AI #CustomerSuccess #Innovation",
    instagram:
      "From overwhelmed to optimized! Our client went from 500 daily support tickets to just 200 - with happier customers than ever before.\n\nThe power of AI + human expertise = unstoppable customer experience.\n\nDouble tap if you're ready to transform your business!\n\n#AI #BusinessGrowth #CustomerService #Innovation #DigitalTransformation #FutureOfWork",
  },
  email: {
    subject: 'Transform Your Customer Service with AI - See How',
    body: `Hi {{FirstName}},

Have you ever wondered how leading companies manage to provide exceptional customer service while reducing costs?

The answer is intelligent automation.

Our AI-powered solutions have helped businesses like yours:

- Reduce response times by 45%
- Handle 60% more inquiries without adding staff
- Achieve 92% customer satisfaction scores

I'd love to show you how we can create similar results for {{CompanyName}}.

Would you be open to a brief 15-minute call this week?

Best regards,
{{SenderName}}

P.S. Our clients typically see ROI within 90 days of implementation.`,
  },
  blog: {
    title: '5 Ways AI is Revolutionizing Customer Service in 2024',
    outline: `## Introduction
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
  },
  ad: {
    headline: 'Cut Support Costs by 60% with AI',
    body: 'Stop drowning in support tickets. Our AI chatbot handles the routine so your team can focus on what matters. Start your free trial today.',
    cta: 'Get Started Free',
  },
};

function ContentGeneratorDemo(): JSX.Element {
  const [contentType, setContentType] = useState('social');
  const [platform, setPlatform] = useState('linkedin');
  const [topic, setTopic] = useState(DEMO_TOPICS[0]);
  const [tone, setTone] = useState('Professional');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    // Simulate AI generation delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (contentType === 'social') {
      setGeneratedContent(
        SAMPLE_CONTENT.social[platform] || SAMPLE_CONTENT.social.linkedin,
      );
    } else if (contentType === 'email') {
      setGeneratedContent(
        `Subject: ${SAMPLE_CONTENT.email.subject}\n\n${SAMPLE_CONTENT.email.body}`,
      );
    } else if (contentType === 'blog') {
      setGeneratedContent(
        `# ${SAMPLE_CONTENT.blog.title}\n\n${SAMPLE_CONTENT.blog.outline}`,
      );
    } else if (contentType === 'ad') {
      setGeneratedContent(
        `Headline: ${SAMPLE_CONTENT.ad.headline}\n\nBody: ${SAMPLE_CONTENT.ad.body}\n\nCTA: ${SAMPLE_CONTENT.ad.cta}`,
      );
    }
    setIsGenerating(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = () => {
    setGeneratedContent('');
    handleGenerate();
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
            <Wand2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <CardTitle>AI Content Generator</CardTitle>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Generate marketing content in seconds
            </p>
          </div>
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        {/* Content Type Selection */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Content Type
          </label>
          <div className="grid grid-cols-4 gap-2">
            {CONTENT_TYPES.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  onClick={() => setContentType(type.id)}
                  className={`p-3 rounded-lg border-2 transition-all text-center ${
                    contentType === type.id
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                      : 'border-neutral-200 dark:border-neutral-700 hover:border-primary-300'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 mx-auto mb-1 ${
                      contentType === type.id
                        ? 'text-primary-600'
                        : 'text-neutral-500'
                    }`}
                  />
                  <span className="text-xs font-medium">{type.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Platform Selection (for social) */}
        {contentType === 'social' && (
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Platform
            </label>
            <div className="flex gap-2">
              {SOCIAL_PLATFORMS.map((p) => {
                const Icon = p.icon;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPlatform(p.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                      platform === p.id
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                        : 'border-neutral-200 dark:border-neutral-700 hover:border-primary-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm">{p.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Topic Selection */}
        <Select
          label="Topic / Theme"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        >
          {DEMO_TOPICS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>

        {/* Tone Selection */}
        <Select
          label="Tone of Voice"
          value={tone}
          onChange={(e) => setTone(e.target.value)}
        >
          {TONES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full"
          size="lg"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Generate Content
            </>
          )}
        </Button>

        {/* Generated Content */}
        {generatedContent && (
          <div className="mt-4 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Generated Content
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleRegenerate}
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Regenerate
                </Button>
                <Button size="sm" variant="secondary" onClick={handleCopy}>
                  {copied ? (
                    <Check className="w-4 h-4 mr-1" />
                  ) : (
                    <Copy className="w-4 h-4 mr-1" />
                  )}
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </div>
            <pre className="whitespace-pre-wrap text-sm text-neutral-800 dark:text-neutral-200 font-mono">
              {generatedContent}
            </pre>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function BrandVoiceDemo(): JSX.Element {
  const [brandName, setBrandName] = useState('Acme Corp');
  const [voiceTraits, setVoiceTraits] = useState<string[]>([
    'Professional',
    'Innovative',
  ]);

  const allTraits = [
    'Professional',
    'Innovative',
    'Friendly',
    'Bold',
    'Trustworthy',
    'Playful',
    'Authoritative',
    'Empathetic',
  ];

  const toggleTrait = (trait: string) => {
    if (voiceTraits.includes(trait)) {
      setVoiceTraits(voiceTraits.filter((t) => t !== trait));
    } else if (voiceTraits.length < 4) {
      setVoiceTraits([...voiceTraits, trait]);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
            <Palette className="w-5 h-5 text-white" />
          </div>
          <div>
            <CardTitle>Brand Voice Training</CardTitle>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Customize AI to match your brand
            </p>
          </div>
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        <Input
          label="Brand Name"
          value={brandName}
          onChange={(e) => setBrandName(e.target.value)}
          placeholder="Enter your brand name"
        />

        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Voice Traits (select up to 4)
          </label>
          <div className="flex flex-wrap gap-2">
            {allTraits.map((trait) => (
              <button
                key={trait}
                onClick={() => toggleTrait(trait)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  voiceTraits.includes(trait)
                    ? 'bg-primary-500 text-white'
                    : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'
                }`}
              >
                {trait}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 bg-violet-50 dark:bg-violet-900/20 rounded-lg">
          <h4 className="font-medium text-violet-900 dark:text-violet-300 mb-2">
            Brand Voice Preview
          </h4>
          <p className="text-sm text-violet-700 dark:text-violet-400">
            &quot;{brandName}&quot; content will be written in a{' '}
            <strong>{voiceTraits.join(', ').toLowerCase()}</strong> tone,
            ensuring consistency across all marketing channels.
          </p>
        </div>

        <Button className="w-full" variant="secondary">
          <Check className="w-4 h-4 mr-2" />
          Save Brand Voice Settings
        </Button>
      </CardBody>
    </Card>
  );
}

function ContentCalendarDemo(): JSX.Element {
  const scheduledContent = [
    {
      day: 'Mon',
      items: [{ type: 'Blog', title: 'AI Trends 2024', status: 'Published' }],
    },
    {
      day: 'Tue',
      items: [{ type: 'Social', title: 'LinkedIn Post', status: 'Scheduled' }],
    },
    {
      day: 'Wed',
      items: [{ type: 'Email', title: 'Newsletter', status: 'Draft' }],
    },
    {
      day: 'Thu',
      items: [
        { type: 'Social', title: 'Twitter Thread', status: 'Scheduled' },
        { type: 'Ad', title: 'Google Ads Campaign', status: 'In Review' },
      ],
    },
    {
      day: 'Fri',
      items: [{ type: 'Blog', title: 'Case Study', status: 'Draft' }],
    },
  ];

  const statusColors: Record<string, string> = {
    Published:
      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    Scheduled:
      'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    Draft:
      'bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-300',
    'In Review':
      'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <CardTitle>Content Calendar</CardTitle>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              This week&apos;s content schedule
            </p>
          </div>
        </div>
      </CardHeader>
      <CardBody>
        <div className="grid grid-cols-5 gap-2">
          {scheduledContent.map((day) => (
            <div
              key={day.day}
              className="p-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg"
            >
              <div className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-2 text-center">
                {day.day}
              </div>
              <div className="space-y-2">
                {day.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2 bg-white dark:bg-neutral-700 rounded border border-neutral-200 dark:border-neutral-600"
                  >
                    <div className="text-xs font-medium text-neutral-700 dark:text-neutral-300 truncate">
                      {item.title}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-neutral-500">
                        {item.type}
                      </span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${statusColors[item.status]}`}
                      >
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardBody>
      <CardFooter>
        <div className="flex items-center justify-between w-full">
          <span className="text-sm text-neutral-500 dark:text-neutral-400">
            7 pieces scheduled this week
          </span>
          <Button size="sm" variant="secondary">
            View Full Calendar
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

function AnalyticsDemo(): JSX.Element {
  const metrics = [
    { label: 'Content Created', value: '47', change: '+12%', icon: FileText },
    {
      label: 'Engagement Rate',
      value: '4.8%',
      change: '+0.6%',
      icon: TrendingUp,
    },
    { label: 'Time Saved', value: '23h', change: '+8h', icon: Clock },
    { label: 'ROI', value: '340%', change: '+45%', icon: Target },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <CardTitle>Marketing Analytics</CardTitle>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Last 30 days performance
            </p>
          </div>
        </div>
      </CardHeader>
      <CardBody>
        <div className="grid grid-cols-2 gap-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div
                key={metric.label}
                className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4 text-neutral-500" />
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">
                    {metric.label}
                  </span>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    {metric.value}
                  </span>
                  <span className="text-sm text-green-600 dark:text-green-400 mb-1">
                    {metric.change}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}

function RepurposeDemo(): JSX.Element {
  const [sourceContent, setSourceContent] = useState(
    'Our AI chatbot solution helped TechCorp reduce support tickets by 60% and improve customer satisfaction scores to 92%.',
  );
  const [repurposedContent, setRepurposedContent] = useState<
    Record<string, string>
  >({});
  const [isRepurposing, setIsRepurposing] = useState(false);

  const handleRepurpose = async () => {
    setIsRepurposing(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setRepurposedContent({
      twitter:
        "60% fewer support tickets. 92% customer satisfaction. That's what happens when AI meets customer service. See how TechCorp did it. #AI #CX",
      linkedin:
        'Case Study: How TechCorp Transformed Customer Support with AI\n\nResults speak for themselves:\n- 60% reduction in support tickets\n- 92% customer satisfaction score\n\nThe future of customer service is here.',
      email_subject: 'How TechCorp Cut Support Tickets by 60%',
      blog_title: 'TechCorp Case Study: AI-Powered Customer Service Success',
    });
    setIsRepurposing(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
            <RefreshCw className="w-5 h-5 text-white" />
          </div>
          <div>
            <CardTitle>Content Repurposing</CardTitle>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Transform one piece into many
            </p>
          </div>
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        <Textarea
          label="Source Content"
          value={sourceContent}
          onChange={(e) => setSourceContent(e.target.value)}
          rows={3}
          placeholder="Paste your content here..."
        />

        <Button
          onClick={handleRepurpose}
          disabled={isRepurposing || !sourceContent}
          className="w-full"
        >
          {isRepurposing ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Repurposing...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2" />
              Repurpose to All Channels
            </>
          )}
        </Button>

        {Object.keys(repurposedContent).length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Repurposed Versions
            </h4>
            {Object.entries(repurposedContent).map(([channel, content]) => (
              <div
                key={channel}
                className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg"
              >
                <div className="flex items-center gap-2 mb-2">
                  {channel === 'twitter' && <Twitter className="w-4 h-4" />}
                  {channel === 'linkedin' && <Linkedin className="w-4 h-4" />}
                  {channel === 'email_subject' && <Mail className="w-4 h-4" />}
                  {channel === 'blog_title' && <FileText className="w-4 h-4" />}
                  <span className="text-xs font-medium text-neutral-500 uppercase">
                    {channel.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-line">
                  {content}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function QuickIdeasDemo(): JSX.Element {
  const ideas = [
    { icon: Lightbulb, text: 'Share a customer success story' },
    { icon: Globe, text: 'Industry trend analysis' },
    { icon: Hash, text: 'Behind-the-scenes content' },
    { icon: Target, text: 'Product feature highlight' },
    { icon: TrendingUp, text: 'Data-driven insights post' },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center">
            <Lightbulb className="w-5 h-5 text-white" />
          </div>
          <div>
            <CardTitle>Content Ideas</CardTitle>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              AI-suggested topics
            </p>
          </div>
        </div>
      </CardHeader>
      <CardBody>
        <div className="space-y-2">
          {ideas.map((idea, idx) => {
            const Icon = idea.icon;
            return (
              <button
                key={idx}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors text-left group"
              >
                <Icon className="w-5 h-5 text-neutral-500 group-hover:text-primary-500" />
                <span className="text-sm text-neutral-700 dark:text-neutral-300 flex-1">
                  {idea.text}
                </span>
                <ArrowRight className="w-4 h-4 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            );
          })}
        </div>
      </CardBody>
      <CardFooter>
        <Button size="sm" variant="secondary" className="w-full">
          <RefreshCw className="w-4 h-4 mr-2" />
          Generate More Ideas
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function MarketingDemoPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-900 dark:to-neutral-800">
      <PageHeader
        title="AI Marketing Suite Demo"
        description="Experience the power of AI-driven content creation, scheduling, and analytics"
      />

      <div className="container-padding py-8 space-y-8">
        {/* Hero Banner */}
        <Card className="bg-gradient-to-r from-pink-500 via-rose-500 to-orange-500 border-0">
          <CardBody className="py-8">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <h2 className="text-2xl font-bold mb-2">
                  Create Marketing Content 10x Faster
                </h2>
                <p className="text-pink-100 max-w-xl">
                  Our AI-powered marketing suite helps you generate, schedule,
                  and analyze content across all channels. Train it on your
                  brand voice for consistent messaging.
                </p>
              </div>
              <div className="hidden lg:flex items-center gap-4">
                <Badge className="bg-white/20 text-white border-0 text-sm py-1 px-3">
                  <Sparkles className="w-4 h-4 mr-1" />
                  Powered by GPT-4
                </Badge>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Content Generator */}
          <ContentGeneratorDemo />

          {/* Right Column - Supporting Features */}
          <div className="space-y-6">
            <BrandVoiceDemo />
            <QuickIdeasDemo />
          </div>
        </div>

        {/* Calendar Section */}
        <ContentCalendarDemo />

        {/* Bottom Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RepurposeDemo />
          <AnalyticsDemo />
        </div>

        {/* Call to Action */}
        <Card className="bg-gradient-to-r from-primary-500 to-primary-600 border-0">
          <CardBody className="py-8 text-center text-white">
            <h2 className="text-2xl font-bold mb-2">
              Ready to Supercharge Your Marketing?
            </h2>
            <p className="text-primary-100 mb-6 max-w-2xl mx-auto">
              Join hundreds of businesses using AI to create better content
              faster. Start your free trial today.
            </p>
            <div className="flex justify-center gap-4">
              <Button
                variant="secondary"
                size="lg"
                className="bg-white text-primary-600 hover:bg-primary-50"
              >
                <Play className="w-4 h-4 mr-2" />
                Watch Full Demo
              </Button>
              <Button
                variant="secondary"
                size="lg"
                className="bg-primary-400 text-white border-white/30 hover:bg-primary-300"
              >
                Start Free Trial
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
