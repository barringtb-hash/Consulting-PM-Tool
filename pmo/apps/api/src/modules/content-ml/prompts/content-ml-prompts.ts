/**
 * Content ML Prompts
 *
 * LLM prompt templates for content generation, brand voice analysis,
 * SEO optimization, and content improvement features.
 *
 * @module content-ml/prompts
 */

import type { BrandVoiceProfile, BrandVoiceTrainingInput } from '../types';
import { escapePromptContent } from '../../../utils/prompt-sanitizer';

// ============================================================================
// System Prompts
// ============================================================================

/**
 * Base system prompt for brand voice analysis
 */
export const BRAND_VOICE_SYSTEM_PROMPT = `You are an expert brand voice analyst and content strategist. You analyze writing samples to extract brand voice characteristics, tone patterns, vocabulary preferences, and communication style.

Your analysis should be:
- Data-driven: Base conclusions on patterns observed in the samples
- Specific: Identify concrete vocabulary, phrases, and style markers
- Comprehensive: Cover tone, formality, sentence structure, and rhetoric
- Actionable: Provide guidance that enables consistent content creation

Always respond with valid JSON matching the requested schema.`;

/**
 * System prompt for voice consistency checking
 */
export const VOICE_CONSISTENCY_SYSTEM_PROMPT = `You are an expert editor specializing in brand voice consistency. You analyze content against established brand voice guidelines to identify deviations and suggest improvements.

Your analysis should be:
- Objective: Score based on measurable criteria
- Specific: Identify exact locations and text that deviate
- Constructive: Provide actionable suggestions with replacement text
- Balanced: Acknowledge what works well while noting areas for improvement

Always respond with valid JSON matching the requested schema.`;

// ============================================================================
// Brand Voice Training Prompt
// ============================================================================

/**
 * Prompt template for brand voice training from samples.
 * Analyzes sample content to create a structured voice profile.
 */
export const BRAND_VOICE_TRAINING_PROMPT = `Analyze the following content samples to create a comprehensive brand voice profile.

## BRAND INFORMATION
{brandInfo}

## CONTENT SAMPLES
{samples}

## TASK
Analyze these samples to identify consistent patterns in tone, vocabulary, style, and rhetoric. Create a detailed brand voice profile that can be used to generate consistent content.

Respond with a JSON object matching this exact schema:
{
  "primaryTone": "<professional | friendly | authoritative | conversational | inspiring | educational | playful | empathetic | bold | minimalist | luxurious | technical>",
  "secondaryTones": ["<array of 1-3 secondary tones from the same list>"],
  "formality": "<very_formal | formal | neutral | casual | very_casual>",
  "personality": ["<array of 3-5 personality traits, e.g., 'innovative', 'approachable', 'expert'>"],
  "vocabulary": {
    "preferred": ["<array of 10-20 words/phrases the brand frequently uses>"],
    "avoided": ["<array of 5-10 words/phrases the brand avoids or never uses>"],
    "industryTerms": ["<array of 5-15 industry-specific terms used>"]
  },
  "sentenceStyle": "<short_punchy | medium_balanced | long_flowing | varied_dynamic>",
  "rhetoricDevices": ["<array of rhetoric devices used: metaphor, analogy, storytelling, statistics, questions, repetition, contrast, call_to_action, social_proof, urgency>"]
}

## GUIDELINES
- Base analysis on actual patterns found in the samples
- primaryTone should be the most dominant tone across samples
- secondaryTones should complement the primary tone
- personality traits should reflect the brand's unique character
- preferred vocabulary should include distinctive phrases, not common words
- avoided vocabulary includes competitor terminology or off-brand language
- Consider sentence length distribution for sentenceStyle
- Identify at least 3 rhetoric devices that appear consistently`;

// ============================================================================
// Voice Consistency Check Prompt
// ============================================================================

/**
 * Prompt template for checking content against brand voice.
 */
export const VOICE_CONSISTENCY_CHECK_PROMPT = `Analyze the following content for consistency with the established brand voice profile.

## BRAND VOICE PROFILE
{voiceProfile}

## CONTENT TO ANALYZE
{content}

## TASK
Evaluate how well this content matches the brand voice profile. Identify specific deviations and provide suggestions for improvement.

Respond with a JSON object matching this exact schema:
{
  "consistencyScore": <number 0-100 representing overall consistency>,
  "toneMatch": <number 0-100 representing how well the tone matches>,
  "vocabularyMatch": <number 0-100 representing vocabulary adherence>,
  "styleMatch": <number 0-100 representing style/structure match>,
  "deviations": [
    {
      "location": "<paragraph N, sentence M>",
      "issue": "<description of how this deviates from brand voice>",
      "suggestion": "<how to fix it>",
      "originalText": "<the specific text that deviates>",
      "suggestedText": "<suggested replacement text>"
    }
  ],
  "overallFeedback": "<2-3 sentence summary of the content's voice consistency>"
}

## SCORING GUIDELINES
- consistencyScore: 90-100 = excellent match, 70-89 = good with minor issues, 50-69 = needs improvement, <50 = significant rewrite needed
- toneMatch: Compare emotional quality and attitude against primaryTone and secondaryTones
- vocabularyMatch: Check for preferred words used, avoided words absent, proper industry terms
- styleMatch: Compare sentence length patterns and structure against sentenceStyle
- Identify up to 5 most impactful deviations
- Provide specific, actionable replacement text for each deviation`;

// ============================================================================
// Voice Improvement Prompt
// ============================================================================

/**
 * Prompt template for suggesting voice improvements to content.
 */
export const VOICE_IMPROVEMENT_PROMPT = `Rewrite the following content to better match the brand voice profile, while preserving the original meaning and key information.

## BRAND VOICE PROFILE
{voiceProfile}

## ORIGINAL CONTENT
{content}

## TASK
Rewrite this content to perfectly match the brand voice profile. Maintain all factual information and key messages while adjusting tone, vocabulary, and style.

Respond with a JSON object matching this exact schema:
{
  "improvedContent": "<the fully rewritten content matching brand voice>",
  "changes": [
    "<description of change 1>",
    "<description of change 2>"
  ]
}

## GUIDELINES
- Preserve all facts, figures, and key messages
- Use preferred vocabulary from the brand profile
- Avoid any words from the avoided list
- Match the primaryTone throughout
- Apply sentence style patterns from the profile
- Incorporate relevant rhetoric devices naturally
- List 3-7 key changes made`;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format brand info for prompts.
 * All user-provided brand information is sanitized to prevent prompt injection.
 */
