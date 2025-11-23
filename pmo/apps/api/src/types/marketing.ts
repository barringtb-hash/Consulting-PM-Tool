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
  DRAFT: 'DRAFT',
  IN_REVIEW: 'IN_REVIEW',
  APPROVED: 'APPROVED',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
} as const;

export const ContentTypeSchema = z.nativeEnum(ContentType);
export type ContentType = z.infer<typeof ContentTypeSchema>;

export const ContentStatusSchema = z.nativeEnum(ContentStatus);
export type ContentStatus = z.infer<typeof ContentStatusSchema>;

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
  type: ContentTypeSchema,
  status: ContentStatusSchema.optional(),
  clientId: z.number().int().positive(),
  projectId: z.number().int().positive().nullable().optional(),
  sourceMeetingId: z.number().int().positive().nullable().optional(),
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
