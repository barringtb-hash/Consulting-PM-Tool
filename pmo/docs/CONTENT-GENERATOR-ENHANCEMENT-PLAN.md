# Content Generator Module Enhancement Plan

## Executive Summary

Based on analysis of the market research on AI-Assisted Client Intake Systems and comparison with our current Content Generator module (Tool 2.2), this document outlines gaps and a phased implementation plan to expand our content generation capabilities.

**Key Finding:** The current Content Generator is strong for marketing content (social, email, blog, ads) but lacks capabilities for **client-facing business documents**, **automated sequences**, and **intake/onboarding content** that the $16.9B market research identifies as critical SMB needs.

---

## Gap Analysis

### Current State: Content Generator (Tool 2.2)

**Existing Content Types (9):**
| Type | Description |
|------|-------------|
| SOCIAL_POST | Platform-optimized social media |
| EMAIL | Email copywriting with subject lines |
| BLOG_POST | Long-form, SEO-optimized content |
| AD_COPY | Persuasive advertising copy |
| LANDING_PAGE | Conversion-optimized landing pages |
| NEWSLETTER | Subscriber-focused newsletters |
| PRESS_RELEASE | Journalistic press releases |
| PRODUCT_COPY | Product descriptions and sales copy |
| VIDEO_SCRIPT | Video narratives with visual cues |

**Existing Features:**

- Brand voice training & consistency scoring
- Template system with placeholders
- A/B variant generation (1-5 variants)
- SEO optimization (keyword presence, meta generation)
- Multi-step approval workflows
- Basic analytics (impressions, clicks, engagement)

### What's Missing (Based on Market Research)

#### 1. Business Document Content Types

The market research emphasizes that **63% of clients say onboarding experiences influence retention**. We lack:

| Missing Type       | Market Need                                              | Priority |
| ------------------ | -------------------------------------------------------- | -------- |
| **PROPOSAL**       | Business/project proposals with pricing, scope, timeline | HIGH     |
| **CASE_STUDY**     | Client success stories for lead nurturing                | HIGH     |
| **WHITEPAPER**     | Thought leadership for lead generation                   | MEDIUM   |
| **FAQ_CONTENT**    | FAQ entries for knowledge bases & chatbots               | HIGH     |
| **WELCOME_PACKET** | New client welcome content/guides                        | HIGH     |

**Note:** Engagement letters, contracts, and SOW already exist in the Intake module's `engagement-letter.service.ts`. We should integrate, not duplicate.

#### 2. Automated Content Sequences

The research shows **80% of clients expect responses within 24 hours**, yet **64% of firms cannot deliver**. Automated sequences address this:

| Missing Capability      | Market Need                                |
| ----------------------- | ------------------------------------------ |
| **Email Sequences**     | Multi-step nurture/onboarding email series |
| **Follow-up Sequences** | Automated follow-up after intake/meetings  |
| **Drip Campaigns**      | Time-based educational content delivery    |

Current limitation: The content generator creates individual pieces, not interconnected sequences.

#### 3. Intake & Conversational Content

The research shows **chatbots are 2X more effective than Contact Us pages**:

| Missing Capability          | Market Need                                    |
| --------------------------- | ---------------------------------------------- |
| **Intake Questions**        | AI-generated intake form questions by industry |
| **Chatbot Scripts**         | Conversational flows for AI chatbots           |
| **Qualification Questions** | Lead qualification question sets               |

**Note:** The Intake module has conversation templates in `intake/conversation/templates/` but lacks AI generation of new content.

#### 4. Multi-Language Support

The research notes **multi-step forms with multi-language support** as critical. Current content generator has no translation capabilities.

#### 5. Industry-Specific Compliance

Product Descriptions module has compliance checking for FOOD, SUPPLEMENTS, COSMETICS, AUTOMOTIVE, MEDICAL. Content Generator lacks:

- Legal industry compliance (attorney advertising rules, bar restrictions)
- Healthcare content compliance (HIPAA-aware language)
- Financial services compliance (disclosure requirements)

#### 6. CRM Data Integration

Research shows SMBs need **personalized content based on CRM data**. Current gap: no integration with Account/Opportunity/Contact data for content personalization.

---

## Proposed Enhancements

### Phase 1: New Content Types (Priority: HIGH)

