/**
 * Template Service
 *
 * Handles template management and application for product descriptions.
 * Templates define the structure and style of generated content.
 */

import { prisma } from '../../../prisma/client';
import { Marketplace } from '@prisma/client';

// ============================================================================
// TYPES
// ============================================================================

export interface TemplateVariables {
  product_name: string;
  category: string;
  subcategory: string;
  brand: string;
  // Feature variables
  feature_1: string;
  feature_2: string;
  feature_3: string;
  feature_4: string;
  feature_5: string;
  // Benefit variables
  benefit_1: string;
  benefit_2: string;
  benefit_3: string;
  // Attribute variables (from product attributes)
  [key: string]: string;
}

export interface AppliedTemplate {
  titleTemplate: string;
  shortDescTemplate: string;
  longDescTemplate: string;
  bulletTemplate: string;
}

export interface BuiltInTemplate {
  name: string;
  description: string;
  marketplace: Marketplace;
  category?: string;
  titleTemplate: string;
  shortDescTemplate: string;
  longDescTemplate: string;
  bulletTemplate: string;
}

// ============================================================================
// BUILT-IN TEMPLATES
// ============================================================================

export const BUILT_IN_TEMPLATES: BuiltInTemplate[] = [
  // Generic Templates
  {
    name: 'Professional Standard',
    description:
      'Clean, professional product description suitable for any marketplace',
    marketplace: 'GENERIC',
    titleTemplate: '{{product_name}} - {{feature_1}} | {{brand}}',
    shortDescTemplate:
      'Discover the {{product_name}}, featuring {{feature_1}} and {{feature_2}}. {{benefit_1}}.',
    longDescTemplate: `Introducing the {{product_name}} from {{brand}}.

{{benefit_1}}. This {{category}} product features {{feature_1}}, {{feature_2}}, and {{feature_3}}.

Perfect for those who value quality and performance, the {{product_name}} delivers {{benefit_2}}.

Key Features:
{{bullet_points}}

{{benefit_3}}. Order yours today and experience the difference.`,
    bulletTemplate: '{{feature}} - {{benefit}}',
  },
  {
    name: 'Benefit-Focused',
    description: 'Leads with customer benefits rather than features',
    marketplace: 'GENERIC',
    titleTemplate: '{{benefit_1}} with {{product_name}}',
    shortDescTemplate:
      '{{benefit_1}}. The {{product_name}} helps you {{benefit_2}} with {{feature_1}}.',
    longDescTemplate: `{{benefit_1}}

The {{product_name}} is designed to help you {{benefit_2}}. Whether you're looking for {{feature_1}} or {{feature_2}}, this {{category}} delivers.

What makes it special:
{{bullet_points}}

{{benefit_3}}. Try the {{product_name}} today.`,
    bulletTemplate: '✓ {{benefit}}',
  },
  {
    name: 'Storytelling',
    description: 'Narrative-driven description that tells a story',
    marketplace: 'GENERIC',
    titleTemplate: '{{product_name}} - {{brand}}',
    shortDescTemplate:
      'Imagine {{benefit_1}}. The {{product_name}} makes it possible with {{feature_1}}.',
    longDescTemplate: `Imagine {{benefit_1}}.

That's exactly what the {{product_name}} delivers. Crafted with {{feature_1}} and {{feature_2}}, this {{category}} transforms the way you experience {{benefit_2}}.

Here's why customers love it:
{{bullet_points}}

Join thousands who have already discovered {{benefit_3}} with the {{product_name}}.`,
    bulletTemplate: '→ {{feature}}: {{benefit}}',
  },

  // Amazon Templates
  {
    name: 'Amazon Optimized',
    description: 'Optimized for Amazon search and conversion',
    marketplace: 'AMAZON',
    titleTemplate:
      '{{brand}} {{product_name}} - {{feature_1}}, {{feature_2}} - {{category}}',
    shortDescTemplate:
      'The {{brand}} {{product_name}} features {{feature_1}} and {{feature_2}}. {{benefit_1}}. Perfect {{category}} for {{benefit_2}}.',
    longDescTemplate: `ABOUT THIS ITEM:
The {{brand}} {{product_name}} is a premium {{category}} designed for {{benefit_1}}.

FEATURES & BENEFITS:
{{bullet_points}}

WHY CHOOSE {{brand}}?
{{benefit_2}}. Our {{product_name}} is backed by quality materials and expert craftsmanship.

WHAT'S INCLUDED:
- 1x {{product_name}}
- Product documentation

{{benefit_3}}. Add to cart now!`,
    bulletTemplate: '【{{feature_label}}】{{feature}} - {{benefit}}',
  },
  {
    name: 'Amazon Premium',
    description: 'Premium brand positioning for Amazon',
    marketplace: 'AMAZON',
    titleTemplate:
      '{{brand}} {{product_name}} | {{feature_1}} | Premium {{category}}',
    shortDescTemplate:
      'Premium {{category}} by {{brand}}. {{benefit_1}} with {{feature_1}} and {{feature_2}}.',
    longDescTemplate: `PREMIUM QUALITY {{category}}

Experience {{benefit_1}} with the {{brand}} {{product_name}}. This premium {{category}} combines {{feature_1}} with {{feature_2}} to deliver exceptional results.

WHAT SETS US APART:
{{bullet_points}}

SATISFACTION GUARANTEED
{{benefit_2}}. We stand behind every product we sell.

{{benefit_3}}`,
    bulletTemplate: '✦ {{feature}}: {{benefit}}',
  },

  // Shopify Templates
  {
    name: 'Shopify Modern',
    description: 'Clean, modern design for Shopify stores',
    marketplace: 'SHOPIFY',
    titleTemplate: '{{product_name}}',
    shortDescTemplate:
      '{{benefit_1}}. Features {{feature_1}} and {{feature_2}}.',
    longDescTemplate: `## {{benefit_1}}

The **{{product_name}}** is more than just a {{category}} – it's {{benefit_2}}.

### Features
{{bullet_points}}

### Why You'll Love It
{{benefit_3}}

### Details
- Brand: {{brand}}
- Category: {{category}}

*Free shipping on orders over $50*`,
    bulletTemplate: '- **{{feature}}**: {{benefit}}',
  },
  {
    name: 'Shopify Lifestyle',
    description: 'Lifestyle-focused for fashion and home decor',
    marketplace: 'SHOPIFY',
    category: 'Fashion',
    titleTemplate: '{{product_name}} | {{brand}}',
    shortDescTemplate:
      'Elevate your style with the {{product_name}}. {{benefit_1}}.',
    longDescTemplate: `# Meet Your New Favorite {{category}}

{{benefit_1}}

The **{{product_name}}** by {{brand}} is designed for those who appreciate {{benefit_2}}. Featuring {{feature_1}} and {{feature_2}}, this piece seamlessly fits into your lifestyle.

## What Makes It Special
{{bullet_points}}

## The Details
{{feature_3}}

## Style It Your Way
{{benefit_3}}`,
    bulletTemplate: '✨ {{feature}}',
  },

  // eBay Templates
  {
    name: 'eBay Detailed',
    description: 'Detailed listing for eBay with specifications',
    marketplace: 'EBAY',
    titleTemplate: '{{brand}} {{product_name}} {{feature_1}} {{category}} NEW',
    shortDescTemplate:
      '{{brand}} {{product_name}}. {{feature_1}}, {{feature_2}}. {{benefit_1}}.',
    longDescTemplate: `{{brand}} {{product_name}}
================================

DESCRIPTION:
{{benefit_1}}. This {{category}} from {{brand}} features {{feature_1}} and {{feature_2}}.

FEATURES:
{{bullet_points}}

SPECIFICATIONS:
- Brand: {{brand}}
- Type: {{category}}
- Condition: New

SHIPPING & RETURNS:
Fast shipping! {{benefit_2}}.

{{benefit_3}}`,
    bulletTemplate: '• {{feature}}: {{benefit}}',
  },

  // Etsy Templates
  {
    name: 'Etsy Handcrafted',
    description: 'Artisan-focused for handmade products',
    marketplace: 'ETSY',
    titleTemplate:
      '{{product_name}} | {{feature_1}} | {{category}} by {{brand}}',
    shortDescTemplate:
      'Handcrafted {{product_name}} featuring {{feature_1}}. {{benefit_1}}.',
    longDescTemplate: `♥ {{product_name}} ♥

{{benefit_1}}

Each {{product_name}} is carefully crafted with {{feature_1}} and {{feature_2}}. {{benefit_2}}.

━━━━━━━━━━━━━━━━━━━━
DETAILS
━━━━━━━━━━━━━━━━━━━━
{{bullet_points}}

━━━━━━━━━━━━━━━━━━━━
ABOUT
━━━━━━━━━━━━━━━━━━━━
{{benefit_3}}

Thank you for supporting handmade! ♥`,
    bulletTemplate: '✿ {{feature}}',
  },

  // Walmart Templates
  {
    name: 'Walmart Value',
    description: 'Value-focused for Walmart marketplace',
    marketplace: 'WALMART',
    titleTemplate: '{{brand}} {{product_name}}, {{feature_1}}, {{category}}',
    shortDescTemplate:
      'Get the {{brand}} {{product_name}} with {{feature_1}} and {{feature_2}}. {{benefit_1}}.',
    longDescTemplate: `{{brand}} {{product_name}}

Great value {{category}} featuring:
{{bullet_points}}

{{benefit_1}}. The {{product_name}} delivers {{benefit_2}} at an affordable price.

Product Details:
- Brand: {{brand}}
- Department: {{category}}

{{benefit_3}}`,
    bulletTemplate: '• {{feature}} – {{benefit}}',
  },
];

