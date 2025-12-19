/**
 * Shift Scheduling Service
 *
 * Type B Scheduling: Employee/Shift management for businesses
 * that need to schedule workers (restaurants, retail, healthcare, etc.)
 *
 * Features:
 * - Employee management with roles and employment types
 * - Location-based shift scheduling
 * - Availability tracking
 * - Time-off requests
 * - Shift swap requests
 * - Auto-scheduling with constraints
 */

import { prisma } from '../../prisma/client';
import {
  ShiftStatus,
  EmploymentType,
  AvailabilityType,
  TimeOffStatus,
  SwapStatus,
  ScheduleStatus,
} from '@prisma/client';

// ============================================================================
// TYPES
// ============================================================================

interface CreateEmployeeInput {
  name: string;
  email: string;
  phone?: string;
  employmentType: EmploymentType;
  hourlyRate?: number;
  maxHoursPerWeek?: number;
  roleIds: number[];
  locationIds?: number[];
}

interface CreateShiftInput {
  scheduleId: number;
  employeeId?: number;
  locationId: number;
  roleId: number;
  startTime: Date;
  endTime: Date;
  breakMinutes?: number;
  notes?: string;
}

interface CreateScheduleInput {
  configId: number;
  name: string;
  startDate: Date;
  endDate: Date;
  status?: ScheduleStatus;
}

interface AvailabilityInput {
  employeeId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  type: AvailabilityType;
}

interface TimeOffInput {
  employeeId: number;
  startDate: Date;
  endDate: Date;
  type: string;
  reason?: string;
}

// ============================================================================
// SHIFT SCHEDULING CONFIG
// ============================================================================

/**
 * Get or create shift scheduling config
 */
export async function getOrCreateShiftConfig(configId: number) {
  const existing = await prisma.shiftSchedulingConfig.findFirst({
    where: { configId },
  });

  if (existing) {
    return existing;
  }

  return prisma.shiftSchedulingConfig.create({
    data: {
      configId,
      defaultShiftDuration: 480, // 8 hours
      minHoursBetweenShifts: 8,
      maxHoursPerDay: 10,
      maxHoursPerWeek: 40,
      overtimeThreshold: 40,
      enableAutoScheduling: false,
    },
  });
}

/**
 * Update shift scheduling config
 */
export async function updateShiftConfig(
  configId: number,
  data: {
    defaultShiftDuration?: number;
    minHoursBetweenShifts?: number;
    maxHoursPerDay?: number;
    maxHoursPerWeek?: number;
    overtimeThreshold?: number;
    enableAutoScheduling?: boolean;
    autoSchedulingRules?: object;
  },
) {
  const config = await getOrCreateShiftConfig(configId);

  return prisma.shiftSchedulingConfig.update({
    where: { id: config.id },
    data,
  });
}

// ============================================================================
// LOCATIONS
// ============================================================================

/**
 * Create a location
 */
export async function createLocation(
  configId: number,
  data: {
    name: string;
    address?: string;
    timezone?: string;
    isActive?: boolean;
  },
) {
  return prisma.shiftLocation.create({
    data: {
      configId,
      ...data,
    },
  });
}

/**
 * Get locations for a config
 */
export async function getLocations(configId: number) {
  return prisma.shiftLocation.findMany({
    where: { configId },
    orderBy: { name: 'asc' },
  });
}

/**
 * Update a location
 */
export async function updateLocation(
  id: number,
  data: {
    name?: string;
    address?: string;
    timezone?: string;
    isActive?: boolean;
  },
) {
  return prisma.shiftLocation.update({
    where: { id },
    data,
  });
}

/**
 * Delete a location
 */
export async function deleteLocation(id: number) {
  return prisma.shiftLocation.delete({
    where: { id },
  });
}

// ============================================================================
// ROLES
// ============================================================================

/**
 * Create a role
 */
export async function createRole(
  configId: number,
  data: {
    name: string;
    color?: string;
    minEmployeesPerShift?: number;
    maxEmployeesPerShift?: number;
  },
) {
  return prisma.shiftRole.create({
    data: {
      configId,
      ...data,
    },
  });
}

/**
 * Get roles for a config
 */
export async function getRoles(configId: number) {
  return prisma.shiftRole.findMany({
    where: { configId },
    orderBy: { name: 'asc' },
  });
}

/**
 * Update a role
 */
export async function updateRole(
  id: number,
  data: {
    name?: string;
    color?: string;
    minEmployeesPerShift?: number;
    maxEmployeesPerShift?: number;
  },
) {
  return prisma.shiftRole.update({
    where: { id },
    data,
  });
}

