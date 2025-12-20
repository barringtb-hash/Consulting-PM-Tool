/**
 * Industry-Specific Prompt Templates
 *
 * Provides specialized prompts for different industries
 * to generate more relevant and compliant intake forms.
 */

import { IndustryType } from '../industry-detector';

// ============================================================================
// INDUSTRY PROMPTS
// ============================================================================

const INDUSTRY_PROMPTS: Record<IndustryType, string> = {
  legal: `LEGAL INDUSTRY CONTEXT:
You are designing intake forms for a law firm or legal service provider.

KEY CONSIDERATIONS:
- Include case/matter type selection (personal injury, family law, criminal, etc.)
- Collect information about the legal issue/incident
- Capture relevant dates (incident date, statute of limitations awareness)
- Include conflict of interest screening fields (opposing party names)
- Add referral source tracking (important for attorney marketing ethics)
- Request prior attorney consultation history
- Include fee structure preferences if applicable

COMPLIANCE REQUIREMENTS:
- Attorney-client privilege should be indicated
- Conflict checking is mandatory before representation
- State bar rules may require specific disclosures
- ABA Model Rule 1.18 (Duties to Prospective Client) applies

RECOMMENDED FIELDS:
- Case type selection
- Incident/matter description
- Incident date (if applicable)
- Opposing party name (for conflict checks)
- Prior attorney consultation
- Preferred contact method
- Urgency level
- Retainer/fee structure preference`,

  healthcare: `HEALTHCARE INDUSTRY CONTEXT:
You are designing intake forms for a healthcare provider, clinic, or medical practice.

KEY CONSIDERATIONS:
- Collect comprehensive patient demographics
- Include date of birth (essential for medical records)
- Capture insurance information with policy details
- Collect emergency contact information
- Include medical history sections
- Add allergy and current medication fields
- Request consent for treatment and data sharing

COMPLIANCE REQUIREMENTS:
- HIPAA compliance is mandatory
- Protected Health Information (PHI) must be secured
- Patient consent forms are legally required
- Insurance verification may be needed

RECOMMENDED FIELDS:
- Date of birth (required)
- Insurance carrier and policy number
- Primary care physician
- Emergency contact with phone
- Current medications
- Known allergies
- Primary health concern
- Medical history (chronic conditions)
- HIPAA acknowledgment checkbox`,

  financial: `FINANCIAL SERVICES INDUSTRY CONTEXT:
You are designing intake forms for accounting, tax preparation, financial planning, or advisory services.

KEY CONSIDERATIONS:
- Determine service type needed (tax, audit, advisory, etc.)
- Collect business entity information if applicable
- Include revenue/income range for proper service matching
- Request prior year tax/financial history
- Add spouse/partner information for joint services
- Include investment experience level for advisory

COMPLIANCE REQUIREMENTS:
- SSN/EIN collection requires security measures
- AML/KYC requirements may apply
- Fiduciary duty disclosures for advisors
- Engagement letter requirements

RECOMMENDED FIELDS:
- Service type needed
- Individual vs. business client
- Entity type (if business)
- Annual revenue/income range
- Tax filing status
- State(s) of operation
- Prior CPA/advisor information
- Investment experience (for advisory)`,

  consulting: `BUSINESS CONSULTING INDUSTRY CONTEXT:
You are designing intake forms for a consulting firm or advisory service.

KEY CONSIDERATIONS:
- Understand the type of consulting needed
- Capture current business challenges
- Collect company size and industry information
- Understand budget and timeline expectations
- Identify decision makers and stakeholders
- Assess urgency and project scope

RECOMMENDED FIELDS:
- Company name and industry
- Company size (employees, revenue)
- Primary business challenge
- Desired outcomes/goals
- Project timeline expectations
- Budget range
- Decision maker information
- How they heard about you`,

  real_estate: `REAL ESTATE INDUSTRY CONTEXT:
You are designing intake forms for real estate agents, brokers, or property services.

KEY CONSIDERATIONS:
- Determine transaction type (buy, sell, rent, lease)
- Collect property preferences and requirements
- Understand financing/pre-approval status
- Capture timeline and urgency
- Include property type preferences
- Collect current living situation for buyers

COMPLIANCE REQUIREMENTS:
- Fair Housing Act compliance
- RESPA disclosure requirements
- State licensing disclosures

RECOMMENDED FIELDS:
- Transaction type (buying, selling, renting)
- Property type preference
- Location/area preferences
- Price range/budget
- Pre-approval status (for buyers)
- Timeline to move
- Current property details (for sellers)
- Number of bedrooms/bathrooms needed`,

  insurance: `INSURANCE INDUSTRY CONTEXT:
You are designing intake forms for insurance agents, brokers, or carriers.

KEY CONSIDERATIONS:
- Determine insurance type needed
- Collect current coverage information
- Understand risk factors
- Capture policy expiration dates
- Include claims history
- Add beneficiary information for life products

RECOMMENDED FIELDS:
- Insurance type needed
- Current coverage (yes/no, carrier)
- Policy renewal date
- Claims history
- Risk factors (driving record, health conditions)
- Coverage amount desired
- Beneficiary information`,

  education: `EDUCATION INDUSTRY CONTEXT:
You are designing intake forms for schools, tutoring services, or educational programs.

KEY CONSIDERATIONS:
- Collect student demographics
- Understand educational goals
- Capture current grade level/education
- Include learning preferences
- Add guardian information for minors
- Request academic history if relevant

RECOMMENDED FIELDS:
- Student name and age
- Current grade/education level
- Subject areas of interest
- Learning goals
- Preferred schedule
- Parent/guardian information (for minors)
- Prior tutoring/education experience`,

  technology: `TECHNOLOGY INDUSTRY CONTEXT:
You are designing intake forms for technology services, software development, or IT consulting.

KEY CONSIDERATIONS:
- Understand project type and scope
- Collect technical requirements
- Capture current tech stack
- Include timeline and budget
- Add team size and roles
- Request integration requirements

RECOMMENDED FIELDS:
- Project type (web, mobile, cloud, etc.)
- Current technology stack
- Project scope description
- Budget range
- Timeline expectations
- Team structure
- Integration needs
- Hosting preferences`,

  retail: `RETAIL INDUSTRY CONTEXT:
You are designing intake forms for retail businesses, e-commerce, or product-based services.

KEY CONSIDERATIONS:
- Collect customer preferences
- Understand product interests
- Capture shopping habits
- Include communication preferences
- Add loyalty program interest

RECOMMENDED FIELDS:
- Product categories of interest
- Shopping frequency
- Preferred contact method
- Budget range
- Brand preferences
- Loyalty program opt-in`,

  manufacturing: `MANUFACTURING INDUSTRY CONTEXT:
You are designing intake forms for manufacturing or industrial services.

KEY CONSIDERATIONS:
- Understand production requirements
- Collect quantity and timeline needs
- Capture quality specifications
- Include material preferences
- Add compliance/certification requirements

RECOMMENDED FIELDS:
- Product/part type needed
- Quantity required
- Material specifications
- Quality standards
- Delivery timeline
- Certification requirements`,

  hospitality: `HOSPITALITY INDUSTRY CONTEXT:
You are designing intake forms for hotels, restaurants, event venues, or catering services.

KEY CONSIDERATIONS:
- Collect event/booking details
- Understand group size and type
- Capture date and time preferences
- Include dietary restrictions
- Add special requests

RECOMMENDED FIELDS:
- Event type
- Number of guests
- Preferred date/time
- Dietary restrictions
- Special requests
- Budget per person`,

  nonprofit: `NONPROFIT INDUSTRY CONTEXT:
You are designing intake forms for charitable organizations, foundations, or community services.

KEY CONSIDERATIONS:
- Understand engagement type (donor, volunteer, beneficiary)
- Collect relevant demographic information
- Include program interest areas
- Capture availability (for volunteers)
- Add giving history (for donors)

RECOMMENDED FIELDS:
- Engagement type (donate, volunteer, receive services)
- Areas of interest
- Availability (for volunteers)
- Giving capacity (for donors)
- Previous involvement
- How they heard about you`,

  general: `GENERAL BUSINESS CONTEXT:
You are designing a general-purpose intake form.

KEY CONSIDERATIONS:
- Collect essential contact information
- Understand service interests
- Capture how they found you
- Include preferred contact method
- Add any additional notes field

RECOMMENDED FIELDS:
- Full name
- Email and phone
- Service of interest
- How they heard about you
- Preferred contact method
- Additional notes/questions`,
};

// ============================================================================
// PROMPT RETRIEVAL FUNCTIONS
// ============================================================================

/**
 * Get the industry-specific prompt for form generation
 */
export function getIndustryPrompt(industry: IndustryType): string {
  return INDUSTRY_PROMPTS[industry] || INDUSTRY_PROMPTS.general;
}

/**
 * Get all available industry prompts
 */
export function getAllIndustryPrompts(): Record<IndustryType, string> {
  return { ...INDUSTRY_PROMPTS };
}

/**
 * Check if an industry has a specialized prompt
 */
export function hasSpecializedPrompt(industry: IndustryType): boolean {
  return industry !== 'general' && INDUSTRY_PROMPTS[industry] !== undefined;
}
