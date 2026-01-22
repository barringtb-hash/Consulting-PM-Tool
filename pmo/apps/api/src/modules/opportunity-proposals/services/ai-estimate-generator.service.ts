/**
 * AI Estimate Generator Service
 *
 * Uses LLM to generate cost estimates based on opportunity details.
 * Provides intelligent line item suggestions with market-rate pricing.
 */

import { prisma } from '../../../prisma/client';
import { llmService } from '../../../services/llm.service';
import { costEstimateService } from './cost-estimate.service';
import type { EstimateType, LineItemCategory } from '@prisma/client';

// ============================================================================
// TYPES
// ============================================================================

export interface GenerateEstimateInput {
  opportunityId: number;
  tenantId: string;
  createdById: number;
  estimateType: EstimateType;
  includeContingency?: boolean;
  contingencyPercent?: number;
  customInstructions?: string;
}

export interface AIGeneratedLineItem {
  category: LineItemCategory;
  phase: string;
  name: string;
  description: string;
  unitType: string;
  quantity: number;
  unitPrice: number;
  role?: string;
  hourlyRate?: number;
  estimatedHours?: number;
  aiConfidence: number;
  aiRationale: string;
}

export interface AIEstimateResult {
  lineItems: AIGeneratedLineItem[];
  assumptions: string[];
  risks: string[];
  recommendations: string[];
  totalEstimate: number;
  confidence: number;
  notes: string;
}

// ============================================================================
// PROMPTS
// ============================================================================

const ESTIMATE_GENERATION_PROMPT = `You are an expert consulting estimator with deep knowledge of project pricing, labor rates, and professional services.

Generate a detailed cost estimate for the following consulting opportunity:

OPPORTUNITY DETAILS:
- Name: {{opportunityName}}
- Description: {{description}}
- Account/Client: {{accountName}}
- Industry: {{industry}}
- Estimate Type: {{estimateType}}
- Current Opportunity Value: {{currentAmount}}

{{customInstructions}}

ESTIMATE TYPE GUIDANCE:
- FIXED_PRICE: Include all deliverables with fixed costs, account for risk in pricing
- TIME_AND_MATERIALS: Focus on hourly rates and estimated hours
- RETAINER: Monthly recurring fees with scope boundaries
- HYBRID: Mix of fixed deliverables and T&M for variable work

Generate a comprehensive cost estimate including:

1. DISCOVERY/REQUIREMENTS PHASE
   - Stakeholder interviews
   - Requirements documentation
   - Technical assessment

2. IMPLEMENTATION/DEVELOPMENT
   - Core development work
   - Integration work
   - Data migration (if applicable)

3. TESTING/QA
   - Test planning and execution
   - User acceptance testing support

4. TRAINING/DOCUMENTATION
   - User training sessions
   - Documentation creation
   - Knowledge transfer

5. PROJECT MANAGEMENT
   - Project coordination
   - Status reporting
   - Risk management

{{contingencySection}}

Return a JSON object with this exact structure:
{
  "lineItems": [
    {
      "category": "LABOR|DELIVERABLE|EXPENSE|THIRD_PARTY|CONTINGENCY",
      "phase": "Phase name",
      "name": "Line item name",
      "description": "Detailed description",
      "unitType": "hour|day|unit|fixed",
      "quantity": number,
      "unitPrice": number,
      "role": "Role name (for labor items)",
      "hourlyRate": number (for labor items),
      "estimatedHours": number (for labor items),
      "aiConfidence": 0.0-1.0,
      "aiRationale": "Brief explanation of this estimate"
    }
  ],
  "assumptions": ["List of key assumptions"],
  "risks": ["Potential risks that could affect the estimate"],
  "recommendations": ["Suggestions for the client or internal team"],
  "totalEstimate": number,
  "confidence": 0.0-1.0,
  "notes": "Additional notes about this estimate"
}

Use market-rate pricing for the following roles (adjust based on industry):
- Senior Consultant: $200-300/hour
- Consultant: $150-200/hour
- Project Manager: $175-250/hour
- Technical Lead: $225-325/hour
- Analyst: $125-175/hour
- Developer: $150-225/hour

Be realistic and thorough. Include all necessary work items.`;

