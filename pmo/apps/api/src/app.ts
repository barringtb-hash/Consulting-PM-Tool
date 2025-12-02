import cors from 'cors';
import express from 'express';
import cookieParser from 'cookie-parser';

import authRouter from './auth/auth.routes';
import assetsRouter from './routes/assets';
import clientsRouter from './routes/clients';
import contactsRouter from './routes/contacts';
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
import productDescriptionRouter from './modules/product-descriptions/product-description.router';
import schedulingRouter from './modules/scheduling/scheduling.router';
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
import projectsRouter from './routes/projects';
import tasksRouter from './routes/task.routes';
import usersRouter from './routes/users';
import { errorHandler } from './middleware/error.middleware';
import { env } from './config/env';
import { isModuleEnabled, logEnabledModules } from './modules/module-config';
import { requireModule } from './middleware/module-guard.middleware';

/**
 * Build CORS origin configuration that supports:
 * 1. Single origin: CORS_ORIGIN=https://example.com
 * 2. Multiple origins: CORS_ORIGIN=https://example.com,https://staging.example.com
 * 3. Vercel preview URLs: Automatically allows *.vercel.app subdomains if any Vercel URL is in the list
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

    // Origin not allowed
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

  // CORS configuration for cross-origin cookie authentication
  // Supports multiple origins and Vercel preview deployments
  // Explicitly allows Authorization header for Safari ITP fallback authentication
  app.use(
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
    }),
  );
  app.use(express.json());
  app.use(cookieParser());

  // ============ CORE ROUTES (always enabled) ============
  app.use('/api', authRouter);
  app.use('/api/clients', clientsRouter);
  app.use('/api/contacts', contactsRouter);
  app.use('/api/documents', documentsRouter);
  app.use('/api/projects', projectsRouter);
  app.use('/api', tasksRouter);
  app.use('/api', milestonesRouter);
  app.use('/api', meetingRouter);
  app.use('/api', featureFlagsRouter); // Module discovery & feature flags API
  app.use('/api/user', userPreferencesRouter); // User preferences API
  app.use(healthRouter);

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

  // ============ AI TOOL MODULES ============
  // AI Tool routes are ALWAYS registered to ensure proper error messages.
  // The requireModule middleware handles runtime access control and returns
  // informative "module not available" errors instead of generic 404s.
  // This ensures users see meaningful errors when accessing AI Tools
  // that aren't enabled in their deployment.

  // Phase 1 AI Tools
  // AI Chatbot module (Tool 1.1) - customer service chatbot
  app.use('/api', requireModule('chatbot'), chatbotRouter);

  // Product Description Generator module (Tool 1.2)
  app.use(
    '/api',
    requireModule('productDescriptions'),
    productDescriptionRouter,
  );

  // AI Scheduling Assistant module (Tool 1.3)
  app.use('/api', requireModule('scheduling'), schedulingRouter);

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

  // Error handling middleware must be last
  app.use(errorHandler);

  return app;
}

export default createApp;
