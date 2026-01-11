/**
 * CRM Module Exports
 */

// Services
export * as accountService from './services/account.service';
export * as opportunityService from './services/opportunity.service';
export * as activityService from './services/activity.service';

// Routes
export { default as accountRouter } from './routes/account.routes';
export { default as opportunityRouter } from './routes/opportunity.routes';
export { default as activityRouter } from './routes/activity.routes';
