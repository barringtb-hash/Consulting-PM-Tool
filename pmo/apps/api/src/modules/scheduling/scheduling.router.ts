/**
 * Tool 1.3: AI Scheduling Assistant Router
 *
 * API endpoints for appointment scheduling and management
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { AuthenticatedRequest, requireAuth } from '../../auth/auth.middleware';
import { tenantMiddleware } from '../../tenant/tenant.middleware';
import { hasTenantContext, getTenantId } from '../../tenant/tenant.context';
import * as schedulingService from './scheduling.service';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const configSchema = z.object({
  practiceName: z.string().max(200).optional(),
  timezone: z.string().max(50).optional(),
  minAdvanceBookingHours: z.number().int().min(0).max(168).optional(),
  maxAdvanceBookingDays: z.number().int().min(1).max(365).optional(),
  defaultSlotDurationMin: z.number().int().min(5).max(480).optional(),
  bufferBetweenSlotsMin: z.number().int().min(0).max(60).optional(),
  enableReminders: z.boolean().optional(),
  reminderHoursBefore: z.array(z.number().int().min(0).max(168)).optional(),
  enableNoShowPrediction: z.boolean().optional(),
  noShowThreshold: z.number().min(0).max(1).optional(),
  enableOverbooking: z.boolean().optional(),
  enableWaitlist: z.boolean().optional(),
  isHipaaEnabled: z.boolean().optional(),
});

const providerSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  title: z.string().max(50).optional(),
  specialty: z.string().max(100).optional(),
  externalProviderId: z.string().max(100).optional(),
  npiNumber: z.string().max(20).optional(),
  availabilitySchedule: z
    .record(
      z.string(),
      z.array(
        z.object({
          start: z.string().regex(/^\d{2}:\d{2}$/),
          end: z.string().regex(/^\d{2}:\d{2}$/),
        }),
      ),
    )
    .optional(),
  availabilityOverrides: z.record(z.string(), z.unknown()).optional(),
});

const appointmentTypeSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  durationMinutes: z.number().int().min(5).max(480).optional(),
  price: z.number().min(0).optional(),
  currency: z.string().max(3).optional(),
  requiresDeposit: z.boolean().optional(),
  depositAmount: z.number().min(0).optional(),
  color: z.string().max(20).optional(),
});

const appointmentSchema = z.object({
  providerId: z.number().int().optional(),
  appointmentTypeId: z.number().int().optional(),
  patientName: z.string().min(1).max(200),
  patientEmail: z.string().email().optional(),
  patientPhone: z.string().max(20).optional(),
  scheduledAt: z.string().datetime(),
  durationMinutes: z.number().int().min(5).max(480).optional(),
  notes: z.string().max(2000).optional(),
});

const statusUpdateSchema = z.object({
  status: z.enum([
    'SCHEDULED',
    'CONFIRMED',
    'CHECKED_IN',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
    'NO_SHOW',
    'RESCHEDULED',
  ]),
  notes: z.string().max(2000).optional(),
  cancellationReason: z.string().max(500).optional(),
  cancelledBy: z.string().max(50).optional(),
});

const rescheduleSchema = z.object({
  newScheduledAt: z.string().datetime(),
  newProviderId: z.number().int().optional(),
});

const waitlistSchema = z.object({
  patientName: z.string().min(1).max(200),
  patientEmail: z.string().email().optional(),
  patientPhone: z.string().max(20).optional(),
  preferredProviderId: z.number().int().optional(),
  preferredDays: z.array(z.string()).optional(),
  preferredTimeStart: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  preferredTimeEnd: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
});

// ============================================================================
// CONFIG ROUTES
// ============================================================================

// All routes require authentication and tenant context
router.use(requireAuth);
router.use(tenantMiddleware);

/**
 * GET /api/scheduling/configs
 * List all scheduling configurations (with optional filtering)
 * Supports both accountId (preferred) and clientId (legacy) filtering
 */
