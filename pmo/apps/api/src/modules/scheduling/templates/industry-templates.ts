/**
 * Industry Templates for AI Scheduling
 *
 * Pre-configured scheduling setups for different industries:
 * 1. Healthcare - Medical appointments with HIPAA-ready features
 * 2. Professional Services - Consultations for legal, financial, etc.
 * 3. Home Services - Service calls, estimates, installations
 * 4. Beauty/Wellness - Salons, spas, fitness studios
 * 5. Restaurant - Table reservations and management
 */

// ============================================================================
// TYPES
// ============================================================================

export interface IndustryTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category:
    | 'healthcare'
    | 'professional'
    | 'home_services'
    | 'beauty'
    | 'restaurant';

  // Scheduling Config Defaults
  schedulingConfig: {
    defaultSlotDurationMin: number;
    bufferMinutes: number;
    minAdvanceBookingHours: number;
    maxAdvanceBookingDays: number;
    allowWalkIns: boolean;
    enableReminders: boolean;
    reminderHoursBefore: number[];
    requirePhone: boolean;
    autoConfirm: boolean;
  };

  // Booking Page Defaults
  bookingPageConfig: {
    showProviderSelection: boolean;
    showAppointmentTypes: boolean;
    requireIntakeForm: boolean;
    cancellationPolicy: string;
    customFields: string[];
  };

  // Default Appointment Types
  appointmentTypes: {
    name: string;
    description: string;
    durationMinutes: number;
    price: number | null;
    color: string;
    requiresDeposit: boolean;
    depositPercent: number | null;
  }[];

  // Default Provider Roles (if applicable)
  providerRoles?: string[];

  // Default Intake Form Fields
  intakeFormFields: {
    name: string;
    type:
      | 'text'
      | 'email'
      | 'phone'
      | 'textarea'
      | 'select'
      | 'checkbox'
      | 'date';
    label: string;
    required: boolean;
    options?: string[];
    placeholder?: string;
  }[];

  // Industry-specific settings
  industrySettings: Record<string, unknown>;
}

// ============================================================================
// HEALTHCARE TEMPLATE
// ============================================================================

export const healthcareTemplate: IndustryTemplate = {
  id: 'healthcare',
  name: 'Healthcare & Medical',
  description:
    'Medical appointments, telehealth, and patient scheduling with HIPAA-ready features',
  icon: 'stethoscope',
  category: 'healthcare',

  schedulingConfig: {
    defaultSlotDurationMin: 30,
    bufferMinutes: 15,
    minAdvanceBookingHours: 24,
    maxAdvanceBookingDays: 90,
    allowWalkIns: false,
    enableReminders: true,
    reminderHoursBefore: [48, 24, 2],
    requirePhone: true,
    autoConfirm: false, // Requires staff confirmation
  },

  bookingPageConfig: {
    showProviderSelection: true,
    showAppointmentTypes: true,
    requireIntakeForm: true,
    cancellationPolicy:
      'Please cancel at least 24 hours in advance to avoid a cancellation fee.',
    customFields: ['insurance_provider', 'insurance_id', 'date_of_birth'],
  },

  appointmentTypes: [
    {
      name: 'New Patient Visit',
      description: 'Initial consultation for new patients',
      durationMinutes: 60,
      price: null, // Insurance-based
      color: '#3B82F6',
      requiresDeposit: false,
      depositPercent: null,
    },
    {
      name: 'Follow-up Visit',
      description: 'Follow-up appointment for existing patients',
      durationMinutes: 30,
      price: null,
      color: '#10B981',
      requiresDeposit: false,
      depositPercent: null,
    },
    {
      name: 'Annual Physical',
      description: 'Comprehensive annual wellness exam',
      durationMinutes: 45,
      price: null,
      color: '#6366F1',
      requiresDeposit: false,
      depositPercent: null,
    },
    {
      name: 'Telehealth Consultation',
      description: 'Virtual video consultation',
      durationMinutes: 20,
      price: 75,
      color: '#8B5CF6',
      requiresDeposit: true,
      depositPercent: 100,
    },
    {
      name: 'Urgent Care Visit',
      description: 'Same-day urgent care appointment',
      durationMinutes: 30,
      price: null,
      color: '#EF4444',
      requiresDeposit: false,
      depositPercent: null,
    },
  ],

  providerRoles: [
    'Physician',
    'Nurse Practitioner',
    'Physician Assistant',
    'Registered Nurse',
    'Medical Assistant',
  ],

  intakeFormFields: [
    {
      name: 'date_of_birth',
      type: 'date',
      label: 'Date of Birth',
      required: true,
    },
    {
      name: 'insurance_provider',
      type: 'text',
      label: 'Insurance Provider',
      required: false,
      placeholder: 'e.g., Blue Cross Blue Shield',
    },
    {
      name: 'insurance_id',
      type: 'text',
      label: 'Insurance Member ID',
      required: false,
      placeholder: 'Your member ID number',
    },
    {
      name: 'reason_for_visit',
      type: 'textarea',
      label: 'Reason for Visit',
      required: true,
      placeholder:
        'Please describe your symptoms or reason for this appointment',
    },
    {
      name: 'current_medications',
      type: 'textarea',
      label: 'Current Medications',
      required: false,
      placeholder: 'List any medications you are currently taking',
    },
    {
      name: 'allergies',
      type: 'textarea',
      label: 'Allergies',
      required: false,
      placeholder: 'List any known allergies',
    },
    {
      name: 'emergency_contact',
      type: 'text',
      label: 'Emergency Contact Name & Phone',
      required: true,
    },
  ],

  industrySettings: {
    hipaaCompliant: true,
    requiresPatientPortal: true,
    supportsInsuranceVerification: true,
    supportsTelehealth: true,
    requiresConsentForms: true,
  },
};

