/**
 * React Query hooks for AI and Infrastructure Monitoring
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { http } from '../http';

// ============================================================================
// Types
// ============================================================================

export interface AIUsageSummary {
  totalCalls: number;
  totalTokens: number;
  totalCost: number;
  avgLatencyMs: number;
  successRate: number;
  topTools: Array<{ toolId: string; calls: number; cost: number }>;
  topModels: Array<{ model: string; calls: number; cost: number }>;
}

export interface AIUsageTrend {
  date: string;
  calls: number;
  tokens: number;
  cost: number;
}

export interface AICostBreakdown {
  byTool: Array<{ toolId: string; cost: number; percentage: number }>;
  byModel: Array<{ model: string; cost: number; percentage: number }>;
  byTenant: Array<{ tenantId: string; cost: number; percentage: number }>;
  total: number;
}

export interface RealtimeUsageStats {
  last5Minutes: { calls: number; tokens: number; cost: number };
  last1Hour: { calls: number; tokens: number; cost: number };
  today: { calls: number; tokens: number; cost: number };
  activeTools: string[];
}

export interface InfrastructureMetrics {
  latency: Array<{
    endpoint: string;
    avgMs: number;
    p50Ms: number;
    p95Ms: number;
    p99Ms: number;
    count: number;
  }>;
  errors: Array<{
    endpoint: string;
    errorCount: number;
    totalCount: number;
    errorRate: number;
  }>;
  system: {
    memoryUsedMB: number;
    memoryTotalMB: number;
    memoryUsagePercent: number;
    heapUsedMB: number;
    heapTotalMB: number;
    cpuUsagePercent: number;
    eventLoopLagMs: number;
    uptimeSeconds: number;
  };
  slowQueries: Array<{
    id: string;
    query: string;
    durationMs: number;
    timestamp: string;
  }>;
}

export interface Anomaly {
  id: string;
  type: string;
  category: string;
  severity: string;
  status: string;
  metric: string;
  currentValue: number;
  expectedValue: number;
  deviation: number;
  message: string;
  tenantId?: string;
  toolId?: string;
  detectedAt: string;
  acknowledgedAt?: string;
  acknowledgedByUser?: { id: number; name: string; email: string };
  resolvedAt?: string;
  resolvedByUser?: { id: number; name: string; email: string };
  resolution?: string;
}

export interface AnomalyStats {
  total: number;
  open: number;
  acknowledged: number;
  resolved: number;
  falsePositive: number;
  bySeverity: Record<string, number>;
  byCategory: Record<string, number>;
}

export interface AnomalyRule {
  type: string;
  category: string;
  metric: string;
  method: string;
  severity: string;
  description: string;
}

export interface AlertRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  severity: string[];
  category: string[];
  channel: string;
  recipients: string[];
  throttleMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface AlertHistory {
  id: string;
  ruleId: string;
  anomalyId: string;
  channel: string;
  recipient: string;
  status: string;
  sentAt: string;
  errorMessage?: string;
  rule?: AlertRule;
  anomaly?: Anomaly;
}

// ============================================================================
// AI Monitoring Hooks
// ============================================================================

export function useAIUsageSummary(period: string = 'day') {
  return useQuery({
    queryKey: ['ai-usage-summary', period],
    queryFn: () =>
      http.get<{ data: AIUsageSummary }>(
        `/ai-monitoring/usage/summary?period=${period}`,
      ),
    refetchInterval: 60000,
  });
}

export function useRealtimeUsageStats() {
  return useQuery({
    queryKey: ['ai-usage-realtime'],
    queryFn: () =>
      http.get<{ data: RealtimeUsageStats }>('/ai-monitoring/usage/realtime'),
    refetchInterval: 10000,
  });
}

export function useAICostBreakdown(period: string = 'month') {
  return useQuery({
    queryKey: ['ai-cost-breakdown', period],
    queryFn: () =>
      http.get<{ data: AICostBreakdown }>(
        `/ai-monitoring/costs/breakdown?period=${period}`,
      ),
    refetchInterval: 60000,
  });
}

export function useAIUsageTrends(days: number = 30) {
  return useQuery({
    queryKey: ['ai-usage-trends', days],
    queryFn: () =>
      http.get<{ data: AIUsageTrend[] }>(
        `/ai-monitoring/usage/trends?days=${days}`,
      ),
  });
}

export function useGlobalCostBreakdown(period: string = 'month') {
  return useQuery({
    queryKey: ['ai-global-cost', period],
    queryFn: () =>
      http.get<{ data: AICostBreakdown }>(
        `/ai-monitoring/costs/global?period=${period}`,
      ),
    refetchInterval: 60000,
  });
}

// ============================================================================
// Infrastructure Monitoring Hooks
// ============================================================================

export function useInfrastructureMetrics() {
  return useQuery({
    queryKey: ['infrastructure-metrics'],
    queryFn: () =>
      http.get<{ data: InfrastructureMetrics }>('/monitoring/infrastructure'),
    refetchInterval: 30000,
  });
}

export function useAPILatencyStats() {
  return useQuery({
    queryKey: ['api-latency'],
    queryFn: () =>
      http.get<{ data: InfrastructureMetrics['latency'] }>(
        '/monitoring/infrastructure/latency',
      ),
    refetchInterval: 30000,
  });
}

export function useErrorRates() {
  return useQuery({
    queryKey: ['error-rates'],
    queryFn: () =>
      http.get<{ data: InfrastructureMetrics['errors'] }>(
        '/monitoring/infrastructure/errors',
      ),
    refetchInterval: 30000,
  });
}

export function useSystemHealth() {
  return useQuery({
    queryKey: ['system-health'],
    queryFn: () =>
      http.get<{ data: InfrastructureMetrics['system'] }>(
        '/monitoring/infrastructure/system',
      ),
    refetchInterval: 10000,
  });
}

export function useSlowQueries(limit: number = 50, minDuration: number = 100) {
  return useQuery({
    queryKey: ['slow-queries', limit, minDuration],
    queryFn: () =>
      http.get<{ data: InfrastructureMetrics['slowQueries'] }>(
        `/monitoring/infrastructure/slow-queries?limit=${limit}&minDuration=${minDuration}`,
      ),
    refetchInterval: 60000,
  });
}

// ============================================================================
// Anomaly Detection Hooks
// ============================================================================

export function useAnomalies(filters?: {
  category?: string;
  severity?: string;
  tenantId?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.category) params.set('category', filters.category);
  if (filters?.severity) params.set('severity', filters.severity);
  if (filters?.tenantId) params.set('tenantId', filters.tenantId);

  return useQuery({
    queryKey: ['anomalies', filters],
    queryFn: () =>
      http.get<{ data: Anomaly[] }>(`/monitoring/anomalies?${params}`),
    refetchInterval: 30000,
  });
}

export function useAnomalyStats() {
  return useQuery({
    queryKey: ['anomaly-stats'],
    queryFn: () =>
      http.get<{ data: AnomalyStats }>('/monitoring/anomalies/stats'),
    refetchInterval: 30000,
  });
}

export function useAnomalyRules() {
  return useQuery({
    queryKey: ['anomaly-rules'],
    queryFn: () =>
      http.get<{ data: AnomalyRule[] }>('/monitoring/anomalies/rules'),
  });
}

export function useAnomalyDetail(id: string) {
  return useQuery({
    queryKey: ['anomaly', id],
    queryFn: () => http.get<{ data: Anomaly }>(`/monitoring/anomalies/${id}`),
    enabled: !!id,
  });
}

export function useAcknowledgeAnomaly() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      http.post(`/monitoring/anomalies/${id}/acknowledge`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anomalies'] });
      queryClient.invalidateQueries({ queryKey: ['anomaly-stats'] });
    },
  });
}

export function useResolveAnomaly() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, resolution }: { id: string; resolution?: string }) =>
      http.post(`/monitoring/anomalies/${id}/resolve`, { resolution }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anomalies'] });
      queryClient.invalidateQueries({ queryKey: ['anomaly-stats'] });
    },
  });
}

export function useMarkFalsePositive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      http.post(`/monitoring/anomalies/${id}/false-positive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anomalies'] });
      queryClient.invalidateQueries({ queryKey: ['anomaly-stats'] });
    },
  });
}

export function useRunAnomalyDetection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => http.post('/monitoring/anomalies/detect'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anomalies'] });
      queryClient.invalidateQueries({ queryKey: ['anomaly-stats'] });
    },
  });
}

// ============================================================================
// Alert Management Hooks
// ============================================================================

export function useAlertRules() {
  return useQuery({
    queryKey: ['alert-rules'],
    queryFn: () => http.get<{ data: AlertRule[] }>('/monitoring/alerts/rules'),
  });
}

export function useCreateAlertRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<AlertRule>) =>
      http.post<{ data: AlertRule }>('/monitoring/alerts/rules', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] });
    },
  });
}

export function useUpdateAlertRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AlertRule> }) =>
      http.put(`/monitoring/alerts/rules/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] });
    },
  });
}

export function useDeleteAlertRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => http.delete(`/monitoring/alerts/rules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] });
    },
  });
}

export function useTestAlert() {
  return useMutation({
    mutationFn: (ruleId: string) =>
      http.post<{ success: boolean; message: string }>(
        `/monitoring/alerts/rules/${ruleId}/test`,
      ),
  });
}

export function useAlertHistory(filters?: {
  ruleId?: string;
  status?: string;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.ruleId) params.set('ruleId', filters.ruleId);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.limit) params.set('limit', filters.limit.toString());

  return useQuery({
    queryKey: ['alert-history', filters],
    queryFn: () =>
      http.get<{ data: AlertHistory[] }>(
        `/monitoring/alerts/history?${params}`,
      ),
    refetchInterval: 60000,
  });
}

export function useSendDailyDigest() {
  return useMutation({
    mutationFn: () => http.post('/monitoring/alerts/digest'),
  });
}
