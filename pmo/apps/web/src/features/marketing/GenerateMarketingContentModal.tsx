import React, { useState } from 'react';
import { Loader2, Sparkles, AlertCircle } from 'lucide-react';

import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { Select } from '../../ui/Select';
import { Input } from '../../ui/Input';
import { useToast } from '../../ui/Toast';
import {
  useGenerateMarketingContentFromProject,
  useGenerateMarketingContentFromMeeting,
  useCreateMarketingContent,
} from '../../api/marketing';
import {
  ContentType,
  CONTENT_TYPE_LABELS,
  getDefaultChannelForType,
} from '../../../../../packages/types/marketing';

interface GenerateMarketingContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceType: 'project' | 'meeting';
  sourceId: number;
  sourceName: string;
  clientId: number;
  projectId?: number;
}

export function GenerateMarketingContentModal({
  isOpen,
  onClose,
  sourceType,
  sourceId,
  sourceName,
  clientId,
  projectId,
}: GenerateMarketingContentModalProps): JSX.Element {
  const { showToast } = useToast();
  const [contentType, setContentType] = useState<ContentType>(
    ContentType.BLOG_POST,
  );
  const [additionalContext, setAdditionalContext] = useState('');
  const [tone, setTone] = useState<
    'professional' | 'casual' | 'technical' | 'enthusiastic'
  >('professional');
  const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [generatedContent, setGeneratedContent] = useState<{
    title?: string;
    body: string;
    summary?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateFromProjectMutation = useGenerateMarketingContentFromProject();
  const generateFromMeetingMutation = useGenerateMarketingContentFromMeeting();
  const createMutation = useCreateMarketingContent();

  const isGenerating =
    generateFromProjectMutation.isPending ||
    generateFromMeetingMutation.isPending;

  const handleGenerate = async () => {
    setError(null);
    try {
      const payload = {
        type: contentType,
        additionalContext,
        tone,
        length,
      };

      const result =
        sourceType === 'project'
          ? await generateFromProjectMutation.mutateAsync({
              projectId: sourceId,
              payload,
            })
          : await generateFromMeetingMutation.mutateAsync({
              meetingId: sourceId,
              payload,
            });

      setGeneratedContent(result);
    } catch (err) {
      console.error('Error generating content:', err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to generate content. Please try again.';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    }
  };

  const handleSave = async () => {
    if (!generatedContent) return;

    // Validate clientId before attempting to save
    if (!clientId) {
      const errorMessage =
        'Cannot save content: Project is not linked to an account.';
      setError(errorMessage);
      showToast(errorMessage, 'error');
      return;
    }

    setError(null);
    try {
      await createMutation.mutateAsync({
        name: generatedContent.title || `Generated from ${sourceName}`,
        type: contentType,
        channel: getDefaultChannelForType(contentType),
        status: 'DRAFT',
        clientId,
        projectId: sourceType === 'project' ? sourceId : projectId,
        sourceMeetingId: sourceType === 'meeting' ? sourceId : undefined,
        content: { body: generatedContent.body },
        summary: generatedContent.summary,
      });

      showToast('Marketing content saved as draft', 'success');
      onClose();
      setGeneratedContent(null);
    } catch (err) {
      console.error('Error saving generated content:', err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to save content. Please try again.';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    }
  };

  const handleClose = () => {
    onClose();
    setGeneratedContent(null);
    setAdditionalContext('');
    setError(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Generate Marketing Content from ${sourceType === 'project' ? 'Project' : 'Meeting'}`}
      size="large"
    >
      <div className="space-y-4">
        {!generatedContent ? (
          <>
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-sm text-gray-700 mb-2">
                Source {sourceType === 'project' ? 'Project' : 'Meeting'}
              </h4>
              <p className="text-sm text-gray-600">{sourceName}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content Type
                </label>
                <Select
                  value={contentType}
                  onChange={(e) =>
                    setContentType(e.target.value as ContentType)
                  }
                >
                  {Object.entries(CONTENT_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tone
                </label>
                <Select
                  value={tone}
                  onChange={(e) =>
                    setTone(
                      e.target.value as
                        | 'professional'
                        | 'casual'
                        | 'technical'
                        | 'enthusiastic',
                    )
                  }
                >
                  <option value="professional">Professional</option>
                  <option value="casual">Casual</option>
                  <option value="technical">Technical</option>
                  <option value="enthusiastic">Enthusiastic</option>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Length
                </label>
                <Select
                  value={length}
                  onChange={(e) =>
                    setLength(e.target.value as 'short' | 'medium' | 'long')
                  }
                >
                  <option value="short">Short</option>
                  <option value="medium">Medium</option>
                  <option value="long">Long</option>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Context (Optional)
              </label>
              <Input
                type="text"
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                placeholder="Specific angles, key messages, or requirements..."
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-300">
                  {error}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Content
                  </>
                )}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-4">
              {generatedContent.title && (
                <div>
                  <h4 className="font-medium text-sm text-gray-700 mb-1">
                    Title
                  </h4>
                  <p className="text-gray-900">{generatedContent.title}</p>
                </div>
              )}

              {generatedContent.summary && (
                <div>
                  <h4 className="font-medium text-sm text-gray-700 mb-1">
                    Summary
                  </h4>
                  <p className="text-gray-600">{generatedContent.summary}</p>
                </div>
              )}

              <div>
                <h4 className="font-medium text-sm text-gray-700 mb-1">
                  Generated Content
                </h4>
                <div className="p-4 bg-gray-50 rounded-lg max-h-96 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm text-gray-800">
                    {generatedContent.body}
                  </pre>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="secondary"
                onClick={() => setGeneratedContent(null)}
              >
                Regenerate
              </Button>
              <Button variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save as Draft'
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