// ============================================================================
// PROFESSIONAL SERVICES TEMPLATE
// ============================================================================

export const professionalServicesTemplate: IndustryTemplate = {
  id: 'professional_services',
  name: 'Professional Services',
  description:
    'Consultations for legal, financial, accounting, and business services',
  icon: 'briefcase',
  category: 'professional',

  schedulingConfig: {
    defaultSlotDurationMin: 60,
    bufferMinutes: 15,
    minAdvanceBookingHours: 48,
    maxAdvanceBookingDays: 60,
    allowWalkIns: false,
    enableReminders: true,
    reminderHoursBefore: [24, 2],
    requirePhone: true,
    autoConfirm: false,
  },

  bookingPageConfig: {
    showProviderSelection: true,
    showAppointmentTypes: true,
    requireIntakeForm: true,
    cancellationPolicy:
      'Cancellations must be made at least 48 hours in advance. Late cancellations may be subject to a fee.',
    customFields: ['company_name', 'referral_source'],
  },

  appointmentTypes: [
    {
      name: 'Initial Consultation',
      description: 'Free initial consultation to discuss your needs',
      durationMinutes: 30,
      price: 0,
      color: '#3B82F6',
      requiresDeposit: false,
      depositPercent: null,
    },
    {
      name: 'Strategy Session',
      description: 'In-depth strategy and planning session',
      durationMinutes: 90,
      price: 250,
      color: '#10B981',
      requiresDeposit: true,
      depositPercent: 50,
    },
    {
      name: 'Standard Consultation',
      description: 'Regular consultation session',
      durationMinutes: 60,
      price: 150,
      color: '#6366F1',
      requiresDeposit: false,
      depositPercent: null,
    },
    {
      name: 'Document Review',
      description: 'Review and consultation on documents',
      durationMinutes: 45,
      price: 125,
      color: '#F59E0B',
      requiresDeposit: false,
      depositPercent: null,
    },
    {
      name: 'Virtual Meeting',
      description: 'Video conference consultation',
      durationMinutes: 30,
      price: 75,
      color: '#8B5CF6',
      requiresDeposit: true,
      depositPercent: 100,
    },
  ],

  providerRoles: [
    'Partner',
    'Senior Associate',
    'Associate',
    'Consultant',
    'Advisor',
  ],

  intakeFormFields: [
    {
      name: 'company_name',
      type: 'text',
      label: 'Company/Organization Name',
      required: false,
      placeholder: 'If applicable',
    },
    {
      name: 'service_type',
      type: 'select',
      label: 'Type of Service Needed',
      required: true,
      options: [
        'Legal',
        'Financial',
        'Tax/Accounting',
        'Business Consulting',
        'Other',
      ],
    },
    {
      name: 'matter_description',
      type: 'textarea',
      label: 'Brief Description of Your Matter',
      required: true,
      placeholder: 'Please describe what you would like to discuss',
    },
    {
      name: 'urgency',
      type: 'select',
      label: 'Urgency Level',
      required: true,
      options: ['Not Urgent', 'Within 2 Weeks', 'Within 1 Week', 'Urgent'],
    },
    {
      name: 'referral_source',
      type: 'select',
      label: 'How did you hear about us?',
      required: false,
      options: [
        'Referral',
        'Google Search',
        'Social Media',
        'Website',
        'Other',
      ],
    },
    {
      name: 'preferred_contact',
      type: 'select',
      label: 'Preferred Contact Method',
      required: true,
      options: ['Email', 'Phone', 'Either'],
    },
  ],

  industrySettings: {
    requiresClientIntake: true,
    supportsConflictCheck: true,
    billingByHour: true,
    requiresEngagementLetter: true,
    supportsRetainer: true,
  },
};

