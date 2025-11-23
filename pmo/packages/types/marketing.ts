/**
 * Shared types for Marketing Content module
 * Used by both frontend and backend
 */

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

export type ContentType = (typeof ContentType)[keyof typeof ContentType];

export const ContentStatus = {
  IDEA: 'IDEA',
  DRAFT: 'DRAFT',
  IN_REVIEW: 'IN_REVIEW',
  APPROVED: 'APPROVED',
  READY: 'READY',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
} as const;

export type ContentStatus = (typeof ContentStatus)[keyof typeof ContentStatus];

export const ContentChannel = {
  WEB: 'WEB',
  LINKEDIN: 'LINKEDIN',
  INSTAGRAM: 'INSTAGRAM',
  TWITTER: 'TWITTER',
  EMAIL: 'EMAIL',
  GENERIC: 'GENERIC',
} as const;

export type ContentChannel =
  (typeof ContentChannel)[keyof typeof ContentChannel];

export interface MarketingContent {
  id: number;
  name: string;
  slug?: string;
  type: ContentType;
  channel?: ContentChannel;
  status: ContentStatus;
  content?: any;
  summary?: string;
  tags: string[];

  // Relations
  clientId: number;
  projectId?: number;
  sourceMeetingId?: number;
  createdById?: number;
  sourceContentId?: number;

  // Publishing metadata
  publishedAt?: Date;
  scheduledFor?: Date;
  archived: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Populated relations
  client?: {
    id: number;
    name: string;
  };
  project?: {
    id: number;
    name: string;
  };
  sourceMeeting?: {
    id: number;
    title: string;
    date: Date;
  };
  createdBy?: {
    id: number;
    name: string;
    email: string;
  };
  sourceContent?: {
    id: number;
    name: string;
    type: ContentType;
  };
}

export interface CreateMarketingContentInput {
  name: string;
  slug?: string;
  type: ContentType;
  channel?: ContentChannel;
  status?: ContentStatus;
  clientId: number;
  projectId?: number;
  sourceMeetingId?: number;
  sourceContentId?: number;
  content?: any;
  summary?: string;
  tags?: string[];
  publishedAt?: Date;
  scheduledFor?: Date;
}

export interface UpdateMarketingContentInput {
  name?: string;
  slug?: string;
  type?: ContentType;
  channel?: ContentChannel;
  status?: ContentStatus;
  clientId?: number;
  projectId?: number;
  sourceMeetingId?: number;
  sourceContentId?: number;
  content?: any;
  summary?: string;
  tags?: string[];
  publishedAt?: Date;
  scheduledFor?: Date;
  archived?: boolean;
}

export interface GenerateContentInput {
  type: ContentType;
  sourceType: 'project' | 'meeting';
  sourceId: number;
  additionalContext?: string;
  tone?: 'professional' | 'casual' | 'technical' | 'enthusiastic';
  length?: 'short' | 'medium' | 'long';
}

export interface GeneratedContent {
  title?: string;
  body: string;
  summary?: string;
  metadata?: Record<string, any>;
}

export interface MarketingContentListQuery {
  clientId?: number;
  projectId?: number;
  type?: string;
  status?: string;
  search?: string;
  archived?: boolean;
}

// Content type display names
export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  BLOG_POST: 'Blog Post',
  CASE_STUDY: 'Case Study',
  LINKEDIN_POST: 'LinkedIn Post',
  TWITTER_POST: 'Twitter Post',
  EMAIL_TEMPLATE: 'Email Template',
  WHITEPAPER: 'Whitepaper',
  SOCIAL_STORY: 'Social Story',
  VIDEO_SCRIPT: 'Video Script',
  NEWSLETTER: 'Newsletter',
  OTHER: 'Other',
};

// Content status display names
export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  IDEA: 'Idea',
  DRAFT: 'Draft',
  IN_REVIEW: 'In Review',
  APPROVED: 'Approved',
  READY: 'Ready',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived',
};

// Content channel display names
export const CONTENT_CHANNEL_LABELS: Record<ContentChannel, string> = {
  WEB: 'Web',
  LINKEDIN: 'LinkedIn',
  INSTAGRAM: 'Instagram',
  TWITTER: 'Twitter',
  EMAIL: 'Email',
  GENERIC: 'Generic',
};

export interface RepurposeContentInput {
  targetType: ContentType;
  targetChannel?: ContentChannel;
  additionalContext?: string;
  tone?: 'professional' | 'casual' | 'technical' | 'enthusiastic';
  length?: 'short' | 'medium' | 'long';
}

// Helper function to get content type icon
export const getContentTypeIcon = (type: ContentType): string => {
  const icons: Record<ContentType, string> = {
    BLOG_POST: '📝',
    CASE_STUDY: '📊',
    LINKEDIN_POST: '💼',
    TWITTER_POST: '🐦',
    EMAIL_TEMPLATE: '📧',
    WHITEPAPER: '📄',
    SOCIAL_STORY: '📱',
    VIDEO_SCRIPT: '🎥',
    NEWSLETTER: '📰',
    OTHER: '📋',
  };
  return icons[type] || '📋';
};

// Helper function to get default channel for content type
export const getDefaultChannelForType = (type: ContentType): ContentChannel => {
  const channelMap: Record<ContentType, ContentChannel> = {
    BLOG_POST: 'WEB',
    CASE_STUDY: 'WEB',
    LINKEDIN_POST: 'LINKEDIN',
    TWITTER_POST: 'TWITTER',
    EMAIL_TEMPLATE: 'EMAIL',
    WHITEPAPER: 'WEB',
    SOCIAL_STORY: 'INSTAGRAM',
    VIDEO_SCRIPT: 'GENERIC',
    NEWSLETTER: 'EMAIL',
    OTHER: 'GENERIC',
  };
  return channelMap[type] || 'GENERIC';
};
