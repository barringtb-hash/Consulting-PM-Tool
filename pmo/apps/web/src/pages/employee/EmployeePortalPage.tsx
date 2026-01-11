/**
 * Employee Portal Page
 *
 * Mobile-responsive view for employees to manage their shifts,
 * request time off, swap shifts, and claim open shifts.
 */

import React, { useState, useMemo } from 'react';
import { Card, CardBody, CardHeader } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { useToast } from '../../ui/Toast';
import {
  useShifts,
  useShiftSchedules,
  useOpenShifts,
  useTimeOffRequests,
  useSwapRequests,
  useCreateTimeOffRequest,
  useCreateSwapRequest,
  useClaimOpenShift,
  useEmployeeHours,
  useShiftEmployees,
} from '../../api/hooks/scheduling';
import type { Shift } from '../../api/hooks/scheduling';
import {
  Calendar,
  Clock,
  Plus,
  ArrowLeftRight,
  Sun,
  Coffee,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  MapPin,
  Users,
  BarChart3,
} from 'lucide-react';

interface EmployeePortalPageProps {
  configId: number;
  employeeId: number;
}

const STATUS_COLORS = {
  PENDING:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
  APPROVED:
    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
  DENIED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
  CANCELLED:
    'bg-neutral-100 text-neutral-800 dark:bg-neutral-900/30 dark:text-neutral-200',
};

