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
