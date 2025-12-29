import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
} from 'lucide-react';
import { Button, Badge, Card, Input } from '../../ui';
import {
  useIssue,
  useUpdateIssue,
  useDeleteIssue,
  useComments,
  useAddComment,
  useGenerateAIPrompt,
} from '../../api/hooks/useBugTracking';
import type {
  IssueStatus,
  IssuePriority,
  IssueType,
} from '../../api/bug-tracking';

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
    LOW: { label: 'Low', color: 'bg-gray-100 text-gray-700' },
    MEDIUM: { label: 'Medium', color: 'bg-blue-100 text-blue-700' },
    HIGH: { label: 'High', color: 'bg-orange-100 text-orange-700' },
    CRITICAL: { label: 'Critical', color: 'bg-red-100 text-red-700' },
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
  const issueId = Number(id);

  const { data: issue, isLoading } = useIssue(issueId);
  const { data: comments } = useComments(issueId);
  const updateIssue = useUpdateIssue();
  const deleteIssue = useDeleteIssue();
  const addComment = useAddComment();
  const generateAIPrompt = useGenerateAIPrompt();

  const [newComment, setNewComment] = useState('');
  const [showAIPromptOptions, setShowAIPromptOptions] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);

  const handleCopyAIPrompt = async (includeComments = false) => {
    try {
      const result = await generateAIPrompt.mutateAsync({
        issueId,
        options: {
          format: 'markdown',
          includeComments,
          includeErrorLogs: true,
        },
      });

      await navigator.clipboard.writeText(result.prompt);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
      setShowAIPromptOptions(false);
    } catch (error) {
      console.error('Failed to generate AI prompt:', error);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading issue...</div>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-gray-500">Issue not found</div>
        <Button variant="outline" onClick={() => navigate('/bug-tracking')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Issues
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/bug-tracking')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              {TYPE_CONFIG[issue.type]?.icon}
              <h1 className="text-2xl font-semibold text-gray-900">
                #{issue.id} {issue.title}
              </h1>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <Badge
                variant={STATUS_CONFIG[issue.status]?.variant || 'default'}
              >
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
          </div>
        </div>

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
              <div className="absolute right-0 mt-2 w-64 bg-white border rounded-lg shadow-lg z-10">
                <div className="p-2">
                  <button
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded"
                    onClick={() => handleCopyAIPrompt(false)}
                  >
                    <div className="font-medium">Basic Prompt</div>
                    <div className="text-gray-500 text-xs">
                      Issue details + stack trace
                    </div>
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded"
                    onClick={() => handleCopyAIPrompt(true)}
                  >
                    <div className="font-medium">Full Context</div>
                    <div className="text-gray-500 text-xs">
                      Include comments + error logs
                    </div>
                  </button>
                  <div className="border-t my-1" />
                  <div className="px-3 py-2 text-xs text-gray-500">
                    Tip:{' '}
                    <code className="bg-gray-100 px-1 rounded">
                      /implement-issue {issue.id}
                    </code>{' '}
                    in Claude Code
                  </div>
                </div>
              </div>
            )}
          </div>

          <Button variant="outline" onClick={() => navigate(`/bug-tracking/${issue.id}/edit`)}>
            <Edit2 className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="destructive" onClick={handleDeleteIssue}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="col-span-2 space-y-6">
          {/* Description */}
          <Card className="p-6">
            <h2 className="text-lg font-medium mb-4">Description</h2>
            {issue.description ? (
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap">{issue.description}</p>
              </div>
            ) : (
              <p className="text-gray-400 italic">No description provided</p>
            )}
          </Card>

          {/* Stack Trace (if exists) */}
          {issue.stackTrace && (
            <Card className="p-6">
              <h2 className="text-lg font-medium mb-4">Stack Trace</h2>
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
                {issue.stackTrace}
              </pre>
            </Card>
          )}

          {/* Comments */}
          <Card className="p-6">
            <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Comments ({comments?.length || 0})
            </h2>

            <div className="space-y-4">
              {comments?.map((comment) => (
                <div key={comment.id} className="border-b pb-4 last:border-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium">
                      {comment.user?.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                      <span className="font-medium">
                        {comment.user?.name || 'System'}
                      </span>
                      {comment.isSystem && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          System
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(comment.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap pl-10">
                    {comment.content}
                  </p>
                </div>
              ))}

              {(!comments || comments.length === 0) && (
                <p className="text-gray-400 text-center py-4">
                  No comments yet
                </p>
              )}

              {/* Add Comment */}
              <div className="flex gap-2 mt-4 pt-4 border-t">
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
            <h3 className="font-medium mb-4">Details</h3>
            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Status</span>
                <select
                  value={issue.status}
                  onChange={(e) =>
                    handleStatusChange(e.target.value as IssueStatus)
                  }
                  className="border rounded px-2 py-1 text-sm"
                >
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-500">Type</span>
                <div className="flex items-center gap-1">
                  {TYPE_CONFIG[issue.type]?.icon}
                  <span>{TYPE_CONFIG[issue.type]?.label}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-500">Priority</span>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${PRIORITY_CONFIG[issue.priority]?.color}`}
                >
                  {PRIORITY_CONFIG[issue.priority]?.label}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-500">Source</span>
                <span className="text-gray-700">
                  {issue.source.replace('_', ' ')}
                </span>
              </div>

              {issue.errorCount > 1 && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Error Count</span>
                  <span className="text-gray-700">{issue.errorCount}</span>
                </div>
              )}
            </div>
          </Card>

          {/* People */}
          <Card className="p-6">
            <h3 className="font-medium mb-4">People</h3>
            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Assignee</span>
                {issue.assignedTo ? (
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
                      {issue.assignedTo.name.charAt(0).toUpperCase()}
                    </div>
                    <span>{issue.assignedTo.name}</span>
                  </div>
                ) : (
                  <span className="text-gray-400">Unassigned</span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-500">Reporter</span>
                {issue.reportedBy ? (
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
                      {issue.reportedBy.name.charAt(0).toUpperCase()}
                    </div>
                    <span>{issue.reportedBy.name}</span>
                  </div>
                ) : (
                  <span className="text-gray-400">System</span>
                )}
              </div>
            </div>
          </Card>

          {/* Dates */}
          <Card className="p-6">
            <h3 className="font-medium mb-4">Dates</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Created</span>
                <span>{new Date(issue.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Updated</span>
                <span>{new Date(issue.updatedAt).toLocaleDateString()}</span>
              </div>
              {issue.resolvedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Resolved</span>
                  <span>
                    {new Date(issue.resolvedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* Links */}
          {(issue.project || issue.account || issue.url) && (
            <Card className="p-6">
              <h3 className="font-medium mb-4">Links</h3>
              <div className="space-y-3 text-sm">
                {issue.project && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Project</span>
                    <Link
                      to={`/projects/${issue.project.id}`}
                      className="text-blue-600 hover:underline flex items-center gap-1"
                    >
                      {issue.project.name}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                )}
                {issue.account && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Account</span>
                    <Link
                      to={`/crm/accounts/${issue.account.id}`}
                      className="text-blue-600 hover:underline flex items-center gap-1"
                    >
                      {issue.account.name}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                )}
                {issue.url && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">URL</span>
                    <a
                      href={issue.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1 truncate max-w-[150px]"
                    >
                      {new URL(issue.url).pathname}
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
              <h3 className="font-medium mb-4">Environment</h3>
              <div className="space-y-3 text-sm">
                {issue.environment && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Environment</span>
                    <span>{issue.environment}</span>
                  </div>
                )}
                {issue.appVersion && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">App Version</span>
                    <span>{issue.appVersion}</span>
                  </div>
                )}
                {issue.browserInfo && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Browser</span>
                    <span className="truncate max-w-[150px]">
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
  );
}
