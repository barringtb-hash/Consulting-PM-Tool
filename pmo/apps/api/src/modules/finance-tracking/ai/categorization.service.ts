/**
 * AI Categorization Service
 *
 * Uses AI to automatically categorize expenses based on description,
 * vendor name, and historical patterns.
 */

import { prisma } from '../../../prisma/client';
import { getTenantId } from '../../../tenant/tenant.context';

// ============================================================================
// TYPES
// ============================================================================

export interface CategorySuggestion {
  categoryId: number;
  categoryName: string;
  confidence: number;
  reason: string;
}

export interface CategorizationResult {
  suggestions: CategorySuggestion[];
  usedAI: boolean;
}

export interface CategoryFeedback {
  expenseId: number;
  suggestedCategoryId: number;
  actualCategoryId: number;
  wasAccepted: boolean;
}

// ============================================================================
// AI CATEGORIZATION SERVICE
// ============================================================================

/**
 * Get AI-powered category suggestions for an expense
 */
export async function suggestCategory(
  description: string,
  vendorName?: string,
  amount?: number,
): Promise<CategorizationResult> {
  const tenantId = getTenantId();

  // Get all active categories for this tenant
  const categories = await prisma.expenseCategory.findMany({
    where: { tenantId, isActive: true },
    select: { id: true, name: true, description: true },
  });

  if (categories.length === 0) {
    return { suggestions: [], usedAI: false };
  }

  // Try AI categorization first if OpenAI is configured
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const aiSuggestions = await getAISuggestions(
        description,
        vendorName,
        amount,
        categories,
      );
      if (aiSuggestions.length > 0) {
        return { suggestions: aiSuggestions, usedAI: true };
      }
    } catch (error) {
      console.error('AI categorization failed, falling back to rules:', error);
    }
  }

  // Fall back to rule-based categorization
  const ruleSuggestions = getRuleBasedSuggestions(
    description,
    vendorName,
    categories,
  );

  // Also check historical patterns
  const historicalSuggestions = await getHistoricalSuggestions(
    tenantId,
    description,
    vendorName,
  );

  // Merge and deduplicate suggestions
  const merged = mergeSuggestions(ruleSuggestions, historicalSuggestions);

  return { suggestions: merged, usedAI: false };
}

/**
 * Use OpenAI to categorize expenses
 */
