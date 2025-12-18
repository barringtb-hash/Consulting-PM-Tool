/**
 * Bulk Job Management Panel
 *
 * Component for managing bulk product description generation jobs.
 * Features:
 * - CSV upload with validation
 * - CSV export
 * - Job progress tracking with real-time updates
 * - Error reporting and retry
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { buildOptions, ApiError } from '../../api/http';
import { buildApiUrl } from '../../api/config';
import { Button } from '../../ui/Button';
import { Card, CardBody, CardHeader } from '../../ui/Card';
import { Select } from '../../ui/Select';
import { Badge } from '../../ui/Badge';
import { useToast } from '../../ui/Toast';
import {
  Upload,
  Download,
  Play,
  Pause,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  FileText,
  XCircle,
} from 'lucide-react';

// Types
interface JobProgress {
  jobId: number;
  status: string;
  totalItems: number;
  processedItems: number;
  successfulItems: number;
  failedItems: number;
  percentage: number;
  estimatedTimeRemaining?: number;
  errors: JobError[];
}

interface JobError {
  productId: number;
  productName: string;
  error: string;
  timestamp: string;
  retryCount: number;
  willRetry: boolean;
}

interface CSVValidationResult {
  valid: boolean;
  errors: Array<{ row: number; column: string; message: string }>;
  warnings: Array<{ row: number; column: string; message: string }>;
  totalRows: number;
  validRows: number;
}

interface BulkJobPanelProps {
  configId: number;
  onJobComplete?: () => void;
}

// API functions
async function fetchJobs(
  configId: number,
): Promise<{ jobs: JobProgress[]; total: number }> {
  const res = await fetch(
    buildApiUrl(`/product-descriptions/${configId}/bulk-jobs`),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch jobs') as ApiError;
    error.status = res.status;
    throw error;
  }
  return res.json();
}

async function createJob(
  configId: number,
  data: {
    productIds?: number[];
    marketplace?: string;
    templateId?: number;
    targetLanguages?: string[];
  },
): Promise<{ jobId: number }> {
  const res = await fetch(
    buildApiUrl(`/product-descriptions/${configId}/bulk-jobs`),
    buildOptions({
      method: 'POST',
      body: JSON.stringify(data),
    }),
  );
  if (!res.ok) {
    const error = new Error('Failed to create job') as ApiError;
    error.status = res.status;
    throw error;
  }
  return res.json();
}

async function startJob(jobId: number): Promise<void> {
  const res = await fetch(
    buildApiUrl(`/product-descriptions/bulk-jobs/${jobId}/start`),
    buildOptions({ method: 'POST' }),
  );
  if (!res.ok) {
    const error = new Error('Failed to start job') as ApiError;
    error.status = res.status;
    throw error;
  }
}

async function cancelJob(jobId: number): Promise<void> {
  const res = await fetch(
    buildApiUrl(`/product-descriptions/bulk-jobs/${jobId}/cancel`),
    buildOptions({ method: 'POST' }),
  );
  if (!res.ok) {
    const error = new Error('Failed to cancel job') as ApiError;
    error.status = res.status;
    throw error;
  }
}

async function retryJob(jobId: number): Promise<void> {
  const res = await fetch(
    buildApiUrl(`/product-descriptions/bulk-jobs/${jobId}/retry`),
    buildOptions({ method: 'POST' }),
  );
  if (!res.ok) {
    const error = new Error('Failed to retry job') as ApiError;
    error.status = res.status;
    throw error;
  }
}

async function validateCSV(
  configId: number,
  csvContent: string,
): Promise<CSVValidationResult> {
  const res = await fetch(
    buildApiUrl(`/product-descriptions/${configId}/validate-csv`),
    buildOptions({
      method: 'POST',
      body: JSON.stringify({ csvContent }),
    }),
  );
  if (!res.ok) {
    const error = new Error('Failed to validate CSV') as ApiError;
    error.status = res.status;
    throw error;
  }
  return res.json();
}

async function importAndGenerate(
  configId: number,
  csvContent: string,
  options: { marketplace?: string; templateId?: number },
): Promise<{ jobId: number; validation: CSVValidationResult }> {
  const res = await fetch(
    buildApiUrl(`/product-descriptions/${configId}/import-and-generate`),
    buildOptions({
      method: 'POST',
      body: JSON.stringify({ csvContent, ...options }),
    }),
  );
  if (!res.ok) {
    const error = new Error('Failed to import CSV') as ApiError;
    error.status = res.status;
    throw error;
  }
  return res.json();
}

async function exportCSV(
  configId: number,
  options: { marketplace?: string; includeMetrics?: boolean },
): Promise<string> {
  const params = new URLSearchParams();
  if (options.marketplace) params.append('marketplace', options.marketplace);
  if (options.includeMetrics)
    params.append('includeMetrics', String(options.includeMetrics));

  const res = await fetch(
    buildApiUrl(
      `/product-descriptions/${configId}/export?${params.toString()}`,
    ),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to export CSV') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.csv;
}

async function downloadTemplate(): Promise<string> {
  const res = await fetch(
    buildApiUrl('/product-descriptions/csv-template'),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to get template') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.template;
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const variants: Record<
    string,
    'default' | 'primary' | 'success' | 'warning' | 'danger'
  > = {
    PENDING: 'default',
    IN_PROGRESS: 'primary',
    COMPLETED: 'success',
    COMPLETED_WITH_ERRORS: 'warning',
    FAILED: 'danger',
    CANCELLED: 'default',
  };

  const icons: Record<string, React.ReactNode> = {
    PENDING: <Clock className="w-3 h-3" />,
    IN_PROGRESS: <Loader2 className="w-3 h-3 animate-spin" />,
    COMPLETED: <CheckCircle className="w-3 h-3" />,
    COMPLETED_WITH_ERRORS: <AlertCircle className="w-3 h-3" />,
    FAILED: <XCircle className="w-3 h-3" />,
    CANCELLED: <XCircle className="w-3 h-3" />,
  };

  return (
    <Badge variant={variants[status] || 'default'} className="gap-1">
      {icons[status]}
      {status.replace(/_/g, ' ')}
    </Badge>
  );
}

// Progress bar component
function ProgressBar({
  percentage,
  successRate,
}: {
  percentage: number;
  successRate: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-neutral-600 dark:text-neutral-400">
        <span className="font-medium">{percentage}% complete</span>
        <span>{successRate}% success rate</span>
      </div>
      <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary-500 dark:bg-primary-400 transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export function BulkJobPanel({
  configId,
  onJobComplete,
}: BulkJobPanelProps): JSX.Element {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [validation, setValidation] = useState<CSVValidationResult | null>(
    null,
  );
  const [selectedMarketplace, setSelectedMarketplace] = useState('GENERIC');
  const [_streamingJobId, setStreamingJobId] = useState<number | null>(null);
  const [liveProgress, setLiveProgress] = useState<JobProgress | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // SSE streaming for real-time progress - defined early for use in mutations
  const stopStreaming = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setStreamingJobId(null);
    setLiveProgress(null);
  }, []);

  const startStreaming = useCallback(
    (jobId: number) => {
      stopStreaming();
      setStreamingJobId(jobId);

      const url = buildApiUrl(
        `/product-descriptions/bulk-jobs/${jobId}/progress/stream`,
      );
      const eventSource = new EventSource(url, { withCredentials: true });
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          const progress = JSON.parse(event.data) as JobProgress;
          setLiveProgress(progress);
        } catch {
          // Ignore parse errors
        }
      };

      eventSource.addEventListener('complete', (event) => {
        try {
          const result = JSON.parse((event as MessageEvent).data);
          setLiveProgress(result);
          stopStreaming();
          queryClient.invalidateQueries({ queryKey: ['bulk-jobs', configId] });
          if (onJobComplete) {
            onJobComplete();
          }
        } catch {
          // Ignore parse errors
        }
      });

      eventSource.addEventListener('error', () => {
        stopStreaming();
      });
    },
    [configId, onJobComplete, queryClient, stopStreaming],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStreaming();
    };
  }, [stopStreaming]);

  // Query for jobs list
  const jobsQuery = useQuery({
    queryKey: ['bulk-jobs', configId],
    queryFn: () => fetchJobs(configId),
    refetchInterval: 5000, // Poll every 5 seconds
  });

  // Mutations
  const createJobMutation = useMutation({
    mutationFn: (data: Parameters<typeof createJob>[1]) =>
      createJob(configId, data),
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ['bulk-jobs', configId] });
      showToast('Job created successfully', 'success');
      // Auto-start the job
      await startJob(result.jobId);
      startStreaming(result.jobId);
    },
    onError: (error) => {
      showToast(
        error instanceof Error ? error.message : 'Failed to create job',
        'error',
      );
    },
  });

  const importMutation = useMutation({
    mutationFn: ({
      csv,
      options,
    }: {
      csv: string;
      options: { marketplace?: string };
    }) => importAndGenerate(configId, csv, options),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['bulk-jobs', configId] });
      setShowUploadModal(false);
      setCsvContent('');
      setValidation(null);
      showToast(
        `Imported ${result.validation.validRows} products. Job started.`,
        'success',
      );
      startStreaming(result.jobId);
    },
    onError: (error) => {
      showToast(
        error instanceof Error ? error.message : 'Failed to import',
        'error',
      );
    },
  });

  const validateMutation = useMutation({
    mutationFn: (csv: string) => validateCSV(configId, csv),
    onSuccess: (result) => {
      setValidation(result);
      if (result.valid) {
        showToast('CSV is valid', 'success');
      } else {
        showToast(`CSV has ${result.errors.length} errors`, 'error');
      }
    },
    onError: (error) => {
      showToast(
        error instanceof Error ? error.message : 'Validation failed',
        'error',
      );
    },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bulk-jobs', configId] });
      showToast('Job cancelled', 'success');
      stopStreaming();
    },
    onError: (error) => {
      showToast(
        error instanceof Error ? error.message : 'Failed to cancel job',
        'error',
      );
    },
  });

  const retryMutation = useMutation({
    mutationFn: retryJob,
    onSuccess: (_, jobId) => {
      queryClient.invalidateQueries({ queryKey: ['bulk-jobs', configId] });
      showToast('Retry started', 'success');
      startStreaming(jobId);
    },
    onError: (error) => {
      showToast(
        error instanceof Error ? error.message : 'Failed to retry job',
        'error',
      );
    },
  });

  // File upload handler
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvContent(content);
      setValidation(null);
    };
    reader.readAsText(file);
  };

  // Download handlers
  const handleDownloadTemplate = async () => {
    try {
      const template = await downloadTemplate();
      const blob = new Blob([template], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'product-descriptions-template.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (_error) {
      showToast('Failed to download template', 'error');
    }
  };

  const handleExport = async () => {
    try {
      const csv = await exportCSV(configId, {
        marketplace:
          selectedMarketplace !== 'ALL' ? selectedMarketplace : undefined,
        includeMetrics: true,
      });
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `product-descriptions-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Export downloaded', 'success');
    } catch (_error) {
      showToast('Failed to export', 'error');
    }
  };

  const jobs = jobsQuery.data?.jobs ?? [];

  // Get active job for progress display
  const activeJob =
    liveProgress || jobs.find((j) => j.status === 'IN_PROGRESS');

  return (
    <div className="space-y-6 mt-6">
      {/* Actions Bar */}
      <Card>
        <CardBody className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Import/Export Actions */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() => setShowUploadModal(true)}
              >
                <Upload className="w-4 h-4" />
                Import CSV
              </Button>
              <Button variant="secondary" onClick={handleExport}>
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
              <Button variant="secondary" onClick={handleDownloadTemplate}>
                <FileText className="w-4 h-4" />
                Download Template
              </Button>
            </div>

            {/* Generate Actions */}
            <div className="flex gap-3 items-center sm:ml-auto">
              <Select
                value={selectedMarketplace}
                onChange={(e) => setSelectedMarketplace(e.target.value)}
                className="w-44"
              >
                <option value="ALL">All Marketplaces</option>
                <option value="GENERIC">Generic</option>
                <option value="AMAZON">Amazon</option>
                <option value="EBAY">eBay</option>
                <option value="SHOPIFY">Shopify</option>
                <option value="ETSY">Etsy</option>
                <option value="WALMART">Walmart</option>
              </Select>
              <Button
                onClick={() =>
                  createJobMutation.mutate({
                    marketplace:
                      selectedMarketplace !== 'ALL'
                        ? selectedMarketplace
                        : undefined,
                  })
                }
                disabled={createJobMutation.isPending}
              >
                {createJobMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Generate All
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Active Job Progress */}
      {activeJob && (
        <Card className="border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2 text-neutral-900 dark:text-neutral-100">
                <Loader2 className="w-4 h-4 animate-spin text-primary-600 dark:text-primary-400" />
                Job #{activeJob.jobId} in Progress
              </h3>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => cancelMutation.mutate(activeJob.jobId)}
                disabled={cancelMutation.isPending}
              >
                <Pause className="w-3 h-3" />
                Cancel
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            <ProgressBar
              percentage={activeJob.percentage}
              successRate={
                activeJob.processedItems > 0
                  ? Math.round(
                      (activeJob.successfulItems / activeJob.processedItems) *
                        100,
                    )
                  : 100
              }
            />
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div className="bg-white/50 dark:bg-neutral-800/50 rounded-lg p-3">
                <span className="text-neutral-500 dark:text-neutral-400 block text-xs mb-1">
                  Total
                </span>
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                  {activeJob.totalItems}
                </span>
              </div>
              <div className="bg-white/50 dark:bg-neutral-800/50 rounded-lg p-3">
                <span className="text-neutral-500 dark:text-neutral-400 block text-xs mb-1">
                  Processed
                </span>
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                  {activeJob.processedItems}
                </span>
              </div>
              <div className="bg-white/50 dark:bg-neutral-800/50 rounded-lg p-3">
                <span className="text-neutral-500 dark:text-neutral-400 block text-xs mb-1">
                  Success
                </span>
                <span className="font-semibold text-green-600 dark:text-green-400">
                  {activeJob.successfulItems}
                </span>
              </div>
              <div className="bg-white/50 dark:bg-neutral-800/50 rounded-lg p-3">
                <span className="text-neutral-500 dark:text-neutral-400 block text-xs mb-1">
                  Failed
                </span>
                <span className="font-semibold text-red-600 dark:text-red-400">
                  {activeJob.failedItems}
                </span>
              </div>
            </div>
            {activeJob.errors.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">
                  Recent Errors:
                </h4>
                <div className="max-h-32 overflow-y-auto space-y-2">
                  {activeJob.errors.slice(-5).map((err, idx) => (
                    <div
                      key={idx}
                      className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-2 rounded-lg"
                    >
                      <span className="font-medium">{err.productName}:</span>{' '}
                      {err.error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Jobs List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
              Recent Jobs
            </h3>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => jobsQuery.refetch()}
              disabled={jobsQuery.isFetching}
              title="Refresh jobs"
            >
              <RefreshCw
                className={`w-3 h-3 ${jobsQuery.isFetching ? 'animate-spin' : ''}`}
              />
            </Button>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {jobs.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-3">
                <Clock className="w-6 h-6 text-neutral-400 dark:text-neutral-500" />
              </div>
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-1">
                No jobs yet
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Import a CSV or click &quot;Generate All&quot; to start.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-700">
              {jobs.map((job) => (
                <div
                  key={job.jobId}
                  className="p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-neutral-900 dark:text-neutral-100">
                        Job #{job.jobId}
                      </span>
                      <StatusBadge status={job.status} />
                    </div>
                    <div className="flex gap-2">
                      {job.status === 'PENDING' && (
                        <Button
                          size="sm"
                          onClick={() => {
                            startJob(job.jobId);
                            startStreaming(job.jobId);
                          }}
                        >
                          <Play className="w-3 h-3" />
                          Start
                        </Button>
                      )}
                      {(job.status === 'COMPLETED_WITH_ERRORS' ||
                        job.status === 'FAILED') &&
                        job.failedItems > 0 && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => retryMutation.mutate(job.jobId)}
                            disabled={retryMutation.isPending}
                          >
                            <RefreshCw className="w-3 h-3" />
                            Retry Failed
                          </Button>
                        )}
                    </div>
                  </div>
                  <div className="text-sm text-neutral-600 dark:text-neutral-400">
                    <span className="text-green-600 dark:text-green-400 font-medium">
                      {job.successfulItems}
                    </span>
                    <span className="text-neutral-400 dark:text-neutral-500">
                      {' '}
                      /{' '}
                    </span>
                    <span>{job.totalItems}</span>
                    <span className="text-neutral-400 dark:text-neutral-500">
                      {' '}
                      successful
                    </span>
                    {job.failedItems > 0 && (
                      <span className="text-red-600 dark:text-red-400 ml-2">
                        ({job.failedItems} failed)
                      </span>
                    )}
                  </div>
                  {job.percentage > 0 && job.percentage < 100 && (
                    <div className="mt-2">
                      <div className="h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-500 dark:bg-primary-400 transition-all duration-300"
                          style={{ width: `${job.percentage}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* CSV Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-5 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                Import CSV
              </h2>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setCsvContent('');
                  setValidation(null);
                }}
                className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <XCircle className="w-5 h-5 text-neutral-500" />
              </button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-xl p-6 text-center hover:border-primary-400 dark:hover:border-primary-500 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Upload className="w-8 h-8 text-neutral-400 dark:text-neutral-500 mx-auto mb-3" />
                <Button
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Select CSV File
                </Button>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                  or drag and drop your CSV file here
                </p>
              </div>

              {csvContent && (
                <>
                  <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-4">
                    <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-2 font-medium">
                      File loaded ({csvContent.split('\n').length - 1} rows)
                    </p>
                    <pre className="text-xs text-neutral-600 dark:text-neutral-400 overflow-x-auto max-h-32 font-mono">
                      {csvContent.slice(0, 500)}
                      {csvContent.length > 500 ? '...' : ''}
                    </pre>
                  </div>

                  <Button
                    variant="secondary"
                    onClick={() => validateMutation.mutate(csvContent)}
                    disabled={validateMutation.isPending}
                    className="w-full"
                  >
                    {validateMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    Validate CSV
                  </Button>

                  {validation && (
                    <div
                      className={`p-4 rounded-lg ${
                        validation.valid
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                      }`}
                    >
                      <div className="font-medium mb-2 flex items-center gap-2">
                        {validation.valid ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <AlertCircle className="w-4 h-4" />
                        )}
                        {validation.valid
                          ? `Valid: ${validation.validRows} products ready for import`
                          : `${validation.errors.length} errors found`}
                      </div>
                      {validation.errors.length > 0 && (
                        <ul className="text-sm space-y-1 ml-6">
                          {validation.errors.slice(0, 5).map((err, idx) => (
                            <li key={idx}>
                              Row {err.row}, {err.column}: {err.message}
                            </li>
                          ))}
                          {validation.errors.length > 5 && (
                            <li className="text-neutral-500 dark:text-neutral-400">
                              ... and {validation.errors.length - 5} more errors
                            </li>
                          )}
                        </ul>
                      )}
                      {validation.warnings.length > 0 && (
                        <div className="mt-3 text-yellow-800 dark:text-yellow-300">
                          <div className="font-medium flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Warnings:
                          </div>
                          <ul className="text-sm space-y-1 ml-5">
                            {validation.warnings
                              .slice(0, 3)
                              .map((warn, idx) => (
                                <li key={idx}>
                                  Row {warn.row}, {warn.column}: {warn.message}
                                </li>
                              ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  <Select
                    label="Target Marketplace"
                    value={selectedMarketplace}
                    onChange={(e) => setSelectedMarketplace(e.target.value)}
                  >
                    <option value="GENERIC">Generic</option>
                    <option value="AMAZON">Amazon</option>
                    <option value="EBAY">eBay</option>
                    <option value="SHOPIFY">Shopify</option>
                    <option value="ETSY">Etsy</option>
                    <option value="WALMART">Walmart</option>
                  </Select>
                </>
              )}
            </div>
            <div className="p-5 border-t border-neutral-200 dark:border-neutral-700 flex justify-end gap-3 bg-neutral-50 dark:bg-neutral-800/50 shrink-0">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowUploadModal(false);
                  setCsvContent('');
                  setValidation(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() =>
                  importMutation.mutate({
                    csv: csvContent,
                    options: { marketplace: selectedMarketplace },
                  })
                }
                disabled={
                  !csvContent ||
                  (validation && !validation.valid) ||
                  importMutation.isPending
                }
              >
                {importMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Import & Generate
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
