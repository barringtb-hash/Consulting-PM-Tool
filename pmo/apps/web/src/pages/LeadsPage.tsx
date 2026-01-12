/**
 * Leads Page with ML Dashboard & Analytics
 *
 * Enhanced Inbound Leads page featuring:
 * - Leads list with filtering, conversion, and CRUD operations
 * - Dashboard with ML insights, conversion predictions, and top priority leads
 * - Analytics with source breakdown, funnel metrics, and performance tracking
 * Features:
 * - Stats cards with icons and colored accents
 * - Professional table layout with hover states
 * - Initials-based colored avatars
 * - Dropdown action menu
 * - Skeleton loading states
 * - Responsive design
 * - Lead conversion modal
 */

import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from 'react';
import {
  Plus,
  Search,
  Mail,
  Building2,
  User,
  X,
  Users,
  UserPlus,
  Target,
  TrendingUp,
  MoreVertical,
  Pencil,
  Trash2,
  ArrowRightCircle,
  UserX,
  List,
  BarChart3,
  Heart,
  Brain,
  CheckCircle,
  AlertTriangle,
  Star,
  Zap,
  Activity,
  PieChart,
  ArrowRight,
} from 'lucide-react';

import {
  LeadSource,
  LeadStatus,
  ServiceInterest,
  InboundLead,
  LeadUpdatePayload,
} from '../api/leads';
import {
  useLeads,
  useCreateLead,
  useUpdateLead,
  useConvertLead,
  useDeleteLead,
} from '../api/queries';
import {
  useTopPriorityLeads,
  useFeatureImportance,
  usePredictionAccuracy,
} from '../api/hooks/lead-ml';
import { buildOptions, ApiError } from '../api/http';
import { buildApiUrl } from '../api/config';
import { useAuth } from '../auth/AuthContext';
import useRedirectOnUnauthorized from '../auth/useRedirectOnUnauthorized';
import { Badge, BadgeVariant } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { Input } from '../ui/Input';
import { PageHeader } from '../ui/PageHeader';
import { Select } from '../ui/Select';
import { useToast } from '../ui/Toast';
import { EMPTY_STATES } from '../utils/typography';
import { useQuery } from '@tanstack/react-query';

// Tab types
type TabType = 'leads' | 'dashboard' | 'analytics';

// Lead Scoring Config type
interface LeadScoringConfig {
  id: number;
  clientId: number;
  hotThreshold: number;
  warmThreshold: number;
  coldThreshold: number;
  isActive: boolean;
  client?: { id: number; name: string };
}