async function getAISuggestions(
  description: string,
  vendorName: string | undefined,
  amount: number | undefined,
  categories: Array<{ id: number; name: string; description: string | null }>,
): Promise<CategorySuggestion[]> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return [];
  }

  const categoryList = categories
    .map(
      (c) =>
        `- ${c.id}: ${c.name}${c.description ? ` (${c.description})` : ''}`,
    )
    .join('\n');

  const prompt = `You are an expense categorization assistant. Given the following expense details, suggest the most appropriate category from the list provided.

Expense Details:
- Description: ${description}
${vendorName ? `- Vendor: ${vendorName}` : ''}
${amount ? `- Amount: $${amount}` : ''}

Available Categories:
${categoryList}

Respond with a JSON array of up to 3 suggestions, ordered by confidence. Each suggestion should have:
- categoryId: number (from the list above)
- categoryName: string
- confidence: number (0.0 to 1.0)
- reason: string (brief explanation)

Example response:
[{"categoryId": 1, "categoryName": "Cloud Infrastructure", "confidence": 0.95, "reason": "AWS charges are cloud infrastructure costs"}]

Respond ONLY with the JSON array, no other text.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return [];
    }

    // Parse JSON response
    const suggestions = JSON.parse(content) as CategorySuggestion[];

    // Validate suggestions
    return suggestions
      .filter(
        (s) =>
          categories.some((c) => c.id === s.categoryId) &&
          s.confidence >= 0 &&
          s.confidence <= 1,
      )
      .slice(0, 3);
  } catch (error) {
    console.error('Error calling OpenAI for categorization:', error);
    return [];
  }
}

/**
 * Rule-based categorization using keyword matching
 */
function getRuleBasedSuggestions(
  description: string,
  vendorName: string | undefined,
  categories: Array<{ id: number; name: string; description: string | null }>,
): CategorySuggestion[] {
  const text = `${description} ${vendorName || ''}`.toLowerCase();
  const suggestions: CategorySuggestion[] = [];

  // Define keyword rules for common categories
  const rules: Record<string, string[]> = {
    'Cloud Infrastructure': [
      'aws',
      'azure',
      'gcp',
      'google cloud',
      'amazon web services',
      'digitalocean',
      'heroku',
      'cloud',
      'ec2',
      's3',
      'lambda',
    ],
    'Software Licenses': [
      'license',
      'subscription',
      'seat',
      'user license',
      'enterprise',
      'pro plan',
    ],
    'SaaS Subscriptions': [
      'saas',
      'slack',
      'notion',
      'figma',
      'jira',
      'confluence',
      'zoom',
      'microsoft 365',
      'google workspace',
      'dropbox',
      'asana',
      'trello',
    ],
    'Development Tools': [
      'github',
      'gitlab',
      'bitbucket',
      'jetbrains',
      'ide',
      'vscode',
      'postman',
      'npm',
      'docker',
    ],
    'Hosting & Domains': [
      'domain',
      'godaddy',
      'namecheap',
      'cloudflare',
      'hosting',
      'ssl',
      'certificate',
      'dns',
    ],
    Travel: [
      'flight',
      'hotel',
      'airbnb',
      'uber',
      'lyft',
      'taxi',
      'train',
      'airline',
      'travel',
      'booking',
    ],
    'Meals & Entertainment': [
      'restaurant',
      'lunch',
      'dinner',
      'coffee',
      'catering',
      'food',
      'meal',
      'doordash',
      'ubereats',
      'grubhub',
    ],
    Marketing: [
      'google ads',
      'facebook ads',
      'linkedin ads',
      'advertising',
      'marketing',
      'campaign',
      'seo',
      'social media',
    ],
    Equipment: [
      'laptop',
      'monitor',
      'keyboard',
      'mouse',
      'computer',
      'hardware',
      'phone',
      'tablet',
      'apple',
      'dell',
      'lenovo',
    ],
    'Office Rent': ['rent', 'lease', 'office space', 'coworking', 'wework'],
    Utilities: [
      'electric',
      'gas',
      'water',
      'internet',
      'phone bill',
      'utility',
    ],
    Insurance: ['insurance', 'policy', 'coverage', 'liability', 'premium'],
    Legal: ['legal', 'attorney', 'lawyer', 'law firm', 'contract', 'filing'],
    'Professional Services': [
      'consulting',
      'consultant',
      'advisory',
      'accountant',
      'cpa',
      'audit',
    ],
    Contractors: [
      'contractor',
      'freelancer',
      'upwork',
      'fiverr',
      'toptal',
      '1099',
    ],
    'Training & Education': [
      'training',
      'course',
      'certification',
      'workshop',
      'conference',
      'udemy',
      'coursera',
      'linkedin learning',
    ],
  };

  for (const [categoryName, keywords] of Object.entries(rules)) {
    const matchedKeyword = keywords.find((kw) => text.includes(kw));
    if (matchedKeyword) {
      const category = categories.find(
        (c) => c.name.toLowerCase() === categoryName.toLowerCase(),
      );
      if (category) {
        suggestions.push({
          categoryId: category.id,
          categoryName: category.name,
          confidence: 0.7,
          reason: `Matched keyword: "${matchedKeyword}"`,
        });
      }
    }
  }

  return suggestions.slice(0, 3);
}

/**
 * Get suggestions based on historical expense patterns
 */
async function getHistoricalSuggestions(
  tenantId: string,
  description: string,
  vendorName: string | undefined,
): Promise<CategorySuggestion[]> {
  const suggestions: CategorySuggestion[] = [];

  // Find similar expenses by vendor name (exact match)
  if (vendorName) {
    const vendorExpenses = await prisma.expense.groupBy({
      by: ['categoryId'],
      where: {
        tenantId,
        vendorName: { equals: vendorName, mode: 'insensitive' },
        status: { in: ['APPROVED', 'PAID'] },
      },
      _count: true,
      orderBy: { _count: { categoryId: 'desc' } },
      take: 1,
    });

    if (vendorExpenses.length > 0) {
      const category = await prisma.expenseCategory.findUnique({
        where: { id: vendorExpenses[0].categoryId },
        select: { id: true, name: true },
      });
      if (category) {
        suggestions.push({
          categoryId: category.id,
          categoryName: category.name,
          confidence: 0.85,
          reason: `Previously categorized expenses from ${vendorName}`,
        });
      }
    }
  }

  // Find similar expenses by description (fuzzy match)
  const words = description
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);
  if (words.length > 0) {
    const similarExpenses = await prisma.expense.findMany({
      where: {
        tenantId,
        status: { in: ['APPROVED', 'PAID'] },
        OR: words.map((word) => ({
          description: { contains: word, mode: 'insensitive' },
        })),
      },
      select: { categoryId: true },
      take: 100,
    });

    if (similarExpenses.length >= 3) {
      // Count category occurrences
      const categoryCounts = new Map<number, number>();
      for (const exp of similarExpenses) {
        categoryCounts.set(
          exp.categoryId,
          (categoryCounts.get(exp.categoryId) || 0) + 1,
        );
      }

      // Get most common category
      const sortedCategories = [...categoryCounts.entries()].sort(
        (a, b) => b[1] - a[1],
      );
      if (sortedCategories.length > 0) {
        const [categoryId, count] = sortedCategories[0];
        // Only suggest if at least 30% of similar expenses use this category
        if (count / similarExpenses.length >= 0.3) {
          const category = await prisma.expenseCategory.findUnique({
            where: { id: categoryId },
            select: { id: true, name: true },
          });
          if (
            category &&
            !suggestions.some((s) => s.categoryId === categoryId)
          ) {
            suggestions.push({
              categoryId: category.id,
              categoryName: category.name,
              confidence: Math.min(
                0.6 + (count / similarExpenses.length) * 0.3,
                0.85,
              ),
              reason: `Based on ${count} similar expenses`,
            });
          }
        }
      }
    }
  }

  return suggestions;
}

/**
 * Merge and deduplicate suggestions from multiple sources
 */
function mergeSuggestions(
  ...suggestionArrays: CategorySuggestion[][]
): CategorySuggestion[] {
  const merged = new Map<number, CategorySuggestion>();

  for (const suggestions of suggestionArrays) {
    for (const suggestion of suggestions) {
      const existing = merged.get(suggestion.categoryId);
      if (!existing || existing.confidence < suggestion.confidence) {
        merged.set(suggestion.categoryId, suggestion);
      }
    }
  }

  return [...merged.values()]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);
}

/**
 * Record feedback for AI learning (future ML model training)
 */
export async function recordCategorizationFeedback(
  feedback: CategoryFeedback,
): Promise<void> {
  // Store feedback for future model training
  // For now, we just log it - in production, this would go to a training dataset
  console.log('Categorization feedback recorded:', {
    expenseId: feedback.expenseId,
    suggested: feedback.suggestedCategoryId,
    actual: feedback.actualCategoryId,
    accepted: feedback.wasAccepted,
    timestamp: new Date().toISOString(),
  });

  // In a production system, you would:
  // 1. Store feedback in a dedicated table
  // 2. Use feedback to fine-tune the AI model
  // 3. Adjust confidence weights based on acceptance rates
}

/**
 * Bulk categorize multiple expenses
 */
export async function bulkCategorize(
  expenses: Array<{
    id: number;
    description: string;
    vendorName?: string;
    amount?: number;
  }>,
): Promise<Map<number, CategorizationResult>> {
  const results = new Map<number, CategorizationResult>();

  // Process in batches to avoid rate limits
  const batchSize = 10;
  for (let i = 0; i < expenses.length; i += batchSize) {
    const batch = expenses.slice(i, i + batchSize);
    const batchPromises = batch.map(async (expense) => {
      const result = await suggestCategory(
        expense.description,
        expense.vendorName,
        expense.amount,
      );
      results.set(expense.id, result);
    });
    await Promise.all(batchPromises);

    // Small delay between batches to avoid rate limits
    if (i + batchSize < expenses.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return results;
}
