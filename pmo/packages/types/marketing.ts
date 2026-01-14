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
  clientId: number | null; // Nullable in database schema
  projectId?: number;
  sourceMeetingId?: number;
  createdById?: number;
  sourceContentId?: number;
  campaignId?: number;

  // Publishing metadata
  publishedAt?: Date;
  scheduledFor?: Date;
  publishingConnectionId?: number;
  publishedUrl?: string;
  publishError?: string;
  lastPublishAttempt?: Date;
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
  campaign?: {
    id: number;
    name: string;
    status: string;
  };
  publishingConnection?: {
    id: number;
    platform: string;
    accountName: string;
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
  campaignId?: number;
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
  campaignId?: number;
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

// ========================================
// Campaign Types
// ========================================

export const CampaignStatus = {
  PLANNING: 'PLANNING',
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  COMPLETED: 'COMPLETED',
  ARCHIVED: 'ARCHIVED',
} as const;

export type CampaignStatus =
  (typeof CampaignStatus)[keyof typeof CampaignStatus];

export interface Campaign {
  id: number;
  name: string;
  description?: string;
  goals?: any;
  status: CampaignStatus;
  startDate?: Date;
  endDate?: Date;
  archived: boolean;

  // Relations
  clientId: number;
  projectId?: number;
  createdById?: number;

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
  createdBy?: {
    id: number;
    name: string;
    email: string;
  };
  contents?: MarketingContent[];
  _count?: {
    contents: number;
  };
}

export interface CreateCampaignInput {
  name: string;
  description?: string;
  goals?: any;
  status?: CampaignStatus;
  startDate?: Date;
  endDate?: Date;
  clientId: number;
  projectId?: number;
}

export interface UpdateCampaignInput {
  name?: string;
  description?: string;
  goals?: any;
  status?: CampaignStatus;
  startDate?: Date;
  endDate?: Date;
  projectId?: number;
  archived?: boolean;
}

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  PLANNING: 'Planning',
  ACTIVE: 'Active',
  PAUSED: 'Paused',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived',
};

// ========================================
// Brand Profile Types
// ========================================

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

export interface BrandProfile {
  id: number;
  clientId: number;
  name: string;
  description?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  fonts?: any;
  metadata?: any; // Extended brand data: full color palette, file formats, etc.
  toneVoiceGuidelines?: string;
  valueProposition?: string;
  targetAudience?: string;
  keyMessages: string[];
  archived: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Populated relations
  client?: {
    id: number;
    name: string;
  };
  assets?: BrandAsset[];
}

export interface BrandAsset {
  id: number;
  brandProfileId: number;
  name: string;
  type: BrandAssetType;
  url: string;
  description?: string;
  tags: string[];
  archived: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBrandProfileInput {
  clientId: number;
  name: string;
  description?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  fonts?: any;
  metadata?: any;
  toneVoiceGuidelines?: string;
  valueProposition?: string;
  targetAudience?: string;
  keyMessages?: string[];
}

export interface UpdateBrandProfileInput {
  name?: string;
  description?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  fonts?: any;
  metadata?: any;
  toneVoiceGuidelines?: string;
  valueProposition?: string;
  targetAudience?: string;
  keyMessages?: string[];
  archived?: boolean;
}

export interface CreateBrandAssetInput {
  brandProfileId: number;
  name: string;
  type: BrandAssetType;
  url: string;
  description?: string;
  tags?: string[];
}

export interface UpdateBrandAssetInput {
  name?: string;
  type?: BrandAssetType;
  url?: string;
  description?: string;
  tags?: string[];
  archived?: boolean;
}

export const BRAND_ASSET_TYPE_LABELS: Record<BrandAssetType, string> = {
  LOGO: 'Logo',
  IMAGE: 'Image',
  TEMPLATE: 'Template',
  DOCUMENT: 'Document',
  VIDEO: 'Video',
  OTHER: 'Other',
};

// ========================================
// Publishing Connection Types
// ========================================

export const PublishingPlatform = {
  LINKEDIN: 'LINKEDIN',
  TWITTER: 'TWITTER',
  INSTAGRAM: 'INSTAGRAM',
  FACEBOOK: 'FACEBOOK',
} as const;

export type PublishingPlatform =
  (typeof PublishingPlatform)[keyof typeof PublishingPlatform];

export interface PublishingConnection {
  id: number;
  clientId: number;
  platform: PublishingPlatform;
  accountName: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  isActive: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Populated relations
  client?: {
    id: number;
    name: string;
  };
}

export interface CreatePublishingConnectionInput {
  clientId: number;
  platform: PublishingPlatform;
  accountName: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface UpdatePublishingConnectionInput {
  accountName?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  isActive?: boolean;
}

export const PUBLISHING_PLATFORM_LABELS: Record<PublishingPlatform, string> = {
  LINKEDIN: 'LinkedIn',
  TWITTER: 'Twitter',
  INSTAGRAM: 'Instagram',
  FACEBOOK: 'Facebook',
};

export interface PublishContentInput {
  contentId: number;
  publishingConnectionId?: number;
  scheduledFor?: Date;
}

// ========================================
// Helper Functions
// ========================================

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

// ========================================
// Content Linting Types
// ========================================

export interface ContentLintWarning {
  type: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  match: string;
  position?: number;
}

export interface ContentLintResult {
  isValid: boolean;
  warnings: ContentLintWarning[];
  errors: ContentLintWarning[];
  score: number; // 0-100, higher is better
}

export interface LintContentInput {
  title?: string;
  body: string;
  summary?: string;
}
