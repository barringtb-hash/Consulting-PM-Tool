/**
 * Shift Scheduling Router
 *
 * API endpoints for Type B Employee/Shift Scheduling.
 *
 * NOTE: Routes accept a SchedulingConfig ID (from appointment scheduling)
 * and internally resolve it to the corresponding ShiftSchedulingConfig.
 * This allows the frontend to use the same config ID for both scheduling types.
 */

import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, requireAuth } from '../../auth/auth.middleware';
import {
  tenantMiddleware,
  TenantRequest,
} from '../../tenant/tenant.middleware';
import { hasTenantContext, getTenantId } from '../../tenant/tenant.context';
import * as shiftService from './shift.service';
import {
  EmploymentType,
  AvailabilityType,
  ScheduleStatus,
  TimeOffStatus,
  TimeOffType,
  SwapStatus,
} from '@prisma/client';

const router = Router();

// Apply tenant middleware to all shift routes for consistent behavior
router.use(tenantMiddleware);

// Extended request type with resolved shift config
interface ShiftRequest extends TenantRequest {
  shiftConfigId?: number;
}

/**
 * Middleware to resolve ShiftSchedulingConfig from SchedulingConfig ID.
 * The frontend passes the SchedulingConfig ID, but we need the ShiftSchedulingConfig ID
 * for database operations. This middleware resolves (and creates if needed) the mapping.
 */
async function resolveShiftConfig(
  req: ShiftRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const schedulingConfigId = parseInt(req.params.configId, 10);
  if (isNaN(schedulingConfigId)) {
    res.status(400).json({ error: 'Invalid config ID' });
    return;
  }

  // Get tenant ID - fallback to empty string if not available (development mode)
  const tenantId = hasTenantContext() ? getTenantId() : '';

  if (!tenantId) {
    // In development without tenant context, try to look up by schedulingConfigId only
    const shiftConfig =
      await shiftService.getShiftConfigBySchedulingConfigId(schedulingConfigId);
    if (shiftConfig) {
      req.shiftConfigId = shiftConfig.id;
      next();
      return;
    }
    // If no config exists and no tenant, return 404
    res.status(404).json({
      error: 'Shift configuration not found',
      message:
        'No shift scheduling configuration exists for this scheduling config.',
    });
    return;
  }

  // Get or create the ShiftSchedulingConfig
  const shiftConfig =
    await shiftService.getOrCreateShiftConfigBySchedulingConfigId(
      schedulingConfigId,
      tenantId,
    );

  if (!shiftConfig) {
    res.status(404).json({
      error: 'Scheduling configuration not found',
      message: 'The referenced scheduling configuration does not exist.',
    });
    return;
  }

  req.shiftConfigId = shiftConfig.id;
  next();
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createLocationSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  timezone: z.string().optional(),
  isActive: z.boolean().optional(),
});

const createRoleSchema = z.object({
  name: z.string().min(1),
  color: z.string().optional(),
  minEmployeesPerShift: z.number().int().min(0).optional(),
  maxEmployeesPerShift: z.number().int().min(1).optional(),
});

const createEmployeeSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  employmentType: z.nativeEnum(EmploymentType),
  hourlyRate: z.number().positive().optional(),
  maxHoursPerWeek: z.number().int().positive().optional(),
  roleId: z.number().int().optional(),
  preferredLocations: z.array(z.number().int()).optional(),
});

const availabilitySchema = z.object({
  availability: z.array(
    z.object({
      employeeId: z.number().int(),
      dayOfWeek: z.number().int().min(0).max(6),
      startTime: z.string(),
      endTime: z.string(),
      type: z.nativeEnum(AvailabilityType),
    }),
  ),
});

const createScheduleSchema = z.object({
  name: z.string().min(1),
  startDate: z.string().transform((s) => new Date(s)),
  endDate: z.string().transform((s) => new Date(s)),
  status: z.nativeEnum(ScheduleStatus).optional(),
});

const createShiftSchema = z.object({
  employeeId: z.number().int().optional(),
  locationId: z.number().int(),
  roleId: z.number().int(),
  startTime: z.string().transform((s) => new Date(s)),
  endTime: z.string().transform((s) => new Date(s)),
  breakMinutes: z.number().int().min(0).optional(),
  notes: z.string().optional(),
});

const timeOffRequestSchema = z.object({
  startDate: z.string().transform((s) => new Date(s)),
  endDate: z.string().transform((s) => new Date(s)),
  type: z.nativeEnum(TimeOffType),
  reason: z.string().optional(),
});

const shiftSwapRequestSchema = z.object({
  targetEmployeeId: z.number().int().optional(),
  reason: z.string().optional(),
});