// ============================================================================
// SERVICE
// ============================================================================

class AIEstimateGeneratorService {
  /**
   * Generate an AI-powered cost estimate for an opportunity
   */
  async generateEstimate(
    input: GenerateEstimateInput,
  ): Promise<AIEstimateResult> {
    // Fetch opportunity details
    const opportunity = await prisma.opportunity.findFirst({
      where: { id: input.opportunityId, tenantId: input.tenantId },
      include: {
        account: {
          select: {
            name: true,
            industry: true,
          },
        },
      },
    });

    if (!opportunity) {
      throw new Error('Opportunity not found');
    }

    // Build the prompt
    const prompt = this.buildPrompt({
      opportunityName: opportunity.name,
      description: opportunity.description || 'No description provided',
      accountName: opportunity.account.name,
      industry: opportunity.account.industry || 'General',
      estimateType: input.estimateType,
      currentAmount: opportunity.amount?.toNumber() || 0,
      includeContingency: input.includeContingency ?? true,
      contingencyPercent: input.contingencyPercent ?? 15,
      customInstructions: input.customInstructions,
    });

    // Call LLM
    const response = await llmService.complete(prompt, {
      maxTokens: 4000,
      temperature: 0.3,
    });

    // Parse response
    const result = this.parseResponse(response.content);

    return result;
  }

  /**
   * Generate and save estimate in one operation
   */
  async generateAndSaveEstimate(input: GenerateEstimateInput) {
    // Generate the estimate
    const aiResult = await this.generateEstimate(input);

    // Create the estimate record
    const estimate = await costEstimateService.createEstimate({
      opportunityId: input.opportunityId,
      tenantId: input.tenantId,
      createdById: input.createdById,
      name: `AI-Generated Estimate - ${new Date().toLocaleDateString()}`,
      estimateType: input.estimateType,
      notes: aiResult.notes,
    });

    // Mark as AI-generated
    await prisma.opportunityCostEstimate.update({
      where: { id: estimate.id },
      data: {
        aiGenerated: true,
        aiConfidence: aiResult.confidence,
        aiNotes: JSON.stringify({
          assumptions: aiResult.assumptions,
          risks: aiResult.risks,
          recommendations: aiResult.recommendations,
        }),
        assumptions: aiResult.assumptions,
      },
    });

    // Add line items
    await costEstimateService.bulkAddLineItems(
      estimate.id,
      aiResult.lineItems.map((item, index) => ({
        category: item.category,
        phase: item.phase,
        name: item.name,
        description: item.description,
        unitType: item.unitType,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        role: item.role,
        hourlyRate: item.hourlyRate,
        estimatedHours: item.estimatedHours,
        aiGenerated: true,
        aiConfidence: item.aiConfidence,
        aiRationale: item.aiRationale,
        sortOrder: index,
      })),
    );

    // Return the complete estimate
    return costEstimateService.getEstimateById(estimate.id, input.tenantId);
  }

  /**
   * Suggest additional line items for an existing estimate
   */
  async suggestAdditionalItems(
    estimateId: number,
    tenantId: string,
    context?: string,
  ): Promise<AIGeneratedLineItem[]> {
    const estimate = await costEstimateService.getEstimateById(
      estimateId,
      tenantId,
    );

    if (!estimate) {
      throw new Error('Estimate not found');
    }

    const existingItems = estimate.lineItems
      .map((item) => item.name)
      .join(', ');

    const prompt = `You are a consulting estimator. Review this existing estimate and suggest additional items that may be missing.

OPPORTUNITY: ${estimate.opportunity?.name}
EXISTING ITEMS: ${existingItems}
${context ? `CONTEXT: ${context}` : ''}

Suggest 3-5 additional line items that should be considered. Only suggest items that are NOT already in the estimate.

Return a JSON array of line items:
[
  {
    "category": "LABOR|DELIVERABLE|EXPENSE|THIRD_PARTY|CONTINGENCY",
    "phase": "Phase name",
    "name": "Line item name",
    "description": "Why this is needed",
    "unitType": "hour|day|unit|fixed",
    "quantity": number,
    "unitPrice": number,
    "role": "Role name (if labor)",
    "hourlyRate": number (if labor),
    "estimatedHours": number (if labor),
    "aiConfidence": 0.0-1.0,
    "aiRationale": "Why this should be added"
  }
]`;

    const response = await llmService.complete(prompt, {
      maxTokens: 2000,
      temperature: 0.4,
    });

    return this.parseLineItems(response.content);
  }

