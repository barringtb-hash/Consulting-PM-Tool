/**
 * Cost Estimate Service
 *
 * Provides CRUD operations and business logic for opportunity cost estimates.
 * Includes line item management and total calculations.
 */

import { prisma } from '../../../prisma/client';
import { Prisma } from '@prisma/client';
import type {
  EstimateType,
  EstimateStatus,
  LineItemCategory,
} from '@prisma/client';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateEstimateInput {
  opportunityId: number;
  tenantId: string;
  createdById: number;
  name: string;
  estimateType?: EstimateType;
  validFrom?: Date;
  validUntil?: Date;
  notes?: string;
  internalNotes?: string;
  discountPercent?: number;
  taxRate?: number;
  currency?: string;
}

export interface UpdateEstimateInput {
  name?: string;
  estimateType?: EstimateType;
  status?: EstimateStatus;
  validFrom?: Date;
  validUntil?: Date;
  notes?: string;
  internalNotes?: string;
  discountPercent?: number;
  taxRate?: number;
  assumptions?: Record<string, unknown>[];
}

export interface CreateLineItemInput {
  estimateId: number;
  category: LineItemCategory;
  phase?: string;
  name: string;
  description?: string;
  unitType?: string;
  quantity: number;
  unitPrice: number;
  role?: string;
  hourlyRate?: number;
  estimatedHours?: number;
  aiGenerated?: boolean;
  aiConfidence?: number;
  aiRationale?: string;
  sortOrder?: number;
}

export interface UpdateLineItemInput {
  category?: LineItemCategory;
  phase?: string;
  name?: string;
  description?: string;
  unitType?: string;
  quantity?: number;
  unitPrice?: number;
  role?: string;
  hourlyRate?: number;
  estimatedHours?: number;
  sortOrder?: number;
}

// ============================================================================
// SERVICE
// ============================================================================

class CostEstimateService {
  /**
   * Create a new cost estimate for an opportunity
   */
  async createEstimate(input: CreateEstimateInput) {
    const estimate = await prisma.opportunityCostEstimate.create({
      data: {
        opportunityId: input.opportunityId,
        tenantId: input.tenantId,
        createdById: input.createdById,
        name: input.name,
        estimateType: input.estimateType || 'FIXED_PRICE',
        validFrom: input.validFrom,
        validUntil: input.validUntil,
        notes: input.notes,
        internalNotes: input.internalNotes,
        discountPercent: input.discountPercent,
        taxRate: input.taxRate,
        currency: input.currency || 'USD',
      },
      include: {
        lineItems: true,
        createdBy: { select: { id: true, name: true, email: true } },
        opportunity: { select: { id: true, name: true } },
      },
    });

    return estimate;
  }

  /**
   * Get all estimates for an opportunity
   */
  async getEstimatesByOpportunity(opportunityId: number, tenantId: string) {
    const estimates = await prisma.opportunityCostEstimate.findMany({
      where: { opportunityId, tenantId },
      include: {
        lineItems: { orderBy: { sortOrder: 'asc' } },
        createdBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return estimates;
  }

  /**
   * Get a single estimate by ID
   */
  async getEstimateById(id: number, tenantId: string) {
    const estimate = await prisma.opportunityCostEstimate.findFirst({
      where: { id, tenantId },
      include: {
        lineItems: { orderBy: { sortOrder: 'asc' } },
        createdBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true, email: true } },
        opportunity: {
          select: {
            id: true,
            name: true,
            description: true,
            amount: true,
            account: { select: { id: true, name: true } },
          },
        },
      },
    });

    return estimate;
  }

  /**
   * Update an estimate
   */
  async updateEstimate(
    id: number,
    tenantId: string,
    input: UpdateEstimateInput,
  ) {
    await prisma.opportunityCostEstimate.update({
      where: { id },
      data: {
        name: input.name,
        estimateType: input.estimateType,
        status: input.status,
        validFrom: input.validFrom,
        validUntil: input.validUntil,
        notes: input.notes,
        internalNotes: input.internalNotes,
        discountPercent: input.discountPercent,
        taxRate: input.taxRate,
        assumptions: input.assumptions,
      },
      include: {
        lineItems: { orderBy: { sortOrder: 'asc' } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    // Recalculate totals
    await this.recalculateTotals(id);

    return this.getEstimateById(id, tenantId);
  }

  /**
   * Delete an estimate
   */
  async deleteEstimate(id: number, tenantId: string) {
    // Verify estimate exists and belongs to tenant
    const estimate = await prisma.opportunityCostEstimate.findFirst({
      where: { id, tenantId },
    });

    if (!estimate) {
      throw new Error('Estimate not found');
    }

    // Delete line items first (cascade should handle this, but being explicit)
    await prisma.estimateLineItem.deleteMany({
      where: { estimateId: id },
    });

    await prisma.opportunityCostEstimate.delete({
      where: { id },
    });

    return { success: true };
  }

  /**
   * Approve an estimate
   */
  async approveEstimate(id: number, tenantId: string, approvedById: number) {
    const estimate = await prisma.opportunityCostEstimate.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById,
        approvedAt: new Date(),
        rejectedById: null,
        rejectedAt: null,
        rejectionReason: null,
      },
      include: {
        lineItems: { orderBy: { sortOrder: 'asc' } },
        createdBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true, email: true } },
      },
    });

    return estimate;
  }

