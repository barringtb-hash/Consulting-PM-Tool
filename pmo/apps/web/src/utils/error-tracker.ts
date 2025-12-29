/**
 * Error Tracker - Client-side error collection for bug tracking
 *
 * Automatically captures:
 * - Global JavaScript errors (window.onerror)
 * - Unhandled promise rejections
 * - React error boundary errors
 * - Manual error reports
 *
 * Features:
 * - Automatic batching and periodic flushing
 * - Error deduplication via hashing
 * - Browser/device info collection
 * - Session tracking
 */

interface ClientError {
  message: string;
  stack?: string;
  source: 'window.onerror' | 'unhandledrejection' | 'react-error-boundary' | 'manual';
  url: string;
  line?: number;
  column?: number;
  componentStack?: string;
  browserInfo: {
    userAgent: string;
    language: string;
    platform: string;
    screenSize: string;
    browser?: string;
    version?: string;
    os?: string;
    device?: string;
  };
  sessionId?: string;
  userId?: number;
  environment?: string;
  appVersion?: string;
}

interface ErrorTrackerConfig {
  apiEndpoint: string;
  flushIntervalMs: number;
  maxQueueSize: number;
  enabled: boolean;
  environment?: string;
  appVersion?: string;
  userId?: number;
}

const DEFAULT_CONFIG: ErrorTrackerConfig = {
  apiEndpoint: '/api/bug-tracking/errors/client',
  flushIntervalMs: 5000,
  maxQueueSize: 50,
  enabled: true,
  environment: import.meta.env.MODE || 'development',
};

class ErrorTracker {
  private config: ErrorTrackerConfig;
  private queue: ClientError[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private sessionId: string;
  private recentErrorHashes: Set<string> = new Set();
  private initialized: boolean = false;

  constructor(config: Partial<ErrorTrackerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sessionId = this.generateSessionId();
  }

  /**
   * Initialize error tracking
   * Sets up global error handlers
   */
  init(): void {
    if (this.initialized || !this.config.enabled) {
      return;
    }

    // Global error handler
    window.onerror = (message, source, line, column, error) => {
      this.captureError({
        message: String(message),
        stack: error?.stack,
        source: 'window.onerror',
        line,
        column,
      });
      return false; // Don't suppress the error
    };

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason;
      this.captureError({
        message: error?.message || 'Unhandled Promise Rejection',
        stack: error?.stack,
        source: 'unhandledrejection',
      });
    });

