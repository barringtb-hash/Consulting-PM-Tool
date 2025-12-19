/**
 * Scheduling React Query Hooks
 * Hooks for appointment scheduling, shift management, and AI features
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
} from '@tanstack/react-query';
import * as appointmentApi from '../../scheduling/appointments';
import * as shiftApi from '../../scheduling/shifts';
import * as aiApi from '../../scheduling/ai';
import * as templateApi from '../../scheduling/templates';
import type {
  SchedulingConfig,
  Provider,
  AppointmentType,
  Appointment,
  ListAppointmentsParams,
  AvailabilityParams,
  TimeSlot,
  WaitlistEntry,
  SchedulingAnalytics,
  CreateConfigInput,
  CreateProviderInput,
  CreateAppointmentTypeInput,
  CreateAppointmentInput,
  AppointmentStatus,
} from '../../scheduling/appointments';
import type {
  ShiftSchedulingConfig,
  ShiftLocation,
  ShiftRole,
  ShiftEmployee,
  ShiftSchedule,
  Shift,
  TimeOffRequest,
  ShiftSwapRequest,
  ScheduleCoverage,
  EmployeeHours,
  LaborCost,
  OvertimeAlert,
  OvertimeSummary,
  OvertimeImpact,
  UpdateShiftConfigInput,
  CreateLocationInput,
  CreateRoleInput,
  CreateEmployeeInput,
  AvailabilityInput,
  CreateScheduleInput,
  CreateShiftInput,
  ListShiftsParams,
  TimeOffRequestInput,
  OpenShiftFilters,
  EmploymentType,
  TimeOffStatus,
  ScheduleStatus,
  SwapStatus,
} from '../../scheduling/shifts';
import type {
  SmartSchedulingRecommendation,
  NoShowPrediction,
  NoShowStats,
  OptimalTimeSlot,
  ScheduleOptimization,
  NLBookingResponse,
} from '../../scheduling/ai';
import type {
  IndustryTemplate,
  TemplateSimplified,
  TemplateCategory,
  TemplatePreview,
  ApplyTemplateInput,
  ApplyTemplateResult,
  TemplateComparison,
} from '../../scheduling/templates';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const schedulingKeys = {
  all: ['scheduling'] as const,
  // Configs
  configs: () => [...schedulingKeys.all, 'configs'] as const,
  configsList: (params?: { clientId?: number }) =>
    [...schedulingKeys.configs(), 'list', params] as const,
  config: (clientId: number) =>
    [...schedulingKeys.configs(), clientId] as const,
  // Providers
  providers: (configId: number) =>
    [...schedulingKeys.all, 'providers', configId] as const,
  provider: (providerId: number) =>
    [...schedulingKeys.all, 'provider', providerId] as const,
  // Appointment Types
  appointmentTypes: (configId: number) =>
    [...schedulingKeys.all, 'appointmentTypes', configId] as const,
  // Appointments
  appointments: (configId: number) =>
    [...schedulingKeys.all, 'appointments', configId] as const,
  appointmentsList: (configId: number, params: ListAppointmentsParams) =>
    [...schedulingKeys.appointments(configId), 'list', params] as const,
  appointment: (appointmentId: number) =>
    [...schedulingKeys.all, 'appointment', appointmentId] as const,
  // Availability
  availability: (configId: number, params: AvailabilityParams) =>
    [...schedulingKeys.all, 'availability', configId, params] as const,
  // Waitlist
  waitlist: (configId: number, params?: { isActive?: boolean }) =>
    [...schedulingKeys.all, 'waitlist', configId, params] as const,
  // Analytics
  analytics: (configId: number, params?: { start?: string; end?: string }) =>
    [...schedulingKeys.all, 'analytics', configId, params] as const,
  highRisk: (configId: number, threshold?: number) =>
    [...schedulingKeys.all, 'highRisk', configId, threshold] as const,
  // AI Features
  smartRecommendations: (configId: number, params: object) =>
    [...schedulingKeys.all, 'smartRecommendations', configId, params] as const,
  optimalSlots: (configId: number, params: object) =>
    [...schedulingKeys.all, 'optimalSlots', configId, params] as const,
  scheduleOptimization: (configId: number, params: object) =>
    [...schedulingKeys.all, 'scheduleOptimization', configId, params] as const,
  noShowPrediction: (appointmentId: number) =>
    [...schedulingKeys.all, 'noShowPrediction', appointmentId] as const,
  noShowPredictions: (configId: number, params: object) =>
    [...schedulingKeys.all, 'noShowPredictions', configId, params] as const,
  noShowStats: (configId: number, params?: object) =>
    [...schedulingKeys.all, 'noShowStats', configId, params] as const,
};

export const shiftKeys = {
  all: ['shifts'] as const,
  // Config
  config: (configId: number) => [...shiftKeys.all, 'config', configId] as const,
  // Locations
  locations: (configId: number) =>
    [...shiftKeys.all, 'locations', configId] as const,
  // Roles
  roles: (configId: number) => [...shiftKeys.all, 'roles', configId] as const,
  // Employees
  employees: (configId: number) =>
    [...shiftKeys.all, 'employees', configId] as const,
  employeesList: (configId: number, params?: object) =>
    [...shiftKeys.employees(configId), 'list', params] as const,
  employee: (employeeId: number) =>
    [...shiftKeys.all, 'employee', employeeId] as const,
  employeeAvailability: (employeeId: number) =>
    [...shiftKeys.all, 'employeeAvailability', employeeId] as const,
  // Time-Off
  timeOffRequests: (configId: number, params?: object) =>
    [...shiftKeys.all, 'timeOff', configId, params] as const,
  // Schedules
  schedules: (configId: number) =>
    [...shiftKeys.all, 'schedules', configId] as const,
  schedulesList: (configId: number, params?: { status?: ScheduleStatus }) =>
    [...shiftKeys.schedules(configId), 'list', params] as const,
  schedule: (scheduleId: number) =>
    [...shiftKeys.all, 'schedule', scheduleId] as const,
  scheduleCoverage: (scheduleId: number) =>
    [...shiftKeys.all, 'scheduleCoverage', scheduleId] as const,
  // Shifts
  shifts: (scheduleId: number) =>
    [...shiftKeys.all, 'shifts', scheduleId] as const,
  shiftsList: (scheduleId: number, params?: ListShiftsParams) =>
    [...shiftKeys.shifts(scheduleId), 'list', params] as const,
  // Swap Requests
  swapRequests: (configId: number, params?: { status?: SwapStatus }) =>
    [...shiftKeys.all, 'swaps', configId, params] as const,
  // Open Shifts
  openShifts: (configId: number, params?: OpenShiftFilters) =>
    [...shiftKeys.all, 'openShifts', configId, params] as const,
  eligibleEmployees: (shiftId: number) =>
    [...shiftKeys.all, 'eligibleEmployees', shiftId] as const,
  // Analytics
  employeeHours: (configId: number, startDate: string, endDate: string) =>
    [...shiftKeys.all, 'hours', configId, startDate, endDate] as const,
  laborCosts: (scheduleId: number, overtimeMultiplier?: number) =>
    [...shiftKeys.all, 'laborCosts', scheduleId, overtimeMultiplier] as const,
  laborProjection: (configId: number, startDate: string, endDate: string) =>
    [
      ...shiftKeys.all,
      'laborProjection',
      configId,
      startDate,
      endDate,
    ] as const,
  overtimeAlerts: (configId: number, weekStart?: string) =>
    [...shiftKeys.all, 'overtimeAlerts', configId, weekStart] as const,
  overtimeSummary: (configId: number, weekStart?: string) =>
    [...shiftKeys.all, 'overtimeSummary', configId, weekStart] as const,
};

export const templateKeys = {
  all: ['templates'] as const,
  list: () => [...templateKeys.all, 'list'] as const,
  categories: () => [...templateKeys.all, 'categories'] as const,
  template: (templateId: string) =>
    [...templateKeys.all, 'detail', templateId] as const,
  preview: (templateId: string) =>
    [...templateKeys.all, 'preview', templateId] as const,
  byCategory: (category: string) =>
    [...templateKeys.all, 'byCategory', category] as const,
  applied: (clientId: number) =>
    [...templateKeys.all, 'applied', clientId] as const,
  comparison: (clientId: number, templateId: string) =>
    [...templateKeys.all, 'comparison', clientId, templateId] as const,
};

// ============================================================================
// APPOINTMENT SCHEDULING HOOKS - CONFIGS
// ============================================================================

export function useSchedulingConfigs(
  params?: { clientId?: number },
  options?: Omit<UseQueryOptions<SchedulingConfig[]>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: schedulingKeys.configsList(params),
    queryFn: () => appointmentApi.listConfigs(params),
    ...options,
  });
}

export function useSchedulingConfig(
  clientId: number,
  options?: Omit<
    UseQueryOptions<SchedulingConfig | null>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery({
    queryKey: schedulingKeys.config(clientId),
    queryFn: () => appointmentApi.getConfig(clientId),
    enabled: !!clientId,
    ...options,
  });
}

export function useCreateSchedulingConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      clientId,
      input,
    }: {
      clientId: number;
      input: CreateConfigInput;
    }) => appointmentApi.createConfig(clientId, input),
    onSuccess: (_, { clientId }) => {
      queryClient.invalidateQueries({ queryKey: schedulingKeys.configs() });
      queryClient.invalidateQueries({
        queryKey: schedulingKeys.config(clientId),
      });
    },
  });
}

export function useUpdateSchedulingConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      clientId,
      input,
    }: {
      clientId: number;
      input: Partial<CreateConfigInput>;
    }) => appointmentApi.updateConfig(clientId, input),
    onSuccess: (_, { clientId }) => {
      queryClient.invalidateQueries({
        queryKey: schedulingKeys.config(clientId),
      });
    },
  });
}

// ============================================================================
// APPOINTMENT SCHEDULING HOOKS - PROVIDERS
// ============================================================================

export function useProviders(
  configId: number,
  options?: Omit<UseQueryOptions<Provider[]>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: schedulingKeys.providers(configId),
    queryFn: () => appointmentApi.listProviders(configId),
    enabled: !!configId,
    ...options,
  });
}

export function useProvider(
  providerId: number,
  options?: Omit<UseQueryOptions<Provider>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: schedulingKeys.provider(providerId),
    queryFn: () => appointmentApi.getProvider(providerId),
    enabled: !!providerId,
    ...options,
  });
}

export function useCreateProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      configId,
      input,
    }: {
      configId: number;
      input: CreateProviderInput;
    }) => appointmentApi.createProvider(configId, input),
    onSuccess: (_, { configId }) => {
      queryClient.invalidateQueries({
        queryKey: schedulingKeys.providers(configId),
      });
    },
  });
}

export function useUpdateProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      providerId,
      input,
      configId: _configId,
    }: {
      providerId: number;
      input: Partial<CreateProviderInput>;
      configId: number;
    }) => appointmentApi.updateProvider(providerId, input),
    onSuccess: (_, { providerId, configId }) => {
      queryClient.invalidateQueries({
        queryKey: schedulingKeys.provider(providerId),
      });
      queryClient.invalidateQueries({
        queryKey: schedulingKeys.providers(configId),
      });
    },
  });
}

export function useDeleteProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      providerId,
      configId: _configId,
    }: {
      providerId: number;
      configId: number;
    }) => appointmentApi.deleteProvider(providerId),
    onSuccess: (_, { configId }) => {
      queryClient.invalidateQueries({
        queryKey: schedulingKeys.providers(configId),
      });
    },
  });
}

// ============================================================================
// APPOINTMENT SCHEDULING HOOKS - APPOINTMENT TYPES
// ============================================================================

export function useAppointmentTypes(
  configId: number,
  options?: Omit<UseQueryOptions<AppointmentType[]>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: schedulingKeys.appointmentTypes(configId),
    queryFn: () => appointmentApi.listAppointmentTypes(configId),
    enabled: !!configId,
    ...options,
  });
}

export function useCreateAppointmentType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      configId,
      input,
    }: {
      configId: number;
      input: CreateAppointmentTypeInput;
    }) => appointmentApi.createAppointmentType(configId, input),
    onSuccess: (_, { configId }) => {
      queryClient.invalidateQueries({
        queryKey: schedulingKeys.appointmentTypes(configId),
      });
    },
  });
}

export function useUpdateAppointmentType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      typeId,
      input,
      configId: _configId,
    }: {
      typeId: number;
      input: Partial<CreateAppointmentTypeInput>;
      configId: number;
    }) => appointmentApi.updateAppointmentType(typeId, input),
    onSuccess: (_, { configId }) => {
      queryClient.invalidateQueries({
        queryKey: schedulingKeys.appointmentTypes(configId),
      });
    },
  });
}

export function useDeleteAppointmentType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      typeId,
      configId: _configId,
    }: {
      typeId: number;
      configId: number;
    }) => appointmentApi.deleteAppointmentType(typeId),
    onSuccess: (_, { configId }) => {
      queryClient.invalidateQueries({
        queryKey: schedulingKeys.appointmentTypes(configId),
      });
    },
  });
}

// ============================================================================
// APPOINTMENT SCHEDULING HOOKS - APPOINTMENTS
// ============================================================================

export function useAppointments(
  configId: number,
  params: ListAppointmentsParams = {},
  options?: Omit<UseQueryOptions<Appointment[]>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: schedulingKeys.appointmentsList(configId, params),
    queryFn: () => appointmentApi.listAppointments(configId, params),
    enabled: !!configId,
    ...options,
  });
}

export function useAppointment(
  appointmentId: number,
  options?: Omit<UseQueryOptions<Appointment>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: schedulingKeys.appointment(appointmentId),
    queryFn: () => appointmentApi.getAppointment(appointmentId),
    enabled: !!appointmentId,
    ...options,
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      configId,
      input,
    }: {
      configId: number;
      input: CreateAppointmentInput;
    }) => appointmentApi.createAppointment(configId, input),
    onSuccess: (_, { configId }) => {
      queryClient.invalidateQueries({
        queryKey: schedulingKeys.appointments(configId),
      });
    },
  });
}

export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      appointmentId,
      status,
      options,
      configId: _configId,
    }: {
      appointmentId: number;
      status: AppointmentStatus;
      options?: {
        notes?: string;
        cancellationReason?: string;
        cancelledBy?: string;
      };
      configId: number;
    }) =>
      appointmentApi.updateAppointmentStatus(appointmentId, status, options),
    onSuccess: (_, { appointmentId, configId }) => {
      queryClient.invalidateQueries({
        queryKey: schedulingKeys.appointment(appointmentId),
      });
      queryClient.invalidateQueries({
        queryKey: schedulingKeys.appointments(configId),
      });
    },
  });
}

export function useRescheduleAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      appointmentId,
      newScheduledAt,
      newProviderId,
      configId: _configId,
    }: {
      appointmentId: number;
      newScheduledAt: string;
      newProviderId?: number;
      configId: number;
    }) =>
      appointmentApi.rescheduleAppointment(
        appointmentId,
        newScheduledAt,
        newProviderId,
      ),
    onSuccess: (_, { appointmentId, configId }) => {
      queryClient.invalidateQueries({
        queryKey: schedulingKeys.appointment(appointmentId),
      });
      queryClient.invalidateQueries({
        queryKey: schedulingKeys.appointments(configId),
      });
    },
  });
}

// ============================================================================
// APPOINTMENT SCHEDULING HOOKS - AVAILABILITY
// ============================================================================

export function useAvailability(
  configId: number,
  params: AvailabilityParams = {},
  options?: Omit<UseQueryOptions<TimeSlot[]>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: schedulingKeys.availability(configId, params),
    queryFn: () => appointmentApi.getAvailability(configId, params),
    enabled: !!configId,
    ...options,
  });
}

// ============================================================================
// APPOINTMENT SCHEDULING HOOKS - WAITLIST
// ============================================================================

export function useWaitlist(
  configId: number,
  params?: { isActive?: boolean },
  options?: Omit<UseQueryOptions<WaitlistEntry[]>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: schedulingKeys.waitlist(configId, params),
    queryFn: () => appointmentApi.getWaitlist(configId, params),
    enabled: !!configId,
    ...options,
  });
}

export function useAddToWaitlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      configId,
      input,
    }: {
      configId: number;
      input: Parameters<typeof appointmentApi.addToWaitlist>[1];
    }) => appointmentApi.addToWaitlist(configId, input),
    onSuccess: (_, { configId }) => {
      queryClient.invalidateQueries({
        queryKey: schedulingKeys.waitlist(configId),
      });
    },
  });
}

export function useRemoveFromWaitlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      entryId,
      configId: _configId,
    }: {
      entryId: number;
      configId: number;
    }) => appointmentApi.removeFromWaitlist(entryId),
    onSuccess: (_, { configId }) => {
      queryClient.invalidateQueries({
        queryKey: schedulingKeys.waitlist(configId),
      });
    },
  });
}

// ============================================================================
// APPOINTMENT SCHEDULING HOOKS - ANALYTICS
// ============================================================================

export function useSchedulingAnalytics(
  configId: number,
  params?: { start?: string; end?: string },
  options?: Omit<UseQueryOptions<SchedulingAnalytics>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: schedulingKeys.analytics(configId, params),
    queryFn: () => appointmentApi.getAnalytics(configId, params),
    enabled: !!configId,
    ...options,
  });
}

export function useHighRiskAppointments(
  configId: number,
  threshold?: number,
  options?: Omit<UseQueryOptions<Appointment[]>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: schedulingKeys.highRisk(configId, threshold),
    queryFn: () => appointmentApi.getHighRiskAppointments(configId, threshold),
    enabled: !!configId,
    ...options,
  });
}

// ============================================================================
// AI FEATURES HOOKS
// ============================================================================

export function useSmartRecommendations(
  configId: number,
  params: Parameters<typeof aiApi.getSmartRecommendations>[1],
  options?: Omit<
    UseQueryOptions<SmartSchedulingRecommendation[]>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery({
    queryKey: schedulingKeys.smartRecommendations(configId, params),
    queryFn: () => aiApi.getSmartRecommendations(configId, params),
    enabled: !!configId && !!params.startDate && !!params.endDate,
    ...options,
  });
}

export function useOptimalSlots(
  configId: number,
  params: Parameters<typeof aiApi.getOptimalSlots>[1],
  options?: Omit<UseQueryOptions<OptimalTimeSlot[]>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: schedulingKeys.optimalSlots(configId, params),
    queryFn: () => aiApi.getOptimalSlots(configId, params),
    enabled: !!configId && !!params.date,
    ...options,
  });
}

export function useScheduleOptimization(
  configId: number,
  params: Parameters<typeof aiApi.getScheduleOptimization>[1],
  options?: Omit<UseQueryOptions<ScheduleOptimization>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: schedulingKeys.scheduleOptimization(configId, params),
    queryFn: () => aiApi.getScheduleOptimization(configId, params),
    enabled: !!configId && !!params.startDate && !!params.endDate,
    ...options,
  });
}

export function useNoShowPrediction(
  appointmentId: number,
  options?: Omit<UseQueryOptions<NoShowPrediction>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: schedulingKeys.noShowPrediction(appointmentId),
    queryFn: () => aiApi.predictNoShow(appointmentId),
    enabled: !!appointmentId,
    ...options,
  });
}

export function useNoShowPredictions(
  configId: number,
  params: Parameters<typeof aiApi.getBatchNoShowPredictions>[1],
  options?: Omit<UseQueryOptions<NoShowPrediction[]>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: schedulingKeys.noShowPredictions(configId, params),
    queryFn: () => aiApi.getBatchNoShowPredictions(configId, params),
    enabled: !!configId && !!params.startDate && !!params.endDate,
    ...options,
  });
}

export function useNoShowStats(
  configId: number,
  params?: Parameters<typeof aiApi.getNoShowStats>[1],
  options?: Omit<UseQueryOptions<NoShowStats>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: schedulingKeys.noShowStats(configId, params),
    queryFn: () => aiApi.getNoShowStats(configId, params),
    enabled: !!configId,
    ...options,
  });
}

export function useSendNLMessage() {
  return useMutation({
    mutationFn: ({
      slug,
      message,
      conversationId,
    }: {
      slug: string;
      message: string;
      conversationId?: string;
    }) => aiApi.sendNLMessage(slug, message, conversationId),
  });
}

export function useClearNLConversation() {
  return useMutation({
    mutationFn: ({
      slug,
      conversationId,
    }: {
      slug: string;
      conversationId: string;
    }) => aiApi.clearNLConversation(slug, conversationId),
  });
}

// ============================================================================
// SHIFT SCHEDULING HOOKS - CONFIG
// ============================================================================

export function useShiftConfig(
  configId: number,
  options?: Omit<
    UseQueryOptions<ShiftSchedulingConfig | null>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery({
    queryKey: shiftKeys.config(configId),
    queryFn: () => shiftApi.getShiftConfig(configId),
    enabled: !!configId,
    ...options,
  });
}

export function useUpdateShiftConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      configId,
      input,
    }: {
      configId: number;
      input: UpdateShiftConfigInput;
    }) => shiftApi.updateShiftConfig(configId, input),
    onSuccess: (_, { configId }) => {
      queryClient.invalidateQueries({ queryKey: shiftKeys.config(configId) });
    },
  });
}

// ============================================================================
// SHIFT SCHEDULING HOOKS - LOCATIONS
// ============================================================================

export function useShiftLocations(
  configId: number,
  options?: Omit<UseQueryOptions<ShiftLocation[]>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: shiftKeys.locations(configId),
    queryFn: () => shiftApi.listLocations(configId),
    enabled: !!configId,
    ...options,
  });
}

export function useCreateShiftLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      configId,
      input,
    }: {
      configId: number;
      input: CreateLocationInput;
    }) => shiftApi.createLocation(configId, input),
    onSuccess: (_, { configId }) => {
      queryClient.invalidateQueries({
        queryKey: shiftKeys.locations(configId),
      });
    },
  });
}

export function useUpdateShiftLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      locationId,
      input,
      configId: _configId,
    }: {
      locationId: number;
      input: Partial<CreateLocationInput>;
      configId: number;
    }) => shiftApi.updateLocation(locationId, input),
    onSuccess: (_, { configId }) => {
      queryClient.invalidateQueries({
        queryKey: shiftKeys.locations(configId),
      });
    },
  });
}

export function useDeleteShiftLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      locationId,
      configId: _configId,
    }: {
      locationId: number;
      configId: number;
    }) => shiftApi.deleteLocation(locationId),
    onSuccess: (_, { configId }) => {
      queryClient.invalidateQueries({
        queryKey: shiftKeys.locations(configId),
      });
    },
  });
}

// ============================================================================
// SHIFT SCHEDULING HOOKS - ROLES
// ============================================================================

export function useShiftRoles(
  configId: number,
  options?: Omit<UseQueryOptions<ShiftRole[]>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: shiftKeys.roles(configId),
    queryFn: () => shiftApi.listRoles(configId),
    enabled: !!configId,
    ...options,
  });
}

export function useCreateShiftRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      configId,
      input,
    }: {
      configId: number;
      input: CreateRoleInput;
    }) => shiftApi.createRole(configId, input),
    onSuccess: (_, { configId }) => {
      queryClient.invalidateQueries({ queryKey: shiftKeys.roles(configId) });
    },
  });
}

export function useUpdateShiftRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      roleId,
      input,
      configId: _configId,
    }: {
      roleId: number;
      input: Partial<CreateRoleInput>;
      configId: number;
    }) => shiftApi.updateRole(roleId, input),
    onSuccess: (_, { configId }) => {
      queryClient.invalidateQueries({ queryKey: shiftKeys.roles(configId) });
    },
  });
}

export function useDeleteShiftRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      roleId,
      configId: _configId,
    }: {
      roleId: number;
      configId: number;
    }) => shiftApi.deleteRole(roleId),
    onSuccess: (_, { configId }) => {
      queryClient.invalidateQueries({ queryKey: shiftKeys.roles(configId) });
    },
  });
}

// ============================================================================
// SHIFT SCHEDULING HOOKS - EMPLOYEES
// ============================================================================

export function useShiftEmployees(
  configId: number,
  params?: {
    isActive?: boolean;
    roleId?: number;
    locationId?: number;
    employmentType?: EmploymentType;
  },
  options?: Omit<UseQueryOptions<ShiftEmployee[]>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: shiftKeys.employeesList(configId, params),
    queryFn: () => shiftApi.listEmployees(configId, params),
    enabled: !!configId,
    ...options,
  });
}

export function useShiftEmployee(
  employeeId: number,
  options?: Omit<UseQueryOptions<ShiftEmployee>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: shiftKeys.employee(employeeId),
    queryFn: () => shiftApi.getEmployee(employeeId),
    enabled: !!employeeId,
    ...options,
  });
}

export function useCreateShiftEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      configId,
      input,
    }: {
      configId: number;
      input: CreateEmployeeInput;
    }) => shiftApi.createEmployee(configId, input),
    onSuccess: (_, { configId }) => {
      queryClient.invalidateQueries({
        queryKey: shiftKeys.employees(configId),
      });
    },
  });
}

export function useUpdateShiftEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      employeeId,
      input,
      configId: _configId,
    }: {
      employeeId: number;
      input: Partial<CreateEmployeeInput>;
      configId: number;
    }) => shiftApi.updateEmployee(employeeId, input),
    onSuccess: (_, { employeeId, configId }) => {
      queryClient.invalidateQueries({
        queryKey: shiftKeys.employee(employeeId),
      });
      queryClient.invalidateQueries({
        queryKey: shiftKeys.employees(configId),
      });
    },
  });
}

export function useDeactivateShiftEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      employeeId,
      configId: _configId,
    }: {
      employeeId: number;
      configId: number;
    }) => shiftApi.deactivateEmployee(employeeId),
    onSuccess: (_, { employeeId, configId }) => {
      queryClient.invalidateQueries({
        queryKey: shiftKeys.employee(employeeId),
      });
      queryClient.invalidateQueries({
        queryKey: shiftKeys.employees(configId),
      });
    },
  });
}

export function useEmployeeAvailability(
  employeeId: number,
  options?: Omit<
    UseQueryOptions<shiftApi.EmployeeAvailability[]>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery({
    queryKey: shiftKeys.employeeAvailability(employeeId),
    queryFn: () => shiftApi.getEmployeeAvailability(employeeId),
    enabled: !!employeeId,
    ...options,
  });
}

export function useSetEmployeeAvailability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      employeeId,
      availability,
    }: {
      employeeId: number;
      availability: AvailabilityInput[];
    }) => shiftApi.setEmployeeAvailability(employeeId, availability),
    onSuccess: (_, { employeeId }) => {
      queryClient.invalidateQueries({
        queryKey: shiftKeys.employeeAvailability(employeeId),
      });
    },
  });
}

// ============================================================================
// SHIFT SCHEDULING HOOKS - TIME-OFF
// ============================================================================

export function useTimeOffRequests(
  configId: number,
  params?: { employeeId?: number; status?: TimeOffStatus },
  options?: Omit<UseQueryOptions<TimeOffRequest[]>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: shiftKeys.timeOffRequests(configId, params),
    queryFn: () => shiftApi.listTimeOffRequests(configId, params),
    enabled: !!configId,
    ...options,
  });
}

export function useCreateTimeOffRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      employeeId,
      input,
      configId: _configId,
    }: {
      employeeId: number;
      input: TimeOffRequestInput;
      configId: number;
    }) => shiftApi.createTimeOffRequest(employeeId, input),
    onSuccess: (_, { configId }) => {
      queryClient.invalidateQueries({
        queryKey: shiftKeys.timeOffRequests(configId),
      });
    },
  });
}

export function useApproveTimeOffRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      requestId,
      notes,
      configId: _configId,
    }: {
      requestId: number;
      notes?: string;
      configId: number;
    }) => shiftApi.approveTimeOffRequest(requestId, notes),
    onSuccess: (_, { configId }) => {
      queryClient.invalidateQueries({
        queryKey: shiftKeys.timeOffRequests(configId),
      });
    },
  });
}

export function useDenyTimeOffRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      requestId,
      notes,
      configId: _configId,
    }: {
      requestId: number;
      notes?: string;
      configId: number;
    }) => shiftApi.denyTimeOffRequest(requestId, notes),
    onSuccess: (_, { configId }) => {
      queryClient.invalidateQueries({
        queryKey: shiftKeys.timeOffRequests(configId),
      });
    },
  });
}

// ============================================================================
// SHIFT SCHEDULING HOOKS - SCHEDULES
// ============================================================================

export function useShiftSchedules(
  configId: number,
  params?: { status?: ScheduleStatus },
  options?: Omit<UseQueryOptions<ShiftSchedule[]>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: shiftKeys.schedulesList(configId, params),
    queryFn: () => shiftApi.listSchedules(configId, params),
    enabled: !!configId,
    ...options,
  });
}

export function useShiftSchedule(
  scheduleId: number,
  options?: Omit<UseQueryOptions<ShiftSchedule>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: shiftKeys.schedule(scheduleId),
    queryFn: () => shiftApi.getSchedule(scheduleId),
    enabled: !!scheduleId,
    ...options,
  });
}

export function useCreateShiftSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      configId,
      input,
    }: {
      configId: number;
      input: CreateScheduleInput;
    }) => shiftApi.createSchedule(configId, input),
    onSuccess: (_, { configId }) => {
      queryClient.invalidateQueries({
        queryKey: shiftKeys.schedules(configId),
      });
    },
  });
}

export function useUpdateShiftSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      scheduleId,
      input,
      configId: _configId,
    }: {
      scheduleId: number;
      input: Partial<CreateScheduleInput>;
      configId: number;
    }) => shiftApi.updateSchedule(scheduleId, input),
    onSuccess: (_, { scheduleId, configId }) => {
      queryClient.invalidateQueries({
        queryKey: shiftKeys.schedule(scheduleId),
      });
      queryClient.invalidateQueries({
        queryKey: shiftKeys.schedules(configId),
      });
    },
  });
}

export function usePublishShiftSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      scheduleId,
      configId: _configId,
    }: {
      scheduleId: number;
      configId: number;
    }) => shiftApi.publishSchedule(scheduleId),
    onSuccess: (_, { scheduleId, configId }) => {
      queryClient.invalidateQueries({
        queryKey: shiftKeys.schedule(scheduleId),
      });
      queryClient.invalidateQueries({
        queryKey: shiftKeys.schedules(configId),
      });
    },
  });
}

export function useDeleteShiftSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      scheduleId,
      configId: _configId,
    }: {
      scheduleId: number;
      configId: number;
    }) => shiftApi.deleteSchedule(scheduleId),
    onSuccess: (_, { configId }) => {
      queryClient.invalidateQueries({
        queryKey: shiftKeys.schedules(configId),
      });
    },
  });
}

export function useScheduleCoverage(
  scheduleId: number,
  options?: Omit<UseQueryOptions<ScheduleCoverage>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: shiftKeys.scheduleCoverage(scheduleId),
    queryFn: () => shiftApi.getScheduleCoverage(scheduleId),
    enabled: !!scheduleId,
    ...options,
  });
}

// ============================================================================
// SHIFT SCHEDULING HOOKS - SHIFTS
// ============================================================================

export function useShifts(
  scheduleId: number,
  params: ListShiftsParams = {},
  options?: Omit<UseQueryOptions<Shift[]>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: shiftKeys.shiftsList(scheduleId, params),
    queryFn: () => shiftApi.listShifts(scheduleId, params),
    enabled: !!scheduleId,
    ...options,
  });
}

export function useCreateShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      scheduleId,
      input,
    }: {
      scheduleId: number;
      input: CreateShiftInput;
    }) => shiftApi.createShift(scheduleId, input),
    onSuccess: (_, { scheduleId }) => {
      queryClient.invalidateQueries({ queryKey: shiftKeys.shifts(scheduleId) });
      queryClient.invalidateQueries({
        queryKey: shiftKeys.scheduleCoverage(scheduleId),
      });
    },
  });
}

export function useUpdateShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      shiftId,
      input,
      scheduleId: _scheduleId,
    }: {
      shiftId: number;
      input: Partial<CreateShiftInput>;
      scheduleId: number;
    }) => shiftApi.updateShift(shiftId, input),
    onSuccess: (_, { scheduleId }) => {
      queryClient.invalidateQueries({ queryKey: shiftKeys.shifts(scheduleId) });
      queryClient.invalidateQueries({
        queryKey: shiftKeys.scheduleCoverage(scheduleId),
      });
    },
  });
}

export function useDeleteShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      shiftId,
      scheduleId: _scheduleId,
    }: {
      shiftId: number;
      scheduleId: number;
    }) => shiftApi.deleteShift(shiftId),
    onSuccess: (_, { scheduleId }) => {
      queryClient.invalidateQueries({ queryKey: shiftKeys.shifts(scheduleId) });
      queryClient.invalidateQueries({
        queryKey: shiftKeys.scheduleCoverage(scheduleId),
      });
    },
  });
}

export function useAssignEmployeeToShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      shiftId,
      employeeId,
      scheduleId: _scheduleId,
    }: {
      shiftId: number;
      employeeId: number;
      scheduleId: number;
    }) => shiftApi.assignEmployee(shiftId, employeeId),
    onSuccess: (_, { scheduleId }) => {
      queryClient.invalidateQueries({ queryKey: shiftKeys.shifts(scheduleId) });
      queryClient.invalidateQueries({
        queryKey: shiftKeys.scheduleCoverage(scheduleId),
      });
    },
  });
}

export function useUnassignEmployeeFromShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      shiftId,
      scheduleId: _scheduleId,
    }: {
      shiftId: number;
      scheduleId: number;
    }) => shiftApi.unassignEmployee(shiftId),
    onSuccess: (_, { scheduleId }) => {
      queryClient.invalidateQueries({ queryKey: shiftKeys.shifts(scheduleId) });
      queryClient.invalidateQueries({
        queryKey: shiftKeys.scheduleCoverage(scheduleId),
      });
    },
  });
}

// ============================================================================
// SHIFT SCHEDULING HOOKS - SWAP REQUESTS
// ============================================================================

export function useSwapRequests(
  configId: number,
  params?: { status?: SwapStatus },
  options?: Omit<UseQueryOptions<ShiftSwapRequest[]>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: shiftKeys.swapRequests(configId, params),
    queryFn: () => shiftApi.listSwapRequests(configId, params),
    enabled: !!configId,
    ...options,
  });
}

export function useCreateSwapRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      shiftId,
      requesterId,
      targetEmployeeId,
      reason,
      configId: _configId,
    }: {
      shiftId: number;
      requesterId: number;
      targetEmployeeId?: number;
      reason?: string;
      configId: number;
    }) =>
      shiftApi.createSwapRequest(
        shiftId,
        requesterId,
        targetEmployeeId,
        reason,
      ),
    onSuccess: (_, { configId }) => {
      queryClient.invalidateQueries({
        queryKey: shiftKeys.swapRequests(configId),
      });
    },
  });
}

export function useApproveSwapRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      requestId,
      notes,
      configId: _configId,
      scheduleId: _scheduleId,
    }: {
      requestId: number;
      notes?: string;
      configId: number;
      scheduleId: number;
    }) => shiftApi.approveSwapRequest(requestId, notes),
    onSuccess: (_, { configId, scheduleId }) => {
      queryClient.invalidateQueries({
        queryKey: shiftKeys.swapRequests(configId),
      });
      queryClient.invalidateQueries({ queryKey: shiftKeys.shifts(scheduleId) });
    },
  });
}

export function useDenySwapRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      requestId,
      notes,
      configId: _configId,
    }: {
      requestId: number;
      notes?: string;
      configId: number;
    }) => shiftApi.denySwapRequest(requestId, notes),
    onSuccess: (_, { configId }) => {
      queryClient.invalidateQueries({
        queryKey: shiftKeys.swapRequests(configId),
      });
    },
  });
}

// ============================================================================
// SHIFT SCHEDULING HOOKS - OPEN SHIFTS
// ============================================================================

export function useOpenShifts(
  configId: number,
  params: OpenShiftFilters = {},
  options?: Omit<UseQueryOptions<Shift[]>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: shiftKeys.openShifts(configId, params),
    queryFn: () => shiftApi.listOpenShifts(configId, params),
    enabled: !!configId,
    ...options,
  });
}

export function usePostShiftToOpenBoard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      shiftId,
      configId: _configId,
      scheduleId: _scheduleId,
    }: {
      shiftId: number;
      configId: number;
      scheduleId: number;
    }) => shiftApi.postShiftToOpenBoard(shiftId),
    onSuccess: (_, { configId, scheduleId }) => {
      queryClient.invalidateQueries({
        queryKey: shiftKeys.openShifts(configId),
      });
      queryClient.invalidateQueries({ queryKey: shiftKeys.shifts(scheduleId) });
    },
  });
}

export function useRemoveShiftFromOpenBoard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      shiftId,
      configId: _configId,
      scheduleId: _scheduleId,
    }: {
      shiftId: number;
      configId: number;
      scheduleId: number;
    }) => shiftApi.removeShiftFromOpenBoard(shiftId),
    onSuccess: (_, { configId, scheduleId }) => {
      queryClient.invalidateQueries({
        queryKey: shiftKeys.openShifts(configId),
      });
      queryClient.invalidateQueries({ queryKey: shiftKeys.shifts(scheduleId) });
    },
  });
}

export function useClaimOpenShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      shiftId,
      employeeId,
      configId: _configId,
      scheduleId: _scheduleId,
    }: {
      shiftId: number;
      employeeId: number;
      configId: number;
      scheduleId: number;
    }) => shiftApi.claimOpenShift(shiftId, employeeId),
    onSuccess: (_, { configId, scheduleId }) => {
      queryClient.invalidateQueries({
        queryKey: shiftKeys.openShifts(configId),
      });
      queryClient.invalidateQueries({ queryKey: shiftKeys.shifts(scheduleId) });
    },
  });
}

export function useEligibleEmployeesForShift(
  shiftId: number,
  options?: Omit<UseQueryOptions<ShiftEmployee[]>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: shiftKeys.eligibleEmployees(shiftId),
    queryFn: () => shiftApi.getEligibleEmployees(shiftId),
    enabled: !!shiftId,
    ...options,
  });
}

// ============================================================================
// SHIFT SCHEDULING HOOKS - ANALYTICS
// ============================================================================

export function useEmployeeHours(
  configId: number,
  startDate: string,
  endDate: string,
  options?: Omit<UseQueryOptions<EmployeeHours[]>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: shiftKeys.employeeHours(configId, startDate, endDate),
    queryFn: () => shiftApi.getEmployeeHours(configId, startDate, endDate),
    enabled: !!configId && !!startDate && !!endDate,
    ...options,
  });
}

export function useLaborCosts(
  scheduleId: number,
  overtimeMultiplier?: number,
  options?: Omit<UseQueryOptions<LaborCost>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: shiftKeys.laborCosts(scheduleId, overtimeMultiplier),
    queryFn: () => shiftApi.getLaborCosts(scheduleId, overtimeMultiplier),
    enabled: !!scheduleId,
    ...options,
  });
}

export function useLaborProjection(
  configId: number,
  startDate: string,
  endDate: string,
  options?: Omit<UseQueryOptions<LaborCost>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: shiftKeys.laborProjection(configId, startDate, endDate),
    queryFn: () => shiftApi.getLaborProjection(configId, startDate, endDate),
    enabled: !!configId && !!startDate && !!endDate,
    ...options,
  });
}

export function useOvertimeAlerts(
  configId: number,
  weekStart?: string,
  options?: Omit<UseQueryOptions<OvertimeAlert[]>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: shiftKeys.overtimeAlerts(configId, weekStart),
    queryFn: () => shiftApi.getOvertimeAlerts(configId, weekStart),
    enabled: !!configId,
    ...options,
  });
}

export function useOvertimeSummary(
  configId: number,
  weekStart?: string,
  options?: Omit<UseQueryOptions<OvertimeSummary>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: shiftKeys.overtimeSummary(configId, weekStart),
    queryFn: () => shiftApi.getOvertimeSummary(configId, weekStart),
    enabled: !!configId,
    ...options,
  });
}

export function useCheckOvertimeImpact() {
  return useMutation({
    mutationFn: ({
      employeeId,
      startTime,
      endTime,
      breakMinutes,
    }: {
      employeeId: number;
      startTime: string;
      endTime: string;
      breakMinutes?: number;
    }) =>
      shiftApi.checkOvertimeImpact(
        employeeId,
        startTime,
        endTime,
        breakMinutes,
      ),
  });
}

// ============================================================================
// INDUSTRY TEMPLATES HOOKS
// ============================================================================

export function useTemplates(
  options?: Omit<UseQueryOptions<TemplateSimplified[]>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: templateKeys.list(),
    queryFn: () => templateApi.listTemplates(),
    ...options,
  });
}

export function useTemplateCategories(
  options?: Omit<UseQueryOptions<TemplateCategory[]>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: templateKeys.categories(),
    queryFn: () => templateApi.getTemplateCategories(),
    ...options,
  });
}

export function useTemplate(
  templateId: string,
  options?: Omit<UseQueryOptions<IndustryTemplate>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: templateKeys.template(templateId),
    queryFn: () => templateApi.getTemplate(templateId),
    enabled: !!templateId,
    ...options,
  });
}

export function useTemplatePreview(
  templateId: string,
  options?: Omit<UseQueryOptions<TemplatePreview>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: templateKeys.preview(templateId),
    queryFn: () => templateApi.previewTemplate(templateId),
    enabled: !!templateId,
    ...options,
  });
}

export function useTemplatesByCategory(
  category: string,
  options?: Omit<UseQueryOptions<IndustryTemplate[]>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: templateKeys.byCategory(category),
    queryFn: () => templateApi.getTemplatesByCategory(category),
    enabled: !!category,
    ...options,
  });
}

export function useAppliedTemplate(
  clientId: number,
  options?: Omit<
    UseQueryOptions<IndustryTemplate | null>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery({
    queryKey: templateKeys.applied(clientId),
    queryFn: () => templateApi.getAppliedTemplate(clientId),
    enabled: !!clientId,
    ...options,
  });
}

export function useApplyTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ApplyTemplateInput) => templateApi.applyTemplate(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: templateKeys.applied(variables.clientId),
      });
      queryClient.invalidateQueries({
        queryKey: schedulingKeys.config(variables.clientId),
      });
      queryClient.invalidateQueries({
        queryKey: schedulingKeys.configs(),
      });
    },
  });
}

export function useResetToTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      clientId,
      templateId,
    }: {
      clientId: number;
      templateId: string;
    }) => templateApi.resetToTemplate(clientId, templateId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: templateKeys.applied(variables.clientId),
      });
      queryClient.invalidateQueries({
        queryKey: schedulingKeys.config(variables.clientId),
      });
    },
  });
}

export function useCompareWithTemplate(
  clientId: number,
  templateId: string,
  options?: Omit<UseQueryOptions<TemplateComparison>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: templateKeys.comparison(clientId, templateId),
    queryFn: () => templateApi.compareWithTemplate(clientId, templateId),
    enabled: !!clientId && !!templateId,
    ...options,
  });
}

// Re-export types
export type {
  SchedulingConfig,
  Provider,
  AppointmentType,
  Appointment,
  ListAppointmentsParams,
  AvailabilityParams,
  TimeSlot,
  WaitlistEntry,
  SchedulingAnalytics,
  CreateConfigInput,
  CreateProviderInput,
  CreateAppointmentTypeInput,
  CreateAppointmentInput,
  AppointmentStatus,
  ShiftSchedulingConfig,
  ShiftLocation,
  ShiftRole,
  ShiftEmployee,
  ShiftSchedule,
  Shift,
  TimeOffRequest,
  ShiftSwapRequest,
  ScheduleCoverage,
  EmployeeHours,
  LaborCost,
  OvertimeAlert,
  OvertimeSummary,
  OvertimeImpact,
  UpdateShiftConfigInput,
  CreateLocationInput,
  CreateRoleInput,
  CreateEmployeeInput,
  AvailabilityInput,
  CreateScheduleInput,
  CreateShiftInput,
  ListShiftsParams,
  TimeOffRequestInput,
  OpenShiftFilters,
  EmploymentType,
  TimeOffStatus,
  ScheduleStatus,
  SwapStatus,
  SmartSchedulingRecommendation,
  NoShowPrediction,
  NoShowStats,
  OptimalTimeSlot,
  ScheduleOptimization,
  NLBookingResponse,
  IndustryTemplate,
  TemplateSimplified,
  TemplateCategory,
  TemplatePreview,
  ApplyTemplateInput,
  ApplyTemplateResult,
  TemplateComparison,
};