const updateConfigSchema = z.object({
  businessName: z.string().min(1).optional(),
  timezone: z.string().optional(),
  weekStartDay: z.number().int().min(0).max(6).optional(),
  weeklyOvertimeThreshold: z.number().int().positive().optional(),
  dailyOvertimeThreshold: z.number().int().positive().optional(),
  overtimeMultiplier: z.number().positive().optional(),
  minRestBetweenShifts: z.number().int().min(0).optional(),
  maxConsecutiveDays: z.number().int().positive().optional(),
  requireBreaks: z.boolean().optional(),
  breakDurationMinutes: z.number().int().min(0).optional(),
  breakAfterHours: z.number().positive().optional(),
  schedulePublishLeadDays: z.number().int().min(0).optional(),
  enableShiftReminders: z.boolean().optional(),
  reminderHoursBefore: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

// ============================================================================
// CONFIG ENDPOINTS
// ============================================================================

/**
 * GET /api/scheduling/shifts/config/:configId
 * Get shift scheduling configuration
 * NOTE: configId is the SchedulingConfig ID, which is resolved to ShiftSchedulingConfig
 */
router.get(
  '/config/:configId',
  requireAuth,
  resolveShiftConfig,
  async (req: ShiftRequest, res: Response): Promise<void> => {
    try {
      const shiftConfigId = req.shiftConfigId!;
      const config = await shiftService.getShiftConfig(shiftConfigId);
      if (!config) {
        res.status(404).json({ error: 'Shift configuration not found' });
        return;
      }
      res.json({ data: config });
    } catch (error) {
      console.error('Error getting shift config:', error);
      res.status(500).json({ error: 'Failed to get shift configuration' });
    }
  },
);

/**
 * PUT /api/scheduling/shifts/config/:configId
 * Update shift scheduling configuration
 */
router.put(
  '/config/:configId',
  requireAuth,
  resolveShiftConfig,
  async (req: ShiftRequest, res: Response): Promise<void> => {
    try {
      const shiftConfigId = req.shiftConfigId!;

      const parsed = updateConfigSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ errors: parsed.error.flatten() });
        return;
      }

      const config = await shiftService.updateShiftConfig(
        shiftConfigId,
        parsed.data,
      );
      res.json({ data: config });
    } catch (error) {
      console.error('Error updating shift config:', error);
      res.status(500).json({ error: 'Failed to update shift configuration' });
    }
  },
);

// ============================================================================
// LOCATION ENDPOINTS
// ============================================================================

/**
 * GET /api/scheduling/shifts/:configId/locations
 * List locations
 */
router.get(
  '/:configId/locations',
  requireAuth,
  resolveShiftConfig,
  async (req: ShiftRequest, res: Response): Promise<void> => {
    try {
      const shiftConfigId = req.shiftConfigId!;
      const locations = await shiftService.getLocations(shiftConfigId);
      res.json({ data: locations });
    } catch (error) {
      console.error('Error listing locations:', error);
      res.status(500).json({ error: 'Failed to list locations' });
    }
  },
);

/**
 * POST /api/scheduling/shifts/:configId/locations
 * Create a location
 */
router.post(
  '/:configId/locations',
  requireAuth,
  resolveShiftConfig,
  async (req: ShiftRequest, res: Response): Promise<void> => {
    try {
      const shiftConfigId = req.shiftConfigId!;

      const parsed = createLocationSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ errors: parsed.error.flatten() });
        return;
      }

      const location = await shiftService.createLocation(
        shiftConfigId,
        parsed.data,
      );
      res.status(201).json({ data: location });
    } catch (error) {
      console.error('Error creating location:', error);
      res.status(500).json({ error: 'Failed to create location' });
    }
  },
);

/**
 * PUT /api/scheduling/shifts/locations/:id
 * Update a location
 */
router.put(
  '/locations/:id',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid location ID' });
        return;
      }

      const parsed = createLocationSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ errors: parsed.error.flatten() });
        return;
      }

      const location = await shiftService.updateLocation(id, parsed.data);
      res.json({ data: location });
    } catch (error) {
      console.error('Error updating location:', error);
      res.status(500).json({ error: 'Failed to update location' });
    }
  },
);

/**
 * DELETE /api/scheduling/shifts/locations/:id
 * Delete a location
 */
router.delete(
  '/locations/:id',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid location ID' });
        return;
      }

      await shiftService.deleteLocation(id);
      res.json({ data: { message: 'Location deleted' } });
    } catch (error) {
      console.error('Error deleting location:', error);
      res.status(500).json({ error: 'Failed to delete location' });
    }
  },
);

// ============================================================================
// ROLE ENDPOINTS
// ============================================================================