    // Start periodic flush
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushIntervalMs);

    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      this.flush(true);
    });

    // Flush on visibility change (tab hidden)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flush(true);
      }
    });

    this.initialized = true;
    console.debug('[ErrorTracker] Initialized');
  }

  /**
   * Capture an error
   */
  captureError(error: Partial<ClientError>): void {
    if (!this.config.enabled) {
      return;
    }

    // Generate hash for deduplication
    const hash = this.generateErrorHash(error.message || '', error.stack);

    // Skip if we've seen this error recently
    if (this.recentErrorHashes.has(hash)) {
      return;
    }
    this.recentErrorHashes.add(hash);

    // Clear old hashes periodically
    setTimeout(() => {
      this.recentErrorHashes.delete(hash);
    }, 60000); // Keep for 1 minute

    const fullError: ClientError = {
      message: error.message || 'Unknown error',
      stack: error.stack,
      source: error.source || 'manual',
      url: error.url || window.location.href,
      line: error.line,
      column: error.column,
      componentStack: error.componentStack,
      browserInfo: this.getBrowserInfo(),
      sessionId: this.sessionId,
      userId: this.config.userId,
      environment: this.config.environment,
      appVersion: this.config.appVersion,
    };

    this.queue.push(fullError);

    // Flush if queue is full
    if (this.queue.length >= this.config.maxQueueSize) {
      this.flush();
    }
  }

  /**
   * Capture a React error boundary error
   */
  captureReactError(error: Error, componentStack?: string): void {
    this.captureError({
      message: error.message,
      stack: error.stack,
      source: 'react-error-boundary',
      componentStack,
    });
  }

  /**
   * Manual error capture with context
   */
  captureException(error: Error, context?: Record<string, unknown>): void {
    this.captureError({
      message: error.message,
      stack: error.stack,
      source: 'manual',
      ...context,
    });
  }

  /**
   * Flush queued errors to the server
   */
  async flush(sync: boolean = false): Promise<void> {
    if (this.queue.length === 0) {
      return;
    }

    const errors = [...this.queue];
    this.queue = [];

    const payload = { errors };

    try {
      if (sync && navigator.sendBeacon) {
        // Use sendBeacon for page unload (more reliable)
        navigator.sendBeacon(
          this.config.apiEndpoint,
          JSON.stringify(payload)
        );
      } else {
        await fetch(this.config.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
      }
    } catch (e) {
      // Re-queue errors on failure (but don't exceed max)
      if (this.queue.length < this.config.maxQueueSize) {
        this.queue.push(...errors.slice(0, this.config.maxQueueSize - this.queue.length));
      }
      console.debug('[ErrorTracker] Failed to send errors:', e);
    }
  }

  /**
   * Update configuration
   */
  configure(config: Partial<ErrorTrackerConfig>): void {
    this.config = { ...this.config, ...config };

    // Restart flush timer if interval changed
    if (config.flushIntervalMs && this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = setInterval(() => {
        this.flush();
      }, this.config.flushIntervalMs);
    }
  }

  /**
   * Set the current user ID
   */
  setUserId(userId: number | undefined): void {
    this.config.userId = userId;
  }

  /**
   * Disable error tracking
   */
  disable(): void {
    this.config.enabled = false;
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Enable error tracking
   */
  enable(): void {
    this.config.enabled = true;
    if (!this.initialized) {
      this.init();
    } else if (!this.flushTimer) {
      this.flushTimer = setInterval(() => {
        this.flush();
      }, this.config.flushIntervalMs);
    }
  }

  // ============ Private Methods ============

  private generateSessionId(): string {
    // Use existing session ID if available
    const stored = sessionStorage.getItem('error_tracker_session');
    if (stored) {
      return stored;
    }

    // Generate new session ID
    const sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    sessionStorage.setItem('error_tracker_session', sessionId);
    return sessionId;
  }

  private generateErrorHash(message: string, stack?: string): string {
    // Simple hash based on message and first stack line
    const firstStackLine = stack?.split('\n')[1] || '';
    const content = `${message}|${firstStackLine}`;

    // Simple string hash
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  private getBrowserInfo(): ClientError['browserInfo'] {
    const ua = navigator.userAgent;

    // Parse browser info
    let browser = 'Unknown';
    let version = '';
    let os = 'Unknown';
    let device = 'Desktop';

    // Browser detection
    if (ua.includes('Firefox/')) {
      browser = 'Firefox';
      version = ua.match(/Firefox\/(\d+)/)?.[1] || '';
    } else if (ua.includes('Chrome/')) {
      browser = 'Chrome';
      version = ua.match(/Chrome\/(\d+)/)?.[1] || '';
    } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
      browser = 'Safari';
      version = ua.match(/Version\/(\d+)/)?.[1] || '';
    } else if (ua.includes('Edge/')) {
      browser = 'Edge';
      version = ua.match(/Edge\/(\d+)/)?.[1] || '';
    }

    // OS detection
    if (ua.includes('Windows')) {
      os = 'Windows';
    } else if (ua.includes('Mac OS')) {
      os = 'macOS';
    } else if (ua.includes('Linux')) {
      os = 'Linux';
    } else if (ua.includes('Android')) {
      os = 'Android';
      device = 'Mobile';
    } else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) {
      os = 'iOS';
      device = ua.includes('iPad') ? 'Tablet' : 'Mobile';
    }

    // Mobile detection
    if (/Mobile|Android|iPhone|iPad/i.test(ua) && device === 'Desktop') {
      device = 'Mobile';
    }

    return {
      userAgent: ua,
      language: navigator.language,
      platform: navigator.platform,
      screenSize: `${window.screen.width}x${window.screen.height}`,
      browser,
      version,
      os,
      device,
    };
  }
}

// Create singleton instance
export const errorTracker = new ErrorTracker({
  apiEndpoint: `${import.meta.env.VITE_API_BASE_URL || ''}/bug-tracking/errors/client`,
  environment: import.meta.env.MODE,
  appVersion: import.meta.env.VITE_APP_VERSION,
});

// Auto-initialize in production
if (import.meta.env.PROD) {
  errorTracker.init();
}

export default errorTracker;
