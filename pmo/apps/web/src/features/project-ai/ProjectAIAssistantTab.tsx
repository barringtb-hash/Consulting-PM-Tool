/**
 * Project AI Assistant Tab
 *
 * Chat-based interface for AI-powered project management assistance.
 * Embedded in the Project Dashboard.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Bot,
  User,
  RefreshCw,
  Bell,
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronRight,
  X,
  Loader2,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { useToast } from '../../ui/Toast';
import {
  useSendAssistantMessage,
  useAIStatus,
  useHealthPrediction,
  useSmartReminders,
  useDismissReminder,
  type AssistantMessage,
  type SuggestedAction,
  type SmartReminder,
} from '../../api/hooks/ai-projects';

interface ProjectAIAssistantTabProps {
  projectId: number;
  projectName?: string;
}

interface ChatMessage extends AssistantMessage {
  isLoading?: boolean;
}

// Message bubble component
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

// Reminder card component
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

// Health score indicator
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

export function ProjectAIAssistantTab({
  projectId,
  projectName,
}: ProjectAIAssistantTabProps): JSX.Element {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hi! I'm your AI Project Assistant for ${projectName || 'this project'}. I can help you with:\n\n• Project status and health summaries\n• Task management and scheduling\n• Risk analysis and recommendations\n• Document generation\n\nHow can I help you today?`,
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  // Queries
  const aiStatusQuery = useAIStatus(projectId);
  const healthPredictionQuery = useHealthPrediction(projectId);
  const remindersQuery = useSmartReminders(projectId);

  // Mutations
  const sendMessageMutation = useSendAssistantMessage();
  const dismissReminderMutation = useDismissReminder();

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
          projectId,
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
    [projectId, sendMessageMutation, showToast],
  );

  // Handle suggested action clicks
  const handleActionClick = useCallback(
    (action: SuggestedAction) => {
      if (action.action === 'query' && action.payload?.query) {
        handleSendMessage(action.payload.query as string);
      }
    },
    [handleSendMessage],
  );

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };

  // Handle dismiss reminder
  const handleDismissReminder = async (reminderId: string) => {
    try {
      await dismissReminderMutation.mutateAsync(reminderId);
      remindersQuery.refetch();
    } catch (_error) {
      showToast('Failed to dismiss reminder', 'error');
    }
  };

  const reminders = remindersQuery.data || [];
  const aiStatus = aiStatusQuery.data;
  const healthPrediction = healthPredictionQuery.data;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Chat Area */}
      <div className="lg:col-span-2">
        <Card className="h-[600px] flex flex-col">
          <CardHeader className="border-b border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary-500" />
              <h3 className="font-semibold">AI Assistant</h3>
            </div>
          </CardHeader>
          <CardBody className="flex-1 flex flex-col overflow-hidden p-0">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4">
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
            <form
              onSubmit={handleSubmit}
              className="border-t border-neutral-200 dark:border-neutral-700 p-4"
            >
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask about your project..."
                  className="flex-1"
                  disabled={sendMessageMutation.isPending}
                />
                <Button
                  type="submit"
                  disabled={!inputValue.trim() || sendMessageMutation.isPending}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Health Status */}
        {(aiStatus || healthPrediction) && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Project Health</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    aiStatusQuery.refetch();
                    healthPredictionQuery.refetch();
                  }}
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardBody>
              {aiStatus && (
                <div className="mb-4">
                  <HealthScoreIndicator
                    score={aiStatus.healthScore}
                    status={aiStatus.status}
                  />
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">
                    {aiStatus.summary}
                  </p>
                </div>
              )}
              {healthPrediction && (
                <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700">
                  <h4 className="text-sm font-medium mb-2">Prediction</h4>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    {healthPrediction.prediction}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    Confidence: {Math.round(healthPrediction.confidence * 100)}%
                  </p>
                </div>
              )}
            </CardBody>
          </Card>
        )}

        {/* Smart Reminders */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary-500" />
                <h3 className="font-semibold">Smart Reminders</h3>
              </div>
              {reminders.length > 0 && (
                <span className="text-xs bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 px-2 py-0.5 rounded-full">
                  {reminders.length}
                </span>
              )}
            </div>
          </CardHeader>
          <CardBody>
            {remindersQuery.isLoading && (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-20 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse"
                  />
                ))}
              </div>
            )}
            {!remindersQuery.isLoading && reminders.length === 0 && (
              <p className="text-sm text-neutral-500 text-center py-4">
                No active reminders
              </p>
            )}
            {!remindersQuery.isLoading && reminders.length > 0 && (
              <div className="space-y-3">
                {reminders.slice(0, 5).map((reminder) => (
                  <ReminderCard
                    key={reminder.id}
                    reminder={reminder}
                    onDismiss={() => handleDismissReminder(reminder.id)}
                  />
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

export default ProjectAIAssistantTab;