/**
 * GET /api/scheduling/shifts/:configId/roles
 * List roles
 */
router.get(
  '/:configId/roles',
  requireAuth,
  resolveShiftConfig,
  async (req: ShiftRequest, res: Response): Promise<void> => {
    try {
      const shiftConfigId = req.shiftConfigId!;
      const roles = await shiftService.getRoles(shiftConfigId);
      res.json({ data: roles });
    } catch (error) {
      console.error('Error listing roles:', error);
      res.status(500).json({ error: 'Failed to list roles' });
    }
  },
);

/**
 * POST /api/scheduling/shifts/:configId/roles
 * Create a role
 */
router.post(
  '/:configId/roles',
  requireAuth,
  resolveShiftConfig,
  async (req: ShiftRequest, res: Response): Promise<void> => {
    try {
      const shiftConfigId = req.shiftConfigId!;

      const parsed = createRoleSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ errors: parsed.error.flatten() });
        return;
      }

      const role = await shiftService.createRole(shiftConfigId, parsed.data);
      res.status(201).json({ data: role });
    } catch (error) {
      console.error('Error creating role:', error);
      res.status(500).json({ error: 'Failed to create role' });
    }
  },
);

/**
 * PUT /api/scheduling/shifts/roles/:id
 * Update a role
 */
router.put(
  '/roles/:id',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid role ID' });
        return;
      }

      const parsed = createRoleSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ errors: parsed.error.flatten() });
        return;
      }

      const role = await shiftService.updateRole(id, parsed.data);
      res.json({ data: role });
    } catch (error) {
      console.error('Error updating role:', error);
      res.status(500).json({ error: 'Failed to update role' });
    }
  },
);

/**
 * DELETE /api/scheduling/shifts/roles/:id
 * Delete a role
 */
router.delete(
  '/roles/:id',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid role ID' });
        return;
      }

      await shiftService.deleteRole(id);
      res.json({ data: { message: 'Role deleted' } });
    } catch (error) {
      console.error('Error deleting role:', error);
      res.status(500).json({ error: 'Failed to delete role' });
    }
  },
);

// ============================================================================
// EMPLOYEE ENDPOINTS
// ============================================================================

/**
 * GET /api/scheduling/shifts/:configId/employees
 * List employees
 */
router.get(
  '/:configId/employees',
  requireAuth,
  resolveShiftConfig,
  async (req: ShiftRequest, res: Response): Promise<void> => {
    try {
      const shiftConfigId = req.shiftConfigId!;

      const filters = {
        isActive:
          req.query.isActive !== undefined
            ? req.query.isActive === 'true'
            : undefined,
        roleId: req.query.roleId
          ? parseInt(req.query.roleId as string, 10)
          : undefined,
        locationId: req.query.locationId
          ? parseInt(req.query.locationId as string, 10)
          : undefined,
        employmentType: req.query.employmentType as EmploymentType | undefined,
      };

      const employees = await shiftService.getEmployees(shiftConfigId, filters);
      res.json({ data: employees });
    } catch (error) {
      console.error('Error listing employees:', error);
      res.status(500).json({ error: 'Failed to list employees' });
    }
  },
);

/**
 * POST /api/scheduling/shifts/:configId/employees
 * Create an employee
 */
router.post(
  '/:configId/employees',
  requireAuth,
  resolveShiftConfig,
  async (req: ShiftRequest, res: Response): Promise<void> => {
    try {
      const shiftConfigId = req.shiftConfigId!;

      const parsed = createEmployeeSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ errors: parsed.error.flatten() });
        return;
      }

      const employee = await shiftService.createEmployee(
        shiftConfigId,
        parsed.data,
      );
      res.status(201).json({ data: employee });
    } catch (error) {
      console.error('Error creating employee:', error);
      res.status(500).json({ error: 'Failed to create employee' });
    }
  },
);

/**
 * GET /api/scheduling/shifts/employees/:id
 * Get employee by ID
 */
router.get(
  '/employees/:id',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid employee ID' });
        return;
      }

      const employee = await shiftService.getEmployeeById(id);
      if (!employee) {
        res.status(404).json({ error: 'Employee not found' });
        return;
      }

      res.json({ data: employee });
    } catch (error) {
      console.error('Error getting employee:', error);
      res.status(500).json({ error: 'Failed to get employee' });
    }
  },
);

/**
 * PUT /api/scheduling/shifts/employees/:id
 * Update an employee
 */
router.put(
  '/employees/:id',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid employee ID' });
        return;
      }

      const parsed = createEmployeeSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ errors: parsed.error.flatten() });
        return;
      }

      const employee = await shiftService.updateEmployee(id, parsed.data);
      res.json({ data: employee });
    } catch (error) {
      console.error('Error updating employee:', error);
      res.status(500).json({ error: 'Failed to update employee' });
    }
  },
);