export function formatBrandInfo(input: BrandVoiceTrainingInput): string {
  // Sanitize all user-provided fields
  const safeBrandName = escapePromptContent(input.brandName, {
    maxLength: 200,
  });
  const safeIndustry = escapePromptContent(input.industry, { maxLength: 200 });
  const safeTargetAudience = escapePromptContent(input.targetAudience, {
    maxLength: 500,
  });

  let brandInfo = `Brand Name: ${safeBrandName}
Industry: ${safeIndustry}
Target Audience: ${safeTargetAudience}`;

  if (input.tonePreferences && input.tonePreferences.length > 0) {
    // Sanitize each tone preference
    const safeTones = input.tonePreferences.map((t) =>
      escapePromptContent(t, { maxLength: 50 }),
    );
    brandInfo += `\nPreferred Tones: ${safeTones.join(', ')}`;
  }

  return brandInfo;
}

/**
 * Format voice samples for prompts.
 * Each sample is sanitized to prevent prompt injection.
 */
export function formatVoiceSamples(samples: string[]): string {
  if (samples.length === 0) {
    return 'No samples provided';
  }

  return samples
    .map((sample, index) => {
      // Sanitize each sample content
      const safeSample = escapePromptContent(sample.trim(), {
        maxLength: 2000,
      });
      return `--- Sample ${index + 1} ---\n${safeSample}\n`;
    })
    .join('\n');
}

/**
 * Format brand voice profile for consistency check prompts.
 * All vocabulary items and profile strings are sanitized to prevent prompt injection.
 */
export function formatVoiceProfile(profile: BrandVoiceProfile): string {
  // Sanitize all user-defined vocabulary items
  const safePreferred = profile.vocabulary.preferred.map((w) =>
    escapePromptContent(w, { maxLength: 100 }),
  );
  const safeAvoided = profile.vocabulary.avoided.map((w) =>
    escapePromptContent(w, { maxLength: 100 }),
  );
  const safeIndustryTerms = profile.vocabulary.industryTerms.map((w) =>
    escapePromptContent(w, { maxLength: 100 }),
  );
  const safePersonality = profile.personality.map((p) =>
    escapePromptContent(p, { maxLength: 50 }),
  );
  const safeSecondaryTones = profile.secondaryTones.map((t) =>
    escapePromptContent(t, { maxLength: 50 }),
  );
  const safeRhetoricDevices = profile.rhetoricDevices.map((d) =>
    escapePromptContent(d, { maxLength: 50 }),
  );

  return `Primary Tone: ${escapePromptContent(profile.primaryTone, { maxLength: 50 })}
Secondary Tones: ${safeSecondaryTones.join(', ')}
Formality: ${escapePromptContent(profile.formality, { maxLength: 50 })}
Personality Traits: ${safePersonality.join(', ')}

Preferred Vocabulary:
${safePreferred.map((w) => `- ${w}`).join('\n')}

Avoided Vocabulary:
${safeAvoided.map((w) => `- ${w}`).join('\n')}

Industry Terms:
${safeIndustryTerms.map((w) => `- ${w}`).join('\n')}

Sentence Style: ${escapePromptContent(profile.sentenceStyle, { maxLength: 50 })}
Rhetoric Devices: ${safeRhetoricDevices.join(', ')}`;
}

/**
 * Build brand voice training prompt
 */
export function buildBrandVoiceTrainingPrompt(
  input: BrandVoiceTrainingInput,
): string {
  return BRAND_VOICE_TRAINING_PROMPT.replace(
    '{brandInfo}',
    formatBrandInfo(input),
  ).replace('{samples}', formatVoiceSamples(input.sampleContent));
}

/**
 * Build voice consistency check prompt.
 * Content to check is sanitized to prevent prompt injection.
 */
export function buildVoiceConsistencyCheckPrompt(
  profile: BrandVoiceProfile,
  content: string,
): string {
  // Sanitize the content being analyzed
  const safeContent = escapePromptContent(content, { maxLength: 10000 });

  return VOICE_CONSISTENCY_CHECK_PROMPT.replace(
    '{voiceProfile}',
    formatVoiceProfile(profile),
  ).replace('{content}', safeContent);
}

/**
 * Build voice improvement prompt.
 * Content to improve is sanitized to prevent prompt injection.
 */
export function buildVoiceImprovementPrompt(
  profile: BrandVoiceProfile,
  content: string,
): string {
  // Sanitize the content being improved
  const safeContent = escapePromptContent(content, { maxLength: 10000 });

  return VOICE_IMPROVEMENT_PROMPT.replace(
    '{voiceProfile}',
    formatVoiceProfile(profile),
  ).replace('{content}', safeContent);
}

// ============================================================================
// Platform Character Limits
// ============================================================================

/**
 * Character limits for each social media platform and content type.
 * These limits help ensure generated content fits platform requirements.
 */
export const PLATFORM_LIMITS = {
  // Social Media Platforms
  twitter: {
    post: 280,
    bio: 160,
    name: 50,
  },
  linkedin: {
    post: 3000,
    article: 120000,
    headline: 120,
    summary: 2000,
    comment: 1250,
  },
  instagram: {
    caption: 2200,
    bio: 150,
    comment: 2200,
    hashtags: 30, // max number of hashtags
  },
  facebook: {
    post: 63206,
    recommendedPost: 500, // optimal engagement length
    comment: 8000,
    adPrimary: 125,
    adHeadline: 40,
    adDescription: 30,
  },
  tiktok: {
    caption: 2200,
    bio: 80,
    comment: 150,
  },
  youtube: {
    title: 100,
    description: 5000,
    comment: 10000,
  },
  pinterest: {
    pinTitle: 100,
    pinDescription: 500,
    boardName: 50,
    boardDescription: 500,
  },
  // Content Types
  email: {
    subjectLine: 60,
    preheader: 100,
    body: 50000,
  },
  blog: {
    title: 70, // SEO optimal
    metaDescription: 160,
    excerpt: 300,
    body: 100000,
  },
  ad: {
    headline: 30,
    description: 90,
    longHeadline: 90,
  },
} as const;

