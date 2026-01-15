/**
 * RAID Item Form Modal Component
 *
 * Modal form for creating and editing RAID items (Risks, Action Items, Issues, Decisions).
 * Dynamically shows relevant fields based on the selected item type.
 *
 * @module features/raid/RAIDItemFormModal
 */

import React, { useEffect, useState } from 'react';
import { Modal } from '../../ui/Modal';
import { Input } from '../../ui/Input';
import { Textarea } from '../../ui/Textarea';
import { Select } from '../../ui/Select';
import { Button } from '../../ui/Button';
import type {
  RAIDItemType,
  RAIDItemFormValues,
  Severity,
  Probability,
  Impact,
  ActionItemStatus,
  IssueStatus,
  DecisionStatus,
} from './types';

// ============================================================================
// Types
// ============================================================================

interface RAIDItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: RAIDItemFormValues) => Promise<void> | void;
  initialType?: RAIDItemType;
  initialValues?: Partial<RAIDItemFormValues>;
  isSubmitting?: boolean;
  error?: string | null;
  mode?: 'create' | 'edit';
}

// ============================================================================
// Constants
// ============================================================================

const TYPE_OPTIONS: { value: RAIDItemType; label: string }[] = [
  { value: 'risk', label: 'Risk' },
  { value: 'action-item', label: 'Action Item' },
  { value: 'issue', label: 'Issue' },
  { value: 'decision', label: 'Decision' },
];

// Action item priorities map to P0-P2 in the backend (shared Priority enum)
const ACTION_ITEM_PRIORITY_OPTIONS = [
  { value: 'P0', label: 'Critical (P0)' },
  { value: 'P1', label: 'High (P1)' },
  { value: 'P2', label: 'Medium (P2)' },
];
const SEVERITY_OPTIONS: Severity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
// Probability maps to RiskLikelihood in Prisma
const PROBABILITY_OPTIONS: { value: string; label: string }[] = [
  { value: 'RARE', label: 'Rare' },
  { value: 'UNLIKELY', label: 'Unlikely' },
  { value: 'POSSIBLE', label: 'Possible' },
  { value: 'LIKELY', label: 'Likely' },
  { value: 'ALMOST_CERTAIN', label: 'Almost Certain' },
];
const IMPACT_OPTIONS: Impact[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

// RiskStatus values from Prisma schema
const RISK_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'IDENTIFIED', label: 'Identified' },
  { value: 'ANALYZING', label: 'Analyzing' },
  { value: 'MITIGATING', label: 'Mitigating' },
  { value: 'MONITORING', label: 'Monitoring' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'ACCEPTED', label: 'Accepted' },
];
const ACTION_ITEM_STATUS_OPTIONS: ActionItemStatus[] = [
  'OPEN',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
];
const ISSUE_STATUS_OPTIONS: IssueStatus[] = [
  'OPEN',
  'INVESTIGATING',
  'IN_PROGRESS',
  'BLOCKED',
  'RESOLVED',
  'CLOSED',
  'WONT_FIX',
];
const DECISION_STATUS_OPTIONS: DecisionStatus[] = [
  'PENDING',
  'ACTIVE',
  'SUPERSEDED',
  'REVOKED',
];

// ============================================================================
// Helper Functions
// ============================================================================