/**
 * Delete a role
 */
export async function deleteRole(id: number) {
  return prisma.shiftRole.delete({
    where: { id },
  });
}

// ============================================================================
// EMPLOYEES
// ============================================================================

/**
 * Create an employee
 */
export async function createEmployee(
  configId: number,
  input: CreateEmployeeInput,
) {
  const { roleIds, locationIds, ...employeeData } = input;

  return prisma.shiftEmployee.create({
    data: {
      configId,
      ...employeeData,
      roles: {
        connect: roleIds.map((id) => ({ id })),
      },
      locations: locationIds?.length
        ? {
            connect: locationIds.map((id) => ({ id })),
          }
        : undefined,
    },
    include: {
      roles: true,
      locations: true,
    },
  });
}

/**
 * Get employees for a config
 */
export async function getEmployees(
  configId: number,
  filters?: {
    isActive?: boolean;
    roleId?: number;
    locationId?: number;
    employmentType?: EmploymentType;
  },
) {
  return prisma.shiftEmployee.findMany({
    where: {
      configId,
      isActive: filters?.isActive,
      employmentType: filters?.employmentType,
      roles: filters?.roleId
        ? {
            some: { id: filters.roleId },
          }
        : undefined,
      locations: filters?.locationId
        ? {
            some: { id: filters.locationId },
          }
        : undefined,
    },
    include: {
      roles: true,
      locations: true,
    },
    orderBy: { name: 'asc' },
  });
}

/**
 * Get employee by ID
 */
export async function getEmployeeById(id: number) {
  return prisma.shiftEmployee.findUnique({
    where: { id },
    include: {
      roles: true,
      locations: true,
      availability: true,
    },
  });
}

/**
 * Update an employee
 */
export async function updateEmployee(
  id: number,
  input: Partial<CreateEmployeeInput>,
) {
  const { roleIds, locationIds, ...employeeData } = input;

  return prisma.shiftEmployee.update({
    where: { id },
    data: {
      ...employeeData,
      roles: roleIds
        ? {
            set: roleIds.map((id) => ({ id })),
          }
        : undefined,
      locations: locationIds
        ? {
            set: locationIds.map((id) => ({ id })),
          }
        : undefined,
    },
    include: {
      roles: true,
      locations: true,
    },
  });
}

/**
 * Deactivate an employee
 */
export async function deactivateEmployee(id: number) {
  return prisma.shiftEmployee.update({
    where: { id },
    data: { isActive: false },
  });
}

// ============================================================================
// EMPLOYEE AVAILABILITY
// ============================================================================

/**
 * Set employee availability
 */
export async function setEmployeeAvailability(
  employeeId: number,
  availability: AvailabilityInput[],
) {
  // Delete existing availability
  await prisma.employeeAvailability.deleteMany({
    where: { employeeId },
  });

  // Create new availability records
  return prisma.employeeAvailability.createMany({
    data: availability.map((a) => ({
      employeeId,
      dayOfWeek: a.dayOfWeek,
      startTime: a.startTime,
      endTime: a.endTime,
      type: a.type,
    })),
  });
}

/**
 * Get employee availability
 */
export async function getEmployeeAvailability(employeeId: number) {
  return prisma.employeeAvailability.findMany({
    where: { employeeId },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  });
}

// ============================================================================
// TIME-OFF REQUESTS
// ============================================================================

/**
 * Create a time-off request
 */
export async function createTimeOffRequest(input: TimeOffInput) {
  return prisma.timeOffRequest.create({
    data: {
      ...input,
      status: 'PENDING',
    },
  });
}

/**
 * Get time-off requests
 */