// ============================================================================
// Content Generation System Prompt
// ============================================================================

/**
 * Base system prompt for content generation
 */
export const CONTENT_GENERATION_SYSTEM_PROMPT = `You are an expert content creator and marketing strategist. You create engaging, platform-optimized content that resonates with target audiences while maintaining brand voice consistency.

Your content should be:
- Engaging: Capture attention and drive action
- On-brand: Consistent with provided brand voice guidelines
- Platform-optimized: Tailored for each platform's best practices
- Goal-oriented: Aligned with the specified content objectives

Always respond with valid JSON matching the requested schema.`;

// ============================================================================
// Content Generation Prompts by Type
// ============================================================================

/**
 * Prompts for generating different content types.
 * Each prompt is optimized for GPT-4o-mini with structured JSON output.
 */
export const CONTENT_GENERATION_PROMPTS = {
  /**
   * Social media post generation prompt
   */
  social_post: `Generate engaging social media content based on the following parameters.

## BRAND VOICE (if provided)
{voiceProfile}

## CONTENT PARAMETERS
Topic: {topic}
Platform: {platform}
Goal: {goal}
Target Audience: {targetAudience}
Key Messages: {keyMessages}
Call to Action: {callToAction}
Character Limit: {characterLimit}

## TASK
Create a compelling social media post optimized for the specified platform. Consider platform-specific best practices, optimal length, and engagement patterns.

Respond with a JSON object matching this exact schema:
{
  "content": "<the main post content>",
  "alternativeVersions": [
    "<alternative version 1>",
    "<alternative version 2>"
  ],
  "suggestedHashtags": ["<hashtag1>", "<hashtag2>", "<hashtag3>"],
  "suggestedEmoji": ["<emoji1>", "<emoji2>"],
  "engagementHooks": ["<hook1>", "<hook2>"],
  "bestPostingTimes": ["<time1>", "<time2>"],
  "estimatedEngagement": "<low | medium | high>",
  "contentTips": ["<tip1>", "<tip2>"]
}

## GUIDELINES
- Stay within the character limit
- Use platform-appropriate tone and formatting
- Include a clear call-to-action if specified
- Suggest 3-5 relevant hashtags
- Provide 2 alternative versions for A/B testing
- Consider current trends and best practices`,

  /**
   * Blog post generation prompt
   */
  blog_post: `Generate a comprehensive blog post based on the following parameters.

## BRAND VOICE (if provided)
{voiceProfile}

## CONTENT PARAMETERS
Topic: {topic}
Target Audience: {targetAudience}
Keywords: {keywords}
Word Count Target: {wordCount}
Content Goal: {goal}
Tone: {tone}

## TASK
Create a well-structured, SEO-optimized blog post that provides value to readers while achieving the content goals.

Respond with a JSON object matching this exact schema:
{
  "title": "<SEO-optimized title, max 70 characters>",
  "metaDescription": "<compelling meta description, max 160 characters>",
  "excerpt": "<blog excerpt for previews, max 300 characters>",
  "outline": [
    {
      "heading": "<H2 heading>",
      "subheadings": ["<H3 subheading 1>", "<H3 subheading 2>"]
    }
  ],
  "content": "<full blog post content in markdown format>",
  "keyTakeaways": ["<takeaway 1>", "<takeaway 2>", "<takeaway 3>"],
  "suggestedImages": [
    {
      "placement": "<after paragraph N or section name>",
      "description": "<what the image should show>",
      "altText": "<SEO-friendly alt text>"
    }
  ],
  "internalLinkSuggestions": ["<topic 1 to link to>", "<topic 2 to link to>"],
  "ctaPlacement": "<where to place the main CTA>"
}

## GUIDELINES
- Use the target keywords naturally (2-3% density)
- Include an engaging introduction with a hook
- Structure with clear H2 and H3 headings
- Write scannable content with short paragraphs
- Include actionable advice and examples
- End with a clear conclusion and CTA`,

  /**
   * Email content generation prompt
   */
  email: `Generate email content based on the following parameters.

## BRAND VOICE (if provided)
{voiceProfile}

## CONTENT PARAMETERS
Email Type: {emailType}
Subject Context: {context}
Target Audience: {targetAudience}
Goal: {goal}
Call to Action: {callToAction}
Personalization Variables: {personalizationVars}

## TASK
Create compelling email content optimized for opens, clicks, and conversions.

Respond with a JSON object matching this exact schema:
{
  "subjectLines": [
    {
      "text": "<subject line, max 60 characters>",
      "type": "<curiosity | benefit | urgency | personalized | question>"
    }
  ],
  "preheader": "<preheader text, max 100 characters>",
  "greeting": "<personalized greeting>",
  "body": "<email body content in HTML-friendly format>",
  "ctaButton": {
    "text": "<CTA button text>",
    "placement": "<above_fold | mid_content | end>"
  },
  "closing": "<sign-off text>",
  "psLine": "<optional P.S. line for additional hook>",
  "plainTextVersion": "<plain text version of the email>",
  "sendTimeSuggestion": "<optimal send time recommendation>",
  "segmentSuggestions": ["<audience segment 1>", "<audience segment 2>"]
}

## GUIDELINES
- Provide 3-5 subject line variations for A/B testing
- Keep subject lines under 60 characters for mobile
- Write scannable body content
- Include one clear primary CTA
- Personalize where possible using provided variables
- Consider email rendering across clients`,

  /**
   * Ad copy generation prompt
   */
  ad_copy: `Generate advertising copy based on the following parameters.

## BRAND VOICE (if provided)
{voiceProfile}

## CONTENT PARAMETERS
Platform: {platform}
Ad Format: {adFormat}
Product/Service: {productService}
Target Audience: {targetAudience}
Unique Value Proposition: {uvp}
Goal: {goal}
Competitor Context: {competitorContext}

## TASK
Create high-converting ad copy optimized for the specified platform and format.

Respond with a JSON object matching this exact schema:
{
  "headlines": [
    {
      "text": "<headline text>",
      "characterCount": <number>,
      "hook": "<benefit | curiosity | social_proof | urgency | pain_point>"
    }
  ],
  "descriptions": [
    {
      "text": "<description text>",
      "characterCount": <number>
    }
  ],
  "primaryText": "<main ad body text>",
  "callToAction": "<recommended CTA button text>",
  "variations": [
    {
      "angle": "<angle description>",
      "headline": "<headline for this angle>",
      "description": "<description for this angle>"
    }
  ],
  "targetingNotes": ["<targeting suggestion 1>", "<targeting suggestion 2>"],
  "expectedCTR": "<low | medium | high>",
  "improvementTips": ["<tip 1>", "<tip 2>"]
}

## GUIDELINES
- Create 5 headline variations with different hooks
- Create 3 description variations
- Highlight the unique value proposition clearly
- Use power words and emotional triggers
- Include social proof elements where appropriate
- Test different angles: benefit, curiosity, urgency, pain point`,

  /**
   * Video script generation prompt
   */
  video_script: `Generate a video script based on the following parameters.

## BRAND VOICE (if provided)
{voiceProfile}

## CONTENT PARAMETERS
Video Type: {videoType}
Platform: {platform}
Duration: {duration}
Topic: {topic}
Target Audience: {targetAudience}
Goal: {goal}

## TASK
Create an engaging video script with clear structure, timing, and visual direction.

Respond with a JSON object matching this exact schema:
{
  "title": "<video title>",
  "hook": "<opening hook, first 3-5 seconds>",
  "script": [
    {
      "timestamp": "<MM:SS>",
      "duration": <seconds>,
      "dialogue": "<spoken words>",
      "visualDirection": "<what should be on screen>",
      "bRoll": "<suggested B-roll footage>",
      "textOverlay": "<any text to display>"
    }
  ],
  "cta": {
    "text": "<call to action script>",
    "visualDirection": "<CTA visual treatment>"
  },
  "musicSuggestions": ["<music style 1>", "<music style 2>"],
  "thumbnailIdeas": [
    {
      "concept": "<thumbnail concept>",
      "textOverlay": "<thumbnail text>"
    }
  ],
  "totalDuration": "<estimated total duration>",
  "engagementElements": ["<element 1>", "<element 2>"]
}

## GUIDELINES
- Hook viewers in the first 3 seconds
- Match pacing to platform expectations
- Include clear visual directions for each segment
- Add engagement prompts (questions, CTAs throughout)
- Consider retention patterns for the platform
- End with a clear, actionable CTA`,

  /**
   * Newsletter content generation prompt
   */
  newsletter: `Generate newsletter content based on the following parameters.

## BRAND VOICE (if provided)
{voiceProfile}

## CONTENT PARAMETERS
Newsletter Name: {newsletterName}
Theme/Topic: {theme}
Target Audience: {targetAudience}
Sections Needed: {sections}
Featured Content: {featuredContent}
Goal: {goal}

## TASK
Create engaging newsletter content that informs, entertains, and drives action.

Respond with a JSON object matching this exact schema:
{
  "subjectLines": ["<subject 1>", "<subject 2>", "<subject 3>"],
  "preheader": "<preheader text>",
  "intro": "<newsletter introduction/greeting>",
  "sections": [
    {
      "heading": "<section heading>",
      "content": "<section content>",
      "cta": {
        "text": "<CTA text>",
        "linkDescription": "<what the link leads to>"
      }
    }
  ],
  "featuredStory": {
    "headline": "<featured story headline>",
    "summary": "<2-3 sentence summary>",
    "fullContent": "<expanded content if needed>"
  },
  "quickLinks": [
    {
      "text": "<link text>",
      "description": "<brief description>"
    }
  ],
  "closing": "<newsletter closing>",
  "editorNote": "<optional personal note from editor>"
}

## GUIDELINES
- Create scannable content with clear sections
- Mix content types: education, news, entertainment
- Include multiple CTAs but highlight one primary action
- Personalize the intro and closing
- Keep sections concise and value-focused
- Consider mobile-first design`,

  /**
   * Product description generation prompt
   */
  product_description: `Generate product description content based on the following parameters.

## BRAND VOICE (if provided)
{voiceProfile}

## CONTENT PARAMETERS
Product Name: {productName}
Product Category: {category}
Features: {features}
Benefits: {benefits}
Target Audience: {targetAudience}
Price Point: {pricePoint}
Competitor Products: {competitors}

## TASK
Create compelling product descriptions that highlight benefits and drive conversions.

Respond with a JSON object matching this exact schema:
{
  "headline": "<attention-grabbing product headline>",
  "tagline": "<short memorable tagline>",
  "shortDescription": "<50-100 word elevator pitch>",
  "longDescription": "<detailed 200-400 word description>",
  "bulletPoints": [
    {
      "feature": "<feature name>",
      "benefit": "<benefit to customer>"
    }
  ],
  "socialProofElements": ["<element 1>", "<element 2>"],
  "objectionHandlers": [
    {
      "objection": "<common objection>",
      "response": "<how product addresses it>"
    }
  ],
  "seoKeywords": ["<keyword 1>", "<keyword 2>"],
  "crossSellSuggestions": ["<related product 1>", "<related product 2>"]
}

## GUIDELINES
- Lead with benefits, support with features
- Use sensory and emotional language
- Address the target audience's pain points
- Include social proof elements
- Optimize for both humans and search engines
- Create urgency without being pushy`,
} as const;

