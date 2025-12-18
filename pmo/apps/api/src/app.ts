/**
 * Express Application Factory
 *
 * Creates and configures the Express application with all middleware,
 * routes, and error handlers. Uses factory pattern for testability.
 *
 * Middleware Stack (in order):
 * 1. Cookie Parser - Parse cookies for JWT auth
 * 2. CORS - Dynamic CORS based on request path
 * 3. JSON Body Parser - Parse JSON request bodies
 * 4. Health Check - /api/healthz endpoint
 * 5. Public Routes - Unauthenticated endpoints (public leads, widget)
 * 6. Feature Flags - Module availability endpoint
 * 7. Auth Routes - Login/logout/me endpoints
 * 8. Protected Routes - All authenticated API routes
 * 9. Error Handler - Global error handling (must be last)
 *
 * Route Organization:
 * - Core Routes: /api/auth, /api/clients, /api/projects, /api/tasks
 * - CRM Routes: /api/crm/accounts, /api/crm/opportunities, /api/crm/activities
 * - AI Tools: /api/chatbot, /api/document-analyzer, /api/lead-scoring, etc.
 * - Admin Routes: /api/admin/tenants, /api/analytics
 *
 * @module app
 */

import cors from 'cors';
import express from 'express';
import cookieParser from 'cookie-parser';

import authRouter from './auth/auth.routes';
import assetsRouter from './routes/assets';
import clientsRouter from './routes/clients';
// contactsRouter removed - legacy PMO contacts replaced by CRMContact
import documentsRouter from './routes/documents';
import healthRouter from './routes/health';
import leadsRouter from './routes/leads';
import publicLeadsRouter from './routes/public-leads';
import milestonesRouter from './routes/milestone.routes';
import marketingRouter from './modules/marketing/marketing.router';
import meetingRouter from './modules/meetings/meeting.router';
import campaignRouter from './modules/campaigns/campaign.router';
import brandProfileRouter from './modules/brand-profiles/brand-profile.router';
import publishingRouter from './modules/publishing/publishing.router';
import featureFlagsRouter from './modules/feature-flags/feature-flags.router';
import userPreferencesRouter from './modules/user-preferences/user-preferences.router';
import chatbotRouter from './modules/chatbot/chatbot.router';
import chatbotWidgetRouter from './modules/chatbot/widget/widget.router';
import chatbotWebhookRouter from './modules/chatbot/webhooks/webhook.router';
import chatbotChannelRouter from './modules/chatbot/channels/channel.router';
import productDescriptionRouter from './modules/product-descriptions/product-description.router';
import schedulingRouter from './modules/scheduling/scheduling.router';
import bookingRouter from './modules/scheduling/booking.router';
import calendarRouter from './modules/scheduling/calendar.router';
import paymentRouter from './modules/scheduling/payment.router';
import shiftRouter from './modules/scheduling/shift.router';
import intakeRouter from './modules/intake/intake.router';
// Phase 2 AI Tools
import documentAnalyzerRouter from './modules/document-analyzer/document-analyzer.router';
import contentGeneratorRouter from './modules/content-generator/content-generator.router';
import leadScoringRouter from './modules/lead-scoring/lead-scoring.router';
import priorAuthRouter from './modules/prior-auth/prior-auth.router';
// Phase 3 AI Tools
import inventoryForecastingRouter from './modules/inventory-forecasting/inventory-forecasting.router';
import complianceMonitorRouter from './modules/compliance-monitor/compliance-monitor.router';
import predictiveMaintenanceRouter from './modules/predictive-maintenance/predictive-maintenance.router';
import revenueManagementRouter from './modules/revenue-management/revenue-management.router';
import safetyMonitorRouter from './modules/safety-monitor/safety-monitor.router';
// Finance Tracking Module
import { financeRouter } from './modules/finance-tracking';
// MCP Integration
import mcpRouter from './modules/mcp/mcp.router';
// Customer Success Platform
import customerSuccessRouter from './modules/customer-success/customer-success.router';
// CRM Routes
import accountRouter from './crm/routes/account.routes';
import opportunityRouter from './crm/routes/opportunity.routes';
import activityRouter from './crm/routes/activity.routes';
// Tenant Routes
import tenantRouter from './tenant/tenant.routes';
// Notification Routes
import notificationRouter from './notifications/notification.routes';
// CRM Phase 3-6 Routes
import { licensingRouter } from './modules/module-licensing';
import { usageRouter } from './modules/usage';
import { integrationRouter } from './integrations';
import { brandingRouter } from './branding';
import { domainRouter } from './domains';
import { analyticsRouter } from './analytics';
// System Admin Routes
import { tenantAdminRouter } from './admin';
// Audit Routes
import auditRouter from './routes/audit.routes';
// Tenant Health Routes
import tenantHealthRouter from './routes/tenant-health.routes';
import projectsRouter from './routes/projects';
import tasksRouter from './routes/task.routes';
import usersRouter from './routes/users';
import { errorHandler } from './middleware/error.middleware';
import { env } from './config/env';
import { isModuleEnabled, logEnabledModules } from './modules/module-config';
import { requireModule } from './middleware/module-guard.middleware';

