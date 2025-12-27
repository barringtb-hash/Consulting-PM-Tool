/**
 * Template Manager Component
 *
 * Manages description templates for product listings
 * - View, create, edit, and delete templates
 * - Preview template output
 * - Set default templates by marketplace/category
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { http } from '../../api/http';
import { Button, Card, Badge, Input, Modal } from '../../ui';
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Star,
  Search,
  Eye,
  Save,
  RefreshCw,
} from 'lucide-react';

interface Template {
  id: number;
  name: string;
  description?: string;
  titleTemplate: string;
  shortDescTemplate: string;
  longDescTemplate: string;
  bulletTemplate: string;
  marketplace?: string;
  category?: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TemplateFormData {
  name: string;
  description: string;
  titleTemplate: string;
  shortDescTemplate: string;
  longDescTemplate: string;
  bulletTemplate: string;
  marketplace: string;
  category: string;
  isDefault: boolean;
}

interface TemplateManagerProps {
  configId: number;
}

const MARKETPLACES = [
  { value: '', label: 'All Marketplaces' },
  { value: 'AMAZON', label: 'Amazon' },
  { value: 'EBAY', label: 'eBay' },
  { value: 'SHOPIFY', label: 'Shopify' },
  { value: 'ETSY', label: 'Etsy' },
  { value: 'WALMART', label: 'Walmart' },
  { value: 'WOOCOMMERCE', label: 'WooCommerce' },
  { value: 'GENERIC', label: 'Generic' },
];

const TEMPLATE_VARIABLES = [
  { var: '{{product_name}}', desc: 'Product name' },
  { var: '{{category}}', desc: 'Product category' },
  { var: '{{brand}}', desc: 'Brand name' },
  { var: '{{feature_1}}', desc: 'First feature' },
  { var: '{{feature_2}}', desc: 'Second feature' },
  { var: '{{benefit_1}}', desc: 'First benefit' },
  { var: '{{bullet_points}}', desc: 'Formatted bullet points' },
];

const DEFAULT_FORM_DATA: TemplateFormData = {
  name: '',
  description: '',
  titleTemplate: '{{product_name}} - {{brand}} {{category}}',
  shortDescTemplate: 'Discover {{product_name}} from {{brand}}. {{benefit_1}}',
  longDescTemplate:
    'Introducing {{product_name}}\n\n{{benefit_1}}\n\nKey Features:\n{{bullet_points}}\n\nFrom {{brand}}, trusted quality you can rely on.',
  bulletTemplate: '{{feature}} - {{benefit}}',
  marketplace: '',
  category: '',
  isDefault: false,
};

export function TemplateManager({ configId }: TemplateManagerProps) {
  const queryClient = useQueryClient();
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>(DEFAULT_FORM_DATA);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMarketplace, setFilterMarketplace] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // Fetch templates
  const {
    data: templatesData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['templates', configId, filterMarketplace],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterMarketplace) params.append('marketplace', filterMarketplace);
      const res = await http.get(
        `/api/product-descriptions/${configId}/templates?${params}`,
      );
      return res.json() as Promise<{ templates: Template[] }>;
    },
    enabled: !!configId,
  });

  // Create template mutation
  const createMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      const res = await http.post(
        `/api/product-descriptions/${configId}/templates`,
        data,
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates', configId] });
      setShowEditor(false);
      resetForm();
    },
  });

  // Update template mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<TemplateFormData>;
    }) => {
      const res = await http.patch(
        `/api/product-descriptions/templates/${id}`,
        data,
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates', configId] });
      setShowEditor(false);
      resetForm();
    },
  });

  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await http.delete(`/api/product-descriptions/templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates', configId] });
    },
  });

  const resetForm = () => {
    setFormData(DEFAULT_FORM_DATA);
    setEditingTemplate(null);
  };

  const openEditor = (template?: Template) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name,
        description: template.description || '',
        titleTemplate: template.titleTemplate,
        shortDescTemplate: template.shortDescTemplate,
        longDescTemplate: template.longDescTemplate,
        bulletTemplate: template.bulletTemplate,
        marketplace: template.marketplace || '',
        category: template.category || '',
        isDefault: template.isDefault,
      });
    } else {
      resetForm();
    }
    setShowEditor(true);
  };

  const handleSave = () => {
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      deleteMutation.mutate(id);
    }
  };

  const duplicateTemplate = (template: Template) => {
    setFormData({
      name: `${template.name} (Copy)`,
      description: template.description || '',
      titleTemplate: template.titleTemplate,
      shortDescTemplate: template.shortDescTemplate,
      longDescTemplate: template.longDescTemplate,
      bulletTemplate: template.bulletTemplate,
      marketplace: template.marketplace || '',
      category: template.category || '',
      isDefault: false,
    });
    setEditingTemplate(null);
    setShowEditor(true);
  };

  const filteredTemplates = templatesData?.templates.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const previewTemplate = (template: string) => {
    return template
      .replace(/\{\{product_name\}\}/g, 'Premium Widget')
      .replace(/\{\{brand\}\}/g, 'TechBrand')
      .replace(/\{\{category\}\}/g, 'Electronics')
      .replace(/\{\{feature_1\}\}/g, 'Durable construction')
      .replace(/\{\{feature_2\}\}/g, 'Easy to use')
      .replace(/\{\{benefit_1\}\}/g, 'Save time and money')
      .replace(/\{\{benefit_2\}\}/g, 'Improve productivity')
      .replace(
        /\{\{bullet_points\}\}/g,
        '• Feature 1\n• Feature 2\n• Feature 3',
      );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Description Templates
        </h3>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={() => openEditor()}>
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 dark:text-neutral-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="pl-10"
          />
        </div>
        <select
          value={filterMarketplace}
          onChange={(e) => setFilterMarketplace(e.target.value)}
          className="border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 bg-white dark:bg-neutral-800 dark:text-neutral-100"
        >
          {MARKETPLACES.map((mp) => (
            <option key={mp.value} value={mp.value}>
              {mp.label}
            </option>
          ))}
        </select>
      </div>

      {/* Template List */}
      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <RefreshCw className="h-8 w-8 animate-spin text-neutral-400 dark:text-neutral-500" />
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredTemplates?.length === 0 ? (
            <Card className="p-8 text-center">
              <FileText className="h-12 w-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
              <p className="text-neutral-500 dark:text-neutral-400">
                No templates found
              </p>
              <Button size="sm" className="mt-3" onClick={() => openEditor()}>
                Create your first template
              </Button>
            </Card>
          ) : (
            filteredTemplates?.map((template) => (
              <Card key={template.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{template.name}</h4>
                      {template.isDefault && (
                        <Badge variant="success">
                          <Star className="h-3 w-3 mr-1" />
                          Default
                        </Badge>
                      )}
                      {template.marketplace && (
                        <Badge variant="default">{template.marketplace}</Badge>
                      )}
                      {template.category && (
                        <Badge variant="default">{template.category}</Badge>
                      )}
                    </div>
                    {template.description && (
                      <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                        {template.description}
                      </p>
                    )}
                    <div className="mt-2 text-xs text-neutral-400 dark:text-neutral-500">
                      Updated:{' '}
                      {new Date(template.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingTemplate(template);
                        setShowPreview(true);
                      }}
                      title="Preview"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => duplicateTemplate(template)}
                      title="Duplicate"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditor(template)}
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(template.id)}
                      title="Delete"
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Template Editor Modal */}
      <Modal
        isOpen={showEditor}
        onClose={() => {
          setShowEditor(false);
          resetForm();
        }}
        title={editingTemplate ? 'Edit Template' : 'Create Template'}
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">
                Template Name *
              </label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Amazon Electronics Template"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">
                Description
              </label>
              <Input
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Brief description of this template"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-neutral-100">
                Marketplace
              </label>
              <select
                value={formData.marketplace}
                onChange={(e) =>
                  setFormData({ ...formData, marketplace: e.target.value })
                }
                className="w-full border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 bg-white dark:bg-neutral-800 dark:text-neutral-100"
              >
                {MARKETPLACES.map((mp) => (
                  <option key={mp.value} value={mp.value}>
                    {mp.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <Input
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                placeholder="e.g., Electronics, Clothing"
              />
            </div>
          </div>

          {/* Variable Reference */}
          <Card className="p-3 bg-blue-50 dark:bg-blue-900/20">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
              Available Variables
            </p>
            <div className="flex flex-wrap gap-2">
              {TEMPLATE_VARIABLES.map((v) => (
                <span
                  key={v.var}
                  className="text-xs bg-white dark:bg-neutral-800 px-2 py-1 rounded border border-neutral-200 dark:border-neutral-700 dark:text-neutral-100"
                  title={v.desc}
                >
                  {v.var}
                </span>
              ))}
            </div>
          </Card>

          {/* Template Fields */}
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-neutral-100">
              Title Template
            </label>
            <textarea
              value={formData.titleTemplate}
              onChange={(e) =>
                setFormData({ ...formData, titleTemplate: e.target.value })
              }
              className="w-full border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-neutral-800 dark:text-neutral-100"
              rows={2}
              placeholder="{{product_name}} - {{brand}}"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 dark:text-neutral-100">
              Short Description Template
            </label>
            <textarea
              value={formData.shortDescTemplate}
              onChange={(e) =>
                setFormData({ ...formData, shortDescTemplate: e.target.value })
              }
              className="w-full border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-neutral-800 dark:text-neutral-100"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 dark:text-neutral-100">
              Long Description Template
            </label>
            <textarea
              value={formData.longDescTemplate}
              onChange={(e) =>
                setFormData({ ...formData, longDescTemplate: e.target.value })
              }
              className="w-full border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-neutral-800 dark:text-neutral-100"
              rows={6}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 dark:text-neutral-100">
              Bullet Point Template
            </label>
            <Input
              value={formData.bulletTemplate}
              onChange={(e) =>
                setFormData({ ...formData, bulletTemplate: e.target.value })
              }
              placeholder="{{feature}} - {{benefit}}"
            />
          </div>

          {/* Default Toggle */}
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.isDefault}
              onChange={(e) =>
                setFormData({ ...formData, isDefault: e.target.checked })
              }
              className="rounded"
            />
            <span className="text-sm">
              Set as default template
              {formData.marketplace && ` for ${formData.marketplace}`}
              {formData.category && ` in ${formData.category}`}
            </span>
          </label>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="secondary"
              onClick={() => {
                setShowEditor(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                !formData.name ||
                createMutation.isPending ||
                updateMutation.isPending
              }
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {editingTemplate ? 'Update' : 'Create'} Template
            </Button>
          </div>
        </div>
      </Modal>

      {/* Preview Modal */}
      <Modal
        isOpen={showPreview}
        onClose={() => {
          setShowPreview(false);
          setEditingTemplate(null);
        }}
        title="Template Preview"
      >
        {editingTemplate && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                Title
              </p>
              <p className="p-2 bg-neutral-50 dark:bg-neutral-800 rounded dark:text-neutral-100">
                {previewTemplate(editingTemplate.titleTemplate)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                Short Description
              </p>
              <p className="p-2 bg-neutral-50 dark:bg-neutral-800 rounded text-sm dark:text-neutral-100">
                {previewTemplate(editingTemplate.shortDescTemplate)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                Long Description
              </p>
              <p className="p-2 bg-neutral-50 dark:bg-neutral-800 rounded text-sm whitespace-pre-wrap dark:text-neutral-100">
                {previewTemplate(editingTemplate.longDescTemplate)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                Bullet Format
              </p>
              <p className="p-2 bg-neutral-50 dark:bg-neutral-800 rounded text-sm dark:text-neutral-100">
                {previewTemplate(editingTemplate.bulletTemplate)}
              </p>
            </div>
            <div className="flex justify-end pt-4 border-t border-neutral-200 dark:border-neutral-700">
              <Button variant="secondary" onClick={() => setShowPreview(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default TemplateManager;
