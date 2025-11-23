import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { Select } from '../../ui/Select';
import { useToast } from '../../ui/Toast';
import { Megaphone, Loader } from 'lucide-react';
import {
  useGenerateMarketingContent,
  useCreateMarketingContent,
} from '../../api/marketing';
import {
  CONTENT_TYPE_LABELS,
  type ContentType,
} from '../../../../../packages/types/marketing';

interface GenerateContentButtonProps {
  sourceType: 'project' | 'meeting';
  sourceId: number;
  clientId: number;
  projectId?: number;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
}

function GenerateContentButton({
  sourceType,
  sourceId,
  clientId,
  projectId,
  variant = 'secondary',
  size = 'sm',
}: GenerateContentButtonProps): JSX.Element {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [contentType, setContentType] = useState<ContentType>('BLOG_POST');
  const [tone, setTone] = useState<'professional' | 'casual' | 'technical' | 'enthusiastic'>('professional');
  const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [additionalContext, setAdditionalContext] = useState('');

  const { showToast } = useToast();
  const navigate = useNavigate();
  const generateMutation = useGenerateMarketingContent();
  const createMutation = useCreateMarketingContent();

  const handleGenerate = async () => {
    try {
      // Generate content using LLM
      const generated = await generateMutation.mutateAsync({
        type: contentType,
        sourceType,
        sourceId,
        additionalContext: additionalContext || undefined,
        tone,
        length,
      });

      // Create marketing content record with generated data
      const created = await createMutation.mutateAsync({
        name: generated.title || `Generated ${CONTENT_TYPE_LABELS[contentType]}`,
        type: contentType,
        status: 'DRAFT',
        clientId,
        projectId: projectId || (sourceType === 'project' ? sourceId : undefined),
        sourceMeetingId: sourceType === 'meeting' ? sourceId : undefined,
        content: generated,
        summary: generated.summary,
      });

      showToast('Content generated successfully!', 'success');
      setIsModalOpen(false);

      // Navigate to marketing page
      navigate('/marketing');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to generate content';
      showToast(message, 'error');
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsModalOpen(true)}
      >
        <Megaphone className="w-4 h-4" />
        Generate Content
      </Button>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Generate Marketing Content"
      >
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">
            Use AI to generate marketing content based on your {sourceType} data.
          </p>

          <Select
            label="Content Type"
            value={contentType}
            onChange={(e) => setContentType(e.target.value as ContentType)}
          >
            {Object.entries(CONTENT_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Tone"
              value={tone}
              onChange={(e) => setTone(e.target.value as any)}
            >
              <option value="professional">Professional</option>
              <option value="casual">Casual</option>
              <option value="technical">Technical</option>
              <option value="enthusiastic">Enthusiastic</option>
            </Select>

            <Select
              label="Length"
              value={length}
              onChange={(e) => setLength(e.target.value as any)}
            >
              <option value="short">Short</option>
              <option value="medium">Medium</option>
              <option value="long">Long</option>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Additional Context (Optional)
            </label>
            <textarea
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Add any specific details or requirements for the content..."
            />
          </div>

          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
            <p className="text-sm text-primary-900">
              <strong>Note:</strong> AI will use data from your {sourceType} to generate
              contextual marketing content. You can edit the generated content before
              publishing.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={generateMutation.isPending || createMutation.isPending}
            >
              {generateMutation.isPending || createMutation.isPending ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Megaphone className="w-4 h-4" />
                  Generate
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default GenerateContentButton;
