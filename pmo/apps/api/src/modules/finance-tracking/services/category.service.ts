/**
 * Expense Category Service
 *
 * Business logic for managing expense categories.
 * Supports hierarchical categories and system defaults.
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../../../prisma/client';
import { getTenantId } from '../../../tenant/tenant.context';
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
  ListCategoriesInput,
} from '../../../validation/finance';

// ============================================================================
// DEFAULT CATEGORIES (seeded on first access)
// ============================================================================

const DEFAULT_CATEGORIES = [
  // Tech Stack
  {
    name: 'Cloud Infrastructure',
    icon: 'cloud',
    color: '#3B82F6',
    isSystem: true,
  },
  { name: 'Software Licenses', icon: 'key', color: '#8B5CF6', isSystem: true },
  {
    name: 'SaaS Subscriptions',
    icon: 'package',
    color: '#EC4899',
    isSystem: true,
  },
  { name: 'Development Tools', icon: 'code', color: '#10B981', isSystem: true },
  {
    name: 'Hosting & Domains',
    icon: 'globe',
    color: '#F59E0B',
    isSystem: true,
  },

  // Personnel
  { name: 'Salaries & Wages', icon: 'users', color: '#6366F1', isSystem: true },
  {
    name: 'Employee Benefits',
    icon: 'heart',
    color: '#EF4444',
    isSystem: true,
  },
  { name: 'Contractors', icon: 'briefcase', color: '#14B8A6', isSystem: true },
  {
    name: 'Training & Education',
    icon: 'graduation-cap',
    color: '#F97316',
    isSystem: true,
  },

  // Operations
  { name: 'Office Rent', icon: 'building', color: '#64748B', isSystem: true },
  { name: 'Utilities', icon: 'zap', color: '#FBBF24', isSystem: true },
  { name: 'Equipment', icon: 'monitor', color: '#84CC16', isSystem: true },
  { name: 'Travel', icon: 'plane', color: '#06B6D4', isSystem: true },
  {
    name: 'Meals & Entertainment',
    icon: 'utensils',
    color: '#F43F5E',
    isSystem: true,
  },

  // Business
  { name: 'Marketing', icon: 'megaphone', color: '#A855F7', isSystem: true },
  { name: 'Sales', icon: 'trending-up', color: '#22C55E', isSystem: true },
  { name: 'Legal', icon: 'scale', color: '#6B7280', isSystem: true },
  { name: 'Insurance', icon: 'shield', color: '#0EA5E9', isSystem: true },
  {
    name: 'Professional Services',
    icon: 'briefcase',
    color: '#D946EF',
    isSystem: true,
  },

  // Customer
  {
    name: 'Customer Delivery',
    icon: 'truck',
    color: '#2563EB',
    isSystem: true,
  },
  {
    name: 'Customer Support',
    icon: 'headphones',
    color: '#7C3AED',
    isSystem: true,
  },
  { name: 'Customer Success', icon: 'star', color: '#FACC15', isSystem: true },

  // Other
  { name: 'Miscellaneous', icon: 'folder', color: '#9CA3AF', isSystem: true },
];

// ============================================================================
// CATEGORY SERVICE
// ============================================================================

export async function ensureDefaultCategories(): Promise<void> {
  const tenantId = getTenantId();

  // Check if categories already exist for this tenant
  const existingCount = await prisma.expenseCategory.count({
    where: { tenantId, isSystem: true },
  });

  if (existingCount > 0) {
    return;
  }

  // Create default categories
  await prisma.expenseCategory.createMany({
    data: DEFAULT_CATEGORIES.map((cat) => ({
      ...cat,
      tenantId,
    })),
    skipDuplicates: true,
  });
}

export async function listCategories(
  params: ListCategoriesInput = {},
): Promise<{
  categories: Prisma.ExpenseCategoryGetPayload<object>[];
  total: number;
}> {
  const tenantId = getTenantId();
  const { includeInactive = false, parentId } = params;

  // Ensure default categories exist
  await ensureDefaultCategories();

  const where: Prisma.ExpenseCategoryWhereInput = {
    tenantId,
    ...(includeInactive ? {} : { isActive: true }),
    ...(parentId !== undefined ? { parentId } : {}),
  };

  const [categories, total] = await Promise.all([
    prisma.expenseCategory.findMany({
      where,
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
      include: {
        children: {
          where: includeInactive ? {} : { isActive: true },
          orderBy: { name: 'asc' },
        },
        _count: {
          select: { expenses: true, budgets: true, recurringCosts: true },
        },
      },
    }),
    prisma.expenseCategory.count({ where }),
  ]);

  return { categories, total };
}

export async function getCategoryById(
  id: number,
): Promise<Prisma.ExpenseCategoryGetPayload<{
  include: {
    children: true;
    parent: true;
    _count: { select: { expenses: true } };
  };
}> | null> {
  const tenantId = getTenantId();

  return prisma.expenseCategory.findFirst({
    where: { id, tenantId },
    include: {
      children: { orderBy: { name: 'asc' } },
      parent: true,
      _count: {
        select: { expenses: true, budgets: true, recurringCosts: true },
      },
    },
  });
}

export async function createCategory(
  input: CreateCategoryInput,
): Promise<Prisma.ExpenseCategoryGetPayload<object>> {
  const tenantId = getTenantId();

  // Validate parent exists if provided
  if (input.parentId) {
    const parent = await prisma.expenseCategory.findFirst({
      where: { id: input.parentId, tenantId },
    });
    if (!parent) {
      throw new Error('Parent category not found');
    }
  }

  return prisma.expenseCategory.create({
    data: {
      tenantId,
      name: input.name,
      description: input.description,
      color: input.color,
      icon: input.icon,
      parentId: input.parentId,
      isSystem: false,
    },
  });
}

export async function updateCategory(
  id: number,
  input: UpdateCategoryInput,
): Promise<Prisma.ExpenseCategoryGetPayload<object>> {
  const tenantId = getTenantId();

  const existing = await prisma.expenseCategory.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    throw new Error('Category not found');
  }

  // System categories can only have limited updates
  if (existing.isSystem) {
    const { isActive: _isActive, ...rest } = input;
    if (Object.keys(rest).length > 0) {
      throw new Error('System categories can only be activated/deactivated');
    }
  }

  // Validate parent if being changed
  if (input.parentId !== undefined && input.parentId !== existing.parentId) {
    if (input.parentId === id) {
      throw new Error('Category cannot be its own parent');
    }
    if (input.parentId) {
      const parent = await prisma.expenseCategory.findFirst({
        where: { id: input.parentId, tenantId },
      });
      if (!parent) {
        throw new Error('Parent category not found');
      }
    }
  }

  return prisma.expenseCategory.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description,
      color: input.color,
      icon: input.icon,
      parentId: input.parentId,
      isActive: input.isActive,
    },
  });
}

export async function deleteCategory(id: number): Promise<void> {
  const tenantId = getTenantId();

  const existing = await prisma.expenseCategory.findFirst({
    where: { id, tenantId },
    include: {
      _count: {
        select: {
          expenses: true,
          budgets: true,
          recurringCosts: true,
          children: true,
        },
      },
    },
  });

  if (!existing) {
    throw new Error('Category not found');
  }

  if (existing.isSystem) {
    throw new Error('System categories cannot be deleted');
  }

  const totalUsage =
    existing._count.expenses +
    existing._count.budgets +
    existing._count.recurringCosts +
    existing._count.children;

  if (totalUsage > 0) {
    throw new Error(
      'Category is in use and cannot be deleted. Deactivate it instead.',
    );
  }

  await prisma.expenseCategory.delete({ where: { id } });
}