router.get(
  '/scheduling/configs',
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const accountId = req.query.accountId
      ? Number(req.query.accountId)
      : undefined;
    if (req.query.accountId && Number.isNaN(accountId)) {
      res.status(400).json({ error: 'Invalid account ID' });
      return;
    }

    const clientId = req.query.clientId
      ? Number(req.query.clientId)
      : undefined;
    if (req.query.clientId && Number.isNaN(clientId)) {
      res.status(400).json({ error: 'Invalid client ID' });
      return;
    }

    const configs = await schedulingService.listSchedulingConfigs({
      accountId,
      clientId,
    });
    res.json({ configs });
  },
);

// ============================================================================
// ACCOUNT-BASED CONFIG ROUTES (Preferred - CRM Integration)
// ============================================================================

/**
 * GET /api/accounts/:accountId/scheduling
 * Get scheduling config for a CRM Account
 */
router.get(
  '/accounts/:accountId/scheduling',
  async (req: AuthenticatedRequest<{ accountId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const accountId = Number(req.params.accountId);
    if (Number.isNaN(accountId)) {
      res.status(400).json({ error: 'Invalid account ID' });
      return;
    }

    const config =
      await schedulingService.getSchedulingConfigByAccount(accountId);
    res.json({ config });
  },
);

/**
 * POST /api/accounts/:accountId/scheduling
 * Create scheduling config for a CRM Account
 */
router.post(
  '/accounts/:accountId/scheduling',
  async (req: AuthenticatedRequest<{ accountId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const accountId = Number(req.params.accountId);
    if (Number.isNaN(accountId)) {
      res.status(400).json({ error: 'Invalid account ID' });
      return;
    }

    const parsed = configSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    try {
      const tenantId = hasTenantContext() ? getTenantId() : undefined;
      const config = await schedulingService.createSchedulingConfigForAccount(
        accountId,
        parsed.data,
        tenantId,
      );
      res.status(201).json({ config });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        res
          .status(409)
          .json({ error: 'Config already exists for this account' });
        return;
      }
      throw error;
    }
  },
);

/**
 * PATCH /api/accounts/:accountId/scheduling
 * Update scheduling config for a CRM Account
 */
router.patch(
  '/accounts/:accountId/scheduling',
  async (req: AuthenticatedRequest<{ accountId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const accountId = Number(req.params.accountId);
    if (Number.isNaN(accountId)) {
      res.status(400).json({ error: 'Invalid account ID' });
      return;
    }

    const parsed = configSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const config = await schedulingService.updateSchedulingConfigByAccount(
      accountId,
      parsed.data,
    );
    res.json({ config });
  },
);

// ============================================================================
// LEGACY CLIENT-BASED CONFIG ROUTES (Deprecated - for backward compatibility)
// ============================================================================

/**
 * GET /api/clients/:clientId/scheduling
 * Get scheduling config for a client
 * @deprecated Use GET /api/accounts/:accountId/scheduling instead
 */
router.get(
  '/clients/:clientId/scheduling',
  async (req: AuthenticatedRequest<{ clientId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const clientId = Number(req.params.clientId);
    if (Number.isNaN(clientId)) {
      res.status(400).json({ error: 'Invalid client ID' });
      return;
    }

    const config = await schedulingService.getSchedulingConfig(clientId);
    res.json({ config });
  },
);

/**
 * POST /api/clients/:clientId/scheduling
 * Create scheduling config for a client
 * @deprecated Use POST /api/accounts/:accountId/scheduling instead
 */
router.post(
  '/clients/:clientId/scheduling',
  async (req: AuthenticatedRequest<{ clientId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const clientId = Number(req.params.clientId);
    if (Number.isNaN(clientId)) {
      res.status(400).json({ error: 'Invalid client ID' });
      return;
    }

    const parsed = configSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    try {
      const config = await schedulingService.createSchedulingConfig(
        clientId,
        parsed.data,
      );
      res.status(201).json({ config });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        res
          .status(409)
          .json({ error: 'Config already exists for this client' });
        return;
      }
      throw error;
    }
  },
);

/**
 * PATCH /api/clients/:clientId/scheduling
 * Update scheduling config for a client
 * @deprecated Use PATCH /api/accounts/:accountId/scheduling instead
 */
router.patch(
  '/clients/:clientId/scheduling',
  async (req: AuthenticatedRequest<{ clientId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const clientId = Number(req.params.clientId);
    if (Number.isNaN(clientId)) {
      res.status(400).json({ error: 'Invalid client ID' });
      return;
    }

    const parsed = configSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const config = await schedulingService.updateSchedulingConfig(
      clientId,
      parsed.data,
    );
    res.json({ config });
  },
);

// ============================================================================
// PROVIDER ROUTES
// ============================================================================

/**
 * GET /api/scheduling/:configId/providers
 * List providers
 */
router.get(
  '/scheduling/:configId/providers',
  async (req: AuthenticatedRequest<{ configId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      res.status(400).json({ error: 'Invalid config ID' });
      return;
    }

    const providers = await schedulingService.getProviders(configId);
    res.json({ providers });
  },
);

/**
 * POST /api/scheduling/:configId/providers
 * Create a provider
 */
router.post(
  '/scheduling/:configId/providers',
  async (req: AuthenticatedRequest<{ configId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      res.status(400).json({ error: 'Invalid config ID' });
      return;
    }

    const parsed = providerSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const provider = await schedulingService.createProvider(configId, {
      ...parsed.data,
      availabilitySchedule: parsed.data
        .availabilitySchedule as Prisma.InputJsonValue,
      availabilityOverrides: parsed.data
        .availabilityOverrides as Prisma.InputJsonValue,
    });
    res.status(201).json({ provider });
  },
);

/**
 * GET /api/scheduling/providers/:id
 * Get a provider
 */
router.get(
  '/scheduling/providers/:id',
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid provider ID' });
      return;
    }

    const provider = await schedulingService.getProvider(id);
    if (!provider) {
      res.status(404).json({ error: 'Provider not found' });
      return;
    }

    res.json({ provider });
  },
);

/**
 * PATCH /api/scheduling/providers/:id
 * Update a provider
 */
router.patch(
  '/scheduling/providers/:id',
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid provider ID' });
      return;
    }

    const parsed = providerSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const provider = await schedulingService.updateProvider(id, {
      ...parsed.data,
      availabilitySchedule: parsed.data
        .availabilitySchedule as Prisma.InputJsonValue,
      availabilityOverrides: parsed.data
        .availabilityOverrides as Prisma.InputJsonValue,
    });
    res.json({ provider });
  },
);