/**
 * POST /api/scheduling/shifts/employees/:id/deactivate
 * Deactivate an employee
 */
router.post(
  '/employees/:id/deactivate',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid employee ID' });
        return;
      }

      const employee = await shiftService.deactivateEmployee(id);
      res.json({ data: employee });
    } catch (error) {
      console.error('Error deactivating employee:', error);
      res.status(500).json({ error: 'Failed to deactivate employee' });
    }
  },
);

/**
 * PUT /api/scheduling/shifts/employees/:id/availability
 * Set employee availability
 */
router.put(
  '/employees/:id/availability',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid employee ID' });
        return;
      }

      const parsed = availabilitySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ errors: parsed.error.flatten() });
        return;
      }

      await shiftService.setEmployeeAvailability(id, parsed.data.availability);
      const availability = await shiftService.getEmployeeAvailability(id);
      res.json({ data: availability });
    } catch (error) {
      console.error('Error setting availability:', error);
      res.status(500).json({ error: 'Failed to set availability' });
    }
  },
);

/**
 * GET /api/scheduling/shifts/employees/:id/availability
 * Get employee availability
 */
router.get(
  '/employees/:id/availability',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid employee ID' });
        return;
      }

      const availability = await shiftService.getEmployeeAvailability(id);
      res.json({ data: availability });
    } catch (error) {
      console.error('Error getting availability:', error);
      res.status(500).json({ error: 'Failed to get availability' });
    }
  },
);

// ============================================================================
// TIME-OFF REQUEST ENDPOINTS
// ============================================================================

/**
 * GET /api/scheduling/shifts/:configId/time-off
 * List time-off requests
 */
router.get(
  '/:configId/time-off',
  requireAuth,
  resolveShiftConfig,
  async (req: ShiftRequest, res: Response): Promise<void> => {
    try {
      const shiftConfigId = req.shiftConfigId!;

      const requests = await shiftService.getTimeOffRequests(shiftConfigId, {
        employeeId: req.query.employeeId
          ? parseInt(req.query.employeeId as string, 10)
          : undefined,
        status: req.query.status as TimeOffStatus | undefined,
      });
      res.json({ data: requests });
    } catch (error) {
      console.error('Error listing time-off requests:', error);
      res.status(500).json({ error: 'Failed to list time-off requests' });
    }
  },
);

/**
 * POST /api/scheduling/shifts/employees/:id/time-off
 * Create a time-off request
 */
router.post(
  '/employees/:id/time-off',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const employeeId = parseInt(req.params.id, 10);
      if (isNaN(employeeId)) {
        res.status(400).json({ error: 'Invalid employee ID' });
        return;
      }

      const parsed = timeOffRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ errors: parsed.error.flatten() });
        return;
      }

      const request = await shiftService.createTimeOffRequest({
        employeeId,
        ...parsed.data,
      });
      res.status(201).json({ data: request });
    } catch (error) {
      console.error('Error creating time-off request:', error);
      res.status(500).json({ error: 'Failed to create time-off request' });
    }
  },
);

/**
 * POST /api/scheduling/shifts/time-off/:id/approve
 * Approve a time-off request
 */
router.post(
  '/time-off/:id/approve',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid request ID' });
        return;
      }

      const body = req.body as { notes?: string };
      const request = await shiftService.approveTimeOffRequest(
        id,
        req.userId!,
        body.notes,
      );
      res.json({ data: request });
    } catch (error) {
      console.error('Error approving time-off:', error);
      res.status(500).json({ error: 'Failed to approve time-off request' });
    }
  },
);

/**
 * POST /api/scheduling/shifts/time-off/:id/deny
 * Deny a time-off request
 */
router.post(
  '/time-off/:id/deny',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid request ID' });
        return;
      }

      const body = req.body as { notes?: string };
      const request = await shiftService.denyTimeOffRequest(
        id,
        req.userId!,
        body.notes,
      );
      res.json({ data: request });
    } catch (error) {
      console.error('Error denying time-off:', error);
      res.status(500).json({ error: 'Failed to deny time-off request' });
    }
  },
);

// ============================================================================
// SCHEDULE ENDPOINTS
// ============================================================================

/**
 * GET /api/scheduling/shifts/:configId/schedules
 * List schedules
 */
router.get(
  '/:configId/schedules',
  requireAuth,
  resolveShiftConfig,
  async (req: ShiftRequest, res: Response): Promise<void> => {
    try {
      const shiftConfigId = req.shiftConfigId!;

      const schedules = await shiftService.getSchedules(shiftConfigId, {
        status: req.query.status as ScheduleStatus | undefined,
      });
      res.json({ data: schedules });
    } catch (error) {
      console.error('Error listing schedules:', error);
      res.status(500).json({ error: 'Failed to list schedules' });
    }
  },
);