Add 5 new content types to `ContentGenerationType` enum:

```typescript
enum ContentGenerationType {
  // Existing
  SOCIAL_POST
  EMAIL
  BLOG_POST
  AD_COPY
  LANDING_PAGE
  NEWSLETTER
  PRESS_RELEASE
  PRODUCT_COPY
  VIDEO_SCRIPT

  // New - Phase 1
  PROPOSAL           // Business/project proposals
  CASE_STUDY         // Client success stories
  FAQ_CONTENT        // FAQ entries for chatbots/KB
  WELCOME_PACKET     // Client onboarding content
  WHITEPAPER         // Thought leadership content
}
```

**Implementation Details:**

| Content Type   | System Prompt Focus                                        | Template Variables                                                                        | Output Format                                                           |
| -------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| PROPOSAL       | Professional proposal writer with persuasive scope/pricing | `{{client_name}}`, `{{project_scope}}`, `{{timeline}}`, `{{pricing}}`, `{{deliverables}}` | Structured sections: Executive Summary, Scope, Timeline, Pricing, Terms |
| CASE_STUDY     | B2B storyteller with metrics focus                         | `{{client_name}}`, `{{industry}}`, `{{challenge}}`, `{{solution}}`, `{{results}}`         | Problem → Solution → Results format                                     |
| FAQ_CONTENT    | Concise Q&A writer                                         | `{{topic}}`, `{{audience}}`, `{{tone}}`                                                   | Question + Answer pairs, optionally with categories                     |
| WELCOME_PACKET | Warm, helpful onboarding specialist                        | `{{client_name}}`, `{{service_type}}`, `{{contact_info}}`, `{{next_steps}}`               | Welcome message + What to expect + Next steps                           |
| WHITEPAPER     | Authoritative thought leadership                           | `{{topic}}`, `{{industry}}`, `{{key_points}}`                                             | Title, Abstract, Sections, Conclusion, CTA                              |

**Database Changes:**

- Add new enum values to Prisma schema
- Create migration

**Effort:** 2-3 days

---

### Phase 2: Content Sequences (Priority: HIGH)

Add capability to generate interconnected content sequences rather than just individual pieces.

**New Database Model:**

```prisma
model ContentSequence {
  id          Int      @id @default(autoincrement())
  configId    Int
  config      ContentGeneratorConfig @relation(fields: [configId], references: [id])

  name        String
  description String?
  type        ContentSequenceType  // ONBOARDING, NURTURE, FOLLOW_UP, DRIP

  // Sequence configuration
  triggerEvent    String?  // e.g., "intake_submitted", "opportunity_created"
  intervalDays    Int[]    // Days between each piece [0, 3, 7, 14]

  // Generated pieces
  pieces      ContentSequencePiece[]

  // Status
  status      ContentApprovalStatus @default(DRAFT)
  isActive    Boolean @default(false)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model ContentSequencePiece {
  id          Int      @id @default(autoincrement())
  sequenceId  Int
  sequence    ContentSequence @relation(fields: [sequenceId], references: [id])

  order       Int      // 1, 2, 3...
  delayDays   Int      // Days after trigger/previous piece

  // Link to generated content
  contentId   Int?
  content     GeneratedContent? @relation(fields: [contentId], references: [id])

  // Piece-specific config
  subject     String?  // For emails
  purpose     String   // "welcome", "value_prop", "case_study", "cta"

  createdAt   DateTime @default(now())
}

enum ContentSequenceType {
  ONBOARDING    // New client welcome sequence
  NURTURE       // Lead nurturing sequence
  FOLLOW_UP     // Post-meeting/intake follow-up
  DRIP          // Educational content drip
  REENGAGEMENT  // Win-back sequence
}
```

**New API Endpoints:**

```
POST   /api/content-generator/:configId/sequences           - Create sequence
GET    /api/content-generator/:configId/sequences           - List sequences
GET    /api/content-generator/sequences/:id                 - Get sequence details
PATCH  /api/content-generator/sequences/:id                 - Update sequence
DELETE /api/content-generator/sequences/:id                 - Delete sequence
POST   /api/content-generator/sequences/:id/generate        - Generate all pieces
POST   /api/content-generator/sequences/:id/activate        - Activate sequence
```

**Generation Logic:**

