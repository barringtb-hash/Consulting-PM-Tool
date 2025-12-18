/**
 * Bulk Job Processing Service
 *
 * Handles background processing of bulk description generation jobs.
 * Supports progress tracking, error handling, and retry mechanisms.
 */

import { prisma } from '../../../prisma/client';
import { GenerationJobStatus, Marketplace } from '@prisma/client';
import { EventEmitter } from 'events';
import {
  generateDescriptionContent,
  getBrandVoiceProfile,
} from './brand-voice.service';
import { getMatchingTemplate, getTemplateById } from './template.service';

// ============================================================================
// TYPES
// ============================================================================

export interface JobProgress {
  jobId: number;
  status: GenerationJobStatus;
  totalItems: number;
  processedItems: number;
  successfulItems: number;
  failedItems: number;
  currentProduct?: string;
  percentage: number;
  estimatedTimeRemaining?: number;
  errors: JobError[];
}

export interface JobError {
  productId: number;
  productName: string;
  error: string;
  timestamp: Date;
  retryCount: number;
  willRetry: boolean;
}

export interface JobResult {
  jobId: number;
  status: GenerationJobStatus;
  totalItems: number;
  successfulItems: number;
  failedItems: number;
  duration: number;
  errors: JobError[];
  descriptionIds: number[];
}

export interface ProcessingOptions {
  maxRetries?: number;
  retryDelayMs?: number;
  batchSize?: number;
  onProgress?: (progress: JobProgress) => void;
}

// ============================================================================
// JOB PROGRESS EVENT EMITTER
// ============================================================================

class JobProgressEmitter extends EventEmitter {
  private static instance: JobProgressEmitter;

  static getInstance(): JobProgressEmitter {
    if (!JobProgressEmitter.instance) {
      JobProgressEmitter.instance = new JobProgressEmitter();
    }
    return JobProgressEmitter.instance;
  }

  emitProgress(jobId: number, progress: JobProgress): void {
    this.emit(`job:${jobId}:progress`, progress);
    this.emit('job:progress', progress);
  }

  emitComplete(jobId: number, result: JobResult): void {
    this.emit(`job:${jobId}:complete`, result);
    this.emit('job:complete', result);
  }

  emitError(jobId: number, error: JobError): void {
    this.emit(`job:${jobId}:error`, error);
    this.emit('job:error', { jobId, error });
  }
}

export const jobProgressEmitter = JobProgressEmitter.getInstance();

// ============================================================================
// JOB MANAGEMENT
// ============================================================================

/**
 * Get job status and progress
 */
export async function getJobStatus(jobId: number): Promise<JobProgress | null> {
  const job = await prisma.bulkGenerationJob.findUnique({
    where: { id: jobId },
    include: {
      config: {
        select: { accountId: true },
      },
    },
  });

  if (!job) return null;

  const errors: JobError[] = [];
  if (job.errorLog && Array.isArray(job.errorLog)) {
    for (const err of job.errorLog as Array<Record<string, unknown>>) {
      errors.push({
        productId: (err.productId as number) || 0,
        productName: (err.productName as string) || 'Unknown',
        error: (err.error as string) || 'Unknown error',
        timestamp: new Date((err.timestamp as string) || Date.now()),
        retryCount: (err.retryCount as number) || 0,
        willRetry: (err.willRetry as boolean) || false,
      });
    }
  }

  return {
    jobId: job.id,
    status: job.status,
    totalItems: job.totalItems,
    processedItems: job.processedItems,
    successfulItems: job.successfulItems,
    failedItems: job.failedItems,
    percentage:
      job.totalItems > 0
        ? Math.round((job.processedItems / job.totalItems) * 100)
        : 0,
    errors,
  };
}

/**
 * Get all jobs for a config
 */
export async function getJobsForConfig(
  configId: number,
  options: {
    status?: GenerationJobStatus;
    limit?: number;
    offset?: number;
  } = {},
): Promise<{ jobs: JobProgress[]; total: number }> {
  const { status, limit = 20, offset = 0 } = options;

  const where = {
    configId,
    ...(status && { status }),
  };

  const [jobs, total] = await Promise.all([
    prisma.bulkGenerationJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.bulkGenerationJob.count({ where }),
  ]);

  const jobProgress: JobProgress[] = jobs.map((job) => {
    const errors: JobError[] = [];
    if (job.errorLog && Array.isArray(job.errorLog)) {
      for (const err of job.errorLog as Array<Record<string, unknown>>) {
        errors.push({
          productId: (err.productId as number) || 0,
          productName: (err.productName as string) || 'Unknown',
          error: (err.error as string) || 'Unknown error',
          timestamp: new Date((err.timestamp as string) || Date.now()),
          retryCount: (err.retryCount as number) || 0,
          willRetry: (err.willRetry as boolean) || false,
        });
      }
    }

    return {
      jobId: job.id,
      status: job.status,
      totalItems: job.totalItems,
      processedItems: job.processedItems,
      successfulItems: job.successfulItems,
      failedItems: job.failedItems,
      percentage:
        job.totalItems > 0
          ? Math.round((job.processedItems / job.totalItems) * 100)
          : 0,
      errors,
    };
  });

  return { jobs: jobProgress, total };
}

