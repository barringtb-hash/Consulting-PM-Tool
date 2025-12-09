/**
 * useChatbot Hook
 *
 * A React hook for managing chatbot conversations programmatically.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  UseChatbotOptions,
  UseChatbotReturn,
  ChatMessage,
  SuggestedAction,
} from './types';

export function useChatbot(options: UseChatbotOptions): UseChatbotReturn {
  const { apiUrl, configId, autoStart = false, customerInfo } = options;

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [suggestedActions, setSuggestedActions] = useState<SuggestedAction[]>(
    []
  );

  const baseUrl = apiUrl.replace(/\/$/, '');
  const isStartingRef = useRef(false);

  /**
   * Start a new conversation
   */
  const startConversation = useCallback(async () => {
    if (isStartingRef.current || sessionId) return;

    isStartingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${baseUrl}/api/chatbot/${configId}/conversations`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel: 'WEB',
            customerEmail: customerInfo?.email,
            customerName: customerInfo?.name,
            customerPhone: customerInfo?.phone,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to start conversation: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.conversation?.sessionId) {
        setSessionId(data.conversation.sessionId);
        setMessages([]);
        setSuggestedActions([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
      isStartingRef.current = false;
    }
  }, [baseUrl, configId, customerInfo, sessionId]);

  /**
   * Send a message
   */
  const sendMessage = useCallback(
    async (content: string) => {
      if (!sessionId || !content.trim() || isLoading) return;

      setIsLoading(true);
      setError(null);

      // Add customer message to state immediately
      const customerMessage: ChatMessage = {
        id: Date.now(),
        sender: 'CUSTOMER',
        content: content.trim(),
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, customerMessage]);
      setSuggestedActions([]);

      try {
        const response = await fetch(
          `${baseUrl}/api/chatbot/conversations/${sessionId}/messages`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: content.trim(),
              customerEmail: customerInfo?.email,
              customerName: customerInfo?.name,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to send message: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.botResponse) {
          const botMessage: ChatMessage = {
            id: data.botResponse.id || Date.now() + 1,
            sender: 'BOT',
            content: data.botResponse.content,
            createdAt: data.botResponse.createdAt || new Date().toISOString(),
            detectedIntent: data.customerMessage?.detectedIntent,
            intentConfidence: data.customerMessage?.intentConfidence,
            sentiment: data.customerMessage?.sentiment,
            suggestedActions: data.botResponse.suggestedActions,
          };

          setMessages((prev) => [...prev, botMessage]);

          if (data.botResponse.suggestedActions) {
            setSuggestedActions(data.botResponse.suggestedActions);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    },
    [baseUrl, sessionId, isLoading, customerInfo]
  );

  /**
   * End the current conversation
   */
  const endConversation = useCallback(async () => {
    if (!sessionId) return;

    try {
      // Note: This would require auth in a real implementation
      // For now, just clear local state
      setSessionId(null);
      setMessages([]);
      setSuggestedActions([]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    }
  }, [sessionId]);

  // Auto-start conversation if configured
  useEffect(() => {
    if (autoStart && !sessionId && !isStartingRef.current) {
      startConversation();
    }
  }, [autoStart, sessionId, startConversation]);

  return {
    sessionId,
    messages,
    isLoading,
    error,
    sendMessage,
    startConversation,
    endConversation,
    suggestedActions,
  };
}
