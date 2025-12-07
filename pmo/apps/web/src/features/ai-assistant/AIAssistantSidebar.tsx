/**
 * AI Assistant Sidebar
 *
 * A sliding sidebar panel for AI-powered CRM queries
 */

import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, Loader2, User, AlertCircle } from 'lucide-react';
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

export function AIAssistantSidebar(): JSX.Element {
  const { isOpen, close, clientId, projectId } = useAIAssistant();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || aiQuery.isPending) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
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
        query: input.trim(),
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const clearHistory = () => {
    setMessages([]);
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40 lg:hidden"
          onClick={close}
        />
      )}

      {/* Sidebar Panel */}
      <div
        className={`fixed right-0 top-0 h-full w-full sm:w-96 bg-white dark:bg-neutral-800 shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
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
        <div
          className="flex-1 overflow-y-auto p-4 space-y-4"
          style={{ height: 'calc(100% - 140px)' }}
        >
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
                      onClick={() => setInput(suggestion)}
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

                      {/* Show tool calls if any */}
                      {message.toolCalls && message.toolCalls.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-neutral-200 dark:border-neutral-600">
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                            Tools used:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {message.toolCalls.map((tc, i) => (
                              <span
                                key={i}
                                className="text-xs px-2 py-0.5 bg-neutral-200 dark:bg-neutral-600 rounded"
                              >
                                {tc.tool}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Show sources if any */}
                      {message.sources && message.sources.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-neutral-200 dark:border-neutral-600">
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                            Sources:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {message.sources.slice(0, 5).map((source, i) => (
                              <span
                                key={i}
                                className="text-xs px-2 py-0.5 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded"
                              >
                                {source.type}: {source.name}
                              </span>
                            ))}
                          </div>
                        </div>
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
          className="absolute bottom-0 left-0 right-0 p-4 border-t border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800"
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
    </>
  );
}