/**
 * POST /api/scheduling/shifts/:configId/schedules
 * Create a schedule
 */
router.post(
  '/:configId/schedules',
  requireAuth,
  resolveShiftConfig,
  async (req: ShiftRequest, res: Response): Promise<void> => {
    try {
      const shiftConfigId = req.shiftConfigId!;

      const parsed = createScheduleSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ errors: parsed.error.flatten() });
        return;
      }

      const schedule = await shiftService.createSchedule({
        configId: shiftConfigId,
        ...parsed.data,
      });
      res.status(201).json({ data: schedule });
    } catch (error) {
      console.error('Error creating schedule:', error);
      res.status(500).json({ error: 'Failed to create schedule' });
    }
  },
);

/**
 * GET /api/scheduling/shifts/schedules/:id
 * Get schedule by ID
 */
router.get(
  '/schedules/:id',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid schedule ID' });
        return;
      }

      const schedule = await shiftService.getScheduleById(id);
      if (!schedule) {
        res.status(404).json({ error: 'Schedule not found' });
        return;
      }

      res.json({ data: schedule });
    } catch (error) {
      console.error('Error getting schedule:', error);
      res.status(500).json({ error: 'Failed to get schedule' });
    }
  },
);

/**
 * PUT /api/scheduling/shifts/schedules/:id
 * Update a schedule
 */
router.put(
  '/schedules/:id',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid schedule ID' });
        return;
      }

      const parsed = createScheduleSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ errors: parsed.error.flatten() });
        return;
      }

      const schedule = await shiftService.updateSchedule(id, parsed.data);
      res.json({ data: schedule });
    } catch (error) {
      console.error('Error updating schedule:', error);
      res.status(500).json({ error: 'Failed to update schedule' });
    }
  },
);

/**
 * POST /api/scheduling/shifts/schedules/:id/publish
 * Publish a schedule
 */
router.post(
  '/schedules/:id/publish',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid schedule ID' });
        return;
      }

      const schedule = await shiftService.publishSchedule(id);
      res.json({ data: schedule });
    } catch (error) {
      console.error('Error publishing schedule:', error);
      res.status(500).json({ error: 'Failed to publish schedule' });
    }
  },
);

/**
 * DELETE /api/scheduling/shifts/schedules/:id
 * Delete a schedule
 */
router.delete(
  '/schedules/:id',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid schedule ID' });
        return;
      }

      await shiftService.deleteSchedule(id);
      res.json({ data: { message: 'Schedule deleted' } });
    } catch (error) {
      console.error('Error deleting schedule:', error);
      res.status(500).json({ error: 'Failed to delete schedule' });
    }
  },
);

/**
 * GET /api/scheduling/shifts/schedules/:id/coverage
 * Get schedule coverage summary
 */
router.get(
  '/schedules/:id/coverage',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid schedule ID' });
        return;
      }

      const coverage = await shiftService.getScheduleCoverage(id);
      res.json({ data: coverage });
    } catch (error) {
      console.error('Error getting coverage:', error);
      res.status(500).json({ error: 'Failed to get schedule coverage' });
    }
  },
);

// ============================================================================
// SHIFT ENDPOINTS
// ============================================================================

/**
 * GET /api/scheduling/shifts/schedules/:scheduleId/shifts
 * List shifts in a schedule
 */
router.get(
  '/schedules/:scheduleId/shifts',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const scheduleId = parseInt(req.params.scheduleId, 10);
      if (isNaN(scheduleId)) {
        res.status(400).json({ error: 'Invalid schedule ID' });
        return;
      }

      const shifts = await shiftService.getShifts(scheduleId, {
        employeeId: req.query.employeeId
          ? parseInt(req.query.employeeId as string, 10)
          : undefined,
        locationId: req.query.locationId
          ? parseInt(req.query.locationId as string, 10)
          : undefined,
        roleId: req.query.roleId
          ? parseInt(req.query.roleId as string, 10)
          : undefined,
        date: req.query.date ? new Date(req.query.date as string) : undefined,
      });
      res.json({ data: shifts });
    } catch (error) {
      console.error('Error listing shifts:', error);
      res.status(500).json({ error: 'Failed to list shifts' });
    }
  },
);

/**
 * POST /api/scheduling/shifts/schedules/:scheduleId/shifts
 * Create a shift
 */
