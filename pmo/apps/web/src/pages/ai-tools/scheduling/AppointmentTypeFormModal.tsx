/**
 * Appointment Type Form Modal
 * Create and edit appointment types with duration, pricing, and color coding
 */

import { useState } from 'react';
import { X, Clock, DollarSign, Palette, Save, Loader2 } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../../ui/Card';
import { Button } from '../../../ui/Button';
import { Input } from '../../../ui/Input';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { buildApiUrl } from '../../../api/config';
import { buildOptions } from '../../../api/http';
import { useToast } from '../../../ui/Toast';

interface AppointmentType {
  id?: number;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: number | null;
  currency: string;
  requiresDeposit: boolean;
  depositAmount: number | null;
  color: string;
  isActive: boolean;
}

interface AppointmentTypeFormModalProps {
  configId: number;
  appointmentType?: AppointmentType | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const COLOR_OPTIONS = [
  { value: '#3B82F6', label: 'Blue' },
  { value: '#10B981', label: 'Green' },
  { value: '#F59E0B', label: 'Amber' },
  { value: '#EF4444', label: 'Red' },
  { value: '#8B5CF6', label: 'Purple' },
  { value: '#EC4899', label: 'Pink' },
  { value: '#06B6D4', label: 'Cyan' },
  { value: '#F97316', label: 'Orange' },
  { value: '#6366F1', label: 'Indigo' },
  { value: '#84CC16', label: 'Lime' },
];

const DURATION_OPTIONS = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
  { value: 240, label: '4 hours' },
];

async function createAppointmentType(
  configId: number,
  data: Omit<AppointmentType, 'id'>,
): Promise<AppointmentType> {
  const res = await fetch(
    buildApiUrl(`/scheduling/${configId}/appointment-types`),
    {
      ...buildOptions(),
      method: 'POST',
      body: JSON.stringify(data),
    },
  );
  if (!res.ok) throw new Error('Failed to create appointment type');
  const result = await res.json();
  return result.appointmentType;
}

async function updateAppointmentType(
  typeId: number,
  data: Partial<AppointmentType>,
): Promise<AppointmentType> {
  const res = await fetch(
    buildApiUrl(`/scheduling/appointment-types/${typeId}`),
    {
      ...buildOptions(),
      method: 'PATCH',
      body: JSON.stringify(data),
    },
  );
  if (!res.ok) throw new Error('Failed to update appointment type');
  const result = await res.json();
  return result.appointmentType;
}

