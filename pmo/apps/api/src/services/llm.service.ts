import { env } from '../config/env';
import { ContentType } from '../types/marketing';

interface GenerateContentOptions {
  type: ContentType;
  context: {
    clientName?: string;
    projectName?: string;
    projectDescription?: string;
    meetingTitle?: string;
    meetingNotes?: string;
    decisions?: string;
    industry?: string;
    additionalContext?: string;
  };
  tone?: 'professional' | 'casual' | 'technical' | 'enthusiastic';
  length?: 'short' | 'medium' | 'long';
}

interface GeneratedContent {
  title?: string;
  body: string;
  summary?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Generate marketing content using Anthropic Claude API
 */
export const generateMarketingContent = async (
  options: GenerateContentOptions,
): Promise<GeneratedContent> => {
  const { type, context, tone = 'professional', length = 'medium' } = options;

  // If no API key, return placeholder content
  if (!env.anthropicApiKey) {
    return generatePlaceholderContent(type, context);
  }

  try {
    // Build the system prompt based on content type
    const systemPrompt = buildSystemPrompt(type, tone, length);

    // Build the user prompt with context
    const userPrompt = buildUserPrompt(type, context);

    // Call Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: getMaxTokens(length),
        temperature: getToneTemperature(tone),
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Anthropic API error:', error);
      return generatePlaceholderContent(type, context);
    }

    const data = await response.json();
    const generatedText = data.content[0].text;

    // Parse the generated content based on type
    return parseGeneratedContent(type, generatedText, context);
  } catch (error) {
    console.error('Error generating content:', error);
    return generatePlaceholderContent(type, context);
  }
};

/**
 * Build system prompt based on content type
 */
function buildSystemPrompt(
  type: ContentType,
  tone: string,
  length: string,
): string {
  const basePrompt = `You are an expert marketing content writer for AI consulting services. Your task is to create ${tone} content that is ${length} in length.`;

  const typeSpecificPrompts: Record<ContentType, string> = {
    BLOG_POST: `${basePrompt} Create engaging blog posts that educate readers about AI consulting projects and methodologies.`,
    CASE_STUDY: `${basePrompt} Write compelling case studies that highlight client challenges, solutions implemented, and measurable results.`,
    LINKEDIN_POST: `${basePrompt} Create concise, engaging LinkedIn posts that drive engagement and showcase expertise.`,
    TWITTER_POST: `${basePrompt} Write punchy, attention-grabbing tweets (max 280 characters) with relevant hashtags.`,
    EMAIL_TEMPLATE: `${basePrompt} Create persuasive email templates with clear subject lines and strong calls-to-action.`,
    WHITEPAPER: `${basePrompt} Write authoritative whitepapers that demonstrate thought leadership and deep expertise.`,
    SOCIAL_STORY: `${basePrompt} Create brief, engaging social media stories that capture attention quickly.`,
    VIDEO_SCRIPT: `${basePrompt} Write compelling video scripts with strong hooks and clear narratives.`,
    NEWSLETTER: `${basePrompt} Create informative newsletter content that keeps readers engaged and informed.`,
    OTHER: basePrompt,
  };

  return typeSpecificPrompts[type] || basePrompt;
}

/**
 * Build user prompt with context
 */
function buildUserPrompt(
  type: ContentType,
  context: GenerateContentOptions['context'],
): string {
  let prompt =
    'Please create marketing content based on the following information:\n\n';

  if (context.clientName) {
    prompt += `Client: ${context.clientName}\n`;
  }

  if (context.industry) {
    prompt += `Industry: ${context.industry}\n`;
  }

  if (context.projectName) {
    prompt += `Project: ${context.projectName}\n`;
  }

  if (context.projectDescription) {
    prompt += `Project Description: ${context.projectDescription}\n`;
  }

  if (context.meetingTitle) {
    prompt += `Meeting: ${context.meetingTitle}\n`;
  }

  if (context.meetingNotes) {
    prompt += `Meeting Notes:\n${context.meetingNotes}\n`;
  }

  if (context.decisions) {
    prompt += `Key Decisions:\n${context.decisions}\n`;
  }

  if (context.additionalContext) {
    prompt += `\nAdditional Context: ${context.additionalContext}\n`;
  }

  prompt += '\n';
  prompt += getContentTypeInstructions(type);

  return prompt;
}

/**
 * Get specific instructions for each content type
 */
