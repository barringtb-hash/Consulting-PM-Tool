import { z } from 'zod';

export const ContentType = {
  BLOG_POST: 'BLOG_POST',
  CASE_STUDY: 'CASE_STUDY',
  LINKEDIN_POST: 'LINKEDIN_POST',
  TWITTER_POST: 'TWITTER_POST',
  EMAIL_TEMPLATE: 'EMAIL_TEMPLATE',
  WHITEPAPER: 'WHITEPAPER',
  SOCIAL_STORY: 'SOCIAL_STORY',
  VIDEO_SCRIPT: 'VIDEO_SCRIPT',
  NEWSLETTER: 'NEWSLETTER',
  OTHER: 'OTHER',
} as const;

export const ContentStatus = {
  IDEA: 'IDEA',
  DRAFT: 'DRAFT',
  IN_REVIEW: 'IN_REVIEW',
  APPROVED: 'APPROVED',
  READY: 'READY',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
} as const;

export const ContentChannel = {
  WEB: 'WEB',
  LINKEDIN: 'LINKEDIN',
  INSTAGRAM: 'INSTAGRAM',
  TWITTER: 'TWITTER',
  EMAIL: 'EMAIL',
  GENERIC: 'GENERIC',
} as const;

export const ContentTypeSchema = z.nativeEnum(ContentType);
export type ContentType = z.infer<typeof ContentTypeSchema>;

export const ContentStatusSchema = z.nativeEnum(ContentStatus);
export type ContentStatus = z.infer<typeof ContentStatusSchema>;

export const ContentChannelSchema = z.nativeEnum(ContentChannel);
export type ContentChannel = z.infer<typeof ContentChannelSchema>;

/**
 * Content field structure for marketing assets:
 * - For blog posts: { title, body, excerpt, seo: { metaDescription, keywords } }
 * - For social posts: { body, hashtags, imageUrl?, linkUrl? }
 * - For case studies: { title, challenge, solution, results, testimonial? }
 * - For email templates: { subject, preheader, body, ctaText, ctaUrl }
 * - For video scripts: { hook, body, cta, duration? }
 */
const MarketingContentBaseSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().optional(),
  type: ContentTypeSchema,
  channel: ContentChannelSchema.optional(),
  status: ContentStatusSchema.optional(),
  clientId: z.number().int().positive(),
  projectId: z.number().int().positive().nullable().optional(),
  sourceMeetingId: z.number().int().positive().nullable().optional(),
  sourceContentId: z.number().int().positive().nullable().optional(),
  content: z.unknown().optional(),
  summary: z.string().optional(),
  tags: z.array(z.string()).optional(),
  publishedAt: z.coerce.date().nullable().optional(),
  scheduledFor: z.coerce.date().nullable().optional(),
});

export const CreateMarketingContentSchema = MarketingContentBaseSchema;
export type CreateMarketingContentInput = z.infer<
  typeof CreateMarketingContentSchema
>;

export const UpdateMarketingContentSchema =
  MarketingContentBaseSchema.partial().extend({
    archived: z.boolean().optional(),
  });
export type UpdateMarketingContentInput = z.infer<
  typeof UpdateMarketingContentSchema
>;

export const MarketingContentDTOSchema = MarketingContentBaseSchema.extend({
  id: z.number().int().positive(),
  archived: z.boolean(),
  createdById: z.number().int().positive().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type MarketingContentDTO = z.infer<typeof MarketingContentDTOSchema>;

// Schema for generating content from project/meeting data
export const GenerateContentSchema = z.object({
  type: ContentTypeSchema,
  sourceType: z.enum(['project', 'meeting']),
  sourceId: z.number().int().positive(),
  additionalContext: z.string().optional(),
  tone: z
    .enum(['professional', 'casual', 'technical', 'enthusiastic'])
    .optional(),
  length: z.enum(['short', 'medium', 'long']).optional(),
});
export type GenerateContentInput = z.infer<typeof GenerateContentSchema>;

// Schema for repurposing existing content
export const RepurposeContentSchema = z.object({
  targetType: ContentTypeSchema,
  targetChannel: ContentChannelSchema.optional(),
  additionalContext: z.string().optional(),
  tone: z
    .enum(['professional', 'casual', 'technical', 'enthusiastic'])
    .optional(),
  length: z.enum(['short', 'medium', 'long']).optional(),
});
export type RepurposeContentInput = z.infer<typeof RepurposeContentSchema>;

// Campaign types
export const CampaignStatus = {
  PLANNING: 'PLANNING',
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  COMPLETED: 'COMPLETED',
  ARCHIVED: 'ARCHIVED',
} as const;

export type CampaignStatus =
  (typeof CampaignStatus)[keyof typeof CampaignStatus];

// Brand Profile types
export const BrandAssetType = {
  LOGO: 'LOGO',
  IMAGE: 'IMAGE',
  TEMPLATE: 'TEMPLATE',
  DOCUMENT: 'DOCUMENT',
  VIDEO: 'VIDEO',
  OTHER: 'OTHER',
} as const;

export type BrandAssetType =
  (typeof BrandAssetType)[keyof typeof BrandAssetType];

// Publishing types
export const PublishingPlatform = {
  LINKEDIN: 'LINKEDIN',
  TWITTER: 'TWITTER',
  INSTAGRAM: 'INSTAGRAM',
  FACEBOOK: 'FACEBOOK',
} as const;

export type PublishingPlatform =
  (typeof PublishingPlatform)[keyof typeof PublishingPlatform];
