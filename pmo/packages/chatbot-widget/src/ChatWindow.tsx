/**
 * ChatWindow Component
 *
 * A standalone chat window component that can be embedded anywhere.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useChatbot } from './useChatbot';
import type { ChatWindowConfig, ChatMessage } from './types';

export interface ChatWindowProps extends ChatWindowConfig {
  /** Welcome message to display when conversation starts */
  welcomeMessage?: string;
}

export function ChatWindow({
  apiUrl,
  configId,
  width = '100%',
  height = '500px',
  theme = 'light',
  className = '',
  welcomeMessage = 'Hi! How can I help you today?',
  onMessageSent,
  onMessageReceived,
}: ChatWindowProps) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    sessionId,
    messages,
    isLoading,
    sendMessage,
    startConversation,
    suggestedActions,
  } = useChatbot({
    apiUrl,
    configId,
    autoStart: true,
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Notify parent of received messages
  useEffect(() => {
    if (messages.length > 0 && onMessageReceived) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.sender === 'BOT') {
        onMessageReceived(lastMessage);
      }
    }
  }, [messages, onMessageReceived]);

  const handleSend = async () => {
    const message = inputValue.trim();
    if (!message || isLoading) return;

    setInputValue('');
    onMessageSent?.(message);
    await sendMessage(message);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleActionClick = (label: string) => {
    setInputValue('');
    onMessageSent?.(label);
    sendMessage(label);
  };

  const isDark = theme === 'dark';

  const styles = {
    container: {
      width: typeof width === 'number' ? `${width}px` : width,
      height: typeof height === 'number' ? `${height}px` : height,
      display: 'flex',
      flexDirection: 'column' as const,
      backgroundColor: isDark ? '#1f2937' : '#ffffff',
      color: isDark ? '#f3f4f6' : '#1f2937',
      borderRadius: '16px',
      overflow: 'hidden',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      fontFamily:
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    },
    header: {
      padding: '16px 20px',
      backgroundColor: '#3B82F6',
      color: '#ffffff',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    avatar: {
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '20px',
    },
    title: {
      fontSize: '16px',
      fontWeight: 600,
      margin: 0,
    },
    messages: {
      flex: 1,
      overflowY: 'auto' as const,
      padding: '16px',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '12px',
    },
    message: {
      display: 'flex',
      gap: '8px',
      maxWidth: '85%',
    },
    messageCustomer: {
      flexDirection: 'row-reverse' as const,
      marginLeft: 'auto',
    },
    messageAvatar: {
      width: '28px',
      height: '28px',
      borderRadius: '50%',
      backgroundColor: isDark ? '#374151' : '#e5e7eb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '12px',
      flexShrink: 0,
    },
    messageAvatarCustomer: {
      backgroundColor: '#3B82F6',
      color: '#ffffff',
    },
    messageContent: {
      padding: '10px 14px',
      borderRadius: '16px',
      fontSize: '14px',
      lineHeight: 1.4,
    },
    messageContentBot: {
      backgroundColor: isDark ? '#374151' : '#f3f4f6',
      borderBottomLeftRadius: '4px',
    },
    messageContentCustomer: {
      backgroundColor: '#3B82F6',
      color: '#ffffff',
      borderBottomRightRadius: '4px',
    },
    actions: {
      display: 'flex',
      flexWrap: 'wrap' as const,
      gap: '8px',
      padding: '0 16px 16px',
    },
    actionBtn: {
      padding: '8px 14px',
      border: '1px solid #3B82F6',
      backgroundColor: 'transparent',
      color: '#3B82F6',
      borderRadius: '20px',
      fontSize: '13px',
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    inputArea: {
      padding: '12px 16px',
      borderTop: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
      display: 'flex',
      gap: '8px',
    },
    input: {
      flex: 1,
      padding: '10px 14px',
      border: `1px solid ${isDark ? '#374151' : '#d1d5db'}`,
      borderRadius: '24px',
      fontSize: '14px',
      outline: 'none',
      backgroundColor: isDark ? '#1f2937' : '#ffffff',
      color: isDark ? '#f3f4f6' : '#1f2937',
    },
    sendBtn: {
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      backgroundColor: '#3B82F6',
      color: '#ffffff',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: isLoading ? 0.5 : 1,
    },
    typing: {
      display: 'flex',
      gap: '4px',
      padding: '10px 14px',
    },
    typingDot: {
      width: '8px',
      height: '8px',
      backgroundColor: isDark ? '#6b7280' : '#9ca3af',
      borderRadius: '50%',
      animation: 'pmo-typing 1.4s infinite',
    },
  };

  const renderMessage = (msg: ChatMessage) => {
    const isCustomer = msg.sender === 'CUSTOMER';
    return (
      <div
        key={msg.id}
        style={{
          ...styles.message,
          ...(isCustomer ? styles.messageCustomer : {}),
        }}
      >
        <div
          style={{
            ...styles.messageAvatar,
            ...(isCustomer ? styles.messageAvatarCustomer : {}),
          }}
        >
          {isCustomer ? '👤' : '🤖'}
        </div>
        <div
          style={{
            ...styles.messageContent,
            ...(isCustomer
              ? styles.messageContentCustomer
              : styles.messageContentBot),
          }}
        >
          {msg.content}
        </div>
      </div>
    );
  };

  return (
    <div style={styles.container} className={className}>
      <style>
        {`
          @keyframes pmo-typing {
            0%, 60%, 100% { transform: translateY(0); }
            30% { transform: translateY(-4px); }
          }
        `}
      </style>

      <div style={styles.header}>
        <div style={styles.avatar}>🤖</div>
        <div>
          <h3 style={styles.title}>Chat Support</h3>
        </div>
      </div>

      <div style={styles.messages}>
        {sessionId && messages.length === 0 && !isLoading && (
          <div
            style={{
              ...styles.message,
            }}
          >
            <div style={styles.messageAvatar}>🤖</div>
            <div
              style={{ ...styles.messageContent, ...styles.messageContentBot }}
            >
              {welcomeMessage}
            </div>
          </div>
        )}

        {messages.map(renderMessage)}

        {isLoading && (
          <div style={styles.message}>
            <div style={styles.messageAvatar}>🤖</div>
            <div
              style={{ ...styles.messageContent, ...styles.messageContentBot }}
            >
              <div style={styles.typing}>
                <div style={{ ...styles.typingDot, animationDelay: '0s' }} />
                <div style={{ ...styles.typingDot, animationDelay: '0.2s' }} />
                <div style={{ ...styles.typingDot, animationDelay: '0.4s' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {suggestedActions.length > 0 && (
        <div style={styles.actions}>
          {suggestedActions.map((action, index) => (
            <button
              key={index}
              style={styles.actionBtn}
              onClick={() => handleActionClick(action.label)}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#3B82F6';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#3B82F6';
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      <div style={styles.inputArea}>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          style={styles.input}
          disabled={!sessionId || isLoading}
        />
        <button
          onClick={handleSend}
          disabled={!sessionId || isLoading || !inputValue.trim()}
          style={styles.sendBtn}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
