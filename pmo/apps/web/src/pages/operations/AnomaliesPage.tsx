/**
 * Anomalies Management Page
 *
 * View and manage detected anomalies across the system.
 */

import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Filter,
  Play,
  Eye,
  ThumbsDown,
} from 'lucide-react';
import { Card, Badge, Button, Modal } from '../../ui';
import {
  useAnomalies,
  useAnomalyStats,
  useAnomalyRules,
  useAcknowledgeAnomaly,
  useResolveAnomaly,
  useMarkFalsePositive,
  useRunAnomalyDetection,
  Anomaly,
} from '../../api/hooks/useMonitoring';

function getSeverityColor(
  severity: string,
): 'danger' | 'warning' | 'default' | 'success' {
  switch (severity) {
    case 'CRITICAL':
      return 'danger';
    case 'HIGH':
      return 'warning';
    case 'MEDIUM':
      return 'default';
    default:
      return 'success';
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'OPEN':
      return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    case 'ACKNOWLEDGED':
      return <Eye className="w-4 h-4 text-blue-500" />;
    case 'RESOLVED':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'FALSE_POSITIVE':
      return <ThumbsDown className="w-4 h-4 text-neutral-500" />;
    default:
      return <Clock className="w-4 h-4 text-neutral-500" />;
  }
}