router.post(
  '/schedules/:scheduleId/shifts',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const scheduleId = parseInt(req.params.scheduleId, 10);
      if (isNaN(scheduleId)) {
        res.status(400).json({ error: 'Invalid schedule ID' });
        return;
      }

      const parsed = createShiftSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ errors: parsed.error.flatten() });
        return;
      }

      // Get the schedule to get configId
      const schedule = await shiftService.getScheduleById(scheduleId);
      if (!schedule) {
        res.status(404).json({ error: 'Schedule not found' });
        return;
      }

      const shift = await shiftService.createShift({
        configId: schedule.configId,
        scheduleId,
        ...parsed.data,
      });
      res.status(201).json({ data: shift });
    } catch (error) {
      console.error('Error creating shift:', error);
      res.status(500).json({ error: 'Failed to create shift' });
    }
  },
);

/**
 * PUT /api/scheduling/shifts/shift/:id
 * Update a shift
 */
router.put(
  '/shift/:id',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid shift ID' });
        return;
      }

      const parsed = createShiftSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ errors: parsed.error.flatten() });
        return;
      }

      const shift = await shiftService.updateShift(id, parsed.data);
      res.json({ data: shift });
    } catch (error) {
      console.error('Error updating shift:', error);
      res.status(500).json({ error: 'Failed to update shift' });
    }
  },
);

/**
 * DELETE /api/scheduling/shifts/shift/:id
 * Delete a shift
 */
router.delete(
  '/shift/:id',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid shift ID' });
        return;
      }

      await shiftService.deleteShift(id);
      res.json({ data: { message: 'Shift deleted' } });
    } catch (error) {
      console.error('Error deleting shift:', error);
      res.status(500).json({ error: 'Failed to delete shift' });
    }
  },
);

/**
 * POST /api/scheduling/shifts/shift/:id/assign
 * Assign employee to shift
 */
router.post(
  '/shift/:id/assign',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid shift ID' });
        return;
      }

      const body = req.body as { employeeId?: number };
      const { employeeId } = body;
      if (!employeeId) {
        res.status(400).json({ error: 'Employee ID is required' });
        return;
      }

      const shift = await shiftService.assignEmployeeToShift(id, employeeId);
      res.json({ data: shift });
    } catch (error) {
      console.error('Error assigning employee:', error);
      res.status(500).json({ error: 'Failed to assign employee to shift' });
    }
  },
);

/**
 * POST /api/scheduling/shifts/shift/:id/unassign
 * Unassign employee from shift
 */
router.post(
  '/shift/:id/unassign',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid shift ID' });
        return;
      }

      const shift = await shiftService.unassignEmployeeFromShift(id);
      res.json({ data: shift });
    } catch (error) {
      console.error('Error unassigning employee:', error);
      res.status(500).json({ error: 'Failed to unassign employee from shift' });
    }
  },
);

// ============================================================================
// SHIFT SWAP ENDPOINTS
// ============================================================================

/**
 * GET /api/scheduling/shifts/:configId/swaps
 * List shift swap requests
 */
router.get(
  '/:configId/swaps',
  requireAuth,
  resolveShiftConfig,
  async (req: ShiftRequest, res: Response): Promise<void> => {
    try {
      const shiftConfigId = req.shiftConfigId!;

      const requests = await shiftService.getShiftSwapRequests(shiftConfigId, {
        status: req.query.status as SwapStatus | undefined,
      });
      res.json({ data: requests });
    } catch (error) {
      console.error('Error listing swap requests:', error);
      res.status(500).json({ error: 'Failed to list shift swap requests' });
    }
  },
);

/**
 * POST /api/scheduling/shifts/shift/:id/swap
 * Create a shift swap request
 */
router.post(
  '/shift/:id/swap',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const shiftId = parseInt(req.params.id, 10);
      if (isNaN(shiftId)) {
        res.status(400).json({ error: 'Invalid shift ID' });
        return;
      }

      const parsed = shiftSwapRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ errors: parsed.error.flatten() });
        return;
      }

      // Get the requester's employee ID
      // In a real app, this would be looked up from the user
      const body = req.body as { requesterId?: number };
      const requesterId = body.requesterId;
      if (!requesterId) {
        res.status(400).json({ error: 'Requester ID is required' });
        return;
      }

      const request = await shiftService.createShiftSwapRequest(
        shiftId,
        requesterId,
        parsed.data.targetEmployeeId,
        parsed.data.reason,
      );
      res.status(201).json({ data: request });
    } catch (error) {
      console.error('Error creating swap request:', error);
      res.status(500).json({ error: 'Failed to create shift swap request' });
    }
  },
);

/**
 * POST /api/scheduling/shifts/swaps/:id/approve
 * Approve a shift swap request
 */