/**
 * Check if a request path is a public chatbot widget path.
 * These paths need permissive CORS for embedding on customer websites.
 */
function isWidgetPath(path: string): boolean {
  // Widget script, widget config, and public conversation endpoints
  // Also includes channel webhook endpoints for external services
  const widgetPatterns = [
    /^\/api\/chatbot\/widget\//,
    /^\/api\/chatbot\/embed\//,
    /^\/api\/chatbot\/\d+\/webhooks\//, // Channel webhooks (Twilio, Slack, etc.)
  ];
  return widgetPatterns.some((pattern) => pattern.test(path));
}

/**
 * Check if a request path is a chatbot conversation path.
 * These paths can be accessed both from the dashboard (with credentials)
 * and from embedded widgets (without credentials).
 */
function isConversationPath(path: string): boolean {
  const conversationPatterns = [
    /^\/api\/chatbot\/\d+\/conversations$/,
    /^\/api\/chatbot\/conversations\/[^/]+\/messages$/,
    /^\/api\/chatbot\/conversations\/[^/]+$/,
  ];
  return conversationPatterns.some((pattern) => pattern.test(path));
}

/**
 * Check if an origin is an allowed (first-party) origin
 */
function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true; // No origin (server-to-server, curl, etc.)

  const corsOrigin = env.corsOrigin;
  if (!corsOrigin) return true; // No CORS restriction in dev

  const allowedOrigins = corsOrigin.split(',').map((o) => o.trim());

  // Check exact match
  if (allowedOrigins.includes(origin)) return true;

  // Check Vercel preview URLs if configured
  const hasVercelOrigin = allowedOrigins.some((o) => o.includes('.vercel.app'));
  if (hasVercelOrigin && origin.endsWith('.vercel.app')) return true;

  return false;
}

/**
 * Build CORS origin configuration that supports:
 * 1. Single origin: CORS_ORIGIN=https://example.com
 * 2. Multiple origins: CORS_ORIGIN=https://example.com,https://staging.example.com
 * 3. Vercel preview URLs: Automatically allows *.vercel.app subdomains if any Vercel URL is in the list
 * 4. Widget paths: Allow any origin for chatbot widget embedding
 */
function buildCorsOrigin(): cors.CorsOptions['origin'] {
  const corsOrigin = env.corsOrigin;

  // If no CORS_ORIGIN set, allow all origins (development mode)
  if (!corsOrigin) {
    return true;
  }

  // Parse comma-separated origins
  const allowedOrigins = corsOrigin.split(',').map((o) => o.trim());

  // Check if any allowed origin is a Vercel URL to enable preview URL support
  const hasVercelOrigin = allowedOrigins.some((origin) =>
    origin.includes('.vercel.app'),
  );

  return (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) => {
    // Allow requests with no origin (e.g., mobile apps, curl, Postman)
    if (!origin) {
      callback(null, true);
      return;
    }

    // Check exact match against allowed origins
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    // If Vercel is configured, allow all Vercel preview deployment URLs
    // Preview URLs follow pattern: project-hash-username.vercel.app
    if (hasVercelOrigin && origin.endsWith('.vercel.app')) {
      callback(null, true);
      return;
    }

    // Origin not allowed - log for debugging
    console.warn('CORS blocked origin:', {
      requestedOrigin: origin,
      allowedOrigins,
      hasVercelOrigin,
      hint: hasVercelOrigin
        ? 'Origin does not match any allowed origins or .vercel.app pattern'
        : 'Add a .vercel.app URL to CORS_ORIGIN to allow Vercel preview deployments',
    });
    callback(new Error('Not allowed by CORS'));
  };
}

