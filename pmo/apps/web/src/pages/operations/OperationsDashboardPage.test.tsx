import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

import { OperationsDashboardPage } from './OperationsDashboardPage';

// Mock window.matchMedia for dark mode detection
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock hook return values
let mockRealtimeStats = {
  data: null,
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
};

let mockCostBreakdown = {
  data: null,
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
};

let mockSystemHealth = {
  data: null,
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
};

let mockAnomalyStats = {
  data: null,
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
};

let mockAlertHistory = {
  data: null,
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
};

let mockAssistantHealth = {
  isSuccess: false,
};

vi.mock('../../api/hooks/useMonitoring', () => ({
  useRealtimeUsageStats: () => mockRealtimeStats,
  useAICostBreakdown: () => mockCostBreakdown,
  useSystemHealth: () => mockSystemHealth,
  useAnomalyStats: () => mockAnomalyStats,
  useAlertHistory: () => mockAlertHistory,
  useMonitoringAssistantHealth: () => mockAssistantHealth,
}));

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function renderWithProviders(component: React.ReactElement) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/operations']}>{component}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('OperationsDashboardPage', () => {
  beforeEach(() => {
    // Reset mocks to default state
    mockRealtimeStats = {
      data: null,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };
    mockCostBreakdown = {
      data: null,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };
    mockSystemHealth = {
      data: null,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };
    mockAnomalyStats = {
      data: null,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };
    mockAlertHistory = {
      data: null,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };
    mockAssistantHealth = {
      isSuccess: false,
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the dashboard header', () => {
    renderWithProviders(<OperationsDashboardPage />);

    expect(screen.getByText('Operations Dashboard')).toBeInTheDocument();
    expect(
      screen.getByText(
        'AI usage, infrastructure health, and system monitoring',
      ),
    ).toBeInTheDocument();
  });

  describe('Loading States', () => {
    it('shows loading skeletons for StatCards when data is loading', () => {
      mockRealtimeStats = {
        ...mockRealtimeStats,
        isLoading: true,
      };
      mockCostBreakdown = {
        ...mockCostBreakdown,
        isLoading: true,
      };
      mockAnomalyStats = {
        ...mockAnomalyStats,
        isLoading: true,
      };
      mockSystemHealth = {
        ...mockSystemHealth,
        isLoading: true,
      };

      renderWithProviders(<OperationsDashboardPage />);

      // Check that skeleton elements are present (animate-pulse divs)
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('shows loading skeleton for Real-time AI Usage card', () => {
      mockRealtimeStats = {
        ...mockRealtimeStats,
        isLoading: true,
      };

      renderWithProviders(<OperationsDashboardPage />);

      expect(screen.getByText('Real-time AI Usage')).toBeInTheDocument();
      // Check for skeleton loaders within the card
      const card = screen.getByText('Real-time AI Usage').closest('.p-6');
      expect(card?.querySelectorAll('.animate-pulse').length).toBeGreaterThan(
        0,
      );
    });

    it('shows loading skeleton for Anomalies card', () => {
      mockAnomalyStats = {
        ...mockAnomalyStats,
        isLoading: true,
      };

      renderWithProviders(<OperationsDashboardPage />);

      expect(screen.getByText('Anomalies')).toBeInTheDocument();
    });

    it('shows loading skeleton for System Health card', () => {
      mockSystemHealth = {
        ...mockSystemHealth,
        isLoading: true,
      };

      renderWithProviders(<OperationsDashboardPage />);

      expect(screen.getByText('System Health')).toBeInTheDocument();
    });

    it('shows loading skeleton for Recent Alerts card', () => {
      mockAlertHistory = {
        ...mockAlertHistory,
        isLoading: true,
      };

      renderWithProviders(<OperationsDashboardPage />);

      expect(screen.getByText('Recent Alerts')).toBeInTheDocument();
    });

    it('shows loading skeleton for Cost Breakdown card', () => {
      mockCostBreakdown = {
        ...mockCostBreakdown,
        isLoading: true,
      };

      renderWithProviders(<OperationsDashboardPage />);

      expect(screen.getByText('Monthly Cost Breakdown')).toBeInTheDocument();
    });
  });

  describe('Error States', () => {
    it('shows error state for StatCards when API fails', () => {
      mockRealtimeStats = {
        ...mockRealtimeStats,
        isError: true,
      };

      renderWithProviders(<OperationsDashboardPage />);

      // Check for error badge on the StatCard
      const errorBadges = screen.getAllByText('Error');
      expect(errorBadges.length).toBeGreaterThan(0);
    });

    it('shows error state for Real-time AI Usage card', () => {
      mockRealtimeStats = {
        ...mockRealtimeStats,
        isError: true,
      };

      renderWithProviders(<OperationsDashboardPage />);

      expect(screen.getByText('Failed to load usage data')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /retry/i }),
      ).toBeInTheDocument();
    });

    it('calls refetch when retry button is clicked for Real-time AI Usage', () => {
      const mockRefetch = vi.fn();
      mockRealtimeStats = {
        ...mockRealtimeStats,
        isError: true,
        refetch: mockRefetch,
      };

      renderWithProviders(<OperationsDashboardPage />);

      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    it('shows error state for Anomalies card', () => {
      mockAnomalyStats = {
        ...mockAnomalyStats,
        isError: true,
      };

      renderWithProviders(<OperationsDashboardPage />);

      expect(
        screen.getByText('Failed to load anomaly data'),
      ).toBeInTheDocument();
    });

    it('calls refetch when retry button is clicked for Anomalies', () => {
      const mockRefetch = vi.fn();
      mockAnomalyStats = {
        ...mockAnomalyStats,
        isError: true,
        refetch: mockRefetch,
      };

      renderWithProviders(<OperationsDashboardPage />);

      const retryButtons = screen.getAllByRole('button', { name: /retry/i });
      // Find the retry button in the Anomalies card
      const anomalyRetry = retryButtons.find(
        (btn) =>
          btn.closest('.p-6')?.querySelector('span')?.textContent ===
          'Failed to load anomaly data',
      );
      if (anomalyRetry) fireEvent.click(anomalyRetry);

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    it('shows error state for System Health card', () => {
      mockSystemHealth = {
        ...mockSystemHealth,
        isError: true,
      };

      renderWithProviders(<OperationsDashboardPage />);

      expect(
        screen.getByText('Failed to load system health'),
      ).toBeInTheDocument();
    });

    it('calls refetch when retry button is clicked for System Health', () => {
      const mockRefetch = vi.fn();
      mockSystemHealth = {
        ...mockSystemHealth,
        isError: true,
        refetch: mockRefetch,
      };

      renderWithProviders(<OperationsDashboardPage />);

      const retryButtons = screen.getAllByRole('button', { name: /retry/i });
      const healthRetry = retryButtons.find(
        (btn) =>
          btn.closest('.p-6')?.querySelector('span')?.textContent ===
          'Failed to load system health',
      );
      if (healthRetry) fireEvent.click(healthRetry);

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    it('shows error state for Recent Alerts card', () => {
      mockAlertHistory = {
        ...mockAlertHistory,
        isError: true,
      };

      renderWithProviders(<OperationsDashboardPage />);

      expect(screen.getByText('Failed to load alerts')).toBeInTheDocument();
    });

    it('calls refetch when retry button is clicked for Recent Alerts', () => {
      const mockRefetch = vi.fn();
      mockAlertHistory = {
        ...mockAlertHistory,
        isError: true,
        refetch: mockRefetch,
      };

      renderWithProviders(<OperationsDashboardPage />);

      const retryButtons = screen.getAllByRole('button', { name: /retry/i });
      const alertRetry = retryButtons.find(
        (btn) =>
          btn.closest('.p-6')?.querySelector('span')?.textContent ===
          'Failed to load alerts',
      );
      if (alertRetry) fireEvent.click(alertRetry);

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    it('shows error state for Cost Breakdown card', () => {
      mockCostBreakdown = {
        ...mockCostBreakdown,
        isError: true,
      };

      renderWithProviders(<OperationsDashboardPage />);

      expect(screen.getByText('Failed to load cost data')).toBeInTheDocument();
    });

    it('calls refetch when retry button is clicked for Cost Breakdown', () => {
      const mockRefetch = vi.fn();
      mockCostBreakdown = {
        ...mockCostBreakdown,
        isError: true,
        refetch: mockRefetch,
      };

      renderWithProviders(<OperationsDashboardPage />);

      const retryButtons = screen.getAllByRole('button', { name: /retry/i });
      const costRetry = retryButtons.find(
        (btn) =>
          btn.closest('.p-6')?.querySelector('span')?.textContent ===
          'Failed to load cost data',
      );
      if (costRetry) fireEvent.click(costRetry);

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Data Display', () => {
    it('displays AI calls data when loaded', () => {
      mockRealtimeStats = {
        data: {
          data: {
            today: { calls: 1234, tokens: 567890 },
            last5Minutes: { calls: 12, tokens: 1234 },
            last1Hour: { calls: 100, tokens: 12345 },
            activeTools: ['chatbot', 'document-analyzer'],
          },
        },
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      };

      renderWithProviders(<OperationsDashboardPage />);

      // Check that the AI calls value appears (may appear multiple times in StatCard and detail card)
      const callElements = screen.getAllByText('1,234');
      expect(callElements.length).toBeGreaterThan(0);
      expect(screen.getByText('567,890 tokens')).toBeInTheDocument();
    });

    it('displays cost breakdown data when loaded', () => {
      mockCostBreakdown = {
        data: {
          data: {
            total: 250.5,
            byTool: [{ toolId: 'chatbot', cost: 150.25, percentage: 60 }],
            byModel: [{ model: 'gpt-4', cost: 200.5, percentage: 80 }],
          },
        },
        isLoading: false,
        isError: false,
      };

      renderWithProviders(<OperationsDashboardPage />);

      expect(screen.getByText('$250.50')).toBeInTheDocument();
    });

    it('displays anomaly stats when loaded', () => {
      mockAnomalyStats = {
        data: {
          data: {
            open: 5,
            acknowledged: 3,
            resolved: 10,
            falsePositive: 2,
            total: 20,
            bySeverity: { CRITICAL: 1, HIGH: 2, MEDIUM: 2 },
          },
        },
        isLoading: false,
        isError: false,
      };

      renderWithProviders(<OperationsDashboardPage />);

      // Check that the anomaly count is displayed (may appear multiple times)
      const openElements = screen.getAllByText('5');
      expect(openElements.length).toBeGreaterThan(0);
      expect(screen.getByText('20 total detected')).toBeInTheDocument();
    });

    it('displays system health data when loaded', () => {
      mockSystemHealth = {
        data: {
          data: {
            memoryUsagePercent: 65,
            memoryUsedMB: 650,
            memoryTotalMB: 1000,
            cpuUsagePercent: 45,
            eventLoopLagMs: 2.5,
            uptimeSeconds: 7200,
          },
        },
        isLoading: false,
        isError: false,
      };

      renderWithProviders(<OperationsDashboardPage />);

      expect(screen.getByText('65%')).toBeInTheDocument();
      expect(screen.getByText('Memory usage')).toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('shows empty state for alerts when no data', () => {
      mockAlertHistory = {
        data: { data: [] },
        isLoading: false,
        isError: false,
      };

      renderWithProviders(<OperationsDashboardPage />);

      expect(screen.getByText('No recent alerts')).toBeInTheDocument();
    });

    it('shows empty state for cost breakdown when no data', () => {
      mockCostBreakdown = {
        data: null,
        isLoading: false,
        isError: false,
      };

      renderWithProviders(<OperationsDashboardPage />);

      expect(screen.getByText('No cost data available')).toBeInTheDocument();
    });
  });
});
