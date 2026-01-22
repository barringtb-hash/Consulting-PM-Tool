/**
 * AI Estimate Modal
 *
 * Modal for generating AI-powered cost estimates.
 */

import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Modal } from '../../../ui/Modal';
import { Button } from '../../../ui/Button';
import type { EstimateType } from '../types';

interface AIEstimateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (input: {
    estimateType?: string;
    projectDescription?: string;
    budget?: number;
  }) => Promise<void>;
  isGenerating: boolean;
  opportunityName?: string;
  opportunityDescription?: string;
}

const ESTIMATE_TYPES: Array<{
  value: EstimateType;
  label: string;
  description: string;
}> = [
  {
    value: 'FIXED_PRICE',
    label: 'Fixed Price',
    description: 'A set price for the entire project scope',
  },
  {
    value: 'TIME_AND_MATERIALS',
    label: 'Time & Materials',
    description: 'Billing based on hours worked plus expenses',
  },
  {
    value: 'RETAINER',
    label: 'Retainer',
    description: 'Monthly fee for ongoing services',
  },
  {
    value: 'HYBRID',
    label: 'Hybrid',
    description: 'Combination of fixed and variable pricing',
  },
];

export function AIEstimateModal({
  isOpen,
  onClose,
  onGenerate,
  isGenerating,
  opportunityName,
  opportunityDescription,
}: AIEstimateModalProps): JSX.Element {
  const [estimateType, setEstimateType] = useState<EstimateType>('FIXED_PRICE');
  const [projectDescription, setProjectDescription] = useState(
    opportunityDescription ?? '',
  );
  const [budget, setBudget] = useState<string>('');
  const [additionalContext, setAdditionalContext] = useState('');

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    const fullDescription = additionalContext
      ? `${projectDescription}\n\nAdditional context: ${additionalContext}`
      : projectDescription;

    await onGenerate({
      estimateType,
      projectDescription: fullDescription,
      budget: budget ? parseFloat(budget) : undefined,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Generate AI Estimate"
      size="medium"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* AI Info Banner */}
        <div className="p-4 bg-primary-50 dark:bg-primary-900/30 rounded-lg border border-primary-100 dark:border-primary-800">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-primary-900 dark:text-primary-100">
                AI-Powered Estimation
              </h4>
              <p className="text-sm text-primary-700 dark:text-primary-300 mt-1">
                Our AI will analyze your project requirements and generate a
                detailed cost estimate with line items, assumptions, and
                recommendations.
              </p>
            </div>
          </div>
        </div>

        {/* Opportunity Context */}
        {opportunityName && (
          <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-md">
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
              Generating estimate for:
            </p>
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {opportunityName}
            </p>
          </div>
        )}

        {/* Estimate Type */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Estimate Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            {ESTIMATE_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setEstimateType(type.value)}
                className={`p-3 text-left rounded-lg border-2 transition-colors ${
                  estimateType === type.value
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                    : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                }`}
              >
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {type.label}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {type.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Project Description */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Project Description *
          </label>
          <textarea
            value={projectDescription}
            onChange={(e) => setProjectDescription(e.target.value)}
            rows={4}
            required
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Describe the project scope, deliverables, and requirements..."
          />
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            The more detail you provide, the more accurate the estimate will be.
          </p>
        </div>

        {/* Budget Guidance */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Budget Guidance (optional)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
              $
            </span>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              min="0"
              step="1000"
              className="w-full pl-8 pr-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="e.g., 50000"
            />
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            If you have a target budget, the AI will try to scope the project
            accordingly.
          </p>
        </div>

        {/* Additional Context */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Additional Context (optional)
          </label>
          <textarea
            value={additionalContext}
            onChange={(e) => setAdditionalContext(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Industry, technology preferences, timeline constraints..."
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isGenerating || !projectDescription}>
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Estimate
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default AIEstimateModal;