1. User defines sequence type and number of pieces
2. AI generates cohesive sequence with proper progression
3. Each piece maintains brand voice and builds on previous
4. Supports variable delays between pieces

**Effort:** 3-4 days

---

### Phase 3: Intake Content Integration (Priority: HIGH)

Connect Content Generator with the Intake module to generate:

1. Intake form questions by industry
2. Chatbot conversation flows
3. FAQ/Knowledge base content from intake data

**New Service: IntakeContentService**

```typescript
// New file: content-generator/services/intake-content.service.ts

interface IntakeQuestionGenerationInput {
  industry: string;           // legal, healthcare, consulting, financial
  questionType: string;       // qualification, discovery, screening
  targetCount: number;        // Number of questions to generate
  existingQuestions?: string[]; // Avoid duplicates
  customContext?: string;     // Additional context
}

interface ChatbotFlowGenerationInput {
  industry: string;
  flowType: string;           // greeting, qualification, faq, scheduling
  intents: string[];          // Intents to cover
  personality: string;        // Professional, friendly, casual
}

// Functions
generateIntakeQuestions(configId: number, input: IntakeQuestionGenerationInput)
generateChatbotFlow(configId: number, input: ChatbotFlowGenerationInput)
generateFAQFromIntakeData(configId: number, submissionIds: number[])
```

**New API Endpoints:**

```
POST /api/content-generator/:configId/intake-questions    - Generate intake questions
POST /api/content-generator/:configId/chatbot-flow        - Generate chatbot flow
POST /api/content-generator/:configId/faq-from-intake     - Generate FAQ from submissions
```

**Effort:** 2-3 days

---

### Phase 4: Multi-Language Support (Priority: MEDIUM)

Add translation capabilities to all generated content.

**Approach:** Similar to Product Descriptions module's multi-language support.

**New API Endpoints:**

```
GET  /api/content-generator/languages                     - List supported languages
POST /api/content-generator/contents/:id/translate        - Translate existing content
POST /api/content-generator/batch-translate               - Batch translate
```

**Database Changes:**

- Add `language` field to GeneratedContent
- Add `parentTranslationId` for translation relationships

**Effort:** 2 days

---

### Phase 5: Industry Compliance Checking (Priority: MEDIUM)

Add compliance checking similar to Product Descriptions module.

**Compliance Rules by Industry:**

| Industry       | Rules                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------ |
| **Legal**      | No guarantees of outcomes, proper disclaimers, bar advertising rules, no misleading claims |
| **Healthcare** | HIPAA-aware language, no diagnosis claims, proper medical disclaimers                      |
| **Financial**  | Required disclosures, no guaranteed returns, fiduciary language                            |
| **General**    | Truth in advertising, no deceptive claims                                                  |

**New Service: ContentComplianceService**

```typescript
interface ComplianceCheckResult {
  isCompliant: boolean;
  score: number; // 0-100
  violations: ComplianceViolation[];
  warnings: ComplianceWarning[];
  suggestions: string[];
}

interface ComplianceViolation {
  severity: 'critical' | 'high' | 'medium';
  rule: string;
  location: string; // Text that violated
  recommendation: string;
}
```

**New API Endpoints:**

```
POST /api/content-generator/contents/:id/compliance-check  - Check content compliance
POST /api/content-generator/compliance-analyze             - Analyze text without saving
```

**Effort:** 2-3 days

---

### Phase 6: CRM Data Integration (Priority: MEDIUM)

Enable content personalization using CRM data.

**Features:**

1. Pull Account/Opportunity/Contact data for personalization
2. Auto-populate placeholders from CRM records
3. Generate content for specific pipeline stages

**New Placeholder Types:**

```typescript
// Dynamic placeholders that pull from CRM
{
  {
    crm.account.name;
  }
}
{
  {
    crm.account.industry;
  }
}
{
  {
    crm.contact.firstName;
  }
}
{
  {
    crm.contact.title;
  }
}
{
  {
    crm.opportunity.name;
  }
}
{
  {
    crm.opportunity.amount;
  }
}
{
  {
    crm.opportunity.stage;
  }
}
```

**New API Endpoints:**

```
POST /api/content-generator/:configId/generate-for-account/:accountId
POST /api/content-generator/:configId/generate-for-opportunity/:opportunityId
GET  /api/content-generator/crm-placeholders/:accountId   - Available CRM placeholders
```

