/**
 * AI Project Assistant Page
 *
 * Chat-based interface for AI-powered project management assistance.
 * Features:
 * - Natural language project queries
 * - AI Status Summaries
 * - Health Predictions
 * - Smart Reminders
 * - Auto-Scheduling
 * - Document Generation
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router';
import {
  Sparkles,
  Send,
  Bot,
  User,
  RefreshCw,
  FileText,
  Calendar,
  Bell,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronRight,
  X,
  Download,
  Loader2,
} from 'lucide-react';
import { PageHeader } from '../../ui/PageHeader';
import { Button } from '../../ui/Button';
import { Card, CardBody, CardHeader } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { Badge } from '../../ui/Badge';
import { useToast } from '../../ui/Toast';
import { useProjects } from '../../api/hooks/projects';
import {
  useSendAssistantMessage,
  useAIStatus,
  useHealthPrediction,
  useSmartReminders,
  useDismissReminder,
  useGenerateSchedule,
  useApplySchedule,
  useDocumentTemplates,
  useGenerateDocument,
  type AssistantMessage,
  type SuggestedAction,
  type SmartReminder,
  type ScheduleResult,
} from '../../api/hooks/ai-projects';

// ============================================================================
// Types
// ============================================================================

interface ChatMessage extends AssistantMessage {
  isLoading?: boolean;
}

// ============================================================================
// Helper Components
// ============================================================================

function MessageBubble({
  message,
  onActionClick,
}: {
  message: ChatMessage;
  onActionClick: (action: SuggestedAction) => void;
}): JSX.Element {
  const isUser = message.role === 'user';

  return (
    <div
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} mb-4`}
    >
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser
            ? 'bg-primary-100 text-primary-600'
            : 'bg-neutral-100 text-neutral-600'
        }`}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>
      <div className={`max-w-[80%] ${isUser ? 'text-right' : 'text-left'}`}>
        <div
          className={`inline-block px-4 py-2 rounded-lg ${
            isUser
              ? 'bg-primary-600 text-white'
              : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100'
          }`}
        >
          {message.isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Thinking...</span>
            </div>
          ) : (
            <div className="whitespace-pre-wrap">{message.content}</div>
          )}
        </div>
        {message.suggestedActions && message.suggestedActions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {message.suggestedActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => onActionClick(action)}
                className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 rounded-full hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
              >
                <ChevronRight className="w-3 h-3" />
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ReminderCard({
  reminder,
  onDismiss,
}: {
  reminder: SmartReminder;
  onDismiss: () => void;
}): JSX.Element {
  const priorityColors = {
    urgent: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    medium:
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  };

  return (
    <div className="flex items-start gap-3 p-3 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
      <Bell className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm truncate">{reminder.title}</span>
          <span
            className={`px-2 py-0.5 text-xs rounded-full ${priorityColors[reminder.priority]}`}
          >
            {reminder.priority}
          </span>
        </div>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {reminder.message}
        </p>
        <div className="flex items-center gap-2 mt-2 text-xs text-neutral-500">
          <Clock className="w-3 h-3" />
          {new Date(reminder.triggerTime).toLocaleString()}
        </div>
      </div>
      <button
        onClick={onDismiss}
        className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
        title="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function HealthScoreIndicator({
  score,
  status,
}: {
  score: number;
  status: string;
}): JSX.Element {
  const getColor = () => {
    if (status === 'healthy' || score >= 70) return 'text-green-500';
    if (status === 'at-risk' || score >= 40) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getIcon = () => {
    if (status === 'healthy' || score >= 70)
      return <CheckCircle className="w-5 h-5" />;
    if (status === 'at-risk' || score >= 40)
      return <AlertTriangle className="w-5 h-5" />;
    return <AlertTriangle className="w-5 h-5" />;
  };

  return (
    <div className={`flex items-center gap-2 ${getColor()}`}>
      {getIcon()}
      <span className="text-2xl font-bold">{score}</span>
      <span className="text-sm text-neutral-500">/ 100</span>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

function ProjectAssistantPage(): JSX.Element {
  const [searchParams] = useSearchParams();
  const initialProjectId = searchParams.get('projectId');

  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    initialProjectId ? parseInt(initialProjectId, 10) : null,
  );
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "Hi! I'm your AI Project Assistant. I can help you with:\n\n• Project status and health summaries\n• Task management and scheduling\n• Risk analysis and recommendations\n• Document generation\n\nSelect a project or ask me anything about your projects!",
      timestamp: new Date(),
      suggestedActions: [
        {
          label: 'Show project status',
          action: 'query',
          payload: { query: 'What is the project status?' },
        },
        {
          label: 'View overdue tasks',
          action: 'query',
          payload: { query: 'Show overdue tasks' },
        },
        {
          label: 'Get health prediction',
          action: 'query',
          payload: { query: 'Predict project health' },
        },
      ],
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [activeTab, setActiveTab] = useState<
    'chat' | 'status' | 'schedule' | 'documents'
  >('chat');
  const [generatedSchedule, setGeneratedSchedule] =
    useState<ScheduleResult | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  // Queries
  const projectsQuery = useProjects();
  const aiStatusQuery = useAIStatus(selectedProjectId || undefined);
  const healthPredictionQuery = useHealthPrediction(
    selectedProjectId || undefined,
  );
  const remindersQuery = useSmartReminders(selectedProjectId || undefined);
  const templatesQuery = useDocumentTemplates();

  // Mutations
  const sendMessageMutation = useSendAssistantMessage();
  const dismissReminderMutation = useDismissReminder();
  const generateScheduleMutation = useGenerateSchedule();
  const applyScheduleMutation = useApplySchedule();
  const generateDocumentMutation = useGenerateDocument();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle sending messages
  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
      };

      const loadingMessage: ChatMessage = {
        id: `loading-${Date.now()}`,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isLoading: true,
      };

      setMessages((prev) => [...prev, userMessage, loadingMessage]);
      setInputValue('');

      try {
        const response = await sendMessageMutation.mutateAsync({
          projectId: selectedProjectId || undefined,
          message: content.trim(),
        });

        setMessages((prev) => {
          const filtered = prev.filter((m) => !m.isLoading);
          return [
            ...filtered,
            {
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              content: response.content,
              timestamp: new Date(),
              suggestedActions: response.suggestedActions,
              metadata: response.metadata,
            },
          ];
        });
      } catch (_error) {
        setMessages((prev) => {
          const filtered = prev.filter((m) => !m.isLoading);
          return [
            ...filtered,
            {
              id: `error-${Date.now()}`,
              role: 'assistant',
              content:
                'Sorry, I encountered an error processing your request. Please try again.',
              timestamp: new Date(),
            },
          ];
        });
        showToast('Failed to send message', 'error');
      }
    },
    [selectedProjectId, sendMessageMutation, showToast],
  );

  // Handle suggested action clicks
  const handleActionClick = useCallback(
    (action: SuggestedAction) => {
      if (action.action === 'query' && action.payload?.query) {
        handleSendMessage(action.payload.query as string);
      } else if (action.action === 'navigate' && action.payload?.path) {
        window.location.href = action.payload.path as string;
      }
    },
    [handleSendMessage],
  );

  // Handle reminder dismissal
  const handleDismissReminder = useCallback(
    async (reminderId: number) => {
      try {
        await dismissReminderMutation.mutateAsync(reminderId);
        showToast('Reminder dismissed', 'success');
      } catch {
        showToast('Failed to dismiss reminder', 'error');
      }
    },
    [dismissReminderMutation, showToast],
  );

  // Handle schedule generation
  const handleGenerateSchedule = useCallback(async () => {
    if (!selectedProjectId) {
      showToast('Please select a project first', 'warning');
      return;
    }

    try {
      const schedule =
        await generateScheduleMutation.mutateAsync(selectedProjectId);
      setGeneratedSchedule(schedule);
      showToast('Schedule generated successfully', 'success');
    } catch {
      showToast('Failed to generate schedule', 'error');
    }
  }, [selectedProjectId, generateScheduleMutation, showToast]);

  // Handle schedule application
  const handleApplySchedule = useCallback(async () => {
    if (!selectedProjectId || !generatedSchedule) return;

    try {
      await applyScheduleMutation.mutateAsync({
        projectId: selectedProjectId,
        schedule: generatedSchedule,
      });
      showToast('Schedule applied to tasks', 'success');
      setGeneratedSchedule(null);
    } catch {
      showToast('Failed to apply schedule', 'error');
    }
  }, [selectedProjectId, generatedSchedule, applyScheduleMutation, showToast]);

  // Handle document generation
  const handleGenerateDocument = useCallback(
    async (templateId: string) => {
      if (!selectedProjectId) {
        showToast('Please select a project first', 'warning');
        return;
      }

      try {
        const doc = await generateDocumentMutation.mutateAsync({
          projectId: selectedProjectId,
          templateId,
        });
        showToast(`${doc.title} generated successfully`, 'success');
      } catch {
        showToast('Failed to generate document', 'error');
      }
    },
    [selectedProjectId, generateDocumentMutation, showToast],
  );

  // Form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };

  const projects = projectsQuery.data || [];
  const reminders = (remindersQuery.data || []).filter((r) => !r.dismissed);

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title="AI Project Assistant"
        subtitle="Your intelligent project management companion"
        icon={Sparkles}
        actions={
          <Select
            value={selectedProjectId?.toString() || ''}
            onChange={(e) =>
              setSelectedProjectId(
                e.target.value ? parseInt(e.target.value, 10) : null,
              )
            }
            className="w-64"
          >
            <option value="">All Projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </Select>
        }
      />

      <div className="flex-1 overflow-hidden">
        <div className="h-full flex">
          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {/* Tabs */}
            <div className="border-b border-neutral-200 dark:border-neutral-700 px-6">
              <nav className="flex gap-6">
                {[
                  { id: 'chat', label: 'Chat', icon: Bot },
                  { id: 'status', label: 'AI Status', icon: TrendingUp },
                  { id: 'schedule', label: 'Auto-Schedule', icon: Calendar },
                  { id: 'documents', label: 'Documents', icon: FileText },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id as typeof activeTab)}
                    className={`flex items-center gap-2 py-3 border-b-2 transition-colors ${
                      activeTab === id
                        ? 'border-primary-600 text-primary-600'
                        : 'border-transparent text-neutral-500 hover:text-neutral-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
              {activeTab === 'chat' && (
                <div className="h-full flex flex-col">
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-6">
                    {messages.map((message) => (
                      <MessageBubble
                        key={message.id}
                        message={message}
                        onActionClick={handleActionClick}
                      />
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  <div className="border-t border-neutral-200 dark:border-neutral-700 p-4">
                    <form onSubmit={handleSubmit} className="flex gap-3">
                      <Input
                        ref={inputRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Ask about your projects..."
                        className="flex-1"
                        disabled={sendMessageMutation.isPending}
                      />
                      <Button
                        type="submit"
                        disabled={
                          !inputValue.trim() || sendMessageMutation.isPending
                        }
                      >
                        {sendMessageMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </form>
                  </div>
                </div>
              )}

              {activeTab === 'status' && (
                <div className="p-6 overflow-y-auto">
                  {!selectedProjectId ? (
                    <div className="text-center py-12 text-neutral-500">
                      Select a project to view AI status analysis
                    </div>
                  ) : aiStatusQuery.isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                    </div>
                  ) : aiStatusQuery.data ? (
                    <div className="space-y-6">
                      {/* Health Score */}
                      <Card>
                        <CardHeader>
                          <h3 className="font-semibold">Project Health</h3>
                        </CardHeader>
                        <CardBody>
                          <div className="flex items-center justify-between">
                            <HealthScoreIndicator
                              score={aiStatusQuery.data.healthScore}
                              status={aiStatusQuery.data.healthStatus}
                            />
                            <Badge
                              variant={
                                aiStatusQuery.data.healthStatus === 'healthy'
                                  ? 'success'
                                  : aiStatusQuery.data.healthStatus ===
                                      'at-risk'
                                    ? 'warning'
                                    : 'secondary'
                              }
                            >
                              {aiStatusQuery.data.healthStatus}
                            </Badge>
                          </div>
                        </CardBody>
                      </Card>

                      {/* Executive Summary */}
                      <Card>
                        <CardHeader>
                          <h3 className="font-semibold">Executive Summary</h3>
                        </CardHeader>
                        <CardBody>
                          <p className="text-neutral-700 dark:text-neutral-300">
                            {aiStatusQuery.data.executiveSummary}
                          </p>
                        </CardBody>
                      </Card>

                      {/* Highlights & Concerns */}
                      <div className="grid grid-cols-2 gap-6">
                        <Card>
                          <CardHeader>
                            <h3 className="font-semibold flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              Highlights
                            </h3>
                          </CardHeader>
                          <CardBody>
                            <ul className="space-y-2">
                              {aiStatusQuery.data.highlights.map(
                                (highlight, idx) => (
                                  <li
                                    key={idx}
                                    className="text-sm text-neutral-600 dark:text-neutral-400"
                                  >
                                    • {highlight}
                                  </li>
                                ),
                              )}
                            </ul>
                          </CardBody>
                        </Card>

                        <Card>
                          <CardHeader>
                            <h3 className="font-semibold flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-yellow-500" />
                              Concerns
                            </h3>
                          </CardHeader>
                          <CardBody>
                            <ul className="space-y-2">
                              {aiStatusQuery.data.concerns.map(
                                (concern, idx) => (
                                  <li
                                    key={idx}
                                    className="text-sm text-neutral-600 dark:text-neutral-400"
                                  >
                                    <span className="font-medium">
                                      {concern.area}:
                                    </span>{' '}
                                    {concern.description}
                                  </li>
                                ),
                              )}
                            </ul>
                          </CardBody>
                        </Card>
                      </div>

                      {/* Recommendations */}
                      <Card>
                        <CardHeader>
                          <h3 className="font-semibold">Recommendations</h3>
                        </CardHeader>
                        <CardBody>
                          <div className="space-y-3">
                            {aiStatusQuery.data.recommendations.map(
                              (rec, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-start gap-3 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg"
                                >
                                  <Badge variant="primary">
                                    {rec.priority}
                                  </Badge>
                                  <div>
                                    <p className="font-medium">{rec.action}</p>
                                    <p className="text-sm text-neutral-500">
                                      Expected impact: {rec.expectedImpact}
                                    </p>
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        </CardBody>
                      </Card>

                      {/* Health Prediction */}
                      {healthPredictionQuery.data && (
                        <Card>
                          <CardHeader>
                            <h3 className="font-semibold flex items-center gap-2">
                              <TrendingUp className="w-4 h-4" />
                              Health Prediction
                            </h3>
                          </CardHeader>
                          <CardBody>
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <span>Predicted Score:</span>
                                <span className="text-xl font-bold">
                                  {
                                    healthPredictionQuery.data
                                      .predictedHealthScore
                                  }
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span>Confidence:</span>
                                <span>
                                  {Math.round(
                                    healthPredictionQuery.data.confidenceLevel *
                                      100,
                                  )}
                                  %
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span>Risk Level:</span>
                                <Badge
                                  variant={
                                    healthPredictionQuery.data.riskLevel ===
                                    'low'
                                      ? 'success'
                                      : healthPredictionQuery.data.riskLevel ===
                                          'medium'
                                        ? 'warning'
                                        : 'secondary'
                                  }
                                >
                                  {healthPredictionQuery.data.riskLevel}
                                </Badge>
                              </div>
                            </div>
                          </CardBody>
                        </Card>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-neutral-500">
                      No status data available
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'schedule' && (
                <div className="p-6 overflow-y-auto">
                  {!selectedProjectId ? (
                    <div className="text-center py-12 text-neutral-500">
                      Select a project to generate a schedule
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <Card>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold">Auto-Scheduling</h3>
                            <Button
                              onClick={handleGenerateSchedule}
                              disabled={generateScheduleMutation.isPending}
                            >
                              {generateScheduleMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              ) : (
                                <RefreshCw className="w-4 h-4 mr-2" />
                              )}
                              Generate Schedule
                            </Button>
                          </div>
                        </CardHeader>
                        <CardBody>
                          <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                            AI will analyze task dependencies, team capacity,
                            and project constraints to generate an optimal
                            schedule.
                          </p>

                          {generatedSchedule && (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                <div>
                                  <p className="font-medium text-green-800 dark:text-green-300">
                                    Schedule Generated
                                  </p>
                                  <p className="text-sm text-green-600 dark:text-green-400">
                                    {generatedSchedule.scheduledTasks.length}{' '}
                                    tasks scheduled
                                  </p>
                                </div>
                                <Button onClick={handleApplySchedule}>
                                  Apply Schedule
                                </Button>
                              </div>

                              {/* Critical Path */}
                              {generatedSchedule.criticalPath.length > 0 && (
                                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                                  <p className="font-medium text-yellow-800 dark:text-yellow-300 mb-2">
                                    Critical Path Tasks
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {generatedSchedule.scheduledTasks
                                      .filter((t) => t.isCriticalPath)
                                      .map((task) => (
                                        <Badge
                                          key={task.taskId}
                                          variant="warning"
                                        >
                                          {task.taskTitle}
                                        </Badge>
                                      ))}
                                  </div>
                                </div>
                              )}

                              {/* Conflicts */}
                              {generatedSchedule.conflicts.length > 0 && (
                                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                  <p className="font-medium text-red-800 dark:text-red-300 mb-2">
                                    Scheduling Conflicts
                                  </p>
                                  <ul className="space-y-2">
                                    {generatedSchedule.conflicts.map(
                                      (conflict, idx) => (
                                        <li
                                          key={idx}
                                          className="text-sm text-red-600 dark:text-red-400"
                                        >
                                          {conflict.reason} -{' '}
                                          {conflict.suggestion}
                                        </li>
                                      ),
                                    )}
                                  </ul>
                                </div>
                              )}

                              {/* Task List */}
                              <div className="border rounded-lg overflow-hidden">
                                <table className="w-full">
                                  <thead className="bg-neutral-50 dark:bg-neutral-800">
                                    <tr>
                                      <th className="text-left px-4 py-2 text-sm font-medium">
                                        Task
                                      </th>
                                      <th className="text-left px-4 py-2 text-sm font-medium">
                                        Start
                                      </th>
                                      <th className="text-left px-4 py-2 text-sm font-medium">
                                        End
                                      </th>
                                      <th className="text-left px-4 py-2 text-sm font-medium">
                                        Critical
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {generatedSchedule.scheduledTasks.map(
                                      (task) => (
                                        <tr
                                          key={task.taskId}
                                          className="border-t border-neutral-200 dark:border-neutral-700"
                                        >
                                          <td className="px-4 py-2 text-sm">
                                            {task.taskTitle}
                                          </td>
                                          <td className="px-4 py-2 text-sm text-neutral-500">
                                            {new Date(
                                              task.scheduledStart,
                                            ).toLocaleDateString()}
                                          </td>
                                          <td className="px-4 py-2 text-sm text-neutral-500">
                                            {new Date(
                                              task.scheduledEnd,
                                            ).toLocaleDateString()}
                                          </td>
                                          <td className="px-4 py-2">
                                            {task.isCriticalPath && (
                                              <Badge
                                                variant="warning"
                                                size="sm"
                                              >
                                                Yes
                                              </Badge>
                                            )}
                                          </td>
                                        </tr>
                                      ),
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </CardBody>
                      </Card>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'documents' && (
                <div className="p-6 overflow-y-auto">
                  {!selectedProjectId ? (
                    <div className="text-center py-12 text-neutral-500">
                      Select a project to generate documents
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <Card>
                        <CardHeader>
                          <h3 className="font-semibold">Document Templates</h3>
                        </CardHeader>
                        <CardBody>
                          <div className="grid grid-cols-2 gap-4">
                            {templatesQuery.data?.map((template) => (
                              <div
                                key={template.id}
                                className="p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:border-primary-500 transition-colors"
                              >
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h4 className="font-medium">
                                      {template.name}
                                    </h4>
                                    <p className="text-sm text-neutral-500 mt-1">
                                      {template.description}
                                    </p>
                                  </div>
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      handleGenerateDocument(template.id)
                                    }
                                    disabled={
                                      generateDocumentMutation.isPending
                                    }
                                  >
                                    {generateDocumentMutation.isPending ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Download className="w-4 h-4" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardBody>
                      </Card>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Reminders */}
          <div className="w-80 border-l border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/50 overflow-y-auto">
            <div className="p-4">
              <h3 className="font-semibold flex items-center gap-2 mb-4">
                <Bell className="w-4 h-4" />
                Smart Reminders
                {reminders.length > 0 && (
                  <Badge variant="primary" size="sm">
                    {reminders.length}
                  </Badge>
                )}
              </h3>

              {remindersQuery.isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
                </div>
              ) : reminders.length === 0 ? (
                <div className="text-center py-8 text-neutral-500 text-sm">
                  No pending reminders
                </div>
              ) : (
                <div className="space-y-3">
                  {reminders.map((reminder) => (
                    <ReminderCard
                      key={reminder.id}
                      reminder={reminder}
                      onDismiss={() => handleDismissReminder(reminder.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProjectAssistantPage;