function getContentTypeInstructions(type: ContentType): string {
  const instructions: Record<ContentType, string> = {
    BLOG_POST:
      'Format the blog post with: 1) A compelling title, 2) An engaging introduction, 3) Main body with clear sections, 4) A conclusion with key takeaways. Return as JSON with fields: title, body, summary.',
    CASE_STUDY:
      'Structure the case study with: 1) Title, 2) Challenge section, 3) Solution section, 4) Results section with metrics, 5) Optional testimonial. Return as JSON with fields: title, body (containing all sections), summary.',
    LINKEDIN_POST:
      'Create a LinkedIn post (max 1300 characters) with: 1) An attention-grabbing opening, 2) Key insights or story, 3) Call-to-action or question for engagement. Include 3-5 relevant hashtags. Return as JSON with fields: body (including hashtags), summary.',
    TWITTER_POST:
      'Create a tweet (max 280 characters) with: 1) Punchy opening, 2) Key message, 3) 2-3 relevant hashtags. Return as JSON with fields: body (the tweet with hashtags), summary.',
    EMAIL_TEMPLATE:
      'Create an email with: 1) Subject line, 2) Preheader text, 3) Body copy with clear structure, 4) Strong call-to-action. Return as JSON with fields: title (subject line), body, summary (preheader).',
    WHITEPAPER:
      'Create a whitepaper outline with: 1) Title, 2) Executive summary, 3) Key sections, 4) Conclusion and recommendations. Return as JSON with fields: title, body (full content), summary (executive summary).',
    SOCIAL_STORY:
      'Create a brief social story (max 500 characters) with: 1) Strong hook, 2) Core message, 3) Engaging visual suggestions. Return as JSON with fields: body, summary.',
    VIDEO_SCRIPT:
      'Create a video script with: 1) Title, 2) Hook (first 5 seconds), 3) Main content, 4) Call-to-action. Return as JSON with fields: title, body (full script), summary.',
    NEWSLETTER:
      'Create newsletter content with: 1) Headline, 2) Introduction, 3) Main sections with subheadings, 4) Closing. Return as JSON with fields: title, body, summary.',
    OTHER:
      'Create appropriate marketing content for this context. Return as JSON with fields: body, and optionally title and summary.',
  };

  return instructions[type] || instructions.OTHER;
}

/**
 * Parse generated content into structured format
 */
function parseGeneratedContent(
  _type: ContentType,
  generatedText: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _context: GenerateContentOptions['context'],
): GeneratedContent {
  try {
    // Try to parse as JSON first
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        title: parsed.title,
        body: parsed.body,
        summary: parsed.summary,
        metadata: parsed.metadata,
      };
    }
  } catch {
    // If JSON parsing fails, treat the whole text as body
  }

  // Fallback: use the whole text as body
  return {
    body: generatedText,
    summary: generatedText.substring(0, 200) + '...',
  };
}

/**
 * Generate placeholder content when API is not available
 */