// Fetch lead scoring configs
async function fetchLeadScoringConfigs(): Promise<LeadScoringConfig[]> {
  const res = await fetch(buildApiUrl('/lead-scoring/configs'), buildOptions());
  if (!res.ok) {
    const error = new Error('Failed to fetch lead scoring configs') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.configs || [];
}

interface ConversionFormData {
  opportunityName: string;
  opportunityAmount: string;
  expectedCloseDate: string;
  contactRole: string;
}

interface Filters {
  search: string;
  source: LeadSource | '';
  status: LeadStatus | '';
}

// Avatar color palette based on name/email
const AVATAR_COLORS = [
  {
    bg: 'bg-blue-100 dark:bg-blue-900/50',
    text: 'text-blue-700 dark:text-blue-300',
  },
  {
    bg: 'bg-emerald-100 dark:bg-emerald-900/50',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  {
    bg: 'bg-violet-100 dark:bg-violet-900/50',
    text: 'text-violet-700 dark:text-violet-300',
  },
  {
    bg: 'bg-amber-100 dark:bg-amber-900/50',
    text: 'text-amber-700 dark:text-amber-300',
  },
  {
    bg: 'bg-rose-100 dark:bg-rose-900/50',
    text: 'text-rose-700 dark:text-rose-300',
  },
  {
    bg: 'bg-cyan-100 dark:bg-cyan-900/50',
    text: 'text-cyan-700 dark:text-cyan-300',
  },
  {
    bg: 'bg-orange-100 dark:bg-orange-900/50',
    text: 'text-orange-700 dark:text-orange-300',
  },
  {
    bg: 'bg-indigo-100 dark:bg-indigo-900/50',
    text: 'text-indigo-700 dark:text-indigo-300',
  },
];

function getAvatarColor(name: string): { bg: string; text: string } {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

function getInitials(name: string, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (
        parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
      ).toUpperCase();
    }
    return parts[0].charAt(0).toUpperCase() || '?';
  }
  // Use first two chars of email if no name
  return email ? email.substring(0, 2).toUpperCase() : '?';
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatLeadSource(source: LeadSource): string {
  return source
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

function formatServiceInterest(interest: ServiceInterest): string {
  return interest
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

function getStatusVariant(status: LeadStatus): BadgeVariant {
  switch (status) {
    case 'NEW':
      return 'primary';
    case 'CONTACTED':
      return 'warning';
    case 'QUALIFIED':
      return 'success';
    case 'DISQUALIFIED':
      return 'destructive';
    case 'CONVERTED':
      return 'secondary';
    default:
      return 'default';
  }
}

function formatStatus(status: LeadStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

// Skeleton loader for stats cards
function StatCardSkeleton(): JSX.Element {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
        <div className="flex-1">
          <div className="h-3 w-20 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mb-2" />
          <div className="h-6 w-12 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
        </div>
      </div>
    </Card>
  );
}

// Skeleton loader for table rows
function TableRowSkeleton(): JSX.Element {
  return (
    <tr className="border-b border-neutral-200 dark:border-neutral-700">
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
          <div>
            <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mb-2" />
            <div className="h-3 w-24 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
          </div>
        </div>
      </td>
      <td className="px-4 py-4 hidden sm:table-cell">
        <div className="h-4 w-48 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
      </td>
      <td className="px-4 py-4 hidden md:table-cell">
        <div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
      </td>
      <td className="px-4 py-4">
        <div className="h-8 w-8 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
      </td>
    </tr>
  );
}

// Stats card component with icon
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  iconBg: string;
  iconColor: string;
}

function StatCard({
  icon,
  label,
  value,
  iconBg,
  iconColor,
}: StatCardProps): JSX.Element {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div
          className={`flex items-center justify-center w-10 h-10 rounded-lg ${iconBg}`}
        >
          <div className={iconColor}>{icon}</div>
        </div>
        <div>
          <div className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
            {label}
          </div>
          <div className="text-xl sm:text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            {value}
          </div>
        </div>
      </div>
    </Card>
  );
}

// Lead avatar component
interface LeadAvatarProps {
  name: string;
  email: string;
  size?: 'sm' | 'md' | 'lg';
}

function LeadAvatar({
  name,
  email,
  size = 'md',
}: LeadAvatarProps): JSX.Element {
  const initials = getInitials(name, email);
  const colors = getAvatarColor(name || email);

  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
  };

  return (
    <div
      className={`flex items-center justify-center rounded-full font-semibold ${sizeClasses[size]} ${colors.bg} ${colors.text}`}
    >
      {initials}
    </div>
  );
}

// Dropdown menu component
interface ActionMenuProps {
  onEdit: () => void;
  onConvert?: () => void;
  onDelete: () => void;
  showConvert?: boolean;
}

function ActionMenu({
  onEdit,
  onConvert,
  onDelete,
  showConvert,
}: ActionMenuProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menu on Escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-2 rounded-lg text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-700 transition-colors"
        aria-label="Open actions menu"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 py-1 z-20">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
              onEdit();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
          >
            <Pencil className="h-4 w-4" />
            View Details
          </button>
          {showConvert && onConvert && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                onConvert();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
            >
              <ArrowRightCircle className="h-4 w-4" />
              Convert
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
              onDelete();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// Empty state component
function EmptyState({
  hasFilters,
  onAddLead,
}: {
  hasFilters: boolean;
  onAddLead: () => void;
}): JSX.Element {
  return (
    <Card className="p-12">
      <div className="flex flex-col items-center text-center max-w-md mx-auto">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 mb-4">
          {hasFilters ? (
            <Search className="h-8 w-8 text-neutral-400 dark:text-neutral-500" />
          ) : (
            <UserX className="h-8 w-8 text-neutral-400 dark:text-neutral-500" />
          )}
        </div>
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
          {hasFilters ? 'No matching leads' : 'No leads yet'}
        </h3>
        <p className="text-neutral-500 dark:text-neutral-400 mb-6">
          {hasFilters
            ? 'Try adjusting your search or filter criteria to find what you are looking for.'
            : EMPTY_STATES.noLeads +
              ' Get started by adding your first lead to capture inbound interest.'}
        </p>
        {!hasFilters && (
          <Button onClick={onAddLead}>
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Lead
          </Button>
        )}
      </div>
    </Card>
  );
}

interface LeadDetailPanelProps {
  lead: InboundLead;
  onClose: () => void;
  onUpdate: (leadId: number, updates: LeadUpdatePayload) => Promise<void>;
  onConvert: (leadId: number) => void;
  onDelete: (leadId: number) => Promise<void>;
}

// Memoized LeadDetailPanel to prevent unnecessary re-renders
const LeadDetailPanel = memo(function LeadDetailPanel({
  lead,
  onClose,
  onUpdate,
  onConvert,
  onDelete,
}: LeadDetailPanelProps) {
  const [status, setStatus] = useState(lead.status);

  // Sync local status state when lead prop changes (e.g., after refresh or external update)
  useEffect(() => {
    setStatus(lead.status);
  }, [lead.status]);

  const handleStatusChange = useCallback(
    async (newStatus: LeadStatus) => {
      const previousStatus = status;
      setStatus(newStatus);
      try {
        await onUpdate(lead.id, { status: newStatus });
      } catch {
        setStatus(previousStatus); // Rollback on failure
      }
    },
    [lead.id, onUpdate, status],
  );

  const handleConvert = useCallback(() => {
    onConvert(lead.id);
  }, [lead.id, onConvert]);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      await onDelete(lead.id);
      onClose();
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [lead.id, onDelete, onClose]);

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-neutral-800 shadow-xl border-l border-neutral-200 dark:border-neutral-700 overflow-y-auto z-50">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            Lead Details
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            aria-label="Close panel"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Status
            </label>
            <Select
              value={status}
              onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
            >
              <option value="NEW">New</option>
              <option value="CONTACTED">Contacted</option>
              <option value="QUALIFIED">Qualified</option>
              <option value="DISQUALIFIED">Disqualified</option>
              <option value="CONVERTED">Converted</option>
            </Select>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Contact Information
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <User
                  size={16}
                  className="text-neutral-400 dark:text-neutral-500"
                />
                <span className="text-neutral-900 dark:text-neutral-100">
                  {lead.name || 'No name'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Mail
                  size={16}
                  className="text-neutral-400 dark:text-neutral-500"
                />
                <a
                  href={`mailto:${lead.email}`}
                  className="text-primary-600 hover:underline"
                >
                  {lead.email}
                </a>
              </div>
              {lead.company && (
                <div className="flex items-center gap-2">
                  <Building2
                    size={16}
                    className="text-neutral-400 dark:text-neutral-500"
                  />
                  <span className="text-neutral-900 dark:text-neutral-100">
                    {lead.company}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Lead Details */}
          <div>
            <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Lead Details
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-neutral-500 dark:text-neutral-400">
                  Source:{' '}
                </span>
                <span className="font-medium text-neutral-900 dark:text-neutral-100">
                  {formatLeadSource(lead.source)}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 dark:text-neutral-400">
                  Interest:{' '}
                </span>
                <span className="font-medium text-neutral-900 dark:text-neutral-100">
                  {formatServiceInterest(lead.serviceInterest)}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 dark:text-neutral-400">
                  Created:{' '}
                </span>
                <span className="text-neutral-900 dark:text-neutral-100">
                  {formatDate(lead.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Message */}
          {lead.message && (
            <div>
              <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Message
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-700/50 p-3 rounded-lg">
                {lead.message}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2 pt-4 border-t border-neutral-200 dark:border-neutral-700">
            {lead.status !== 'CONVERTED' && lead.status !== 'DISQUALIFIED' && (
              <Button onClick={handleConvert} className="w-full">
                <ArrowRightCircle className="h-4 w-4 mr-2" />
                Convert to Opportunity
              </Button>
            )}
            {!showDeleteConfirm ? (
              <Button
                onClick={() => setShowDeleteConfirm(true)}
                variant="subtle"
                className="w-full text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Lead
              </Button>
            ) : (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg space-y-2">
                <p className="text-sm text-red-700 dark:text-red-300">
                  Are you sure you want to delete this lead?
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    variant="subtle"
                    className="flex-1 bg-red-600 text-white hover:bg-red-700"
                  >
                    {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                  </Button>
                  <Button
                    onClick={() => setShowDeleteConfirm(false)}
                    variant="subtle"
                    className="flex-1"
                    disabled={isDeleting}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

LeadDetailPanel.displayName = 'LeadDetailPanel';

// ============== DASHBOARD TAB ==============

interface DashboardTabProps {
  leads: InboundLead[];
  configId?: number;
}

function DashboardTab({ leads, configId }: DashboardTabProps): JSX.Element {
  // ML hooks - only fetch if we have a config
  const topLeadsQuery = useTopPriorityLeads(configId || 0, 5);
  const featureImportanceQuery = useFeatureImportance(configId || 0);
  const accuracyQuery = usePredictionAccuracy(configId || 0);

  const hasMLData = configId && configId > 0;

  // Calculate lead pipeline stats from leads data
  const pipelineStats = useMemo(() => {
    const newCount = leads.filter((l) => l.status === 'NEW').length;
    const contactedCount = leads.filter((l) => l.status === 'CONTACTED').length;
    const qualifiedCount = leads.filter((l) => l.status === 'QUALIFIED').length;
    const convertedCount = leads.filter((l) => l.status === 'CONVERTED').length;
    const disqualifiedCount = leads.filter(
      (l) => l.status === 'DISQUALIFIED',
    ).length;

    const conversionRate =
      leads.length > 0 ? (convertedCount / leads.length) * 100 : 0;

    return {
      newCount,
      contactedCount,
      qualifiedCount,
      convertedCount,
      disqualifiedCount,
      total: leads.length,
      conversionRate,
    };
  }, [leads]);

  // Get feature importance data
  const featureImportance = featureImportanceQuery.data;
  const topFeatures = useMemo(() => {
    if (
      !featureImportance?.importance ||
      featureImportance.importance.length === 0
    )
      return [];
    return featureImportance.importance
      .slice(0, 5)
      .map((f: { name: string; importance: number }) => ({
        name: f.name.replace(/([A-Z])/g, ' $1').trim(),
        weight: Math.round(f.importance * 100),
      }));
  }, [featureImportance]);

  return (
    <div className="space-y-6">
      {/* Pipeline Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-neutral-500 dark:text-neutral-400">
                Pipeline Health
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white mt-1">
                {pipelineStats.total}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                {pipelineStats.conversionRate.toFixed(1)}% conversion rate
              </p>
            </div>
            <div className="p-2 sm:p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30 shrink-0">
              <Target className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-neutral-500 dark:text-neutral-400">
                New Leads
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {pipelineStats.newCount}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Awaiting contact
              </p>
            </div>
            <div className="p-2 sm:p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 shrink-0">
              <UserPlus className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-neutral-500 dark:text-neutral-400">
                In Progress
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                {pipelineStats.contactedCount + pipelineStats.qualifiedCount}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Being nurtured
              </p>
            </div>
            <div className="p-2 sm:p-3 rounded-xl bg-amber-100 dark:bg-amber-900/30 shrink-0">
              <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-neutral-500 dark:text-neutral-400">
                Converted
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-violet-600 dark:text-violet-400 mt-1">
                {pipelineStats.convertedCount}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Successfully closed
              </p>
            </div>
            <div className="p-2 sm:p-3 rounded-xl bg-violet-100 dark:bg-violet-900/30 shrink-0">
              <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-violet-600 dark:text-violet-400" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ML Insights Panel */}
        <div className="lg:col-span-2 space-y-6">
          {hasMLData ? (
            <>
              {/* Top Priority Leads */}
              <Card>
                <CardHeader className="flex justify-between items-center">
                  <h3 className="font-semibold flex items-center gap-2 text-neutral-900 dark:text-white">
                    <Star className="w-5 h-5 text-amber-500" /> Top Priority
                    Leads
                  </h3>
                  <Badge variant="secondary">ML Ranked</Badge>
                </CardHeader>
                <CardBody>
                  {topLeadsQuery.isLoading ? (
                    <div className="animate-pulse space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-16 bg-neutral-200 dark:bg-neutral-700 rounded"
                        />
                      ))}
                    </div>
                  ) : topLeadsQuery.data?.leads?.length ? (
                    <div className="space-y-3">
                      {topLeadsQuery.data.leads.map(
                        (lead: Record<string, unknown>, index: number) => (
                          <div
                            key={lead.id as number}
                            className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-bold text-sm">
                                  {index + 1}
                                </div>
                                <div>
                                  <p className="font-medium text-neutral-900 dark:text-white">
                                    {(lead.name as string) ||
                                      (lead.email as string)}
                                  </p>
                                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                    {lead.company as string}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="flex items-center gap-2">
                                  <Zap className="w-4 h-4 text-green-500" />
                                  <span className="font-medium text-green-600 dark:text-green-400">
                                    {Math.round(
                                      ((lead.conversionProbability as number) ||
                                        0) * 100,
                                    )}
                                    %
                                  </span>
                                </div>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                  Conversion prob.
                                </p>
                              </div>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                      <Brain className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>No ML predictions available yet</p>
                      <p className="text-sm mt-1">
                        Run bulk predictions to see top leads
                      </p>
                    </div>
                  )}
                </CardBody>
              </Card>

              {/* Feature Importance */}
              {topFeatures.length > 0 && (
                <Card>
                  <CardHeader>
                    <h3 className="font-semibold flex items-center gap-2 text-neutral-900 dark:text-white">
                      <Brain className="w-5 h-5 text-violet-500" /> Feature
                      Importance
                    </h3>
                  </CardHeader>
                  <CardBody>
                    <div className="space-y-3">
                      {topFeatures.map((feature) => (
                        <div key={feature.name}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-neutral-700 dark:text-neutral-300">
                              {feature.name}
                            </span>
                            <span className="font-medium text-neutral-900 dark:text-white">
                              {feature.weight}%
                            </span>
                          </div>
                          <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-violet-500 rounded-full"
                              style={{ width: `${feature.weight}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardBody>
                </Card>
              )}
            </>
          ) : (
            <Card className="p-6">
              <div className="text-center py-8">
                <Brain className="w-12 h-12 mx-auto mb-4 text-neutral-400 dark:text-neutral-500" />
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
                  ML Insights Available
                </h3>
                <p className="text-neutral-500 dark:text-neutral-400 mb-4">
                  Set up Lead Scoring to unlock ML-powered predictions,
                  conversion probability, and priority ranking.
                </p>
                <Button variant="outline">
                  <Zap className="h-4 w-4 mr-2" />
                  Configure Lead Scoring
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* Quick Stats & Actions */}
        <div className="space-y-6">
          {/* Model Accuracy */}
          {hasMLData && accuracyQuery.data && (
            <Card className="p-6">
              <h3 className="font-semibold flex items-center gap-2 text-neutral-900 dark:text-white mb-4">
                <Target className="w-5 h-5 text-blue-500" /> Model Accuracy
              </h3>
              <div className="space-y-3">
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {Math.round((accuracyQuery.data.accuracy || 0) * 100)}%
                  </p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Prediction Accuracy
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-center p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                    <p className="text-lg font-bold text-neutral-900 dark:text-white">
                      {accuracyQuery.data.totalPredictions || 0}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Predictions
                    </p>
                  </div>
                  <div className="text-center p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                    <p className="text-lg font-bold text-neutral-900 dark:text-white">
                      {accuracyQuery.data.validatedCount || 0}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Validated
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Pipeline Funnel */}
          <Card className="p-6">
            <h3 className="font-semibold flex items-center gap-2 text-neutral-900 dark:text-white mb-4">
              <PieChart className="w-5 h-5 text-indigo-500" /> Lead Funnel
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded">
                <span className="text-sm font-medium">New</span>
                <Badge variant="success">{pipelineStats.newCount}</Badge>
              </div>
              <div className="flex justify-center">
                <ArrowRight className="w-4 h-4 text-neutral-400 rotate-90" />
              </div>
              <div className="flex items-center justify-between p-2 bg-amber-50 dark:bg-amber-900/20 rounded">
                <span className="text-sm font-medium">Contacted</span>
                <Badge variant="warning">{pipelineStats.contactedCount}</Badge>
              </div>
              <div className="flex justify-center">
                <ArrowRight className="w-4 h-4 text-neutral-400 rotate-90" />
              </div>
              <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                <span className="text-sm font-medium">Qualified</span>
                <Badge variant="primary">{pipelineStats.qualifiedCount}</Badge>
              </div>
              <div className="flex justify-center">
                <ArrowRight className="w-4 h-4 text-neutral-400 rotate-90" />
              </div>
              <div className="flex items-center justify-between p-2 bg-violet-50 dark:bg-violet-900/20 rounded">
                <span className="text-sm font-medium">Converted</span>
                <Badge variant="secondary">
                  {pipelineStats.convertedCount}
                </Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ============== ANALYTICS TAB ==============

interface AnalyticsTabProps {
  leads: InboundLead[];
}

function AnalyticsTab({ leads }: AnalyticsTabProps): JSX.Element {
  // Calculate analytics from leads data
  const analytics = useMemo(() => {
    // Source breakdown
    const sourceBreakdown = leads.reduce(
      (acc, lead) => {
        const source = lead.source || 'OTHER';
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Status breakdown
    const statusBreakdown = leads.reduce(
      (acc, lead) => {
        const status = lead.status || 'NEW';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Service interest breakdown
    const interestBreakdown = leads.reduce(
      (acc, lead) => {
        const interest = lead.serviceInterest || 'NOT_SURE';
        acc[interest] = (acc[interest] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Conversion metrics
    const converted = statusBreakdown['CONVERTED'] || 0;
    const disqualified = statusBreakdown['DISQUALIFIED'] || 0;
    const conversionRate =
      leads.length > 0 ? (converted / leads.length) * 100 : 0;
    const disqualificationRate =
      leads.length > 0 ? (disqualified / leads.length) * 100 : 0;

    return {
      sourceBreakdown,
      statusBreakdown,
      interestBreakdown,
      converted,
      disqualified,
      conversionRate,
      disqualificationRate,
      total: leads.length,
    };
  }, [leads]);

  const sourceColors: Record<string, string> = {
    WEBSITE_CONTACT: 'bg-blue-500',
    WEBSITE_DOWNLOAD: 'bg-indigo-500',
    REFERRAL: 'bg-green-500',
    LINKEDIN: 'bg-sky-500',
    OUTBOUND: 'bg-orange-500',
    EVENT: 'bg-purple-500',
    OTHER: 'bg-neutral-500',
  };

  const formatSourceLabel = (source: string): string => {
    return source
      .split('_')
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  };

  const formatInterestLabel = (interest: string): string => {
    return interest
      .split('_')
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Total Leads
              </p>
              <p className="text-3xl font-bold text-neutral-900 dark:text-white mt-1">
                {analytics.total}
              </p>
            </div>
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Conversion Rate
              </p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">
                {analytics.conversionRate.toFixed(1)}%
              </p>
            </div>
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
              <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
            {analytics.converted} converted
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Active Leads
              </p>
              <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                {analytics.total - analytics.converted - analytics.disqualified}
              </p>
            </div>
            <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/30">
              <Activity className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
            In pipeline
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Disqualified
              </p>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-1">
                {analytics.disqualified}
              </p>
            </div>
            <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
            {analytics.disqualificationRate.toFixed(1)}% rate
          </p>
        </Card>
      </div>

      {/* Source Distribution */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold flex items-center gap-2">
            <BarChart3 className="w-5 h-5" /> Lead Source Distribution
          </h3>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            {Object.entries(analytics.sourceBreakdown)
              .sort((a, b) => b[1] - a[1])
              .map(([source, count]) => {
                const percentage =
                  analytics.total > 0 ? (count / analytics.total) * 100 : 0;
                return (
                  <div key={source}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="flex items-center gap-2">
                        <div
                          className={`w-3 h-3 rounded-full ${sourceColors[source] || 'bg-neutral-500'}`}
                        />
                        {formatSourceLabel(source)}
                      </span>
                      <span className="font-medium">
                        {count} ({percentage.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${sourceColors[source] || 'bg-neutral-500'} rounded-full`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </CardBody>
      </Card>

      {/* Status & Interest Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Breakdown */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold flex items-center gap-2">
              <PieChart className="w-5 h-5" /> Status Breakdown
            </h3>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(analytics.statusBreakdown).map(
                ([status, count]) => {
                  const colors: Record<string, string> = {
                    NEW: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
                    CONTACTED:
                      'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
                    QUALIFIED:
                      'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
                    CONVERTED:
                      'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400',
                    DISQUALIFIED:
                      'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
                  };
                  return (
                    <div
                      key={status}
                      className={`text-center p-4 rounded-lg ${colors[status] || 'bg-neutral-50 dark:bg-neutral-800'}`}
                    >
                      <p className="text-2xl font-bold">{count}</p>
                      <p className="text-sm">
                        {status.charAt(0) + status.slice(1).toLowerCase()}
                      </p>
                    </div>
                  );
                },
              )}
            </div>
          </CardBody>
        </Card>

        {/* Service Interest Breakdown */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold flex items-center gap-2">
              <Heart className="w-5 h-5" /> Service Interest
            </h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              {Object.entries(analytics.interestBreakdown)
                .sort((a, b) => b[1] - a[1])
                .map(([interest, count]) => {
                  const percentage =
                    analytics.total > 0 ? (count / analytics.total) * 100 : 0;
                  return (
                    <div
                      key={interest}
                      className="flex items-center justify-between p-2 bg-neutral-50 dark:bg-neutral-800 rounded"
                    >
                      <span className="text-sm font-medium">
                        {formatInterestLabel(interest)}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-neutral-500 dark:text-neutral-400">
                          {percentage.toFixed(0)}%
                        </span>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

// ============== MAIN PAGE ==============

export function LeadsPage(): JSX.Element {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('leads');
  const [selectedLead, setSelectedLead] = useState<InboundLead | null>(null);
  const [showNewLeadForm, setShowNewLeadForm] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    source: '',
    status: '',
  });

  const [newLead, setNewLead] = useState({
    name: '',
    email: '',
    company: '',
    source: 'OTHER' as LeadSource,
    serviceInterest: 'NOT_SURE' as ServiceInterest,
    message: '',
  });

  // Conversion modal state
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [conversionForm, setConversionForm] = useState<ConversionFormData>({
    opportunityName: '',
    opportunityAmount: '',
    expectedCloseDate: '',
    contactRole: '',
  });

  // Fetch lead scoring configs for ML features
  const configsQuery = useQuery({
    queryKey: ['lead-scoring-configs'],
    queryFn: fetchLeadScoringConfigs,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get first active config for ML features
  const activeConfigId = useMemo(() => {
    const configs = configsQuery.data || [];
    const activeConfig = configs.find((c) => c.isActive) || configs[0];
    return activeConfig?.id;
  }, [configsQuery.data]);

  const filterParams = useMemo(
    () => ({
      search: filters.search || undefined,
      source: filters.source || undefined,
      status: filters.status || undefined,
    }),
    [filters],
  );

  const leadsQuery = useLeads(filterParams);
  const createLead = useCreateLead();
  const updateLead = useUpdateLead(selectedLead?.id || 0);
  const convertLead = useConvertLead(selectedLead?.id || 0);
  const deleteLead = useDeleteLead();

  useRedirectOnUnauthorized(leadsQuery.error);

  // Tab configuration
  const tabs = [
    { id: 'leads' as const, label: 'Leads', icon: List },
    { id: 'dashboard' as const, label: 'Dashboard', icon: Heart },
    { id: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
  ];

  const leads = useMemo(() => leadsQuery.data ?? [], [leadsQuery.data]);

  const stats = useMemo(() => {
    const newLeads = leads.filter((l) => l.status === 'NEW').length;
    const contacted = leads.filter((l) => l.status === 'CONTACTED').length;
    const qualified = leads.filter((l) => l.status === 'QUALIFIED').length;
    return { newLeads, contacted, qualified, total: leads.length };
  }, [leads]);

  const hasFilters = Boolean(
    filters.search || filters.source || filters.status,
  );

  // Wrap handlers with useCallback to prevent unnecessary re-renders
  const handleCreateLead = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newLead.email.trim()) return;

      try {
        await createLead.mutateAsync(newLead);
        setNewLead({
          name: '',
          email: '',
          company: '',
          source: 'OTHER',
          serviceInterest: 'NOT_SURE',
          message: '',
        });
        setShowNewLeadForm(false);
        showToast('Lead created successfully', 'success');
      } catch {
        showToast('Failed to create lead', 'error');
      }
    },
    [newLead, createLead, showToast],
  );

  const handleUpdateLead = useCallback(
    async (_leadId: number, updates: LeadUpdatePayload) => {
      try {
        await updateLead.mutateAsync(updates);
        showToast('Lead updated successfully', 'success');
      } catch {
        showToast('Failed to update lead', 'error');
      }
    },
    [updateLead, showToast],
  );

  // Open conversion modal with pre-filled data from selected lead
  const handleOpenConversionModal = useCallback(() => {
    if (selectedLead) {
      const defaultName = `${selectedLead.company || selectedLead.email} - ${selectedLead.serviceInterest?.replace('_', ' ') || 'Opportunity'}`;
      // Default to 30 days from now
      const defaultCloseDate = new Date();
      defaultCloseDate.setDate(defaultCloseDate.getDate() + 30);

      setConversionForm({
        opportunityName: defaultName,
        opportunityAmount: '',
        expectedCloseDate: defaultCloseDate.toISOString().split('T')[0],
        contactRole: '',
      });
      setShowConversionModal(true);
    }
  }, [selectedLead]);

  // Open conversion modal for a specific lead (from table action)
  const handleOpenConversionModalForLead = useCallback((lead: InboundLead) => {
    setSelectedLead(lead);
    const defaultName = `${lead.company || lead.email} - ${lead.serviceInterest?.replace('_', ' ') || 'Opportunity'}`;
    const defaultCloseDate = new Date();
    defaultCloseDate.setDate(defaultCloseDate.getDate() + 30);

    setConversionForm({
      opportunityName: defaultName,
      opportunityAmount: '',
      expectedCloseDate: defaultCloseDate.toISOString().split('T')[0],
      contactRole: '',
    });
    setShowConversionModal(true);
  }, []);

  // Submit the conversion with form data
  const handleConvertLead = useCallback(async () => {
    try {
      // Use the lead's existing owner or fall back to current user
      const ownerId =
        selectedLead?.ownerUserId ??
        (user?.id ? parseInt(user.id, 10) : undefined);

      const result = await convertLead.mutateAsync({
        createOpportunity: true,
        opportunityName: conversionForm.opportunityName || undefined,
        opportunityAmount: conversionForm.opportunityAmount
          ? parseFloat(conversionForm.opportunityAmount)
          : undefined,
        expectedCloseDate: conversionForm.expectedCloseDate
          ? new Date(conversionForm.expectedCloseDate).toISOString()
          : undefined,
        contactRole: conversionForm.contactRole || undefined,
        ownerId,
      });
      setShowConversionModal(false);
      setSelectedLead(null);
      showToast(
        `Lead converted successfully! Created Account${result.opportunityId ? ' and Opportunity' : ''}.`,
        'success',
      );
    } catch {
      showToast('Failed to convert lead', 'error');
    }
  }, [
    convertLead,
    conversionForm,
    showToast,
    selectedLead?.ownerUserId,
    user?.id,
  ]);

  const handleDeleteLead = useCallback(
    async (leadId: number) => {
      try {
        await deleteLead.mutateAsync(leadId);
        showToast('Lead deleted successfully', 'success');
      } catch {
        showToast('Failed to delete lead', 'error');
      }
    },
    [deleteLead, showToast],
  );

  const handleDeleteLeadWithConfirm = useCallback(
    async (leadId: number) => {
      if (!confirm('Are you sure you want to delete this lead?')) return;
      await handleDeleteLead(leadId);
    },
    [handleDeleteLead],
  );

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <PageHeader
        title="Inbound Leads"
        description="Capture leads, track pipeline health, and analyze conversion performance"
        action={
          <Button onClick={() => setShowNewLeadForm(!showNewLeadForm)}>
            <Plus className="h-4 w-4 mr-2" />
            New Lead
          </Button>
        }
      />

      <div className="page-content space-y-6">
        {/* Stats Cards (visible on Leads tab) */}
        {activeTab === 'leads' && (
          <>
            {leadsQuery.isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  icon={<Users className="h-5 w-5" />}
                  label="Total Leads"
                  value={stats.total}
                  iconBg="bg-blue-100 dark:bg-blue-900/50"
                  iconColor="text-blue-600 dark:text-blue-400"
                />
                <StatCard
                  icon={<UserPlus className="h-5 w-5" />}
                  label="New"
                  value={stats.newLeads}
                  iconBg="bg-emerald-100 dark:bg-emerald-900/50"
                  iconColor="text-emerald-600 dark:text-emerald-400"
                />
                <StatCard
                  icon={<TrendingUp className="h-5 w-5" />}
                  label="Contacted"
                  value={stats.contacted}
                  iconBg="bg-amber-100 dark:bg-amber-900/50"
                  iconColor="text-amber-600 dark:text-amber-400"
                />
                <StatCard
                  icon={<Target className="h-5 w-5" />}
                  label="Qualified"
                  value={stats.qualified}
                  iconBg="bg-violet-100 dark:bg-violet-900/50"
                  iconColor="text-violet-600 dark:text-violet-400"
                />
              </div>
            )}
          </>
        )}

        {/* Tab Navigation */}
        <div className="border-b border-neutral-200 dark:border-neutral-700">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300 dark:text-neutral-400 dark:hover:text-neutral-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'leads' && (
          <>
            {/* New Lead Form */}
            {showNewLeadForm && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                  New Lead
                </h2>
                <form onSubmit={handleCreateLead} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Name"
                      type="text"
                      placeholder="Lead's name"
                      value={newLead.name}
                      onChange={(e) =>
                        setNewLead((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                    />
                    <Input
                      label="Email *"
                      type="email"
                      placeholder="email@example.com"
                      value={newLead.email}
                      onChange={(e) =>
                        setNewLead((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      required
                    />
                    <Input
                      label="Company"
                      type="text"
                      placeholder="Company name"
                      value={newLead.company}
                      onChange={(e) =>
                        setNewLead((prev) => ({
                          ...prev,
                          company: e.target.value,
                        }))
                      }
                    />
                    <Select
                      label="Source"
                      value={newLead.source}
                      onChange={(e) =>
                        setNewLead((prev) => ({
                          ...prev,
                          source: e.target.value as LeadSource,
                        }))
                      }
                    >
                      <option value="WEBSITE_CONTACT">Website Contact</option>
                      <option value="WEBSITE_DOWNLOAD">Website Download</option>
                      <option value="REFERRAL">Referral</option>
                      <option value="LINKEDIN">LinkedIn</option>
                      <option value="OUTBOUND">Outbound</option>
                      <option value="EVENT">Event</option>
                      <option value="OTHER">Other</option>
                    </Select>
                    <Select
                      label="Service Interest"
                      value={newLead.serviceInterest}
                      onChange={(e) =>
                        setNewLead((prev) => ({
                          ...prev,
                          serviceInterest: e.target.value as ServiceInterest,
                        }))
                      }
                      className="md:col-span-2"
                    >
                      <option value="STRATEGY">Strategy</option>
                      <option value="POC">POC</option>
                      <option value="IMPLEMENTATION">Implementation</option>
                      <option value="TRAINING">Training</option>
                      <option value="PMO_ADVISORY">PMO Advisory</option>
                      <option value="NOT_SURE">Not Sure</option>
                    </Select>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        Message
                      </label>
                      <textarea
                        className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-neutral-800 dark:text-neutral-100"
                        rows={3}
                        placeholder="Any additional information..."
                        value={newLead.message}
                        onChange={(e) =>
                          setNewLead((prev) => ({
                            ...prev,
                            message: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button type="submit" disabled={createLead.isPending}>
                      {createLead.isPending ? 'Creating...' : 'Create Lead'}
                    </Button>
                    <Button
                      type="button"
                      variant="subtle"
                      onClick={() => setShowNewLeadForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {/* Filters */}
            <Card className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 dark:text-neutral-500" />
                  <Input
                    type="text"
                    placeholder="Search by name, email, or company..."
                    value={filters.search}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        search: e.target.value,
                      }))
                    }
                    className="pl-10"
                  />
                </div>
                <Select
                  value={filters.source}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      source: e.target.value as LeadSource | '',
                    }))
                  }
                  className="w-full sm:w-44"
                >
                  <option value="">All Sources</option>
                  <option value="WEBSITE_CONTACT">Website Contact</option>
                  <option value="WEBSITE_DOWNLOAD">Website Download</option>
                  <option value="REFERRAL">Referral</option>
                  <option value="LINKEDIN">LinkedIn</option>
                  <option value="OUTBOUND">Outbound</option>
                  <option value="EVENT">Event</option>
                  <option value="OTHER">Other</option>
                </Select>
                <Select
                  value={filters.status}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      status: e.target.value as LeadStatus | '',
                    }))
                  }
                  className="w-full sm:w-36"
                >
                  <option value="">All Statuses</option>
                  <option value="NEW">New</option>
                  <option value="CONTACTED">Contacted</option>
                  <option value="QUALIFIED">Qualified</option>
                  <option value="DISQUALIFIED">Disqualified</option>
                  <option value="CONVERTED">Converted</option>
                </Select>
              </div>
            </Card>

            {/* Leads Table */}
            {leadsQuery.isLoading ? (
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                          Lead
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
                          Email
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hidden md:table-cell">
                          Source
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...Array(5)].map((_, i) => (
                        <TableRowSkeleton key={i} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            ) : leads.length === 0 ? (
              <EmptyState
                hasFilters={hasFilters}
                onAddLead={() => setShowNewLeadForm(true)}
              />
            ) : (
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                          Lead
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
                          Email
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hidden md:table-cell">
                          Source
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                      {leads.map((lead) => (
                        <tr
                          key={lead.id}
                          onClick={() => setSelectedLead(lead)}
                          className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors group"
                        >
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <LeadAvatar
                                name={lead.name || ''}
                                email={lead.email}
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-neutral-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                    {lead.name || lead.email}
                                  </span>
                                  <Badge
                                    variant={getStatusVariant(lead.status)}
                                    size="sm"
                                  >
                                    {formatStatus(lead.status)}
                                  </Badge>
                                </div>
                                <div className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                                  {lead.company && (
                                    <span className="inline-flex items-center gap-1">
                                      <Building2 className="h-3 w-3 inline" />
                                      {lead.company}
                                    </span>
                                  )}
                                  {!lead.company && lead.serviceInterest && (
                                    <span>
                                      {formatServiceInterest(
                                        lead.serviceInterest,
                                      )}
                                    </span>
                                  )}
                                  {!lead.company && !lead.serviceInterest && (
                                    <span className="text-neutral-400 dark:text-neutral-500">
                                      No company info
                                    </span>
                                  )}
                                </div>
                                {/* Show email on mobile */}
                                {lead.email && lead.name && (
                                  <div className="sm:hidden text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-1 mt-1">
                                    <Mail className="h-3 w-3" />
                                    <span className="truncate">
                                      {lead.email}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 hidden sm:table-cell">
                            {lead.email ? (
                              <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                                <Mail className="h-4 w-4 text-neutral-400" />
                                <span className="truncate max-w-[200px]">
                                  {lead.email}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-neutral-400 dark:text-neutral-500">
                                -
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-4 hidden md:table-cell">
                            <span className="text-sm text-neutral-600 dark:text-neutral-300">
                              {formatLeadSource(lead.source)}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <ActionMenu
                              onEdit={() => setSelectedLead(lead)}
                              onConvert={() =>
                                handleOpenConversionModalForLead(lead)
                              }
                              onDelete={() =>
                                handleDeleteLeadWithConfirm(lead.id)
                              }
                              showConvert={
                                lead.status !== 'CONVERTED' &&
                                lead.status !== 'DISQUALIFIED'
                              }
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Results count footer */}
                <div className="px-4 py-3 bg-neutral-50 dark:bg-neutral-800/30 border-t border-neutral-200 dark:border-neutral-700">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Showing{' '}
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">
                      {leads.length}
                    </span>{' '}
                    lead{leads.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </Card>
            )}
          </>
        )}

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <DashboardTab leads={leads} configId={activeConfigId} />
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && <AnalyticsTab leads={leads} />}
      </div>

      {/* Lead Detail Panel */}
      {selectedLead && !showConversionModal && (
        <LeadDetailPanel
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdate={handleUpdateLead}
          onConvert={handleOpenConversionModal}
          onDelete={handleDeleteLead}
        />
      )}

      {/* Conversion Modal */}
      {showConversionModal && selectedLead && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowConversionModal(false)}
          />

          {/* Modal */}
          <Card className="relative z-10 w-full max-w-lg mx-4 p-6 bg-white dark:bg-neutral-800 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
                Convert Lead to Opportunity
              </h2>
              <button
                onClick={() => setShowConversionModal(false)}
                className="p-1 rounded-lg text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Lead Info Summary */}
              <div className="p-3 bg-neutral-50 dark:bg-neutral-700 rounded-lg">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Converting lead:
                </p>
                <p className="font-medium text-neutral-900 dark:text-white">
                  {selectedLead.name || selectedLead.email}
                </p>
                {selectedLead.company && (
                  <p className="text-sm text-neutral-600 dark:text-neutral-300">
                    {selectedLead.company}
                  </p>
                )}
              </div>

              {/* Opportunity Name */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Opportunity Name
                </label>
                <Input
                  value={conversionForm.opportunityName}
                  onChange={(e) =>
                    setConversionForm((prev) => ({
                      ...prev,
                      opportunityName: e.target.value,
                    }))
                  }
                  placeholder="Enter opportunity name"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Deal Value ($)
                </label>
                <Input
                  type="number"
                  value={conversionForm.opportunityAmount}
                  onChange={(e) =>
                    setConversionForm((prev) => ({
                      ...prev,
                      opportunityAmount: e.target.value,
                    }))
                  }
                  placeholder="Enter deal value"
                  min="0"
                  step="100"
                />
              </div>

              {/* Expected Close Date */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Expected Close Date
                </label>
                <Input
                  type="date"
                  value={conversionForm.expectedCloseDate}
                  onChange={(e) =>
                    setConversionForm((prev) => ({
                      ...prev,
                      expectedCloseDate: e.target.value,
                    }))
                  }
                />
              </div>

              {/* Contact Role */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Contact Role
                </label>
                <Input
                  value={conversionForm.contactRole}
                  onChange={(e) =>
                    setConversionForm((prev) => ({
                      ...prev,
                      contactRole: e.target.value,
                    }))
                  }
                  placeholder="e.g., Decision Maker, Champion, Influencer"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-700">
              <Button
                variant="secondary"
                onClick={() => setShowConversionModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConvertLead}
                disabled={convertLead.isPending}
              >
                {convertLead.isPending ? 'Converting...' : 'Convert Lead'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default LeadsPage;
