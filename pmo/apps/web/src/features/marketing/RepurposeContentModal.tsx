import React, { useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';

import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { Select } from '../../ui/Select';
import { Input } from '../../ui/Input';
import {
  useRepurposeMarketingContent,
  useCreateMarketingContent,
} from '../../api/marketing';
import {
  ContentType,
  ContentChannel,
  CONTENT_TYPE_LABELS,
  CONTENT_CHANNEL_LABELS,
  getDefaultChannelForType,
  type MarketingContent,
} from '../../../../../packages/types/marketing';

interface RepurposeContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceContent: MarketingContent;
}

export function RepurposeContentModal({
  isOpen,
  onClose,
  sourceContent,
}: RepurposeContentModalProps): JSX.Element {
  const [targetType, setTargetType] = useState<ContentType>(
    ContentType.BLOG_POST,
  );
  const [targetChannel, setTargetChannel] = useState<ContentChannel | ''>('');
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

  const repurposeMutation = useRepurposeMarketingContent();
  const createMutation = useCreateMarketingContent();

  const handleRepurpose = async () => {
    try {
      const result = await repurposeMutation.mutateAsync({
        contentId: sourceContent.id,
        payload: {
          targetType,
          targetChannel: targetChannel || getDefaultChannelForType(targetType),
          additionalContext,
          tone,
          length,
        },
      });

      setGeneratedContent(result);
    } catch (error) {
      console.error('Error repurposing content:', error);
    }
  };

  const handleSave = async () => {
    if (!generatedContent) return;

    try {
      await createMutation.mutateAsync({
        name: generatedContent.title || `${sourceContent.name} (Repurposed)`,
        type: targetType,
        channel: targetChannel || getDefaultChannelForType(targetType),
        status: 'DRAFT',
        clientId: sourceContent.clientId,
        projectId: sourceContent.projectId,
        sourceContentId: sourceContent.id,
        content: { body: generatedContent.body },
        summary: generatedContent.summary,
      });

      onClose();
      setGeneratedContent(null);
    } catch (error) {
      console.error('Error saving repurposed content:', error);
    }
  };

  const handleClose = () => {
    onClose();
    setGeneratedContent(null);
    setAdditionalContext('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Repurpose: ${sourceContent.name}`}
      size="large"
    >
      <div className="space-y-4">
        {!generatedContent ? (
          <>
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-sm text-gray-700 mb-2">
                Source Content
              </h4>
              <div className="text-sm text-gray-600">
                <p>
                  <span className="font-medium">Type:</span>{' '}
                  {CONTENT_TYPE_LABELS[sourceContent.type]}
                </p>
                {sourceContent.channel && (
                  <p>
                    <span className="font-medium">Channel:</span>{' '}
                    {CONTENT_CHANNEL_LABELS[sourceContent.channel]}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Content Type
                </label>
                <Select
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value as ContentType)}
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
                  Target Channel (Optional)
                </label>
                <Select
                  value={targetChannel}
                  onChange={(e) =>
                    setTargetChannel(e.target.value as ContentChannel | '')
                  }
                >
                  <option value="">Auto (based on type)</option>
                  {Object.entries(CONTENT_CHANNEL_LABELS).map(
                    ([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ),
                  )}
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
                placeholder="Any specific instructions for the repurposed content..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleRepurpose}
                disabled={repurposeMutation.isPending}
              >
                {repurposeMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Repurpose Content
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