// ============================================================================
// HOME SERVICES TEMPLATE
// ============================================================================

export const homeServicesTemplate: IndustryTemplate = {
  id: 'home_services',
  name: 'Home Services',
  description:
    'Service calls, estimates, and installations for plumbing, HVAC, electrical, and more',
  icon: 'wrench',
  category: 'home_services',

  schedulingConfig: {
    defaultSlotDurationMin: 120, // 2-hour service windows
    bufferMinutes: 30,
    minAdvanceBookingHours: 4,
    maxAdvanceBookingDays: 30,
    allowWalkIns: false,
    enableReminders: true,
    reminderHoursBefore: [24, 2],
    requirePhone: true,
    autoConfirm: true,
  },

  bookingPageConfig: {
    showProviderSelection: false, // Dispatch assigns technician
    showAppointmentTypes: true,
    requireIntakeForm: true,
    cancellationPolicy:
      'Please cancel at least 4 hours in advance to avoid a service call fee.',
    customFields: ['service_address', 'property_type'],
  },

  appointmentTypes: [
    {
      name: 'Free Estimate',
      description: 'On-site estimate for your project',
      durationMinutes: 60,
      price: 0,
      color: '#10B981',
      requiresDeposit: false,
      depositPercent: null,
    },
    {
      name: 'Service Call',
      description: 'Diagnostic and repair service',
      durationMinutes: 120,
      price: 89,
      color: '#3B82F6',
      requiresDeposit: false,
      depositPercent: null,
    },
    {
      name: 'Emergency Service',
      description: '24/7 emergency repair service',
      durationMinutes: 120,
      price: 149,
      color: '#EF4444',
      requiresDeposit: false,
      depositPercent: null,
    },
    {
      name: 'Maintenance Visit',
      description: 'Scheduled maintenance and inspection',
      durationMinutes: 90,
      price: 75,
      color: '#F59E0B',
      requiresDeposit: false,
      depositPercent: null,
    },
    {
      name: 'Installation',
      description: 'Equipment installation appointment',
      durationMinutes: 240,
      price: null, // Quote-based
      color: '#6366F1',
      requiresDeposit: true,
      depositPercent: 25,
    },
  ],

  providerRoles: [
    'Lead Technician',
    'Service Technician',
    'Apprentice',
    'Estimator',
  ],

  intakeFormFields: [
    {
      name: 'service_address',
      type: 'textarea',
      label: 'Service Address',
      required: true,
      placeholder: 'Full address where service is needed',
    },
    {
      name: 'property_type',
      type: 'select',
      label: 'Property Type',
      required: true,
      options: [
        'Single Family Home',
        'Townhouse',
        'Condo/Apartment',
        'Commercial',
        'Other',
      ],
    },
    {
      name: 'service_category',
      type: 'select',
      label: 'Service Category',
      required: true,
      options: [
        'Plumbing',
        'HVAC',
        'Electrical',
        'Appliance Repair',
        'Handyman',
        'Other',
      ],
    },
    {
      name: 'problem_description',
      type: 'textarea',
      label: 'Describe the Problem',
      required: true,
      placeholder: 'Please describe the issue you are experiencing',
    },
    {
      name: 'preferred_time',
      type: 'select',
      label: 'Preferred Time Window',
      required: true,
      options: ['Morning (8am-12pm)', 'Afternoon (12pm-5pm)', 'Flexible'],
    },
    {
      name: 'access_instructions',
      type: 'textarea',
      label: 'Access Instructions',
      required: false,
      placeholder: 'Gate codes, parking instructions, etc.',
    },
    {
      name: 'pets_on_site',
      type: 'checkbox',
      label: 'Pets will be on site',
      required: false,
    },
  ],

  industrySettings: {
    requiresServiceArea: true,
    supportsServiceWindows: true,
    enablesDispatch: true,
    supportsEmergency: true,
    requiresServiceAddress: true,
    tracksEquipment: true,
  },
};

