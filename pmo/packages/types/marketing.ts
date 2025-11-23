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
  DRAFT: 'DRAFT',
  IN_REVIEW: 'IN_REVIEW',
  APPROVED: 'APPROVED',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
} as const;

export type ContentStatus = (typeof ContentStatus)[keyof typeof ContentStatus];

export interface MarketingContent {
  id: number;
  name: string;
  type: ContentType;
  status: ContentStatus;
  content?: any;
  summary?: string;
  tags: string[];

  // Relations
  clientId: number;
  projectId?: number;
  sourceMeetingId?: number;
  createdById?: number;

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
}

export interface CreateMarketingContentInput {
  name: string;
  type: ContentType;
  status?: ContentStatus;
  clientId: number;
  projectId?: number;
  sourceMeetingId?: number;
  content?: any;
  summary?: string;
  tags?: string[];
  publishedAt?: Date;
  scheduledFor?: Date;
}

export interface UpdateMarketingContentInput {
  name?: string;
  type?: ContentType;
  status?: ContentStatus;
  clientId?: number;
  projectId?: number;
  sourceMeetingId?: number;
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
  DRAFT: 'Draft',
  IN_REVIEW: 'In Review',
  APPROVED: 'Approved',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived',
};

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