/**
 * DELETE /api/scheduling/providers/:id
 * Delete a provider
 */
router.delete(
  '/scheduling/providers/:id',
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid provider ID' });
      return;
    }

    await schedulingService.deleteProvider(id);
    res.status(204).send();
  },
);

// ============================================================================
// APPOINTMENT TYPE ROUTES
// ============================================================================

/**
 * GET /api/scheduling/:configId/appointment-types
 * List appointment types
 */
router.get(
  '/scheduling/:configId/appointment-types',
  async (req: AuthenticatedRequest<{ configId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      res.status(400).json({ error: 'Invalid config ID' });
      return;
    }

    const types = await schedulingService.getAppointmentTypes(configId);
    res.json({ appointmentTypes: types });
  },
);

/**
 * POST /api/scheduling/:configId/appointment-types
 * Create an appointment type
 */
router.post(
  '/scheduling/:configId/appointment-types',
  async (req: AuthenticatedRequest<{ configId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      res.status(400).json({ error: 'Invalid config ID' });
      return;
    }

    const parsed = appointmentTypeSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const appointmentType = await schedulingService.createAppointmentType(
      configId,
      parsed.data,
    );
    res.status(201).json({ appointmentType });
  },
);

/**
 * PATCH /api/scheduling/appointment-types/:id
 * Update an appointment type
 */
router.patch(
  '/scheduling/appointment-types/:id',
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid appointment type ID' });
      return;
    }

    const parsed = appointmentTypeSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const appointmentType = await schedulingService.updateAppointmentType(
      id,
      parsed.data,
    );
    res.json({ appointmentType });
  },
);

