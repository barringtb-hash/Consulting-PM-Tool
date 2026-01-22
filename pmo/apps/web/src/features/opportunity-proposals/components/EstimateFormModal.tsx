/**
 * Estimate Form Modal
 *
 * Modal for creating and editing cost estimates with line items.
 */

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, DollarSign } from 'lucide-react';
import { Modal } from '../../../ui/Modal';
import { Button } from '../../../ui/Button';
import {
  useCreateEstimate,
  useUpdateEstimate,
  useCreateLineItem,
  useUpdateLineItem,
  useDeleteLineItem,
} from '../hooks/useCostEstimates';
import type {
  CostEstimate,
  CreateEstimateInput,
  UpdateEstimateInput,
  CreateLineItemInput,
  LineItemCategory,
  EstimateType,
} from '../types';

interface EstimateFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  opportunityId: number;
  estimate?: CostEstimate;
}

const ESTIMATE_TYPES: Array<{ value: EstimateType; label: string }> = [
  { value: 'FIXED_PRICE', label: 'Fixed Price' },
  { value: 'TIME_AND_MATERIALS', label: 'Time & Materials' },
  { value: 'RETAINER', label: 'Retainer' },
  { value: 'HYBRID', label: 'Hybrid' },
];

const LINE_ITEM_CATEGORIES: Array<{ value: LineItemCategory; label: string }> =
  [
    { value: 'LABOR', label: 'Labor' },
    { value: 'DELIVERABLE', label: 'Deliverable' },
    { value: 'EXPENSE', label: 'Expense' },
    { value: 'THIRD_PARTY', label: 'Third Party' },
    { value: 'CONTINGENCY', label: 'Contingency' },
    { value: 'DISCOUNT', label: 'Discount' },
  ];

