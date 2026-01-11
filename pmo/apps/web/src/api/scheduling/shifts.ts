/**
 * Scheduling - Shifts API
 * API functions for employee shift scheduling management
 */

import { buildOptions, ApiError } from '../http';
import { buildApiUrl } from '../config';

// ============================================================================
// TYPES
// ============================================================================

export interface ShiftSchedulingConfig {
  id: number;
  schedulingConfigId: number;
  businessName: string | null;
  timezone: string;
  weekStartDay: number;
  weeklyOvertimeThreshold: number;
  dailyOvertimeThreshold: number;
  overtimeMultiplier: number;
  minRestBetweenShifts: number;
  maxConsecutiveDays: number;
  requireBreaks: boolean;
  breakDurationMinutes: number;
  breakAfterHours: number;
  schedulePublishLeadDays: number;
  enableShiftReminders: boolean;
  reminderHoursBefore: number;
  isActive: boolean;
}

export interface ShiftLocation {
  id: number;
  configId: number;
  name: string;
  address: string | null;
  timezone: string | null;
  isActive: boolean;
}

export interface ShiftRole {
  id: number;
  configId: number;
  name: string;
  color: string | null;
  minEmployeesPerShift: number;
  maxEmployeesPerShift: number | null;
}

export type EmploymentType =
  | 'FULL_TIME'
  | 'PART_TIME'
  | 'CONTRACT'
  | 'TEMPORARY';

export interface ShiftEmployee {
  id: number;
  configId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  employmentType: EmploymentType;
  hourlyRate: number | null;
  maxHoursPerWeek: number | null;
  isActive: boolean;
  hiredAt: string | null;
  role?: ShiftRole | null;
  preferredLocations?: ShiftLocation[];
  availability?: EmployeeAvailability[];
}

export type AvailabilityType = 'AVAILABLE' | 'PREFERRED' | 'UNAVAILABLE';

export interface EmployeeAvailability {
  id: number;
  employeeId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  type: AvailabilityType;
}

export type ScheduleStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface ShiftSchedule {
  id: number;
  configId: number;
  name: string;
  startDate: string;
  endDate: string;
  status: ScheduleStatus;
  publishedAt: string | null;
  publishedBy: number | null;
  shifts?: Shift[];
  _count?: {
    shifts: number;
  };
}

export interface Shift {
  id: number;
  configId: number;
  scheduleId: number;
  employeeId: number | null;
  locationId: number;
  roleId: number;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  notes: string | null;
  isOpen: boolean;
  postedAt: string | null;
  postedBy: number | null;
  employee?: ShiftEmployee | null;
  location?: ShiftLocation;
  role?: ShiftRole;
}

export type TimeOffStatus = 'PENDING' | 'APPROVED' | 'DENIED' | 'CANCELLED';
export type TimeOffType =
  | 'VACATION'
  | 'SICK'
  | 'PERSONAL'
  | 'BEREAVEMENT'
  | 'JURY_DUTY'
  | 'OTHER';

export interface TimeOffRequest {
  id: number;
  employeeId: number;
  startDate: string;
  endDate: string;
  type: TimeOffType;
  reason: string | null;
  status: TimeOffStatus;
  reviewedBy: number | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
  employee?: ShiftEmployee;
}

export type SwapStatus = 'PENDING' | 'APPROVED' | 'DENIED' | 'CANCELLED';

export interface ShiftSwapRequest {
  id: number;
  shiftId: number;
  requesterId: number;
  targetEmployeeId: number | null;
  status: SwapStatus;
  reason: string | null;
  reviewedBy: number | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
  shift?: Shift;
  requester?: ShiftEmployee;
  targetEmployee?: ShiftEmployee | null;
}

export interface ScheduleCoverage {
  totalShifts: number;
  assignedShifts: number;
  openShifts: number;
  coveragePercent: number;
  byRole: {
    roleId: number;
    roleName: string;
    required: number;
    assigned: number;
    open: number;
  }[];
  byLocation: {
    locationId: number;
    locationName: string;
    totalShifts: number;
    assignedShifts: number;
  }[];
}

