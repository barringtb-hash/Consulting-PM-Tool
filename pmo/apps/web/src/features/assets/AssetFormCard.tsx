import React, { useState, useEffect } from 'react';
import { type Asset, type AssetType } from '../../api/assets';
import { type Client } from '../../api/clients';
import { useCreateAsset, useUpdateAsset } from '../../api/queries';
import { Card, CardBody, CardHeader, CardTitle } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { Textarea } from '../../ui/Textarea';
import { Checkbox } from '../../ui/Checkbox';
import { Button } from '../../ui/Button';
import { useToast } from '../../ui/Toast';
import { Save, X } from 'lucide-react';

interface AssetFormCardProps {
  editingAsset?: Asset | null;
  clients: Client[];
  onCancel: () => void;
  onSuccess: () => void;
}

interface FormValues {
  name: string;
  type: AssetType | '';
  description: string;
  clientId: string;
  tags: string;
  isTemplate: boolean;
}

const ASSET_TYPE_OPTIONS: Array<{ value: AssetType; label: string }> = [
  { value: 'PROMPT_TEMPLATE', label: 'Prompt Template' },
  { value: 'WORKFLOW', label: 'Workflow' },
  { value: 'DATASET', label: 'Dataset' },
  { value: 'EVALUATION', label: 'Evaluation' },
  { value: 'GUARDRAIL', label: 'Guardrail' },
];

const defaultValues: FormValues = {
  name: '',
  type: '',
  description: '',
  clientId: '',
  tags: '',
  isTemplate: false,
};

function AssetFormCard({
  editingAsset,
  clients,
  onCancel,
  onSuccess,
}: AssetFormCardProps): JSX.Element {
  const [values, setValues] = useState<FormValues>(defaultValues);
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormValues, string>>
  >({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const { showToast } = useToast();
  const createAssetMutation = useCreateAsset();
  const updateAssetMutation = useUpdateAsset();

  // Load initial values when editing
  useEffect(() => {
    if (editingAsset) {
      setValues({
        name: editingAsset.name,
        type: editingAsset.type,
        description: editingAsset.description ?? '',
        clientId: editingAsset.clientId ? String(editingAsset.clientId) : '',
        tags: editingAsset.tags.join(', '),
        isTemplate: editingAsset.isTemplate,
      });
    } else {
      setValues(defaultValues);
    }
    setErrors({});
    setGeneralError(null);
  }, [editingAsset]);

  const handleChange = (field: keyof FormValues, value: string | boolean) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormValues, string>> = {};

    if (!values.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!values.type) {
      newErrors.type = 'Asset type is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (!validate()) {
      return;
    }

    const tags = values.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    const payload = {
      name: values.name.trim(),
      type: values.type as AssetType,
      description: values.description.trim() || undefined,
      clientId: values.clientId ? Number(values.clientId) : null,
      tags,
      isTemplate: values.isTemplate,
    };

    try {
      if (editingAsset) {
        await updateAssetMutation.mutateAsync({
          assetId: editingAsset.id,
          data: payload,
        });
        showToast(`Asset "${values.name}" updated successfully`, 'success');
      } else {
        await createAssetMutation.mutateAsync(payload);
        showToast(`Asset "${values.name}" created successfully`, 'success');
      }
      onSuccess();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to save asset';
      setGeneralError(message);
      showToast(message, 'error');
    }
  };

  const isSubmitting =
    createAssetMutation.isPending || updateAssetMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">
          {editingAsset ? 'Edit Asset' : 'Create New Asset'}
        </CardTitle>
      </CardHeader>
      <CardBody>
        <form onSubmit={handleSubmit} className="space-y-4">
          {generalError && (
            <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg">
              <p className="text-sm text-danger-700">{generalError}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Name"
              placeholder="e.g., Customer Onboarding Prompt"
              value={values.name}
              onChange={(e) => handleChange('name', e.target.value)}
              error={errors.name}
              required
            />

            <Select
              label="Type"
              value={values.type}
              onChange={(e) => handleChange('type', e.target.value)}
              error={errors.type}
              required
            >
              <option value="">Select a type</option>
              {ASSET_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>

            <Select
              label="Client"
              helperText="Leave unassigned for reusable templates"
              value={values.clientId}
              onChange={(e) => handleChange('clientId', e.target.value)}
            >
              <option value="">Unassigned</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </Select>

            <Input
              label="Tags"
              placeholder="e.g., onboarding, customer-service"
              helperText="Comma-separated tags"
              value={values.tags}
              onChange={(e) => handleChange('tags', e.target.value)}
            />
          </div>

          <Textarea
            label="Description"
            placeholder="Describe this asset's purpose and usage..."
            value={values.description}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={4}
          />

          <Checkbox
            label="Mark as reusable template"
            helperText="Templates can be easily cloned and reused across projects"
            checked={values.isTemplate}
            onChange={(e) => handleChange('isTemplate', e.target.checked)}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              <X className="w-4 h-4" />
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              <Save className="w-4 h-4" />
              {editingAsset ? 'Update Asset' : 'Create Asset'}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

export default AssetFormCard;
