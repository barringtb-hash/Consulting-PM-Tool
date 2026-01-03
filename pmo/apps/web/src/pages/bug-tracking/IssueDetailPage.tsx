import { useState, useRef, useMemo } from 'react';
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
} from 'lucide-react';
import { Button, Badge, Card, Input } from '../../ui';
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

// Status badge colors
const STATUS_CONFIG: Record<
  IssueStatus,
  {
    label: string;
    variant: 'default' | 'secondary' | 'success' | 'destructive' | 'warning';
  }
> = {
  OPEN: { label: 'Open', variant: 'destructive' },
  TRIAGING: { label: 'Triaging', variant: 'warning' },
  IN_PROGRESS: { label: 'In Progress', variant: 'default' },
  IN_REVIEW: { label: 'In Review', variant: 'secondary' },
  RESOLVED: { label: 'Resolved', variant: 'success' },
  CLOSED: { label: 'Closed', variant: 'secondary' },
  WONT_FIX: { label: "Won't Fix", variant: 'secondary' },
};

// Priority badge colors
const PRIORITY_CONFIG: Record<IssuePriority, { label: string; color: string }> =
  {
    LOW: {
      label: 'Low',
      color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    },
    MEDIUM: {
      label: 'Medium',
      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    },
    HIGH: {
      label: 'High',
      color:
        'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
    },
    CRITICAL: {
      label: 'Critical',
      color: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
    },
  };

