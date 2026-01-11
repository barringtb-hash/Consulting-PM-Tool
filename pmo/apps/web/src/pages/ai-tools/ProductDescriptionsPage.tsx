/**
 * Product Description Generator Page
 *
 * Tool 1.2: AI-powered product description generation for multiple marketplaces
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useRedirectOnUnauthorized from '../../auth/useRedirectOnUnauthorized';
import { copyToClipboard } from '../../utils/clipboard';
import { buildOptions, ApiError } from '../../api/http';
import { buildApiUrl } from '../../api/config';
import { Button } from '../../ui/Button';
import { Card, CardBody, CardHeader } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { Badge } from '../../ui/Badge';
import { useToast } from '../../ui/Toast';
import { PageHeader } from '../../ui/PageHeader';
import { useClients } from '../../api/hooks/clients';
import { BulkJobPanel } from '../../components/product-descriptions/BulkJobPanel';
import {
  Plus,
  FileText,
  Sparkles,
  Package,
  RefreshCw,
  Copy,
  Check,
  Upload,
  X,
} from 'lucide-react';

// Types
interface ProductDescConfig {
  id: number;
  clientId: number;
  defaultTone: string | null;
  defaultLength: string | null;
  enableSEO: boolean;
  targetKeywords: string[];
  client?: { id: number; name: string };
  _count?: { products: number };
}

interface Product {
  id: number;
  name: string;
  sku: string | null;
  category: string | null;
  subcategory: string | null;
  attributes: Record<string, unknown> | null;
  imageUrls: string[];
  sourceDescription: string | null;
  descriptions?: ProductDescription[];
}

interface ProductDescription {
  id: number;
  productId: number;
  marketplace: string;
  title: string;
  description: string;
  bulletPoints: string[];
  keywords: string[];
  isControl: boolean;
  isPublished: boolean;
}

const MARKETPLACE_LABELS: Record<string, string> = {
  AMAZON: 'Amazon',
  EBAY: 'eBay',
  SHOPIFY: 'Shopify',
  ETSY: 'Etsy',
  WALMART: 'Walmart',
  WOOCOMMERCE: 'WooCommerce',
  CUSTOM: 'Custom',
};

// API functions
async function fetchConfigs(): Promise<ProductDescConfig[]> {
  const res = await fetch(
    buildApiUrl('/product-descriptions/configs'),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch configs') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.configs || [];
}

async function fetchProducts(configId: number): Promise<Product[]> {
  const res = await fetch(
    buildApiUrl(`/product-descriptions/${configId}/products`),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch products') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.products || [];
}

async function generateDescription(
  productId: number,
  marketplace: string,
): Promise<ProductDescription> {
  const res = await fetch(
    buildApiUrl(`/product-descriptions/products/${productId}/generate`),
    buildOptions({
      method: 'POST',
      body: JSON.stringify({ marketplace }),
    }),
  );
  if (!res.ok) {
    const error = new Error('Failed to generate description') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.description;
}

async function createConfig(
  clientId: number,
  data: Partial<ProductDescConfig>,
): Promise<ProductDescConfig> {
  const res = await fetch(
    buildApiUrl(`/clients/${clientId}/product-descriptions`),
    buildOptions({
      method: 'POST',
      body: JSON.stringify(data),
    }),
  );
  if (!res.ok) {
    const error = new Error('Failed to create config') as ApiError;
    error.status = res.status;
    throw error;
  }
  const result = await res.json();
  return result.config;
}

async function createProduct(
  configId: number,
  data: Partial<Product>,
): Promise<Product> {
  const res = await fetch(
    buildApiUrl(`/product-descriptions/${configId}/products`),
    buildOptions({
      method: 'POST',
      body: JSON.stringify(data),
    }),
  );
  if (!res.ok) {
    const error = new Error('Failed to create product') as ApiError;
    error.status = res.status;
    throw error;
  }
  const result = await res.json();
  return result.product;
}

/**
 * Loading skeleton for the products list
 * @internal Reserved for future use
 */
function _ProductsListSkeleton(): JSX.Element {
  return (
    <div className="animate-pulse space-y-0 divide-y divide-neutral-100 dark:divide-neutral-700">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-4">
          <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4 mb-2" />
          <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2 mb-1" />
          <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-1/4" />
        </div>
      ))}
    </div>
  );
}