// ============================================================================
// Platform Optimization Prompts
// ============================================================================

/**
 * Platform-specific optimization prompts for adapting content.
 * Each prompt helps tailor content to platform best practices.
 */
export const PLATFORM_OPTIMIZATION_PROMPTS = {
  /**
   * LinkedIn content optimization prompt
   */
  linkedin: `Optimize the following content for LinkedIn.

## ORIGINAL CONTENT
{content}

## BRAND VOICE (if provided)
{voiceProfile}

## OPTIMIZATION CONTEXT
Goal: {goal}
Target Audience: {targetAudience}
Content Type: {contentType}

## TASK
Adapt this content for optimal LinkedIn engagement, considering the platform's professional context and algorithm preferences.

Respond with a JSON object matching this exact schema:
{
  "optimizedContent": "<LinkedIn-optimized version, max 3000 characters>",
  "formattingApplied": ["<formatting 1>", "<formatting 2>"],
  "hookLine": "<strong opening line for feed visibility>",
  "engagementQuestion": "<question to encourage comments>",
  "hashtags": ["<hashtag1>", "<hashtag2>", "<hashtag3>"],
  "mentionSuggestions": ["<type of person/company to tag>"],
  "bestPostingTime": "<recommended posting time>",
  "expectedReach": "<low | medium | high>",
  "tips": [
    "<LinkedIn-specific tip 1>",
    "<LinkedIn-specific tip 2>"
  ]
}

## LINKEDIN BEST PRACTICES
- Strong hook in first 2 lines (before "see more")
- Use line breaks for readability
- Native content outperforms links
- Personal stories drive engagement
- Limit to 3-5 hashtags
- Best times: Tuesday-Thursday, 8-10am
- Use emoji sparingly and professionally
- Ask questions to boost comments
- Tag relevant connections strategically`,

  /**
   * Twitter/X content optimization prompt
   */
  twitter: `Optimize the following content for Twitter/X.

## ORIGINAL CONTENT
{content}

## BRAND VOICE (if provided)
{voiceProfile}

## OPTIMIZATION CONTEXT
Goal: {goal}
Target Audience: {targetAudience}
Thread or Single: {format}

## TASK
Adapt this content for optimal Twitter/X engagement, considering the platform's fast-paced nature and character limits.

Respond with a JSON object matching this exact schema:
{
  "optimizedContent": "<Twitter-optimized version, max 280 characters>",
  "thread": [
    {
      "tweetNumber": <number>,
      "content": "<tweet content, max 280 characters>",
      "hasMedia": <boolean>
    }
  ],
  "hookTweet": "<attention-grabbing first tweet>",
  "hashtags": ["<hashtag1>", "<hashtag2>"],
  "replyBait": "<content designed to encourage replies>",
  "quoteTweetSuggestion": "<idea for quote tweet engagement>",
  "bestPostingTime": "<recommended posting time>",
  "tips": [
    "<Twitter-specific tip 1>",
    "<Twitter-specific tip 2>"
  ]
}

## TWITTER BEST PRACTICES
- Front-load the hook in first 50 characters
- Use threads for longer content (number each tweet)
- Limit to 1-2 hashtags per tweet
- Native images get 3x more engagement
- Use polls for engagement
- Best times: 9am-12pm weekdays
- Ask questions or hot takes for replies
- Leave room for retweets with comment`,

  /**
   * Instagram content optimization prompt
   */
  instagram: `Optimize the following content for Instagram.

## ORIGINAL CONTENT
{content}

## BRAND VOICE (if provided)
{voiceProfile}

## OPTIMIZATION CONTEXT
Goal: {goal}
Target Audience: {targetAudience}
Format: {format}

## TASK
Adapt this content for optimal Instagram engagement, considering the visual-first platform and various content formats.

Respond with a JSON object matching this exact schema:
{
  "caption": "<Instagram caption, max 2200 characters>",
  "hookLine": "<first line that appears before 'more'>",
  "hashtags": {
    "primary": ["<5 highly relevant hashtags>"],
    "secondary": ["<10-15 discovery hashtags>"],
    "placement": "<in_caption | first_comment>"
  },
  "storiesVersion": {
    "slides": [
      {
        "slideNumber": <number>,
        "text": "<short text for story slide>",
        "sticker": "<poll | question | quiz | slider>",
        "stickerContent": "<sticker details>"
      }
    ]
  },
  "reelsIdeas": [
    {
      "hook": "<first 1-2 seconds>",
      "concept": "<video concept>",
      "trending": "<relevant trend to incorporate>"
    }
  ],
  "carouselSlides": [
    "<slide 1 content>",
    "<slide 2 content>"
  ],
  "bestPostingTime": "<recommended posting time>",
  "tips": [
    "<Instagram-specific tip 1>",
    "<Instagram-specific tip 2>"
  ]
}

## INSTAGRAM BEST PRACTICES
- Strong visual hook in first line
- Use emojis strategically for personality
- 20-30 hashtags for reach, mix sizes
- Carousel posts get highest engagement
- Reels are prioritized by algorithm
- Use Stories for behind-the-scenes
- Best times: 11am-1pm, 7-9pm
- Save CTAs for end of caption
- Use line breaks for readability`,

  /**
   * Facebook content optimization prompt
   */
  facebook: `Optimize the following content for Facebook.

## ORIGINAL CONTENT
{content}

## BRAND VOICE (if provided)
{voiceProfile}

## OPTIMIZATION CONTEXT
Goal: {goal}
Target Audience: {targetAudience}
Page or Group: {context}

## TASK
Adapt this content for optimal Facebook engagement, considering the platform's emphasis on community and meaningful interactions.

Respond with a JSON object matching this exact schema:
{
  "optimizedContent": "<Facebook-optimized version>",
  "hookLine": "<compelling first line>",
  "engagementPrompt": "<question or prompt for comments>",
  "shareability": {
    "score": "<low | medium | high>",
    "improvements": ["<suggestion 1>", "<suggestion 2>"]
  },
  "visualRecommendation": {
    "type": "<image | video | carousel | link_preview>",
    "specs": "<recommended specifications>"
  },
  "groupPostVersion": "<version optimized for Facebook Groups>",
  "adVersion": {
    "primaryText": "<ad primary text, max 125 characters>",
    "headline": "<ad headline, max 40 characters>",
    "description": "<ad description, max 30 characters>"
  },
  "bestPostingTime": "<recommended posting time>",
  "tips": [
    "<Facebook-specific tip 1>",
    "<Facebook-specific tip 2>"
  ]
}

## FACEBOOK BEST PRACTICES
- Posts under 500 characters perform best
- Native video outperforms YouTube links
- Questions drive 2x more comments
- Use Facebook-native features (polls, events)
- Tag relevant Pages for reach
- Best times: 1-4pm weekdays
- Groups prioritize meaningful discussions
- Link posts get less reach than native content
- Use eye-catching visuals`,
} as const;