/**
 * DELETE /api/scheduling/appointment-types/:id
 * Delete an appointment type
 */
router.delete(
  '/scheduling/appointment-types/:id',
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid appointment type ID' });
      return;
    }

    await schedulingService.deleteAppointmentType(id);
    res.status(204).send();
  },
);

// ============================================================================
// APPOINTMENT ROUTES
// ============================================================================

/**
 * GET /api/scheduling/:configId/appointments
 * List appointments
 */
router.get(
  '/scheduling/:configId/appointments',
  async (req: AuthenticatedRequest<{ configId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      res.status(400).json({ error: 'Invalid config ID' });
      return;
    }

    const providerId = req.query.providerId
      ? Number(req.query.providerId)
      : undefined;
    const status = req.query.status as
      | 'SCHEDULED'
      | 'CONFIRMED'
      | 'CANCELLED'
      | undefined;
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : undefined;
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : undefined;
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;

    const appointments = await schedulingService.getAppointments(configId, {
      providerId,
      status,
      startDate,
      endDate,
      limit,
      offset,
    });

    res.json({ appointments });
  },
);

/**
 * POST /api/scheduling/:configId/appointments
 * Create an appointment
 */
router.post(
  '/scheduling/:configId/appointments',
  async (req: AuthenticatedRequest<{ configId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      res.status(400).json({ error: 'Invalid config ID' });
      return;
    }

    const parsed = appointmentSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    try {
      const appointment = await schedulingService.createAppointment(configId, {
        ...parsed.data,
        scheduledAt: new Date(parsed.data.scheduledAt),
      });
      res.status(201).json({ appointment });
    } catch (error) {
      const errorMessage = (error as Error).message;
      if (errorMessage === 'Scheduling config not found') {
        res.status(404).json({ error: 'Scheduling config not found' });
        return;
      }
      if (
        errorMessage === 'Provider not found' ||
        errorMessage === 'Appointment type not found'
      ) {
        res.status(404).json({ error: errorMessage });
        return;
      }
      if (
        errorMessage === 'Provider does not belong to this scheduling config' ||
        errorMessage ===
          'Appointment type does not belong to this scheduling config' ||
        errorMessage === 'Provider is not active' ||
        errorMessage === 'Appointment type is not active'
      ) {
        res.status(400).json({ error: errorMessage });
        return;
      }
      throw error;
    }
  },
);

/**
 * GET /api/scheduling/appointments/:id
 * Get an appointment
 */
router.get(
  '/scheduling/appointments/:id',
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid appointment ID' });
      return;
    }

    const appointment = await schedulingService.getAppointment(id);
    if (!appointment) {
      res.status(404).json({ error: 'Appointment not found' });
      return;
    }

    res.json({ appointment });
  },
);

/**
 * PATCH /api/scheduling/appointments/:id/status
 * Update appointment status
 */
router.patch(
  '/scheduling/appointments/:id/status',
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid appointment ID' });
      return;
    }

    const parsed = statusUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const appointment = await schedulingService.updateAppointmentStatus(
      id,
      parsed.data.status,
      parsed.data,
    );
    res.json({ appointment });
  },
);

/**
 * POST /api/scheduling/appointments/:id/reschedule
 * Reschedule an appointment
 */
router.post(
  '/scheduling/appointments/:id/reschedule',
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid appointment ID' });
      return;
    }

    const parsed = rescheduleSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    try {
      const appointment = await schedulingService.rescheduleAppointment(
        id,
        new Date(parsed.data.newScheduledAt),
        parsed.data.newProviderId,
      );
      res.json({ appointment });
    } catch (error) {
      const errorMessage = (error as Error).message;
      if (
        errorMessage === 'Appointment not found' ||
        errorMessage === 'Provider not found'
      ) {
        res.status(404).json({ error: errorMessage });
        return;
      }
      if (
        errorMessage === 'Provider does not belong to this scheduling config' ||
        errorMessage === 'Provider is not active'
      ) {
        res.status(400).json({ error: errorMessage });
        return;
      }
      throw error;
    }
  },
);

