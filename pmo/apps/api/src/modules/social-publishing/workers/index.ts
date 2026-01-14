/**
 * Social Publishing Workers
 *
 * BullMQ workers for handling async social media publishing operations.
 *
 * Workers:
 * - Publish Worker: Processes publishing jobs for individual posts
 * - Scheduled Post Worker: Scans for and queues scheduled posts
 *
 * @module social-publishing/workers
 */

// Publish Worker
export {
  createPublishWorker,
  default as publishWorker,
} from './publish.worker';

// Scheduled Post Worker
export {
  createScheduledPostWorker,
  scheduledPostScanQueue,
  setupScheduledPostScanning,
  triggerScheduledPostScan,
  getScheduledPostScanStatus,
  default as scheduledPostWorker,
} from './scheduled-post.worker';

// Types
export type {
  ScheduledPostScanJobData,
  ScheduledPostScanResult,
} from './scheduled-post.worker';
