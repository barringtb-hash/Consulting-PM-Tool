/**
 * Provider Form Modal
 * Create and edit service providers with availability schedule
 */

import { useState, useEffect } from 'react';
import {
  X,
  User,
  Mail,
  Phone,
  Briefcase,
  Clock,
  Plus,
  Trash2,
  Save,
  Loader2,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../../ui/Card';
import { Button } from '../../../ui/Button';
import { Input } from '../../../ui/Input';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { buildApiUrl } from '../../../api/config';
import { buildOptions } from '../../../api/http';
import { useToast } from '../../../ui/Toast';

interface TimeSlot {
  start: string;
  end: string;
}

interface AvailabilitySchedule {
  monday: TimeSlot[];
  tuesday: TimeSlot[];
  wednesday: TimeSlot[];
  thursday: TimeSlot[];
  friday: TimeSlot[];
  saturday: TimeSlot[];
  sunday: TimeSlot[];
}

interface Provider {
  id?: number;
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  specialty: string | null;
  externalProviderId: string | null;
  npiNumber: string | null;
  isActive: boolean;
  availabilitySchedule: AvailabilitySchedule;
}

interface ProviderFormModalProps {
  configId: number;
  provider?: Provider | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
] as const;

const DEFAULT_SCHEDULE: AvailabilitySchedule = {
  monday: [{ start: '09:00', end: '17:00' }],
  tuesday: [{ start: '09:00', end: '17:00' }],
  wednesday: [{ start: '09:00', end: '17:00' }],
  thursday: [{ start: '09:00', end: '17:00' }],
  friday: [{ start: '09:00', end: '17:00' }],
  saturday: [],
  sunday: [],
};

async function createProvider(
  configId: number,
  data: Omit<Provider, 'id'>,
): Promise<Provider> {
  const res = await fetch(buildApiUrl(`/scheduling/${configId}/providers`), {
    ...buildOptions(),
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create provider');
  const result = await res.json();
  return result.provider;
}

async function updateProvider(
  providerId: number,
  data: Partial<Provider>,
): Promise<Provider> {
  const res = await fetch(buildApiUrl(`/scheduling/providers/${providerId}`), {
    ...buildOptions(),
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update provider');
  const result = await res.json();
  return result.provider;
}

export function ProviderFormModal({
  configId,
  provider,
  onClose,
  onSuccess,
}: ProviderFormModalProps): JSX.Element {
  const isEditing = !!provider?.id;
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<Omit<Provider, 'id'>>({
    name: provider?.name || '',
    email: provider?.email || '',
    phone: provider?.phone || '',
    title: provider?.title || '',
    specialty: provider?.specialty || '',
    externalProviderId: provider?.externalProviderId || '',
    npiNumber: provider?.npiNumber || '',
    isActive: provider?.isActive ?? true,
    availabilitySchedule: provider?.availabilitySchedule || DEFAULT_SCHEDULE,
  });

  const createMutation = useMutation({
    mutationFn: (data: Omit<Provider, 'id'>) => createProvider(configId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['scheduling-providers', configId],
      });
      showToast('Provider created successfully', 'success');
      onSuccess?.();
      onClose();
    },
    onError: (error) => {
      showToast(
        error instanceof Error ? error.message : 'Failed to create provider',
        'error',
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Provider>) =>
      updateProvider(provider!.id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['scheduling-providers', configId],
      });
      showToast('Provider updated successfully', 'success');
      onSuccess?.();
      onClose();
    },
    onError: (error) => {
      showToast(
        error instanceof Error ? error.message : 'Failed to update provider',
        'error',
      );
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const updateSchedule = (
    day: keyof AvailabilitySchedule,
    slots: TimeSlot[],
  ) => {
    setFormData((prev) => ({
      ...prev,
      availabilitySchedule: {
        ...prev.availabilitySchedule,
        [day]: slots,
      },
    }));
  };

  const addTimeSlot = (day: keyof AvailabilitySchedule) => {
    const currentSlots = formData.availabilitySchedule[day];
    updateSchedule(day, [...currentSlots, { start: '09:00', end: '17:00' }]);
  };

  const removeTimeSlot = (day: keyof AvailabilitySchedule, index: number) => {
    const currentSlots = formData.availabilitySchedule[day];
    updateSchedule(
      day,
      currentSlots.filter((_, i) => i !== index),
    );
  };

  const updateTimeSlot = (
    day: keyof AvailabilitySchedule,
    index: number,
    field: 'start' | 'end',
    value: string,
  ) => {
    const currentSlots = [...formData.availabilitySchedule[day]];
    currentSlots[index] = { ...currentSlots[index], [field]: value };
    updateSchedule(day, currentSlots);
  };

  const copyToAllWeekdays = () => {
    const mondaySchedule = formData.availabilitySchedule.monday;
    setFormData((prev) => ({
      ...prev,
      availabilitySchedule: {
        ...prev.availabilitySchedule,
        tuesday: [...mondaySchedule],
        wednesday: [...mondaySchedule],
        thursday: [...mondaySchedule],
        friday: [...mondaySchedule],
      },
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-2xl my-8">
        <CardHeader className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {isEditing ? 'Edit Provider' : 'Add New Provider'}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                <User className="w-4 h-4" />
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Name *"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Dr. Jane Smith"
                  required
                />
                <Input
                  label="Title"
                  value={formData.title || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="e.g., MD, DDS, PT"
                />
                <Input
                  label="Email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="jane.smith@clinic.com"
                />
                <Input
                  label="Phone"
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="+1 (555) 123-4567"
                />
                <Input
                  label="Specialty"
                  value={formData.specialty || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, specialty: e.target.value })
                  }
                  placeholder="e.g., General Practice, Cardiology"
                />
                <Input
                  label="NPI Number"
                  value={formData.npiNumber || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, npiNumber: e.target.value })
                  }
                  placeholder="10-digit NPI"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                  className="rounded border-neutral-300"
                />
                <label
                  htmlFor="isActive"
                  className="text-sm text-neutral-700 dark:text-neutral-300"
                >
                  Provider is active and available for scheduling
                </label>
              </div>
            </div>

            {/* Availability Schedule */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Availability Schedule
                </h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={copyToAllWeekdays}
                >
                  Copy Monday to All Weekdays
                </Button>
              </div>

              <div className="space-y-3">
                {DAYS_OF_WEEK.map(({ key, label }) => (
                  <div
                    key={key}
                    className="flex items-start gap-4 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg"
                  >
                    <div className="w-24 pt-2 font-medium text-sm text-neutral-700 dark:text-neutral-300">
                      {label}
                    </div>
                    <div className="flex-1 space-y-2">
                      {formData.availabilitySchedule[key].length === 0 ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-neutral-500 dark:text-neutral-400">
                            Not available
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => addTimeSlot(key)}
                          >
                            <Plus className="w-4 h-4" />
                            Add Hours
                          </Button>
                        </div>
                      ) : (
                        <>
                          {formData.availabilitySchedule[key].map(
                            (slot, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-2"
                              >
                                <input
                                  type="time"
                                  value={slot.start}
                                  onChange={(e) =>
                                    updateTimeSlot(
                                      key,
                                      index,
                                      'start',
                                      e.target.value,
                                    )
                                  }
                                  className="rounded border border-neutral-300 dark:border-neutral-600 px-2 py-1 text-sm bg-white dark:bg-neutral-700"
                                />
                                <span className="text-neutral-500">to</span>
                                <input
                                  type="time"
                                  value={slot.end}
                                  onChange={(e) =>
                                    updateTimeSlot(
                                      key,
                                      index,
                                      'end',
                                      e.target.value,
                                    )
                                  }
                                  className="rounded border border-neutral-300 dark:border-neutral-600 px-2 py-1 text-sm bg-white dark:bg-neutral-700"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeTimeSlot(key, index)}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </div>
                            ),
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => addTimeSlot(key)}
                            className="text-xs"
                          >
                            <Plus className="w-3 h-3" />
                            Add Break / Split Hours
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {isEditing ? 'Update Provider' : 'Create Provider'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}

export default ProviderFormModal;
