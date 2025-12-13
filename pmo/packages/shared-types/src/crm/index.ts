/**
 * CRM Types
 *
 * Shared types for CRM entities used across frontend and backend.
 */

// ============================================================================
// Enums
// ============================================================================

/**
 * Account type classification.
 */
export type AccountType =
  | 'PROSPECT'
  | 'CUSTOMER'
  | 'PARTNER'
  | 'COMPETITOR'
  | 'CHURNED'
  | 'OTHER';

/**
 * Employee count range for accounts.
 */
export type EmployeeCount =
  | 'SOLO'
  | 'MICRO'
  | 'SMALL'
  | 'MEDIUM'
  | 'LARGE'
  | 'ENTERPRISE';

/**
 * Opportunity/deal status.
 */
export type OpportunityStatus = 'OPEN' | 'WON' | 'LOST';

/**
 * Pipeline stage type.
 */
export type StageType = 'OPEN' | 'WON' | 'LOST';

/**
 * CRM activity type.
 */
export type ActivityType =
  | 'CALL'
  | 'EMAIL'
  | 'MEETING'
  | 'TASK'
  | 'NOTE'
  | 'SMS'
  | 'LINKEDIN_MESSAGE'
  | 'CHAT'
  | 'DEMO'
  | 'PROPOSAL'
  | 'CONTRACT'
  | 'OTHER';

/**
 * Activity status.
 */
export type ActivityStatus =
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

/**
 * Activity priority level.
 */
export type ActivityPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

/**
 * Contact lifecycle stage.
 */
export type ContactLifecycle =
  | 'LEAD'
  | 'MQL'
  | 'SQL'
  | 'OPPORTUNITY'
  | 'CUSTOMER'
  | 'EVANGELIST'
  | 'CHURNED';

/**
 * Lead source for CRM contacts.
 */
export type CRMLeadSource =
  | 'WEBSITE'
  | 'REFERRAL'
  | 'LINKEDIN'
  | 'OUTBOUND'
  | 'EVENT'
  | 'PARTNER'
  | 'ADVERTISEMENT'
  | 'OTHER';

/**
 * Contact communication preference.
 */
export type CommunicationPreference = 'EMAIL' | 'PHONE' | 'SMS' | 'ANY';

// ============================================================================
// Address Type
// ============================================================================

/**
 * Address structure used for billing and shipping addresses.
 */
export interface Address {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

// ============================================================================
// Account Types
// ============================================================================

/**
 * CRM Account entity (company/organization).
 */
export interface Account {
  id: number;
  tenantId: string;
  name: string;
  website?: string | null;
  phone?: string | null;
  industry?: string | null;
  employeeCount?: EmployeeCount | null;
  annualRevenue?: number | null;
  type: AccountType;
  ownerId?: number | null;
  parentAccountId?: number | null;
  billingAddress?: Address | null;
  shippingAddress?: Address | null;
  timezone?: string | null;
  description?: string | null;
  healthScore: number;
  engagementScore: number;
  churnRisk?: number | null;
  lastActivityAt?: string | null;
  archived: boolean;
  tags: string[];
  customFields?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;

  // Relations (optional, depends on include)
  owner?: User | null;
  parentAccount?: Account | null;
  childAccounts?: Account[];
  contacts?: CRMContact[];
  opportunities?: Opportunity[];
  activities?: CRMActivity[];
}

/**
 * Input for creating an account.
 */
export interface CreateAccountInput {
  name: string;
  website?: string;
  phone?: string;
  parentAccountId?: number;
  type?: AccountType;
  industry?: string;
  employeeCount?: EmployeeCount;
  annualRevenue?: number;
  billingAddress?: Address;
  shippingAddress?: Address;
  tags?: string[];
  customFields?: Record<string, unknown>;
}

/**
 * Input for updating an account.
 */
export interface UpdateAccountInput extends Partial<CreateAccountInput> {
  healthScore?: number;
  engagementScore?: number;
  churnRisk?: number;
  archived?: boolean;
}

/**
 * Filter parameters for listing accounts.
 */
export interface AccountFilters {
  type?: AccountType;
  industry?: string;
  ownerId?: number;
  archived?: boolean;
  healthScoreMin?: number;
  healthScoreMax?: number;
  search?: string;
  tags?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// Opportunity Types
// ============================================================================

/**
 * CRM Opportunity entity (deal/potential revenue).
 */
export interface Opportunity {
  id: number;
  tenantId: string;
  name: string;
  description?: string | null;
  accountId: number;
  pipelineId: number;
  stageId: number;
  ownerId?: number | null;
  amount?: number | null;
  probability: number;
  weightedAmount?: number | null;
  currency: string;
  expectedCloseDate?: string | null;
  actualCloseDate?: string | null;
  status: OpportunityStatus;
  lostReason?: string | null;
  lostReasonDetail?: string | null;
  competitorId?: number | null;
  leadSource?: string | null;
  campaignId?: number | null;
  archived: boolean;
  tags: string[];
  customFields?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;