// ============================================================================
// SEO Analysis Prompt
// ============================================================================

/**
 * Prompt for analyzing content SEO and providing optimization recommendations.
 */
export const SEO_ANALYSIS_PROMPT = `Analyze the following content for SEO optimization opportunities.

## CONTENT TO ANALYZE
Title: {title}
Content: {content}
Target Keywords: {targetKeywords}
Current URL (if any): {url}
Content Type: {contentType}

## TASK
Provide a comprehensive SEO analysis with actionable recommendations to improve search visibility.

Respond with a JSON object matching this exact schema:
{
  "overallScore": <number 0-100>,
  "titleAnalysis": {
    "current": "<current title>",
    "score": <number 0-100>,
    "issues": ["<issue 1>", "<issue 2>"],
    "suggestions": [
      {
        "title": "<suggested title>",
        "improvement": "<why this is better>"
      }
    ]
  },
  "metaDescription": {
    "suggested": "<optimized meta description, max 160 characters>",
    "keywords": ["<keywords included>"]
  },
  "keywordAnalysis": {
    "primaryKeyword": {
      "keyword": "<main keyword>",
      "density": "<current density %>",
      "optimalDensity": "<recommended density %>",
      "placement": {
        "inTitle": <boolean>,
        "inFirstParagraph": <boolean>,
        "inHeadings": <boolean>,
        "inUrl": <boolean>
      }
    },
    "secondaryKeywords": [
      {
        "keyword": "<secondary keyword>",
        "occurrences": <number>,
        "recommendation": "<add more | reduce | optimal>"
      }
    ],
    "missingKeywords": ["<keyword that should be added>"],
    "keywordStuffing": ["<overused keywords to reduce>"]
  },
  "contentStructure": {
    "readabilityScore": <number 0-100>,
    "avgSentenceLength": <number>,
    "paragraphAnalysis": "<short | optimal | too long>",
    "headingStructure": {
      "hasH1": <boolean>,
      "h2Count": <number>,
      "h3Count": <number>,
      "issues": ["<heading issue>"]
    }
  },
  "technicalSeo": {
    "urlSuggestion": "<SEO-friendly URL slug>",
    "internalLinkOpportunities": ["<topic to link to>"],
    "externalLinkSuggestions": ["<authoritative source to cite>"],
    "imageAltTextSuggestions": ["<alt text suggestion>"]
  },
  "competitiveGaps": ["<content gap vs competitors>"],
  "quickWins": ["<easy improvement 1>", "<easy improvement 2>"],
  "prioritizedActions": [
    {
      "action": "<specific action>",
      "impact": "<high | medium | low>",
      "effort": "<high | medium | low>"
    }
  ]
}

## SEO GUIDELINES
- Title: 50-60 characters, keyword near beginning
- Meta description: 150-160 characters, include CTA
- Keyword density: 1-2% for primary keyword
- Heading hierarchy: One H1, multiple H2/H3s
- Paragraph length: 2-3 sentences for web reading
- Internal links: 2-5 per 1000 words
- First 100 words should include primary keyword`;

