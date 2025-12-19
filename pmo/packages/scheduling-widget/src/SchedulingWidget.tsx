/**
 * SchedulingWidget Component
 *
 * A floating or inline widget for appointment scheduling.
 */

import React, { useState } from 'react';
import { SchedulingWindow } from './SchedulingWindow';
import type { WidgetConfig, BookingResult } from './types';

export interface SchedulingWidgetProps extends WidgetConfig {}

export function SchedulingWidget({
  apiUrl,
  slug,
  primaryColor = '#2563eb',
  buttonText = 'Book Appointment',
  inline = false,
  position = 'bottom-right',
  onBookingComplete,
  onBookingError,
  locale,
  timezone,
}: SchedulingWidgetProps) {
  const [isOpen, setIsOpen] = useState(inline);

  const handleBookingComplete = (result: BookingResult) => {
    if (!inline) {
      setIsOpen(false);
    }
    onBookingComplete?.(result);
  };

  // Position styles
  const positionStyles: Record<string, React.CSSProperties> = {
    'bottom-right': { bottom: 20, right: 20 },
    'bottom-left': { bottom: 20, left: 20 },
    'top-right': { top: 20, right: 20 },
    'top-left': { top: 20, left: 20 },
  };

  // Inline mode - just render the window
  if (inline) {
    return (
      <SchedulingWindow
        apiUrl={apiUrl}
        slug={slug}
        primaryColor={primaryColor}
        onBookingComplete={handleBookingComplete}
        onBookingError={onBookingError}
        locale={locale}
        timezone={timezone}
      />
    );
  }

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            ...positionStyles[position],
            backgroundColor: primaryColor,
            color: 'white',
            border: 'none',
            borderRadius: '50px',
            padding: '16px 24px',
            fontSize: '16px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            zIndex: 9998,
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
          }}
          aria-label={buttonText}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          {buttonText}
        </button>
      )}

      {/* Modal overlay */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsOpen(false);
            }
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.2)',
              width: '100%',
              maxWidth: '500px',
              maxHeight: '90vh',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {/* Close button */}
            <button
              onClick={() => setIsOpen(false)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#666',
                zIndex: 10,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              aria-label="Close"
            >
              <svg
                width="24"
                height="24"
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
            </button>

            <SchedulingWindow
              apiUrl={apiUrl}
              slug={slug}
              primaryColor={primaryColor}
              onBookingComplete={handleBookingComplete}
              onBookingError={onBookingError}
              locale={locale}
              timezone={timezone}
            />
          </div>
        </div>
      )}
    </>
  );
}
