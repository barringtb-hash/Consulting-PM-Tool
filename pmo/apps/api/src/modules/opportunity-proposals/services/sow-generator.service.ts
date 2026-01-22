/**
 * SOW Generator Service
 *
 * AI-powered Statement of Work generation for opportunities.
 * Generates professional SOW documents with structured sections.
 */

import { prisma } from '../../../prisma/client';
import { llmService } from '../../../services/llm.service';
import type { SOWStatus } from '@prisma/client';

// ============================================================================
// TYPES
// ============================================================================

export interface SOWSection {
  id: string;
  title: string;
  content: string;
}

export interface SOWContent {
  markdown: string;
  sections: SOWSection[];
  metadata: {
    generatedAt: Date;
    generatedBy: 'AI' | 'TEMPLATE' | 'MANUAL';
    version: number;
    wordCount: number;
  };
}

export interface CreateSOWInput {
  opportunityId: number;
  tenantId: string;
  createdById: number;
  name: string;
  estimateId?: number;
  content?: SOWContent;
}

export interface UpdateSOWInput {
  name?: string;
  status?: SOWStatus;
  content?: SOWContent;
  validFrom?: Date;
  validUntil?: Date;
}

export interface GenerateSOWInput {
  opportunityId: number;
  tenantId: string;
  createdById: number;
  estimateId?: number;
  customInstructions?: string;
  companyName?: string;
  consultantTitle?: string;
}

// ============================================================================
// TEMPLATES
// ============================================================================

const SOW_SECTIONS = [
  { id: 'introduction', title: 'Introduction', required: true },
  { id: 'background', title: 'Background', required: false },
  { id: 'objectives', title: 'Project Objectives', required: true },
  { id: 'scope', title: 'Scope of Work', required: true },
  { id: 'deliverables', title: 'Deliverables', required: true },
  { id: 'timeline', title: 'Timeline and Milestones', required: true },
  { id: 'pricing', title: 'Pricing and Payment Terms', required: true },
  { id: 'assumptions', title: 'Assumptions and Dependencies', required: true },
  { id: 'acceptance', title: 'Acceptance Criteria', required: true },
  { id: 'change_management', title: 'Change Management', required: true },
  { id: 'signatures', title: 'Signatures', required: true },
];

// ============================================================================
// SERVICE
// ============================================================================

class SOWGeneratorService {
  /**
   * Create a new SOW
   */
  async createSOW(input: CreateSOWInput) {
    const sow = await prisma.opportunitySOW.create({
      data: {
        opportunityId: input.opportunityId,
        tenantId: input.tenantId,
        createdById: input.createdById,
        name: input.name,
        estimateId: input.estimateId,
        content: input.content || this.getEmptyContent(),
        generatedBy: 'MANUAL',
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        opportunity: { select: { id: true, name: true } },
        estimate: { select: { id: true, name: true, total: true } },
      },
    });

    return sow;
  }

  /**
   * Get all SOWs for an opportunity
   */
  async getSOWsByOpportunity(opportunityId: number, tenantId: string) {
    const sows = await prisma.opportunitySOW.findMany({
      where: { opportunityId, tenantId },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true, email: true } },
        estimate: { select: { id: true, name: true, total: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return sows;
  }

  /**
   * Get a single SOW by ID
   */
  async getSOWById(id: number, tenantId: string) {
    const sow = await prisma.opportunitySOW.findFirst({
      where: { id, tenantId },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true, email: true } },
        opportunity: {
          select: {
            id: true,
            name: true,
            description: true,
            account: { select: { id: true, name: true } },
          },
        },
        estimate: {
          select: {
            id: true,
            name: true,
            total: true,
            lineItems: true,
          },
        },
      },
    });