/**
 * System prompt for SEO analysis
 */
export const SEO_ANALYSIS_SYSTEM_PROMPT = `You are an expert SEO analyst and content strategist. You analyze content for search engine optimization opportunities and provide actionable recommendations.

Your analysis should be:
- Data-driven: Based on current SEO best practices and ranking factors
- Specific: Provide exact recommendations, not vague suggestions
- Prioritized: Rank recommendations by impact and effort
- Actionable: Every suggestion should be immediately implementable

Always respond with valid JSON matching the requested schema.`;

// ============================================================================
// Content Ideas Generation Prompt
// ============================================================================

/**
 * Prompt for generating content ideas based on topic and audience.
 */
export const CONTENT_IDEAS_PROMPT = `Generate content ideas based on the following parameters.

## CONTEXT
Brand/Business: {brandName}
Industry: {industry}
Target Audience: {targetAudience}
Main Topic/Theme: {mainTopic}
Content Goals: {goals}
Existing Content: {existingContent}
Competitor Content: {competitorContent}

## BRAND VOICE (if provided)
{voiceProfile}

## TASK
Generate a diverse set of content ideas that will resonate with the target audience and support business goals.

Respond with a JSON object matching this exact schema:
{
  "pillarTopics": [
    {
      "topic": "<broad topic area>",
      "description": "<why this matters to audience>",
      "keywordPotential": "<high | medium | low>",
      "subTopics": ["<sub-topic 1>", "<sub-topic 2>", "<sub-topic 3>"]
    }
  ],
  "contentIdeas": [
    {
      "title": "<specific content title>",
      "type": "<blog | video | infographic | podcast | social_series | ebook | webinar | case_study>",
      "angle": "<unique angle or hook>",
      "targetKeywords": ["<keyword 1>", "<keyword 2>"],
      "audienceStage": "<awareness | consideration | decision>",
      "difficulty": "<easy | medium | hard>",
      "estimatedImpact": "<high | medium | low>",
      "outline": ["<section 1>", "<section 2>", "<section 3>"]
    }
  ],
  "contentSeries": [
    {
      "seriesName": "<name of content series>",
      "concept": "<what the series covers>",
      "episodes": ["<episode 1>", "<episode 2>", "<episode 3>"],
      "frequency": "<weekly | bi-weekly | monthly>"
    }
  ],
  "trendingOpportunities": [
    {
      "trend": "<current trend>",
      "contentAngle": "<how to tie brand to trend>",
      "urgency": "<time-sensitive | evergreen>"
    }
  ],
  "repurposingIdeas": [
    {
      "sourceContent": "<existing content to repurpose>",
      "newFormats": ["<format 1>", "<format 2>"]
    }
  ],
  "contentCalendar": [
    {
      "week": <week number>,
      "focus": "<weekly theme>",
      "content": ["<content piece 1>", "<content piece 2>"]
    }
  ]
}

## GUIDELINES
- Generate 10-15 specific, actionable content ideas
- Cover all stages of the customer journey
- Mix content types for variety
- Include both quick-win and in-depth content
- Consider seasonal and trending topics
- Suggest content that can be repurposed
- Prioritize topics with search potential`;

/**
 * System prompt for content ideation
 */
export const CONTENT_IDEAS_SYSTEM_PROMPT = `You are an expert content strategist and ideation specialist. You generate creative, strategic content ideas that align with brand goals and audience needs.

Your ideation should be:
- Strategic: Aligned with business goals and audience journey
- Creative: Fresh angles and unique perspectives
- Practical: Executable with reasonable resources
- Diverse: Mix of formats, topics, and difficulty levels

Always respond with valid JSON matching the requested schema.`;

// ============================================================================
// Content Repurposing Prompt
// ============================================================================

/**
 * Prompt for repurposing existing content into multiple formats.
 */
