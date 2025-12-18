/**
 * Product Description Generator Page
 *
 * Tool 1.2: AI-powered product description generation for multiple marketplaces
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useRedirectOnUnauthorized from '../../auth/useRedirectOnUnauthorized';
import { buildOptions, ApiError } from '../../api/http';
import { buildApiUrl } from '../../api/config';
import { Button } from '../../ui/Button';
import { Card, CardBody, CardHeader } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { Badge } from '../../ui/Badge';
import { useToast } from '../../ui/Toast';
import { useAccounts } from '../../api/hooks/crm';
import {
  Plus,
  FileText,
  Sparkles,
  Package,
  RefreshCw,
  Copy,
  Check,
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
 */
function ProductsListSkeleton(): JSX.Element {
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
  const [selectedClientId, setSelectedClientId] = useState<string>('');
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
  const accountsQuery = useAccounts({ archived: false });
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
  useRedirectOnUnauthorized(accountsQuery.error);
  useRedirectOnUnauthorized(productsQuery.error);

  const accounts = accountsQuery.data?.data ?? [];
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

  const filteredConfigs = useMemo(() => {
    const configList = configsQuery.data ?? [];
    if (!selectedClientId) return configList;
    return configList.filter((c) => c.clientId === Number(selectedClientId));
  }, [configsQuery.data, selectedClientId]);

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
    await navigator.clipboard.writeText(text);
    setCopiedId(descId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateConfig = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createConfigMutation.mutate({
      clientId: Number(formData.get('clientId')),
      data: {
        defaultTone: (formData.get('defaultTone') as string) || undefined,
        defaultLength:
          (formData.get('defaultLength') as 'short' | 'medium' | 'long') ||
          undefined,
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
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Product Descriptions
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            Generate AI-powered product descriptions for multiple marketplaces
          </p>
        </div>
        <Button onClick={() => setShowCreateConfigModal(true)}>
          <Plus className="w-4 h-4" />
          New Configuration
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Client"
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
            >
              <option value="">All Clients</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </Select>
            <Select
              label="Configuration"
              value={selectedConfigId?.toString() || ''}
              onChange={(e) => {
                setSelectedConfigId(
                  e.target.value ? Number(e.target.value) : null,
                );
                setSelectedProductId(null);
              }}
            >
              <option value="">Select a configuration...</option>
              {filteredConfigs.map((config) => (
                <option key={config.id} value={config.id}>
                  {config.client?.name || `Config #${config.id}`}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              variant="secondary"
              onClick={() => configsQuery.refetch()}
              disabled={configsQuery.isFetching}
              title="Refresh configurations"
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
            title="No configuration selected"
            description="Select a configuration from the dropdown above to view and manage products, or create a new configuration to get started."
            action={
              <Button
                variant="secondary"
                onClick={() => setShowCreateConfigModal(true)}
              >
                <Plus className="w-4 h-4" />
                Create Configuration
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Products List */}
          <div className="lg:col-span-1">
            <Card className="h-full">
              <CardHeader>
                <h3 className="text-lg font-semibold flex items-center gap-2 text-neutral-900 dark:text-white">
                  <Package className="w-5 h-5" />
                  Products ({products.length})
                </h3>
              </CardHeader>
              <CardBody className="p-0">
                {productsQuery.isLoading ? (
                  <ProductsListSkeleton />
                ) : products.length === 0 ? (
                  <EmptyState
                    icon={Package}
                    title="No products yet"
                    description="Add your first product to start generating AI-powered descriptions."
                    action={
                      <Button
                        size="sm"
                        onClick={() => setShowCreateProductModal(true)}
                      >
                        <Plus className="w-4 h-4" />
                        Add Product
                      </Button>
                    }
                  />
                ) : (
                  <div className="divide-y divide-neutral-100 dark:divide-neutral-700 max-h-[500px] overflow-y-auto">
                    {products.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => setSelectedProductId(product.id)}
                        className={`w-full text-left p-4 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors ${
                          selectedProductId === product.id
                            ? 'bg-primary-50 dark:bg-primary-900/30 border-l-2 border-primary-500'
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
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {product.descriptions?.length || 0} descriptions
                          </Badge>
                          {product.category && (
                            <span className="text-xs text-neutral-400 dark:text-neutral-500 truncate">
                              {product.category}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          {/* Product Details & Descriptions */}
          <div className="lg:col-span-2 space-y-4">
            {!selectedProduct ? (
              <Card className="h-full min-h-[400px]">
                <CardBody className="h-full flex items-center justify-center">
                  <EmptyState
                    icon={Package}
                    title="Select a product"
                    description="Choose a product from the list to view and generate marketplace descriptions."
                  />
                </CardBody>
              </Card>
            ) : (
              <>
                {/* Product Info */}
                {(() => {
                  // Extract typed attributes to reduce duplication
                  const productBrand = (
                    selectedProduct.attributes as { brand?: string } | null
                  )?.brand;
                  const productFeatures = (
                    selectedProduct.attributes as { features?: string[] } | null
                  )?.features;

                  return (
                    <Card className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                            {selectedProduct.name}
                          </h3>
                          {selectedProduct.category && (
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">
                              {selectedProduct.category}
                            </p>
                          )}
                        </div>
                        {selectedProduct.sku && (
                          <Badge variant="secondary">
                            SKU: {selectedProduct.sku}
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                        {productBrand && (
                          <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800">
                            <dt className="text-neutral-500 dark:text-neutral-400 text-xs uppercase tracking-wide">
                              Brand
                            </dt>
                            <dd className="font-medium text-neutral-900 dark:text-white mt-1">
                              {productBrand}
                            </dd>
                          </div>
                        )}
                        <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800">
                          <dt className="text-neutral-500 dark:text-neutral-400 text-xs uppercase tracking-wide">
                            Descriptions
                          </dt>
                          <dd className="font-medium text-neutral-900 dark:text-white mt-1">
                            {selectedProduct.descriptions?.length || 0}{' '}
                            generated
                          </dd>
                        </div>
                      </div>
                      {productFeatures && productFeatures.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                            Features
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {productFeatures.map((feature, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 text-sm bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded"
                              >
                                {feature}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })()}

                {/* Generate New Description */}
                <Card className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30">
                      <Sparkles className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-neutral-900 dark:text-white">
                        Generate Description
                      </h3>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        Select a marketplace to generate an optimized
                        description
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {Object.entries(MARKETPLACE_LABELS).map(([key, label]) => (
                      <Button
                        key={key}
                        variant="secondary"
                        size="sm"
                        className="justify-center"
                        onClick={() => handleGenerate(selectedProduct.id, key)}
                        disabled={
                          generatingFor?.productId === selectedProduct.id &&
                          generatingFor?.marketplace === key
                        }
                      >
                        {generatingFor?.productId === selectedProduct.id &&
                        generatingFor?.marketplace === key ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          label
                        )}
                      </Button>
                    ))}
                  </div>
                </Card>

                {/* Existing Descriptions */}
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Generated Descriptions
                    </h3>
                    {(selectedProduct.descriptions?.length ?? 0) > 0 && (
                      <span className="text-sm text-neutral-500 dark:text-neutral-400">
                        {selectedProduct.descriptions?.length} description
                        {selectedProduct.descriptions?.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  {(selectedProduct.descriptions?.length ?? 0) === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-lg">
                      <FileText className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
                      <p className="text-neutral-600 dark:text-neutral-400 font-medium">
                        No descriptions generated yet
                      </p>
                      <p className="text-sm text-neutral-500 dark:text-neutral-500 mt-1">
                        Click a marketplace button above to generate your first
                        description
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {selectedProduct.descriptions?.map((desc) => (
                        <div
                          key={desc.id}
                          className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <Badge variant="primary">
                              {MARKETPLACE_LABELS[desc.marketplace] ||
                                desc.marketplace}
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                handleCopy(
                                  `${desc.title}\n\n${desc.description}`,
                                  desc.id,
                                )
                              }
                              title="Copy to clipboard"
                            >
                              {copiedId === desc.id ? (
                                <>
                                  <Check className="w-4 h-4 text-success-500" />
                                  <span className="text-success-500">
                                    Copied!
                                  </span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-4 h-4" />
                                  Copy
                                </>
                              )}
                            </Button>
                          </div>
                          <h4 className="font-semibold text-neutral-900 dark:text-white mb-2">
                            {desc.title}
                          </h4>
                          <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed">
                            {desc.description}
                          </p>
                          {desc.bulletPoints.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-700">
                              <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-2">
                                Key Points
                              </p>
                              <ul className="space-y-1.5">
                                {desc.bulletPoints.map((point, idx) => (
                                  <li
                                    key={idx}
                                    className="flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300"
                                  >
                                    <span className="text-primary-500 mt-1">
                                      •
                                    </span>
                                    {point}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {desc.keywords.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-700">
                              <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-2">
                                SEO Keywords
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {desc.keywords.map((keyword, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-1 text-xs bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-full"
                                  >
                                    {keyword}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </>
            )}
          </div>
        </div>
      )}

      {/* Create Config Modal */}
      {showCreateConfigModal && (
        <div
          className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-config-modal-title"
        >
          <Card className="w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
              <h2
                id="create-config-modal-title"
                className="text-lg font-semibold text-neutral-900 dark:text-white"
              >
                New Configuration
              </h2>
              <button
                onClick={() => setShowCreateConfigModal(false)}
                className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 text-neutral-500" />
              </button>
            </div>
            <form onSubmit={handleCreateConfig}>
              <div className="p-4 space-y-4">
                <Select label="Client" name="clientId" required>
                  <option value="">Select a client...</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </Select>
                <Select label="Default Tone" name="defaultTone">
                  <option value="">Select a tone...</option>
                  <option value="professional">Professional</option>
                  <option value="casual">Casual</option>
                  <option value="enthusiastic">Enthusiastic</option>
                  <option value="luxury">Luxury</option>
                </Select>
                <Select label="Default Length" name="defaultLength">
                  <option value="">Select a length...</option>
                  <option value="short">Short</option>
                  <option value="medium">Medium</option>
                  <option value="long">Long</option>
                </Select>
              </div>
              <div className="flex gap-3 justify-end p-4 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 rounded-b-lg">
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
                    : 'Create Configuration'}
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
