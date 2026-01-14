/**
 * Marketing Calendar Scheduling Services
 *
 * This module provides backend services for the marketing content
 * calendar and scheduling system. It includes:
 *
 * - **Optimal Scheduling Service**: AI-powered optimal posting time
 *   recommendations based on historical engagement data
 *
 * - **Content Queue Service**: Priority-based queue management for
 *   pending content with auto-scheduling capabilities
 *
 * - **Calendar Service**: Calendar view and content scheduling
 *   operations including bulk scheduling
 *
 * @module modules/marketing/services
 */

// Optimal Scheduling Service
export {
  getOptimalTimes,
  calculateOptimalTime,
  initializeDefaultTimes,
  updateFromEngagement,
  getAllOptimalTimes,
  updateOptimalTime,
  deleteOptimalTime,
  type OptimalTimeSlot,
} from './optimal-scheduling.service';

// Content Queue Service
export {
  getQueue,
  addToQueue,
  removeFromQueue,
  reorderQueue,
  updateQueueItem,
  autoScheduleQueue,
  getQueueStats,
  clearQueue,
  type QueueItem,
  type ScheduledItem,
  type AddToQueueOptions,
} from './content-queue.service';

// Calendar Service
export {
  getCalendarData,
  scheduleContent,
  unscheduleContent,
  bulkSchedule,
  getContentScheduleHistory,
  getUpcomingContent,
  rescheduleContent,
  getAvailableSlots,
  type CalendarEntry,
  type CalendarData,
} from './calendar.service';