export const CONTENT_REPURPOSE_PROMPT = `Repurpose the following content into multiple formats and platforms.

## ORIGINAL CONTENT
Title: {title}
Type: {originalType}
Content: {content}

## BRAND VOICE (if provided)
{voiceProfile}

## REPURPOSING PARAMETERS
Target Formats: {targetFormats}
Target Platforms: {targetPlatforms}
Goals: {goals}

## TASK
Transform this content into multiple formats optimized for each platform while maintaining the core message and brand voice.

Respond with a JSON object matching this exact schema:
{
  "repurposedContent": [
    {
      "format": "<format type>",
      "platform": "<target platform>",
      "title": "<new title for this format>",
      "content": "<full repurposed content>",
      "adaptations": ["<change 1>", "<change 2>"],
      "characterCount": <number>,
      "estimatedTime": "<time to consume>",
      "callToAction": "<CTA for this format>"
    }
  ],
  "socialSnippets": [
    {
      "platform": "<platform>",
      "snippet": "<short promotional snippet>",
      "hashtags": ["<hashtag1>", "<hashtag2>"]
    }
  ],
  "visualAssets": [
    {
      "type": "<infographic | carousel | quote_card | thumbnail | cover_image>",
      "concept": "<visual concept description>",
      "keyElements": ["<element 1>", "<element 2>"],
      "dimensions": "<recommended dimensions>"
    }
  ],
  "atomicContent": [
    {
      "type": "<quote | statistic | tip | question>",
      "content": "<standalone piece of content>",
      "useCase": "<where to use this>"
    }
  ],
  "contentBundle": {
    "name": "<bundle name>",
    "pieces": ["<piece 1>", "<piece 2>"],
    "distribution": "<how to release these>"
  },
  "repurposingNotes": ["<note 1>", "<note 2>"]
}

## REPURPOSING GUIDELINES
- Adapt tone and length for each platform
- Extract key quotes and statistics as standalone content
- Consider visual representation opportunities
- Create a mix of long-form and snackable content
- Maintain core message across all formats
- Optimize each piece for its platform's algorithm
- Suggest a distribution sequence for maximum impact`;

/**
 * System prompt for content repurposing
 */
export const CONTENT_REPURPOSE_SYSTEM_PROMPT = `You are an expert content repurposing strategist. You transform existing content into multiple formats optimized for different platforms and audiences.

Your repurposing should be:
- Strategic: Maximize reach and impact from existing content
- Platform-native: Truly adapted, not just reformatted
- Efficient: Create content bundles that work together
- Quality-focused: Each piece should stand alone as valuable content

Always respond with valid JSON matching the requested schema.`;

// ============================================================================
// Hashtag Generation Prompt
// ============================================================================

/**
 * Prompt for generating relevant hashtags for social media content.
 */
export const HASHTAG_GENERATION_PROMPT = `Generate optimized hashtags for the following content.

## CONTENT
{content}

## CONTEXT
Platform: {platform}
Industry: {industry}
Target Audience: {targetAudience}
Content Goal: {goal}
Brand Keywords: {brandKeywords}

## TASK
Generate a strategic set of hashtags optimized for reach and engagement on the specified platform.

Respond with a JSON object matching this exact schema:
{
  "primaryHashtags": [
    {
      "hashtag": "<#hashtag>",
      "category": "<branded | industry | topic | trending | community>",
      "estimatedReach": "<small: <10K | medium: 10K-500K | large: 500K-1M | massive: >1M>",
      "competition": "<low | medium | high>",
      "relevanceScore": <number 0-100>
    }
  ],
  "secondaryHashtags": [
    {
      "hashtag": "<#hashtag>",
      "category": "<category>",
      "estimatedReach": "<reach level>",
      "useCase": "<when to use this hashtag>"
    }
  ],
  "nicheHashtags": [
    {
      "hashtag": "<#hashtag>",
      "community": "<target community>",
      "whyRelevant": "<why this connects to content>"
    }
  ],
  "trendingHashtags": [
    {
      "hashtag": "<#hashtag>",
      "trendContext": "<why it's trending>",
      "connectionAngle": "<how to connect content to trend>"
    }
  ],
  "hashtagStrategy": {
    "recommended": ["<ordered list of hashtags to use>"],
    "count": <optimal number for platform>,
    "placement": "<in_caption | first_comment | both>",
    "rotationSuggestion": "<how to vary hashtags>"
  },
  "avoidHashtags": [
    {
      "hashtag": "<#hashtag>",
      "reason": "<why to avoid>"
    }
  ],
  "platformNotes": ["<platform-specific hashtag tip 1>", "<tip 2>"]
}

## HASHTAG STRATEGY GUIDELINES
Platform-specific recommendations:
- Instagram: 20-30 hashtags, mix of sizes, can go in first comment
- Twitter: 1-2 hashtags only, integrated naturally in text
- LinkedIn: 3-5 hashtags, professional and industry-focused
- TikTok: 3-5 hashtags, trend-focused and discoverable
- Facebook: 1-3 hashtags or none, less important for reach

General guidelines:
- Mix hashtag sizes (large for reach, small for engagement)
- Include branded hashtags if applicable
- Use niche community hashtags for targeted reach
- Avoid banned or shadowbanned hashtags
- Consider hashtag competition level
- Research trending hashtags for timely content`;

/**
 * System prompt for hashtag generation
 */
export const HASHTAG_GENERATION_SYSTEM_PROMPT = `You are an expert social media strategist specializing in hashtag optimization. You research and recommend hashtags that maximize content discoverability and engagement.

Your recommendations should be:
- Platform-specific: Tailored to each platform's hashtag culture
- Strategic: Mix of reach and engagement-focused tags
- Research-based: Consider actual hashtag performance metrics
- Safe: Avoid banned, overused, or irrelevant hashtags

Always respond with valid JSON matching the requested schema.`;

// ============================================================================
// Additional Helper Functions
// ============================================================================

/**
 * Build a content generation prompt for a specific content type.
 * All user-provided parameters are sanitized to prevent prompt injection.
 *
 * @param contentType - The type of content to generate (social_post, blog_post, email, etc.)
 * @param params - Key-value pairs to replace placeholders in the prompt
 * @param voiceProfile - Optional brand voice profile for consistency
 * @returns The fully populated prompt string ready for LLM consumption
 */