    return sow;
  }

  /**
   * Update a SOW
   */
  async updateSOW(id: number, tenantId: string, input: UpdateSOWInput) {
    // Get current version for incrementing
    const current = await prisma.opportunitySOW.findFirst({
      where: { id, tenantId },
    });

    if (!current) {
      throw new Error('SOW not found');
    }

    const sow = await prisma.opportunitySOW.update({
      where: { id },
      data: {
        name: input.name,
        status: input.status,
        content: input.content,
        validFrom: input.validFrom,
        validUntil: input.validUntil,
        version: input.content ? current.version + 1 : current.version,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        opportunity: { select: { id: true, name: true } },
      },
    });

    return sow;
  }

  /**
   * Update a specific section of the SOW
   */
  async updateSOWSection(
    id: number,
    tenantId: string,
    sectionId: string,
    content: string,
  ) {
    const sow = await prisma.opportunitySOW.findFirst({
      where: { id, tenantId },
    });

    if (!sow) {
      throw new Error('SOW not found');
    }

    const sowContent = sow.content as unknown as SOWContent;
    const sections = sowContent.sections || [];
    const sectionIndex = sections.findIndex((s) => s.id === sectionId);

    if (sectionIndex === -1) {
      throw new Error('Section not found');
    }

    sections[sectionIndex].content = content;

    // Reassemble markdown
    const markdown = this.assembleSections(sections);

    const updatedContent: SOWContent = {
      markdown,
      sections,
      metadata: {
        ...sowContent.metadata,
        version: sowContent.metadata.version + 1,
        wordCount: markdown.split(/\s+/).length,
      },
    };

    return this.updateSOW(id, tenantId, { content: updatedContent });
  }

  /**
   * Delete a SOW
   */
  async deleteSOW(id: number, tenantId: string) {
    const sow = await prisma.opportunitySOW.findFirst({
      where: { id, tenantId },
    });

    if (!sow) {
      throw new Error('SOW not found');
    }

    await prisma.opportunitySOW.delete({
      where: { id },
    });

    return { success: true };
  }

  /**
   * Approve a SOW
   */
  async approveSOW(id: number, tenantId: string, approvedById: number) {
    const sow = await prisma.opportunitySOW.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById,
        approvedAt: new Date(),
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true, email: true } },
      },
    });

    return sow;
  }

  /**
   * Generate an AI-powered SOW
   */
  async generateSOW(input: GenerateSOWInput) {
    // Fetch opportunity and estimate details
    const opportunity = await prisma.opportunity.findFirst({
      where: { id: input.opportunityId, tenantId: input.tenantId },
      include: {
        account: {
          select: {
            name: true,
            industry: true,
            billingAddress: true,
          },
        },
      },
    });

    if (!opportunity) {
      throw new Error('Opportunity not found');
    }

    // Get estimate if provided
    let estimate = null;
    if (input.estimateId) {
      estimate = await prisma.opportunityCostEstimate.findFirst({
        where: { id: input.estimateId, tenantId: input.tenantId },
        include: {
          lineItems: { orderBy: { sortOrder: 'asc' } },
        },
      });
    }

    // Build prompt and generate content
    const prompt = this.buildGenerationPrompt({
      opportunityName: opportunity.name,
      opportunityDescription: opportunity.description || '',
      accountName: opportunity.account.name,
      industry: opportunity.account.industry || 'General',
      estimate: estimate
        ? {
            type: estimate.estimateType,
            total: estimate.total.toNumber(),
            currency: estimate.currency,
            lineItems: estimate.lineItems.map((item) => ({
              name: item.name,
              description: item.description || '',
              quantity: item.quantity.toNumber(),
              unitPrice: item.unitPrice.toNumber(),
              total: item.total.toNumber(),
              phase: item.phase || '',
            })),
            assumptions: (estimate.assumptions as string[]) || [],
          }
        : null,
      companyName: input.companyName || 'Consultant',
      consultantTitle: input.consultantTitle || 'AI Consultant',
      customInstructions: input.customInstructions,
    });

    const response = await llmService.complete(prompt, {
      maxTokens: 4000,
      temperature: 0.3,
    });

    const sections = this.parseGeneratedContent(response.content);
    const markdown = this.assembleSections(sections);

    const content: SOWContent = {
      markdown,
      sections,
      metadata: {
        generatedAt: new Date(),
        generatedBy: 'AI',
        version: 1,
        wordCount: markdown.split(/\s+/).length,
      },
    };

    // Create the SOW
    const sow = await prisma.opportunitySOW.create({
      data: {
        opportunityId: input.opportunityId,
        tenantId: input.tenantId,
        createdById: input.createdById,
        estimateId: input.estimateId,
        name: `SOW - ${opportunity.name}`,
        content,
        generatedBy: 'AI',
        clientSnapshot: {
          accountName: opportunity.account.name,
          accountId: opportunity.accountId,
          generatedAt: new Date().toISOString(),
        },
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        opportunity: { select: { id: true, name: true } },
        estimate: { select: { id: true, name: true, total: true } },
      },
    });

    return sow;
  }

  /**
   * Export SOW to different formats
   */
  async exportSOW(
    id: number,
    tenantId: string,
    format: 'markdown' | 'html' | 'text',
  ): Promise<string> {
    const sow = await this.getSOWById(id, tenantId);

    if (!sow) {
      throw new Error('SOW not found');
    }

    const content = sow.content as unknown as SOWContent;

    switch (format) {
      case 'markdown':
        return content.markdown;
      case 'html':
        return this.toHtml(content, sow.name);
      case 'text':
        return this.toPlainText(content);
      default:
        return content.markdown;
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private getEmptyContent(): SOWContent {
    return {
      markdown: '',
      sections: SOW_SECTIONS.map((s) => ({
        id: s.id,
        title: s.title,
        content: `[${s.title} content to be added]`,
      })),
      metadata: {
        generatedAt: new Date(),
        generatedBy: 'MANUAL',
        version: 1,
        wordCount: 0,
      },
    };
  }

  private buildGenerationPrompt(params: {
    opportunityName: string;
    opportunityDescription: string;
    accountName: string;
    industry: string;
    estimate: {
      type: string;
      total: number;
      currency: string;
      lineItems: {
        name: string;
        description: string;
        quantity: number;
        unitPrice: number;
        total: number;
        phase: string;
      }[];
      assumptions: string[];
    } | null;
    companyName: string;
    consultantTitle: string;
    customInstructions?: string;
  }): string {
    const estimateSection = params.estimate
      ? `
COST ESTIMATE:
- Type: ${params.estimate.type}
- Total: ${params.estimate.currency} ${params.estimate.total.toLocaleString()}
- Line Items:
${params.estimate.lineItems.map((item) => `  - ${item.name}: ${params.estimate!.currency} ${item.total.toLocaleString()}`).join('\n')}
${params.estimate.assumptions.length > 0 ? `- Assumptions: ${params.estimate.assumptions.join(', ')}` : ''}`
      : 'No estimate attached - use placeholder pricing language.';

    return `You are an expert consulting professional creating a Statement of Work (SOW).

Generate a professional SOW for the following opportunity:

PROJECT DETAILS:
- Project Name: ${params.opportunityName}
- Description: ${params.opportunityDescription || 'To be detailed in scope section'}
- Client: ${params.accountName}
- Industry: ${params.industry}
- Consultant: ${params.companyName}

${estimateSection}

${params.customInstructions ? `ADDITIONAL INSTRUCTIONS:\n${params.customInstructions}` : ''}

Generate content for each of these sections:
1. introduction - Brief overview of the agreement
2. background - Context about the client and their needs
3. objectives - Clear project objectives (3-5 bullet points)
4. scope - Detailed scope of work including what IS and IS NOT included
5. deliverables - Specific deliverables with descriptions
6. timeline - Project phases and milestones
7. pricing - Payment terms and pricing (use estimate if provided)
8. assumptions - Key assumptions for the project
9. acceptance - Acceptance criteria and process
10. change_management - Process for handling scope changes
11. signatures - Signature blocks for both parties

Return a JSON array with this structure:
[
  {
    "id": "section_id",
    "title": "Section Title",
    "content": "Professional content for this section in markdown format"
  }
]

Guidelines:
- Use professional, clear language
- Include specific details from the project information
- Use bullet points and numbered lists where appropriate
- For pricing section, include payment milestones if appropriate
- Make it legally sound but readable
- Use [PLACEHOLDER] for any information that needs to be filled in`;
  }

  private parseGeneratedContent(content: string): SOWSection[] {
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.map(
          (s: { id: string; title: string; content: string }) => ({
            id: s.id,
            title: s.title,
            content: s.content,
          }),
        );
      }
      throw new Error('No JSON found in response');
    } catch (error) {
      console.error('Failed to parse SOW content:', error);
      // Return template sections with placeholder content
      return SOW_SECTIONS.map((s) => ({
        id: s.id,
        title: s.title,
        content: `[AI generation failed - please add ${s.title} content manually]`,
      }));
    }
  }

  private assembleSections(sections: SOWSection[]): string {
    const lines: string[] = [];

    lines.push('# Statement of Work');
    lines.push('');
    lines.push(`*Generated on ${new Date().toLocaleDateString()}*`);
    lines.push('');
    lines.push('---');
    lines.push('');

    for (const section of sections) {
      lines.push(`## ${section.title}`);
      lines.push('');
      lines.push(section.content);
      lines.push('');
    }

    return lines.join('\n');
  }

  private toHtml(content: SOWContent, title: string): string {
    // Simple markdown to HTML conversion
    const html = content.markdown
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/---/g, '<hr>');

    return `<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <style>
    body { font-family: 'Georgia', serif; max-width: 800px; margin: 0 auto; padding: 40px; line-height: 1.6; }
    h1 { color: #1a1a1a; border-bottom: 3px solid #1a1a1a; padding-bottom: 10px; }
    h2 { color: #333; margin-top: 30px; }
    li { margin: 8px 0; }
    hr { margin: 30px 0; }
    .signature-block { margin-top: 50px; display: flex; justify-content: space-between; }
    .signature { width: 45%; }
    .signature-line { border-bottom: 1px solid #000; margin: 40px 0 5px 0; }
  </style>
</head>
<body>
${html}
</body>
</html>`;
  }

  private toPlainText(content: SOWContent): string {
    return content.markdown
      .replace(/^#+ /gm, '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/---/g, '-------------------')
      .replace(/^\s*[-*]\s/gm, '  - ');
  }
}

export const sowGeneratorService = new SOWGeneratorService();