function formatLabel(value: string): string {
  return value
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

function getDefaultStatus(type: RAIDItemType): string {
  switch (type) {
    case 'risk':
      return 'IDENTIFIED';
    case 'action-item':
      return 'OPEN';
    case 'issue':
      return 'OPEN';
    case 'decision':
      return 'PENDING';
  }
}

function getStatusOptions(
  type: RAIDItemType,
): { value: string; label: string }[] {
  switch (type) {
    case 'risk':
      return RISK_STATUS_OPTIONS;
    case 'action-item':
      return ACTION_ITEM_STATUS_OPTIONS.map((s) => ({
        value: s,
        label: formatLabel(s),
      }));
    case 'issue':
      return ISSUE_STATUS_OPTIONS.map((s) => ({
        value: s,
        label: formatLabel(s),
      }));
    case 'decision':
      return DECISION_STATUS_OPTIONS.map((s) => ({
        value: s,
        label: formatLabel(s),
      }));
  }
}

function getInitialValues(type: RAIDItemType): RAIDItemFormValues {
  return {
    type,
    title: '',
    description: '',
    status: getDefaultStatus(type),
    // Action items use P0-P2 priority scale (shared Priority enum)
    priority: type === 'action-item' ? 'P2' : undefined,
    severity: type === 'issue' ? 'MEDIUM' : undefined,
    probability: type === 'risk' ? 'POSSIBLE' : undefined,
    impact: type === 'risk' || type === 'issue' ? 'MEDIUM' : undefined,
    dueDate: '',
    ownerId: undefined,
    mitigationPlan: '',
    contingencyPlan: '',
    resolution: '',
    rationale: '',
  };
}

// ============================================================================
// Main Component
// ============================================================================

export function RAIDItemFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialType = 'action-item',
  initialValues,
  isSubmitting = false,
  error,
  mode = 'create',
}: RAIDItemFormModalProps): JSX.Element | null {
  const [values, setValues] = useState<RAIDItemFormValues>(() =>
    initialValues
      ? { ...getInitialValues(initialType), ...initialValues }
      : getInitialValues(initialType),
  );

  // Reset form when modal opens or initial values change
  useEffect(() => {
    if (isOpen) {
      setValues(
        initialValues
          ? {
              ...getInitialValues(initialValues.type ?? initialType),
              ...initialValues,
            }
          : getInitialValues(initialType),
      );
    }
  }, [isOpen, initialType, initialValues]);

  // Handle type change - reset type-specific fields
  const handleTypeChange = (newType: RAIDItemType): void => {
    setValues((prev) => ({
      ...getInitialValues(newType),
      title: prev.title,
      description: prev.description,
      ownerId: prev.ownerId,
    }));
  };

  const handleChange = (
    field: keyof RAIDItemFormValues,
    value: string | undefined,
  ): void => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    await onSubmit(values);
  };

  if (!isOpen) {
    return null;
  }

  const title = mode === 'create' ? 'Add RAID Item' : 'Edit RAID Item';
  const statusOptions = getStatusOptions(values.type);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="medium">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Error display */}
        {error && (
          <div className="p-4 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg">
            <p
              className="text-sm text-danger-800 dark:text-danger-200"
              role="alert"
            >
              {error}
            </p>
          </div>
        )}

        {/* Item Type */}
        <Select
          label="Item Type"
          value={values.type}
          onChange={(e) => handleTypeChange(e.target.value as RAIDItemType)}
          disabled={mode === 'edit' || isSubmitting}
          required
        >
          {TYPE_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>

        {/* Title */}
        <Input
          label="Title"
          value={values.title}
          onChange={(e) => handleChange('title', e.target.value)}
          placeholder="Enter a brief title"
          required
          disabled={isSubmitting}
        />

        {/* Description */}
        <Textarea
          label="Description"
          value={values.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Provide additional details..."
          rows={3}
          disabled={isSubmitting}
        />

        {/* Status */}
        <Select
          label="Status"
          value={values.status}
          onChange={(e) => handleChange('status', e.target.value)}
          disabled={isSubmitting}
          required
        >
          {statusOptions.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>

        {/* Type-specific fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Action Item: Priority and Due Date */}
          {values.type === 'action-item' && (
            <>
              <Select
                label="Priority"
                value={values.priority ?? 'P2'}
                onChange={(e) => handleChange('priority', e.target.value)}
                disabled={isSubmitting}
              >
                {ACTION_ITEM_PRIORITY_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
              <Input
                label="Due Date"
                type="date"
                value={values.dueDate ?? ''}
                onChange={(e) => handleChange('dueDate', e.target.value)}
                disabled={isSubmitting}
              />
            </>
          )}

          {/* Risk: Probability and Impact */}
          {values.type === 'risk' && (
            <>
              <Select
                label="Probability"
                value={values.probability ?? 'POSSIBLE'}
                onChange={(e) =>
                  handleChange('probability', e.target.value as Probability)
                }
                disabled={isSubmitting}
              >
                {PROBABILITY_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
              <Select
                label="Impact"
                value={values.impact ?? 'MEDIUM'}
                onChange={(e) =>
                  handleChange('impact', e.target.value as Impact)
                }
                disabled={isSubmitting}
              >
                {IMPACT_OPTIONS.map((impact) => (
                  <option key={impact} value={impact}>
                    {formatLabel(impact)}
                  </option>
                ))}
              </Select>
            </>
          )}

          {/* Issue: Severity */}
          {values.type === 'issue' && (
            <Select
              label="Severity"
              value={values.severity ?? 'MEDIUM'}
              onChange={(e) =>
                handleChange('severity', e.target.value as Severity)
              }
              disabled={isSubmitting}
            >
              {SEVERITY_OPTIONS.map((severity) => (
                <option key={severity} value={severity}>
                  {formatLabel(severity)}
                </option>
              ))}
            </Select>
          )}
        </div>

        {/* Risk-specific fields */}
        {values.type === 'risk' && (
          <>
            <Textarea
              label="Mitigation Plan"
              value={values.mitigationPlan ?? ''}
              onChange={(e) => handleChange('mitigationPlan', e.target.value)}
              placeholder="Describe how to prevent or reduce this risk..."
              rows={2}
              disabled={isSubmitting}
            />
            <Textarea
              label="Contingency Plan"
              value={values.contingencyPlan ?? ''}
              onChange={(e) => handleChange('contingencyPlan', e.target.value)}
              placeholder="Describe what to do if the risk occurs..."
              rows={2}
              disabled={isSubmitting}
            />
          </>
        )}

        {/* Issue-specific fields */}
        {values.type === 'issue' && values.status === 'RESOLVED' && (
          <Textarea
            label="Resolution"
            value={values.resolution ?? ''}
            onChange={(e) => handleChange('resolution', e.target.value)}
            placeholder="Describe how the issue was resolved..."
            rows={2}
            disabled={isSubmitting}
          />
        )}

        {/* Decision-specific fields */}
        {values.type === 'decision' && (
          <Textarea
            label="Rationale"
            value={values.rationale ?? ''}
            onChange={(e) => handleChange('rationale', e.target.value)}
            placeholder="Explain the reasoning behind this decision..."
            rows={2}
            disabled={isSubmitting}
          />
        )}

        {/* Form actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            {mode === 'create' ? 'Add Item' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