router.post(
  '/swaps/:id/approve',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid request ID' });
        return;
      }

      const body = req.body as { notes?: string };
      const request = await shiftService.approveShiftSwapRequest(
        id,
        req.userId!,
        body.notes,
      );
      res.json({ data: request });
    } catch (error) {
      console.error('Error approving swap:', error);
      res.status(500).json({ error: 'Failed to approve shift swap request' });
    }
  },
);

/**
 * POST /api/scheduling/shifts/swaps/:id/deny
 * Deny a shift swap request
 */
router.post(
  '/swaps/:id/deny',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid request ID' });
        return;
      }

      const body = req.body as { notes?: string };
      const request = await shiftService.denyShiftSwapRequest(
        id,
        req.userId!,
        body.notes,
      );
      res.json({ data: request });
    } catch (error) {
      console.error('Error denying swap:', error);
      res.status(500).json({ error: 'Failed to deny shift swap request' });
    }
  },
);

// ============================================================================
// ANALYTICS ENDPOINTS
// ============================================================================

/**
 * GET /api/scheduling/shifts/:configId/hours
 * Get employee hours report
 */
router.get(
  '/:configId/hours',
  requireAuth,
  resolveShiftConfig,
  async (req: ShiftRequest, res: Response): Promise<void> => {
    try {
      const shiftConfigId = req.shiftConfigId!;

      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : new Date();
      const endDate = req.query.endDate
        ? new Date(req.query.endDate as string)
        : new Date();

      const hours = await shiftService.getEmployeeHours(
        shiftConfigId,
        startDate,
        endDate,
      );
      res.json({ data: hours });
    } catch (error) {
      console.error('Error getting employee hours:', error);
      res.status(500).json({ error: 'Failed to get employee hours' });
    }
  },
);

// ============================================================================
// OPEN SHIFT BOARD ENDPOINTS
// ============================================================================

/**
 * GET /api/scheduling/shifts/:configId/open-shifts
 * Get open shifts available for claiming
 */
router.get(
  '/:configId/open-shifts',
  requireAuth,
  resolveShiftConfig,
  async (req: ShiftRequest, res: Response): Promise<void> => {
    try {
      const shiftConfigId = req.shiftConfigId!;

      const filters = {
        locationId: req.query.locationId
          ? parseInt(req.query.locationId as string, 10)
          : undefined,
        roleId: req.query.roleId
          ? parseInt(req.query.roleId as string, 10)
          : undefined,
        startDate: req.query.startDate
          ? new Date(req.query.startDate as string)
          : undefined,
        endDate: req.query.endDate
          ? new Date(req.query.endDate as string)
          : undefined,
      };

      const shifts = await shiftService.getOpenShifts(shiftConfigId, filters);
      res.json({ data: shifts });
    } catch (error) {
      console.error('Error getting open shifts:', error);
      res.status(500).json({ error: 'Failed to get open shifts' });
    }
  },
);

/**
 * POST /api/scheduling/shifts/shift/:id/post-open
 * Post a shift to the open board
 */
router.post(
  '/shift/:id/post-open',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid shift ID' });
        return;
      }

      const shift = await shiftService.postShiftToOpenBoard(id, req.userId!);
      res.json({ data: shift });
    } catch (error) {
      console.error('Error posting shift to open board:', error);
      res.status(500).json({ error: 'Failed to post shift to open board' });
    }
  },
);

/**
 * POST /api/scheduling/shifts/shift/:id/remove-open
 * Remove a shift from the open board
 */
router.post(
  '/shift/:id/remove-open',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid shift ID' });
        return;
      }

      const shift = await shiftService.removeShiftFromOpenBoard(id);
      res.json({ data: shift });
    } catch (error) {
      console.error('Error removing shift from open board:', error);
      res.status(500).json({ error: 'Failed to remove shift from open board' });
    }
  },
);

/**
 * POST /api/scheduling/shifts/shift/:id/claim
 * Claim an open shift (employee self-assigns)
 */
router.post(
  '/shift/:id/claim',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid shift ID' });
        return;
      }

      const { employeeId } = req.body as { employeeId?: number };
      if (!employeeId) {
        res.status(400).json({ error: 'Employee ID is required' });
        return;
      }

      const result = await shiftService.claimOpenShift(id, employeeId);

      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      res.json({ data: result.shift });
    } catch (error) {
      console.error('Error claiming shift:', error);
      res.status(500).json({ error: 'Failed to claim shift' });
    }
  },
);

/**
 * GET /api/scheduling/shifts/shift/:id/eligible-employees
 * Get employees eligible to claim an open shift
 */
router.get(
  '/shift/:id/eligible-employees',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid shift ID' });
        return;
      }

      const employees = await shiftService.getEligibleEmployeesForShift(id);
      res.json({ data: employees });
    } catch (error) {
      console.error('Error getting eligible employees:', error);
      res.status(500).json({ error: 'Failed to get eligible employees' });
    }
  },
);