function AnomalyDetailModal({
  anomaly,
  isOpen,
  onClose,
  onAcknowledge,
  onResolve,
  onMarkFalsePositive,
}: {
  anomaly: Anomaly | null;
  isOpen: boolean;
  onClose: () => void;
  onAcknowledge: () => void;
  onResolve: (resolution: string) => void;
  onMarkFalsePositive: () => void;
}) {
  const [resolution, setResolution] = useState('');

  if (!anomaly) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Anomaly Details">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-neutral-500">Type</span>
            <div className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
              {anomaly.type}
            </div>
          </div>
          <div>
            <span className="text-sm text-neutral-500">Category</span>
            <div className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
              {anomaly.category}
            </div>
          </div>
          <div>
            <span className="text-sm text-neutral-500">Severity</span>
            <div>
              <Badge variant={getSeverityColor(anomaly.severity)}>
                {anomaly.severity}
              </Badge>
            </div>
          </div>
          <div>
            <span className="text-sm text-neutral-500">Status</span>
            <div className="flex items-center gap-2">
              {getStatusIcon(anomaly.status)}
              <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                {anomaly.status}
              </span>
            </div>
          </div>
        </div>

        <div>
          <span className="text-sm text-neutral-500">Message</span>
          <div className="mt-1 p-3 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-sm text-neutral-700 dark:text-neutral-300">
            {anomaly.message}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 text-center">
            <div className="text-lg font-bold text-neutral-800 dark:text-neutral-200">
              {anomaly.currentValue.toFixed(2)}
            </div>
            <div className="text-xs text-neutral-500">Current Value</div>
          </div>
          <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 text-center">
            <div className="text-lg font-bold text-neutral-800 dark:text-neutral-200">
              {anomaly.expectedValue.toFixed(2)}
            </div>
            <div className="text-xs text-neutral-500">Expected Value</div>
          </div>
          <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 text-center">
            <div className="text-lg font-bold text-neutral-800 dark:text-neutral-200">
              {(anomaly.deviation * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-neutral-500">Deviation</div>
          </div>
        </div>

        <div className="text-xs text-neutral-500">
          Detected: {new Date(anomaly.detectedAt).toLocaleString()}
          {anomaly.acknowledgedAt && (
            <span className="ml-4">
              Acknowledged: {new Date(anomaly.acknowledgedAt).toLocaleString()}
              {anomaly.acknowledgedByUser &&
                ` by ${anomaly.acknowledgedByUser.name}`}
            </span>
          )}
          {anomaly.resolvedAt && (
            <span className="ml-4">
              Resolved: {new Date(anomaly.resolvedAt).toLocaleString()}
              {anomaly.resolvedByUser && ` by ${anomaly.resolvedByUser.name}`}
            </span>
          )}
        </div>

        {anomaly.status === 'OPEN' && (
          <div className="flex gap-2 pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <Button onClick={onAcknowledge} variant="outline" className="gap-2">
              <Eye className="w-4 h-4" />
              Acknowledge
            </Button>
            <Button
              onClick={onMarkFalsePositive}
              variant="outline"
              className="gap-2"
            >
              <ThumbsDown className="w-4 h-4" />
              False Positive
            </Button>
          </div>
        )}

        {anomaly.status === 'ACKNOWLEDGED' && (
          <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <label className="block text-sm text-neutral-600 dark:text-neutral-400 mb-2">
              Resolution Notes
            </label>
            <textarea
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-sm"
              rows={3}
              placeholder="Describe how this was resolved..."
            />
            <div className="flex gap-2 mt-3">
              <Button onClick={() => onResolve(resolution)} className="gap-2">
                <CheckCircle className="w-4 h-4" />
                Mark Resolved
              </Button>
              <Button
                onClick={onMarkFalsePositive}
                variant="outline"
                className="gap-2"
              >
                <ThumbsDown className="w-4 h-4" />
                False Positive
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export function AnomaliesPage(): JSX.Element {
  const [filters, setFilters] = useState<{
    category?: string;
    severity?: string;
  }>({});
  const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null);

  const {
    data: anomalies,
    isLoading: anomaliesLoading,
    refetch,
  } = useAnomalies(filters);
  const { data: stats, isLoading: statsLoading } = useAnomalyStats();
  const { data: rules } = useAnomalyRules();

  const acknowledgeAnomaly = useAcknowledgeAnomaly();
  const resolveAnomaly = useResolveAnomaly();
  const markFalsePositive = useMarkFalsePositive();
  const runDetection = useRunAnomalyDetection();

  const isLoading = anomaliesLoading || statsLoading;

  const handleAcknowledge = async (id: string) => {
    await acknowledgeAnomaly.mutateAsync(id);
    setSelectedAnomaly(null);
  };

  const handleResolve = async (id: string, resolution: string) => {
    await resolveAnomaly.mutateAsync({ id, resolution });
    setSelectedAnomaly(null);
  };

  const handleMarkFalsePositive = async (id: string) => {
    await markFalsePositive.mutateAsync(id);
    setSelectedAnomaly(null);
  };

  return (
    <div className="page-content space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
            Anomaly Detection
          </h1>
          <p className="text-neutral-500 mt-1">
            Monitor and manage detected system anomalies
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => runDetection.mutate()}
            disabled={runDetection.isPending}
            className="gap-2"
          >
            <Play
              className={`w-4 h-4 ${runDetection.isPending ? 'animate-spin' : ''}`}
            />
            Run Detection
          </Button>
          <Button variant="outline" onClick={() => refetch()} className="gap-2">
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <div className="p-4 text-center">
            <div className="text-3xl font-bold text-yellow-600">
              {stats?.data?.open || 0}
            </div>
            <div className="text-sm text-neutral-500 mt-1">Open</div>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <div className="text-3xl font-bold text-blue-600">
              {stats?.data?.acknowledged || 0}
            </div>
            <div className="text-sm text-neutral-500 mt-1">Acknowledged</div>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <div className="text-3xl font-bold text-green-600">
              {stats?.data?.resolved || 0}
            </div>
            <div className="text-sm text-neutral-500 mt-1">Resolved</div>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <div className="text-3xl font-bold text-neutral-600">
              {stats?.data?.total || 0}
            </div>
            <div className="text-sm text-neutral-500 mt-1">Total</div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="p-4 flex flex-wrap gap-4">
          <select
            value={filters.category || ''}
            onChange={(e) =>
              setFilters({ ...filters, category: e.target.value || undefined })
            }
            className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
          >
            <option value="">All Categories</option>
            <option value="COST">Cost</option>
            <option value="USAGE">Usage</option>
            <option value="PERFORMANCE">Performance</option>
            <option value="HEALTH">Health</option>
          </select>
          <select
            value={filters.severity || ''}
            onChange={(e) =>
              setFilters({ ...filters, severity: e.target.value || undefined })
            }
            className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </Card>

      {/* Anomalies List */}
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Open Anomalies
          </h2>
          {anomaliesLoading ? (
            <div className="h-48 flex items-center justify-center">
              <RefreshCw className="w-6 h-6 animate-spin text-primary-500" />
            </div>
          ) : (anomalies?.data?.length || 0) > 0 ? (
            <div className="space-y-3">
              {anomalies?.data?.map((anomaly) => (
                <div
                  key={anomaly.id}
                  className="flex items-center gap-4 p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
                  onClick={() => setSelectedAnomaly(anomaly)}
                >
                  {getStatusIcon(anomaly.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                        {anomaly.type}
                      </span>
                      <Badge variant={getSeverityColor(anomaly.severity)}>
                        {anomaly.severity}
                      </Badge>
                      <Badge variant="default">{anomaly.category}</Badge>
                    </div>
                    <div className="text-sm text-neutral-500 mt-1 truncate">
                      {anomaly.message}
                    </div>
                    <div className="text-xs text-neutral-400 mt-1">
                      {new Date(anomaly.detectedAt).toLocaleString()}
                      {anomaly.toolId && ` • Tool: ${anomaly.toolId}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      {(anomaly.deviation * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-neutral-500">deviation</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
              <h3 className="text-lg font-medium text-neutral-800 dark:text-neutral-200">
                No Open Anomalies
              </h3>
              <p className="text-neutral-500 mt-1">
                All systems are operating within normal parameters
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Detection Rules */}
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-4 flex items-center gap-2">
            <Filter className="w-5 h-5 text-primary-500" />
            Detection Rules
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rules?.data?.map((rule) => (
              <div
                key={rule.type}
                className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-700"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    {rule.type}
                  </span>
                  <Badge variant={getSeverityColor(rule.severity)}>
                    {rule.severity}
                  </Badge>
                </div>
                <div className="text-xs text-neutral-500 mb-2">
                  {rule.category} • {rule.method}
                </div>
                <div className="text-xs text-neutral-600 dark:text-neutral-400">
                  {rule.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Detail Modal */}
      <AnomalyDetailModal
        anomaly={selectedAnomaly}
        isOpen={!!selectedAnomaly}
        onClose={() => setSelectedAnomaly(null)}
        onAcknowledge={() =>
          selectedAnomaly && handleAcknowledge(selectedAnomaly.id)
        }
        onResolve={(resolution) =>
          selectedAnomaly && handleResolve(selectedAnomaly.id, resolution)
        }
        onMarkFalsePositive={() =>
          selectedAnomaly && handleMarkFalsePositive(selectedAnomaly.id)
        }
      />
    </div>
  );
}

export default AnomaliesPage;