// ============================================================================
// BEAUTY & WELLNESS TEMPLATE
// ============================================================================

export const beautyWellnessTemplate: IndustryTemplate = {
  id: 'beauty_wellness',
  name: 'Beauty & Wellness',
  description:
    'Salons, spas, barbershops, fitness studios, and wellness centers',
  icon: 'sparkles',
  category: 'beauty',

  schedulingConfig: {
    defaultSlotDurationMin: 60,
    bufferMinutes: 15,
    minAdvanceBookingHours: 2,
    maxAdvanceBookingDays: 60,
    allowWalkIns: true,
    enableReminders: true,
    reminderHoursBefore: [24, 2],
    requirePhone: true,
    autoConfirm: true,
  },

  bookingPageConfig: {
    showProviderSelection: true,
    showAppointmentTypes: true,
    requireIntakeForm: false,
    cancellationPolicy:
      'Please cancel at least 24 hours in advance. Late cancellations or no-shows may be charged 50% of the service price.',
    customFields: [],
  },

  appointmentTypes: [
    {
      name: 'Haircut',
      description: 'Professional haircut and styling',
      durationMinutes: 45,
      price: 45,
      color: '#EC4899',
      requiresDeposit: false,
      depositPercent: null,
    },
    {
      name: 'Color Service',
      description: 'Hair coloring and highlights',
      durationMinutes: 120,
      price: 125,
      color: '#8B5CF6',
      requiresDeposit: true,
      depositPercent: 50,
    },
    {
      name: 'Blowout',
      description: 'Professional blowout styling',
      durationMinutes: 45,
      price: 40,
      color: '#F59E0B',
      requiresDeposit: false,
      depositPercent: null,
    },
    {
      name: 'Facial',
      description: 'Rejuvenating facial treatment',
      durationMinutes: 60,
      price: 85,
      color: '#10B981',
      requiresDeposit: false,
      depositPercent: null,
    },
    {
      name: 'Massage',
      description: 'Relaxing massage therapy',
      durationMinutes: 60,
      price: 95,
      color: '#3B82F6',
      requiresDeposit: true,
      depositPercent: 25,
    },
    {
      name: 'Manicure',
      description: 'Classic manicure service',
      durationMinutes: 30,
      price: 30,
      color: '#EF4444',
      requiresDeposit: false,
      depositPercent: null,
    },
    {
      name: 'Pedicure',
      description: 'Classic pedicure service',
      durationMinutes: 45,
      price: 45,
      color: '#6366F1',
      requiresDeposit: false,
      depositPercent: null,
    },
    {
      name: 'Waxing',
      description: 'Professional waxing service',
      durationMinutes: 30,
      price: 35,
      color: '#F97316',
      requiresDeposit: false,
      depositPercent: null,
    },
  ],

  providerRoles: [
    'Senior Stylist',
    'Stylist',
    'Junior Stylist',
    'Colorist',
    'Esthetician',
    'Massage Therapist',
    'Nail Technician',
  ],

  intakeFormFields: [
    {
      name: 'new_client',
      type: 'checkbox',
      label: 'I am a new client',
      required: false,
    },
    {
      name: 'service_notes',
      type: 'textarea',
      label: 'Special Requests or Notes',
      required: false,
      placeholder: 'Any specific requests or things we should know',
    },
    {
      name: 'allergies',
      type: 'textarea',
      label: 'Allergies or Sensitivities',
      required: false,
      placeholder: 'Please list any product allergies',
    },
  ],

  industrySettings: {
    supportsWalkIns: true,
    supportsPackages: true,
    supportsMemberships: true,
    enablesWaitlist: true,
    supportsMultipleServices: true,
    enablesOnlineBookingFees: false,
    tracksClientPreferences: true,
  },
};

// ============================================================================
// RESTAURANT TEMPLATE
// ============================================================================

