/**
 * Error Tracker Tests
 *
 * Tests for the client-side error tracking utility that captures
 * browser errors and sends them to the bug tracking API.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Store original globals
const originalFetch = global.fetch;
const originalSessionStorage = global.sessionStorage;

// Mock sessionStorage
const mockSessionStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  };
})();

// Mock fetch
const mockFetch = vi.fn().mockResolvedValue({ ok: true });

// Mock sendBeacon
const mockSendBeacon = vi.fn().mockReturnValue(true);

describe('ErrorTracker', () => {
  let ErrorTrackerModule: typeof import('./error-tracker');
  let errorTracker: typeof import('./error-tracker').errorTracker;
  let unhandledRejectionHandler:
    | ((event: PromiseRejectionEvent) => void)
    | null = null;

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();
    mockSessionStorage.clear();

    // Setup global mocks
    global.fetch = mockFetch;
    Object.defineProperty(global, 'sessionStorage', {
      value: mockSessionStorage,
      writable: true,
    });
    Object.defineProperty(navigator, 'sendBeacon', {
      value: mockSendBeacon,
      writable: true,
      configurable: true,
    });

    // Capture event listeners
    const originalAddEventListener = window.addEventListener;
    vi.spyOn(window, 'addEventListener').mockImplementation(
      (type: string, listener: EventListenerOrEventListenerObject) => {
        if (type === 'unhandledrejection') {
          unhandledRejectionHandler = listener as (
            event: PromiseRejectionEvent,
          ) => void;
        }
        return originalAddEventListener.call(window, type, listener);
      },
    );

    // Reset module cache and re-import to get fresh instance
    vi.resetModules();
    ErrorTrackerModule = await import('./error-tracker');
    errorTracker = ErrorTrackerModule.errorTracker;
  });

  afterEach(() => {
    // Restore globals
    global.fetch = originalFetch;
    Object.defineProperty(global, 'sessionStorage', {
      value: originalSessionStorage,
      writable: true,
    });
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should auto-initialize on import', () => {
      // The error tracker auto-initializes, so window.onerror should be set
      expect(window.onerror).toBeDefined();
    });

    it('should set up unhandledrejection listener', () => {
      expect(window.addEventListener).toHaveBeenCalledWith(
        'unhandledrejection',
        expect.any(Function),
      );
    });

    it('should generate a session ID', () => {
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'error_tracker_session',
        expect.any(String),
      );
    });

    it('should reuse existing session ID if available', async () => {
      // Set up existing session before module loads
      const existingSessionId = 'existing-session-123';
      mockSessionStorage.getItem.mockImplementation((key: string) => {
        if (key === 'error_tracker_session') {
          return existingSessionId;
        }
        return null;
      });

      vi.resetModules();
      const freshModule = await import('./error-tracker');

      // The session ID should be reused, not regenerated
      // Verify by checking that the tracker uses the existing ID
      freshModule.errorTracker.captureException(new Error('Test'));
      freshModule.errorTracker.flush();

      // The error should have the existing session ID
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.errors[0].sessionId).toBe(existingSessionId);
    });

    it('should not initialize twice', () => {
      const onerrorBefore = window.onerror;
      errorTracker.init();
      expect(window.onerror).toBe(onerrorBefore);
    });
  });

  describe('Error Capture from window.onerror', () => {
    it('should capture global JavaScript errors', () => {
      const captureErrorSpy = vi.spyOn(errorTracker, 'captureError');

      // Trigger window.onerror
      if (window.onerror) {
        window.onerror(
          'Test error message',
          'http://localhost/test.js',
          10,
          5,
          new Error('Test error'),
        );
      }

      expect(captureErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Test error message',
          source: 'window.onerror',
          line: 10,
          column: 5,
        }),
      );
    });

    it('should not suppress errors (return false)', () => {
      if (window.onerror) {
        const result = window.onerror(
          'Test error',
          'http://localhost/test.js',
          1,
          1,
          new Error('Test'),
        );
        expect(result).toBe(false);
      }
    });
  });

  describe('Unhandled Promise Rejection Handling', () => {
    it('should capture unhandled promise rejections', () => {
      const captureErrorSpy = vi.spyOn(errorTracker, 'captureError');

      // Simulate unhandled rejection
      if (unhandledRejectionHandler) {
        const mockEvent = {
          reason: new Error('Promise rejection error'),
        } as PromiseRejectionEvent;
        unhandledRejectionHandler(mockEvent);
      }

      expect(captureErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Promise rejection error',
          source: 'unhandledrejection',
        }),
      );
    });

    it('should handle rejections without error objects', () => {
      const captureErrorSpy = vi.spyOn(errorTracker, 'captureError');

      if (unhandledRejectionHandler) {
        const mockEvent = {
          reason: undefined,
        } as PromiseRejectionEvent;
        unhandledRejectionHandler(mockEvent);
      }

      expect(captureErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Unhandled Promise Rejection',
          source: 'unhandledrejection',
        }),
      );
    });
  });

  describe('Error Deduplication via Hashing', () => {
    it('should not capture duplicate errors within the deduplication window', () => {
      const error1 = new Error('Duplicate error');
      const error2 = new Error('Duplicate error');
      error1.stack = 'Error: Duplicate error\n    at test.js:1:1';
      error2.stack = 'Error: Duplicate error\n    at test.js:1:1';

      errorTracker.captureException(error1);
      errorTracker.captureException(error2);

      // Should only queue one error
      // We can verify by flushing and checking fetch calls
      errorTracker.flush();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.errors).toHaveLength(1);
    });

    it('should capture errors with different messages', () => {
      const error1 = new Error('First error');
      const error2 = new Error('Second error');

      errorTracker.captureException(error1);
      errorTracker.captureException(error2);

      errorTracker.flush();

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.errors).toHaveLength(2);
    });

    it('should capture same message with different stack traces', () => {
      const error1 = new Error('Same message');
      const error2 = new Error('Same message');
      error1.stack = 'Error: Same message\n    at fileA.js:1:1';
      error2.stack = 'Error: Same message\n    at fileB.js:2:2';

      errorTracker.captureException(error1);
      errorTracker.captureException(error2);

      errorTracker.flush();

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.errors).toHaveLength(2);
    });
  });

  describe('Queue Batching and Flushing Behavior', () => {
    it('should batch errors in queue before flushing', () => {
      errorTracker.captureException(new Error('Error 1'));
      errorTracker.captureException(new Error('Error 2'));
      errorTracker.captureException(new Error('Error 3'));

      // Should not have called fetch yet (waiting for flush)
      expect(mockFetch).not.toHaveBeenCalled();

      errorTracker.flush();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.errors).toHaveLength(3);
    });

    it('should auto-flush when queue reaches max size', () => {
      // Default max queue size is 50
      for (let i = 0; i < 50; i++) {
        errorTracker.captureException(new Error(`Error ${i}`));
      }

      // Should have auto-flushed
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should not flush empty queue', async () => {
      await errorTracker.flush();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should use sendBeacon for sync flush (page unload)', () => {
      errorTracker.captureException(new Error('Unload error'));
      errorTracker.flush(true); // sync = true

      expect(mockSendBeacon).toHaveBeenCalled();
    });

    it('should clear queue after successful flush', async () => {
      errorTracker.captureException(new Error('Test error'));
      await errorTracker.flush();

      // Second flush should not send anything
      mockFetch.mockClear();
      await errorTracker.flush();

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should re-queue errors on flush failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      errorTracker.captureException(new Error('Test error'));
      await errorTracker.flush();

      // Errors should be re-queued
      mockFetch.mockResolvedValueOnce({ ok: true });
      await errorTracker.flush();

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('React Error Boundary Integration', () => {
    it('should capture React error boundary errors with component stack', () => {
      const error = new Error('React render error');
      const componentStack = '\n    at ComponentA\n    at ComponentB';

      errorTracker.captureReactError(error, componentStack);
      errorTracker.flush();

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.errors[0]).toMatchObject({
        message: 'React render error',
        source: 'react-error-boundary',
        componentStack: componentStack,
      });
    });
  });

  describe('Configuration', () => {
    it('should allow updating configuration', () => {
      errorTracker.configure({ enabled: false });

      errorTracker.captureException(new Error('Should not capture'));
      errorTracker.flush();

      expect(mockFetch).not.toHaveBeenCalled();

      // Re-enable
      errorTracker.configure({ enabled: true });
    });

    it('should allow setting user ID', () => {
      errorTracker.setUserId(123);
      errorTracker.captureException(new Error('User error'));
      errorTracker.flush();

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.errors[0].userId).toBe(123);
    });

    it('should allow disabling and enabling tracking', () => {
      errorTracker.disable();
      errorTracker.captureException(new Error('Disabled error'));
      errorTracker.flush();

      expect(mockFetch).not.toHaveBeenCalled();

      errorTracker.enable();
      errorTracker.captureException(new Error('Enabled error'));
      errorTracker.flush();

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('Browser Info Collection', () => {
    it('should collect browser information with each error', () => {
      errorTracker.captureException(new Error('Test error'));
      errorTracker.flush();

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      const browserInfo = callBody.errors[0].browserInfo;

      expect(browserInfo).toHaveProperty('userAgent');
      expect(browserInfo).toHaveProperty('language');
      expect(browserInfo).toHaveProperty('platform');
      expect(browserInfo).toHaveProperty('screenSize');
    });
  });

  describe('Manual Error Capture', () => {
    it('should capture manually reported errors', () => {
      errorTracker.captureException(new Error('Manual error'));
      errorTracker.flush();

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.errors[0].source).toBe('manual');
    });

    it('should include error stack trace', () => {
      const error = new Error('Error with stack');
      errorTracker.captureException(error);
      errorTracker.flush();

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.errors[0].stack).toContain('Error with stack');
    });
  });
});