**Effort:** 2-3 days

---

## Implementation Summary

| Phase | Feature                                                       | Priority            | Effort   | Dependencies |
| ----- | ------------------------------------------------------------- | ------------------- | -------- | ------------ |
| 1     | New Content Types                                             | HIGH                | 2-3 days | None         |
| 6     | CRM Data Integration                                          | **HIGH** (moved up) | 2-3 days | Phase 1      |
| 3     | Intake Content Integration + Shared Engagement Letter Service | HIGH                | 2-3 days | Phase 1      |
| 2     | Content Sequences                                             | HIGH                | 3-4 days | Phase 1      |
| 4     | Multi-Language Support                                        | MEDIUM              | 2 days   | Phase 1      |
| 5     | Industry Compliance (basic warnings)                          | MEDIUM              | 2-3 days | Phase 1      |

**Total Estimated Effort:** 13-18 days

---

## Approved Implementation Order

### Sprint 1: Phase 1 - New Content Types

- Add 5 new content types (PROPOSAL, CASE_STUDY, FAQ_CONTENT, WELCOME_PACKET, WHITEPAPER)
- Update Prisma schema and service

### Sprint 2: Phase 6 - CRM Integration (Priority Elevated)

- CRM data personalization with dynamic placeholders
- Pipeline-stage content generation
- Deep platform integration (key market differentiator)

### Sprint 3: Phase 3 - Intake Content Integration

- Generate intake form questions by industry
- Generate chatbot conversation flows
- **Shared engagement letter service** (used by both Intake and Content Generator modules)

### Sprint 4: Phase 2 - Content Sequences

- Add content sequence capability
- Enables automated follow-up and nurture campaigns
- Addresses "80% expect 24hr response" finding

### Sprint 5: Phases 4 + 5 - Enterprise Features

- Multi-language support
- Industry compliance checking (**basic warnings only** for initial release)
- Differentiates for regulated industries

---

## Files to Modify/Create

### Prisma Schema

- `pmo/prisma/schema.prisma` - Add new enums and models

### API Module

- `pmo/apps/api/src/modules/content-generator/content-generator.service.ts` - Extend with new types
- `pmo/apps/api/src/modules/content-generator/content-generator.router.ts` - New endpoints
- `pmo/apps/api/src/modules/content-generator/services/sequence.service.ts` - NEW
- `pmo/apps/api/src/modules/content-generator/services/intake-content.service.ts` - NEW
- `pmo/apps/api/src/modules/content-generator/services/compliance.service.ts` - NEW
- `pmo/apps/api/src/modules/content-generator/services/translation.service.ts` - NEW
- `pmo/apps/api/src/modules/content-generator/services/crm-integration.service.ts` - NEW

### Frontend (if applicable)

- `pmo/apps/web/src/pages/ai-tools/ContentGeneratorPage.tsx` - UI updates

---

## Success Metrics (From Market Research)

| Metric                                  | Target        | Source                         |
| --------------------------------------- | ------------- | ------------------------------ |
| Content generation time reduction       | 70%+          | Jotform benchmark              |
| Form/intake completion rate improvement | 35%           | Conversational forms benchmark |
| Client response time                    | <24 hours     | 80% client expectation         |
| Content approval cycle time             | 50% reduction | Workflow automation            |

---

## Decisions Made

1. **Phase Prioritization:** Keep as proposed, with CRM integration moved to top priority after Phase 1

2. **Engagement Letter Integration:** ✅ Create a **shared service** both modules use
   - Will be located in a shared location accessible to both Intake and Content Generator

3. **Compliance Scope:** ✅ **Basic warning flags** for initial release
   - Can be expanded later based on customer feedback

4. **CRM Integration Priority:** ✅ **Elevated to top priority** (Phase 6 → Sprint 2)
   - Deep CRM integration identified as key market differentiator

---

## Status: APPROVED - Implementation In Progress

Implementation order:

1. [COMPLETED] Phase 1: New Content Types
2. [COMPLETED] Phase 6: CRM Data Integration
3. [COMPLETED] Phase 3: Intake Content Integration + Shared Engagement Letter Service
4. [PENDING] Phase 2: Content Sequences
5. [PENDING] Phases 4+5: Multi-Language + Basic Compliance