// ============================================================================
// TEMPLATE MANAGEMENT
// ============================================================================

/**
 * Get or create built-in templates for a config
 */
export async function ensureBuiltInTemplates(configId: number): Promise<void> {
  const existingTemplates = await prisma.descriptionTemplate.findMany({
    where: { configId, isActive: true },
  });

  if (existingTemplates.length === 0) {
    // Create built-in templates
    for (const template of BUILT_IN_TEMPLATES) {
      await prisma.descriptionTemplate.create({
        data: {
          configId,
          name: template.name,
          description: template.description,
          marketplace: template.marketplace,
          category: template.category,
          titleTemplate: template.titleTemplate,
          shortDescTemplate: template.shortDescTemplate,
          longDescTemplate: template.longDescTemplate,
          bulletTemplate: template.bulletTemplate,
          isDefault: template.name === 'Professional Standard',
        },
      });
    }
  }
}

/**
 * Get best matching template for a product
 */
export async function getMatchingTemplate(
  configId: number,
  marketplace: Marketplace,
  category?: string,
): Promise<AppliedTemplate | null> {
  // Try to find exact match (marketplace + category)
  let template = await prisma.descriptionTemplate.findFirst({
    where: {
      configId,
      marketplace,
      category,
      isActive: true,
    },
  });

  // Fall back to marketplace-only match
  if (!template) {
    template = await prisma.descriptionTemplate.findFirst({
      where: {
        configId,
        marketplace,
        category: null,
        isActive: true,
      },
    });
  }

  // Fall back to default template
  if (!template) {
    template = await prisma.descriptionTemplate.findFirst({
      where: {
        configId,
        isDefault: true,
        isActive: true,
      },
    });
  }

  // Fall back to any GENERIC template
  if (!template) {
    template = await prisma.descriptionTemplate.findFirst({
      where: {
        configId,
        marketplace: 'GENERIC',
        isActive: true,
      },
    });
  }

  if (!template) {
    return null;
  }

  return {
    titleTemplate: template.titleTemplate || '',
    shortDescTemplate: template.shortDescTemplate || '',
    longDescTemplate: template.longDescTemplate || '',
    bulletTemplate: template.bulletTemplate || '',
  };
}

