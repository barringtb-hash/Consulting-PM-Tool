import { useState, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import {
  Bug,
  ArrowLeft,
  Edit2,
  Trash2,
  MessageSquare,
  Clock,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  ExternalLink,
  Paperclip,
  Upload,
  Image,
  FileText,
  X,
  MoreHorizontal,
  Tag,
  User,
  Calendar,
  Globe,
  Server,
  Monitor,
  Hash,
  RefreshCw,
} from 'lucide-react';
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Input,
  Modal,
  Select,
} from '../../ui';
import { useToast } from '../../ui/Toast';
import { PageHeader } from '../../ui/PageHeader';
import {
  useIssue,
  useUpdateIssue,
  useDeleteIssue,
  useComments,
  useAddComment,
  useGenerateAIPrompt,
  useAttachments,
  useUploadAttachments,
  useDeleteAttachment,
} from '../../api/hooks/useBugTracking';
import type {
  IssueStatus,
  IssuePriority,
  IssueType,
} from '../../api/bug-tracking';
import { copyToClipboard } from '../../utils/clipboard';

// Status badge configuration with proper Badge variants
const STATUS_CONFIG: Record<
  IssueStatus,
  {
    label: string;
    variant:
      | 'default'
      | 'secondary'
      | 'success'
      | 'destructive'
      | 'warning'
      | 'primary';
  }
> = {
  OPEN: { label: 'Open', variant: 'destructive' },
  TRIAGING: { label: 'Triaging', variant: 'warning' },
  IN_PROGRESS: { label: 'In Progress', variant: 'primary' },
  IN_REVIEW: { label: 'In Review', variant: 'secondary' },
  RESOLVED: { label: 'Resolved', variant: 'success' },
  CLOSED: { label: 'Closed', variant: 'secondary' },
  WONT_FIX: { label: "Won't Fix", variant: 'secondary' },
};

// Priority badge configuration with proper Badge variants
const PRIORITY_CONFIG: Record<
  IssuePriority,
  {
    label: string;
    variant:
      | 'default'
      | 'secondary'
      | 'success'
      | 'destructive'
      | 'warning'
      | 'primary';
  }
> = {
  LOW: { label: 'Low', variant: 'secondary' },
  MEDIUM: { label: 'Medium', variant: 'primary' },
  HIGH: { label: 'High', variant: 'warning' },
  CRITICAL: { label: 'Critical', variant: 'destructive' },
};

// Type configuration with icons
const TYPE_CONFIG: Record<IssueType, { label: string; icon: React.ReactNode }> =
  {
    BUG: { label: 'Bug', icon: <Bug className="h-5 w-5 text-danger-500" /> },
    ISSUE: {
      label: 'Issue',
      icon: <AlertCircle className="h-5 w-5 text-warning-500" />,
    },
    FEATURE_REQUEST: {
      label: 'Feature Request',
      icon: <Sparkles className="h-5 w-5 text-success-500" />,
    },
    IMPROVEMENT: {
      label: 'Improvement',
      icon: <CheckCircle2 className="h-5 w-5 text-primary-500" />,
    },
    TASK: {
      label: 'Task',
      icon: <Clock className="h-5 w-5 text-neutral-500" />,
    },
  };