export async function getTimeOffRequests(
  configId: number,
  filters?: {
    employeeId?: number;
    status?: TimeOffStatus;
    startDate?: Date;
    endDate?: Date;
  },
) {
  return prisma.timeOffRequest.findMany({
    where: {
      employee: { configId },
      employeeId: filters?.employeeId,
      status: filters?.status,
      startDate: filters?.startDate ? { gte: filters.startDate } : undefined,
      endDate: filters?.endDate ? { lte: filters.endDate } : undefined,
    },
    include: {
      employee: { select: { id: true, name: true } },
      reviewer: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Approve time-off request
 */
export async function approveTimeOffRequest(
  id: number,
  reviewerId: number,
  reviewNotes?: string,
) {
  return prisma.timeOffRequest.update({
    where: { id },
    data: {
      status: 'APPROVED',
      reviewedById: reviewerId,
      reviewedAt: new Date(),
      reviewNotes,
    },
  });
}

/**
 * Deny time-off request
 */
export async function denyTimeOffRequest(
  id: number,
  reviewerId: number,
  reviewNotes?: string,
) {
  return prisma.timeOffRequest.update({
    where: { id },
    data: {
      status: 'DENIED',
      reviewedById: reviewerId,
      reviewedAt: new Date(),
      reviewNotes,
    },
  });
}

// ============================================================================
// SCHEDULES
// ============================================================================

/**
 * Create a schedule
 */
export async function createSchedule(input: CreateScheduleInput) {
  return prisma.shiftSchedule.create({
    data: {
      ...input,
      status: input.status || 'DRAFT',
    },
  });
}

/**
 * Get schedules
 */
export async function getSchedules(
  configId: number,
  filters?: {
    status?: ScheduleStatus;
    startDate?: Date;
    endDate?: Date;
  },
) {
  return prisma.shiftSchedule.findMany({
    where: {
      configId,
      status: filters?.status,
      startDate: filters?.startDate ? { gte: filters.startDate } : undefined,
      endDate: filters?.endDate ? { lte: filters.endDate } : undefined,
    },
    include: {
      _count: { select: { shifts: true } },
    },
    orderBy: { startDate: 'desc' },
  });
}

/**
 * Get schedule by ID with shifts
 */
export async function getScheduleById(id: number) {
  return prisma.shiftSchedule.findUnique({
    where: { id },
    include: {
      shifts: {
        include: {
          employee: { select: { id: true, name: true } },
          location: { select: { id: true, name: true } },
          role: { select: { id: true, name: true, color: true } },
        },
        orderBy: { startTime: 'asc' },
      },
    },
  });
}

/**
 * Update schedule
 */
export async function updateSchedule(
  id: number,
  data: {
    name?: string;
    startDate?: Date;
    endDate?: Date;
    status?: ScheduleStatus;
    publishedAt?: Date | null;
  },
) {
  return prisma.shiftSchedule.update({
    where: { id },
    data,
  });
}

/**
 * Publish a schedule
 */
export async function publishSchedule(id: number) {
  return prisma.shiftSchedule.update({
    where: { id },
    data: {
      status: 'PUBLISHED',
      publishedAt: new Date(),
    },
  });
}

/**
 * Delete a schedule
 */
export async function deleteSchedule(id: number) {
  // Delete all shifts first
  await prisma.shift.deleteMany({
    where: { scheduleId: id },
  });

  return prisma.shiftSchedule.delete({
    where: { id },
  });
}

// ============================================================================
// SHIFTS
// ============================================================================

/**
 * Create a shift
 */
export async function createShift(input: CreateShiftInput) {
  return prisma.shift.create({
    data: {
      ...input,
      status: 'SCHEDULED',
    },
    include: {
      employee: { select: { id: true, name: true } },
      location: { select: { id: true, name: true } },
      role: { select: { id: true, name: true, color: true } },
    },
  });
}

/**
 * Get shifts
 */
export async function getShifts(
  scheduleId: number,
  filters?: {
    employeeId?: number;
    locationId?: number;
    roleId?: number;
    status?: ShiftStatus;
    date?: Date;
  },
) {
  let dateFilter = {};
  if (filters?.date) {
    const startOfDay = new Date(filters.date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(filters.date);
    endOfDay.setHours(23, 59, 59, 999);
    dateFilter = {
      startTime: { gte: startOfDay, lte: endOfDay },
    };
  }

  return prisma.shift.findMany({
    where: {
      scheduleId,
      employeeId: filters?.employeeId,
      locationId: filters?.locationId,
      roleId: filters?.roleId,
      status: filters?.status,
      ...dateFilter,
    },
    include: {
      employee: { select: { id: true, name: true } },
      location: { select: { id: true, name: true } },
      role: { select: { id: true, name: true, color: true } },
    },
    orderBy: { startTime: 'asc' },
  });
}

/**
 * Update a shift
 */
export async function updateShift(
  id: number,
  data: {
    employeeId?: number | null;
    locationId?: number;
    roleId?: number;
    startTime?: Date;
    endTime?: Date;
    breakMinutes?: number;
    status?: ShiftStatus;
    notes?: string;
  },
) {
  return prisma.shift.update({
    where: { id },
    data,
    include: {
      employee: { select: { id: true, name: true } },
      location: { select: { id: true, name: true } },
      role: { select: { id: true, name: true, color: true } },
    },
  });
}

/**
 * Delete a shift
 */
export async function deleteShift(id: number) {
  return prisma.shift.delete({
    where: { id },
  });
}

/**
 * Assign employee to shift
 */
export async function assignEmployeeToShift(
  shiftId: number,
  employeeId: number,
) {
  return prisma.shift.update({
    where: { id: shiftId },
    data: { employeeId },
    include: {
      employee: { select: { id: true, name: true } },
      location: { select: { id: true, name: true } },
      role: { select: { id: true, name: true, color: true } },
    },
  });
}

/**
 * Unassign employee from shift
 */
export async function unassignEmployeeFromShift(shiftId: number) {
  return prisma.shift.update({
    where: { id: shiftId },
    data: { employeeId: null },
  });
}

// ============================================================================
// SHIFT SWAP REQUESTS
// ============================================================================

/**
 * Create a shift swap request
 */
export async function createShiftSwapRequest(
  shiftId: number,
  requesterId: number,
  targetEmployeeId?: number,
  reason?: string,
) {
  return prisma.shiftSwapRequest.create({
    data: {
      shiftId,
      requesterId,
      targetEmployeeId,
      reason,
      status: 'PENDING',
    },
    include: {
      shift: {
        include: {
          location: { select: { name: true } },
          role: { select: { name: true } },
        },
      },
      requester: { select: { id: true, name: true } },
      targetEmployee: { select: { id: true, name: true } },
    },
  });
}

/**
 * Get shift swap requests
 */
export async function getShiftSwapRequests(
  configId: number,
  filters?: {
    requesterId?: number;
    targetEmployeeId?: number;
    status?: SwapStatus;
  },
) {
  return prisma.shiftSwapRequest.findMany({
    where: {
      requester: { configId },
      requesterId: filters?.requesterId,
      targetEmployeeId: filters?.targetEmployeeId,
      status: filters?.status,
    },
    include: {
      shift: {
        include: {
          location: { select: { name: true } },
          role: { select: { name: true } },
        },
      },
      requester: { select: { id: true, name: true } },
      targetEmployee: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Approve shift swap request
 */
export async function approveShiftSwapRequest(
  id: number,
  approverId: number,
  approverNotes?: string,
) {
  const swapRequest = await prisma.shiftSwapRequest.findUnique({
    where: { id },
    include: { shift: true },
  });

  if (!swapRequest) {
    throw new Error('Swap request not found');
  }

  // Update the shift assignment
  if (swapRequest.targetEmployeeId) {
    await prisma.shift.update({
      where: { id: swapRequest.shiftId },
      data: { employeeId: swapRequest.targetEmployeeId },
    });
  }

  return prisma.shiftSwapRequest.update({
    where: { id },
    data: {
      status: 'APPROVED',
      approvedById: approverId,
      approvedAt: new Date(),
      approverNotes,
    },
  });
}

/**
 * Deny shift swap request
 */
export async function denyShiftSwapRequest(
  id: number,
  approverId: number,
  approverNotes?: string,
) {
  return prisma.shiftSwapRequest.update({
    where: { id },
    data: {
      status: 'DENIED',
      approvedById: approverId,
      approvedAt: new Date(),
      approverNotes,
    },
  });
}

// ============================================================================
// OPEN SHIFT BOARD
// ============================================================================

/**
 * Get open shifts (unassigned shifts available for claiming)
 */
export async function getOpenShifts(
  configId: number,
  filters?: {
    locationId?: number;
    roleId?: number;
    startDate?: Date;
    endDate?: Date;
  },
) {
  return prisma.shift.findMany({
    where: {
      schedule: {
        configId,
        status: 'PUBLISHED',
      },
      employeeId: null, // Open shifts have no employee assigned
      isOpen: true,
      locationId: filters?.locationId,
      roleId: filters?.roleId,
      startTime: filters?.startDate ? { gte: filters.startDate } : undefined,
      endTime: filters?.endDate ? { lte: filters.endDate } : undefined,
    },
    include: {
      location: { select: { id: true, name: true } },
      role: { select: { id: true, name: true, color: true } },
      schedule: { select: { id: true, name: true } },
    },
    orderBy: { startTime: 'asc' },
  });
}

/**
 * Post a shift to the open board for employees to claim
 */
export async function postShiftToOpenBoard(
  shiftId: number,
  _postedById: number,
) {
  return prisma.shift.update({
    where: { id: shiftId },
    data: {
      isOpen: true,
      employeeId: null, // Unassign any current employee
    },
    include: {
      location: { select: { name: true } },
      role: { select: { name: true } },
    },
  });
}

/**
 * Remove a shift from the open board
 */
export async function removeShiftFromOpenBoard(shiftId: number) {
  return prisma.shift.update({
    where: { id: shiftId },
    data: {
      isOpen: false,
    },
  });
}

/**
 * Claim an open shift (employee self-assigns)
 */
export async function claimOpenShift(
  shiftId: number,
  employeeId: number,
): Promise<{
  success: boolean;
  shift?: Awaited<ReturnType<typeof prisma.shift.update>>;
  error?: string;
}> {
  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    include: {
      schedule: { select: { configId: true } },
      role: true,
    },
  });

  if (!shift) {
    return { success: false, error: 'Shift not found' };
  }

  if (!shift.isOpen) {
    return { success: false, error: 'Shift is not open for claiming' };
  }

  if (shift.employeeId) {
    return { success: false, error: 'Shift has already been claimed' };
  }

  // Verify employee has the required role
  const employee = await prisma.shiftEmployee.findUnique({
    where: { id: employeeId },
    include: { role: true },
  });

  if (!employee) {
    return { success: false, error: 'Employee not found' };
  }

  if (shift.schedule && employee.configId !== shift.schedule.configId) {
    return {
      success: false,
      error: 'Employee does not belong to this organization',
    };
  }

  // Check if employee has the required role
  if (employee.roleId !== shift.roleId) {
    return {
      success: false,
      error: `Employee is not qualified for the ${shift.role?.name || 'required'} role`,
    };
  }

  // Check for shift conflicts
  const conflictingShift = await prisma.shift.findFirst({
    where: {
      employeeId,
      OR: [
        {
          startTime: { lt: shift.endTime },
          endTime: { gt: shift.startTime },
        },
      ],
      status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
    },
  });

  if (conflictingShift) {
    return { success: false, error: 'Employee has a conflicting shift' };
  }

  // Assign the shift
  const updatedShift = await prisma.shift.update({
    where: { id: shiftId },
    data: {
      employeeId,
      isOpen: false,
    },
    include: {
      employee: { select: { id: true, firstName: true, lastName: true } },
      location: { select: { id: true, name: true } },
      role: { select: { id: true, name: true, color: true } },
    },
  });

  return { success: true, shift: updatedShift };
}

/**
 * Get employees eligible to claim a specific open shift
 */
export async function getEligibleEmployeesForShift(shiftId: number) {
  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    include: {
      schedule: { select: { configId: true } },
    },
  });

  if (!shift || !shift.schedule) {
    return [];
  }

  // Get employees with the required role who don't have conflicts
  const employees = await prisma.shiftEmployee.findMany({
    where: {
      configId: shift.schedule.configId,
      isActive: true,
      roleId: shift.roleId,
    },
    include: {
      shifts: {
        where: {
          OR: [
            {
              startTime: { lt: shift.endTime },
              endTime: { gt: shift.startTime },
            },
          ],
          status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
        },
      },
    },
  });

  // Filter out employees with conflicts
  return employees
    .filter((emp) => emp.shifts.length === 0)
    .map((emp) => ({
      id: emp.id,
      name: `${emp.firstName} ${emp.lastName}`,
      email: emp.email,
    }));
}

// ============================================================================
// LABOR COST CALCULATIONS
// ============================================================================

interface LaborCostResult {
  totalCost: number;
  regularCost: number;
  overtimeCost: number;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  employeeCount: number;
  byEmployee: Array<{
    employeeId: number;
    employeeName: string;
    regularHours: number;
    overtimeHours: number;
    regularCost: number;
    overtimeCost: number;
    totalCost: number;
  }>;
  byRole: Record<string, { hours: number; cost: number }>;
  byLocation: Record<string, { hours: number; cost: number }>;
}

/**
 * Calculate labor costs for a schedule
 */
export async function calculateLaborCosts(
  scheduleId: number,
  overtimeMultiplier: number = 1.5,
): Promise<LaborCostResult> {
  const schedule = await prisma.shiftSchedule.findUnique({
    where: { id: scheduleId },
    include: {
      shifts: {
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              hourlyRate: true,
            },
          },
          location: { select: { id: true, name: true } },
          role: { select: { id: true, name: true } },
        },
        where: {
          status: { in: ['SCHEDULED', 'COMPLETED'] },
          employeeId: { not: null },
        },
      },
      shiftConfig: { select: { overtimeThreshold: true } },
    },
  });

  if (!schedule) {
    throw new Error('Schedule not found');
  }

  const overtimeThreshold = schedule.shiftConfig?.overtimeThreshold || 40;

  // Group shifts by employee
  const employeeShifts = new Map<
    number,
    {
      employee: {
        id: number;
        firstName: string;
        lastName: string;
        hourlyRate: unknown;
      };
      shifts: typeof schedule.shifts;
    }
  >();

  for (const shift of schedule.shifts) {
    if (!shift.employee) continue;

    const existing = employeeShifts.get(shift.employee.id);
    if (existing) {
      existing.shifts.push(shift);
    } else {
      employeeShifts.set(shift.employee.id, {
        employee: shift.employee,
        shifts: [shift],
      });
    }
  }

  // Calculate costs per employee
  const byEmployee: LaborCostResult['byEmployee'] = [];
  const byRole: Record<string, { hours: number; cost: number }> = {};
  const byLocation: Record<string, { hours: number; cost: number }> = {};

  let totalCost = 0;
  let totalRegularCost = 0;
  let totalOvertimeCost = 0;
  let totalHours = 0;
  let totalRegularHours = 0;
  let totalOvertimeHours = 0;

  for (const [, data] of employeeShifts) {
    const hourlyRate = Number(data.employee.hourlyRate) || 0;
    let employeeHours = 0;

    for (const shift of data.shifts) {
      const shiftDuration =
        (shift.endTime.getTime() - shift.startTime.getTime()) /
        (1000 * 60 * 60);
      const workHours = shiftDuration - (shift.breakMinutes || 0) / 60;
      employeeHours += workHours;

      // Track by role
      const roleName = shift.role?.name || 'Unknown';
      if (!byRole[roleName]) {
        byRole[roleName] = { hours: 0, cost: 0 };
      }
      byRole[roleName].hours += workHours;

      // Track by location
      const locationName = shift.location?.name || 'Unknown';
      if (!byLocation[locationName]) {
        byLocation[locationName] = { hours: 0, cost: 0 };
      }
      byLocation[locationName].hours += workHours;
    }

    // Calculate regular vs overtime
    const regularHours = Math.min(employeeHours, overtimeThreshold);
    const overtimeHours = Math.max(0, employeeHours - overtimeThreshold);

    const regularCost = regularHours * hourlyRate;
    const overtimeCost = overtimeHours * hourlyRate * overtimeMultiplier;
    const totalEmployeeCost = regularCost + overtimeCost;

    byEmployee.push({
      employeeId: data.employee.id,
      employeeName: `${data.employee.firstName} ${data.employee.lastName}`,
      regularHours,
      overtimeHours,
      regularCost,
      overtimeCost,
      totalCost: totalEmployeeCost,
    });

    // Update totals
    totalCost += totalEmployeeCost;
    totalRegularCost += regularCost;
    totalOvertimeCost += overtimeCost;
    totalHours += employeeHours;
    totalRegularHours += regularHours;
    totalOvertimeHours += overtimeHours;

    // Update role/location costs
    for (const shift of data.shifts) {
      const shiftDuration =
        (shift.endTime.getTime() - shift.startTime.getTime()) /
        (1000 * 60 * 60);
      const workHours = shiftDuration - (shift.breakMinutes || 0) / 60;
      const shiftCost = workHours * hourlyRate;

      const roleName = shift.role?.name || 'Unknown';
      byRole[roleName].cost += shiftCost;

      const locationName = shift.location?.name || 'Unknown';
      byLocation[locationName].cost += shiftCost;
    }
  }

  return {
    totalCost,
    regularCost: totalRegularCost,
    overtimeCost: totalOvertimeCost,
    totalHours,
    regularHours: totalRegularHours,
    overtimeHours: totalOvertimeHours,
    employeeCount: employeeShifts.size,
    byEmployee,
    byRole,
    byLocation,
  };
}

/**
 * Get labor cost projection for a date range
 */
export async function getLaborCostProjection(
  configId: number,
  startDate: Date,
  endDate: Date,
  _overtimeMultiplier: number = 1.5,
) {
  const shifts = await prisma.shift.findMany({
    where: {
      schedule: { configId },
      startTime: { gte: startDate },
      endTime: { lte: endDate },
      employeeId: { not: null },
      status: { in: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'] },
    },
    include: {
      employee: { select: { hourlyRate: true } },
    },
  });

  let totalCost = 0;
  let totalHours = 0;

  for (const shift of shifts) {
    const hourlyRate = Number(shift.employee?.hourlyRate) || 0;
    const shiftDuration =
      (shift.endTime.getTime() - shift.startTime.getTime()) / (1000 * 60 * 60);
    const workHours = shiftDuration - (shift.breakMinutes || 0) / 60;

    totalHours += workHours;
    totalCost += workHours * hourlyRate;
  }

  return {
    projectedCost: totalCost,
    projectedHours: totalHours,
    averageCostPerHour: totalHours > 0 ? totalCost / totalHours : 0,
    shiftCount: shifts.length,
  };
}

// ============================================================================
// OVERTIME ALERTS
// ============================================================================

interface OvertimeAlert {
  employeeId: number;
  employeeName: string;
  currentHours: number;
  projectedHours: number;
  overtimeThreshold: number;
  hoursOverThreshold: number;
  projectedOvertimeCost: number;
  alertLevel: 'warning' | 'critical';
}

/**
 * Get employees approaching or exceeding overtime threshold
 */
export async function getOvertimeAlerts(
  configId: number,
  weekStartDate: Date,
): Promise<OvertimeAlert[]> {
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekEndDate.getDate() + 7);

  const config = await prisma.shiftSchedulingConfig.findFirst({
    where: { configId },
    select: { overtimeThreshold: true },
  });

  const overtimeThreshold = config?.overtimeThreshold || 40;
  const warningThreshold = overtimeThreshold * 0.9; // 90% of threshold

  const employees = await prisma.shiftEmployee.findMany({
    where: { configId, isActive: true },
    include: {
      shifts: {
        where: {
          startTime: { gte: weekStartDate },
          endTime: { lte: weekEndDate },
          status: { in: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'] },
        },
      },
    },
  });

  const alerts: OvertimeAlert[] = [];

  for (const employee of employees) {
    let currentHours = 0;
    let projectedHours = 0;
    const now = new Date();

    for (const shift of employee.shifts) {
      const shiftDuration =
        (shift.endTime.getTime() - shift.startTime.getTime()) /
        (1000 * 60 * 60);
      const workHours = shiftDuration - (shift.breakMinutes || 0) / 60;

      projectedHours += workHours;

      // Count hours already worked
      if (shift.status === 'COMPLETED' || shift.endTime < now) {
        currentHours += workHours;
      }
    }

    // Check if approaching or exceeding overtime
    if (projectedHours >= warningThreshold) {
      const hoursOver = Math.max(0, projectedHours - overtimeThreshold);
      const hourlyRate = Number(employee.hourlyRate) || 0;

      alerts.push({
        employeeId: employee.id,
        employeeName: employee.name,
        currentHours,
        projectedHours,
        overtimeThreshold,
        hoursOverThreshold: hoursOver,
        projectedOvertimeCost: hoursOver * hourlyRate * 0.5, // OT premium only
        alertLevel:
          projectedHours >= overtimeThreshold ? 'critical' : 'warning',
      });
    }
  }

  // Sort by severity (critical first) then by hours over
  return alerts.sort((a, b) => {
    if (a.alertLevel === b.alertLevel) {
      return b.hoursOverThreshold - a.hoursOverThreshold;
    }
    return a.alertLevel === 'critical' ? -1 : 1;
  });
}

/**
 * Check if assigning a shift would cause overtime
 */
export async function checkOvertimeImpact(
  employeeId: number,
  shiftStartTime: Date,
  shiftEndTime: Date,
  breakMinutes: number = 0,
): Promise<{
  wouldCauseOvertime: boolean;
  currentWeekHours: number;
  shiftHours: number;
  projectedWeekHours: number;
  overtimeThreshold: number;
  hoursOverThreshold: number;
}> {
  const employee = await prisma.shiftEmployee.findUnique({
    where: { id: employeeId },
    select: { configId: true },
  });

  if (!employee) {
    throw new Error('Employee not found');
  }

  const config = await prisma.shiftSchedulingConfig.findFirst({
    where: { configId: employee.configId },
    select: { overtimeThreshold: true },
  });

  const overtimeThreshold = config?.overtimeThreshold || 40;

  // Get week boundaries
  const weekStart = new Date(shiftStartTime);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  // Get existing hours for the week
  const existingShifts = await prisma.shift.findMany({
    where: {
      employeeId,
      startTime: { gte: weekStart },
      endTime: { lte: weekEnd },
      status: { in: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'] },
    },
  });

  let currentWeekHours = 0;
  for (const shift of existingShifts) {
    const shiftDuration =
      (shift.endTime.getTime() - shift.startTime.getTime()) / (1000 * 60 * 60);
    currentWeekHours += shiftDuration - (shift.breakMinutes || 0) / 60;
  }

  // Calculate new shift hours
  const shiftHours =
    (shiftEndTime.getTime() - shiftStartTime.getTime()) / (1000 * 60 * 60) -
    breakMinutes / 60;

  const projectedWeekHours = currentWeekHours + shiftHours;
  const hoursOverThreshold = Math.max(
    0,
    projectedWeekHours - overtimeThreshold,
  );

  return {
    wouldCauseOvertime: projectedWeekHours > overtimeThreshold,
    currentWeekHours,
    shiftHours,
    projectedWeekHours,
    overtimeThreshold,
    hoursOverThreshold,
  };
}

/**
 * Get weekly overtime summary for all employees
 */
export async function getWeeklyOvertimeSummary(
  configId: number,
  weekStartDate: Date,
) {
  const alerts = await getOvertimeAlerts(configId, weekStartDate);

  const config = await prisma.shiftSchedulingConfig.findFirst({
    where: { configId },
    select: { overtimeThreshold: true },
  });

  const overtimeThreshold = config?.overtimeThreshold || 40;

  const employeesAtRisk = alerts.filter(
    (a) => a.alertLevel === 'warning',
  ).length;
  const employeesOvertime = alerts.filter(
    (a) => a.alertLevel === 'critical',
  ).length;
  const totalOvertimeHours = alerts.reduce(
    (sum, a) => sum + a.hoursOverThreshold,
    0,
  );
  const totalOvertimeCost = alerts.reduce(
    (sum, a) => sum + a.projectedOvertimeCost,
    0,
  );

  return {
    weekStart: weekStartDate,
    overtimeThreshold,
    employeesAtRisk,
    employeesOvertime,
    totalOvertimeHours,
    totalOvertimeCost,
    alerts,
  };
}

// ============================================================================
// ANALYTICS & REPORTS
// ============================================================================

/**
 * Get employee hours for a date range
 */
export async function getEmployeeHours(
  configId: number,
  startDate: Date,
  endDate: Date,
) {
  const employees = await prisma.shiftEmployee.findMany({
    where: { configId, isActive: true },
    include: {
      shifts: {
        where: {
          startTime: { gte: startDate, lte: endDate },
          status: { in: ['SCHEDULED', 'COMPLETED'] },
        },
      },
    },
  });

  return employees.map((employee) => {
    const totalMinutes = employee.shifts.reduce((sum, shift) => {
      const duration =
        (shift.endTime.getTime() - shift.startTime.getTime()) / (1000 * 60);
      return sum + duration - (shift.breakMinutes || 0);
    }, 0);

    return {
      employeeId: employee.id,
      employeeName: employee.name,
      totalHours: totalMinutes / 60,
      shiftCount: employee.shifts.length,
      overtimeHours: Math.max(
        0,
        totalMinutes / 60 - (employee.maxHoursPerWeek || 40),
      ),
    };
  });
}

/**
 * Get schedule coverage summary
 */
export async function getScheduleCoverage(scheduleId: number) {
  const schedule = await prisma.shiftSchedule.findUnique({
    where: { id: scheduleId },
    include: {
      shifts: {
        include: {
          role: true,
          location: true,
        },
      },
    },
  });

  if (!schedule) {
    throw new Error('Schedule not found');
  }

  const totalShifts = schedule.shifts.length;
  const assignedShifts = schedule.shifts.filter((s) => s.employeeId).length;
  const openShifts = totalShifts - assignedShifts;

  // Group by role
  const byRole = schedule.shifts.reduce(
    (acc, shift) => {
      const roleName = shift.role.name;
      if (!acc[roleName]) {
        acc[roleName] = { total: 0, assigned: 0, open: 0 };
      }
      acc[roleName].total++;
      if (shift.employeeId) {
        acc[roleName].assigned++;
      } else {
        acc[roleName].open++;
      }
      return acc;
    },
    {} as Record<string, { total: number; assigned: number; open: number }>,
  );

  // Group by location
  const byLocation = schedule.shifts.reduce(
    (acc, shift) => {
      const locationName = shift.location.name;
      if (!acc[locationName]) {
        acc[locationName] = { total: 0, assigned: 0, open: 0 };
      }
      acc[locationName].total++;
      if (shift.employeeId) {
        acc[locationName].assigned++;
      } else {
        acc[locationName].open++;
      }
      return acc;
    },
    {} as Record<string, { total: number; assigned: number; open: number }>,
  );

  return {
    totalShifts,
    assignedShifts,
    openShifts,
    coveragePercent: totalShifts > 0 ? (assignedShifts / totalShifts) * 100 : 0,
    byRole,
    byLocation,
  };
}
