/**
 * SOW Generator Modal
 *
 * Modal for generating AI-powered Statements of Work.
 */

import React, { useState } from 'react';
import { Sparkles, Loader2, FileText, DollarSign } from 'lucide-react';
import { Modal } from '../../../ui/Modal';
import { Button } from '../../../ui/Button';
import { Badge } from '../../../ui/Badge';
import { useGenerateSOW } from '../hooks/useSOWs';
import type { CostEstimate } from '../types';

interface SOWGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  opportunityId: number;
  opportunityName?: string;
  opportunityDescription?: string;
  estimates: CostEstimate[];
}

function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function SOWGeneratorModal({
  isOpen,
  onClose,
  onSuccess,
  opportunityId,
  opportunityName,
  opportunityDescription,
  estimates,
}: SOWGeneratorModalProps): JSX.Element {
  const [selectedEstimateId, setSelectedEstimateId] = useState<number | null>(
    estimates.length > 0 ? estimates[0].id : null,
  );
  const [customInstructions, setCustomInstructions] = useState('');

  // Mutation
  const generateMutation = useGenerateSOW();

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    try {
      await generateMutation.mutateAsync({
        opportunityId,
        input: {
          estimateId: selectedEstimateId ?? undefined,
          customInstructions: customInstructions || undefined,
        },
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to generate SOW:', error);
    }
  };

  const selectedEstimate = estimates.find((e) => e.id === selectedEstimateId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Generate Statement of Work"
      size="medium"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* AI Info Banner */}
        <div className="p-4 bg-primary-50 dark:bg-primary-900/30 rounded-lg border border-primary-100 dark:border-primary-800">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-primary-900 dark:text-primary-100">
                AI-Powered SOW Generation
              </h4>
              <p className="text-sm text-primary-700 dark:text-primary-300 mt-1">
                Our AI will generate a comprehensive Statement of Work with
                standard sections including scope, deliverables, timeline, and
                terms.
              </p>
            </div>
          </div>
        </div>

        {/* Opportunity Context */}
        {opportunityName && (
          <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-md">
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
              Generating SOW for:
            </p>
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {opportunityName}
            </p>
            {opportunityDescription && (
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1 line-clamp-2">
                {opportunityDescription}
              </p>
            )}
          </div>
        )}

        {/* Estimate Selection */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Link to Estimate (optional)
          </label>
          {estimates.length === 0 ? (
            <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-md text-center">
              <FileText className="w-6 h-6 text-neutral-400 mx-auto mb-2" />
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                No approved estimates available
              </p>
              <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                Approve an estimate to include pricing details in your SOW
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setSelectedEstimateId(null)}
                className={`w-full p-3 text-left rounded-lg border-2 transition-colors ${
                  selectedEstimateId === null
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                    : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                }`}
              >
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  No estimate linked
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Generate SOW without pricing details
                </p>
              </button>

              {estimates.map((estimate) => (
                <button
                  key={estimate.id}
                  type="button"
                  onClick={() => setSelectedEstimateId(estimate.id)}
                  className={`w-full p-3 text-left rounded-lg border-2 transition-colors ${
                    selectedEstimateId === estimate.id
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                      : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {estimate.name}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {estimate.lineItems?.length ?? 0} line items
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="success" size="sm">
                        <DollarSign className="w-3 h-3 mr-0.5" />
                        {formatCurrency(estimate.total, estimate.currency)}
                      </Badge>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected Estimate Summary */}
        {selectedEstimate && (
          <div className="p-3 bg-success-50 dark:bg-success-900/30 rounded-md border border-success-100 dark:border-success-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-success-600 dark:text-success-400">
                  Linked Estimate
                </p>
                <p className="text-sm font-medium text-success-900 dark:text-success-100">
                  {selectedEstimate.name}
                </p>
              </div>
              <p className="text-lg font-semibold text-success-900 dark:text-success-100">
                {formatCurrency(
                  selectedEstimate.total,
                  selectedEstimate.currency,
                )}
              </p>
            </div>
          </div>
        )}

        {/* Custom Instructions */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Custom Instructions (optional)
          </label>
          <textarea
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Add any specific requirements or sections to include..."
          />
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            e.g., &quot;Include a section on data security requirements&quot; or
            &quot;Emphasize agile methodology&quot;
          </p>
        </div>

        {/* Standard Sections Info */}
        <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-md">
          <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Standard sections included:
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              'Introduction',
              'Objectives',
              'Scope of Work',
              'Deliverables',
              'Timeline',
              'Pricing',
              'Assumptions',
              'Acceptance Criteria',
              'Change Management',
            ].map((section) => (
              <Badge key={section} variant="secondary" size="sm">
                {section}
              </Badge>
            ))}
          </div>
        </div>

        {/* Error display */}
        {generateMutation.error && (
          <div className="p-3 bg-danger-50 dark:bg-danger-900/30 rounded-md">
            <p className="text-sm text-danger-600 dark:text-danger-400">
              {generateMutation.error.message}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={generateMutation.isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={generateMutation.isPending}>
            {generateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate SOW
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default SOWGeneratorModal;
