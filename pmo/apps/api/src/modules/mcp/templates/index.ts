/**
 * Project Templates Module
 *
 * Exports project template configurations for AI-assisted project creation.
 */

export {
  PROJECT_TEMPLATES,
  getProjectTemplate,
  listProjectTemplates,
  calculateTemplateDates,
} from './project-templates';

export type {
  ProjectTemplate,
  MilestoneTemplate,
  TaskTemplate,
} from './project-templates';
