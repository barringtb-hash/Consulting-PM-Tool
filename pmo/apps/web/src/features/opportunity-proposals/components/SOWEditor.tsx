/**
 * SOW Editor Component
 *
 * Section-based editor for viewing and editing Statements of Work.
 */

import React, { useState } from 'react';
import {
  ArrowLeft,
  Save,
  Sparkles,
  FileText,
  Check,
  Loader2,
  Edit2,
} from 'lucide-react';

import { Card, CardBody, CardHeader } from '../../../ui/Card';
import { Button } from '../../../ui/Button';
import { Badge } from '../../../ui/Badge';
import { useToast } from '../../../ui/Toast';
import {
  useUpdateSOW,
  useUpdateSOWSection,
  useRegenerateSOWSection,
} from '../hooks/useSOWs';
import type { OpportunitySOW, SOWSection, SOWStatus } from '../types';

interface SOWEditorProps {
  opportunityId: number;
  sow: OpportunitySOW;
  onClose: () => void;
  readOnly?: boolean;
}

const STATUS_BADGE_VARIANTS: Record<
  SOWStatus,
  'default' | 'primary' | 'success' | 'warning' | 'danger' | 'secondary'
> = {
  DRAFT: 'secondary',
  IN_REVIEW: 'warning',
  APPROVED: 'success',
  SENT: 'primary',
  SIGNED: 'success',
  EXPIRED: 'default',
};

const STATUS_LABELS: Record<SOWStatus, string> = {
  DRAFT: 'Draft',
  IN_REVIEW: 'In Review',
  APPROVED: 'Approved',
  SENT: 'Sent',
  SIGNED: 'Signed',
  EXPIRED: 'Expired',
};

export function SOWEditor({
  opportunityId,
  sow,
  onClose,
  readOnly = false,
}: SOWEditorProps): JSX.Element {
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [sectionContent, setSectionContent] = useState<Record<string, string>>(
    {},
  );
  const [sowName, setSowName] = useState(sow.name);
  const [hasChanges, setHasChanges] = useState(false);

  // Mutations
  const updateSOWMutation = useUpdateSOW();
  const updateSectionMutation = useUpdateSOWSection();
  const regenerateSectionMutation = useRegenerateSOWSection();

  // Toast
  const { showToast } = useToast();

  // Get sections from SOW content
  const sections = sow.content.sections ?? [];

  const handleEditSection = (section: SOWSection): void => {
    setEditingSection(section.id);
    setSectionContent((prev) => ({
      ...prev,
      [section.id]: prev[section.id] ?? section.content,
    }));
  };

  const handleSaveSection = async (sectionId: string): Promise<void> => {
    const content = sectionContent[sectionId];
    if (!content) return;

    try {
      await updateSectionMutation.mutateAsync({
        opportunityId,
        sowId: sow.id,
        sectionId,
        input: { content },
      });
      setEditingSection(null);
      setHasChanges(true);
      showToast('Section saved', 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to save section',
        'error',
      );
    }
  };

  const handleCancelEdit = (): void => {
    setEditingSection(null);
  };

  const handleRegenerateSection = async (
    section: SOWSection,
  ): Promise<void> => {
    const instructions = window.prompt(
      'Enter instructions for regenerating this section (optional):',
    );
    if (instructions === null) return;

    try {
      await regenerateSectionMutation.mutateAsync({
        opportunityId,
        sowId: sow.id,
        sectionId: section.id,
        instructions: instructions || undefined,
      });
      setHasChanges(true);
      showToast('Section regenerated', 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to regenerate section',
        'error',
      );
    }
  };

  const handleSaveName = async (): Promise<void> => {
    if (sowName === sow.name) return;

    try {
      await updateSOWMutation.mutateAsync({
        opportunityId,
        sowId: sow.id,
        input: { name: sowName },
      });
      setHasChanges(true);
      showToast('SOW name updated', 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to update name',
        'error',
      );
    }
  };

  const isSaving =
    updateSOWMutation.isPending ||
    updateSectionMutation.isPending ||
    regenerateSectionMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="secondary" size="sm" onClick={onClose}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Badge variant={STATUS_BADGE_VARIANTS[sow.status]} size="sm">
                {STATUS_LABELS[sow.status]}
              </Badge>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                v{sow.version}
              </span>
            </div>
            {!readOnly ? (
              <input
                type="text"
                value={sowName}
                onChange={(e) => setSowName(e.target.value)}
                onBlur={handleSaveName}
                className="mt-1 text-xl font-semibold bg-transparent border-none focus:ring-0 p-0 text-neutral-900 dark:text-neutral-100"
              />
            ) : (
              <h2 className="mt-1 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                {sow.name}
              </h2>
            )}
          </div>
        </div>
        {hasChanges && (
          <Badge variant="primary" size="sm">
            <Check className="w-3 h-3 mr-1" />
            Changes saved
          </Badge>
        )}
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((section) => (
          <Card key={section.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-neutral-500" />
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                    {section.title}
                  </h3>
                </div>
                {!readOnly && (
                  <div className="flex items-center gap-2">
                    {editingSection !== section.id && (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleRegenerateSection(section)}
                          disabled={isSaving}
                        >
                          <Sparkles className="w-4 h-4 mr-1" />
                          Regenerate
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleEditSection(section)}
                        >
                          <Edit2 className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardBody>
              {editingSection === section.id ? (
                <div className="space-y-3">
                  <textarea
                    value={sectionContent[section.id] ?? section.content}
                    onChange={(e) =>
                      setSectionContent((prev) => ({
                        ...prev,
                        [section.id]: e.target.value,
                      }))
                    }
                    rows={10}
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSaveSection(section.id)}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-1" />
                          Save Section
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="prose dark:prose-invert max-w-none">
                  <p className="text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                    {section.content}
                  </p>
                </div>
              )}
            </CardBody>
          </Card>
        ))}

        {sections.length === 0 && (
          <Card>
            <CardBody>
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
                <p className="text-neutral-500 dark:text-neutral-400">
                  No sections available
                </p>
              </div>
            </CardBody>
          </Card>
        )}
      </div>

      {/* Full Markdown Preview */}
      {sow.content.markdown && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-neutral-500" />
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                Full Document Preview
              </h3>
            </div>
          </CardHeader>
          <CardBody>
            <div className="prose dark:prose-invert max-w-none">
              <pre className="text-sm whitespace-pre-wrap bg-neutral-50 dark:bg-neutral-800 p-4 rounded-md overflow-x-auto">
                {sow.content.markdown}
              </pre>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

export default SOWEditor;