export interface EmployeeHours {
  employeeId: number;
  employeeName: string;
  regularHours: number;
  overtimeHours: number;
  totalHours: number;
  shifts: number;
}

export interface LaborCost {
  totalCost: number;
  regularCost: number;
  overtimeCost: number;
  byEmployee: {
    employeeId: number;
    employeeName: string;
    regularHours: number;
    overtimeHours: number;
    regularCost: number;
    overtimeCost: number;
    totalCost: number;
  }[];
  byRole: {
    roleId: number;
    roleName: string;
    hours: number;
    cost: number;
  }[];
}

export interface OvertimeAlert {
  employeeId: number;
  employeeName: string;
  scheduledHours: number;
  threshold: number;
  overtimeHours: number;
  severity: 'warning' | 'critical';
}

export interface OvertimeSummary {
  weekStartDate: string;
  weekEndDate: string;
  totalEmployees: number;
  employeesAtRisk: number;
  totalOvertimeHours: number;
  estimatedOvertimeCost: number;
  alerts: OvertimeAlert[];
}

export interface OvertimeImpact {
  wouldCauseOvertime: boolean;
  currentWeeklyHours: number;
  projectedWeeklyHours: number;
  threshold: number;
  overtimeHours: number;
}

// ============================================================================
// INPUT TYPES
// ============================================================================

export interface UpdateShiftConfigInput {
  businessName?: string;
  timezone?: string;
  weekStartDay?: number;
  weeklyOvertimeThreshold?: number;
  dailyOvertimeThreshold?: number;
  overtimeMultiplier?: number;
  minRestBetweenShifts?: number;
  maxConsecutiveDays?: number;
  requireBreaks?: boolean;
  breakDurationMinutes?: number;
  breakAfterHours?: number;
  schedulePublishLeadDays?: number;
  enableShiftReminders?: boolean;
  reminderHoursBefore?: number;
  isActive?: boolean;
}

export interface CreateLocationInput {
  name: string;
  address?: string;
  timezone?: string;
  isActive?: boolean;
}

export interface CreateRoleInput {
  name: string;
  color?: string;
  minEmployeesPerShift?: number;
  maxEmployeesPerShift?: number;
}

export interface CreateEmployeeInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  employmentType: EmploymentType;
  hourlyRate?: number;
  maxHoursPerWeek?: number;
  roleId?: number;
  preferredLocations?: number[];
}

export interface AvailabilityInput {
  employeeId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  type: AvailabilityType;
}

export interface CreateScheduleInput {
  name: string;
  startDate: string;
  endDate: string;
  status?: ScheduleStatus;
}

export interface CreateShiftInput {
  employeeId?: number;
  locationId: number;
  roleId: number;
  startTime: string;
  endTime: string;
  breakMinutes?: number;
  notes?: string;
}

export interface ListShiftsParams {
  employeeId?: number;
  locationId?: number;
  roleId?: number;
  date?: string;
}

export interface TimeOffRequestInput {
  startDate: string;
  endDate: string;
  type: TimeOffType;
  reason?: string;
}

export interface OpenShiftFilters {
  locationId?: number;
  roleId?: number;
  startDate?: string;
  endDate?: string;
}

// ============================================================================
// API FUNCTIONS - CONFIG
// ============================================================================