export function createApp(): express.Express {
  const app = express();

  // Trust the first proxy hop (Render, Vercel, etc.)
  // This enables req.ip to return the correct client IP instead of the proxy's IP
  // Required for rate limiting and security logging to work correctly
  app.set('trust proxy', 1);

  // Log enabled modules at startup
  logEnabledModules();

  // CORS configuration for cross-origin requests
  // Supports multiple origins, Vercel preview deployments, and widget embedding
  // Explicitly allows Authorization header for Safari ITP fallback authentication
  app.use((req, res, next) => {
    const origin = req.get('Origin');

    // For widget paths (scripts, embeds, webhooks), use permissive CORS
    if (isWidgetPath(req.path)) {
      cors({
        origin: true, // Allow any origin for widget paths
        credentials: false, // Widgets don't need credentials
        allowedHeaders: ['Content-Type'],
        exposedHeaders: ['Content-Type'],
        maxAge: 86400,
      })(req, res, next);
    } else if (isConversationPath(req.path)) {
      // Conversation paths can be accessed from both dashboard and widgets
      // Use credentials if request is from allowed origin, otherwise allow any origin
      if (isAllowedOrigin(origin)) {
        // Request from dashboard - use credentialed CORS
        cors({
          origin: buildCorsOrigin(),
          credentials: true,
          allowedHeaders: ['Content-Type', 'Authorization'],
          exposedHeaders: ['Content-Type'],
          maxAge: 86400,
        })(req, res, next);
      } else {
        // Request from third-party widget - use permissive CORS without credentials
        cors({
          origin: true,
          credentials: false,
          allowedHeaders: ['Content-Type'],
          exposedHeaders: ['Content-Type'],
          maxAge: 86400,
        })(req, res, next);
      }
    } else {
      // Standard CORS for API routes
      cors({
        origin: buildCorsOrigin(),
        credentials: true,
        // Explicitly allow Authorization header for Safari ITP fallback
        // Safari's ITP may block cookies, so we use Authorization header as fallback
        // Content-Type is needed for JSON requests
        allowedHeaders: ['Content-Type', 'Authorization'],
        // Allow browser to read these headers from responses
        exposedHeaders: ['Content-Type'],
        // Cache preflight response for 24 hours to reduce OPTIONS requests
        maxAge: 86400,
      })(req, res, next);
    }
  });
  app.use(express.json());
  app.use(cookieParser());

  // ============ CORE ROUTES (always enabled) ============
  app.use('/api', authRouter);
  app.use('/api/clients', clientsRouter);
  // /api/contacts removed - legacy PMO contacts replaced by CRMContact
  app.use('/api/documents', documentsRouter);
  app.use('/api/projects', projectsRouter);
  app.use('/api', tasksRouter);
  app.use('/api', milestonesRouter);
  app.use('/api', meetingRouter);
  app.use('/api', featureFlagsRouter); // Module discovery & feature flags API
  app.use('/api/user', userPreferencesRouter); // User preferences API
  app.use(healthRouter);

  // ============ TENANT ROUTES ============
  // Multi-tenant management routes
  app.use('/api', tenantRouter);

  // ============ NOTIFICATION ROUTES ============
  app.use('/api/notifications', notificationRouter);

  // ============ AUDIT ROUTES ============
  // Audit logs for tracking sensitive operations
  app.use('/api/audit', auditRouter);

  // ============ TENANT HEALTH ROUTES ============
  // Tenant health monitoring and metrics
  app.use('/api/tenant-health', tenantHealthRouter);

  // ============ CRM ROUTES ============
  // CRM module routes for accounts, opportunities, and activities
  app.use('/api/crm/accounts', accountRouter);
  app.use('/api/crm/opportunities', opportunityRouter);
  app.use('/api/crm/activities', activityRouter);

  // ============ CRM PLATFORM ROUTES (Phase 3-6) ============
  // Module licensing and feature gating
  app.use('/api', licensingRouter);

  // Usage metering and tracking
  app.use('/api', usageRouter);

  // Integration hub (OAuth, sync engine)
  app.use('/api', integrationRouter);

  // White-label branding
  app.use('/api', brandingRouter);

  // Custom domain management
  app.use('/api', domainRouter);

  // Analytics and reporting
  app.use('/api', analyticsRouter);

  // ============ TOGGLEABLE MODULE ROUTES ============
  // Routes are conditionally registered AND protected by requireModule middleware
  // for defense-in-depth security

  // Assets module - router defines /assets routes internally
  if (isModuleEnabled('assets')) {
    app.use('/api', requireModule('assets'), assetsRouter);
  }

  // Marketing module - includes marketing content, campaigns, brand profiles, publishing
  // Each router defines its own paths (/marketing-contents, /campaigns, /clients/:id/brand-profile, etc.)
  if (isModuleEnabled('marketing')) {
    app.use('/api', requireModule('marketing'), marketingRouter);
    app.use('/api', requireModule('marketing'), campaignRouter);
    app.use('/api', requireModule('marketing'), brandProfileRouter);
    app.use('/api', requireModule('marketing'), publishingRouter);
  }

  // Leads module - leadsRouter needs /api/leads, publicLeadsRouter needs /api/public
  if (isModuleEnabled('leads')) {
    app.use('/api/leads', requireModule('leads'), leadsRouter);
    app.use('/api/public', requireModule('leads'), publicLeadsRouter);
  }

  // Admin module (user management)
  if (isModuleEnabled('admin')) {
    app.use('/api/users', requireModule('admin'), usersRouter);
  }

  // ============ SYSTEM ADMIN ROUTES ============
  // System admin routes for managing all tenants (requires global ADMIN role)
  // These routes are separate from the admin module and always available
  app.use('/api/admin', tenantAdminRouter);

  // ============ MCP INTEGRATION MODULE ============
  // MCP routes are ALWAYS registered to ensure proper error messages.
  // The requireModule middleware handles runtime access control and returns
  // informative "module not available" errors instead of generic 404s.
  app.use('/api/mcp', requireModule('mcp'), mcpRouter);

  // ============ CUSTOMER SUCCESS PLATFORM ============
  // Customer Success routes - Gainsight-inspired CS platform for SMB
  if (isModuleEnabled('customerSuccess')) {
    app.use(
      '/api/customer-success',
      requireModule('customerSuccess'),
      customerSuccessRouter,
    );
  }

  // ============ AI TOOL MODULES ============
  // AI Tool routes are ALWAYS registered to ensure proper error messages.
  // The requireModule middleware handles runtime access control and returns
  // informative "module not available" errors instead of generic 404s.
  // This ensures users see meaningful errors when accessing AI Tools
  // that aren't enabled in their deployment.

  // Phase 1 AI Tools
  // AI Chatbot module (Tool 1.1) - customer service chatbot
  // Widget routes are public (for embedding on external websites)
  app.use('/api', chatbotWidgetRouter);
  // Channel webhook routes are public (for receiving messages from Twilio, Slack, etc.)
  // Channel management routes require auth
  app.use('/api', chatbotChannelRouter);
  // Webhook routes require auth and module to be enabled
  app.use('/api', requireModule('chatbot'), chatbotWebhookRouter);
  // Main chatbot routes require module to be enabled
  app.use('/api', requireModule('chatbot'), chatbotRouter);

  // Product Description Generator module (Tool 1.2)
  app.use(
    '/api',
    requireModule('productDescriptions'),
    productDescriptionRouter,
  );

  // AI Scheduling Assistant module (Tool 1.3)
  app.use('/api', requireModule('scheduling'), schedulingRouter);

  // Public Booking API (no auth required) - requires scheduling module
  app.use('/api/booking', requireModule('scheduling'), bookingRouter);

  // Calendar Integration API - requires scheduling module
  app.use(
    '/api/scheduling/calendar',
    requireModule('scheduling'),
    calendarRouter,
  );

  // Payment Integration API - requires scheduling module
  app.use(
    '/api/scheduling/payments',
    requireModule('scheduling'),
    paymentRouter,
  );

  // Type B Shift Scheduling API - requires scheduling module
  app.use('/api/scheduling/shifts', requireModule('scheduling'), shiftRouter);

  // Client Intake Automator module (Tool 1.4)
  app.use('/api', requireModule('intake'), intakeRouter);

  // Phase 2 AI Tools
  // Smart Document Analyzer module (Tool 2.1)
  app.use('/api', requireModule('documentAnalyzer'), documentAnalyzerRouter);

  // Content Generation Suite module (Tool 2.2)
  app.use('/api', requireModule('contentGenerator'), contentGeneratorRouter);

  // Lead Scoring & CRM Assistant module (Tool 2.3)
  app.use('/api', requireModule('leadScoring'), leadScoringRouter);

  // Prior Authorization Bot module (Tool 2.4)
  app.use('/api', requireModule('priorAuth'), priorAuthRouter);

  // Phase 3 AI Tools
  // Inventory Forecasting Engine module (Tool 3.1)
  app.use(
    '/api/inventory-forecasting',
    requireModule('inventoryForecasting'),
    inventoryForecastingRouter,
  );

  // Compliance Monitoring System module (Tool 3.2)
  app.use(
    '/api/compliance-monitor',
    requireModule('complianceMonitor'),
    complianceMonitorRouter,
  );

  // Predictive Maintenance Platform module (Tool 3.3)
  app.use(
    '/api/predictive-maintenance',
    requireModule('predictiveMaintenance'),
    predictiveMaintenanceRouter,
  );

  // Revenue Management AI module (Tool 3.4)
  app.use(
    '/api/revenue-management',
    requireModule('revenueManagement'),
    revenueManagementRouter,
  );

  // Safety & Compliance Monitor module (Tool 3.5)
  app.use(
    '/api/safety-monitor',
    requireModule('safetyMonitor'),
    safetyMonitorRouter,
  );

  // ============ FINANCE TRACKING MODULE ============
  // Admin-only module for expense tracking, budgets, and recurring costs
  if (isModuleEnabled('financeTracking')) {
    app.use('/api/finance', requireModule('financeTracking'), financeRouter);
  }

  // Error handling middleware must be last
  app.use(errorHandler);

  return app;
}

export default createApp;