interface LineItemFormData {
  id?: number;
  category: LineItemCategory;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  role?: string;
  hourlyRate?: number;
  estimatedHours?: number;
  isNew?: boolean;
  isDeleted?: boolean;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function EstimateFormModal({
  isOpen,
  onClose,
  onSuccess,
  opportunityId,
  estimate,
}: EstimateFormModalProps): JSX.Element {
  const isEditing = Boolean(estimate);

  // Form state
  const [name, setName] = useState(estimate?.name ?? '');
  const [estimateType, setEstimateType] = useState<EstimateType>(
    estimate?.estimateType ?? 'FIXED_PRICE',
  );
  const [currency, setCurrency] = useState(estimate?.currency ?? 'USD');
  const [discountPercent, setDiscountPercent] = useState(
    estimate?.discountPercent ?? 0,
  );
  const [taxPercent, setTaxPercent] = useState(estimate?.taxPercent ?? 0);
  const [notes, setNotes] = useState(estimate?.notes ?? '');
  const [assumptions, setAssumptions] = useState(estimate?.assumptions ?? '');
  const [lineItems, setLineItems] = useState<LineItemFormData[]>([]);

  // Mutations
  const createEstimateMutation = useCreateEstimate();
  const updateEstimateMutation = useUpdateEstimate();
  const createLineItemMutation = useCreateLineItem();
  const updateLineItemMutation = useUpdateLineItem();
  const deleteLineItemMutation = useDeleteLineItem();

  // Initialize line items from estimate
  useEffect(() => {
    if (estimate?.lineItems) {
      setLineItems(
        estimate.lineItems.map((item) => ({
          id: item.id,
          category: item.category,
          name: item.name,
          description: item.description ?? '',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          role: item.role,
          hourlyRate: item.hourlyRate,
          estimatedHours: item.estimatedHours,
        })),
      );
    }
  }, [estimate]);

  // Calculate totals
  const subtotal = lineItems
    .filter((item) => !item.isDeleted)
    .reduce((sum, item) => {
      const itemTotal =
        item.category === 'DISCOUNT'
          ? -(item.quantity * item.unitPrice)
          : item.quantity * item.unitPrice;
      return sum + itemTotal;
    }, 0);

  const discountAmount = subtotal * (discountPercent / 100);
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = afterDiscount * (taxPercent / 100);
  const total = afterDiscount + taxAmount;

  const handleAddLineItem = (): void => {
    setLineItems([
      ...lineItems,
      {
        category: 'LABOR',
        name: '',
        description: '',
        quantity: 1,
        unitPrice: 0,
        isNew: true,
      },
    ]);
  };

  const handleUpdateLineItem = (
    index: number,
    field: keyof LineItemFormData,
    value: string | number,
  ): void => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const handleRemoveLineItem = (index: number): void => {
    const item = lineItems[index];
    if (item.id) {
      // Mark existing item as deleted
      const updated = [...lineItems];
      updated[index] = { ...item, isDeleted: true };
      setLineItems(updated);
    } else {
      // Remove new item from array
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    try {
      let estimateId = estimate?.id;

      if (isEditing && estimateId) {
        // Update existing estimate
        const updateData: UpdateEstimateInput = {
          name,
          discountPercent,
          taxPercent,
          notes: notes || undefined,
          assumptions: assumptions || undefined,
        };
        await updateEstimateMutation.mutateAsync({
          opportunityId,
          estimateId,
          input: updateData,
        });
      } else {
        // Create new estimate
        const createData: CreateEstimateInput = {
          name,
          estimateType,
          currency,
          discountPercent,
          taxPercent,
          notes: notes || undefined,
          assumptions: assumptions || undefined,
        };
        const result = await createEstimateMutation.mutateAsync({
          opportunityId,
          input: createData,
        });
        estimateId = result.id;
      }

      // Handle line items
      for (const item of lineItems) {
        if (item.isDeleted && item.id) {
          await deleteLineItemMutation.mutateAsync({
            opportunityId,
            estimateId: estimateId!,
            itemId: item.id,
          });
        } else if (item.isNew && !item.isDeleted) {
          const createInput: CreateLineItemInput = {
            category: item.category,
            name: item.name,
            description: item.description || undefined,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            role: item.role,
            hourlyRate: item.hourlyRate,
            estimatedHours: item.estimatedHours,
          };
          await createLineItemMutation.mutateAsync({
            opportunityId,
            estimateId: estimateId!,
            input: createInput,
          });
        } else if (item.id && !item.isNew && !item.isDeleted) {
          await updateLineItemMutation.mutateAsync({
            opportunityId,
            estimateId: estimateId!,
            itemId: item.id,
            input: {
              category: item.category,
              name: item.name,
              description: item.description || undefined,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              role: item.role,
              hourlyRate: item.hourlyRate,
              estimatedHours: item.estimatedHours,
            },
          });
        }
      }

      onSuccess();
    } catch (error) {
      console.error('Failed to save estimate:', error);
    }
  };

  const isSubmitting =
    createEstimateMutation.isPending ||
    updateEstimateMutation.isPending ||
    createLineItemMutation.isPending ||
    updateLineItemMutation.isPending ||
    deleteLineItemMutation.isPending;

  const visibleLineItems = lineItems.filter((item) => !item.isDeleted);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Estimate' : 'Create Estimate'}
      size="large"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Estimate Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="e.g., Website Redesign - Phase 1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Estimate Type *
            </label>
            <select
              value={estimateType}
              onChange={(e) => setEstimateType(e.target.value as EstimateType)}
              disabled={isEditing}
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50"
            >
              {ESTIMATE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              disabled={isEditing}
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="CAD">CAD</option>
            </select>
          </div>
        </div>

        {/* Line Items */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Line Items
            </h4>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleAddLineItem}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Item
            </Button>
          </div>

          {visibleLineItems.length === 0 ? (
            <div className="text-center py-6 bg-neutral-50 dark:bg-neutral-800 rounded-md">
              <DollarSign className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                No line items yet. Click &quot;Add Item&quot; to start.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {lineItems.map((item, index) =>
                item.isDeleted ? null : (
                  <div
                    key={item.id ?? `new-${index}`}
                    className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-md space-y-3"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-1 grid grid-cols-6 gap-3">
                        <div className="col-span-2">
                          <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                            Name
                          </label>
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) =>
                              handleUpdateLineItem(
                                index,
                                'name',
                                e.target.value,
                              )
                            }
                            className="w-full px-2 py-1.5 text-sm border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100"
                            placeholder="Item name"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                            Category
                          </label>
                          <select
                            value={item.category}
                            onChange={(e) =>
                              handleUpdateLineItem(
                                index,
                                'category',
                                e.target.value as LineItemCategory,
                              )
                            }
                            className="w-full px-2 py-1.5 text-sm border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100"
                          >
                            {LINE_ITEM_CATEGORIES.map((cat) => (
                              <option key={cat.value} value={cat.value}>
                                {cat.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                            Quantity
                          </label>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) =>
                              handleUpdateLineItem(
                                index,
                                'quantity',
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            min="0"
                            step="0.5"
                            className="w-full px-2 py-1.5 text-sm border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                            Unit Price
                          </label>
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) =>
                              handleUpdateLineItem(
                                index,
                                'unitPrice',
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            min="0"
                            step="0.01"
                            className="w-full px-2 py-1.5 text-sm border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100"
                          />
                        </div>

                        <div className="flex items-end">
                          <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100 py-1.5">
                            {formatCurrency(
                              item.category === 'DISCOUNT'
                                ? -(item.quantity * item.unitPrice)
                                : item.quantity * item.unitPrice,
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveLineItem(index)}
                        className="p-1.5 text-neutral-400 hover:text-danger-600 rounded-md hover:bg-white dark:hover:bg-neutral-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {item.category === 'LABOR' && (
                      <div className="grid grid-cols-3 gap-3 pt-2 border-t border-neutral-200 dark:border-neutral-700">
                        <div>
                          <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                            Role
                          </label>
                          <input
                            type="text"
                            value={item.role ?? ''}
                            onChange={(e) =>
                              handleUpdateLineItem(
                                index,
                                'role',
                                e.target.value,
                              )
                            }
                            className="w-full px-2 py-1.5 text-sm border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100"
                            placeholder="e.g., Senior Developer"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                            Hourly Rate
                          </label>
                          <input
                            type="number"
                            value={item.hourlyRate ?? ''}
                            onChange={(e) =>
                              handleUpdateLineItem(
                                index,
                                'hourlyRate',
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            min="0"
                            step="0.01"
                            className="w-full px-2 py-1.5 text-sm border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                            Est. Hours
                          </label>
                          <input
                            type="number"
                            value={item.estimatedHours ?? ''}
                            onChange={(e) =>
                              handleUpdateLineItem(
                                index,
                                'estimatedHours',
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            min="0"
                            step="0.5"
                            className="w-full px-2 py-1.5 text-sm border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ),
              )}
            </div>
          )}
        </div>

        {/* Discounts and Taxes */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Discount (%)
            </label>
            <input
              type="number"
              value={discountPercent}
              onChange={(e) =>
                setDiscountPercent(parseFloat(e.target.value) || 0)
              }
              min="0"
              max="100"
              step="0.1"
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Tax (%)
            </label>
            <input
              type="number"
              value={taxPercent}
              onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
              min="0"
              max="100"
              step="0.1"
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Totals */}
        <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-md space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-neutral-600 dark:text-neutral-400">
              Subtotal
            </span>
            <span className="font-medium text-neutral-900 dark:text-neutral-100">
              {formatCurrency(subtotal)}
            </span>
          </div>
          {discountPercent > 0 && (
            <div className="flex justify-between text-sm text-danger-600 dark:text-danger-400">
              <span>Discount ({discountPercent}%)</span>
              <span>-{formatCurrency(discountAmount)}</span>
            </div>
          )}
          {taxPercent > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-neutral-600 dark:text-neutral-400">
                Tax ({taxPercent}%)
              </span>
              <span className="text-neutral-900 dark:text-neutral-100">
                {formatCurrency(taxAmount)}
              </span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-neutral-200 dark:border-neutral-700">
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">
              Total
            </span>
            <span className="font-semibold text-xl text-neutral-900 dark:text-neutral-100">
              {formatCurrency(total)}
            </span>
          </div>
        </div>

        {/* Notes */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Internal notes..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Assumptions
            </label>
            <textarea
              value={assumptions}
              onChange={(e) => setAssumptions(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Key assumptions..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || !name}>
            {isSubmitting
              ? 'Saving...'
              : isEditing
                ? 'Update Estimate'
                : 'Create Estimate'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default EstimateFormModal;