// Type icons
const TYPE_CONFIG: Record<IssueType, { label: string; icon: React.ReactNode }> =
  {
    BUG: { label: 'Bug', icon: <Bug className="h-5 w-5 text-red-500" /> },
    ISSUE: {
      label: 'Issue',
      icon: <AlertCircle className="h-5 w-5 text-yellow-500" />,
    },
    FEATURE_REQUEST: {
      label: 'Feature Request',
      icon: <Sparkles className="h-5 w-5 text-green-500" />,
    },
    IMPROVEMENT: {
      label: 'Improvement',
      icon: <CheckCircle2 className="h-5 w-5 text-blue-500" />,
    },
    TASK: { label: 'Task', icon: <Clock className="h-5 w-5 text-gray-500" /> },
  };

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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [newComment, setNewComment] = useState('');
  const [showAIPromptOptions, setShowAIPromptOptions] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState('');

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
        setPromptCopied(true);
        setTimeout(() => setPromptCopied(false), 2000);
        setShowAIPromptOptions(false);
      } else {
        // If copy failed, show the prompt in a modal for manual copying
        setGeneratedPrompt(result.prompt);
        setShowPromptModal(true);
        setShowAIPromptOptions(false);
      }
    } catch (error) {
      console.error('Failed to generate AI prompt:', error);
    }
  };

  const handleManualCopy = async () => {
    // Try clipboard API one more time (user gesture is fresh now)
    const copied = await copyToClipboard(generatedPrompt);
    if (copied) {
      setPromptCopied(true);
      setTimeout(() => {
        setPromptCopied(false);
        setShowPromptModal(false);
      }, 1500);
    } else {
      // Select the text for manual copying
      if (promptTextareaRef.current) {
        promptTextareaRef.current.select();
        promptTextareaRef.current.setSelectionRange(
          0,
          promptTextareaRef.current.value.length,
        );
      }
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
    if (!window.confirm('Are you sure you want to delete this issue?')) return;

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500 dark:text-gray-400">
            Loading issue...
          </div>
        </div>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="text-gray-500 dark:text-gray-400">
            Issue not found
          </div>
          <Button variant="outline" onClick={() => navigate('/bug-tracking')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Issues
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            {TYPE_CONFIG[issue.type]?.icon}
            <span>
              #{issue.id} {issue.title}
            </span>
          </div>
        }
        breadcrumbs={[
          { label: 'Bug Tracking', href: '/bug-tracking' },
          { label: 'Issues', href: '/bug-tracking' },
          { label: `#${issue.id}` },
        ]}
        description={
          <div className="flex items-center gap-3 mt-1">
            <Badge variant={STATUS_CONFIG[issue.status]?.variant || 'default'}>
              {STATUS_CONFIG[issue.status]?.label || issue.status}
            </Badge>
            <span
              className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${PRIORITY_CONFIG[issue.priority]?.color}`}
            >
              {PRIORITY_CONFIG[issue.priority]?.label || issue.priority}
            </span>
            {issue.labels.map((label) => (
              <span
                key={label.id}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                style={{
                  backgroundColor: label.color + '20',
                  color: label.color,
                }}
              >
                {label.name}
              </span>
            ))}
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            {/* AI Prompt Button */}
            <div className="relative">
              <Button
                variant="outline"
                onClick={() => setShowAIPromptOptions(!showAIPromptOptions)}
                disabled={generateAIPrompt.isPending}
              >
                {promptCopied ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
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
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-neutral-800 border dark:border-neutral-700 rounded-lg shadow-lg z-10">
                  <div className="p-2">
                    <button
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-neutral-700 rounded"
                      onClick={() => handleCopyAIPrompt('basic')}
                    >
                      <div className="font-medium">Quick Prompt</div>
                      <div className="text-gray-500 dark:text-gray-400 text-xs">
                        Issue details + stack trace (minimal context)
                      </div>
                    </button>
                    <button
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-neutral-700 rounded"
                      onClick={() => handleCopyAIPrompt('full')}
                    >
                      <div className="font-medium">Full Context</div>
                      <div className="text-gray-500 dark:text-gray-400 text-xs">
                        + Comments, 5 error logs, environment info
                      </div>
                    </button>
                    <button
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-neutral-700 rounded border-l-2 border-blue-500"
                      onClick={() => handleCopyAIPrompt('comprehensive')}
                    >
                      <div className="font-medium text-blue-600 dark:text-blue-400">
                        Comprehensive (Recommended)
                      </div>
                      <div className="text-gray-500 dark:text-gray-400 text-xs">
                        All context + 10 error logs for deep analysis
                      </div>
                    </button>
                    <div className="border-t dark:border-neutral-700 my-1" />
                    <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                      <strong>Tip:</strong> Use{' '}
                      <code className="bg-gray-100 dark:bg-neutral-700 px-1 rounded">
                        /implement-issue {issue.id}
                      </code>{' '}
                      in Claude Code for best results.
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Button
              variant="outline"
              onClick={() => navigate(`/bug-tracking/${issue.id}/edit`)}
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button variant="destructive" onClick={handleDeleteIssue}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        }
      />

      <div className="container-padding py-6 space-y-6">
        <div className="grid grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="col-span-2 space-y-6">
            {/* Description */}
            <Card className="p-6">
              <h2 className="text-lg font-medium mb-4 dark:text-white">
                Description
              </h2>
              {issue.description ? (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <p className="whitespace-pre-wrap dark:text-gray-300">
                    {issue.description}
                  </p>
                </div>
              ) : (
                <p className="text-gray-400 dark:text-gray-500 italic">
                  No description provided
                </p>
              )}
            </Card>

            {/* Stack Trace (if exists) */}
            {issue.stackTrace && (
              <Card className="p-6">
                <h2 className="text-lg font-medium mb-4 dark:text-white">
                  Stack Trace
                </h2>
                <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
                  {issue.stackTrace}
                </pre>
              </Card>
            )}

            {/* Attachments */}
            <Card className="p-6">
              <h2 className="text-lg font-medium mb-4 flex items-center gap-2 dark:text-white">
                <Paperclip className="h-5 w-5" />
                Attachments ({attachments?.length || 0})
              </h2>

              {/* Upload Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-6 mb-4 text-center transition-colors ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-neutral-600 hover:border-gray-400 dark:hover:border-neutral-500'
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
                <Upload className="h-8 w-8 mx-auto text-gray-400 dark:text-gray-500 mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Drag & drop screenshots or files here, or{' '}
                  <button
                    type="button"
                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    browse
                  </button>
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Supported: Images, PDF, TXT, CSV, JSON (max 5MB each)
                </p>
                {uploadAttachments.isPending && (
                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                    Uploading...
                  </p>
                )}
              </div>

              {/* Attachment List */}
              {attachments && attachments.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="border dark:border-neutral-700 rounded-lg p-3 flex items-start gap-3 group hover:bg-gray-50 dark:hover:bg-neutral-800"
                    >
                      {attachment.mimeType.startsWith('image/') ? (
                        <div className="w-16 h-16 flex-shrink-0 rounded overflow-hidden bg-gray-100 dark:bg-neutral-700">
                          <img
                            src={attachment.url}
                            alt={attachment.filename}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 flex-shrink-0 rounded bg-gray-100 dark:bg-neutral-700 flex items-center justify-center">
                          {attachment.mimeType.includes('pdf') ? (
                            <FileText className="h-8 w-8 text-red-500" />
                          ) : (
                            <FileText className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                          )}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-medium text-gray-900 dark:text-white truncate"
                          title={attachment.filename}
                        >
                          {attachment.filename}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatFileSize(attachment.size)} •{' '}
                          {new Date(attachment.createdAt).toLocaleDateString()}
                        </p>
                        <div className="flex gap-2 mt-1">
                          {attachment.mimeType.startsWith('image/') && (
                            <a
                              href={attachment.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
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
                            className="text-xs text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
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
                <p className="text-gray-400 dark:text-gray-500 text-center py-2">
                  No attachments yet. Upload screenshots to provide visual
                  context for AI prompts.
                </p>
              )}
            </Card>

            {/* Comments */}
            <Card className="p-6">
              <h2 className="text-lg font-medium mb-4 flex items-center gap-2 dark:text-white">
                <MessageSquare className="h-5 w-5" />
                Comments ({comments?.length || 0})
              </h2>

              <div className="space-y-4">
                {comments?.map((comment) => (
                  <div
                    key={comment.id}
                    className="border-b dark:border-neutral-700 pb-4 last:border-0"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-neutral-700 flex items-center justify-center text-sm font-medium dark:text-white">
                        {comment.user?.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div>
                        <span className="font-medium dark:text-white">
                          {comment.user?.name || 'System'}
                        </span>
                        {comment.isSystem && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            System
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(comment.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap pl-10">
                      {comment.content}
                    </p>
                  </div>
                ))}

                {(!comments || comments.length === 0) && (
                  <p className="text-gray-400 dark:text-gray-500 text-center py-4">
                    No comments yet
                  </p>
                )}

                {/* Add Comment */}
                <div className="flex gap-2 mt-4 pt-4 border-t dark:border-neutral-700">
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
                    {addComment.isPending ? 'Adding...' : 'Comment'}
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Details */}
            <Card className="p-6">
              <h3 className="font-medium mb-4 dark:text-white">Details</h3>
              <div className="space-y-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400">
                    Status
                  </span>
                  <select
                    value={issue.status}
                    onChange={(e) =>
                      handleStatusChange(e.target.value as IssueStatus)
                    }
                    className="border dark:border-neutral-700 rounded px-2 py-1 text-sm bg-white dark:bg-neutral-800 dark:text-white"
                  >
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Type</span>
                  <div className="flex items-center gap-1 dark:text-gray-300">
                    {TYPE_CONFIG[issue.type]?.icon}
                    <span>{TYPE_CONFIG[issue.type]?.label}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400">
                    Priority
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${PRIORITY_CONFIG[issue.priority]?.color}`}
                  >
                    {PRIORITY_CONFIG[issue.priority]?.label}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400">
                    Source
                  </span>
                  <span className="text-gray-700 dark:text-gray-300">
                    {issue.source.replace('_', ' ')}
                  </span>
                </div>

                {issue.errorCount > 1 && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-gray-400">
                      Error Count
                    </span>
                    <span className="text-gray-700 dark:text-gray-300">
                      {issue.errorCount}
                    </span>
                  </div>
                )}
              </div>
            </Card>

            {/* People */}
            <Card className="p-6">
              <h3 className="font-medium mb-4 dark:text-white">People</h3>
              <div className="space-y-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400">
                    Assignee
                  </span>
                  {issue.assignedTo ? (
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-neutral-700 flex items-center justify-center text-xs font-medium dark:text-white">
                        {issue.assignedTo.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="dark:text-gray-300">
                        {issue.assignedTo.name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500">
                      Unassigned
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400">
                    Reporter
                  </span>
                  {issue.reportedBy ? (
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-neutral-700 flex items-center justify-center text-xs font-medium dark:text-white">
                        {issue.reportedBy.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="dark:text-gray-300">
                        {issue.reportedBy.name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500">
                      System
                    </span>
                  )}
                </div>
              </div>
            </Card>

            {/* Dates */}
            <Card className="p-6">
              <h3 className="font-medium mb-4 dark:text-white">Dates</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400">
                    Created
                  </span>
                  <span className="dark:text-gray-300">
                    {new Date(issue.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400">
                    Updated
                  </span>
                  <span className="dark:text-gray-300">
                    {new Date(issue.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                {issue.resolvedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-gray-400">
                      Resolved
                    </span>
                    <span className="dark:text-gray-300">
                      {new Date(issue.resolvedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </Card>

            {/* Links */}
            {(issue.project || issue.account || issue.url) && (
              <Card className="p-6">
                <h3 className="font-medium mb-4 dark:text-white">Links</h3>
                <div className="space-y-3 text-sm">
                  {issue.project && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 dark:text-gray-400">
                        Project
                      </span>
                      <Link
                        to={`/projects/${issue.project.id}`}
                        className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        {issue.project.name}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  )}
                  {issue.account && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 dark:text-gray-400">
                        Account
                      </span>
                      <Link
                        to={`/crm/accounts/${issue.account.id}`}
                        className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        {issue.account.name}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  )}
                  {issue.url && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 dark:text-gray-400">
                        URL
                      </span>
                      <a
                        href={issue.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 truncate max-w-[150px]"
                      >
                        {(() => {
                          try {
                            return new URL(issue.url).pathname;
                          } catch {
                            return issue.url;
                          }
                        })()}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Environment Info */}
            {(issue.environment || issue.appVersion || issue.browserInfo) && (
              <Card className="p-6">
                <h3 className="font-medium mb-4 dark:text-white">
                  Environment
                </h3>
                <div className="space-y-3 text-sm">
                  {issue.environment && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 dark:text-gray-400">
                        Environment
                      </span>
                      <span className="dark:text-gray-300">
                        {issue.environment}
                      </span>
                    </div>
                  )}
                  {issue.appVersion && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 dark:text-gray-400">
                        App Version
                      </span>
                      <span className="dark:text-gray-300">
                        {issue.appVersion}
                      </span>
                    </div>
                  )}
                  {issue.browserInfo && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 dark:text-gray-400">
                        Browser
                      </span>
                      <span className="truncate max-w-[150px] dark:text-gray-300">
                        {(
                          issue.browserInfo as {
                            browser?: string;
                            version?: string;
                          }
                        )?.browser || 'Unknown'}
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Prompt Copy Modal - shown when automatic clipboard fails (Safari) */}
      {showPromptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b dark:border-neutral-700">
              <h3 className="text-lg font-medium dark:text-white">
                AI Prompt Generated
              </h3>
              <button
                onClick={() => setShowPromptModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-hidden flex flex-col">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Click the Copy button below or select all text (⌘A) and copy
                manually (⌘C):
              </p>
              <textarea
                ref={promptTextareaRef}
                value={generatedPrompt}
                readOnly
                className="flex-1 w-full p-3 text-sm font-mono bg-gray-50 dark:bg-neutral-900 border dark:border-neutral-700 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[300px]"
                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
              />
            </div>
            <div className="flex justify-end gap-2 p-4 border-t dark:border-neutral-700">
              <Button
                variant="outline"
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
        </div>
      )}
    </div>
  );
}
