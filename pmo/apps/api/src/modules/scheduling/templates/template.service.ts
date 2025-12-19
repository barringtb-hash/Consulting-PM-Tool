/**
 * Template Service for AI Scheduling
 *
 * Handles applying industry templates to scheduling configurations
 */

import { prisma } from '../../../prisma/client';
import {
  IndustryTemplate,
  industryTemplates,
  templateList,
  getTemplateById,
  getTemplatesByCategory,
} from './industry-templates';

// ============================================================================
// TYPES
// ============================================================================

export interface ApplyTemplateResult {
  success: boolean;
  configId: number;
  template: IndustryTemplate;
  appointmentTypesCreated: number;
  intakeFieldsConfigured: number;
}

export interface TemplatePreview {
  template: IndustryTemplate;
  estimatedSetupTime: string;
  features: string[];
  recommendedFor: string[];
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class TemplateService {
  /**
   * Get all available templates
   */
  async getAllTemplates(): Promise<IndustryTemplate[]> {
    return templateList;
  }

  /**
   * Get a specific template by ID
   */
  async getTemplate(templateId: string): Promise<IndustryTemplate | null> {
    return getTemplateById(templateId);
  }

  /**
   * Get templates by category
   */
  async getTemplatesByCategory(
    category: IndustryTemplate['category'],
  ): Promise<IndustryTemplate[]> {
    return getTemplatesByCategory(category);
  }

  /**
   * Preview a template before applying
   */
  async previewTemplate(templateId: string): Promise<TemplatePreview | null> {
    const template = getTemplateById(templateId);
    if (!template) return null;

    const features = this.extractFeatures(template);
    const recommendedFor = this.getRecommendedFor(template);
    const estimatedSetupTime = this.estimateSetupTime(template);

    return {
      template,
      estimatedSetupTime,
      features,
      recommendedFor,
    };
  }

  /**
   * Apply a template to create a new scheduling configuration for an Account (preferred)
   * @param accountId - The CRM Account ID
   * @param tenantId - Optional tenant ID for multi-tenant support
   * @param customizations - Optional customizations to apply to the template
   */
  async applyTemplateToAccount(
    accountId: number,
    templateId: string,
    options?: {
      tenantId?: string;
      customizations?: Partial<IndustryTemplate['schedulingConfig']>;
    },
  ): Promise<ApplyTemplateResult> {
    const template = getTemplateById(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Merge template defaults with any customizations
    const schedulingConfig = {
      ...template.schedulingConfig,
      ...options?.customizations,
    };

    // Create or update the scheduling config
    const config = await prisma.schedulingConfig.upsert({
      where: {
        accountId,
      },
      create: {
        accountId,
        tenantId: options?.tenantId,
        defaultSlotDurationMin: schedulingConfig.defaultSlotDurationMin,
        bufferBetweenSlotsMin: schedulingConfig.bufferMinutes,
        minAdvanceBookingHours: schedulingConfig.minAdvanceBookingHours,
        maxAdvanceBookingDays: schedulingConfig.maxAdvanceBookingDays,
        allowWalkIns: schedulingConfig.allowWalkIns,
        enableReminders: schedulingConfig.enableReminders,
        reminderHoursBefore: schedulingConfig.reminderHoursBefore,
        requirePhone: schedulingConfig.requirePhone,
        autoConfirm: schedulingConfig.autoConfirm,
        showProviderSelection: template.bookingPageConfig.showProviderSelection,
        showAppointmentTypes: template.bookingPageConfig.showAppointmentTypes,
        requireIntakeForm: template.bookingPageConfig.requireIntakeForm,
        cancellationPolicy: template.bookingPageConfig.cancellationPolicy,
        industryTemplate: template.id,
        templateSettings: {
          templateApplied: template.id,
          templateName: template.name,
          industrySettings: template.industrySettings,
          bookingPageFields: template.bookingPageConfig.customFields,
          providerRoles: template.providerRoles,
        },
        isHipaaEnabled: template.industrySettings.hipaaCompliant === true,
      },
      update: {
        tenantId: options?.tenantId,
        defaultSlotDurationMin: schedulingConfig.defaultSlotDurationMin,
        bufferBetweenSlotsMin: schedulingConfig.bufferMinutes,
        minAdvanceBookingHours: schedulingConfig.minAdvanceBookingHours,
        maxAdvanceBookingDays: schedulingConfig.maxAdvanceBookingDays,
        allowWalkIns: schedulingConfig.allowWalkIns,
        enableReminders: schedulingConfig.enableReminders,
        reminderHoursBefore: schedulingConfig.reminderHoursBefore,
        requirePhone: schedulingConfig.requirePhone,
        autoConfirm: schedulingConfig.autoConfirm,
        showProviderSelection: template.bookingPageConfig.showProviderSelection,
        showAppointmentTypes: template.bookingPageConfig.showAppointmentTypes,
        requireIntakeForm: template.bookingPageConfig.requireIntakeForm,
        cancellationPolicy: template.bookingPageConfig.cancellationPolicy,
        industryTemplate: template.id,
        templateSettings: {
          templateApplied: template.id,
          templateName: template.name,
          industrySettings: template.industrySettings,
          bookingPageFields: template.bookingPageConfig.customFields,
          providerRoles: template.providerRoles,
        },
        isHipaaEnabled: template.industrySettings.hipaaCompliant === true,
      },
    });

    // Create appointment types and intake fields
    let appointmentTypesCreated = 0;
    for (const apptType of template.appointmentTypes) {
      await prisma.appointmentType.upsert({
        where: {
          configId_name: {
            configId: config.id,
            name: apptType.name,
          },
        },
        create: {
          configId: config.id,
          name: apptType.name,
          description: apptType.description,
          durationMinutes: apptType.duration,
          price: apptType.defaultPrice,
          currency: 'USD',
          requiresDeposit: apptType.requiresDeposit || false,
          depositPercent: apptType.depositPercent,
          color: apptType.color,
          isActive: true,
        },
        update: {
          description: apptType.description,
          durationMinutes: apptType.duration,
          price: apptType.defaultPrice,
          requiresDeposit: apptType.requiresDeposit || false,
          depositPercent: apptType.depositPercent,
          color: apptType.color,
        },
      });
      appointmentTypesCreated++;
    }

    // Create intake form fields
    let intakeFieldsConfigured = 0;
    for (const field of template.intakeFormFields) {
      await prisma.schedulingIntakeField.upsert({
        where: {
          configId_fieldName: {
            configId: config.id,
            fieldName: field.name,
          },
        },
        create: {
          configId: config.id,
          fieldName: field.name,
          fieldType: field.type.toUpperCase() as
            | 'TEXT'
            | 'TEXTAREA'
            | 'SELECT'
            | 'CHECKBOX'
            | 'DATE'
            | 'PHONE'
            | 'EMAIL'
            | 'NUMBER',
          label: field.label,
          isRequired: field.required,
          options: field.options || [],
          placeholder: field.placeholder,
          sortOrder: intakeFieldsConfigured,
          isActive: true,
        },
        update: {
          fieldType: field.type.toUpperCase() as
            | 'TEXT'
            | 'TEXTAREA'
            | 'SELECT'
            | 'CHECKBOX'
            | 'DATE'
            | 'PHONE'
            | 'EMAIL'
            | 'NUMBER',
          label: field.label,
          isRequired: field.required,
          options: field.options || [],
          placeholder: field.placeholder,
        },
      });
      intakeFieldsConfigured++;
    }

    return {
      success: true,
      configId: config.id,
      template,
      appointmentTypesCreated,
      intakeFieldsConfigured,
    };
  }

  /**
   * Apply a template to create a new scheduling configuration
   * @param clientId - The Client ID (legacy model)
   * @param tenantId - Optional tenant ID for multi-tenant support
   * @param accountId - Optional Account ID (new CRM model)
   * @deprecated Use applyTemplateToAccount instead
   */
  async applyTemplate(
    clientId: number,
    templateId: string,
    options?: {
      tenantId?: string;
      accountId?: number;
      customizations?: Partial<IndustryTemplate['schedulingConfig']>;
    },
  ): Promise<ApplyTemplateResult> {
    const template = getTemplateById(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Merge template defaults with any customizations
    const schedulingConfig = {
      ...template.schedulingConfig,
      ...options?.customizations,
    };

    // Create or update the scheduling config
    const config = await prisma.schedulingConfig.upsert({
      where: {
        clientId,
      },
      create: {
        clientId,
        tenantId: options?.tenantId,
        accountId: options?.accountId,
        defaultSlotDurationMin: schedulingConfig.defaultSlotDurationMin,
        bufferBetweenSlotsMin: schedulingConfig.bufferMinutes,
        minAdvanceBookingHours: schedulingConfig.minAdvanceBookingHours,
        maxAdvanceBookingDays: schedulingConfig.maxAdvanceBookingDays,
        allowWalkIns: schedulingConfig.allowWalkIns,
        enableReminders: schedulingConfig.enableReminders,
        reminderHoursBefore: schedulingConfig.reminderHoursBefore,
        requirePhone: schedulingConfig.requirePhone,
        autoConfirm: schedulingConfig.autoConfirm,
        // Booking page config
        showProviderSelection: template.bookingPageConfig.showProviderSelection,
        showAppointmentTypes: template.bookingPageConfig.showAppointmentTypes,
        requireIntakeForm: template.bookingPageConfig.requireIntakeForm,
        cancellationPolicy: template.bookingPageConfig.cancellationPolicy,
        // Store template metadata
        industryTemplate: template.id,
        templateSettings: {
          templateApplied: template.id,
          templateName: template.name,
          industrySettings: template.industrySettings,
          bookingPageFields: template.bookingPageConfig.customFields,
          providerRoles: template.providerRoles,
        },
        // HIPAA setting from industry settings
        isHipaaEnabled: template.industrySettings.hipaaCompliant === true,
      },
      update: {
        tenantId: options?.tenantId,
        accountId: options?.accountId,
        defaultSlotDurationMin: schedulingConfig.defaultSlotDurationMin,
        bufferBetweenSlotsMin: schedulingConfig.bufferMinutes,
        minAdvanceBookingHours: schedulingConfig.minAdvanceBookingHours,
        maxAdvanceBookingDays: schedulingConfig.maxAdvanceBookingDays,
        allowWalkIns: schedulingConfig.allowWalkIns,
        enableReminders: schedulingConfig.enableReminders,
        reminderHoursBefore: schedulingConfig.reminderHoursBefore,
        requirePhone: schedulingConfig.requirePhone,
        autoConfirm: schedulingConfig.autoConfirm,
        showProviderSelection: template.bookingPageConfig.showProviderSelection,
        showAppointmentTypes: template.bookingPageConfig.showAppointmentTypes,
        requireIntakeForm: template.bookingPageConfig.requireIntakeForm,
        cancellationPolicy: template.bookingPageConfig.cancellationPolicy,
        industryTemplate: template.id,
        templateSettings: {
          templateApplied: template.id,
          templateName: template.name,
          industrySettings: template.industrySettings,
          bookingPageFields: template.bookingPageConfig.customFields,
          providerRoles: template.providerRoles,
        },
        isHipaaEnabled: template.industrySettings.hipaaCompliant === true,
      },
    });

    // Create appointment types from template
    let appointmentTypesCreated = 0;
    for (const apt of template.appointmentTypes) {
      await prisma.appointmentType.create({
        data: {
          configId: config.id,
          name: apt.name,
          description: apt.description,
          durationMinutes: apt.durationMinutes,
          price: apt.price,
          color: apt.color,
          requiresDeposit: apt.requiresDeposit,
          depositPercent: apt.depositPercent,
          isActive: true,
        },
      });
      appointmentTypesCreated++;
    }

    // Configure intake form fields
    let intakeFieldsConfigured = 0;
    for (const field of template.intakeFormFields) {
      await prisma.schedulingIntakeField.create({
        data: {
          configId: config.id,
          name: field.name,
          type: field.type,
          label: field.label,
          required: field.required,
          options: field.options || [],
          placeholder: field.placeholder,
          sortOrder: intakeFieldsConfigured,
          isActive: true,
        },
      });
      intakeFieldsConfigured++;
    }

    return {
      success: true,
      configId: config.id,
      template,
      appointmentTypesCreated,
      intakeFieldsConfigured,
    };
  }

  /**
   * Reset an account config to template defaults
   */
  async resetToTemplateDefaultsByAccount(
    accountId: number,
    templateId: string,
  ): Promise<ApplyTemplateResult> {
    const config = await prisma.schedulingConfig.findUnique({
      where: { accountId },
    });

    if (!config) {
      throw new Error('Scheduling config not found');
    }

    // Delete existing appointment types and intake fields
    await prisma.appointmentType.deleteMany({
      where: { configId: config.id },
    });

    await prisma.schedulingIntakeField.deleteMany({
      where: { configId: config.id },
    });

    // Re-apply the template
    return this.applyTemplateToAccount(accountId, templateId, {
      tenantId: config.tenantId || undefined,
    });
  }

  /**
   * Reset a config to template defaults
   * @deprecated Use resetToTemplateDefaultsByAccount instead
   */
  async resetToTemplateDefaults(
    clientId: number,
    templateId: string,
  ): Promise<ApplyTemplateResult> {
    const config = await prisma.schedulingConfig.findUnique({
      where: { clientId },
    });

    if (!config) {
      throw new Error('Scheduling config not found');
    }

    // Delete existing appointment types and intake fields
    await prisma.appointmentType.deleteMany({
      where: { configId: config.id },
    });

    await prisma.schedulingIntakeField.deleteMany({
      where: { configId: config.id },
    });

    // Re-apply the template
    return this.applyTemplate(clientId, templateId, {
      tenantId: config.tenantId || undefined,
      accountId: config.accountId || undefined,
    });
  }

  /**
   * Compare current config with template defaults
   */
  async compareWithTemplate(
    clientId: number,
    templateId: string,
  ): Promise<{
    differences: Array<{
      field: string;
      currentValue: unknown;
      templateValue: unknown;
    }>;
    appointmentTypeDiff: {
      current: number;
      template: number;
    };
    intakeFieldDiff: {
      current: number;
      template: number;
    };
  }> {
    const template = getTemplateById(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const config = await prisma.schedulingConfig.findUnique({
      where: { clientId },
      include: {
        appointmentTypes: true,
        intakeFormFields: true,
      },
    });

    if (!config) {
      throw new Error('Scheduling config not found');
    }

    const differences: Array<{
      field: string;
      currentValue: unknown;
      templateValue: unknown;
    }> = [];

    // Map schema fields to template fields
    const fieldMappings: Array<{
      schemaField: keyof typeof config;
      templateField: keyof typeof template.schedulingConfig;
    }> = [
      {
        schemaField: 'defaultSlotDurationMin',
        templateField: 'defaultSlotDurationMin',
      },
      { schemaField: 'bufferBetweenSlotsMin', templateField: 'bufferMinutes' },
      {
        schemaField: 'minAdvanceBookingHours',
        templateField: 'minAdvanceBookingHours',
      },
      {
        schemaField: 'maxAdvanceBookingDays',
        templateField: 'maxAdvanceBookingDays',
      },
      { schemaField: 'allowWalkIns', templateField: 'allowWalkIns' },
      { schemaField: 'enableReminders', templateField: 'enableReminders' },
      { schemaField: 'requirePhone', templateField: 'requirePhone' },
      { schemaField: 'autoConfirm', templateField: 'autoConfirm' },
    ];

    for (const mapping of fieldMappings) {
      const currentValue = config[mapping.schemaField];
      const templateValue = template.schedulingConfig[mapping.templateField];
      if (currentValue !== templateValue) {
        differences.push({
          field: mapping.schemaField,
          currentValue,
          templateValue,
        });
      }
    }

    return {
      differences,
      appointmentTypeDiff: {
        current: config.appointmentTypes.length,
        template: template.appointmentTypes.length,
      },
      intakeFieldDiff: {
        current: config.intakeFormFields.length,
        template: template.intakeFormFields.length,
      },
    };
  }

  /**
   * Get the template applied to a config by Account ID
   */
  async getAppliedTemplateByAccount(
    accountId: number,
  ): Promise<IndustryTemplate | null> {
    const config = await prisma.schedulingConfig.findUnique({
      where: { accountId },
      select: { industryTemplate: true },
    });

    if (!config?.industryTemplate) {
      return null;
    }

    return getTemplateById(config.industryTemplate);
  }

  /**
   * Get the template applied to a config
   * @deprecated Use getAppliedTemplateByAccount instead
   */
  async getAppliedTemplate(clientId: number): Promise<IndustryTemplate | null> {
    const config = await prisma.schedulingConfig.findUnique({
      where: { clientId },
      select: { industryTemplate: true },
    });

    if (!config?.industryTemplate) {
      return null;
    }

    return getTemplateById(config.industryTemplate);
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private extractFeatures(template: IndustryTemplate): string[] {
    const features: string[] = [];

    if (template.schedulingConfig.allowWalkIns) {
      features.push('Walk-in support');
    }
    if (template.schedulingConfig.enableReminders) {
      features.push('Automated reminders');
    }
    if (template.schedulingConfig.autoConfirm) {
      features.push('Auto-confirmation');
    } else {
      features.push('Manual approval required');
    }
    if (template.bookingPageConfig.showProviderSelection) {
      features.push('Provider selection');
    }
    if (template.bookingPageConfig.requireIntakeForm) {
      features.push('Intake forms');
    }

    // Check for deposits
    const hasDeposits = template.appointmentTypes.some(
      (a) => a.requiresDeposit,
    );
    if (hasDeposits) {
      features.push('Deposit payments');
    }

    // Industry-specific features
    const settings = template.industrySettings;
    if (settings.hipaaCompliant) features.push('HIPAA-ready');
    if (settings.supportsTelehealth) features.push('Telehealth support');
    if (settings.supportsWalkIns) features.push('Walk-in management');
    if (settings.supportsWaitlist) features.push('Waitlist');
    if (settings.enablesDispatch) features.push('Dispatch routing');
    if (settings.supportsTableManagement) features.push('Table management');

    return features;
  }

  private getRecommendedFor(template: IndustryTemplate): string[] {
    const recommendations: Record<string, string[]> = {
      healthcare: [
        'Medical clinics',
        'Dental offices',
        'Therapy practices',
        'Telehealth providers',
        'Urgent care centers',
      ],
      professional_services: [
        'Law firms',
        'Accounting firms',
        'Financial advisors',
        'Consulting agencies',
        'Business coaches',
      ],
      home_services: [
        'Plumbing companies',
        'HVAC contractors',
        'Electricians',
        'Appliance repair',
        'Handyman services',
      ],
      beauty_wellness: [
        'Hair salons',
        'Barbershops',
        'Spas',
        'Nail salons',
        'Fitness studios',
        'Massage therapists',
      ],
      restaurant: [
        'Fine dining',
        'Casual restaurants',
        'Cafes',
        'Wine bars',
        'Private event venues',
      ],
    };

    return recommendations[template.id] || [];
  }

  private estimateSetupTime(template: IndustryTemplate): string {
    const appointmentCount = template.appointmentTypes.length;
    const fieldCount = template.intakeFormFields.length;
    const complexity =
      appointmentCount * 2 + fieldCount + (template.providerRoles?.length || 0);

    if (complexity < 10) return '5-10 minutes';
    if (complexity < 20) return '10-15 minutes';
    return '15-20 minutes';
  }
}

// Export singleton instance
export const templateService = new TemplateService();

// Re-export types and utilities from industry-templates
export {
  industryTemplates,
  templateList,
  getTemplateById,
  getTemplatesByCategory,
};
export type { IndustryTemplate };