/**
 * Cancel a running job
 */
export async function cancelJob(jobId: number): Promise<boolean> {
  const job = await prisma.bulkGenerationJob.findUnique({
    where: { id: jobId },
  });

  if (!job || !['PENDING', 'IN_PROGRESS'].includes(job.status)) {
    return false;
  }

  await prisma.bulkGenerationJob.update({
    where: { id: jobId },
    data: {
      status: 'CANCELLED',
      completedAt: new Date(),
    },
  });

  return true;
}

/**
 * Retry failed items in a job
 */
export async function retryFailedItems(
  jobId: number,
  options: ProcessingOptions = {},
): Promise<JobResult> {
  const job = await prisma.bulkGenerationJob.findUnique({
    where: { id: jobId },
  });

  if (!job) {
    throw new Error('Job not found');
  }

  if (job.failedItems === 0) {
    throw new Error('No failed items to retry');
  }

  // Get failed product IDs from error log
  const errorLog = (job.errorLog || []) as Array<Record<string, unknown>>;
  const failedProductIds = errorLog.map((e) => e.productId as number);

  // Reset job for retry
  await prisma.bulkGenerationJob.update({
    where: { id: jobId },
    data: {
      status: 'IN_PROGRESS',
      processedItems: job.processedItems - job.failedItems,
      failedItems: 0,
      errorLog: [],
    },
  });

  // Process only failed items
  return processJobItems(jobId, failedProductIds, options);
}

// ============================================================================
// JOB PROCESSING
// ============================================================================

/**
 * Start processing a bulk job
 */
export async function startJobProcessing(
  jobId: number,
  options: ProcessingOptions = {},
): Promise<JobResult> {
  const job = await prisma.bulkGenerationJob.findUnique({
    where: { id: jobId },
    include: {
      config: true,
    },
  });

  if (!job) {
    throw new Error('Job not found');
  }

  if (job.status !== 'PENDING') {
    throw new Error(`Job is not pending (current status: ${job.status})`);
  }

  // Get product IDs from job settings
  const settings = (job.settings || {}) as Record<string, unknown>;
  const productIds = (settings.productIds || []) as number[];

  if (productIds.length === 0) {
    // If no specific products, get all active products for the config
    const products = await prisma.product.findMany({
      where: { configId: job.configId, isActive: true },
      select: { id: true },
    });
    productIds.push(...products.map((p) => p.id));
  }

  // Update job to in progress
  await prisma.bulkGenerationJob.update({
    where: { id: jobId },
    data: {
      status: 'IN_PROGRESS',
      startedAt: new Date(),
      totalItems: productIds.length,
    },
  });

  return processJobItems(jobId, productIds, options);
}

/**
 * Process job items with progress tracking
 */
async function processJobItems(
  jobId: number,
  productIds: number[],
  options: ProcessingOptions = {},
): Promise<JobResult> {
  const {
    maxRetries = 3,
    retryDelayMs = 1000,
    batchSize = 5,
    onProgress,
  } = options;

  const startTime = Date.now();
  const errors: JobError[] = [];
  const descriptionIds: number[] = [];

  // Get job with config
  const job = await prisma.bulkGenerationJob.findUnique({
    where: { id: jobId },
    include: { config: true },
  });

  if (!job) {
    throw new Error('Job not found');
  }

  const marketplace = job.marketplace as Marketplace;
  const targetLanguages = (job.targetLanguages || ['en']) as string[];

  // Get brand voice and template
  const brandVoice = await getBrandVoiceProfile(job.configId);
  const template = job.templateId
    ? await getTemplateById(job.templateId)
    : await getMatchingTemplate(job.configId, marketplace);

  // Process products in batches
  let processedCount = job.processedItems;
  let successCount = job.successfulItems;
  let failedCount = job.failedItems;

  for (let i = 0; i < productIds.length; i += batchSize) {
    // Check if job was cancelled
    const currentJob = await prisma.bulkGenerationJob.findUnique({
      where: { id: jobId },
    });

    if (currentJob?.status === 'CANCELLED') {
      break;
    }

    const batch = productIds.slice(i, i + batchSize);

    // Process batch in parallel
    const batchResults = await Promise.allSettled(
      batch.map((productId) =>
        processProductWithRetry(
          job.configId,
          productId,
          marketplace,
          targetLanguages[0] || 'en',
          brandVoice,
          template,
          maxRetries,
          retryDelayMs,
        ),
      ),
    );

    // Process results
    for (let j = 0; j < batchResults.length; j++) {
      const result = batchResults[j];
      const productId = batch[j];
      processedCount++;

      if (result.status === 'fulfilled') {
        successCount++;
        descriptionIds.push(result.value);
      } else {
        failedCount++;
        const product = await prisma.product.findUnique({
          where: { id: productId },
          select: { name: true },
        });

        const error: JobError = {
          productId,
          productName: product?.name || 'Unknown',
          error: result.reason?.message || 'Unknown error',
          timestamp: new Date(),
          retryCount: maxRetries,
          willRetry: false,
        };
        errors.push(error);
        jobProgressEmitter.emitError(jobId, error);
      }
    }

    // Update job progress
    await prisma.bulkGenerationJob.update({
      where: { id: jobId },
      data: {
        processedItems: processedCount,
        successfulItems: successCount,
        failedItems: failedCount,
        lastProcessedIndex: i + batch.length,
        errorLog: errors.map((e) => ({
          productId: e.productId,
          productName: e.productName,
          error: e.error,
          timestamp: e.timestamp.toISOString(),
          retryCount: e.retryCount,
          willRetry: e.willRetry,
        })),
      },
    });

    // Emit progress
    const progress: JobProgress = {
      jobId,
      status: 'IN_PROGRESS',
      totalItems: productIds.length,
      processedItems: processedCount,
      successfulItems: successCount,
      failedItems: failedCount,
      percentage: Math.round((processedCount / productIds.length) * 100),
      estimatedTimeRemaining: estimateTimeRemaining(
        startTime,
        processedCount,
        productIds.length,
      ),
      errors,
    };

    jobProgressEmitter.emitProgress(jobId, progress);
    if (onProgress) {
      onProgress(progress);
    }
  }

  // Determine final status
  const finalStatus: GenerationJobStatus =
    failedCount === productIds.length
      ? 'FAILED'
      : failedCount > 0
        ? 'COMPLETED_WITH_ERRORS'
        : 'COMPLETED';

  // Update job completion
  await prisma.bulkGenerationJob.update({
    where: { id: jobId },
    data: {
      status: finalStatus,
      completedAt: new Date(),
    },
  });

  const result: JobResult = {
    jobId,
    status: finalStatus,
    totalItems: productIds.length,
    successfulItems: successCount,
    failedItems: failedCount,
    duration: Date.now() - startTime,
    errors,
    descriptionIds,
  };

  jobProgressEmitter.emitComplete(jobId, result);

  return result;
}

