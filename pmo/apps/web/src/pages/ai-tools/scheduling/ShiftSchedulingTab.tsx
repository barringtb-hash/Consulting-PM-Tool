/**
 * Shift Scheduling Tab Component
 *
 * Employee shift management with schedules, shifts, time-off requests, and swap requests.
 */

import React, { useState } from 'react';
import { Card, CardBody, CardHeader } from '../../../ui/Card';
import { Button } from '../../../ui/Button';
import { Badge } from '../../../ui/Badge';
import { Input } from '../../../ui/Input';
import { Select } from '../../../ui/Select';
import { useToast } from '../../../ui/Toast';
import {
  useShiftConfig,
  useShiftLocations,
  useShiftRoles,
  useShiftEmployees,
  useShiftSchedules,
  useShifts,
  useTimeOffRequests,
  useSwapRequests,
  useOvertimeAlerts,
  useScheduleCoverage,
  useCreateShiftSchedule,
  usePublishShiftSchedule,
  useCreateShift,
  useApproveTimeOffRequest,
  useDenyTimeOffRequest,
  useApproveSwapRequest,
  useDenySwapRequest,
} from '../../../api/hooks/scheduling';
import type { Shift } from '../../../api/hooks/scheduling';
import {
  Plus,
  Calendar,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowLeftRight,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface ShiftSchedulingTabProps {
  configId: number;
}

const STATUS_BADGES: Record<
  string,
  'primary' | 'success' | 'warning' | 'neutral' | 'secondary'
> = {
  DRAFT: 'neutral',
  PUBLISHED: 'success',
  ARCHIVED: 'secondary',
  PENDING: 'warning',
  APPROVED: 'success',
  DENIED: 'secondary',
  CANCELLED: 'neutral',
};

export function ShiftSchedulingTab({
  configId,
}: ShiftSchedulingTabProps): JSX.Element {
  const [activeSubTab, setActiveSubTab] = useState<
    'schedules' | 'employees' | 'time-off' | 'swaps' | 'coverage'
  >('schedules');
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(
    null,
  );
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(() => {
    const now = new Date();
    now.setDate(now.getDate() - now.getDay());
    now.setHours(0, 0, 0, 0);
    return now;
  });
  const [showCreateScheduleModal, setShowCreateScheduleModal] = useState(false);
  const [showCreateShiftModal, setShowCreateShiftModal] = useState(false);

  const { showToast } = useToast();

  // Queries
  const shiftConfigQuery = useShiftConfig(configId);
  const locationsQuery = useShiftLocations(configId);
  const rolesQuery = useShiftRoles(configId);
  const employeesQuery = useShiftEmployees(configId, { isActive: true });
  const schedulesQuery = useShiftSchedules(configId);
  const shiftsQuery = useShifts(
    selectedScheduleId || 0,
    {},
    { enabled: !!selectedScheduleId },
  );
  const timeOffQuery = useTimeOffRequests(configId, { status: 'PENDING' });
  const swapsQuery = useSwapRequests(configId, { status: 'PENDING' });
  const overtimeAlertsQuery = useOvertimeAlerts(configId);
  const coverageQuery = useScheduleCoverage(selectedScheduleId || 0, {
    enabled: !!selectedScheduleId,
  });

  // Mutations
  const createScheduleMutation = useCreateShiftSchedule();
  const publishScheduleMutation = usePublishShiftSchedule();
  const createShiftMutation = useCreateShift();
  const approveTimeOffMutation = useApproveTimeOffRequest();
  const denyTimeOffMutation = useDenyTimeOffRequest();
  const approveSwapMutation = useApproveSwapRequest();
  const denySwapMutation = useDenySwapRequest();

  const shiftConfig = shiftConfigQuery.data;
  const locations = locationsQuery.data || [];
  const roles = rolesQuery.data || [];
  const employees = employeesQuery.data || [];
  const schedules = schedulesQuery.data || [];
  const shifts = shiftsQuery.data || [];
  const timeOffRequests = timeOffQuery.data || [];
  const swapRequests = swapsQuery.data || [];
  const overtimeAlerts = overtimeAlertsQuery.data || [];
  const coverage = coverageQuery.data;

  const selectedSchedule = schedules.find((s) => s.id === selectedScheduleId);

  // Week navigation
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(selectedWeekStart);
    date.setDate(date.getDate() + i);
    return date;
  });

  const navigateWeek = (direction: 'prev' | 'next') => {
    setSelectedWeekStart((current) => {
      const newDate = new Date(current);
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
      return newDate;
    });
  };

  // Group shifts by day
  const shiftsByDay = shifts.reduce(
    (acc, shift) => {
      const day = new Date(shift.startTime).toDateString();
      if (!acc[day]) acc[day] = [];
      acc[day].push(shift);
      return acc;
    },
    {} as Record<string, Shift[]>,
  );

  const handleCreateSchedule = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createScheduleMutation.mutate(
      {
        configId,
        input: {
          name: formData.get('name') as string,
          startDate: formData.get('startDate') as string,
          endDate: formData.get('endDate') as string,
        },
      },
      {
        onSuccess: () => {
          setShowCreateScheduleModal(false);
          showToast('Schedule created successfully', 'success');
        },
        onError: (error) => {
          showToast(
            error instanceof Error
              ? error.message
              : 'Failed to create schedule',
            'error',
          );
        },
      },
    );
  };

  const handleCreateShift = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedScheduleId) return;

    const formData = new FormData(e.currentTarget);
    createShiftMutation.mutate(
      {
        scheduleId: selectedScheduleId,
        input: {
          locationId: Number(formData.get('locationId')),
          roleId: Number(formData.get('roleId')),
          startTime: formData.get('startTime') as string,
          endTime: formData.get('endTime') as string,
          breakMinutes: Number(formData.get('breakMinutes')) || 0,
          employeeId: formData.get('employeeId')
            ? Number(formData.get('employeeId'))
            : undefined,
        },
      },
      {
        onSuccess: () => {
          setShowCreateShiftModal(false);
          showToast('Shift created successfully', 'success');
        },
        onError: (error) => {
          showToast(
            error instanceof Error ? error.message : 'Failed to create shift',
            'error',
          );
        },
      },
    );
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (!shiftConfig) {
    return (
      <Card>
        <CardBody>
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
            <p className="text-neutral-600 dark:text-neutral-400">
              Shift scheduling is not configured for this account.
            </p>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overtime Alerts */}
      {overtimeAlerts.length > 0 && (
        <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20">
          <CardBody>
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-orange-800 dark:text-orange-200">
                  {overtimeAlerts.length} employees approaching overtime
                </p>
                <div className="mt-2 space-y-1">
                  {overtimeAlerts.slice(0, 3).map((alert) => (
                    <p
                      key={alert.employeeId}
                      className="text-sm text-orange-600 dark:text-orange-300"
                    >
                      {alert.employeeName}: {alert.scheduledHours}h scheduled (
                      {alert.overtimeHours}h overtime)
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Sub-tab Navigation */}
      <div className="flex gap-2 border-b border-neutral-200 dark:border-neutral-700 overflow-x-auto">
        {[
          { id: 'schedules', label: 'Schedules', icon: Calendar },
          { id: 'employees', label: 'Employees', icon: Users },
          {
            id: 'time-off',
            label: 'Time Off',
            icon: FileText,
            badge: timeOffRequests.length,
          },
          {
            id: 'swaps',
            label: 'Swap Requests',
            icon: ArrowLeftRight,
            badge: swapRequests.length,
          },
          { id: 'coverage', label: 'Coverage', icon: Clock },
        ].map(({ id, label, icon: Icon, badge }) => (
          <button
            key={id}
            onClick={() => setActiveSubTab(id as typeof activeSubTab)}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 whitespace-nowrap transition-colors ${
              activeSubTab === id
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
            {badge && badge > 0 && (
              <Badge variant="warning" className="ml-1 text-xs">
                {badge}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* Schedules Tab */}
      {activeSubTab === 'schedules' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Schedule List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Schedules</h3>
                  <Button
                    size="sm"
                    onClick={() => setShowCreateScheduleModal(true)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardBody>
                {schedules.length === 0 ? (
                  <p className="text-sm text-neutral-500 text-center py-4">
                    No schedules created yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {schedules.map((schedule) => (
                      <button
                        key={schedule.id}
                        onClick={() => setSelectedScheduleId(schedule.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          selectedScheduleId === schedule.id
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                            : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">
                            {schedule.name}
                          </span>
                          <Badge variant={STATUS_BADGES[schedule.status]}>
                            {schedule.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-neutral-500">
                          {formatDate(schedule.startDate)} -{' '}
                          {formatDate(schedule.endDate)}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          {/* Schedule View */}
          <div className="lg:col-span-3">
            {selectedSchedule ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{selectedSchedule.name}</h3>
                      <p className="text-sm text-neutral-500">
                        {formatDate(selectedSchedule.startDate)} -{' '}
                        {formatDate(selectedSchedule.endDate)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {selectedSchedule.status === 'DRAFT' && (
                        <Button
                          variant="secondary"
                          onClick={() =>
                            publishScheduleMutation.mutate(
                              { scheduleId: selectedSchedule.id, configId },
                              {
                                onSuccess: () =>
                                  showToast('Schedule published', 'success'),
                                onError: () =>
                                  showToast('Failed to publish', 'error'),
                              },
                            )
                          }
                        >
                          Publish
                        </Button>
                      )}
                      <Button onClick={() => setShowCreateShiftModal(true)}>
                        <Plus className="w-4 h-4" />
                        Add Shift
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardBody>
                  {/* Week Navigation */}
                  <div className="flex items-center justify-between mb-4">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigateWeek('prev')}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="font-medium">
                      {selectedWeekStart.toLocaleDateString('en-US', {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigateWeek('next')}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Week Grid */}
                  <div className="grid grid-cols-7 gap-2">
                    {weekDays.map((day) => {
                      const dayShifts = shiftsByDay[day.toDateString()] || [];
                      return (
                        <div
                          key={day.toISOString()}
                          className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-2 min-h-[150px]"
                        >
                          <div className="text-center mb-2">
                            <p className="text-xs text-neutral-500">
                              {day.toLocaleDateString('en-US', {
                                weekday: 'short',
                              })}
                            </p>
                            <p className="font-semibold">{day.getDate()}</p>
                          </div>
                          <div className="space-y-1">
                            {dayShifts.map((shift) => (
                              <div
                                key={shift.id}
                                className={`text-xs p-1.5 rounded ${
                                  shift.employeeId
                                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-200'
                                    : 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200'
                                }`}
                              >
                                <p className="font-medium truncate">
                                  {shift.employee
                                    ? `${shift.employee.firstName} ${shift.employee.lastName[0]}.`
                                    : 'Open'}
                                </p>
                                <p className="opacity-80">
                                  {formatTime(shift.startTime)} -{' '}
                                  {formatTime(shift.endTime)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardBody>
              </Card>
            ) : (
              <Card>
                <CardBody>
                  <div className="text-center py-12">
                    <Calendar className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                    <p className="text-neutral-600 dark:text-neutral-400">
                      Select a schedule to view shifts, or create a new one.
                    </p>
                  </div>
                </CardBody>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Employees Tab */}
      {activeSubTab === 'employees' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Employees ({employees.length})</h3>
              <Button>
                <Plus className="w-4 h-4" />
                Add Employee
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            {employees.length === 0 ? (
              <p className="text-center text-neutral-500 py-8">
                No employees configured.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {employees.map((employee) => (
                  <div
                    key={employee.id}
                    className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium">
                          {employee.firstName} {employee.lastName}
                        </p>
                        <p className="text-sm text-neutral-500">
                          {employee.email}
                        </p>
                      </div>
                      <Badge
                        variant={employee.isActive ? 'success' : 'neutral'}
                      >
                        {employee.employmentType.replace('_', ' ')}
                      </Badge>
                    </div>
                    {employee.role && (
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Role: {employee.role.name}
                      </p>
                    )}
                    {employee.maxHoursPerWeek && (
                      <p className="text-sm text-neutral-500">
                        Max: {employee.maxHoursPerWeek}h/week
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Time-Off Tab */}
      {activeSubTab === 'time-off' && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold">Pending Time-Off Requests</h3>
          </CardHeader>
          <CardBody>
            {timeOffRequests.length === 0 ? (
              <p className="text-center text-neutral-500 py-8">
                No pending requests.
              </p>
            ) : (
              <div className="space-y-3">
                {timeOffRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {request.employee?.firstName}{' '}
                        {request.employee?.lastName}
                      </p>
                      <p className="text-sm text-neutral-500">
                        {formatDate(request.startDate)} -{' '}
                        {formatDate(request.endDate)} ({request.type})
                      </p>
                      {request.reason && (
                        <p className="text-sm text-neutral-600 mt-1">
                          {request.reason}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          approveTimeOffMutation.mutate(
                            { requestId: request.id, configId },
                            {
                              onSuccess: () =>
                                showToast('Request approved', 'success'),
                              onError: () =>
                                showToast('Failed to approve', 'error'),
                            },
                          )
                        }
                      >
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          denyTimeOffMutation.mutate(
                            { requestId: request.id, configId },
                            {
                              onSuccess: () =>
                                showToast('Request denied', 'success'),
                              onError: () =>
                                showToast('Failed to deny', 'error'),
                            },
                          )
                        }
                      >
                        <XCircle className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Swaps Tab */}
      {activeSubTab === 'swaps' && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold">Pending Swap Requests</h3>
          </CardHeader>
          <CardBody>
            {swapRequests.length === 0 ? (
              <p className="text-center text-neutral-500 py-8">
                No pending swap requests.
              </p>
            ) : (
              <div className="space-y-3">
                {swapRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {request.requester?.firstName}{' '}
                        {request.requester?.lastName}
                        {request.targetEmployee && (
                          <>
                            {' '}
                            → {request.targetEmployee.firstName}{' '}
                            {request.targetEmployee.lastName}
                          </>
                        )}
                      </p>
                      {request.shift && (
                        <p className="text-sm text-neutral-500">
                          Shift: {formatDate(request.shift.startTime)}{' '}
                          {formatTime(request.shift.startTime)} -{' '}
                          {formatTime(request.shift.endTime)}
                        </p>
                      )}
                      {request.reason && (
                        <p className="text-sm text-neutral-600 mt-1">
                          {request.reason}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          approveSwapMutation.mutate(
                            {
                              requestId: request.id,
                              configId,
                              scheduleId: request.shift?.scheduleId || 0,
                            },
                            {
                              onSuccess: () =>
                                showToast('Swap approved', 'success'),
                              onError: () =>
                                showToast('Failed to approve', 'error'),
                            },
                          )
                        }
                      >
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          denySwapMutation.mutate(
                            { requestId: request.id, configId },
                            {
                              onSuccess: () =>
                                showToast('Swap denied', 'success'),
                              onError: () =>
                                showToast('Failed to deny', 'error'),
                            },
                          )
                        }
                      >
                        <XCircle className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Coverage Tab */}
      {activeSubTab === 'coverage' && (
        <div className="space-y-4">
          {selectedSchedule && coverage ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardBody>
                    <p className="text-3xl font-bold text-primary-600">
                      {coverage.totalShifts}
                    </p>
                    <p className="text-sm text-neutral-500">Total Shifts</p>
                  </CardBody>
                </Card>
                <Card>
                  <CardBody>
                    <p className="text-3xl font-bold text-green-600">
                      {coverage.assignedShifts}
                    </p>
                    <p className="text-sm text-neutral-500">Assigned</p>
                  </CardBody>
                </Card>
                <Card>
                  <CardBody>
                    <p className="text-3xl font-bold text-orange-600">
                      {coverage.openShifts}
                    </p>
                    <p className="text-sm text-neutral-500">Open</p>
                  </CardBody>
                </Card>
                <Card>
                  <CardBody>
                    <p className="text-3xl font-bold text-primary-600">
                      {coverage.coveragePercent.toFixed(0)}%
                    </p>
                    <p className="text-sm text-neutral-500">Coverage</p>
                  </CardBody>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <h3 className="font-semibold">Coverage by Role</h3>
                </CardHeader>
                <CardBody>
                  <div className="space-y-3">
                    {coverage.byRole.map((role) => (
                      <div
                        key={role.roleId}
                        className="flex items-center justify-between"
                      >
                        <span className="font-medium">{role.roleName}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-neutral-500">
                            {role.assigned}/{role.required} assigned
                          </span>
                          <div className="w-32 h-2 bg-neutral-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary-500 rounded-full"
                              style={{
                                width: `${Math.min((role.assigned / role.required) * 100, 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            </>
          ) : (
            <Card>
              <CardBody>
                <p className="text-center text-neutral-500 py-8">
                  Select a schedule to view coverage details.
                </p>
              </CardBody>
            </Card>
          )}
        </div>
      )}

      {/* Create Schedule Modal */}
      {showCreateScheduleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <h2 className="text-xl font-semibold">Create Schedule</h2>
            </CardHeader>
            <CardBody>
              <form onSubmit={handleCreateSchedule} className="space-y-4">
                <Input
                  label="Schedule Name"
                  name="name"
                  placeholder="e.g., Week of Dec 23"
                  required
                />
                <Input
                  type="datetime-local"
                  label="Start Date"
                  name="startDate"
                  required
                />
                <Input
                  type="datetime-local"
                  label="End Date"
                  name="endDate"
                  required
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowCreateScheduleModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createScheduleMutation.isPending}
                  >
                    {createScheduleMutation.isPending
                      ? 'Creating...'
                      : 'Create'}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Create Shift Modal */}
      {showCreateShiftModal && selectedScheduleId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <h2 className="text-xl font-semibold">Add Shift</h2>
            </CardHeader>
            <CardBody>
              <form onSubmit={handleCreateShift} className="space-y-4">
                <Select label="Location" name="locationId" required>
                  <option value="">Select location...</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </Select>
                <Select label="Role" name="roleId" required>
                  <option value="">Select role...</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </Select>
                <Select label="Employee (Optional)" name="employeeId">
                  <option value="">Leave open / Assign later</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                    </option>
                  ))}
                </Select>
                <Input
                  type="datetime-local"
                  label="Start Time"
                  name="startTime"
                  required
                />
                <Input
                  type="datetime-local"
                  label="End Time"
                  name="endTime"
                  required
                />
                <Input
                  type="number"
                  label="Break (minutes)"
                  name="breakMinutes"
                  defaultValue="30"
                  min="0"
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowCreateShiftModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createShiftMutation.isPending}
                  >
                    {createShiftMutation.isPending ? 'Creating...' : 'Create'}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}

export default ShiftSchedulingTab;
