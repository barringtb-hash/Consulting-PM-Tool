/**
 * Monitoring Assistant Page
 *
 * AI-powered conversational assistant for monitoring queries and diagnostics.
 * Provides natural language access to AI usage, costs, system health, and anomalies.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Trash2,
  RefreshCw,
  AlertCircle,
  Sparkles,
  MessageSquare,
  ChevronDown,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Card, Button, Badge } from '../../ui';
import {
  useMonitoringAssistantChat,
  useMonitoringAssistantSuggestions,
  type AssistantMessage,
  type ChatResponse,
} from '../../api/hooks/useMonitoring';

// Quick action buttons for common queries
const QUICK_ACTIONS = [
  { label: 'System Status', query: "What's the current system status?" },
  { label: 'Cost Summary', query: 'How much have we spent on AI this month?' },
  { label: 'Check Anomalies', query: 'Are there any anomalies or issues?' },
  { label: 'Usage Trends', query: 'Show me usage trends for the past week' },
  { label: 'Performance', query: 'How is API performance looking?' },
  { label: 'Recommendations', query: 'What recommendations do you have for cost optimization?' },
];

export function MonitoringAssistantPage(): JSX.Element {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [suggestedFollowUps, setSuggestedFollowUps] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chatMutation = useMonitoringAssistantChat();
  const { data: suggestionsData, isLoading: suggestionsLoading } =
    useMonitoringAssistantSuggestions();

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle sending a message
  const handleSend = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text) return;

    // Add user message
    const userMessage: AssistantMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setSuggestedFollowUps([]);

    try {
      const response = await chatMutation.mutateAsync({
        message: text,
        conversationId,
      });

      const data = response.data as ChatResponse;
      setConversationId(data.conversationId);
      setMessages((prev) => [...prev, data.message]);
      setSuggestedFollowUps(data.suggestedFollowUps || []);
    } catch (error) {
      // Add error message
      const errorMessage: AssistantMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  // Handle clearing the conversation
  const handleClear = () => {
    setMessages([]);
    setConversationId(undefined);
    setSuggestedFollowUps([]);
  };

  // Handle key press in input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestions = suggestionsData?.data;

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-neutral-800 dark:text-neutral-100">
              AI Monitoring Assistant
            </h1>
            <p className="text-sm text-neutral-500">
              Ask about AI usage, costs, system health, or diagnose issues
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="text-neutral-500 hover:text-red-500"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 bg-neutral-50 dark:bg-neutral-900">
        {messages.length === 0 ? (
          // Empty state with suggestions
          <div className="flex flex-col items-center justify-center h-full">
            <div className="p-4 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
              <Sparkles className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-lg font-medium text-neutral-700 dark:text-neutral-200 mb-2">
              How can I help you today?
            </h2>
            <p className="text-neutral-500 text-center max-w-md mb-6">
              I can help you understand your AI usage, analyze costs, diagnose issues,
              and provide recommendations for optimization.
            </p>

            {/* Quick Actions */}
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {QUICK_ACTIONS.map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSend(action.query)}
                  disabled={chatMutation.isPending}
                  className="text-sm"
                >
                  {action.label}
                </Button>
              ))}
            </div>

            {/* Dynamic Suggestions */}
            {suggestions && !suggestionsLoading && (
              <Card className="max-w-md p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Based on your current system state:
                  </span>
                </div>
                <div className="space-y-2">
                  {suggestions.suggestions.slice(0, 3).map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(suggestion)}
                      disabled={chatMutation.isPending}
                      className="w-full text-left p-2 text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                    >
                      "{suggestion}"
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 mt-3">
                  {suggestions.basedOn.hasAnomalies && (
                    <Badge color="red" size="sm">Anomalies Detected</Badge>
                  )}
                  {suggestions.basedOn.hasCostWarning && (
                    <Badge color="amber" size="sm">Cost Warning</Badge>
                  )}
                  {suggestions.basedOn.hasPerformanceIssues && (
                    <Badge color="orange" size="sm">Performance Issues</Badge>
                  )}
                </div>
              </Card>
            )}
          </div>
        ) : (
          // Message history
          <div className="space-y-4 max-w-4xl mx-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg p-4 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p>{message.content}</p>
                  )}
                  {message.metadata && (
                    <div className="mt-2 pt-2 border-t border-neutral-200 dark:border-neutral-600 text-xs text-neutral-400">
                      {message.metadata.tokensUsed && (
                        <span className="mr-3">
                          {message.metadata.tokensUsed.toLocaleString()} tokens
                        </span>
                      )}
                      {message.metadata.latencyMs && (
                        <span>{message.metadata.latencyMs}ms</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {chatMutation.isPending && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-neutral-500">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Analyzing...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Suggested follow-ups */}
            {suggestedFollowUps.length > 0 && !chatMutation.isPending && (
              <div className="flex justify-start">
                <div className="flex flex-wrap gap-2">
                  {suggestedFollowUps.map((followUp, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(followUp)}
                      className="px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                    >
                      {followUp}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask about AI usage, costs, system health, or issues..."
                className="w-full px-4 py-3 pr-12 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={1}
                disabled={chatMutation.isPending}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || chatMutation.isPending}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-blue-600 hover:text-blue-700 disabled:text-neutral-400 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
          <p className="mt-2 text-xs text-neutral-400 text-center">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}

export default MonitoringAssistantPage;
