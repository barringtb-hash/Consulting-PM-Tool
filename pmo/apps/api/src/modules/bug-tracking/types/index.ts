import {
  IssueType,
  IssuePriority,
  IssueStatus,
  IssueSource,
} from '@prisma/client';

// Re-export enums for convenience
export { IssueType, IssuePriority, IssueStatus, IssueSource };

// Input types for creating issues
export interface CreateIssueInput {
  title: string;
  description?: string;
  type?: IssueType;
  priority?: IssuePriority;
  source?: IssueSource;
  assignedToId?: number;
  projectId?: number;
  accountId?: number;
  labelIds?: number[];
  // Error-specific fields
  errorHash?: string;
  stackTrace?: string;
  browserInfo?: Record<string, unknown>;
  requestInfo?: Record<string, unknown>;
  componentStack?: string;
  environment?: string;
  appVersion?: string;
  url?: string;
  module?: string; // Module where error occurred (e.g., chatbot, crm, finance)
  customFields?: Record<string, unknown>;
}

export interface UpdateIssueInput {
  title?: string;
  description?: string;
  type?: IssueType;
  priority?: IssuePriority;
  status?: IssueStatus;
  assignedToId?: number | null;
  projectId?: number | null;
  accountId?: number | null;
  labelIds?: number[];
  customFields?: Record<string, unknown>;
}

// Filter types for listing issues
export interface IssueFilters {
  status?: IssueStatus | IssueStatus[];
  priority?: IssuePriority | IssuePriority[];
  type?: IssueType | IssueType[];
  source?: IssueSource | IssueSource[];
  assignedToId?: number | null;
  reportedById?: number;
  projectId?: number;
  accountId?: number;
  module?: string; // Filter by module
  labelIds?: number[];
  search?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  includeClosed?: boolean; // Include CLOSED and WONT_FIX issues (default: false)
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'priority' | 'status';
  sortOrder?: 'asc' | 'desc';
}

// Label types
export interface CreateLabelInput {
  name: string;
  color: string;
  description?: string;
}

export interface UpdateLabelInput {
  name?: string;
  color?: string;
  description?: string;
}

// Comment types
export interface CreateCommentInput {
  content: string;
  isSystem?: boolean;
}

// Error collection types
export interface ClientErrorInput {
  message: string;
  stack?: string;
  source:
    | 'window.onerror'
    | 'unhandledrejection'
    | 'react-error-boundary'
    | 'manual';
  url: string;
  line?: number;
  column?: number;
  componentStack?: string;
  browserInfo?: {
    userAgent?: string;
    language?: string;
    platform?: string;
    screenSize?: string;
    browser?: string;
    version?: string;
    os?: string;
    device?: string;
  };
  sessionId?: string;
  userId?: number;
  tenantId?: string; // Tenant where error occurred
  module?: string; // Module where error occurred (e.g., chatbot, crm, finance)
  environment?: string;
  appVersion?: string;
}

export interface ServerErrorInput {
  message: string;
  stackTrace?: string;
  source: IssueSource;
  level?: string;
  url?: string;
  method?: string;
  statusCode?: number;
  requestId?: string;
  tenantId?: string; // Tenant where error occurred
  module?: string; // Module where error occurred (e.g., chatbot, crm, finance)
  environment?: string;
  appVersion?: string;
  serverInfo?: {
    hostname?: string;
    region?: string;
    instanceId?: string;
    deploymentId?: string;
    serviceName?: string;
    serviceId?: string;
  };
  rawPayload?: Record<string, unknown>;
}

// AI assistant submission types
export interface AISubmitInput {
  type: IssueType;
  title: string;
  description: string;
  priority?: IssuePriority;
  labels?: string[];
  // User context - automatically sets the reportedBy and optionally assignedTo fields
  reportedById?: number;
  assignedToId?: number;
  // Environment context
  environment?: string;
  browserInfo?: {
    browser?: string;
    version?: string;
    os?: string;
    device?: string;
    screenSize?: string;
    userAgent?: string;
  };
  metadata?: {
    conversationId?: string;
    userId?: number; // @deprecated - use reportedById instead
    context?: string;
    suggestedSolution?: string;
  };
}

// API key types
export interface CreateApiKeyInput {
  name: string;
  permissions: string[];
  expiresAt?: Date;
}

export interface ApiKeyResult {
  id: number;
  name: string;
  keyPrefix: string;
  key: string; // Only returned on creation
  permissions: string[];
  expiresAt: Date | null;
  createdAt: Date;
}

// Statistics types
export interface IssueStats {
  total: number;
  byStatus: Record<IssueStatus, number>;
  byPriority: Record<IssuePriority, number>;
  byType: Record<IssueType, number>;
  bySource: Record<IssueSource, number>;
  openCount: number;
  resolvedToday: number;
  createdToday: number;
  avgResolutionTimeHours: number | null;
}

// Webhook payload types
export interface VercelLogMessage {
  id: string;
  message: string;
  timestamp: number;
  source: 'build' | 'static' | 'lambda' | 'edge';
  projectId: string;
  deploymentId: string;
  host: string;
  path: string;
  statusCode?: number;
  proxy?: {
    timestamp: number;
    method: string;
    scheme: string;
    host: string;
    path: string;
    userAgent: string[];
    referer: string;
    statusCode: number;
    clientIp: string;
    region: string;
  };
}

export interface RenderLogEvent {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  serviceId: string;
  serviceName: string;
  deployId?: string;
  instanceId?: string;
}
