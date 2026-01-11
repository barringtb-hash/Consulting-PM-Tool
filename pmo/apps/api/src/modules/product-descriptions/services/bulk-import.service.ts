/**
 * Bulk Import/Export Service
 *
 * Handles CSV import and export for product descriptions.
 * Supports catalog-scale operations with validation and error reporting.
 */

import { prisma } from '../../../prisma/client';
import {
  Marketplace,
  GenerationJobStatus as _GenerationJobStatus,
} from '@prisma/client';

// Re-export for potential future use
export { _GenerationJobStatus as GenerationJobStatus };

// ============================================================================
// TYPES
// ============================================================================

export interface CSVProduct {
  name: string;
  sku?: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  // Features and benefits
  feature_1?: string;
  feature_2?: string;
  feature_3?: string;
  feature_4?: string;
  feature_5?: string;
  benefit_1?: string;
  benefit_2?: string;
  benefit_3?: string;
  // Additional attributes as key-value pairs
  [key: string]: string | undefined;
}

export interface CSVValidationResult {
  valid: boolean;
  errors: Array<{
    row: number;
    column: string;
    message: string;
  }>;
  warnings: Array<{
    row: number;
    column: string;
    message: string;
  }>;
  products: CSVProduct[];
  totalRows: number;
  validRows: number;
}

export interface ExportOptions {
  marketplace?: Marketplace;
  includeMetrics?: boolean;
  includeSEO?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface ExportResult {
  csv: string;
  totalProducts: number;
  totalDescriptions: number;
}

// ============================================================================
// CSV PARSING
// ============================================================================

/**
 * Parse CSV content into structured data
 */
export function parseCSV(csvContent: string): CSVProduct[] {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header row and one data row');
  }

  // Parse header
  const headers = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase());

  // Validate required columns
  if (!headers.includes('name')) {
    throw new Error('CSV must contain a "name" column');
  }

  // Parse data rows
  const products: CSVProduct[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0 || (values.length === 1 && values[0] === '')) {
      continue; // Skip empty rows
    }

    const product: CSVProduct = { name: '' };
    headers.forEach((header, index) => {
      const value = values[index]?.trim();
      if (value) {
        product[header] = value;
      }
    });

    if (product.name) {
      products.push(product);
    }
  }

  return products;
}

/**
 * Parse a single CSV line, handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }
  result.push(current);

  return result;
}

// ============================================================================
// CSV VALIDATION
// ============================================================================

/**
 * Validate CSV content and return structured results
 */
