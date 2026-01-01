/**
 * API Keys Page for Bug Tracking
 *
 * Allows users to create and manage API keys for external tool access
 * (e.g., Claude Code, CI/CD pipelines, monitoring systems)
 */

import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import { Button, Input, Badge, Card } from '../../ui';
import { Modal } from '../../ui/Modal';
import { PageHeader } from '../../ui/PageHeader';
import { useToast } from '../../ui/Toast';
import {
  useApiKeys,
  useCreateApiKey,
  useRevokeApiKey,
  useDeleteApiKey,
} from '../../api/hooks/useBugTracking';

const AVAILABLE_PERMISSIONS = [
  {
    id: 'issues:read',
    label: 'Read Issues',
    description: 'View issues and AI prompts',
  },
  {
    id: 'issues:write',
    label: 'Write Issues',
    description: 'Create/update issues and status',
  },
  {
    id: 'errors:write',
    label: 'Write Errors',
    description: 'Submit error logs',
  },
  { id: 'labels:read', label: 'Read Labels', description: 'View labels' },
  {
    id: 'labels:write',
    label: 'Write Labels',
    description: 'Create/update labels',
  },
  {
    id: 'comments:read',
    label: 'Read Comments',
    description: 'View issue comments',
  },
  {
    id: 'comments:write',
    label: 'Write Comments',
    description: 'Add comments to issues',
  },
];

const DEFAULT_PERMISSIONS = ['issues:read', 'issues:write'];

