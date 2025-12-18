/**
 * Vanilla JS Embed Script
 *
 * For non-React websites, this script provides an easy way to embed
 * the booking widget using a simple script tag.
 *
 * Usage:
 *
 * ```html
 * <div id="booking-widget"></div>
 * <script
 *   src="https://cdn.yourapp.com/booking-widget.js"
 *   data-slug="your-booking-page"
 *   data-api-url="https://api.yourapp.com"
 *   data-container="booking-widget"
 * ></script>
 * ```
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { BookingWidget, BookingWidgetProps } from './BookingWidget';

interface WindowWithBookingWidget extends Window {
  BookingWidget?: {
    init: (config: BookingWidgetConfig) => void;
    destroy: (containerId: string) => void;
  };
}

interface BookingWidgetConfig extends Omit<BookingWidgetProps, 'slug'> {
  slug: string;
  containerId: string;
}

// Store root references for cleanup
const roots = new Map<string, ReturnType<typeof createRoot>>();

/**
 * Initialize the booking widget
 */
function init(config: BookingWidgetConfig): void {
  const { containerId, ...widgetProps } = config;

  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Booking Widget: Container #${containerId} not found`);
    return;
  }

  // Clean up existing widget if present
  if (roots.has(containerId)) {
    roots.get(containerId)?.unmount();
    roots.delete(containerId);
  }

  // Create new root and render
  const root = createRoot(container);
  roots.set(containerId, root);

  root.render(React.createElement(BookingWidget, widgetProps));
}

/**
 * Destroy the booking widget
 */
function destroy(containerId: string): void {
  if (roots.has(containerId)) {
    roots.get(containerId)?.unmount();
    roots.delete(containerId);
  }
}

// Auto-initialize from script tag data attributes
function autoInit(): void {
  const scripts = document.querySelectorAll(
    'script[data-booking-widget]',
  ) as NodeListOf<HTMLScriptElement>;

  scripts.forEach((script) => {
    const slug = script.dataset.slug;
    const containerId = script.dataset.container || 'booking-widget';
    const apiUrl = script.dataset.apiUrl;

    if (!slug) {
      console.error('Booking Widget: data-slug attribute is required');
      return;
    }

    init({
      slug,
      containerId,
      apiBaseUrl: apiUrl,
      theme: {
        primaryColor: script.dataset.primaryColor,
        backgroundColor: script.dataset.backgroundColor,
        textColor: script.dataset.textColor,
        borderRadius: script.dataset.borderRadius,
        fontFamily: script.dataset.fontFamily,
      },
      compact: script.dataset.compact === 'true',
    });
  });
}

// Expose global API
if (typeof window !== 'undefined') {
  (window as WindowWithBookingWidget).BookingWidget = {
    init,
    destroy,
  };

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }
}

export { init, destroy };