export function EmployeePortalPage({
  configId,
  employeeId,
}: EmployeePortalPageProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<
    'schedule' | 'open-shifts' | 'time-off' | 'swaps' | 'hours'
  >('schedule');
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(() => {
    const now = new Date();
    now.setDate(now.getDate() - now.getDay());
    now.setHours(0, 0, 0, 0);
    return now;
  });
  const [showTimeOffModal, setShowTimeOffModal] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [selectedShiftForSwap, setSelectedShiftForSwap] =
    useState<Shift | null>(null);

  const { showToast } = useToast();

  // Calculate week dates
  const weekStart = selectedWeekStart.toISOString().split('T')[0];
  const weekEnd = new Date(
    selectedWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000,
  )
    .toISOString()
    .split('T')[0];

  // Queries
  const schedulesQuery = useShiftSchedules(configId, { status: 'PUBLISHED' });
  const activeSchedule = schedulesQuery.data?.[0];
  const shiftsQuery = useShifts(
    activeSchedule?.id || 0,
    { employeeId },
    { enabled: !!activeSchedule },
  );
  const openShiftsQuery = useOpenShifts(configId, {
    startDate: weekStart,
    endDate: weekEnd,
  });
  const timeOffQuery = useTimeOffRequests(configId, { employeeId });
  const swapsQuery = useSwapRequests(configId);
  const hoursQuery = useEmployeeHours(configId, weekStart, weekEnd);
  const employeesQuery = useShiftEmployees(configId, { isActive: true });

  // Mutations
  const createTimeOffMutation = useCreateTimeOffRequest();
  const createSwapMutation = useCreateSwapRequest();
  const claimShiftMutation = useClaimOpenShift();

  // Data
  const openShifts = openShiftsQuery.data || [];
  const timeOffRequests = timeOffQuery.data || [];
  const swapRequests = (swapsQuery.data || []).filter(
    (r) => r.requesterId === employeeId || r.targetEmployeeId === employeeId,
  );
  const myHours = (hoursQuery.data || []).find(
    (h) => h.employeeId === employeeId,
  );
  const otherEmployees = (employeesQuery.data || []).filter(
    (e) => e.id !== employeeId,
  );

  // Group shifts by day
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(selectedWeekStart);
    date.setDate(date.getDate() + i);
    return date;
  });

  const shiftsByDay = useMemo(() => {
    const result: Record<string, Shift[]> = {};
    const shiftData = shiftsQuery.data || [];
    shiftData.forEach((shift) => {
      const day = new Date(shift.startTime).toDateString();
      if (!result[day]) result[day] = [];
      result[day].push(shift);
    });
    return result;
  }, [shiftsQuery.data]);

  const navigateWeek = (direction: 'prev' | 'next') => {
    setSelectedWeekStart((current) => {
      const newDate = new Date(current);
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
      return newDate;
    });
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

  const formatDuration = (
    startTime: string,
    endTime: string,
    breakMinutes: number = 0,
  ) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const hours =
      (end.getTime() - start.getTime()) / (1000 * 60 * 60) - breakMinutes / 60;
    return `${hours.toFixed(1)}h`;
  };

  const handleCreateTimeOff = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createTimeOffMutation.mutate(
      {
        employeeId,
        configId,
        input: {
          type: formData.get('type') as
            | 'VACATION'
            | 'SICK'
            | 'PERSONAL'
            | 'OTHER',
          startDate: formData.get('startDate') as string,
          endDate: formData.get('endDate') as string,
          reason: formData.get('reason') as string,
        },
      },
      {
        onSuccess: () => {
          setShowTimeOffModal(false);
          showToast('Time-off request submitted', 'success');
        },
        onError: (error) => {
          showToast(
            error instanceof Error ? error.message : 'Failed to submit request',
            'error',
          );
        },
      },
    );
  };

  const handleCreateSwap = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedShiftForSwap) return;

    const formData = new FormData(e.currentTarget);
    createSwapMutation.mutate(
      {
        shiftId: selectedShiftForSwap.id,
        requesterId: employeeId,
        targetEmployeeId: formData.get('targetEmployeeId')
          ? Number(formData.get('targetEmployeeId'))
          : undefined,
        reason: formData.get('reason') as string,
        configId,
      },
      {
        onSuccess: () => {
          setShowSwapModal(false);
          setSelectedShiftForSwap(null);
          showToast('Swap request submitted', 'success');
        },
        onError: (error) => {
          showToast(
            error instanceof Error
              ? error.message
              : 'Failed to submit swap request',
            'error',
          );
        },
      },
    );
  };

  const handleClaimShift = (shift: Shift) => {
    if (!activeSchedule) return;
    claimShiftMutation.mutate(
      {
        shiftId: shift.id,
        employeeId,
        configId,
        scheduleId: activeSchedule.id,
      },
      {
        onSuccess: () => {
          showToast('Shift claimed successfully', 'success');
        },
        onError: (error) => {
          showToast(
            error instanceof Error ? error.message : 'Failed to claim shift',
            'error',
          );
        },
      },
    );
  };

  const initiateSwap = (shift: Shift) => {
    setSelectedShiftForSwap(shift);
    setShowSwapModal(true);
  };

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">
          My Schedule
        </h1>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            shiftsQuery.refetch();
            openShiftsQuery.refetch();
          }}
        >
          <RefreshCw
            className={`w-4 h-4 ${shiftsQuery.isFetching || openShiftsQuery.isFetching ? 'animate-spin' : ''}`}
          />
        </Button>
      </div>

      {/* Hours Summary Card */}
      {myHours && (
        <Card className="bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/30 dark:to-primary-800/20 border-primary-200 dark:border-primary-700">
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-primary-600 dark:text-primary-400">
                  This Week
                </p>
                <p className="text-3xl font-bold text-primary-800 dark:text-primary-200">
                  {myHours.totalHours.toFixed(1)}h
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-primary-600 dark:text-primary-400">
                  Scheduled: {myHours.scheduledHours.toFixed(1)}h
                </p>
                {myHours.overtimeHours > 0 && (
                  <p className="text-sm text-orange-600 dark:text-orange-400">
                    OT: {myHours.overtimeHours.toFixed(1)}h
                  </p>
                )}
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Navigation Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2">
        {[
          { id: 'schedule', label: 'Schedule', icon: Calendar },
          {
            id: 'open-shifts',
            label: 'Open',
            icon: Users,
            badge: openShifts.length,
          },
          { id: 'time-off', label: 'Time Off', icon: Sun },
          { id: 'swaps', label: 'Swaps', icon: ArrowLeftRight },
          { id: 'hours', label: 'Hours', icon: BarChart3 },
        ].map(({ id, label, icon: Icon, badge }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as typeof activeTab)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg whitespace-nowrap transition-colors text-sm ${
              activeTab === id
                ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
            {badge !== undefined && badge > 0 && (
              <Badge variant="warning" className="text-xs px-1.5 py-0.5">
                {badge}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* Schedule Tab */}
      {activeTab === 'schedule' && (
        <div className="space-y-4">
          {/* Week Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigateWeek('prev')}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="font-medium text-sm">
              {selectedWeekStart.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}{' '}
              -{' '}
              {weekEnd &&
                new Date(weekEnd).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
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

          {/* Week View */}
          <div className="space-y-2">
            {weekDays.map((day) => {
              const dayShifts = shiftsByDay[day.toDateString()] || [];
              const isToday = day.toDateString() === new Date().toDateString();
              return (
                <Card
                  key={day.toISOString()}
                  className={
                    isToday ? 'border-primary-300 dark:border-primary-600' : ''
                  }
                >
                  <CardBody className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-medium ${
                            isToday
                              ? 'text-primary-600 dark:text-primary-400'
                              : 'text-neutral-500'
                          }`}
                        >
                          {day.toLocaleDateString('en-US', {
                            weekday: 'short',
                          })}
                        </span>
                        <span className="font-semibold">{day.getDate()}</span>
                        {isToday && (
                          <Badge variant="primary" className="text-xs">
                            Today
                          </Badge>
                        )}
                      </div>
                      {dayShifts.length === 0 && (
                        <span className="text-xs text-neutral-400">Off</span>
                      )}
                    </div>
                    {dayShifts.map((shift) => (
                      <div
                        key={shift.id}
                        className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <Clock className="w-4 h-4 text-primary-500" />
                              {formatTime(shift.startTime)} -{' '}
                              {formatTime(shift.endTime)}
                            </div>
                            {shift.location && (
                              <div className="flex items-center gap-1.5 mt-1 text-sm text-neutral-500">
                                <MapPin className="w-3.5 h-3.5" />
                                {shift.location.name}
                              </div>
                            )}
                            {shift.role && (
                              <div className="mt-1 text-xs text-neutral-400">
                                {shift.role.name}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-xs font-medium text-neutral-500">
                              {formatDuration(
                                shift.startTime,
                                shift.endTime,
                                shift.breakMinutes,
                              )}
                            </span>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="text-xs px-2 py-1"
                              onClick={() => initiateSwap(shift)}
                            >
                              <ArrowLeftRight className="w-3 h-3" />
                              Swap
                            </Button>
                          </div>
                        </div>
                        {shift.breakMinutes > 0 && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-neutral-400">
                            <Coffee className="w-3 h-3" />
                            {shift.breakMinutes}min break
                          </div>
                        )}
                      </div>
                    ))}
                  </CardBody>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Open Shifts Tab */}
      {activeTab === 'open-shifts' && (
        <div className="space-y-3">
          {openShifts.length === 0 ? (
            <Card>
              <CardBody>
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                  <p className="text-neutral-500">No open shifts available</p>
                </div>
              </CardBody>
            </Card>
          ) : (
            openShifts.map((shift) => (
              <Card key={shift.id}>
                <CardBody className="p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">
                        {formatDate(shift.startTime)}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                        <Clock className="w-4 h-4" />
                        {formatTime(shift.startTime)} -{' '}
                        {formatTime(shift.endTime)}
                      </div>
                      {shift.location && (
                        <div className="flex items-center gap-1.5 mt-1 text-sm text-neutral-500">
                          <MapPin className="w-3.5 h-3.5" />
                          {shift.location.name}
                        </div>
                      )}
                      {shift.role && (
                        <Badge variant="secondary" className="mt-2 text-xs">
                          {shift.role.name}
                        </Badge>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleClaimShift(shift)}
                      disabled={claimShiftMutation.isPending}
                    >
                      {claimShiftMutation.isPending ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        'Claim'
                      )}
                    </Button>
                  </div>
                </CardBody>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Time Off Tab */}
      {activeTab === 'time-off' && (
        <div className="space-y-4">
          <Button onClick={() => setShowTimeOffModal(true)} className="w-full">
            <Plus className="w-4 h-4" />
            Request Time Off
          </Button>

          {timeOffRequests.length === 0 ? (
            <Card>
              <CardBody>
                <div className="text-center py-8">
                  <Sun className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                  <p className="text-neutral-500">No time-off requests</p>
                </div>
              </CardBody>
            </Card>
          ) : (
            timeOffRequests.map((request) => (
              <Card key={request.id}>
                <CardBody className="p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className={STATUS_COLORS[request.status]}>
                          {request.status}
                        </Badge>
                        <span className="text-sm font-medium">
                          {request.type}
                        </span>
                      </div>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                        {formatDate(request.startDate)} -{' '}
                        {formatDate(request.endDate)}
                      </p>
                      {request.reason && (
                        <p className="text-sm text-neutral-500 mt-1">
                          {request.reason}
                        </p>
                      )}
                    </div>
                    {request.status === 'PENDING' && (
                      <span className="text-xs text-yellow-600">
                        Pending review
                      </span>
                    )}
                  </div>
                </CardBody>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Swaps Tab */}
      {activeTab === 'swaps' && (
        <div className="space-y-4">
          {swapRequests.length === 0 ? (
            <Card>
              <CardBody>
                <div className="text-center py-8">
                  <ArrowLeftRight className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                  <p className="text-neutral-500">No swap requests</p>
                </div>
              </CardBody>
            </Card>
          ) : (
            swapRequests.map((request) => (
              <Card key={request.id}>
                <CardBody className="p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge className={STATUS_COLORS[request.status]}>
                        {request.status}
                      </Badge>
                      {request.shift && (
                        <p className="text-sm mt-1">
                          {formatDate(request.shift.startTime)}{' '}
                          {formatTime(request.shift.startTime)} -{' '}
                          {formatTime(request.shift.endTime)}
                        </p>
                      )}
                      {request.targetEmployee && (
                        <p className="text-sm text-neutral-500 mt-1">
                          {request.requesterId === employeeId
                            ? 'To: '
                            : 'From: '}
                          {request.requesterId === employeeId
                            ? `${request.targetEmployee.firstName} ${request.targetEmployee.lastName}`
                            : `${request.requester?.firstName} ${request.requester?.lastName}`}
                        </p>
                      )}
                      {request.reason && (
                        <p className="text-xs text-neutral-400 mt-1">
                          {request.reason}
                        </p>
                      )}
                    </div>
                    {request.status === 'PENDING' && (
                      <span className="text-xs text-yellow-600">Pending</span>
                    )}
                  </div>
                </CardBody>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Hours Tab */}
      {activeTab === 'hours' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <h3 className="font-semibold">Hours Summary</h3>
            </CardHeader>
            <CardBody>
              {myHours ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                      <p className="text-2xl font-bold text-primary-600">
                        {myHours.totalHours.toFixed(1)}
                      </p>
                      <p className="text-sm text-neutral-500">Total Hours</p>
                    </div>
                    <div className="text-center p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">
                        {myHours.regularHours.toFixed(1)}
                      </p>
                      <p className="text-sm text-neutral-500">Regular</p>
                    </div>
                  </div>
                  {myHours.overtimeHours > 0 && (
                    <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                        <span className="font-medium text-orange-800 dark:text-orange-200">
                          Overtime: {myHours.overtimeHours.toFixed(1)}h
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-center text-neutral-500 py-4">
                  No hours data available
                </p>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {/* Time Off Modal */}
      {showTimeOffModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <h2 className="text-lg font-semibold">Request Time Off</h2>
            </CardHeader>
            <CardBody>
              <form onSubmit={handleCreateTimeOff} className="space-y-4">
                <Select label="Type" name="type" required>
                  <option value="VACATION">Vacation</option>
                  <option value="SICK">Sick</option>
                  <option value="PERSONAL">Personal</option>
                  <option value="OTHER">Other</option>
                </Select>
                <Input
                  type="date"
                  label="Start Date"
                  name="startDate"
                  required
                />
                <Input type="date" label="End Date" name="endDate" required />
                <Input label="Reason (optional)" name="reason" />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowTimeOffModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createTimeOffMutation.isPending}
                    className="flex-1"
                  >
                    {createTimeOffMutation.isPending
                      ? 'Submitting...'
                      : 'Submit'}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Swap Modal */}
      {showSwapModal && selectedShiftForSwap && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <h2 className="text-lg font-semibold">Request Shift Swap</h2>
            </CardHeader>
            <CardBody>
              <div className="mb-4 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                <p className="text-sm font-medium">
                  {formatDate(selectedShiftForSwap.startTime)}
                </p>
                <p className="text-sm text-neutral-500">
                  {formatTime(selectedShiftForSwap.startTime)} -{' '}
                  {formatTime(selectedShiftForSwap.endTime)}
                </p>
              </div>
              <form onSubmit={handleCreateSwap} className="space-y-4">
                <Select label="Swap with (optional)" name="targetEmployeeId">
                  <option value="">Anyone available</option>
                  {otherEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                    </option>
                  ))}
                </Select>
                <Input label="Reason (optional)" name="reason" />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowSwapModal(false);
                      setSelectedShiftForSwap(null);
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createSwapMutation.isPending}
                    className="flex-1"
                  >
                    {createSwapMutation.isPending
                      ? 'Submitting...'
                      : 'Request Swap'}
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

export default EmployeePortalPage;