// ============================================================================
// LABOR COST ENDPOINTS
// ============================================================================

/**
 * GET /api/scheduling/shifts/schedules/:id/labor-costs
 * Calculate labor costs for a schedule
 */
router.get(
  '/schedules/:id/labor-costs',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid schedule ID' });
        return;
      }

      const overtimeMultiplier = req.query.overtimeMultiplier
        ? parseFloat(req.query.overtimeMultiplier as string)
        : 1.5;

      const costs = await shiftService.calculateLaborCosts(
        id,
        overtimeMultiplier,
      );
      res.json({ data: costs });
    } catch (error) {
      console.error('Error calculating labor costs:', error);
      res.status(500).json({ error: 'Failed to calculate labor costs' });
    }
  },
);

/**
 * GET /api/scheduling/shifts/:configId/labor-projection
 * Get labor cost projection for a date range
 */
router.get(
  '/:configId/labor-projection',
  requireAuth,
  resolveShiftConfig,
  async (req: ShiftRequest, res: Response): Promise<void> => {
    try {
      const shiftConfigId = req.shiftConfigId!;

      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : new Date();
      const endDate = req.query.endDate
        ? new Date(req.query.endDate as string)
        : new Date();

      const projection = await shiftService.getLaborCostProjection(
        shiftConfigId,
        startDate,
        endDate,
      );
      res.json({ data: projection });
    } catch (error) {
      console.error('Error getting labor projection:', error);
      res.status(500).json({ error: 'Failed to get labor cost projection' });
    }
  },
);

// ============================================================================
// OVERTIME ALERT ENDPOINTS
// ============================================================================

/**
 * GET /api/scheduling/shifts/:configId/overtime-alerts
 * Get overtime alerts for employees
 */
router.get(
  '/:configId/overtime-alerts',
  requireAuth,
  resolveShiftConfig,
  async (req: ShiftRequest, res: Response): Promise<void> => {
    try {
      const shiftConfigId = req.shiftConfigId!;

      // Get week start date (default to current week)
      const weekStartDate = req.query.weekStart
        ? new Date(req.query.weekStart as string)
        : (() => {
            const now = new Date();
            now.setDate(now.getDate() - now.getDay());
            now.setHours(0, 0, 0, 0);
            return now;
          })();

      const alerts = await shiftService.getOvertimeAlerts(
        shiftConfigId,
        weekStartDate,
      );
      res.json({ data: alerts });
    } catch (error) {
      console.error('Error getting overtime alerts:', error);
      res.status(500).json({ error: 'Failed to get overtime alerts' });
    }
  },
);

/**
 * GET /api/scheduling/shifts/:configId/overtime-summary
 * Get weekly overtime summary
 */
router.get(
  '/:configId/overtime-summary',
  requireAuth,
  resolveShiftConfig,
  async (req: ShiftRequest, res: Response): Promise<void> => {
    try {
      const shiftConfigId = req.shiftConfigId!;

      // Get week start date (default to current week)
      const weekStartDate = req.query.weekStart
        ? new Date(req.query.weekStart as string)
        : (() => {
            const now = new Date();
            now.setDate(now.getDate() - now.getDay());
            now.setHours(0, 0, 0, 0);
            return now;
          })();

      const summary = await shiftService.getWeeklyOvertimeSummary(
        shiftConfigId,
        weekStartDate,
      );
      res.json({ data: summary });
    } catch (error) {
      console.error('Error getting overtime summary:', error);
      res.status(500).json({ error: 'Failed to get overtime summary' });
    }
  },
);

/**
 * POST /api/scheduling/shifts/employees/:id/check-overtime
 * Check if assigning a shift would cause overtime
 */
router.post(
  '/employees/:id/check-overtime',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const employeeId = parseInt(req.params.id, 10);
      if (isNaN(employeeId)) {
        res.status(400).json({ error: 'Invalid employee ID' });
        return;
      }

      const { startTime, endTime, breakMinutes } = req.body as {
        startTime?: string;
        endTime?: string;
        breakMinutes?: number;
      };
      if (!startTime || !endTime) {
        res.status(400).json({ error: 'Start time and end time are required' });
        return;
      }

      const impact = await shiftService.checkOvertimeImpact(
        employeeId,
        new Date(startTime),
        new Date(endTime),
        breakMinutes || 0,
      );
      res.json({ data: impact });
    } catch (error) {
      console.error('Error checking overtime impact:', error);
      res.status(500).json({ error: 'Failed to check overtime impact' });
    }
  },
);

export default router;