// Skeleton loader components
function SkeletonLine({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-neutral-200 dark:bg-neutral-700 rounded ${className}`}
    />
  );
}

function SkeletonCard({ children }: { children?: React.ReactNode }) {
  return (
    <Card>
      <CardBody>{children}</CardBody>
    </Card>
  );
}

function IssueDetailSkeleton() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      {/* Header skeleton */}
      <header className="border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
        <div className="container-padding py-6">
          <div className="flex items-center gap-2 mb-3">
            <SkeletonLine className="h-4 w-24" />
            <SkeletonLine className="h-4 w-4" />
            <SkeletonLine className="h-4 w-16" />
          </div>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <SkeletonLine className="h-8 w-8 rounded-full" />
                <SkeletonLine className="h-8 w-96" />
              </div>
              <div className="flex items-center gap-3 mt-3">
                <SkeletonLine className="h-6 w-20 rounded-md" />
                <SkeletonLine className="h-6 w-16 rounded-md" />
                <SkeletonLine className="h-6 w-24 rounded-md" />
              </div>
            </div>
            <div className="flex gap-2">
              <SkeletonLine className="h-10 w-36 rounded-lg" />
              <SkeletonLine className="h-10 w-20 rounded-lg" />
              <SkeletonLine className="h-10 w-10 rounded-lg" />
            </div>
          </div>
        </div>
      </header>

      <div className="page-content space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content skeleton */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description skeleton */}
            <SkeletonCard>
              <SkeletonLine className="h-6 w-32 mb-4" />
              <div className="space-y-2">
                <SkeletonLine className="h-4 w-full" />
                <SkeletonLine className="h-4 w-5/6" />
                <SkeletonLine className="h-4 w-4/6" />
              </div>
            </SkeletonCard>

            {/* Attachments skeleton */}
            <SkeletonCard>
              <SkeletonLine className="h-6 w-40 mb-4" />
              <SkeletonLine className="h-32 w-full rounded-lg" />
            </SkeletonCard>

            {/* Comments skeleton */}
            <SkeletonCard>
              <SkeletonLine className="h-6 w-32 mb-4" />
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="flex gap-3">
                    <SkeletonLine className="h-10 w-10 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <SkeletonLine className="h-4 w-32" />
                      <SkeletonLine className="h-4 w-full" />
                      <SkeletonLine className="h-4 w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            </SkeletonCard>
          </div>

          {/* Sidebar skeleton */}
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i}>
                <SkeletonLine className="h-5 w-24 mb-4" />
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <SkeletonLine className="h-4 w-20" />
                    <SkeletonLine className="h-4 w-24" />
                  </div>
                  <div className="flex justify-between">
                    <SkeletonLine className="h-4 w-16" />
                    <SkeletonLine className="h-4 w-20" />
                  </div>
                </div>
              </SkeletonCard>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function IssueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const issueId = useMemo(() => (id ? Number(id) : 0), [id]);

  const { data: issue, isLoading } = useIssue(issueId);
  const { data: comments } = useComments(issueId);
  const { data: attachments } = useAttachments(issueId);
  const updateIssue = useUpdateIssue();
  const deleteIssue = useDeleteIssue();
  const addComment = useAddComment();
  const generateAIPrompt = useGenerateAIPrompt();
  const uploadAttachments = useUploadAttachments();
  const deleteAttachment = useDeleteAttachment();

  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const promptCopiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [newComment, setNewComment] = useState('');
  const [showAIPromptOptions, setShowAIPromptOptions] = useState(false);
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Clear any existing timeout before setting a new one
  const setPromptCopiedWithTimeout = useCallback(
    (duration: number, closeModal = false) => {
      if (promptCopiedTimeoutRef.current) {
        clearTimeout(promptCopiedTimeoutRef.current);
      }
      setPromptCopied(true);
      promptCopiedTimeoutRef.current = setTimeout(() => {
        setPromptCopied(false);
        if (closeModal) {
          setShowPromptModal(false);
        }
      }, duration);
    },
    [],
  );

  const handleCopyAIPrompt = async (
    mode: 'basic' | 'full' | 'comprehensive',
  ) => {
    try {
      const options = {
        format: 'markdown' as const,
        includeStackTrace: true,
        includeEnvironmentInfo: true,
        includeErrorLogs: mode !== 'basic',
        maxErrorLogs: mode === 'comprehensive' ? 10 : 5,
        includeComments: mode !== 'basic',
        includeSuggestedFiles: true,
        includeAttachments: true,
      };

      const result = await generateAIPrompt.mutateAsync({
        issueId,
        options,
      });

      const copied = await copyToClipboard(result.prompt);
      if (copied) {
        setPromptCopiedWithTimeout(2000);
        setShowAIPromptOptions(false);
      } else {
        // If copy failed, show the prompt in a modal for manual copying
        setGeneratedPrompt(result.prompt);
        setShowPromptModal(true);
        setShowAIPromptOptions(false);
      }
    } catch (error) {
      console.error('Failed to generate AI prompt:', error);
      showToast(
        error instanceof Error
          ? error.message
          : 'Failed to generate AI prompt. Please try again.',
        'error',
      );
    }
  };

  const handleManualCopy = async () => {
    // Try clipboard API one more time (user gesture is fresh now)
    const copied = await copyToClipboard(generatedPrompt);
    if (copied) {
      setPromptCopiedWithTimeout(1500, true);
    } else {
      // Select the text for manual copying
      if (promptTextareaRef.current) {
        promptTextareaRef.current.select();
        promptTextareaRef.current.setSelectionRange(
          0,
          promptTextareaRef.current.value.length,
        );
      }
      showToast(
        'Text selected. Press Ctrl+C (or Cmd+C on Mac) to copy.',
        'info',
      );
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      await addComment.mutateAsync({
        issueId,
        content: newComment,
      });
      setNewComment('');
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const handleDeleteIssue = async () => {
    try {
      await deleteIssue.mutateAsync(issueId);
      navigate('/bug-tracking');
    } catch (error) {
      console.error('Failed to delete issue:', error);
    }
  };

  const handleStatusChange = async (status: IssueStatus) => {
    try {
      await updateIssue.mutateAsync({
        id: issueId,
        input: { status },
      });
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleFileUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    try {
      await uploadAttachments.mutateAsync({
        issueId,
        files: fileArray,
      });
    } catch (error) {
      console.error('Failed to upload files:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload files');
    }
  };

  const handleDeleteAttachment = async (attachmentId: number) => {
    if (!window.confirm('Are you sure you want to delete this attachment?'))
      return;

    try {
      await deleteAttachment.mutateAsync({
        attachmentId,
        issueId,
      });
    } catch (error) {
      console.error('Failed to delete attachment:', error);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (date: string | Date) => {
    return new Date(date).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Loading state with skeleton
  if (isLoading) {
    return <IssueDetailSkeleton />;
  }

  // Not found state
  if (!issue) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center">
        <Card className="max-w-md text-center">
          <CardBody className="py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-700 mx-auto mb-4">
              <Bug className="h-8 w-8 text-neutral-400" />
            </div>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
              Issue Not Found
            </h2>
            <p className="text-neutral-500 dark:text-neutral-400 mb-6">
              The issue you are looking for does not exist or has been deleted.
            </p>
            <Button
              variant="secondary"
              onClick={() => navigate('/bug-tracking')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Issues
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            {TYPE_CONFIG[issue.type]?.icon}
            <span className="truncate">
              <span className="text-neutral-500 dark:text-neutral-400 font-normal">
                #{issue.id}
              </span>{' '}
              {issue.title}
            </span>
          </div>
        }
        breadcrumbs={[
          { label: 'Bug Tracking', href: '/bug-tracking' },
          { label: 'Issues', href: '/bug-tracking' },
          { label: `#${issue.id}` },
        ]}
        description={
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {/* Status badge - prominent */}
            <Badge
              variant={STATUS_CONFIG[issue.status]?.variant || 'default'}
              size="lg"
            >
              {STATUS_CONFIG[issue.status]?.label || issue.status}
            </Badge>
            {/* Priority badge */}
            <Badge
              variant={PRIORITY_CONFIG[issue.priority]?.variant || 'default'}
              size="lg"
            >
              {PRIORITY_CONFIG[issue.priority]?.label || issue.priority}{' '}
              Priority
            </Badge>
            {/* Labels - clean tag display */}
            {issue.labels.length > 0 && (
              <>
                <span className="text-neutral-300 dark:text-neutral-600">
                  |
                </span>
                <div className="flex items-center gap-1.5">
                  <Tag className="h-4 w-4 text-neutral-400" />
                  {issue.labels.map((label) => (
                    <Badge
                      key={label.id}
                      className="border"
                      style={{
                        backgroundColor: `${label.color}15`,
                        borderColor: `${label.color}40`,
                        color: label.color,
                      }}
                    >
                      {label.name}
                    </Badge>
                  ))}
                </div>
              </>
            )}
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            {/* AI Prompt Button - Primary action */}
            <div className="relative">
              <Button
                variant="outline"
                onClick={() => setShowAIPromptOptions(!showAIPromptOptions)}
                disabled={generateAIPrompt.isPending}
              >
                {promptCopied ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2 text-success-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Copy as AI Prompt
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>

              {showAIPromptOptions && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg z-20">
                  <div className="p-2">
                    <button
                      className="w-full text-left px-3 py-2.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-md transition-colors"
                      onClick={() => handleCopyAIPrompt('basic')}
                    >
                      <div className="font-medium text-neutral-900 dark:text-white">
                        Quick Prompt
                      </div>
                      <div className="text-neutral-500 dark:text-neutral-400 text-xs mt-0.5">
                        Issue details + stack trace (minimal context)
                      </div>
                    </button>
                    <button
                      className="w-full text-left px-3 py-2.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-md transition-colors"
                      onClick={() => handleCopyAIPrompt('full')}
                    >
                      <div className="font-medium text-neutral-900 dark:text-white">
                        Full Context
                      </div>
                      <div className="text-neutral-500 dark:text-neutral-400 text-xs mt-0.5">
                        + Comments, 5 error logs, environment info
                      </div>
                    </button>
                    <button
                      className="w-full text-left px-3 py-2.5 text-sm hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-md border-l-2 border-primary-500 transition-colors"
                      onClick={() => handleCopyAIPrompt('comprehensive')}
                    >
                      <div className="font-medium text-primary-600 dark:text-primary-400">
                        Comprehensive (Recommended)
                      </div>
                      <div className="text-neutral-500 dark:text-neutral-400 text-xs mt-0.5">
                        All context + 10 error logs for deep analysis
                      </div>
                    </button>
                    <div className="border-t border-neutral-200 dark:border-neutral-700 my-2" />
                    <div className="px-3 py-2 text-xs text-neutral-500 dark:text-neutral-400">
                      <strong>Tip:</strong> Use{' '}
                      <code className="bg-neutral-100 dark:bg-neutral-700 px-1.5 py-0.5 rounded text-neutral-700 dark:text-neutral-300">
                        /implement-issue {issue.id}
                      </code>{' '}
                      in Claude Code for best results.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Edit button */}
            <Button
              variant="outline"
              onClick={() => navigate(`/bug-tracking/${issue.id}/edit`)}
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </Button>

            {/* More actions dropdown */}
            <div className="relative">
              <Button
                variant="outline"
                onClick={() => setShowActionsDropdown(!showActionsDropdown)}
                aria-label="More actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>

              {showActionsDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg z-20">
                  <div className="p-1">
                    <button
                      className="w-full text-left px-3 py-2 text-sm text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-900/20 rounded-md flex items-center gap-2 transition-colors"
                      onClick={() => {
                        setShowActionsDropdown(false);
                        setShowDeleteConfirm(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Issue
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        }
      />

      {/* Click outside handler for dropdowns */}
      {(showAIPromptOptions || showActionsDropdown) && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => {
            setShowAIPromptOptions(false);
            setShowActionsDropdown(false);
          }}
        />
      )}

      <div className="page-content space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardBody>
                {issue.description ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <p className="whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">
                      {issue.description}
                    </p>
                  </div>
                ) : (
                  <p className="text-neutral-400 dark:text-neutral-500 italic">
                    No description provided
                  </p>
                )}
              </CardBody>
            </Card>

            {/* Stack Trace (if exists) */}
            {issue.stackTrace && (
              <Card>
                <CardHeader>
                  <CardTitle>Stack Trace</CardTitle>
                </CardHeader>
                <CardBody className="p-0">
                  <pre className="bg-neutral-900 text-green-400 p-4 rounded-b-lg overflow-x-auto text-sm font-mono">
                    {issue.stackTrace}
                  </pre>
                </CardBody>
              </Card>
            )}

            {/* Attachments */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Paperclip className="h-5 w-5 text-neutral-400" />
                  Attachments
                  {attachments && attachments.length > 0 && (
                    <Badge variant="secondary" size="sm">
                      {attachments.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardBody>
                {/* Upload Area */}
                <div
                  className={`border-2 border-dashed rounded-lg p-6 mb-4 text-center transition-colors ${
                    isDragging
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-neutral-300 dark:border-neutral-600 hover:border-neutral-400 dark:hover:border-neutral-500'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.txt,.csv,.json"
                    className="hidden"
                    onChange={(e) =>
                      e.target.files && handleFileUpload(e.target.files)
                    }
                  />
                  <Upload className="h-8 w-8 mx-auto text-neutral-400 mb-2" />
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                    Drag & drop screenshots or files here, or{' '}
                    <button
                      type="button"
                      className="text-primary-600 dark:text-primary-400 hover:underline font-medium"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      browse
                    </button>
                  </p>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500">
                    Supported: Images, PDF, TXT, CSV, JSON (max 5MB each)
                  </p>
                  {uploadAttachments.isPending && (
                    <p className="text-sm text-primary-600 dark:text-primary-400 mt-2 flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Uploading...
                    </p>
                  )}
                </div>

                {/* Attachment List */}
                {attachments && attachments.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 flex items-start gap-3 group hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                      >
                        {attachment.mimeType.startsWith('image/') ? (
                          <div className="w-14 h-14 flex-shrink-0 rounded-md overflow-hidden bg-neutral-100 dark:bg-neutral-700">
                            <img
                              src={attachment.url}
                              alt={attachment.filename}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-14 h-14 flex-shrink-0 rounded-md bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center">
                            {attachment.mimeType.includes('pdf') ? (
                              <FileText className="h-7 w-7 text-danger-500" />
                            ) : (
                              <FileText className="h-7 w-7 text-neutral-400" />
                            )}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-sm font-medium text-neutral-900 dark:text-white truncate"
                            title={attachment.filename}
                          >
                            {attachment.filename}
                          </p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                            {formatFileSize(attachment.size)} &middot;{' '}
                            {formatDate(attachment.createdAt)}
                          </p>
                          <div className="flex gap-3 mt-2">
                            {attachment.mimeType.startsWith('image/') && (
                              <a
                                href={attachment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                              >
                                <Image className="h-3 w-3" />
                                View
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteAttachment(attachment.id)
                              }
                              className="text-xs text-danger-600 dark:text-danger-400 hover:underline flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3" />
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-neutral-400 dark:text-neutral-500 text-center py-2 text-sm">
                    No attachments yet. Upload screenshots to provide visual
                    context for AI prompts.
                  </p>
                )}
              </CardBody>
            </Card>

            {/* Comments - Timeline style */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-neutral-400" />
                  Comments
                  {comments && comments.length > 0 && (
                    <Badge variant="secondary" size="sm">
                      {comments.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardBody>
                {/* Comments list - Timeline design */}
                {comments && comments.length > 0 ? (
                  <div className="space-y-0">
                    {comments.map((comment, index) => (
                      <div
                        key={comment.id}
                        className="relative pl-12 pb-6 last:pb-0"
                      >
                        {/* Timeline line */}
                        {index < comments.length - 1 && (
                          <div className="absolute left-5 top-10 bottom-0 w-px bg-neutral-200 dark:bg-neutral-700" />
                        )}
                        {/* Avatar */}
                        <div className="absolute left-0 top-0 h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-sm font-medium text-primary-700 dark:text-primary-300">
                          {comment.user?.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        {/* Content */}
                        <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-4 border border-neutral-200 dark:border-neutral-700">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-neutral-900 dark:text-white">
                              {comment.user?.name || 'System'}
                            </span>
                            {comment.isSystem && (
                              <Badge variant="secondary" size="sm">
                                System
                              </Badge>
                            )}
                            <span className="text-xs text-neutral-500 dark:text-neutral-400">
                              {formatDateTime(comment.createdAt)}
                            </span>
                          </div>
                          <p className="text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap text-sm">
                            {comment.content}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-neutral-400 dark:text-neutral-500 text-center py-6 text-sm">
                    No comments yet. Be the first to comment.
                  </p>
                )}

                {/* Add Comment */}
                <div className="flex gap-3 mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-700">
                  <div className="h-10 w-10 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5 text-neutral-500" />
                  </div>
                  <div className="flex-1 flex gap-2">
                    <Input
                      placeholder="Add a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === 'Enter' && !e.shiftKey && handleAddComment()
                      }
                      className="flex-1"
                    />
                    <Button
                      onClick={handleAddComment}
                      disabled={!newComment.trim() || addComment.isPending}
                    >
                      {addComment.isPending ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        'Comment'
                      )}
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Issue Details - Using dl/dt/dd pattern */}
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardBody>
                <dl className="grid grid-cols-1 gap-4">
                  {/* Status - Editable */}
                  <div>
                    <dt className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
                      Status
                    </dt>
                    <dd>
                      <Select
                        value={issue.status}
                        onChange={(e) =>
                          handleStatusChange(e.target.value as IssueStatus)
                        }
                        className="text-sm"
                      >
                        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                          <option key={key} value={key}>
                            {config.label}
                          </option>
                        ))}
                      </Select>
                    </dd>
                  </div>

                  {/* Type */}
                  <div>
                    <dt className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
                      Type
                    </dt>
                    <dd className="flex items-center gap-2 font-medium text-neutral-900 dark:text-neutral-100">
                      {TYPE_CONFIG[issue.type]?.icon}
                      <span>{TYPE_CONFIG[issue.type]?.label}</span>
                    </dd>
                  </div>

                  {/* Priority */}
                  <div>
                    <dt className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
                      Priority
                    </dt>
                    <dd>
                      <Badge
                        variant={
                          PRIORITY_CONFIG[issue.priority]?.variant || 'default'
                        }
                      >
                        {PRIORITY_CONFIG[issue.priority]?.label}
                      </Badge>
                    </dd>
                  </div>

                  {/* Source */}
                  <div>
                    <dt className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
                      Source
                    </dt>
                    <dd className="font-medium text-neutral-900 dark:text-neutral-100">
                      {issue.source.replace('_', ' ')}
                    </dd>
                  </div>

                  {/* Error Count */}
                  {issue.errorCount > 1 && (
                    <div>
                      <dt className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
                        Error Count
                      </dt>
                      <dd className="font-medium text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                        <Hash className="h-4 w-4 text-neutral-400" />
                        {issue.errorCount}
                      </dd>
                    </div>
                  )}
                </dl>
              </CardBody>
            </Card>

            {/* People */}
            <Card>
              <CardHeader>
                <CardTitle>People</CardTitle>
              </CardHeader>
              <CardBody>
                <dl className="grid grid-cols-1 gap-4">
                  {/* Assignee */}
                  <div>
                    <dt className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
                      Assignee
                    </dt>
                    <dd>
                      {issue.assignedTo ? (
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xs font-medium text-primary-700 dark:text-primary-300">
                            {issue.assignedTo.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-neutral-900 dark:text-neutral-100">
                            {issue.assignedTo.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-neutral-400 dark:text-neutral-500 italic">
                          Unassigned
                        </span>
                      )}
                    </dd>
                  </div>

                  {/* Reporter */}
                  <div>
                    <dt className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
                      Reporter
                    </dt>
                    <dd>
                      {issue.reportedBy ? (
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-xs font-medium text-neutral-700 dark:text-neutral-300">
                            {issue.reportedBy.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-neutral-900 dark:text-neutral-100">
                            {issue.reportedBy.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-neutral-400 dark:text-neutral-500 italic">
                          System
                        </span>
                      )}
                    </dd>
                  </div>
                </dl>
              </CardBody>
            </Card>

            {/* Dates */}
            <Card>
              <CardHeader>
                <CardTitle>Dates</CardTitle>
              </CardHeader>
              <CardBody>
                <dl className="grid grid-cols-1 gap-4">
                  <div>
                    <dt className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
                      Created
                    </dt>
                    <dd className="font-medium text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-neutral-400" />
                      {formatDate(issue.createdAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
                      Updated
                    </dt>
                    <dd className="font-medium text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 text-neutral-400" />
                      {formatDate(issue.updatedAt)}
                    </dd>
                  </div>
                  {issue.resolvedAt && (
                    <div>
                      <dt className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
                        Resolved
                      </dt>
                      <dd className="font-medium text-success-600 dark:text-success-400 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        {formatDate(issue.resolvedAt)}
                      </dd>
                    </div>
                  )}
                </dl>
              </CardBody>
            </Card>

            {/* Links */}
            {(issue.project || issue.account || issue.url) && (
              <Card>
                <CardHeader>
                  <CardTitle>Links</CardTitle>
                </CardHeader>
                <CardBody>
                  <dl className="grid grid-cols-1 gap-4">
                    {issue.project && (
                      <div>
                        <dt className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
                          Project
                        </dt>
                        <dd>
                          <Link
                            to={`/projects/${issue.project.id}`}
                            className="text-primary-600 dark:text-primary-400 hover:underline font-medium flex items-center gap-1"
                          >
                            {issue.project.name}
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </dd>
                      </div>
                    )}
                    {issue.account && (
                      <div>
                        <dt className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
                          Account
                        </dt>
                        <dd>
                          <Link
                            to={`/crm/accounts/${issue.account.id}`}
                            className="text-primary-600 dark:text-primary-400 hover:underline font-medium flex items-center gap-1"
                          >
                            {issue.account.name}
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </dd>
                      </div>
                    )}
                    {issue.url && (
                      <div>
                        <dt className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
                          URL
                        </dt>
                        <dd>
                          <a
                            href={issue.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 dark:text-primary-400 hover:underline font-medium flex items-center gap-1 truncate"
                            title={issue.url}
                          >
                            <Globe className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">
                              {(() => {
                                try {
                                  return new URL(issue.url).pathname;
                                } catch {
                                  return issue.url;
                                }
                              })()}
                            </span>
                            <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                          </a>
                        </dd>
                      </div>
                    )}
                  </dl>
                </CardBody>
              </Card>
            )}

            {/* Environment Info */}
            {(issue.environment || issue.appVersion || issue.browserInfo) && (
              <Card>
                <CardHeader>
                  <CardTitle>Environment</CardTitle>
                </CardHeader>
                <CardBody>
                  <dl className="grid grid-cols-1 gap-4">
                    {issue.environment && (
                      <div>
                        <dt className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
                          Environment
                        </dt>
                        <dd className="font-medium text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                          <Server className="h-4 w-4 text-neutral-400" />
                          {issue.environment}
                        </dd>
                      </div>
                    )}
                    {issue.appVersion && (
                      <div>
                        <dt className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
                          App Version
                        </dt>
                        <dd className="font-medium text-neutral-900 dark:text-neutral-100">
                          <Badge variant="secondary">{issue.appVersion}</Badge>
                        </dd>
                      </div>
                    )}
                    {issue.browserInfo && (
                      <div>
                        <dt className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
                          Browser
                        </dt>
                        <dd className="font-medium text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                          <Monitor className="h-4 w-4 text-neutral-400" />
                          <span className="truncate">
                            {(
                              issue.browserInfo as {
                                browser?: string;
                                version?: string;
                              }
                            )?.browser || 'Unknown'}
                          </span>
                        </dd>
                      </div>
                    )}
                  </dl>
                </CardBody>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Prompt Copy Modal - shown when automatic clipboard fails (Safari) */}
      <Modal
        isOpen={showPromptModal}
        onClose={() => setShowPromptModal(false)}
        title="AI Prompt Generated"
        size="medium"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Click the Copy button below or select all text and copy manually:
          </p>
          <textarea
            ref={promptTextareaRef}
            value={generatedPrompt}
            readOnly
            aria-label="AI generated prompt text"
            className="w-full p-3 text-sm font-mono bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[300px] text-neutral-900 dark:text-neutral-100"
            onClick={(e) => (e.target as HTMLTextAreaElement).select()}
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-700">
            <Button
              variant="secondary"
              onClick={() => setShowPromptModal(false)}
            >
              Close
            </Button>
            <Button onClick={handleManualCopy}>
              {promptCopied ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                'Copy to Clipboard'
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Issue"
        size="small"
      >
        <div className="flex flex-col gap-4">
          <p className="text-neutral-600 dark:text-neutral-400">
            Are you sure you want to delete this issue? This action cannot be
            undone.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowDeleteConfirm(false);
                handleDeleteIssue();
              }}
              disabled={deleteIssue.isPending}
            >
              {deleteIssue.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete Issue
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