export async function getShiftConfig(
  configId: number,
): Promise<ShiftSchedulingConfig | null> {
  const res = await fetch(
    buildApiUrl(`/scheduling/shifts/config/${configId}`),
    buildOptions(),
  );
  if (!res.ok) {
    if (res.status === 404) return null;
    const error = new Error('Failed to fetch shift config') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.data;
}

export async function updateShiftConfig(
  configId: number,
  input: UpdateShiftConfigInput,
): Promise<ShiftSchedulingConfig> {
  const res = await fetch(
    buildApiUrl(`/scheduling/shifts/config/${configId}`),
    buildOptions({
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  );
  if (!res.ok) {
    const error = new Error('Failed to update shift config') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.data;
}

// ============================================================================
// API FUNCTIONS - LOCATIONS
// ============================================================================

export async function listLocations(
  configId: number,
): Promise<ShiftLocation[]> {
  const res = await fetch(
    buildApiUrl(`/scheduling/shifts/${configId}/locations`),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch locations') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.data || [];
}

export async function createLocation(
  configId: number,
  input: CreateLocationInput,
): Promise<ShiftLocation> {
  const res = await fetch(
    buildApiUrl(`/scheduling/shifts/${configId}/locations`),
    buildOptions({
      method: 'POST',
      body: JSON.stringify(input),
    }),
  );
  if (!res.ok) {
    const error = new Error('Failed to create location') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.data;
}

export async function updateLocation(
  locationId: number,
  input: Partial<CreateLocationInput>,
): Promise<ShiftLocation> {
  const res = await fetch(
    buildApiUrl(`/scheduling/shifts/locations/${locationId}`),
    buildOptions({
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  );
  if (!res.ok) {
    const error = new Error('Failed to update location') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.data;
}

export async function deleteLocation(locationId: number): Promise<void> {
  const res = await fetch(
    buildApiUrl(`/scheduling/shifts/locations/${locationId}`),
    buildOptions({ method: 'DELETE' }),
  );
  if (!res.ok) {
    const error = new Error('Failed to delete location') as ApiError;
    error.status = res.status;
    throw error;
  }
}

// ============================================================================
// API FUNCTIONS - ROLES
// ============================================================================

export async function listRoles(configId: number): Promise<ShiftRole[]> {
  const res = await fetch(
    buildApiUrl(`/scheduling/shifts/${configId}/roles`),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch roles') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.data || [];
}

export async function createRole(
  configId: number,
  input: CreateRoleInput,
): Promise<ShiftRole> {
  const res = await fetch(
    buildApiUrl(`/scheduling/shifts/${configId}/roles`),
    buildOptions({
      method: 'POST',
      body: JSON.stringify(input),
    }),
  );
  if (!res.ok) {
    const error = new Error('Failed to create role') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.data;
}

export async function updateRole(
  roleId: number,
  input: Partial<CreateRoleInput>,
): Promise<ShiftRole> {
  const res = await fetch(
    buildApiUrl(`/scheduling/shifts/roles/${roleId}`),
    buildOptions({
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  );
  if (!res.ok) {
    const error = new Error('Failed to update role') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.data;
}

export async function deleteRole(roleId: number): Promise<void> {
  const res = await fetch(
    buildApiUrl(`/scheduling/shifts/roles/${roleId}`),
    buildOptions({ method: 'DELETE' }),
  );
  if (!res.ok) {
    const error = new Error('Failed to delete role') as ApiError;
    error.status = res.status;
    throw error;
  }
}

// ============================================================================
// API FUNCTIONS - EMPLOYEES
// ============================================================================

export async function listEmployees(
  configId: number,
  params?: {
    isActive?: boolean;
    roleId?: number;
    locationId?: number;
    employmentType?: EmploymentType;
  },
): Promise<ShiftEmployee[]> {
  const searchParams = new URLSearchParams();
  if (params?.isActive !== undefined)
    searchParams.set('isActive', String(params.isActive));
  if (params?.roleId) searchParams.set('roleId', params.roleId.toString());
  if (params?.locationId)
    searchParams.set('locationId', params.locationId.toString());
  if (params?.employmentType)
    searchParams.set('employmentType', params.employmentType);

  const res = await fetch(
    buildApiUrl(`/scheduling/shifts/${configId}/employees?${searchParams}`),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch employees') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.data || [];
}

export async function getEmployee(employeeId: number): Promise<ShiftEmployee> {
  const res = await fetch(
    buildApiUrl(`/scheduling/shifts/employees/${employeeId}`),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch employee') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.data;
}

export async function createEmployee(
  configId: number,
  input: CreateEmployeeInput,
): Promise<ShiftEmployee> {
  const res = await fetch(
    buildApiUrl(`/scheduling/shifts/${configId}/employees`),
    buildOptions({
      method: 'POST',
      body: JSON.stringify(input),
    }),
  );
  if (!res.ok) {
    const error = new Error('Failed to create employee') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.data;
}

export async function updateEmployee(
  employeeId: number,
  input: Partial<CreateEmployeeInput>,
): Promise<ShiftEmployee> {
  const res = await fetch(
    buildApiUrl(`/scheduling/shifts/employees/${employeeId}`),
    buildOptions({
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  );
  if (!res.ok) {
    const error = new Error('Failed to update employee') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.data;
}

export async function deactivateEmployee(
  employeeId: number,
): Promise<ShiftEmployee> {
  const res = await fetch(
    buildApiUrl(`/scheduling/shifts/employees/${employeeId}/deactivate`),
    buildOptions({ method: 'POST' }),
  );
  if (!res.ok) {
    const error = new Error('Failed to deactivate employee') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.data;
}

export async function getEmployeeAvailability(
  employeeId: number,
): Promise<EmployeeAvailability[]> {
  const res = await fetch(
    buildApiUrl(`/scheduling/shifts/employees/${employeeId}/availability`),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch availability') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.data || [];
}

export async function setEmployeeAvailability(
  employeeId: number,
  availability: AvailabilityInput[],
): Promise<EmployeeAvailability[]> {
  const res = await fetch(
    buildApiUrl(`/scheduling/shifts/employees/${employeeId}/availability`),
    buildOptions({
      method: 'PUT',
      body: JSON.stringify({ availability }),
    }),
  );
  if (!res.ok) {
    const error = new Error('Failed to set availability') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.data || [];
}

// ============================================================================
// API FUNCTIONS - TIME-OFF REQUESTS
// ============================================================================

export async function listTimeOffRequests(
  configId: number,
  params?: { employeeId?: number; status?: TimeOffStatus },
): Promise<TimeOffRequest[]> {
  const searchParams = new URLSearchParams();
  if (params?.employeeId)
    searchParams.set('employeeId', params.employeeId.toString());
  if (params?.status) searchParams.set('status', params.status);

  const res = await fetch(
    buildApiUrl(`/scheduling/shifts/${configId}/time-off?${searchParams}`),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch time-off requests') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.data || [];
}

export async function createTimeOffRequest(
  employeeId: number,
  input: TimeOffRequestInput,
): Promise<TimeOffRequest> {
  const res = await fetch(
    buildApiUrl(`/scheduling/shifts/employees/${employeeId}/time-off`),
    buildOptions({
      method: 'POST',
      body: JSON.stringify(input),
    }),
  );
  if (!res.ok) {
    const error = new Error('Failed to create time-off request') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.data;
}

export async function approveTimeOffRequest(
  requestId: number,
  notes?: string,
): Promise<TimeOffRequest> {
  const res = await fetch(
    buildApiUrl(`/scheduling/shifts/time-off/${requestId}/approve`),
    buildOptions({
      method: 'POST',
      body: JSON.stringify({ notes }),
    }),
  );
  if (!res.ok) {
    const error = new Error('Failed to approve time-off request') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.data;
}

export async function denyTimeOffRequest(
  requestId: number,
  notes?: string,
): Promise<TimeOffRequest> {
  const res = await fetch(
    buildApiUrl(`/scheduling/shifts/time-off/${requestId}/deny`),
    buildOptions({
      method: 'POST',
      body: JSON.stringify({ notes }),
    }),
  );
  if (!res.ok) {
    const error = new Error('Failed to deny time-off request') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.data;
}

// ============================================================================
// API FUNCTIONS - SCHEDULES
// ============================================================================

export async function listSchedules(
  configId: number,
  params?: { status?: ScheduleStatus },
): Promise<ShiftSchedule[]> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);

  const res = await fetch(
    buildApiUrl(`/scheduling/shifts/${configId}/schedules?${searchParams}`),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch schedules') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.data || [];
}

export async function getSchedule(scheduleId: number): Promise<ShiftSchedule> {
  const res = await fetch(
    buildApiUrl(`/scheduling/shifts/schedules/${scheduleId}`),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch schedule') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.data;
}

export async function createSchedule(
  configId: number,
  input: CreateScheduleInput,
): Promise<ShiftSchedule> {
  const res = await fetch(
    buildApiUrl(`/scheduling/shifts/${configId}/schedules`),
    buildOptions({
      method: 'POST',
      body: JSON.stringify(input),
    }),
  );
  if (!res.ok) {
    const error = new Error('Failed to create schedule') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.data;
}

export async function updateSchedule(
  scheduleId: number,
  input: Partial<CreateScheduleInput>,
): Promise<ShiftSchedule> {
  const res = await fetch(
    buildApiUrl(`/scheduling/shifts/schedules/${scheduleId}`),
    buildOptions({
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  );
  if (!res.ok) {
    const error = new Error('Failed to update schedule') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.data;
}

export async function publishSchedule(
  scheduleId: number,
): Promise<ShiftSchedule> {
  const res = await fetch(
    buildApiUrl(`/scheduling/shifts/schedules/${scheduleId}/publish`),
    buildOptions({ method: 'POST' }),
  );
  if (!res.ok) {
    const error = new Error('Failed to publish schedule') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.data;
}

export async function deleteSchedule(scheduleId: number): Promise<void> {
  const res = await fetch(
    buildApiUrl(`/scheduling/shifts/schedules/${scheduleId}`),
    buildOptions({ method: 'DELETE' }),
  );
  if (!res.ok) {
    const error = new Error('Failed to delete schedule') as ApiError;
    error.status = res.status;
    throw error;
  }
}

export async function getScheduleCoverage(
  scheduleId: number,
): Promise<ScheduleCoverage> {
  const res = await fetch(
    buildApiUrl(`/scheduling/shifts/schedules/${scheduleId}/coverage`),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch schedule coverage') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.data;
}

// ============================================================================
// API FUNCTIONS - SHIFTS
// ============================================================================

export async function listShifts(
  scheduleId: number,
  params: ListShiftsParams = {},
): Promise<Shift[]> {
  const searchParams = new URLSearchParams();
  if (params.employeeId)
    searchParams.set('employeeId', params.employeeId.toString());
  if (params.locationId)
    searchParams.set('locationId', params.locationId.toString());
  if (params.roleId) searchParams.set('roleId', params.roleId.toString());
  if (params.date) searchParams.set('date', params.date);

  const res = await fetch(
    buildApiUrl(
      `/scheduling/shifts/schedules/${scheduleId}/shifts?${searchParams}`,
    ),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch shifts') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.data || [];
}

export async function createShift(
  scheduleId: number,
  input: CreateShiftInput,
): Promise<Shift> {
  const res = await fetch(
    buildApiUrl(`/scheduling/shifts/schedules/${scheduleId}/shifts`),
    buildOptions({
      method: 'POST',
      body: JSON.stringify(input),
    }),
  );
  if (!res.ok) {
    const error = new Error('Failed to create shift') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.data;
}

export async function updateShift(
  shiftId: number,
  input: Partial<CreateShiftInput>,
): Promise<Shift> {
  const res = await fetch(
    buildApiUrl(`/scheduling/shifts/shift/${shiftId}`),
    buildOptions({
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  );
  if (!res.ok) {
    const error = new Error('Failed to update shift') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.data;
}

export async function deleteShift(shiftId: number): Promise<void> {
  const res = await fetch(
    buildApiUrl(`/scheduling/shifts/shift/${shiftId}`),
    buildOptions({ method: 'DELETE' }),
  );
  if (!res.ok) {
    const error = new Error('Failed to delete shift') as ApiError;
    error.status = res.status;
    throw error;
  }
}

export async function assignEmployee(
  shiftId: number,
  employeeId: number,
): Promise<Shift> {
  const res = await fetch(
    buildApiUrl(`/scheduling/shifts/shift/${shiftId}/assign`),
    buildOptions({
      method: 'POST',
      body: JSON.stringify({ employeeId }),
    }),
  );
  if (!res.ok) {
    const error = new Error('Failed to assign employee') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.data;
}

export async function unassignEmployee(shiftId: number): Promise<Shift> {
  const res = await fetch(
    buildApiUrl(`/scheduling/shifts/shift/${shiftId}/unassign`),
    buildOptions({ method: 'POST' }),
  );
  if (!res.ok) {
    const error = new Error('Failed to unassign employee') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.data;
}

// ============================================================================
// API FUNCTIONS - SHIFT SWAPS
// ============================================================================

export async function listSwapRequests(
  configId: number,
  params?: { status?: SwapStatus },
): Promise<ShiftSwapRequest[]> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);

  const res = await fetch(
    buildApiUrl(`/scheduling/shifts/${configId}/swaps?${searchParams}`),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch swap requests') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.data || [];
}

export async function createSwapRequest(
  shiftId: number,
  requesterId: number,
  targetEmployeeId?: number,
  reason?: string,
): Promise<ShiftSwapRequest> {
  const res = await fetch(
    buildApiUrl(`/scheduling/shifts/shift/${shiftId}/swap`),
    buildOptions({
      method: 'POST',
      body: JSON.stringify({ requesterId, targetEmployeeId, reason }),
    }),
  );
  if (!res.ok) {
    const error = new Error('Failed to create swap request') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.data;
}

export async function approveSwapRequest(
  requestId: number,
  notes?: string,
): Promise<ShiftSwapRequest> {
  const res = await fetch(
    buildApiUrl(`/scheduling/shifts/swaps/${requestId}/approve`),
    buildOptions({
      method: 'POST',
      body: JSON.stringify({ notes }),
    }),
  );
  if (!res.ok) {
    const error = new Error('Failed to approve swap request') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.data;
}

export async function denySwapRequest(
  requestId: number,
  notes?: string,
): Promise<ShiftSwapRequest> {
  const res = await fetch(
    buildApiUrl(`/scheduling/shifts/swaps/${requestId}/deny`),
    buildOptions({
      method: 'POST',
      body: JSON.stringify({ notes }),
    }),
  );
  if (!res.ok) {
    const error = new Error('Failed to deny swap request') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.data;
}

// ============================================================================
// API FUNCTIONS - OPEN SHIFTS
// ============================================================================

export async function listOpenShifts(
  configId: number,
  params: OpenShiftFilters = {},
): Promise<Shift[]> {
  const searchParams = new URLSearchParams();
  if (params.locationId)
    searchParams.set('locationId', params.locationId.toString());
  if (params.roleId) searchParams.set('roleId', params.roleId.toString());
  if (params.startDate) searchParams.set('startDate', params.startDate);
  if (params.endDate) searchParams.set('endDate', params.endDate);

  const res = await fetch(
    buildApiUrl(`/scheduling/shifts/${configId}/open-shifts?${searchParams}`),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch open shifts') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.data || [];
}

export async function postShiftToOpenBoard(shiftId: number): Promise<Shift> {
  const res = await fetch(
    buildApiUrl(`/scheduling/shifts/shift/${shiftId}/post-open`),
    buildOptions({ method: 'POST' }),
  );
  if (!res.ok) {
    const error = new Error('Failed to post shift to open board') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.data;
}

export async function removeShiftFromOpenBoard(
  shiftId: number,
): Promise<Shift> {
  const res = await fetch(
    buildApiUrl(`/scheduling/shifts/shift/${shiftId}/remove-open`),
    buildOptions({ method: 'POST' }),
  );
  if (!res.ok) {
    const error = new Error(
      'Failed to remove shift from open board',
    ) as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.data;
}

export async function claimOpenShift(
  shiftId: number,
  employeeId: number,
): Promise<{ success: boolean; shift?: Shift; error?: string }> {
  const res = await fetch(
    buildApiUrl(`/scheduling/shifts/shift/${shiftId}/claim`),
    buildOptions({
      method: 'POST',
      body: JSON.stringify({ employeeId }),
    }),
  );
  const data = await res.json();
  if (!res.ok) {
    return { success: false, error: data.error || 'Failed to claim shift' };
  }
  return { success: true, shift: data.data };
}

export async function getEligibleEmployees(
  shiftId: number,
): Promise<ShiftEmployee[]> {
  const res = await fetch(
    buildApiUrl(`/scheduling/shifts/shift/${shiftId}/eligible-employees`),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch eligible employees') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.data || [];
}

// ============================================================================
// API FUNCTIONS - ANALYTICS
// ============================================================================

export async function getEmployeeHours(
  configId: number,
  startDate: string,
  endDate: string,
): Promise<EmployeeHours[]> {
  const searchParams = new URLSearchParams();
  searchParams.set('startDate', startDate);
  searchParams.set('endDate', endDate);

  const res = await fetch(
    buildApiUrl(`/scheduling/shifts/${configId}/hours?${searchParams}`),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch employee hours') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.data || [];
}

export async function getLaborCosts(
  scheduleId: number,
  overtimeMultiplier?: number,
): Promise<LaborCost> {
  const searchParams = new URLSearchParams();
  if (overtimeMultiplier)
    searchParams.set('overtimeMultiplier', overtimeMultiplier.toString());

  const res = await fetch(
    buildApiUrl(
      `/scheduling/shifts/schedules/${scheduleId}/labor-costs?${searchParams}`,
    ),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch labor costs') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.data;
}

export async function getLaborProjection(
  configId: number,
  startDate: string,
  endDate: string,
): Promise<LaborCost> {
  const searchParams = new URLSearchParams();
  searchParams.set('startDate', startDate);
  searchParams.set('endDate', endDate);

  const res = await fetch(
    buildApiUrl(
      `/scheduling/shifts/${configId}/labor-projection?${searchParams}`,
    ),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch labor projection') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.data;
}

export async function getOvertimeAlerts(
  configId: number,
  weekStart?: string,
): Promise<OvertimeAlert[]> {
  const searchParams = new URLSearchParams();
  if (weekStart) searchParams.set('weekStart', weekStart);

  const res = await fetch(
    buildApiUrl(
      `/scheduling/shifts/${configId}/overtime-alerts?${searchParams}`,
    ),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch overtime alerts') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.data || [];
}

export async function getOvertimeSummary(
  configId: number,
  weekStart?: string,
): Promise<OvertimeSummary> {
  const searchParams = new URLSearchParams();
  if (weekStart) searchParams.set('weekStart', weekStart);

  const res = await fetch(
    buildApiUrl(
      `/scheduling/shifts/${configId}/overtime-summary?${searchParams}`,
    ),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch overtime summary') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.data;
}

export async function checkOvertimeImpact(
  employeeId: number,
  startTime: string,
  endTime: string,
  breakMinutes?: number,
): Promise<OvertimeImpact> {
  const res = await fetch(
    buildApiUrl(`/scheduling/shifts/employees/${employeeId}/check-overtime`),
    buildOptions({
      method: 'POST',
      body: JSON.stringify({
        startTime,
        endTime,
        breakMinutes: breakMinutes || 0,
      }),
    }),
  );
  if (!res.ok) {
    const error = new Error('Failed to check overtime impact') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.data;
}