/**
 * Process a single product with retry logic
 */
async function processProductWithRetry(
  configId: number,
  productId: number,
  marketplace: Marketplace,
  language: string,
  brandVoice: ReturnType<typeof getBrandVoiceProfile> extends Promise<infer T>
    ? T
    : never,
  template: Awaited<ReturnType<typeof getMatchingTemplate>>,
  maxRetries: number,
  retryDelayMs: number,
): Promise<number> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Get product data
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new Error(`Product not found: ${productId}`);
      }

      // Generate description content
      const content = await generateDescriptionContent(product, {
        marketplace,
        language,
        brandVoiceProfile: brandVoice || undefined,
        template: template || undefined,
      });

      // Create description record
      const description = await prisma.productDescription.create({
        data: {
          productId,
          marketplace,
          language,
          title: content.title,
          shortDescription: content.shortDescription,
          longDescription: content.longDescription,
          bulletPoints: content.bulletPoints,
          keywords: content.keywords,
          metaTitle: content.metaTitle,
          metaDescription: content.metaDescription,
          variant: 'A',
          isControl: true,
        },
      });

      return description.id;
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries) {
        // Wait before retry with exponential backoff
        await sleep(retryDelayMs * Math.pow(2, attempt));
      }
    }
  }

  throw lastError || new Error('Unknown error during processing');
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function estimateTimeRemaining(
  startTime: number,
  processedItems: number,
  totalItems: number,
): number | undefined {
  if (processedItems === 0) return undefined;

  const elapsed = Date.now() - startTime;
  const avgTimePerItem = elapsed / processedItems;
  const remainingItems = totalItems - processedItems;

  return Math.round(avgTimePerItem * remainingItems);
}

// ============================================================================
// JOB CREATION HELPERS
// ============================================================================

/**
 * Create a new bulk generation job
 */
export async function createBulkJob(
  configId: number,
  options: {
    productIds?: number[];
    marketplace?: Marketplace;
    templateId?: number;
    targetLanguages?: string[];
  } = {},
): Promise<number> {
  const { productIds, marketplace, templateId, targetLanguages } = options;

  // If no specific products, count all active products
  let totalItems = productIds?.length || 0;
  if (!productIds) {
    totalItems = await prisma.product.count({
      where: { configId, isActive: true },
    });
  }

  const job = await prisma.bulkGenerationJob.create({
    data: {
      configId,
      status: 'PENDING',
      totalItems,
      marketplace: marketplace || 'GENERIC',
      templateId,
      targetLanguages: targetLanguages || ['en'],
      settings: {
        productIds: productIds || [],
      },
    },
  });

  return job.id;
}

/**
 * Create and immediately start processing a bulk job
 */
export async function createAndStartBulkJob(
  configId: number,
  options: {
    productIds?: number[];
    marketplace?: Marketplace;
    templateId?: number;
    targetLanguages?: string[];
    processingOptions?: ProcessingOptions;
  } = {},
): Promise<JobResult> {
  const { processingOptions, ...createOptions } = options;

  const jobId = await createBulkJob(configId, createOptions);

  // Start processing in background
  return startJobProcessing(jobId, processingOptions);
}
