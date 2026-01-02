/**
 * Document Templates Registry
 * Central export for all project document templates
 */

import { ProjectDocumentType, ProjectDocumentCategory } from '@prisma/client';
import type { DocumentTemplate } from './types';
import { coreTemplates } from './core-templates';
import { lifecycleTemplates } from './lifecycle-templates';
import { aiTemplates } from './ai-templates';

// Export all types
export * from './types';

// Export individual template collections
export { coreTemplates } from './core-templates';
export { lifecycleTemplates } from './lifecycle-templates';
export { aiTemplates } from './ai-templates';

// All templates combined
export const allTemplates: DocumentTemplate[] = [
  ...coreTemplates,
  ...lifecycleTemplates,
  ...aiTemplates,
];

// Template lookup by type
export const templateByType: Record<ProjectDocumentType, DocumentTemplate> =
  allTemplates.reduce(
    (acc, template) => {
      acc[template.type] = template;
      return acc;
    },
    {} as Record<ProjectDocumentType, DocumentTemplate>,
  );

// Templates grouped by category
export const templatesByCategory: Record<
  ProjectDocumentCategory,
  DocumentTemplate[]
> = {
  [ProjectDocumentCategory.CORE]: coreTemplates,
  [ProjectDocumentCategory.LIFECYCLE]: lifecycleTemplates,
  [ProjectDocumentCategory.AI_SPECIFIC]: aiTemplates,
};

/**
 * Get a template by type
 */
export function getTemplate(
  type: ProjectDocumentType,
): DocumentTemplate | undefined {
  return templateByType[type];
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(
  category: ProjectDocumentCategory,
): DocumentTemplate[] {
  return templatesByCategory[category];
}

/**
 * Get default content for a document type
 */
export function getDefaultContent(
  type: ProjectDocumentType,
): Record<string, unknown> {
  const template = getTemplate(type);
  if (!template) {
    throw new Error(`Unknown document type: ${type}`);
  }
  // Return a deep copy to prevent mutation
  return JSON.parse(JSON.stringify(template.defaultContent));
}

/**
 * Get category for a document type
 */
export function getCategoryForType(
  type: ProjectDocumentType,
): ProjectDocumentCategory {
  const template = getTemplate(type);
  if (!template) {
    throw new Error(`Unknown document type: ${type}`);
  }
  return template.category;
}

/**
 * Template metadata for UI display
 */
export interface TemplateInfo {
  type: ProjectDocumentType;
  name: string;
  description: string;
  category: ProjectDocumentCategory;
  categoryLabel: string;
}

/**
 * Get all template info for UI display
 */
export function getAllTemplateInfo(): TemplateInfo[] {
  const categoryLabels: Record<ProjectDocumentCategory, string> = {
    [ProjectDocumentCategory.CORE]: 'Core Project Documents',
    [ProjectDocumentCategory.LIFECYCLE]: 'Project Lifecycle',
    [ProjectDocumentCategory.AI_SPECIFIC]: 'AI Project-Specific',
  };

  return allTemplates.map((template) => ({
    type: template.type,
    name: template.name,
    description: template.description,
    category: template.category,
    categoryLabel: categoryLabels[template.category],
  }));
}