/**
 * Get template by ID
 */
export async function getTemplateById(
  templateId: number,
): Promise<AppliedTemplate | null> {
  const template = await prisma.descriptionTemplate.findUnique({
    where: { id: templateId },
  });

  if (!template) {
    return null;
  }

  return {
    titleTemplate: template.titleTemplate || '',
    shortDescTemplate: template.shortDescTemplate || '',
    longDescTemplate: template.longDescTemplate || '',
    bulletTemplate: template.bulletTemplate || '',
  };
}

// ============================================================================
// TEMPLATE APPLICATION
// ============================================================================

/**
 * Apply template variables to content
 */
export function applyTemplateVariables(
  template: string,
  variables: TemplateVariables,
): string {
  let result = template;

  // Replace all {{variable}} patterns
  const variablePattern = /\{\{(\w+)\}\}/g;
  result = result.replace(variablePattern, (match, varName) => {
    const value = variables[varName];
    return value !== undefined ? value : match;
  });

  return result;
}

/**
 * Extract variables from product data
 */
export function extractTemplateVariables(
  product: {
    name: string;
    category: string | null;
    subcategory: string | null;
    attributes: unknown;
  },
  features: string[] = [],
  benefits: string[] = [],
): TemplateVariables {
  const attrs = (product.attributes || {}) as Record<string, string>;

  const variables: TemplateVariables = {
    product_name: product.name,
    category: product.category || 'Product',
    subcategory: product.subcategory || '',
    brand: attrs.brand || attrs.Brand || 'Brand',
    feature_1: features[0] || attrs.feature1 || '',
    feature_2: features[1] || attrs.feature2 || '',
    feature_3: features[2] || attrs.feature3 || '',
    feature_4: features[3] || attrs.feature4 || '',
    feature_5: features[4] || attrs.feature5 || '',
    benefit_1: benefits[0] || '',
    benefit_2: benefits[1] || '',
    benefit_3: benefits[2] || '',
  };

  // Add all attributes as variables
  for (const [key, value] of Object.entries(attrs)) {
    const normalizedKey = key.toLowerCase().replace(/\s+/g, '_');
    if (typeof value === 'string') {
      variables[normalizedKey] = value;
    }
  }

  return variables;
}