/**
 * Empty state component with consistent styling
 */
function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: React.ReactNode;
}): JSX.Element {
  return (
    <div className="text-center py-12 px-4">
      <div className="rounded-full bg-neutral-100 dark:bg-neutral-800 p-4 w-fit mx-auto mb-4">
        <Icon className="w-8 h-8 text-neutral-400 dark:text-neutral-500" />
      </div>
      <p className="font-medium text-neutral-900 dark:text-neutral-100 mb-1">
        {title}
      </p>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function ProductDescriptionsPage(): JSX.Element {
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null,
  );
  const [showCreateConfigModal, setShowCreateConfigModal] = useState(false);
  const [showCreateProductModal, setShowCreateProductModal] = useState(false);
  const [generatingFor, setGeneratingFor] = useState<{
    productId: number;
    marketplace: string;
  } | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'products' | 'bulk'>('products');

  // Handle escape key for modals
  const handleEscapeKey = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showCreateProductModal) {
          setShowCreateProductModal(false);
        } else if (showCreateConfigModal) {
          setShowCreateConfigModal(false);
        }
      }
    },
    [showCreateConfigModal, showCreateProductModal],
  );

  useEffect(() => {
    if (showCreateConfigModal || showCreateProductModal) {
      document.addEventListener('keydown', handleEscapeKey);
      // Prevent background scrolling when modal is open
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleEscapeKey);
        document.body.style.overflow = '';
      };
    }
  }, [showCreateConfigModal, showCreateProductModal, handleEscapeKey]);

  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const clientsQuery = useClients({ includeArchived: false });
  const configsQuery = useQuery({
    queryKey: ['product-desc-configs'],
    queryFn: fetchConfigs,
  });

  const productsQuery = useQuery({
    queryKey: ['product-desc-products', selectedConfigId],
    queryFn: () => fetchProducts(selectedConfigId!),
    enabled: !!selectedConfigId,
  });

  // Redirect to login on 401 errors from any query
  useRedirectOnUnauthorized(configsQuery.error);
  useRedirectOnUnauthorized(clientsQuery.error);
  useRedirectOnUnauthorized(productsQuery.error);

  const clients = clientsQuery.data ?? [];
  const products = productsQuery.data ?? [];

  const selectedConfig = useMemo(() => {
    const configList = configsQuery.data ?? [];
    if (!selectedConfigId) return null;
    return configList.find((c) => c.id === selectedConfigId) || null;
  }, [selectedConfigId, configsQuery.data]);

  const selectedProduct = useMemo(() => {
    const productList = productsQuery.data ?? [];
    if (!selectedProductId) return null;
    return productList.find((p) => p.id === selectedProductId) || null;
  }, [selectedProductId, productsQuery.data]);

  // Mutations
  const createConfigMutation = useMutation({
    mutationFn: ({
      clientId,
      data,
    }: {
      clientId: number;
      data: Partial<ProductDescConfig>;
    }) => createConfig(clientId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-desc-configs'] });
      setShowCreateConfigModal(false);
      showToast('Configuration created successfully', 'success');
    },
    onError: (error) => {
      showToast(
        error instanceof Error ? error.message : 'Failed to create config',
        'error',
      );
    },
  });

  const createProductMutation = useMutation({
    mutationFn: ({
      configId,
      data,
    }: {
      configId: number;
      data: Partial<Product>;
    }) => createProduct(configId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['product-desc-products', selectedConfigId],
      });
      setShowCreateProductModal(false);
      showToast('Product added successfully', 'success');
    },
    onError: (error) => {
      showToast(
        error instanceof Error ? error.message : 'Failed to add product',
        'error',
      );
    },
  });

  const generateMutation = useMutation({
    mutationFn: ({
      productId,
      marketplace,
    }: {
      productId: number;
      marketplace: string;
    }) => generateDescription(productId, marketplace),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['product-desc-products', selectedConfigId],
      });
      setGeneratingFor(null);
      showToast('Description generated successfully', 'success');
    },
    onError: (error) => {
      setGeneratingFor(null);
      showToast(
        error instanceof Error
          ? error.message
          : 'Failed to generate description',
        'error',
      );
    },
  });

  // Redirect to login on 401 errors from mutations
  useRedirectOnUnauthorized(createConfigMutation.error);
  useRedirectOnUnauthorized(createProductMutation.error);
  useRedirectOnUnauthorized(generateMutation.error);

  const handleGenerate = (productId: number, marketplace: string) => {
    setGeneratingFor({ productId, marketplace });
    generateMutation.mutate({ productId, marketplace });
  };

  const handleCopy = async (text: string, descId: number) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedId(descId);
      setTimeout(() => setCopiedId(null), 2000);
    } else {
      showToast('Failed to copy to clipboard', 'error');
    }
  };

  const handleCreateConfig = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    // Parse target keywords from comma-separated string
    const keywordsRaw = formData.get('targetKeywords') as string;
    const targetKeywords = keywordsRaw
      ? keywordsRaw
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean)
      : [];

    // Build brand voice profile from form data
    const targetAudience = formData.get('targetAudience') as string;
    const brandVoiceProfile = targetAudience
      ? { targetAudience, toneMarkers: [], prohibitedWords: [] }
      : undefined;

    createConfigMutation.mutate({
      clientId: Number(formData.get('clientId')),
      data: {
        defaultTone: (formData.get('defaultTone') as string) || undefined,
        defaultLength:
          (formData.get('defaultLength') as 'short' | 'medium' | 'long') ||
          undefined,
        enableSEO: formData.get('enableSEO') === 'on',
        targetKeywords: targetKeywords.length > 0 ? targetKeywords : undefined,
        brandVoiceProfile,
      },
    });
  };

  const handleCreateProduct = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const brand = (formData.get('brand') as string) || undefined;
    const featuresRaw = formData.get('features') as string;
    const features = featuresRaw
      ? featuresRaw
          .split('\n')
          .map((f) => f.trim())
          .filter(Boolean)
      : [];

    createProductMutation.mutate({
      configId: selectedConfigId!,
      data: {
        name: formData.get('name') as string,
        sku: (formData.get('sku') as string) || undefined,
        category: (formData.get('category') as string) || undefined,
        sourceDescription:
          (formData.get('sourceDescription') as string) || undefined,
        attributes:
          brand || features.length > 0 ? { brand, features } : undefined,
      },
    });
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <PageHeader
        title="Product Descriptions"
        description="Generate AI-powered product descriptions for multiple marketplaces"
        icon={Package}
        actions={
          <Button onClick={() => setShowCreateConfigModal(true)}>
            <Plus className="w-4 h-4 mr-1" />
            New Profile
          </Button>
        }
      />

      <main className="page-content space-y-6">
        {/* Configuration Selector */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="flex-1">
              <Select
                label="Brand Profile"
                value={selectedConfigId?.toString() || ''}
                onChange={(e) => {
                  setSelectedConfigId(
                    e.target.value ? Number(e.target.value) : null,
                  );
                  setSelectedProductId(null);
                }}
              >
                <option value="">Select a brand profile...</option>
                {configsQuery.data?.map((config) => (
                  <option key={config.id} value={config.id}>
                    {config.client?.name || `Profile #${config.id}`}
                    {config._count?.products
                      ? ` (${config._count.products} products)`
                      : ''}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                variant="secondary"
                onClick={() => configsQuery.refetch()}
                disabled={configsQuery.isFetching}
                title="Refresh"
              >
                <RefreshCw
                  className={`w-4 h-4 ${configsQuery.isFetching ? 'animate-spin' : ''}`}
                />
              </Button>
              {selectedConfigId && (
                <Button onClick={() => setShowCreateProductModal(true)}>
                  <Plus className="w-4 h-4" />
                  Add Product
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Main Content */}
        {!selectedConfig ? (
          <Card className="p-6">
            <EmptyState
              icon={FileText}
              title="No brand profile selected"
              description="Select a brand profile from the dropdown above to view and manage products, or create a new profile to get started."
              action={
                <Button
                  variant="secondary"
                  onClick={() => setShowCreateConfigModal(true)}
                >
                  <Plus className="w-4 h-4" />
                  Create Profile
                </Button>
              }
            />
          </Card>
        ) : (
          <>
            {/* Tab Navigation */}
            <div className="flex border-b border-neutral-200 dark:border-neutral-700">
              <button
                className={`flex items-center gap-2 px-5 py-3 font-medium text-sm border-b-2 -mb-px transition-all ${
                  activeTab === 'products'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400 bg-primary-50/50 dark:bg-primary-900/20'
                    : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                }`}
                onClick={() => setActiveTab('products')}
              >
                <Package className="w-4 h-4" />
                Products
              </button>
              <button
                className={`flex items-center gap-2 px-5 py-3 font-medium text-sm border-b-2 -mb-px transition-all ${
                  activeTab === 'bulk'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400 bg-primary-50/50 dark:bg-primary-900/20'
                    : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                }`}
                onClick={() => setActiveTab('bulk')}
              >
                <Upload className="w-4 h-4" />
                Bulk Operations
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'bulk' ? (
              <BulkJobPanel
                configId={selectedConfigId}
                onJobComplete={() => {
                  queryClient.invalidateQueries({
                    queryKey: ['product-desc-products', selectedConfigId],
                  });
                }}
              />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                {/* Products List */}
                <div className="lg:col-span-1">
                  <Card className="h-full min-h-[400px] flex flex-col">
                    <CardHeader>
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Package className="w-5 h-5" />
                        Products ({products.length})
                      </h3>
                    </CardHeader>
                    <CardBody className="p-0 flex-1 flex flex-col">
                      {productsQuery.isLoading ? (
                        <div className="p-6 text-center flex-1 flex flex-col items-center justify-center">
                          <RefreshCw className="w-5 h-5 text-neutral-400 animate-spin mx-auto mb-2" />
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            Loading products...
                          </p>
                        </div>
                      ) : products.length === 0 ? (
                        <div className="p-6 text-center flex-1 flex flex-col items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-3">
                            <Package className="w-6 h-6 text-neutral-400 dark:text-neutral-500" />
                          </div>
                          <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-1">
                            No products yet
                          </p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
                            Add products to start generating descriptions
                          </p>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setShowCreateProductModal(true)}
                          >
                            <Plus className="w-3 h-3" />
                            Add Product
                          </Button>
                        </div>
                      ) : (
                        <div className="divide-y divide-neutral-100 dark:divide-neutral-700">
                          {products.map((product) => (
                            <button
                              key={product.id}
                              onClick={() => setSelectedProductId(product.id)}
                              className={`w-full text-left p-4 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors ${
                                selectedProductId === product.id
                                  ? 'bg-primary-50 dark:bg-primary-900/30'
                                  : ''
                              }`}
                            >
                              <p className="font-medium truncate text-neutral-900 dark:text-neutral-100">
                                {product.name}
                              </p>
                              {product.sku && (
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                  SKU: {product.sku}
                                </p>
                              )}
                              <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                                {product.descriptions?.length || 0} descriptions
                              </p>
                            </button>
                          ))}
                        </div>
                      )}
                    </CardBody>
                  </Card>
                </div>

                {/* Product Details & Descriptions */}
                <div className="lg:col-span-2">
                  {!selectedProduct ? (
                    <Card className="h-full min-h-[400px] flex items-center justify-center">
                      <CardBody>
                        <div className="text-center py-12">
                          <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-4">
                            <Package className="w-8 h-8 text-neutral-400 dark:text-neutral-500" />
                          </div>
                          <p className="font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                            Select a product to view descriptions
                          </p>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto">
                            Choose a product from the list to view, generate, or
                            edit its marketplace descriptions
                          </p>
                        </div>
                      </CardBody>
                    </Card>
                  ) : (
                    <>
                      {/* Product Info */}
                      <Card>
                        <CardHeader>
                          <h3 className="text-lg font-semibold">
                            {selectedProduct.name}
                          </h3>
                        </CardHeader>
                        <CardBody>
                          <dl className="grid grid-cols-2 gap-4 text-sm">
                            {selectedProduct.sku && (
                              <div>
                                <dt className="text-neutral-500">SKU</dt>
                                <dd className="font-medium">
                                  {selectedProduct.sku}
                                </dd>
                              </div>
                            )}
                            {selectedProduct.category && (
                              <div>
                                <dt className="text-neutral-500">Category</dt>
                                <dd className="font-medium">
                                  {selectedProduct.category}
                                </dd>
                              </div>
                            )}
                            {(selectedProduct.attributes as { brand?: string })
                              ?.brand && (
                              <div>
                                <dt className="text-neutral-500">Brand</dt>
                                <dd className="font-medium">
                                  {
                                    (
                                      selectedProduct.attributes as {
                                        brand?: string;
                                      }
                                    ).brand
                                  }
                                </dd>
                              </div>
                            )}
                          </dl>
                          {selectedProduct.attributes &&
                            (
                              selectedProduct.attributes as {
                                features?: string[];
                              }
                            ).features &&
                            (
                              selectedProduct.attributes as {
                                features?: string[];
                              }
                            ).features!.length > 0 && (
                              <div className="mt-4">
                                <p className="text-sm text-neutral-500 mb-2">
                                  Features
                                </p>
                                <ul className="list-disc list-inside text-sm space-y-1">
                                  {(
                                    selectedProduct.attributes as {
                                      features?: string[];
                                    }
                                  ).features!.map((feature, idx) => (
                                    <li key={idx}>{feature}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                        </CardBody>
                      </Card>

                      {/* Generate New Description */}
                      <Card>
                        <CardHeader>
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Sparkles className="w-5 h-5" />
                            Generate Description
                          </h3>
                        </CardHeader>
                        <CardBody>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(MARKETPLACE_LABELS).map(
                              ([key, label]) => (
                                <Button
                                  key={key}
                                  variant="secondary"
                                  size="sm"
                                  onClick={() =>
                                    handleGenerate(selectedProduct.id, key)
                                  }
                                  disabled={
                                    generatingFor?.productId ===
                                      selectedProduct.id &&
                                    generatingFor?.marketplace === key
                                  }
                                >
                                  {generatingFor?.productId ===
                                    selectedProduct.id &&
                                  generatingFor?.marketplace === key ? (
                                    <>
                                      <RefreshCw className="w-4 h-4 animate-spin" />
                                      Generating...
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles className="w-4 h-4" />
                                      {label}
                                    </>
                                  )}
                                </Button>
                              ),
                            )}
                          </div>
                        </CardBody>
                      </Card>

                      {/* Existing Descriptions */}
                      <Card>
                        <CardHeader>
                          <h3 className="text-lg font-semibold">
                            Generated Descriptions
                          </h3>
                        </CardHeader>
                        <CardBody>
                          {(selectedProduct.descriptions?.length ?? 0) === 0 ? (
                            <p className="text-neutral-500 text-center py-4">
                              No descriptions generated yet. Click a marketplace
                              button above to generate.
                            </p>
                          ) : (
                            <div className="space-y-4">
                              {selectedProduct.descriptions?.map((desc) => (
                                <div
                                  key={desc.id}
                                  className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4"
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <Badge variant="primary">
                                      {MARKETPLACE_LABELS[desc.marketplace] ||
                                        desc.marketplace}
                                    </Badge>
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() =>
                                          handleCopy(
                                            `${desc.title}\n\n${desc.description}`,
                                            desc.id,
                                          )
                                        }
                                      >
                                        {copiedId === desc.id ? (
                                          <Check className="w-4 h-4 text-green-500" />
                                        ) : (
                                          <Copy className="w-4 h-4" />
                                        )}
                                      </Button>
                                    </div>
                                  </div>
                                  <h4 className="font-semibold mb-2">
                                    {desc.title}
                                  </h4>
                                  <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                                    {desc.description}
                                  </p>
                                  {desc.bulletPoints.length > 0 && (
                                    <ul className="mt-3 list-disc list-inside text-sm space-y-1">
                                      {desc.bulletPoints.map((point, idx) => (
                                        <li key={idx}>{point}</li>
                                      ))}
                                    </ul>
                                  )}
                                  {desc.keywords.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-1">
                                      {desc.keywords.map((keyword, idx) => (
                                        <span
                                          key={idx}
                                          className="px-2 py-0.5 text-xs bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded"
                                        >
                                          {keyword}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </CardBody>
                      </Card>
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Create Config Modal */}
      {showCreateConfigModal && (
        <div
          className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-config-modal-title"
        >
          <Card className="w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700 shrink-0">
              <h2
                id="create-config-modal-title"
                className="text-lg font-semibold text-neutral-900 dark:text-white"
              >
                New Brand Profile
              </h2>
              <button
                onClick={() => setShowCreateConfigModal(false)}
                className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 text-neutral-500" />
              </button>
            </div>
            <form
              onSubmit={handleCreateConfig}
              className="flex flex-col flex-1 overflow-hidden"
            >
              <div className="p-4 space-y-5 overflow-y-auto flex-1">
                {/* Client Selection */}
                <Select label="Client" name="clientId" required>
                  <option value="">Select a client...</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </Select>

                {/* Brand Voice Section */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Brand Voice
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Select label="Tone" name="defaultTone">
                      <option value="">Select tone...</option>
                      <option value="professional">Professional</option>
                      <option value="casual">Casual</option>
                      <option value="enthusiastic">Enthusiastic</option>
                      <option value="luxury">Luxury</option>
                      <option value="playful">Playful</option>
                      <option value="technical">Technical</option>
                    </Select>
                    <Select label="Length" name="defaultLength">
                      <option value="">Select length...</option>
                      <option value="short">Short (50-100 words)</option>
                      <option value="medium">Medium (100-200 words)</option>
                      <option value="long">Long (200+ words)</option>
                    </Select>
                  </div>
                  <Input
                    label="Target Audience"
                    name="targetAudience"
                    placeholder="e.g., Tech-savvy millennials, Budget-conscious parents"
                  />
                </div>

                {/* SEO Settings */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      SEO Optimization
                    </h3>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        name="enableSEO"
                        defaultChecked
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-neutral-600 peer-checked:bg-primary-500"></div>
                    </label>
                  </div>
                  <Input
                    label="Target Keywords"
                    name="targetKeywords"
                    placeholder="keyword1, keyword2, keyword3"
                  />
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Separate keywords with commas
                  </p>
                </div>

                {/* Language & Compliance */}
                <div className="grid grid-cols-2 gap-3">
                  <Select label="Language" name="defaultLanguage">
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="it">Italian</option>
                    <option value="pt">Portuguese</option>
                    <option value="zh">Chinese</option>
                    <option value="ja">Japanese</option>
                  </Select>
                  <Select label="Compliance" name="complianceMode">
                    <option value="NONE">None</option>
                    <option value="FTC">FTC Guidelines</option>
                    <option value="FDA">FDA Compliant</option>
                    <option value="CUSTOM">Custom Rules</option>
                  </Select>
                </div>
              </div>
              <div className="flex gap-3 justify-end p-4 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 shrink-0">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowCreateConfigModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createConfigMutation.isPending}>
                  {createConfigMutation.isPending
                    ? 'Creating...'
                    : 'Create Profile'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Create Product Modal */}
      {showCreateProductModal && (
        <div
          className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-product-modal-title"
        >
          <Card className="w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700 shrink-0">
              <h2
                id="create-product-modal-title"
                className="text-lg font-semibold text-neutral-900 dark:text-white"
              >
                Add Product
              </h2>
              <button
                onClick={() => setShowCreateProductModal(false)}
                className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 text-neutral-500" />
              </button>
            </div>
            <form
              onSubmit={handleCreateProduct}
              className="flex flex-col flex-1 overflow-hidden"
            >
              <div className="p-4 space-y-4 overflow-y-auto flex-1">
                <Input
                  label="Product Name"
                  name="name"
                  required
                  placeholder="e.g., Wireless Headphones"
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="SKU" name="sku" placeholder="Optional" />
                  <Input label="Brand" name="brand" placeholder="Optional" />
                </div>
                <Input
                  label="Category"
                  name="category"
                  placeholder="e.g., Electronics > Audio"
                />
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Source Description
                  </label>
                  <textarea
                    name="sourceDescription"
                    rows={3}
                    className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 px-3 py-2 text-sm bg-white dark:bg-neutral-900/50 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Original product description..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Features (one per line)
                  </label>
                  <textarea
                    name="features"
                    rows={4}
                    className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 px-3 py-2 text-sm bg-white dark:bg-neutral-900/50 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Noise cancellation&#10;40-hour battery life&#10;Bluetooth 5.0"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end p-4 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 shrink-0">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowCreateProductModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createProductMutation.isPending}
                >
                  {createProductMutation.isPending
                    ? 'Adding...'
                    : 'Add Product'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}

export default ProductDescriptionsPage;