  // Relations (optional, depends on include)
  account?: Account;
  pipeline?: Pipeline;
  stage?: PipelineStage;
  owner?: User | null;
  contacts?: OpportunityContact[];
  activities?: CRMActivity[];
  stageHistory?: OpportunityStageHistory[];
}

/**
 * Input for creating an opportunity.
 */
export interface CreateOpportunityInput {
  name: string;
  description?: string;
  accountId: number;
  pipelineId?: number;
  stageId: number;
  amount?: number;
  probability?: number;
  currency?: string;
  expectedCloseDate?: Date | string;
  leadSource?: string;
  campaignId?: number;
  tags?: string[];
  customFields?: Record<string, unknown>;
  contactIds?: number[];
}

/**
 * Input for updating an opportunity.
 */
export interface UpdateOpportunityInput
  extends Partial<Omit<CreateOpportunityInput, 'accountId'>> {}

/**
 * Filter parameters for listing opportunities.
 */
export interface OpportunityFilters {
  status?: OpportunityStatus;
  pipelineId?: number;
  stageId?: number;
  accountId?: number;
  ownerId?: number;
  expectedCloseFrom?: Date | string;
  expectedCloseTo?: Date | string;
  amountMin?: number;
  amountMax?: number;
  search?: string;
  tags?: string;
  archived?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Input for marking opportunity as won.
 */
export interface MarkWonInput {
  actualCloseDate?: Date | string;
  amount?: number;
}

/**
 * Input for marking opportunity as lost.
 */
export interface MarkLostInput {
  lostReason?: string;
  lostReasonDetail?: string;
  competitorId?: number;
}

// ============================================================================
// Pipeline Types
// ============================================================================

/**
 * Sales pipeline entity.
 */
export interface Pipeline {
  id: number;
  tenantId: string;
  name: string;
  description?: string | null;
  isDefault: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;

  // Relations
  stages?: PipelineStage[];
  opportunities?: Opportunity[];
}

/**
 * Pipeline stage entity.
 */
export interface PipelineStage {
  id: number;
  pipelineId: number;
  name: string;
  order: number;
  probability: number;
  stageType: StageType;
  color?: string | null;
  rottenDays?: number | null;
  createdAt: string;
  updatedAt: string;

  // Relations
  pipeline?: Pipeline;
  opportunities?: Opportunity[];
}

// ============================================================================
// Contact Types
// ============================================================================

/**
 * CRM Contact entity.
 */
export interface CRMContact {
  id: number;
  tenantId: string;
  accountId?: number | null;
  ownerId?: number | null;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  linkedinUrl?: string | null;
  twitterHandle?: string | null;
  mailingAddress?: Address | null;
  lifecycle: ContactLifecycle;
  leadSource?: CRMLeadSource | null;
  leadScore?: number | null;
  communicationPreference: CommunicationPreference;
  doNotCall: boolean;
  doNotEmail: boolean;
  archived: boolean;
  tags: string[];
  customFields?: Record<string, unknown> | null;
  lastContactedAt?: string | null;
  createdAt: string;
  updatedAt: string;

  // Relations (optional, depends on include)
  account?: Account | null;
  owner?: User | null;
  opportunities?: OpportunityContact[];
  activities?: CRMActivity[];
}

/**
 * Junction table for opportunity contacts with roles.
 */
export interface OpportunityContact {
  opportunityId: number;
  contactId: number;
  role?: string | null;
  isPrimary: boolean;
  createdAt: string;

  // Relations
  opportunity?: Opportunity;
  contact?: CRMContact;
}

// ============================================================================
// Activity Types
// ============================================================================

/**
 * CRM Activity entity (calls, emails, meetings, tasks, notes).
 */
export interface CRMActivity {
  id: number;
  tenantId: string;
  type: ActivityType;
  accountId?: number | null;
  contactId?: number | null;
  opportunityId?: number | null;
  ownerId?: number | null;
  subject?: string | null;
  description?: string | null;
  outcome?: string | null;
  scheduledAt?: string | null;
  completedAt?: string | null;
  dueAt?: string | null;
  duration?: number | null;
  status: ActivityStatus;
  priority: ActivityPriority;
  externalId?: string | null;
  externalSource?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;

  // Relations (optional, depends on include)
  account?: Account | null;
  contact?: CRMContact | null;
  opportunity?: Opportunity | null;
  owner?: User | null;
}

/**
 * Input for creating an activity.
 */
export interface CreateActivityInput {
  type: ActivityType;
  accountId?: number;
  contactId?: number;
  opportunityId?: number;
  subject?: string;
  description?: string;
  outcome?: string;
  scheduledAt?: Date | string;
  dueAt?: Date | string;
  duration?: number;
  status?: ActivityStatus;
  priority?: ActivityPriority;
  externalId?: string;
  externalSource?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Input for updating an activity.
 */
export interface UpdateActivityInput extends Partial<CreateActivityInput> {
  completedAt?: Date | string | null;
  ownerId?: number;
}

/**
 * Filter parameters for listing activities.
 */
export interface ActivityFilters {
  type?: string; // Comma-separated types
  status?: string; // Comma-separated statuses
  priority?: ActivityPriority;
  accountId?: number;
  contactId?: number;
  opportunityId?: number;
  ownerId?: number;
  scheduledFrom?: Date | string;
  scheduledTo?: Date | string;
  dueFrom?: Date | string;
  dueTo?: Date | string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Input for quick logging a call.
 */
export interface LogCallInput {
  accountId: number;
  contactId?: number;
  opportunityId?: number;
  subject?: string;
  description?: string;
  outcome?: string;
  duration?: number;
}

/**
 * Input for quick logging a note.
 */
export interface LogNoteInput {
  accountId: number;
  contactId?: number;
  opportunityId?: number;
  subject?: string;
  description: string;
}

// ============================================================================
// Stage History Types
// ============================================================================

/**
 * Opportunity stage change history entry.
 */
export interface OpportunityStageHistory {
  id: number;
  opportunityId: number;
  stageId: number;
  fromStageId?: number | null;
  changedById?: number | null;
  changedAt: string;
  durationInStage?: number | null;

  // Relations
  opportunity?: Opportunity;
  stage?: PipelineStage;
  fromStage?: PipelineStage | null;
  changedBy?: User | null;
}

// ============================================================================
// User Type (minimal reference)
// ============================================================================

/**
 * User reference type for CRM entities.
 */
export interface User {
  id: number;
  name: string;
  email: string;
}