export function validateCSV(csvContent: string): CSVValidationResult {
  const errors: CSVValidationResult['errors'] = [];
  const warnings: CSVValidationResult['warnings'] = [];
  const validProducts: CSVProduct[] = [];

  let products: CSVProduct[];
  try {
    products = parseCSV(csvContent);
  } catch (error) {
    return {
      valid: false,
      errors: [{ row: 0, column: 'header', message: (error as Error).message }],
      warnings: [],
      products: [],
      totalRows: 0,
      validRows: 0,
    };
  }

  products.forEach((product, index) => {
    const rowNum = index + 2; // +2 because of 0-index and header row
    let isValid = true;

    // Required field validation
    if (!product.name || product.name.trim().length === 0) {
      errors.push({
        row: rowNum,
        column: 'name',
        message: 'Product name is required',
      });
      isValid = false;
    }

    // Name length validation
    if (product.name && product.name.length > 200) {
      errors.push({
        row: rowNum,
        column: 'name',
        message: 'Product name must be 200 characters or less',
      });
      isValid = false;
    }

    // SKU format validation
    if (product.sku && !/^[A-Za-z0-9-_]+$/.test(product.sku)) {
      warnings.push({
        row: rowNum,
        column: 'sku',
        message:
          'SKU contains special characters; consider using only alphanumeric characters',
      });
    }

    // Category validation
    if (product.category && product.category.length > 100) {
      errors.push({
        row: rowNum,
        column: 'category',
        message: 'Category must be 100 characters or less',
      });
      isValid = false;
    }

    // Feature/benefit warnings for empty values
    const features = [
      product.feature_1,
      product.feature_2,
      product.feature_3,
    ].filter(Boolean);
    if (features.length === 0) {
      warnings.push({
        row: rowNum,
        column: 'feature_1',
        message: 'No features provided; description quality may be limited',
      });
    }

    if (isValid) {
      validProducts.push(product);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    products: validProducts,
    totalRows: products.length,
    validRows: validProducts.length,
  };
}

// ============================================================================
// CSV IMPORT
// ============================================================================

/**
 * Import products from CSV content
 */
export async function importProductsFromCSV(
  configId: number,
  csvContent: string,
  options: {
    skipDuplicates?: boolean;
    updateExisting?: boolean;
  } = {},
): Promise<{
  imported: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
}> {
  const { skipDuplicates = true, updateExisting = false } = options;

  const validation = validateCSV(csvContent);
  if (!validation.valid) {
    throw new Error(
      `CSV validation failed: ${validation.errors.map((e) => `Row ${e.row}: ${e.message}`).join('; ')}`,
    );
  }

  const results = {
    imported: 0,
    updated: 0,
    skipped: 0,
    errors: [] as Array<{ row: number; message: string }>,
  };

  for (let i = 0; i < validation.products.length; i++) {
    const csvProduct = validation.products[i];
    const rowNum = i + 2; // Account for header and 0-index

    try {
      // Check for existing product by SKU
      let existingProduct = null;
      if (csvProduct.sku) {
        existingProduct = await prisma.product.findFirst({
          where: {
            configId,
            sku: csvProduct.sku,
            isActive: true,
          },
        });
      }

      // Build attributes from CSV columns
      const attributes: Record<string, string> = {};
      Object.entries(csvProduct).forEach(([key, value]) => {
        if (
          value &&
          !['name', 'sku', 'category', 'subcategory'].includes(key)
        ) {
          attributes[key] = value;
        }
      });

      if (existingProduct) {
        if (updateExisting) {
          await prisma.product.update({
            where: { id: existingProduct.id },
            data: {
              name: csvProduct.name,
              category: csvProduct.category,
              subcategory: csvProduct.subcategory,
              attributes,
            },
          });
          results.updated++;
        } else if (skipDuplicates) {
          results.skipped++;
        }
      } else {
        await prisma.product.create({
          data: {
            configId,
            name: csvProduct.name,
            sku: csvProduct.sku,
            category: csvProduct.category,
            subcategory: csvProduct.subcategory,
            attributes,
          },
        });
        results.imported++;
      }
    } catch (error) {
      results.errors.push({
        row: rowNum,
        message: (error as Error).message,
      });
    }
  }

  return results;
}

// ============================================================================
// CSV EXPORT
// ============================================================================

/**
 * Export products and descriptions to CSV
 */
export async function exportProductsToCSV(
  configId: number,
  options: ExportOptions = {},
): Promise<ExportResult> {
  const { marketplace, includeMetrics = true, includeSEO = true } = options;

  const products = await prisma.product.findMany({
    where: {
      configId,
      isActive: true,
    },
    include: {
      descriptions: {
        where: marketplace ? { marketplace } : undefined,
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  // Build CSV headers
  const headers = [
    'product_name',
    'sku',
    'category',
    'subcategory',
    'marketplace',
    'title',
    'short_description',
    'long_description',
    'bullet_points',
    'keywords',
  ];

  if (includeSEO) {
    headers.push('meta_title', 'meta_description', 'seo_score');
  }

  if (includeMetrics) {
    headers.push(
      'impressions',
      'clicks',
      'conversions',
      'ctr',
      'conversion_rate',
    );
  }

  headers.push('variant', 'is_control', 'is_published', 'created_at');

  // Build CSV rows
  const rows: string[][] = [];
  let totalDescriptions = 0;

  for (const product of products) {
    const _attrs = (product.attributes || {}) as Record<string, string>;

    if (product.descriptions.length === 0) {
      // Product without descriptions
      rows.push([
        escapeCSVField(product.name),
        escapeCSVField(product.sku || ''),
        escapeCSVField(product.category || ''),
        escapeCSVField(product.subcategory || ''),
        '', // marketplace
        '', // title
        '', // short_description
        '', // long_description
        '', // bullet_points
        '', // keywords
        ...(includeSEO ? ['', '', ''] : []),
        ...(includeMetrics ? ['', '', '', '', ''] : []),
        '', // variant
        '', // is_control
        '', // is_published
        '', // created_at
      ]);
    } else {
      for (const desc of product.descriptions) {
        totalDescriptions++;
        const ctr =
          desc.impressions > 0
            ? ((desc.clicks / desc.impressions) * 100).toFixed(2)
            : '0';
        const convRate =
          desc.clicks > 0
            ? ((desc.conversions / desc.clicks) * 100).toFixed(2)
            : '0';

        const row = [
          escapeCSVField(product.name),
          escapeCSVField(product.sku || ''),
          escapeCSVField(product.category || ''),
          escapeCSVField(product.subcategory || ''),
          desc.marketplace,
          escapeCSVField(desc.title || ''),
          escapeCSVField(desc.shortDescription || ''),
          escapeCSVField(desc.longDescription || ''),
          escapeCSVField(desc.bulletPoints.join(' | ')),
          escapeCSVField(desc.keywords.join(', ')),
        ];

        if (includeSEO) {
          row.push(
            escapeCSVField(desc.metaTitle || ''),
            escapeCSVField(desc.metaDescription || ''),
            '', // seo_score placeholder
          );
        }

        if (includeMetrics) {
          row.push(
            String(desc.impressions),
            String(desc.clicks),
            String(desc.conversions),
            ctr,
            convRate,
          );
        }

        row.push(
          desc.variant || 'A',
          String(desc.isControl),
          String(desc.isPublished),
          desc.createdAt.toISOString(),
        );

        rows.push(row);
      }
    }
  }

  // Build CSV content
  const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join(
    '\n',
  );

  return {
    csv,
    totalProducts: products.length,
    totalDescriptions,
  };
}

/**
 * Escape a field for CSV output
 */
function escapeCSVField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ============================================================================
// CSV TEMPLATE GENERATION
// ============================================================================

/**
 * Generate a CSV template for import
 */
export function generateCSVTemplate(): string {
  const headers = [
    'name',
    'sku',
    'category',
    'subcategory',
    'brand',
    'feature_1',
    'feature_2',
    'feature_3',
    'feature_4',
    'feature_5',
    'benefit_1',
    'benefit_2',
    'benefit_3',
    'color',
    'size',
    'material',
    'weight',
    'price',
    'source_description',
  ];

  const exampleRow = [
    'Premium Wireless Headphones',
    'WH-1000XM5',
    'Electronics',
    'Headphones',
    'SoundTech',
    'Active Noise Cancellation',
    '30-hour battery life',
    'Bluetooth 5.2',
    'Hi-Res Audio support',
    'Foldable design',
    'Immerse yourself in pure sound',
    'All-day comfort for work or travel',
    'Never miss a beat with long-lasting battery',
    'Black',
    'One Size',
    'Premium Leather',
    '250g',
    '299.99',
    'Experience premium audio with our flagship wireless headphones.',
  ];

  return [headers.join(','), exampleRow.join(',')].join('\n');
}

// ============================================================================
// BULK JOB HELPERS
// ============================================================================

/**
 * Create bulk job from CSV import
 */
export async function createBulkJobFromCSV(
  configId: number,
  csvContent: string,
  options: {
    marketplace?: Marketplace;
    templateId?: number;
    targetLanguages?: string[];
  } = {},
): Promise<{
  jobId: number;
  productIds: number[];
  validation: CSVValidationResult;
}> {
  // Validate CSV first
  const validation = validateCSV(csvContent);
  if (!validation.valid) {
    throw new Error(
      `CSV validation failed: ${validation.errors.map((e) => `Row ${e.row}: ${e.message}`).join('; ')}`,
    );
  }

  // Import products
  const importResult = await importProductsFromCSV(configId, csvContent, {
    skipDuplicates: false,
    updateExisting: true,
  });

  if (importResult.errors.length > 0) {
    throw new Error(
      `Import errors: ${importResult.errors.map((e) => `Row ${e.row}: ${e.message}`).join('; ')}`,
    );
  }

  // Get imported product IDs
  const products = await prisma.product.findMany({
    where: {
      configId,
      isActive: true,
    },
    orderBy: { createdAt: 'desc' },
    take: validation.validRows,
    select: { id: true },
  });

  const productIds = products.map((p) => p.id);

  // Create bulk job
  const job = await prisma.bulkGenerationJob.create({
    data: {
      configId,
      status: 'PENDING',
      totalItems: productIds.length,
      marketplace: options.marketplace || 'GENERIC',
      templateId: options.templateId,
      targetLanguages: options.targetLanguages || ['en'],
      settings: {
        productIds,
        importedFrom: 'csv',
      },
    },
  });

  return {
    jobId: job.id,
    productIds,
    validation,
  };
}

/**
 * Get job progress as percentage
 */
export function calculateJobProgress(job: {
  totalItems: number;
  processedItems: number;
  successfulItems: number;
  failedItems: number;
}): {
  percentage: number;
  successRate: number;
  eta: string | null;
} {
  const percentage =
    job.totalItems > 0
      ? Math.round((job.processedItems / job.totalItems) * 100)
      : 0;

  const successRate =
    job.processedItems > 0
      ? Math.round((job.successfulItems / job.processedItems) * 100)
      : 100;

  // ETA calculation would require timestamps, simplified here
  const eta = null;

  return { percentage, successRate, eta };
}