export function AppointmentTypeFormModal({
  configId,
  appointmentType,
  onClose,
  onSuccess,
}: AppointmentTypeFormModalProps): JSX.Element {
  const isEditing = !!appointmentType?.id;
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<Omit<AppointmentType, 'id'>>({
    name: appointmentType?.name || '',
    description: appointmentType?.description || '',
    durationMinutes: appointmentType?.durationMinutes || 30,
    price: appointmentType?.price ?? null,
    currency: appointmentType?.currency || 'USD',
    requiresDeposit: appointmentType?.requiresDeposit || false,
    depositAmount: appointmentType?.depositAmount ?? null,
    color: appointmentType?.color || '#3B82F6',
    isActive: appointmentType?.isActive ?? true,
  });

  const [customDuration, setCustomDuration] = useState(false);

  const createMutation = useMutation({
    mutationFn: (data: Omit<AppointmentType, 'id'>) =>
      createAppointmentType(configId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['scheduling-appointment-types', configId],
      });
      showToast('Appointment type created successfully', 'success');
      onSuccess?.();
      onClose();
    },
    onError: (error) => {
      showToast(
        error instanceof Error
          ? error.message
          : 'Failed to create appointment type',
        'error',
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<AppointmentType>) =>
      updateAppointmentType(appointmentType!.id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['scheduling-appointment-types', configId],
      });
      showToast('Appointment type updated successfully', 'success');
      onSuccess?.();
      onClose();
    },
    onError: (error) => {
      showToast(
        error instanceof Error
          ? error.message
          : 'Failed to update appointment type',
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-lg my-8">
        <CardHeader className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {isEditing ? 'Edit Appointment Type' : 'Add Appointment Type'}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <Input
                label="Name *"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., General Consultation"
                required
              />
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Brief description of this appointment type..."
                  className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 px-3 py-2 text-sm bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100"
                  rows={3}
                />
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                <Clock className="w-4 h-4" />
                Duration
              </label>
              {!customDuration ? (
                <div className="flex flex-wrap gap-2">
                  {DURATION_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          durationMinutes: option.value,
                        })
                      }
                      className={`px-3 py-1.5 rounded-lg text-sm ${
                        formData.durationMinutes === option.value
                          ? 'bg-blue-100 text-blue-700 border border-blue-300'
                          : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-600 hover:bg-neutral-200 dark:hover:bg-neutral-600'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCustomDuration(true)}
                    className="px-3 py-1.5 rounded-lg text-sm bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 border border-dashed border-neutral-300 dark:border-neutral-600 hover:bg-neutral-200 dark:hover:bg-neutral-600"
                  >
                    Custom...
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={formData.durationMinutes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        durationMinutes: parseInt(e.target.value) || 30,
                      })
                    }
                    min={5}
                    max={480}
                    className="w-24"
                  />
                  <span className="text-sm text-neutral-500">minutes</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setCustomDuration(false)}
                  >
                    Use preset
                  </Button>
                </div>
              )}
            </div>

            {/* Pricing */}
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                <DollarSign className="w-4 h-4" />
                Pricing
              </label>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Price"
                  type="number"
                  value={formData.price ?? ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  placeholder="0.00"
                  min={0}
                  step={0.01}
                />
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Currency
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) =>
                      setFormData({ ...formData, currency: e.target.value })
                    }
                    className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 px-3 py-2 text-sm bg-white dark:bg-neutral-700"
                  >
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="CAD">CAD - Canadian Dollar</option>
                    <option value="AUD">AUD - Australian Dollar</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="requiresDeposit"
                  checked={formData.requiresDeposit}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      requiresDeposit: e.target.checked,
                    })
                  }
                  className="rounded border-neutral-300"
                />
                <label
                  htmlFor="requiresDeposit"
                  className="text-sm text-neutral-700 dark:text-neutral-300"
                >
                  Require deposit at booking
                </label>
              </div>
              {formData.requiresDeposit && (
                <Input
                  label="Deposit Amount"
                  type="number"
                  value={formData.depositAmount ?? ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      depositAmount: e.target.value
                        ? parseFloat(e.target.value)
                        : null,
                    })
                  }
                  placeholder="0.00"
                  min={0}
                  step={0.01}
                />
              )}
            </div>

            {/* Color */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                <Palette className="w-4 h-4" />
                Color
              </label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, color: color.value })
                    }
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${
                      formData.color === color.value
                        ? 'border-neutral-900 dark:border-white scale-110'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                  />
                ))}
                <div className="flex items-center gap-2 ml-2">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    className="w-8 h-8 rounded cursor-pointer"
                    title="Custom color"
                  />
                  <span className="text-xs text-neutral-500">Custom</span>
                </div>
              </div>
            </div>

            {/* Active Status */}
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
                Appointment type is active and available for booking
              </label>
            </div>

            {/* Preview */}
            <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                Preview
              </p>
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-10 rounded"
                  style={{ backgroundColor: formData.color }}
                />
                <div>
                  <p className="font-medium text-neutral-900 dark:text-neutral-100">
                    {formData.name || 'Appointment Type'}
                  </p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {formData.durationMinutes} min
                    {formData.price ? ` • $${formData.price}` : ''}
                    {formData.requiresDeposit && formData.depositAmount
                      ? ` (${formData.depositAmount} deposit)`
                      : ''}
                  </p>
                </div>
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
                    {isEditing ? 'Update' : 'Create'}
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

export default AppointmentTypeFormModal;