// ============================================================================
// AVAILABILITY ROUTES
// ============================================================================

/**
 * GET /api/scheduling/:configId/availability
 * Get available time slots
 */
router.get(
  '/scheduling/:configId/availability',
  async (req: AuthenticatedRequest<{ configId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      res.status(400).json({ error: 'Invalid config ID' });
      return;
    }

    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : new Date();
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const providerId = req.query.providerId
      ? Number(req.query.providerId)
      : undefined;
    const appointmentTypeId = req.query.appointmentTypeId
      ? Number(req.query.appointmentTypeId)
      : undefined;

    try {
      const slots = await schedulingService.getAvailableSlots(configId, {
        startDate,
        endDate,
        providerId,
        appointmentTypeId,
      });
      res.json({ slots });
    } catch (error) {
      if ((error as Error).message === 'Scheduling config not found') {
        res.status(404).json({ error: 'Scheduling config not found' });
        return;
      }
      throw error;
    }
  },
);

// ============================================================================
// WAITLIST ROUTES
// ============================================================================

/**
 * GET /api/scheduling/:configId/waitlist
 * Get waitlist
 */
router.get(
  '/scheduling/:configId/waitlist',
  async (req: AuthenticatedRequest<{ configId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      res.status(400).json({ error: 'Invalid config ID' });
      return;
    }

    const isActive = req.query.active !== 'false';

    const waitlist = await schedulingService.getWaitlist(configId, {
      isActive,
    });
    res.json({ waitlist });
  },
);

/**
 * POST /api/scheduling/:configId/waitlist
 * Add to waitlist
 */
router.post(
  '/scheduling/:configId/waitlist',
  async (req: AuthenticatedRequest<{ configId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      res.status(400).json({ error: 'Invalid config ID' });
      return;
    }

    const parsed = waitlistSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    try {
      const entry = await schedulingService.addToWaitlist(
        configId,
        parsed.data,
      );
      res.status(201).json({ entry });
    } catch (error) {
      const errorMessage = (error as Error).message;
      if (errorMessage === 'Provider not found') {
        res.status(404).json({ error: errorMessage });
        return;
      }
      if (
        errorMessage === 'Provider does not belong to this scheduling config' ||
        errorMessage === 'Provider is not active'
      ) {
        res.status(400).json({ error: errorMessage });
        return;
      }
      throw error;
    }
  },
);

/**
 * DELETE /api/scheduling/waitlist/:id
 * Remove from waitlist
 */
router.delete(
  '/scheduling/waitlist/:id',
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid waitlist entry ID' });
      return;
    }

    await schedulingService.removeFromWaitlist(id);
    res.status(204).send();
  },
);

// ============================================================================
// ANALYTICS ROUTES
// ============================================================================

/**
 * GET /api/scheduling/:configId/analytics
 * Get scheduling analytics
 */
router.get(
  '/scheduling/:configId/analytics',
  async (req: AuthenticatedRequest<{ configId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      res.status(400).json({ error: 'Invalid config ID' });
      return;
    }

    const startDate = req.query.start
      ? new Date(req.query.start as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.end
      ? new Date(req.query.end as string)
      : new Date();

    const analytics = await schedulingService.getSchedulingAnalytics(configId, {
      start: startDate,
      end: endDate,
    });

    res.json(analytics);
  },
);

/**
 * GET /api/scheduling/:configId/high-risk
 * Get high no-show risk appointments
 */
router.get(
  '/scheduling/:configId/high-risk',
  async (req: AuthenticatedRequest<{ configId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      res.status(400).json({ error: 'Invalid config ID' });
      return;
    }

    const threshold = req.query.threshold ? Number(req.query.threshold) : 0.5;

    const appointments = await schedulingService.getHighRiskAppointments(
      configId,
      threshold,
    );
    res.json({ appointments });
  },
);

export default router;
