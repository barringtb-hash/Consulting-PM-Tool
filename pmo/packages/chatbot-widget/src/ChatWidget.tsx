/**
 * ChatWidget Component
 *
 * A floating chat widget with a bubble button.
 */

import React, { useState, useEffect } from 'react';
import { ChatWindow } from './ChatWindow';
import type { WidgetConfig } from './types';

export interface ChatWidgetProps extends WidgetConfig {
  /** Welcome message to display when conversation starts */
  welcomeMessage?: string;
}

export function ChatWidget({
  apiUrl,
  configId,
  position = 'bottom-right',
  primaryColor = '#3B82F6',
  textColor = '#ffffff',
  title,
  subtitle,
  avatarUrl,
  theme = 'light',
  defaultOpen = false,
  onOpen,
  onClose,
  onMessageSent,
  onMessageReceived,
  className = '',
  zIndex = 999999,
  welcomeMessage = "Hi! How can I help you today?",
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  useEffect(() => {
    if (isOpen) {
      onOpen?.();
    } else {
      onClose?.();
    }
  }, [isOpen, onOpen, onClose]);

  const isLeft = position === 'bottom-left';

  const styles = {
    bubble: {
      position: 'fixed' as const,
      bottom: '20px',
      [isLeft ? 'left' : 'right']: '20px',
      width: '60px',
      height: '60px',
      borderRadius: '50%',
      backgroundColor: primaryColor,
      color: textColor,
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      zIndex,
      transition: 'transform 0.2s, box-shadow 0.2s',
    },
    bubbleHover: {
      transform: 'scale(1.05)',
      boxShadow: '0 6px 16px rgba(0, 0, 0, 0.2)',
    },
    container: {
      position: 'fixed' as const,
      bottom: '90px',
      [isLeft ? 'left' : 'right']: '20px',
      width: '380px',
      maxWidth: 'calc(100vw - 40px)',
      height: '520px',
      maxHeight: 'calc(100vh - 120px)',
      zIndex: zIndex + 1,
      display: isOpen ? 'block' : 'none',
    },
  };

  const ChatIcon = () => (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" />
    </svg>
  );

  const CloseIcon = () => (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );

  return (
    <div className={className}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={styles.bubble}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        }}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? <CloseIcon /> : <ChatIcon />}
      </button>

      <div style={styles.container}>
        {isOpen && (
          <ChatWindow
            apiUrl={apiUrl}
            configId={configId}
            width="100%"
            height="100%"
            theme={theme}
            welcomeMessage={welcomeMessage}
            onMessageSent={onMessageSent}
            onMessageReceived={onMessageReceived}
          />
        )}
      </div>
    </div>
  );
}
