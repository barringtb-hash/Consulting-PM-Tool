/**
 * Contract Generator Modal
 *
 * Modal for generating AI-powered contracts.
 */

import React, { useState } from 'react';
import { Sparkles, Loader2, FileText, FileSignature } from 'lucide-react';
import { Modal } from '../../../ui/Modal';
import { Button } from '../../../ui/Button';
import { Badge } from '../../../ui/Badge';
import { useGenerateContract } from '../hooks/useContracts';
import type { OpportunitySOW, ContractType } from '../types';

interface ContractGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  opportunityId: number;
  opportunityName?: string;
  sows: OpportunitySOW[];
}

const CONTRACT_TYPES: Array<{
  value: ContractType;
  label: string;
  description: string;
}> = [
  {
    value: 'MSA',
    label: 'Master Services Agreement',
    description: 'Standard MSA with general terms and conditions',
  },
  {
    value: 'SOW',
    label: 'Statement of Work',
    description: 'Project-specific scope and deliverables',
  },
  {
    value: 'MSA_WITH_SOW',
    label: 'MSA + SOW',
    description: 'Combined master agreement with project scope',
  },
  {
    value: 'CONSULTING_AGREEMENT',
    label: 'Consulting Agreement',
    description: 'Professional consulting services contract',
  },
  {
    value: 'NDA',
    label: 'NDA',
    description: 'Non-disclosure agreement for confidential information',
  },
  {
    value: 'RETAINER_AGREEMENT',
    label: 'Retainer Agreement',
    description: 'Ongoing services retainer contract',
  },
];

export function ContractGeneratorModal({
  isOpen,
  onClose,
  onSuccess,
  opportunityId,
  opportunityName,
  sows,
}: ContractGeneratorModalProps): JSX.Element {
  const [contractType, setContractType] = useState<ContractType>(
    'CONSULTING_AGREEMENT',
  );
  const [selectedSowId, setSelectedSowId] = useState<number | null>(
    sows.length > 0 ? sows[0].id : null,
  );
  const [customInstructions, setCustomInstructions] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');

  // Mutation
  const generateMutation = useGenerateContract();

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    try {
      await generateMutation.mutateAsync({
        opportunityId,
        input: {
          type: contractType,
          sowId: selectedSowId ?? undefined,
          customInstructions: customInstructions || undefined,
          companyName: companyName || undefined,
          companyAddress: companyAddress || undefined,
        },
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to generate contract:', error);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Generate Contract"
      size="large"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* AI Info Banner */}
        <div className="p-4 bg-primary-50 dark:bg-primary-900/30 rounded-lg border border-primary-100 dark:border-primary-800">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-primary-900 dark:text-primary-100">
                AI-Powered Contract Generation
              </h4>
              <p className="text-sm text-primary-700 dark:text-primary-300 mt-1">
                Our AI will generate a professional contract with standard legal
                clauses, payment terms, and signature blocks.
              </p>
            </div>
          </div>
        </div>

        {/* Opportunity Context */}
        {opportunityName && (
          <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-md">
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
              Generating contract for:
            </p>
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {opportunityName}
            </p>
          </div>
        )}

        {/* Contract Type */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Contract Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            {CONTRACT_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setContractType(type.value)}
                className={`p-3 text-left rounded-lg border-2 transition-colors ${
                  contractType === type.value
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

        {/* SOW Selection */}
        {(contractType === 'SOW' || contractType === 'MSA_WITH_SOW') && (
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Link to SOW
            </label>
            {sows.length === 0 ? (
              <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-md text-center">
                <FileText className="w-6 h-6 text-neutral-400 mx-auto mb-2" />
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  No approved SOWs available
                </p>
                <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                  Create and approve a SOW first
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {sows.map((sow) => (
                  <button
                    key={sow.id}
                    type="button"
                    onClick={() => setSelectedSowId(sow.id)}
                    className={`w-full p-3 text-left rounded-lg border-2 transition-colors ${
                      selectedSowId === sow.id
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                        : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {sow.name}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {sow.content.sections?.length ?? 0} sections
                        </p>
                      </div>
                      <Badge variant="success" size="sm">
                        Approved
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Company Details */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Your Company Name
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="e.g., Acme Consulting LLC"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Company Address
            </label>
            <input
              type="text"
              value={companyAddress}
              onChange={(e) => setCompanyAddress(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="e.g., 123 Main St, City, State 12345"
            />
          </div>
        </div>

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
            placeholder="Add any specific clauses or requirements..."
          />
        </div>

        {/* Standard Sections Info */}
        <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-md">
          <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Standard sections included:
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              'Parties',
              'Scope of Services',
              'Payment Terms',
              'Intellectual Property',
              'Confidentiality',
              'Term & Termination',
              'Limitation of Liability',
              'Indemnification',
              'General Provisions',
              'Signatures',
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
                <FileSignature className="w-4 h-4 mr-2" />
                Generate Contract
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default ContractGeneratorModal;