export function ApiKeysTab() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyResult, setNewKeyResult] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const { data: apiKeys, isLoading } = useApiKeys();
  const createApiKey = useCreateApiKey();
  const revokeApiKey = useRevokeApiKey();
  const deleteApiKey = useDeleteApiKey();

  const handleCopyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } catch (error) {
      console.error('Failed to copy API key:', error);
      showToast('Failed to copy API key. Please copy it manually.', 'error');
    }
  };

  const handleCreateKey = async (name: string, permissions: string[]) => {
    try {
      const result = await createApiKey.mutateAsync({ name, permissions });
      setNewKeyResult(result.key);
      showToast('API key created successfully', 'success');
    } catch (error) {
      console.error('Failed to create API key:', error);
      showToast('Failed to create API key', 'error');
    }
  };

  const handleRevokeKey = async (id: number) => {
    if (
      confirm(
        'Are you sure you want to revoke this API key? It will no longer work.',
      )
    ) {
      try {
        await revokeApiKey.mutateAsync(id);
        showToast('API key revoked', 'success');
      } catch (error) {
        console.error('Failed to revoke API key:', error);
        showToast('Failed to revoke API key', 'error');
      }
    }
  };

  const handleDeleteKey = async (id: number) => {
    if (confirm('Are you sure you want to permanently delete this API key?')) {
      try {
        await deleteApiKey.mutateAsync(id);
        showToast('API key deleted', 'success');
      } catch (error) {
        console.error('Failed to delete API key:', error);
        showToast('Failed to delete API key', 'error');
      }
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <PageHeader
        title="API Keys"
        description="Manage API keys for external tool access"
        icon={Key}
        actions={
          <Button variant="outline" onClick={() => navigate('/bug-tracking')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Issues
          </Button>
        }
      />

      <div className="container-padding py-6 space-y-6">
        {/* Create Button */}
        <div className="flex justify-end">
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Create API Key
          </Button>
        </div>

        {/* Info Card */}
        <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-800 dark:text-blue-200">
                Using API Keys with Claude Code
              </p>
              <p className="text-blue-700 dark:text-blue-300 mt-1">
                Set these environment variables before starting Claude Code:
              </p>
              <pre className="mt-2 p-2 bg-blue-100 dark:bg-blue-900/40 rounded text-xs overflow-x-auto">
                {`export BUG_TRACKER_API_KEY="bt_your_key_here"
export BUG_TRACKER_API_URL="https://<your-api-domain>/api"`}
              </pre>
              <p className="text-blue-700 dark:text-blue-300 mt-2">
                Then use{' '}
                <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">
                  /implement-issue 19
                </code>{' '}
                to fetch issue data automatically.
              </p>
            </div>
          </div>
        </Card>

        {/* API Keys List */}
        {isLoading ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Loading API keys...
          </div>
        ) : !apiKeys || apiKeys.length === 0 ? (
          <Card className="p-8 text-center">
            <Key className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              No API keys created yet
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Create Your First API Key
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {apiKeys.map((apiKey) => (
              <Card key={apiKey.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Key className="h-4 w-4 text-gray-400" />
                      <span className="font-medium dark:text-white">
                        {apiKey.name}
                      </span>
                      {apiKey.revokedAt && (
                        <Badge variant="destructive">Revoked</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-mono">{apiKey.keyPrefix}...</span>
                      <span>
                        Created{' '}
                        {new Date(apiKey.createdAt).toLocaleDateString()}
                      </span>
                      {apiKey.lastUsedAt && (
                        <span>
                          Last used{' '}
                          {new Date(apiKey.lastUsedAt).toLocaleDateString()}
                        </span>
                      )}
                      {apiKey.usageCount > 0 && (
                        <span>{apiKey.usageCount} requests</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {apiKey.permissions.map((perm) => (
                        <Badge
                          key={perm}
                          variant="secondary"
                          className="text-xs"
                        >
                          {perm}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!apiKey.revokedAt && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRevokeKey(apiKey.id)}
                      >
                        Revoke
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteKey(apiKey.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Create API Key Modal */}
        {showCreateModal && !newKeyResult && (
          <CreateApiKeyModal
            onClose={() => setShowCreateModal(false)}
            onSubmit={handleCreateKey}
            isLoading={createApiKey.isPending}
          />
        )}

        {/* New Key Result Modal */}
        {newKeyResult && (
          <Modal
            isOpen={true}
            onClose={() => {
              setNewKeyResult(null);
              setShowCreateModal(false);
            }}
            title="API Key Created"
          >
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Important:</strong> Copy this API key now. You
                    won&apos;t be able to see it again!
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  value={newKeyResult}
                  readOnly
                  autoComplete="off"
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  onClick={() => handleCopyKey(newKeyResult)}
                >
                  {copiedKey ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    setNewKeyResult(null);
                    setShowCreateModal(false);
                  }}
                >
                  Done
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}

function CreateApiKeyModal({
  onClose,
  onSubmit,
  isLoading,
}: {
  onClose: () => void;
  onSubmit: (name: string, permissions: string[]) => void;
  isLoading: boolean;
}) {
  const [name, setName] = useState('');
  const [permissions, setPermissions] = useState<string[]>(DEFAULT_PERMISSIONS);

  const togglePermission = (perm: string) => {
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && permissions.length > 0) {
      onSubmit(name.trim(), permissions);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Create API Key">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="api-key-name"
            className="block text-sm font-medium mb-1 dark:text-white"
          >
            Key Name
          </label>
          <Input
            id="api-key-name"
            placeholder="e.g., Claude Code, CI Pipeline"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            A descriptive name to identify this key
          </p>
        </div>

        <div>
          <span className="block text-sm font-medium mb-2 dark:text-white">
            Permissions
          </span>
          <div className="space-y-2">
            {AVAILABLE_PERMISSIONS.map((perm) => (
              <label
                key={perm.id}
                htmlFor={`perm-${perm.id}`}
                className="flex items-start gap-3 p-2 rounded hover:bg-gray-50 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <input
                  id={`perm-${perm.id}`}
                  type="checkbox"
                  checked={permissions.includes(perm.id)}
                  onChange={() => togglePermission(perm.id)}
                  className="mt-1"
                />
                <div>
                  <span className="font-medium dark:text-white">
                    {perm.label}
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {perm.description}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!name.trim() || permissions.length === 0 || isLoading}
          >
            {isLoading ? 'Creating...' : 'Create API Key'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default ApiKeysTab;