/**
 * Generate bullet points from template
 */
export function generateBulletPoints(
  bulletTemplate: string,
  features: Array<{ feature: string; benefit: string }>,
): string[] {
  return features.map(({ feature, benefit }) => {
    let bullet = bulletTemplate;
    bullet = bullet.replace(/\{\{feature\}\}/g, feature);
    bullet = bullet.replace(/\{\{benefit\}\}/g, benefit);
    bullet = bullet.replace(
      /\{\{feature_label\}\}/g,
      feature.split(' ')[0]?.toUpperCase() || 'FEATURE',
    );
    return bullet;
  });
}

/**
 * Build AI prompt instructions from template
 */
export function buildTemplatePrompt(template: AppliedTemplate): string {
  return `
TEMPLATE STRUCTURE GUIDELINES:
Follow this template structure for the generated content:

TITLE STRUCTURE:
${template.titleTemplate || 'Use a clear, descriptive title'}

SHORT DESCRIPTION STRUCTURE:
${template.shortDescTemplate || 'Provide a concise summary'}

LONG DESCRIPTION STRUCTURE:
${template.longDescTemplate || 'Provide detailed description'}

BULLET POINT STRUCTURE:
${template.bulletTemplate || 'Feature - Benefit format'}

Replace all {{variable}} placeholders with appropriate content based on the product information.
`;
}
