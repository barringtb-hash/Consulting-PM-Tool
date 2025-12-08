/**
 * Product Description Generator Page
 *
 * Tool 1.2: AI-powered product description generation for multiple marketplaces
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useRedirectOnUnauthorized from '../../auth/useRedirectOnUnauthorized';
import { buildOptions, ApiError } from '../../api/http';
import { buildApiUrl } from '../../api/config';
import { PageHeader } from '../../ui/PageHeader';
import { Button } from '../../ui/Button';
import { Card, CardBody, CardHeader } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { Badge } from '../../ui/Badge';
import { useToast } from '../../ui/Toast';
import { useClients } from '../../api/queries';
import {
  Plus,
  FileText,
  Sparkles,
  Package,
  RefreshCw,
  Copy,
  Check,
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
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <PageHeader
        title="Product Descriptions"
        description="Generate AI-powered product descriptions for multiple marketplaces"
        actions={
          <Button onClick={() => setShowCreateConfigModal(true)}>
            <Plus className="w-4 h-4" />
            New Configuration
          </Button>
        }
      />

      <div className="container-padding py-6 space-y-6">
        {/* Filters */}
        <Card>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                label="Client"
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
              >
                <option value="">All Clients</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
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
              <div className="flex items-end gap-2">
                <Button
                  variant="secondary"
                  onClick={() => configsQuery.refetch()}
                  disabled={configsQuery.isFetching}
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
          </CardBody>
        </Card>

        {/* Main Content */}
        {!selectedConfig ? (
          <Card>
            <CardBody>
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                <p className="text-neutral-600">
                  Select a configuration to view and manage products, or create
                  a new one.
                </p>
              </div>
            </CardBody>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Products List */}
            <div className="lg:col-span-1 space-y-4">
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Products ({products.length})
                  </h3>
                </CardHeader>
                <CardBody className="p-0">
                  {productsQuery.isLoading ? (
                    <p className="p-4 text-center text-neutral-500">
                      Loading...
                    </p>
                  ) : products.length === 0 ? (
                    <p className="p-4 text-center text-neutral-500">
                      No products yet.
                    </p>
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
            <div className="lg:col-span-2 space-y-4">
              {!selectedProduct ? (
                <Card>
                  <CardBody>
                    <div className="text-center py-8">
                      <Package className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                      <p className="text-neutral-600">
                        Select a product to view descriptions.
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
                        {(
                          selectedProduct.attributes as { brand?: string }
                        )?.brand && (
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
                        (selectedProduct.attributes as { features?: string[] })
                          .features &&
                        (selectedProduct.attributes as { features?: string[] })
                          .features!.length > 0 && (
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
      </div>

      {/* Create Config Modal */}
      {showCreateConfigModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <h2 className="text-xl font-semibold">New Configuration</h2>
            </CardHeader>
            <CardBody>
              <form onSubmit={handleCreateConfig} className="space-y-4">
                <Select label="Client" name="clientId" required>
                  <option value="">Select a client...</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
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
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowCreateConfigModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createConfigMutation.isPending}
                  >
                    {createConfigMutation.isPending ? 'Creating...' : 'Create'}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Create Product Modal */}
      {showCreateProductModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg mx-4">
            <CardHeader>
              <h2 className="text-xl font-semibold">Add Product</h2>
            </CardHeader>
            <CardBody>
              <form onSubmit={handleCreateProduct} className="space-y-4">
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
                <div className="flex gap-2 justify-end">
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
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}

export default ProductDescriptionsPage;