function generatePlaceholderContent(
  type: ContentType,
  context: GenerateContentOptions['context'],
): GeneratedContent {
  const placeholders: Record<ContentType, GeneratedContent> = {
    BLOG_POST: {
      title: `${context.projectName || 'AI Consulting Project'}: Key Insights and Learnings`,
      body: `# ${context.projectName || 'AI Consulting Project'}\n\n## Introduction\n\nThis blog post explores our recent work with ${context.clientName || 'our client'} in the ${context.industry || 'technology'} industry.\n\n## Challenge\n\n${context.projectDescription || 'The client faced challenges in implementing AI solutions.'}\n\n## Our Approach\n\nOur team worked closely with the client to develop a tailored solution.\n\n## Results\n\nThe project delivered significant value and insights.\n\n[Note: This is placeholder content. Configure ANTHROPIC_API_KEY to generate custom content.]`,
      summary:
        'Exploring our recent AI consulting project and the key insights gained.',
    },
    CASE_STUDY: {
      title: `${context.clientName || 'Client'} Case Study: ${context.projectName || 'AI Implementation'}`,
      body: `# ${context.clientName || 'Client'} Success Story\n\n## The Challenge\n\n${context.projectDescription || 'The client needed to implement AI capabilities.'}\n\n## The Solution\n\nWe designed and implemented a comprehensive AI solution.\n\n## The Results\n\nThe client achieved measurable improvements in efficiency and outcomes.\n\n[Note: This is placeholder content. Configure ANTHROPIC_API_KEY to generate custom content.]`,
      summary: `How we helped ${context.clientName || 'our client'} achieve success with AI.`,
    },
    LINKEDIN_POST: {
      body: `Excited to share insights from our recent ${context.projectName || 'AI consulting project'} with ${context.clientName || 'our client'}! 🚀\n\nKey takeaways:\n✨ ${context.meetingNotes?.substring(0, 100) || 'Innovative approaches to AI implementation'}\n\nWhat's your experience with AI transformation?\n\n#AI #Consulting #Innovation #DigitalTransformation\n\n[Note: Configure ANTHROPIC_API_KEY for custom content.]`,
      summary: 'LinkedIn post about recent project success',
    },
    TWITTER_POST: {
      body: `🚀 Just wrapped up an amazing ${context.projectName || 'AI project'} with ${context.clientName || 'our client'}! Seeing real impact is what drives us. #AI #Innovation #TechConsulting`,
      summary: 'Tweet about project success',
    },
    EMAIL_TEMPLATE: {
      title: `Success Story: ${context.projectName || 'AI Implementation'}`,
      body: `Hi there,\n\nI wanted to share an exciting update about our recent work with ${context.clientName || 'our client'}.\n\n${context.projectDescription || 'We successfully implemented an AI solution that delivered significant value.'}\n\nInterested in learning more about how we can help your organization?\n\nLet's connect!\n\n[Note: This is placeholder content. Configure ANTHROPIC_API_KEY to generate custom content.]`,
      summary: 'Sharing recent project success and offering to connect',
    },
    WHITEPAPER: {
      title: `AI Consulting Best Practices: Insights from ${context.projectName || 'Recent Projects'}`,
      body: `# Executive Summary\n\nThis whitepaper explores best practices in AI consulting based on our work with ${context.clientName || 'leading organizations'}.\n\n## Introduction\n\nAI implementation requires careful planning and execution.\n\n## Key Findings\n\n${context.projectDescription || 'Our research reveals critical success factors.'}\n\n## Recommendations\n\nOrganizations should focus on strategic alignment and change management.\n\n[Note: This is placeholder content. Configure ANTHROPIC_API_KEY to generate custom content.]`,
      summary: 'Best practices and insights from AI consulting engagements',
    },
    SOCIAL_STORY: {
      body: `🎯 ${context.projectName || 'Amazing project'} alert!\n\nWorking with ${context.clientName || 'an incredible client'} on ${context.industry || 'AI innovation'}\n\n✨ Results coming soon!\n\n[Swipe up to learn more]`,
      summary: 'Social story teasing project results',
    },
    VIDEO_SCRIPT: {
      title: `${context.projectName || 'AI Project'} Success Story`,
      body: `[HOOK - 0:00-0:05]\n"What if AI could transform your business in just 90 days?"\n\n[INTRO - 0:05-0:15]\n"Hi, I'm sharing how we helped ${context.clientName || 'our client'} achieve breakthrough results."\n\n[MAIN CONTENT - 0:15-1:30]\n${context.projectDescription || 'We implemented a custom AI solution...'}\n\n[CTA - 1:30-1:45]\n"Ready to transform your business? Link in description."\n\n[Note: This is placeholder content. Configure ANTHROPIC_API_KEY to generate custom content.]`,
      summary: '90-second video script about project success',
    },
    NEWSLETTER: {
      title: `Newsletter: ${context.projectName || 'Latest AI Insights'}`,
      body: `# This Month in AI Consulting\n\n## Featured Project\n\n${context.projectName || 'Recent AI Implementation'} with ${context.clientName || 'our client'}\n\n${context.projectDescription || 'We delivered innovative AI solutions.'}\n\n## Industry Insights\n\nThe ${context.industry || 'technology'} sector continues to evolve rapidly.\n\n## What's Next\n\nStay tuned for more updates!\n\n[Note: This is placeholder content. Configure ANTHROPIC_API_KEY to generate custom content.]`,
      summary: 'Monthly newsletter with project updates and insights',
    },
    OTHER: {
      body: `Marketing content for ${context.projectName || 'project'} with ${context.clientName || 'client'}.\n\n${context.projectDescription || 'Project details and context.'}\n\n[Note: This is placeholder content. Configure ANTHROPIC_API_KEY to generate custom content.]`,
      summary: 'General marketing content',
    },
  };

  return placeholders[type] || placeholders.OTHER;
}

/**
 * Get max tokens based on length preference
 */
function getMaxTokens(length: string): number {
  switch (length) {
    case 'short':
      return 500;
    case 'medium':
      return 1500;
    case 'long':
      return 3000;
    default:
      return 1500;
  }
}

/**
 * Get temperature based on tone
 */
function getToneTemperature(tone: string): number {
  switch (tone) {
    case 'professional':
      return 0.3;
    case 'technical':
      return 0.2;
    case 'casual':
      return 0.7;
    case 'enthusiastic':
      return 0.8;
    default:
      return 0.5;
  }
}
