import React, { useState, useEffect } from 'react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { useToast } from '../../ui/Toast';
import {
  useCreateMarketingContent,
  useUpdateMarketingContent,
} from '../../api/marketing';
import {
  type MarketingContent,
  type Client,
  type ContentType,
  type ContentStatus,
  CONTENT_TYPE_LABELS,
  CONTENT_STATUS_LABELS,
} from '../../../../../packages/types/marketing';

interface MarketingContentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingContent?: MarketingContent | null;
  clients: Client[];
}

function MarketingContentFormModal({
  isOpen,
  onClose,
  editingContent,
  clients,
}: MarketingContentFormModalProps): JSX.Element {
  const [formData, setFormData] = useState({
    name: '',
    type: 'BLOG_POST' as ContentType,
    status: 'DRAFT' as ContentStatus,
    clientId: '',
    projectId: '',
    summary: '',
    tags: '',
    content: '',
  });

  const { showToast } = useToast();
  const createMutation = useCreateMarketingContent();
  const updateMutation = useUpdateMarketingContent();

  useEffect(() => {
    if (editingContent) {
      setFormData({
        name: editingContent.name,
        type: editingContent.type,
        status: editingContent.status,
        clientId: editingContent.clientId.toString(),
        projectId: editingContent.projectId?.toString() || '',
        summary: editingContent.summary || '',
        tags: editingContent.tags.join(', '),
        content: JSON.stringify(editingContent.content, null, 2),
      });
    } else {
      setFormData({
        name: '',
        type: 'BLOG_POST',
        status: 'DRAFT',
        clientId: '',
        projectId: '',
        summary: '',
        tags: '',
        content: '',
      });
    }
  }, [editingContent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.clientId) {
      showToast('Please fill in required fields', 'error');
      return;
    }

    try {
      const payload: {
        name: string;
        type: ContentType;
        status: ContentStatus;
        clientId: number;
        projectId?: number;
        summary?: string;
        tags: string[];
        content?: Record<string, unknown>;
      } = {
        name: formData.name,
        type: formData.type,
        status: formData.status,
        clientId: Number(formData.clientId),
        projectId: formData.projectId ? Number(formData.projectId) : undefined,
        summary: formData.summary || undefined,
        tags: formData.tags
          ? formData.tags
              .split(',')
              .map((tag) => tag.trim())
              .filter(Boolean)
          : [],
        content: formData.content
          ? (JSON.parse(formData.content) as Record<string, unknown>)
          : undefined,
      };

      if (editingContent) {
        await updateMutation.mutateAsync({
          contentId: editingContent.id,
          payload,
        });
        showToast('Content updated successfully', 'success');
      } else {
        await createMutation.mutateAsync(payload);
        showToast('Content created successfully', 'success');
      }

      onClose();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save content';
      showToast(message, 'error');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingContent ? 'Edit Content' : 'Create Marketing Content'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Content Name *"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Type *"
            value={formData.type}
            onChange={(e) =>
              setFormData({ ...formData, type: e.target.value as ContentType })
            }
            required
          >
            {Object.entries(CONTENT_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>

          <Select
            label="Status"
            value={formData.status}
            onChange={(e) =>
              setFormData({
                ...formData,
                status: e.target.value as ContentStatus,
              })
            }
          >
            {Object.entries(CONTENT_STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        <Select
          label="Client *"
          value={formData.clientId}
          onChange={(e) =>
            setFormData({ ...formData, clientId: e.target.value })
          }
          required
        >
          <option value="">Select a client</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </Select>

        <Input
          label="Summary"
          value={formData.summary}
          onChange={(e) =>
            setFormData({ ...formData, summary: e.target.value })
          }
          placeholder="Brief summary of the content..."
        />

        <Input
          label="Tags"
          value={formData.tags}
          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
          placeholder="marketing, ai, case-study (comma separated)"
        />

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Content (JSON)
          </label>
          <textarea
            value={formData.content}
            onChange={(e) =>
              setFormData({ ...formData, content: e.target.value })
            }
            rows={8}
            className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
            placeholder='{"title": "...", "body": "..."}'
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {editingContent ? 'Update' : 'Create'} Content
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default MarketingContentFormModal;