export const restaurantTemplate: IndustryTemplate = {
  id: 'restaurant',
  name: 'Restaurant & Dining',
  description: 'Table reservations, private dining, and event bookings',
  icon: 'utensils',
  category: 'restaurant',

  schedulingConfig: {
    defaultSlotDurationMin: 90, // Average dining time
    bufferMinutes: 15,
    minAdvanceBookingHours: 1,
    maxAdvanceBookingDays: 90,
    allowWalkIns: true,
    enableReminders: true,
    reminderHoursBefore: [24, 2],
    requirePhone: true,
    autoConfirm: true,
  },

  bookingPageConfig: {
    showProviderSelection: false, // Restaurants don't select servers
    showAppointmentTypes: true,
    requireIntakeForm: false,
    cancellationPolicy:
      'Please cancel at least 2 hours in advance. No-shows for parties of 6+ may be charged.',
    customFields: ['party_size', 'special_occasion'],
  },

  appointmentTypes: [
    {
      name: 'Standard Reservation',
      description: 'Regular dining reservation',
      durationMinutes: 90,
      price: null,
      color: '#3B82F6',
      requiresDeposit: false,
      depositPercent: null,
    },
    {
      name: 'Large Party (6-10)',
      description: 'Reservation for larger groups',
      durationMinutes: 120,
      price: null,
      color: '#10B981',
      requiresDeposit: true,
      depositPercent: null, // Fixed amount per person
    },
    {
      name: 'Private Dining',
      description: 'Private room reservation',
      durationMinutes: 180,
      price: 500, // Minimum spend
      color: '#8B5CF6',
      requiresDeposit: true,
      depositPercent: 50,
    },
    {
      name: 'Bar Seating',
      description: 'Bar or counter seating',
      durationMinutes: 60,
      price: null,
      color: '#F59E0B',
      requiresDeposit: false,
      depositPercent: null,
    },
    {
      name: 'Tasting Menu Experience',
      description: "Chef's tasting menu reservation",
      durationMinutes: 150,
      price: 125,
      color: '#EC4899',
      requiresDeposit: true,
      depositPercent: 100,
    },
    {
      name: 'Brunch Reservation',
      description: 'Weekend brunch seating',
      durationMinutes: 90,
      price: null,
      color: '#F97316',
      requiresDeposit: false,
      depositPercent: null,
    },
  ],

  intakeFormFields: [
    {
      name: 'party_size',
      type: 'select',
      label: 'Party Size',
      required: true,
      options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10+'],
    },
    {
      name: 'seating_preference',
      type: 'select',
      label: 'Seating Preference',
      required: false,
      options: [
        'No Preference',
        'Indoor',
        'Outdoor/Patio',
        'Bar',
        'Booth',
        'Private',
      ],
    },
    {
      name: 'special_occasion',
      type: 'select',
      label: 'Special Occasion',
      required: false,
      options: [
        'None',
        'Birthday',
        'Anniversary',
        'Business Dinner',
        'Date Night',
        'Other',
      ],
    },
    {
      name: 'dietary_restrictions',
      type: 'textarea',
      label: 'Dietary Restrictions or Allergies',
      required: false,
      placeholder: 'Please list any dietary needs',
    },
    {
      name: 'special_requests',
      type: 'textarea',
      label: 'Special Requests',
      required: false,
      placeholder: 'High chair, wheelchair accessible, etc.',
    },
  ],

  industrySettings: {
    supportsTableManagement: true,
    supportsWaitlist: true,
    supportsPartySizes: true,
    enablesTurnTime: true,
    supportsMultipleSeatings: true,
    tracksNoShows: true,
    supportsMinimumSpend: true,
    enablesSpecialEvents: true,
  },
};

// ============================================================================
// TEMPLATE REGISTRY
// ============================================================================

export const industryTemplates: Record<string, IndustryTemplate> = {
  healthcare: healthcareTemplate,
  professional_services: professionalServicesTemplate,
  home_services: homeServicesTemplate,
  beauty_wellness: beautyWellnessTemplate,
  restaurant: restaurantTemplate,
};

export const templateList = Object.values(industryTemplates);

/**
 * Get a template by ID
 */
export function getTemplateById(id: string): IndustryTemplate | null {
  return industryTemplates[id] || null;
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(
  category: IndustryTemplate['category'],
): IndustryTemplate[] {
  return templateList.filter((t) => t.category === category);
}