  /**
   * Reject an estimate
   */
  async rejectEstimate(
    id: number,
    tenantId: string,
    rejectedById: number,
    reason?: string,
  ) {
    const estimate = await prisma.opportunityCostEstimate.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedById,
        rejectedAt: new Date(),
        rejectionReason: reason,
        approvedById: null,
        approvedAt: null,
      },
      include: {
        lineItems: { orderBy: { sortOrder: 'asc' } },
        createdBy: { select: { id: true, name: true, email: true } },
        rejectedBy: { select: { id: true, name: true, email: true } },
      },
    });

    return estimate;
  }

  /**
   * Clone an estimate (create new version)
   */
  async cloneEstimate(id: number, tenantId: string, createdById: number) {
    const original = await this.getEstimateById(id, tenantId);

    if (!original) {
      throw new Error('Estimate not found');
    }

    // Create new estimate
    const newEstimate = await prisma.opportunityCostEstimate.create({
      data: {
        opportunityId: original.opportunityId,
        tenantId: original.tenantId,
        createdById,
        name: `${original.name} (Copy)`,
        version: original.version + 1,
        estimateType: original.estimateType,
        status: 'DRAFT',
        validFrom: original.validFrom,
        validUntil: original.validUntil,
        notes: original.notes,
        internalNotes: original.internalNotes,
        discountPercent: original.discountPercent
          ? Number(original.discountPercent)
          : undefined,
        taxRate: original.taxRate,
        assumptions: (original.assumptions as object) || undefined,
        currency: original.currency,
      },
    });

    // Clone line items
    for (const item of original.lineItems) {
      await prisma.estimateLineItem.create({
        data: {
          estimateId: newEstimate.id,
          category: item.category,
          phase: item.phase,
          name: item.name,
          description: item.description,
          unitType: item.unitType,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
          role: item.role,
          hourlyRate: item.hourlyRate,
          estimatedHours: item.estimatedHours,
          sortOrder: item.sortOrder,
        },
      });
    }

    // Recalculate totals for new estimate
    await this.recalculateTotals(newEstimate.id);

    return this.getEstimateById(newEstimate.id, tenantId);
  }

  // ============================================================================
  // LINE ITEM OPERATIONS
  // ============================================================================

  /**
   * Add a line item to an estimate
   */
  async addLineItem(input: CreateLineItemInput) {
    // Calculate total
    const total = new Prisma.Decimal(input.quantity).times(input.unitPrice);

    const lineItem = await prisma.estimateLineItem.create({
      data: {
        estimateId: input.estimateId,
        category: input.category,
        phase: input.phase,
        name: input.name,
        description: input.description,
        unitType: input.unitType || 'unit',
        quantity: input.quantity,
        unitPrice: input.unitPrice,
        total,
        role: input.role,
        hourlyRate: input.hourlyRate,
        estimatedHours: input.estimatedHours,
        aiGenerated: input.aiGenerated || false,
        aiConfidence: input.aiConfidence,
        aiRationale: input.aiRationale,
        sortOrder: input.sortOrder || 0,
      },
    });

    // Recalculate estimate totals
    await this.recalculateTotals(input.estimateId);

    return lineItem;
  }

  /**
   * Update a line item
   */
  async updateLineItem(id: number, input: UpdateLineItemInput) {
    const existing = await prisma.estimateLineItem.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error('Line item not found');
    }

    const quantity = input.quantity ?? existing.quantity.toNumber();
    const unitPrice = input.unitPrice ?? existing.unitPrice.toNumber();
    const total = new Prisma.Decimal(quantity).times(unitPrice);

    const lineItem = await prisma.estimateLineItem.update({
      where: { id },
      data: {
        category: input.category,
        phase: input.phase,
        name: input.name,
        description: input.description,
        unitType: input.unitType,
        quantity: input.quantity,
        unitPrice: input.unitPrice,
        total,
        role: input.role,
        hourlyRate: input.hourlyRate,
        estimatedHours: input.estimatedHours,
        sortOrder: input.sortOrder,
      },
    });

    // Recalculate estimate totals
    await this.recalculateTotals(existing.estimateId);

    return lineItem;
  }

  /**
   * Delete a line item
   */
  async deleteLineItem(id: number) {
    const lineItem = await prisma.estimateLineItem.findUnique({
      where: { id },
    });

    if (!lineItem) {
      throw new Error('Line item not found');
    }

    await prisma.estimateLineItem.delete({
      where: { id },
    });

    // Recalculate estimate totals
    await this.recalculateTotals(lineItem.estimateId);

    return { success: true };
  }

  /**
   * Bulk add line items
   */
  async bulkAddLineItems(
    estimateId: number,
    items: Omit<CreateLineItemInput, 'estimateId'>[],
  ) {
    const lineItems = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const total = new Prisma.Decimal(item.quantity).times(item.unitPrice);

      const lineItem = await prisma.estimateLineItem.create({
        data: {
          estimateId,
          category: item.category,
          phase: item.phase,
          name: item.name,
          description: item.description,
          unitType: item.unitType || 'unit',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total,
          role: item.role,
          hourlyRate: item.hourlyRate,
          estimatedHours: item.estimatedHours,
          aiGenerated: item.aiGenerated || false,
          aiConfidence: item.aiConfidence,
          aiRationale: item.aiRationale,
          sortOrder: item.sortOrder ?? i,
        },
      });

      lineItems.push(lineItem);
    }

    // Recalculate estimate totals
    await this.recalculateTotals(estimateId);

    return lineItems;
  }

  /**
   * Reorder line items
   */
  async reorderLineItems(estimateId: number, itemIds: number[]) {
    for (let i = 0; i < itemIds.length; i++) {
      await prisma.estimateLineItem.update({
        where: { id: itemIds[i] },
        data: { sortOrder: i },
      });
    }

    return { success: true };
  }

  // ============================================================================
  // CALCULATIONS
  // ============================================================================

  /**
   * Recalculate estimate totals based on line items
   */
  private async recalculateTotals(estimateId: number) {
    const estimate = await prisma.opportunityCostEstimate.findUnique({
      where: { id: estimateId },
      include: { lineItems: true },
    });

    if (!estimate) {
      return;
    }

    // Calculate subtotal from line items
    let subtotal = new Prisma.Decimal(0);
    for (const item of estimate.lineItems) {
      subtotal = subtotal.plus(item.total);
    }

    // Calculate discount
    let discountAmount = new Prisma.Decimal(0);
    if (estimate.discountPercent) {
      discountAmount = subtotal.times(estimate.discountPercent).dividedBy(100);
    }

    // Calculate tax
    const afterDiscount = subtotal.minus(discountAmount);
    let taxAmount = new Prisma.Decimal(0);
    if (estimate.taxRate) {
      taxAmount = afterDiscount.times(estimate.taxRate).dividedBy(100);
    }

    // Calculate total
    const total = afterDiscount.plus(taxAmount);

    // Update estimate
    await prisma.opportunityCostEstimate.update({
      where: { id: estimateId },
      data: {
        subtotal,
        discountAmount,
        taxAmount,
        total,
      },
    });
  }

  /**
   * Get estimate summary by category
   */
  async getEstimateSummary(estimateId: number) {
    const lineItems = await prisma.estimateLineItem.findMany({
      where: { estimateId },
    });

    const summary: Record<string, { count: number; total: number }> = {};

    for (const item of lineItems) {
      if (!summary[item.category]) {
        summary[item.category] = { count: 0, total: 0 };
      }
      summary[item.category].count++;
      summary[item.category].total += item.total.toNumber();
    }

    return summary;
  }
}

export const costEstimateService = new CostEstimateService();