  /**
   * Validate and provide feedback on an estimate
   */
  async validateEstimate(
    estimateId: number,
    tenantId: string,
  ): Promise<{
    isValid: boolean;
    concerns: string[];
    suggestions: string[];
    confidence: number;
  }> {
    const estimate = await costEstimateService.getEstimateById(
      estimateId,
      tenantId,
    );

    if (!estimate) {
      throw new Error('Estimate not found');
    }

    const lineItemsSummary = estimate.lineItems
      .map(
        (item) =>
          `- ${item.name}: ${item.quantity} ${item.unitType} @ $${item.unitPrice}`,
      )
      .join('\n');

    const prompt = `Review this consulting estimate for completeness and accuracy:

OPPORTUNITY: ${estimate.opportunity?.name}
ESTIMATE TYPE: ${estimate.estimateType}
TOTAL: $${estimate.total}

LINE ITEMS:
${lineItemsSummary}

Evaluate:
1. Are all typical consulting phases covered?
2. Are the rates reasonable for the market?
3. Are there any missing items?
4. Are there any items that seem over/under-estimated?

Return a JSON object:
{
  "isValid": boolean,
  "concerns": ["List of concerns"],
  "suggestions": ["List of suggestions"],
  "confidence": 0.0-1.0
}`;

    const response = await llmService.complete(prompt, {
      maxTokens: 1500,
      temperature: 0.3,
    });

    try {
      return JSON.parse(response.content);
    } catch {
      return {
        isValid: true,
        concerns: [],
        suggestions: ['Unable to parse AI validation response'],
        confidence: 0.5,
      };
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private buildPrompt(params: {
    opportunityName: string;
    description: string;
    accountName: string;
    industry: string;
    estimateType: EstimateType;
    currentAmount: number;
    includeContingency: boolean;
    contingencyPercent: number;
    customInstructions?: string;
  }): string {
    let prompt = ESTIMATE_GENERATION_PROMPT;

    prompt = prompt.replace('{{opportunityName}}', params.opportunityName);
    prompt = prompt.replace('{{description}}', params.description);
    prompt = prompt.replace('{{accountName}}', params.accountName);
    prompt = prompt.replace('{{industry}}', params.industry);
    prompt = prompt.replace('{{estimateType}}', params.estimateType);
    prompt = prompt.replace(
      '{{currentAmount}}',
      params.currentAmount > 0
        ? `$${params.currentAmount.toLocaleString()}`
        : 'Not specified',
    );
    prompt = prompt.replace(
      '{{customInstructions}}',
      params.customInstructions
        ? `ADDITIONAL INSTRUCTIONS:\n${params.customInstructions}`
        : '',
    );
    prompt = prompt.replace(
      '{{contingencySection}}',
      params.includeContingency
        ? `6. CONTINGENCY (${params.contingencyPercent}%)\n   - Risk buffer for unforeseen work`
        : '',
    );

    return prompt;
  }

  private parseResponse(content: string): AIEstimateResult {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          lineItems: parsed.lineItems || [],
          assumptions: parsed.assumptions || [],
          risks: parsed.risks || [],
          recommendations: parsed.recommendations || [],
          totalEstimate: parsed.totalEstimate || 0,
          confidence: parsed.confidence || 0.7,
          notes: parsed.notes || '',
        };
      }
      throw new Error('No JSON found in response');
    } catch (error) {
      console.error('Failed to parse AI estimate response:', error);
      // Return empty result
      return {
        lineItems: [],
        assumptions: ['Unable to parse AI response'],
        risks: ['AI generation failed - manual review required'],
        recommendations: ['Please create estimate manually'],
        totalEstimate: 0,
        confidence: 0,
        notes: 'AI generation failed. Please try again or create manually.',
      };
    }
  }

  private parseLineItems(content: string): AIGeneratedLineItem[] {
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return [];
    } catch {
      return [];
    }
  }
}

export const aiEstimateGeneratorService = new AIEstimateGeneratorService();