export function buildContentGenerationPrompt(
  contentType: keyof typeof CONTENT_GENERATION_PROMPTS,
  params: Record<string, string>,
  voiceProfile?: BrandVoiceProfile,
): string {
  let prompt: string = CONTENT_GENERATION_PROMPTS[contentType];

  // Replace voice profile placeholder
  prompt = prompt.replace(
    '{voiceProfile}',
    voiceProfile
      ? formatVoiceProfile(voiceProfile)
      : 'No specific brand voice provided. Use a professional, engaging tone.',
  );

  // Replace all other placeholders with sanitized values
  for (const [key, value] of Object.entries(params)) {
    // Sanitize user-provided content to prevent prompt injection
    const safeValue = value
      ? escapePromptContent(value, { maxLength: 5000 })
      : 'Not specified';
    prompt = prompt.replace(new RegExp(`\\{${key}\\}`, 'g'), safeValue);
  }

  return prompt;
}

/**
 * Build a platform optimization prompt for adapting content.
 * All user-provided parameters are sanitized to prevent prompt injection.
 *
 * @param platform - The target platform (linkedin, twitter, instagram, facebook)
 * @param params - Key-value pairs to replace placeholders in the prompt
 * @param voiceProfile - Optional brand voice profile for consistency
 * @returns The fully populated prompt string ready for LLM consumption
 */
export function buildPlatformOptimizationPrompt(
  platform: keyof typeof PLATFORM_OPTIMIZATION_PROMPTS,
  params: Record<string, string>,
  voiceProfile?: BrandVoiceProfile,
): string {
  let prompt: string = PLATFORM_OPTIMIZATION_PROMPTS[platform];

  prompt = prompt.replace(
    '{voiceProfile}',
    voiceProfile
      ? formatVoiceProfile(voiceProfile)
      : 'No specific brand voice provided.',
  );

  // Sanitize all user-provided parameters
  for (const [key, value] of Object.entries(params)) {
    const safeValue = value
      ? escapePromptContent(value, { maxLength: 5000 })
      : 'Not specified';
    prompt = prompt.replace(new RegExp(`\\{${key}\\}`, 'g'), safeValue);
  }

  return prompt;
}

/**
 * Build SEO analysis prompt.
 * All user-provided parameters are sanitized to prevent prompt injection.
 *
 * @param params - Key-value pairs including title, content, targetKeywords, url, contentType
 * @returns The fully populated prompt string ready for LLM consumption
 */
export function buildSeoAnalysisPrompt(params: Record<string, string>): string {
  let prompt: string = SEO_ANALYSIS_PROMPT;

  // Sanitize all user-provided parameters
  for (const [key, value] of Object.entries(params)) {
    const safeValue = value
      ? escapePromptContent(value, { maxLength: 10000 })
      : 'Not specified';
    prompt = prompt.replace(new RegExp(`\\{${key}\\}`, 'g'), safeValue);
  }

  return prompt;
}

/**
 * Build content ideas generation prompt.
 * All user-provided parameters are sanitized to prevent prompt injection.
 *
 * @param params - Key-value pairs including brandName, industry, targetAudience, mainTopic, etc.
 * @param voiceProfile - Optional brand voice profile for consistency
 * @returns The fully populated prompt string ready for LLM consumption
 */
export function buildContentIdeasPrompt(
  params: Record<string, string>,
  voiceProfile?: BrandVoiceProfile,
): string {
  let prompt: string = CONTENT_IDEAS_PROMPT;

  prompt = prompt.replace(
    '{voiceProfile}',
    voiceProfile
      ? formatVoiceProfile(voiceProfile)
      : 'No specific brand voice provided.',
  );

  // Sanitize all user-provided parameters
  for (const [key, value] of Object.entries(params)) {
    const safeValue = value
      ? escapePromptContent(value, { maxLength: 5000 })
      : 'Not specified';
    prompt = prompt.replace(new RegExp(`\\{${key}\\}`, 'g'), safeValue);
  }

  return prompt;
}

/**
 * Build content repurposing prompt.
 * All user-provided parameters are sanitized to prevent prompt injection.
 *
 * @param params - Key-value pairs including title, originalType, content, targetFormats, etc.
 * @param voiceProfile - Optional brand voice profile for consistency
 * @returns The fully populated prompt string ready for LLM consumption
 */
export function buildContentRepurposePrompt(
  params: Record<string, string>,
  voiceProfile?: BrandVoiceProfile,
): string {
  let prompt: string = CONTENT_REPURPOSE_PROMPT;

  prompt = prompt.replace(
    '{voiceProfile}',
    voiceProfile
      ? formatVoiceProfile(voiceProfile)
      : 'No specific brand voice provided.',
  );

  // Sanitize all user-provided parameters
  for (const [key, value] of Object.entries(params)) {
    const safeValue = value
      ? escapePromptContent(value, { maxLength: 10000 })
      : 'Not specified';
    prompt = prompt.replace(new RegExp(`\\{${key}\\}`, 'g'), safeValue);
  }

  return prompt;
}

/**
 * Build hashtag generation prompt.
 * All user-provided parameters are sanitized to prevent prompt injection.
 *
 * @param params - Key-value pairs including content, platform, industry, targetAudience, goal, brandKeywords
 * @returns The fully populated prompt string ready for LLM consumption
 */
export function buildHashtagGenerationPrompt(
  params: Record<string, string>,
): string {
  let prompt: string = HASHTAG_GENERATION_PROMPT;

  // Sanitize all user-provided parameters
  for (const [key, value] of Object.entries(params)) {
    const safeValue = value
      ? escapePromptContent(value, { maxLength: 5000 })
      : 'Not specified';
    prompt = prompt.replace(new RegExp(`\\{${key}\\}`, 'g'), safeValue);
  }

  return prompt;
}

/**
 * Get character limit for a platform and content type.
 *
 * @param platform - The platform to get limits for
 * @param contentType - The content type within that platform
 * @returns The character limit or undefined if not found
 *
 * @example
 * getPlatformLimit('twitter', 'post') // returns 280
 * getPlatformLimit('linkedin', 'article') // returns 120000
 */
export function getPlatformLimit(
  platform: keyof typeof PLATFORM_LIMITS,
  contentType: string,
): number | undefined {
  const platformLimits = PLATFORM_LIMITS[platform];
  if (!platformLimits) return undefined;
  return (platformLimits as Record<string, number>)[contentType];
}
