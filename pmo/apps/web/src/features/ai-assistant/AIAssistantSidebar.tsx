/**
 * AI Assistant Sidebar
 *
 * A sliding sidebar panel for AI-powered CRM queries
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Send,
  Bot,
  Loader2,
  User,
  AlertCircle,
  GripVertical,
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { useAIAssistant } from './AIAssistantContext';
import { useAIQuery, type AIQueryResponse } from '../../api/hooks';
import { MarkdownText } from './MarkdownText';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: AIQueryResponse['toolCalls'];
  sources?: AIQueryResponse['sources'];
  isLoading?: boolean;
  isError?: boolean;
}

// Min and max width constraints for the sidebar
const MIN_WIDTH = 280;
const MAX_WIDTH = 800;
const DEFAULT_WIDTH = 400;
const STORAGE_KEY = 'ai-assistant-width';

// Get initial width from localStorage or default
const getInitialWidth = (): number => {
  if (typeof window === 'undefined') return DEFAULT_WIDTH;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const parsed = parseInt(stored, 10);
    if (!isNaN(parsed) && parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) {
      return parsed;
    }
  }
  return DEFAULT_WIDTH;
};

export function AIAssistantSidebar(): JSX.Element | null {
  const { isOpen, close, clientId, projectId } = useAIAssistant();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [width, setWidth] = useState(getInitialWidth);
  const [isResizing, setIsResizing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const aiQuery = useAIQuery();

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when sidebar opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle resize mouse events
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;
      e.preventDefault();

      // Calculate new width based on mouse position from right edge
      const newWidth = window.innerWidth - e.clientX;
      const clampedWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, newWidth));
      setWidth(clampedWidth);
    },
    [isResizing],
  );

  const handleMouseUp = useCallback(() => {
    if (isResizing) {
      setIsResizing(false);
      // Save width to localStorage
      localStorage.setItem(STORAGE_KEY, width.toString());
    }
  }, [isResizing, width]);

  // Add/remove mouse event listeners for resizing
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      // Prevent text selection while resizing
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'ew-resize';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  // Core function to send a message
  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || aiQuery.isPending) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText.trim(),
    };

    const assistantMessage: Message = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInput('');

    // Build conversation history for context
    const history = messages
      .filter((m) => !m.isLoading && !m.isError)
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    try {
      const response = await aiQuery.mutateAsync({
        query: messageText.trim(),
        context: { clientId, projectId },
        history,
      });

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessage.id
            ? {
                ...m,
                content: response.response,
                toolCalls: response.toolCalls,
                sources: response.sources,
                isLoading: false,
              }
            : m,
        ),
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessage.id
            ? {
                ...m,
                content:
                  'Sorry, I encountered an error processing your request.',
                isLoading: false,
                isError: true,
              }
            : m,
        ),
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  // Handle quick action button clicks - auto-submit
  const handleQuickAction = (suggestion: string) => {
    sendMessage(suggestion);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const clearHistory = () => {
    setMessages([]);
  };

  // Don't render anything if not open
  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={sidebarRef}
      className={`relative flex flex-col h-full bg-white dark:bg-neutral-800 shadow-xl flex-shrink-0 border-l border-neutral-200 dark:border-neutral-700 ${isResizing ? '' : 'animate-slide-in-right'}`}
      style={{
        width: `${width}px`,
        minWidth: `${MIN_WIDTH}px`,
        maxWidth: `${MAX_WIDTH}px`,
      }}
    >
      {/* Resize Handle */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-primary-500/50 active:bg-primary-500 transition-colors group z-10"
        onMouseDown={startResizing}
      >
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="w-3 h-3 text-neutral-400" />
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">
            AI Assistant
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={clearHistory}
              className="text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
            >
              Clear
            </button>
          )}
          <button
            onClick={close}
            className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Context Banner */}
      {(clientId || projectId) && (
        <div className="px-4 py-2 bg-primary-50 dark:bg-primary-900/30 text-sm text-primary-700 dark:text-primary-300 border-b border-primary-100 dark:border-primary-800">
          Context: {clientId && <span>Client #{clientId}</span>}
          {clientId && projectId && ' / '}
          {projectId && <span>Project #{projectId}</span>}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <Bot className="w-12 h-12 mx-auto text-neutral-300 dark:text-neutral-600 mb-4" />
            <p className="text-neutral-500 dark:text-neutral-400 mb-2">
              Hi! I&apos;m your AI assistant.
            </p>
            <p className="text-sm text-neutral-400 dark:text-neutral-500">
              Ask me about your clients, projects, tasks, or meetings.
            </p>
            <div className="mt-4 space-y-2">
              <p className="text-xs text-neutral-400 dark:text-neutral-500">
                Try asking:
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  'What are my at-risk projects?',
                  'Prepare me for my meeting with client #1',
                  'Show recent meetings',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleQuickAction(suggestion)}
                    className="text-xs px-3 py-1.5 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-600"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                  {message.isLoading ? (
                    <Loader2 className="w-4 h-4 text-primary-600 dark:text-primary-400 animate-spin" />
                  ) : message.isError ? (
                    <AlertCircle className="w-4 h-4 text-danger-600 dark:text-danger-400" />
                  ) : (
                    <Bot className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                  )}
                </div>
              )}

              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-primary-600 text-white'
                    : message.isError
                      ? 'bg-danger-50 dark:bg-danger-900/30 text-danger-700 dark:text-danger-300'
                      : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100'
                }`}
              >
                {message.isLoading ? (
                  <span className="text-neutral-500 dark:text-neutral-400">
                    Thinking...
                  </span>
                ) : (
                  <>
                    {message.role === 'assistant' ? (
                      <MarkdownText content={message.content} />
                    ) : (
                      <p className="text-sm">{message.content}</p>
                    )}
                  </>
                )}
              </div>

              {message.role === 'user' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-600 flex items-center justify-center">
                  <User className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex-shrink-0 p-4 border-t border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800"
      >
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything..."
            className="flex-1 resize-none rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
            rows={1}
            disabled={aiQuery.isPending}
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={!input.trim() || aiQuery.isPending}
          >
            {aiQuery.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
