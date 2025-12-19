# AI Client Intake System Upgrade - Requirements & Implementation Plan

**Version:** 1.0
**Date:** December 2024
**Status:** Draft - Pending Review

---

## Executive Summary

This document outlines the requirements and implementation plan for upgrading the client intake system to incorporate AI capabilities based on market research findings. The upgrade transforms the existing form-based intake system into a competitive, AI-powered client onboarding platform targeting the $16.9B market opportunity.

### Current State Assessment

The existing intake module provides a solid foundation with:
- ✅ Drag-and-drop form builder with 17 field types
- ✅ Conditional logic and multi-page forms
- ✅ Submission lifecycle management (IN_PROGRESS → SUBMITTED → UNDER_REVIEW → APPROVED/REJECTED)
- ✅ Document upload and verification workflow
- ✅ Compliance templates with industry presets
- ✅ Multi-step workflow automation
- ✅ E-signature integration (DocuSign, HelloSign) - infrastructure ready
- ✅ Storage provider integration (S3, GCS, SharePoint, etc.)
- ✅ Basic analytics (completion rate, approval rate)

### Key Gaps Identified (Market Research vs. Current State)

| Gap Area | Market Requirement | Current State |
|----------|-------------------|---------------|
| **Conversational AI** | 35% higher completion rates with NLP forms | Traditional form-only approach |
| **AI Form Generation** | Create forms from natural language prompts | Manual form building only |
| **Lead Scoring** | Predictive scoring based on responses | No scoring integration |
| **Document Intelligence** | OCR with AI extraction | Placeholder (`TODO: Implement AI extraction`) |
| **CRM Integration** | Auto-create leads, opportunities, contacts | Minimal - no automatic CRM creation |
| **Legal Compliance** | Conflict checking, privilege protection | Generic compliance only |
| **Multi-Channel** | SMS, WhatsApp, Slack intake | Web forms only |
| **Real-time Personalization** | Dynamic questions based on user profile | Static conditional logic only |
| **Calendar Integration** | Embedded scheduling in intake flow | Separate module (scheduling) |
| **Payment Collection** | Collect retainers/deposits during intake | Not implemented |
| **White-Label** | Custom branding, remove product marks | Partial (portal branding only) |

---

## Project Requirements

### Phase 1: AI Core Capabilities (Priority: Critical)

#### 1.1 AI-Assisted Form Generation

**User Story:** As a consultant, I want to describe the information I need in plain English and have the system generate a complete intake form, so I can create professional forms in minutes instead of hours.

**Requirements:**

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| AI-FG-01 | Natural language form generation | Must Have | User enters text description, system generates form with appropriate field types |
| AI-FG-02 | Industry-aware field suggestions | Must Have | System suggests relevant fields based on detected industry (legal, healthcare, consulting, etc.) |
| AI-FG-03 | Template enhancement | Should Have | AI can analyze existing templates and suggest improvements |
| AI-FG-04 | Compliance auto-detection | Should Have | System detects when form requires compliance fields (HIPAA, legal) and suggests additions |
| AI-FG-05 | Multi-language support | Could Have | Generate forms in multiple languages from single description |

**Technical Approach:**
- Integrate OpenAI GPT-4 or Anthropic Claude for NLP processing
- Create prompt templates for different industries
- Map AI responses to existing field type schema
- Store generation history for model improvement

**API Endpoints:**
```
POST /api/intake/ai/generate-form
  Body: { description: string, industry?: string, configId: string }
  Response: { form: IntakeForm, fields: IntakeFormField[], confidence: number }

POST /api/intake/ai/suggest-fields
  Body: { formId: string, context: string }
  Response: { suggestions: FieldSuggestion[] }
```

---

#### 1.2 Conversational Intake Forms

**User Story:** As a client filling out an intake form, I want to have a natural conversation with an AI assistant that guides me through the process, so the experience feels personal and I'm more likely to complete it.

**Requirements:**

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| AI-CF-01 | Conversational form mode | Must Have | Forms can be completed via chat interface instead of traditional fields |
| AI-CF-02 | Context-aware follow-ups | Must Have | AI asks relevant follow-up questions based on previous answers |
| AI-CF-03 | Entity extraction | Must Have | Extract structured data from natural language responses |
| AI-CF-04 | Clarification handling | Must Have | AI asks for clarification when responses are ambiguous |
| AI-CF-05 | Hybrid mode | Should Have | Allow switching between conversational and traditional form views |
| AI-CF-06 | Voice input support | Could Have | Accept voice responses transcribed to text |

**Technical Approach:**
- Create new `IntakeConversation` model linked to submissions
- Use streaming responses for natural chat UX
- Implement conversation state machine for multi-turn dialogues
- Store conversation history for context continuity

**New Data Models:**
```prisma
model IntakeConversation {
  id              String   @id @default(uuid())
  submissionId    String   @unique
  messages        Json     // Array of {role, content, timestamp, extractedData}
  currentFieldId  String?  // Field being collected
  completedFields String[] // Field IDs with extracted data
  status          ConversationStatus @default(ACTIVE)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  submission      IntakeSubmission @relation(fields: [submissionId], references: [id])
}

enum ConversationStatus {
  ACTIVE
  PAUSED
  COMPLETED
  ABANDONED
}
```

**API Endpoints:**
```
POST /api/public/intake/conversation/start
  Body: { formSlug: string, configId: string }
  Response: { conversationId: string, accessToken: string, greeting: string }

POST /api/public/intake/conversation/:token/message
  Body: { message: string }
  Response: { reply: string, extractedData?: object, nextQuestion?: string, progress: number }

GET /api/public/intake/conversation/:token/summary
  Response: { collectedData: object, missingFields: string[], canSubmit: boolean }
```

---

#### 1.3 Intelligent Document Analysis

**User Story:** As a consultant, I want the system to automatically extract relevant information from uploaded documents, so clients don't have to manually enter data that already exists in their files.

**Requirements:**

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| AI-DA-01 | OCR for scanned documents | Must Have | Extract text from images and PDFs |
| AI-DA-02 | AI-powered data extraction | Must Have | Identify and extract form-relevant data from documents |
| AI-DA-03 | Document classification | Must Have | Automatically classify document types (ID, insurance, contract, etc.) |
| AI-DA-04 | Confidence scoring | Must Have | Provide confidence scores for each extracted field |
| AI-DA-05 | Human review workflow | Must Have | Flag low-confidence extractions for manual review |
| AI-DA-06 | Custom extraction templates | Should Have | Define custom extraction rules per form/industry |
| AI-DA-07 | Multi-page document handling | Should Have | Process multi-page documents as single unit |
| AI-DA-08 | Form pre-fill from documents | Should Have | Auto-populate form fields from extracted data |

**Technical Approach:**
- Integrate AWS Textract or Google Cloud Vision for OCR
- Use GPT-4 Vision or Claude for intelligent extraction
- Implement extraction template system (extend existing placeholder)
- Create extraction confidence thresholds per field type

**Enhance Existing Service:**
```typescript
// Update extractDocumentData in intake.service.ts
async function extractDocumentData(documentId: string, options: ExtractionOptions): Promise<ExtractionResult> {
  // 1. Get document from storage
  // 2. Run OCR if image/scanned PDF
  // 3. Apply extraction template or AI analysis
  // 4. Map extracted data to form fields
  // 5. Calculate confidence scores
  // 6. Flag for review if below threshold
}
```

---

#### 1.4 Predictive Lead Scoring

**User Story:** As a consultant, I want the system to automatically score intake submissions based on likelihood to convert and potential value, so I can prioritize my follow-ups effectively.

**Requirements:**

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| AI-LS-01 | Rule-based lead scoring | Must Have | Score based on configurable field values and criteria |
| AI-LS-02 | ML-powered scoring | Should Have | Learn from historical conversion data |
| AI-LS-03 | Score breakdown | Must Have | Show factors contributing to score |
| AI-LS-04 | Priority notifications | Should Have | Alert on high-scoring submissions |
| AI-LS-05 | Score-based routing | Should Have | Auto-assign submissions based on score thresholds |
| AI-LS-06 | Scoring model configuration | Must Have | Allow customization of scoring criteria per config |

**New Data Model:**
```prisma
model IntakeLeadScore {
  id              String   @id @default(uuid())
  submissionId    String   @unique
  overallScore    Int      // 0-100
  qualityScore    Int      // Data quality
  fitScore        Int      // Client fit
  urgencyScore    Int      // Time sensitivity
  valueScore      Int      // Potential value
  factors         Json     // Breakdown of scoring factors
  modelVersion    String   // Scoring model version
  calculatedAt    DateTime @default(now())

  submission      IntakeSubmission @relation(fields: [submissionId], references: [id])
}

model IntakeScoringConfig {
  id              String   @id @default(uuid())
  configId        String
  name            String
  rules           Json     // Array of scoring rules
  weights         Json     // Factor weights
  thresholds      Json     // {hot: 80, warm: 50, cold: 20}
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  config          IntakeConfig @relation(fields: [configId], references: [id])
}
```

**API Endpoints:**
```
GET /api/intake/submissions/:id/score
  Response: { score: IntakeLeadScore, recommendation: string }

POST /api/intake/:configId/scoring-config
  Body: { name, rules, weights, thresholds }

POST /api/intake/submissions/:id/recalculate-score
  Response: { previousScore: number, newScore: number, delta: number }
```

---

### Phase 2: Deep CRM Integration (Priority: High)

#### 2.1 Automatic CRM Entity Creation

**User Story:** As a consultant, I want intake submissions to automatically create CRM records (leads, contacts, accounts, opportunities), so I don't have to manually transfer data between systems.

**Requirements:**

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| CRM-01 | Auto-create CRMContact from submission | Must Have | Create contact when submission is approved |
| CRM-02 | Auto-create Account from submission | Should Have | Create account when organization info provided |
| CRM-03 | Auto-create Opportunity from submission | Should Have | Create opportunity based on service interest |
| CRM-04 | Field mapping configuration | Must Have | Map intake fields to CRM fields |
| CRM-05 | Duplicate detection | Must Have | Check for existing contacts/accounts before creating |
| CRM-06 | Manual review option | Should Have | Allow review before CRM creation |
| CRM-07 | Bi-directional sync | Could Have | Update CRM records when submission is modified |

**New Data Model:**
```prisma
model IntakeCRMMapping {
  id              String   @id @default(uuid())
  configId        String
  formId          String?  // Null = applies to all forms
  entity          CRMEntityType // CONTACT, ACCOUNT, OPPORTUNITY
  fieldMappings   Json     // { intakeFieldId: crmFieldName }
  conditions      Json?    // When to create entity
  autoCreate      Boolean  @default(true)
  requireApproval Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  config          IntakeConfig @relation(fields: [configId], references: [id])
  form            IntakeForm?  @relation(fields: [formId], references: [id])
}

enum CRMEntityType {
  CONTACT
  ACCOUNT
  OPPORTUNITY
  ACTIVITY
}

// Add to IntakeSubmission
model IntakeSubmission {
  // ... existing fields
  crmContactId      String?
  crmAccountId      String?
  crmOpportunityId  String?
  crmSyncedAt       DateTime?
  crmSyncErrors     Json?
}
```

**API Endpoints:**
```
POST /api/intake/:configId/crm-mappings
  Body: { formId?, entity, fieldMappings, conditions?, autoCreate, requireApproval }

POST /api/intake/submissions/:id/sync-to-crm
  Response: { contactId?, accountId?, opportunityId?, errors? }

GET /api/intake/submissions/:id/crm-entities
  Response: { contact?, account?, opportunity?, activities[] }
```

---

#### 2.2 Activity Timeline Integration

**User Story:** As a consultant, I want all intake-related activities to appear in the CRM activity timeline, so I have complete visibility into client interactions.

**Requirements:**

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| CRM-AT-01 | Create activity on submission start | Must Have | Log when client begins intake |
| CRM-AT-02 | Create activity on submission complete | Must Have | Log when intake is submitted |
| CRM-AT-03 | Create activity on status change | Should Have | Log approvals, rejections, reviews |
| CRM-AT-04 | Create activity on document upload | Should Have | Log document uploads with type |
| CRM-AT-05 | Link activities to entities | Must Have | Connect to contact/account/opportunity |

---

#### 2.3 Pipeline Integration

**User Story:** As a consultant, I want intake submissions to automatically update the sales pipeline, so deals progress without manual intervention.

**Requirements:**

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| CRM-PI-01 | Create pipeline stage from intake | Must Have | Map intake form to pipeline entry |
| CRM-PI-02 | Move stage on submission events | Should Have | Advance stage on approval |
| CRM-PI-03 | Update opportunity amount | Should Have | Set deal value from intake data |
| CRM-PI-04 | Set probability from score | Could Have | Use lead score for opportunity probability |

---

### Phase 3: Legal Industry Compliance (Priority: High)

#### 3.1 Conflict of Interest Checking

**User Story:** As a law firm, I need the intake system to automatically check for conflicts of interest before accepting new clients, so I comply with bar rules and protect the firm.

**Requirements:**

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| LEG-COI-01 | Client name conflict check | Must Have | Search existing clients/matters for name matches |
| LEG-COI-02 | Related party check | Must Have | Check adverse parties, co-defendants, etc. |
| LEG-COI-03 | Fuzzy matching | Must Have | Catch spelling variations and nicknames |
| LEG-COI-04 | Conflict report generation | Must Have | Generate detailed conflict check report |
| LEG-COI-05 | Conflict workflow | Should Have | Route conflicts for attorney review |
| LEG-COI-06 | Waiver management | Should Have | Track conflict waivers and consents |
| LEG-COI-07 | Historical check | Should Have | Include archived/former clients |

**New Data Model:**
```prisma
model ConflictCheck {
  id              String   @id @default(uuid())
  submissionId    String
  configId        String
  searchTerms     Json     // Names, parties searched
  results         Json     // Potential conflicts found
  status          ConflictStatus @default(PENDING)
  severity        ConflictSeverity?
  reviewedBy      String?
  reviewedAt      DateTime?
  waiverObtained  Boolean  @default(false)
  waiverDocId     String?  // Link to waiver document
  notes           String?
  createdAt       DateTime @default(now())

  submission      IntakeSubmission @relation(fields: [submissionId], references: [id])
  config          IntakeConfig     @relation(fields: [configId], references: [id])
}

enum ConflictStatus {
  PENDING
  NO_CONFLICT
  POTENTIAL_CONFLICT
  CONFLICT_FOUND
  WAIVED
  DECLINED
}

enum ConflictSeverity {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}
```

**API Endpoints:**
```
POST /api/intake/submissions/:id/conflict-check
  Response: { checkId, status, results[], severity?, requiresReview: boolean }

GET /api/intake/submissions/:id/conflict-check
  Response: { check: ConflictCheck }

POST /api/intake/conflict-checks/:id/review
  Body: { status, notes, waiverDocId? }
```

---

#### 3.2 Matter/Case Type Pre-Screening

**User Story:** As a law firm, I want the intake system to pre-screen potential clients based on case type and practice area fit, so I don't waste time on cases we don't handle.

**Requirements:**

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| LEG-PS-01 | Practice area configuration | Must Have | Define accepted practice areas |
| LEG-PS-02 | Case type screening | Must Have | Auto-decline or flag unsuitable cases |
| LEG-PS-03 | Statute of limitations check | Should Have | Calculate and flag time-sensitive matters |
| LEG-PS-04 | Jurisdiction check | Should Have | Verify matter is in licensed jurisdiction |
| LEG-PS-05 | Referral routing | Should Have | Route declined cases to referral network |

---

#### 3.3 Engagement Letter Automation

**User Story:** As a law firm, I want the intake system to automatically generate and send engagement letters with appropriate terms based on the matter type.

**Requirements:**

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| LEG-EL-01 | Template library | Must Have | Engagement letter templates by practice area |
| LEG-EL-02 | Dynamic field population | Must Have | Auto-fill client and matter details |
| LEG-EL-03 | E-signature integration | Must Have | Send for signature via DocuSign/HelloSign |
| LEG-EL-04 | Fee structure options | Should Have | Support hourly, flat fee, contingency |
| LEG-EL-05 | Retainer collection | Should Have | Collect retainer payment with engagement |
| LEG-EL-06 | Jurisdiction-specific terms | Could Have | Adjust terms based on state bar requirements |

---

### Phase 4: Multi-Channel Intake (Priority: Medium)

#### 4.1 SMS Intake

**User Story:** As a client, I want to be able to complete intake via text message, so I can respond conveniently from my phone.

**Requirements:**

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| MC-SMS-01 | SMS conversation intake | Must Have | Complete intake via text messages |
| MC-SMS-02 | Link to web form | Should Have | Send link to full form via SMS |
| MC-SMS-03 | Document upload via MMS | Should Have | Accept photos/documents via MMS |
| MC-SMS-04 | Two-way messaging | Must Have | Support replies and clarifications |

**Technical Approach:**
- Integrate with existing Twilio infrastructure from chatbot module
- Create SMS-specific conversation handler
- Map responses to form fields

---

#### 4.2 WhatsApp Intake

**User Story:** As an international client, I want to complete intake via WhatsApp, which is my preferred messaging platform.

**Requirements:**

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| MC-WA-01 | WhatsApp conversation intake | Should Have | Complete intake via WhatsApp |
| MC-WA-02 | Rich message formatting | Should Have | Use WhatsApp's button and list features |
| MC-WA-03 | Document sharing | Should Have | Accept documents via WhatsApp |

---

#### 4.3 Website Embed Widget

**User Story:** As a business owner, I want to embed the intake form/chatbot on my website, so visitors can start the intake process without leaving my site.

**Requirements:**

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| MC-WE-01 | Embeddable widget | Must Have | JavaScript snippet for website integration |
| MC-WE-02 | Customizable appearance | Must Have | Match widget to website branding |
| MC-WE-03 | Pop-up triggers | Should Have | Show widget based on page/time/exit intent |
| MC-WE-04 | Pre-fill from URL params | Should Have | Accept UTM and custom parameters |
| MC-WE-05 | Form/Chat mode toggle | Should Have | Allow user to choose interaction style |

**Technical Approach:**
- Extend existing `@pmo/chatbot-widget` package
- Add intake mode to widget configuration
- Create new intake-specific widget variant

---

### Phase 5: Enhanced UX & Analytics (Priority: Medium)

#### 5.1 Smart Form Optimization

**User Story:** As a consultant, I want the system to optimize my forms based on completion data, so I can continuously improve conversion rates.

**Requirements:**

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| UX-SO-01 | Field-level analytics | Must Have | Track completion rate per field |
| UX-SO-02 | Drop-off analysis | Must Have | Identify where users abandon forms |
| UX-SO-03 | AI optimization suggestions | Should Have | Suggest form improvements |
| UX-SO-04 | A/B testing | Could Have | Test different form versions |

---

#### 5.2 Real-Time Personalization

**User Story:** As a returning client, I want the intake system to recognize me and pre-fill my information, so I don't have to re-enter data I've already provided.

**Requirements:**

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| UX-RP-01 | Returning user detection | Should Have | Identify users from previous submissions |
| UX-RP-02 | Auto-population from CRM | Should Have | Pre-fill from existing contact data |
| UX-RP-03 | Conditional form sections | Should Have | Show/hide sections based on profile |
| UX-RP-04 | Progressive profiling | Could Have | Only ask for new information |

---

#### 5.3 Advanced Analytics Dashboard

**User Story:** As a consultant, I want comprehensive analytics on intake performance, so I can make data-driven decisions about my process.

**Requirements:**

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| UX-AD-01 | Conversion funnel visualization | Must Have | Show stages from start to approval |
| UX-AD-02 | Source tracking | Should Have | Track where submissions originate |
| UX-AD-03 | Time-to-completion metrics | Must Have | Track average completion times |
| UX-AD-04 | Comparison views | Should Have | Compare forms, periods, channels |
| UX-AD-05 | Export capabilities | Must Have | Export reports in CSV/PDF |
| UX-AD-06 | Scheduled reports | Could Have | Email reports on schedule |

---

### Phase 6: Payment & Calendar Integration (Priority: Medium)

#### 6.1 Payment Collection During Intake

**User Story:** As a consultant, I want to collect deposits or retainers as part of the intake process, so I can secure commitment before investing time.

**Requirements:**

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| PAY-01 | Stripe integration | Must Have | Accept credit card payments |
| PAY-02 | Configurable payment points | Should Have | Collect at submission or approval |
| PAY-03 | Payment amount configuration | Must Have | Fixed, percentage, or custom amounts |
| PAY-04 | Payment confirmation | Must Have | Send receipt and update submission |
| PAY-05 | Refund handling | Should Have | Process refunds for rejected submissions |
| PAY-06 | ACH/bank transfer | Could Have | Accept bank transfers |

**New Data Model:**
```prisma
model IntakePayment {
  id              String   @id @default(uuid())
  submissionId    String
  amount          Decimal  @db.Decimal(10, 2)
  currency        String   @default("USD")
  status          PaymentStatus
  provider        String   // stripe, square, etc.
  externalId      String   // Provider's payment ID
  metadata        Json?
  paidAt          DateTime?
  refundedAt      DateTime?
  refundAmount    Decimal? @db.Decimal(10, 2)
  createdAt       DateTime @default(now())

  submission      IntakeSubmission @relation(fields: [submissionId], references: [id])
}

enum PaymentStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  REFUNDED
  PARTIALLY_REFUNDED
}
```

---

#### 6.2 Integrated Appointment Scheduling

**User Story:** As a client completing intake, I want to schedule a consultation as part of the process, so I have an immediate next step.

**Requirements:**

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| CAL-01 | Embed scheduling in intake flow | Must Have | Show calendar after form completion |
| CAL-02 | Use existing scheduling module | Must Have | Integrate with scheduling assistant |
| CAL-03 | Pass intake data to appointment | Should Have | Include intake context in meeting |
| CAL-04 | Conditional scheduling | Should Have | Only show calendar for qualified leads |

---

### Phase 7: White-Label & Enterprise Features (Priority: Low)

#### 7.1 White-Label Capabilities

**Requirements:**

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| WL-01 | Custom domains | Should Have | Use client's domain for intake portal |
| WL-02 | Full branding removal | Should Have | Remove all product branding |
| WL-03 | Custom email templates | Should Have | Brand all system emails |
| WL-04 | Custom favicon and title | Must Have | Match client branding completely |

#### 7.2 Practice Management Integrations

**Requirements:**

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| PM-01 | Clio Manage integration | Should Have | Sync contacts and matters |
| PM-02 | MyCase integration | Should Have | Create clients and cases |
| PM-03 | PracticePanther integration | Could Have | Bi-directional sync |
| PM-04 | Generic webhook for others | Must Have | Allow custom integrations |

---

## Non-Functional Requirements

### Performance

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-P01 | Form load time | < 2 seconds |
| NFR-P02 | Submission processing | < 3 seconds |
| NFR-P03 | AI response time (conversational) | < 2 seconds |
| NFR-P04 | Document analysis | < 30 seconds for 10-page doc |
| NFR-P05 | Concurrent form submissions | 10,000+ |

### Security

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-S01 | Encryption at rest | AES-256 |
| NFR-S02 | Encryption in transit | TLS 1.3 |
| NFR-S03 | SOC 2 Type I | Within 6 months of launch |
| NFR-S04 | HIPAA compliance option | BAA available |
| NFR-S05 | Session timeout | 30 min inactive |
| NFR-S06 | MFA for admin | Required |

### Availability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-A01 | Uptime SLA | 99.9% |
| NFR-A02 | Disaster recovery RTO | 4 hours |
| NFR-A03 | Data backup frequency | Daily |
| NFR-A04 | Backup retention | 90 days |

---

## Success Metrics

### Key Performance Indicators

| Metric | Baseline | Target (6 months) | Target (12 months) |
|--------|----------|-------------------|---------------------|
| Form completion rate | ~50% | 65% | 75% |
| Average completion time | - | 10 min reduction | 50% reduction |
| Lead-to-client conversion | - | +20% | +35% |
| Time to first response | - | < 1 hour | < 30 min |
| Client satisfaction (NPS) | - | +40 | +50 |
| Admin time saved | - | 2 hrs/day | 4 hrs/day |

### Competitive Benchmarks

| Feature | Typeform | Jotform | Lawmatics | Target |
|---------|----------|---------|-----------|--------|
| AI form generation | ✓ | ✓ | ✗ | ✓ |
| Conversational forms | ✓ (Formless) | ✓ | ✗ | ✓ |
| Lead scoring | ✗ | ✗ | ✓ | ✓ |
| Conflict checking | ✗ | ✗ | ✓ | ✓ |
| CRM integration | Basic | Basic | Deep | Deep |
| Multi-channel | ✗ | ✗ | SMS only | Full |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| AI API costs exceed budget | Medium | Medium | Implement usage limits, caching, hybrid AI/rule approach |
| Legal compliance complexity | Medium | High | Partner with legal tech consultants, phased rollout |
| Integration failures | Medium | Medium | Comprehensive testing, graceful degradation |
| User adoption resistance | Low | Medium | Excellent onboarding, training materials |
| Competitor feature parity | Medium | Low | Focus on integration depth over feature breadth |

---

## Dependencies

### External Dependencies

| Dependency | Purpose | Status |
|------------|---------|--------|
| OpenAI API | NLP, form generation, extraction | Available |
| Anthropic Claude API | Alternative AI provider | Available |
| AWS Textract | OCR | Available |
| Twilio | SMS | Already integrated |
| Stripe | Payments | Not integrated |
| DocuSign API | E-signatures | Infrastructure ready |
| HelloSign API | E-signatures | Infrastructure ready |

### Internal Dependencies

| Dependency | Purpose | Status |
|------------|---------|--------|
| CRM Module | Lead/contact/opportunity creation | Available |
| Scheduling Module | Appointment booking | Available |
| Chatbot Module | Widget infrastructure | Available |
| Lead Scoring Module | Scoring models | Available |

---

## Implementation Plan

### Overview

The implementation is organized into 4 development phases spanning approximately 6-8 months, with each phase delivering production-ready functionality. The approach prioritizes high-impact AI capabilities first, followed by integration depth and industry-specific features.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        AI CLIENT INTAKE UPGRADE ROADMAP                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  PHASE 1: AI Foundation              PHASE 2: CRM & Compliance                 │
│  ════════════════════                ══════════════════════════                 │
│  • AI Form Generation                • Auto CRM Entity Creation                │
│  • Conversational Forms              • Activity Timeline Integration           │
│  • Document Intelligence             • Conflict Checking                       │
│  • Lead Scoring                      • Legal Pre-Screening                     │
│                                                                                 │
│  Duration: 6-8 weeks                 Duration: 4-6 weeks                       │
│  ───────────────────────────────────────────────────────────────────────────── │
│                                                                                 │
│  PHASE 3: Multi-Channel & UX         PHASE 4: Enterprise Features              │
│  ═══════════════════════════         ═══════════════════════════               │
│  • SMS/WhatsApp Intake               • Payment Integration                     │
│  • Website Embed Widget              • Calendar Integration                    │
│  • Smart Form Optimization           • White-Label                             │
│  • Advanced Analytics                • Practice Mgmt Integrations              │
│                                                                                 │
│  Duration: 4-6 weeks                 Duration: 4-6 weeks                       │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

### Phase 1: AI Foundation (Weeks 1-8)

**Goal:** Deliver core AI capabilities that differentiate from legacy form builders.

#### Sprint 1-2: AI-Assisted Form Generation

**Backend Tasks:**

| Task | Files Affected | Effort |
|------|---------------|--------|
| Create AI service for form generation | `intake/ai/form-generator.service.ts` | 2 days |
| Build prompt templates by industry | `intake/ai/prompts/` | 2 days |
| Map AI output to existing field schema | `intake/ai/field-mapper.ts` | 1 day |
| Add API endpoints for AI generation | `intake/intake.router.ts` | 1 day |
| Create industry detection logic | `intake/ai/industry-detector.ts` | 1 day |
| Add form generation validation | `validation/intake/ai.schema.ts` | 0.5 days |
| Unit tests | `test/intake/ai/` | 1.5 days |

**Frontend Tasks:**

| Task | Files Affected | Effort |
|------|---------------|--------|
| AI form generation modal | `components/intake/AIFormGenerator.tsx` | 2 days |
| Industry selector component | `components/intake/IndustrySelector.tsx` | 0.5 days |
| Generated form preview/edit | `components/intake/GeneratedFormPreview.tsx` | 1.5 days |
| Integration with existing form builder | `pages/ai-tools/IntakePage.tsx` | 1 day |
| Loading states and error handling | Various | 0.5 days |

**Deliverables:**
- Users can describe intake needs in plain English
- System generates form with appropriate fields and logic
- Generated forms can be edited before publishing
- Industry-specific templates enhance suggestions

---

#### Sprint 3-4: Conversational Intake Forms

**Backend Tasks:**

| Task | Files Affected | Effort |
|------|---------------|--------|
| Create IntakeConversation model | `prisma/schema.prisma` | 0.5 days |
| Create conversation service | `intake/conversation/conversation.service.ts` | 3 days |
| Implement entity extraction | `intake/conversation/entity-extractor.ts` | 2 days |
| Build conversation state machine | `intake/conversation/state-machine.ts` | 2 days |
| Add streaming response support | `intake/conversation/stream.service.ts` | 1 day |
| Public conversation endpoints | `intake/intake.router.ts` | 1 day |
| Database migration | `prisma/migrations/` | 0.5 days |
| Unit and integration tests | `test/intake/conversation/` | 2 days |

**Frontend Tasks:**

| Task | Files Affected | Effort |
|------|---------------|--------|
| Conversational chat UI component | `components/intake/ConversationalIntake.tsx` | 3 days |
| Message threading and history | `components/intake/ChatHistory.tsx` | 1 day |
| Real-time typing indicators | `components/intake/TypingIndicator.tsx` | 0.5 days |
| Progress indicator for form completion | `components/intake/ConversationProgress.tsx` | 1 day |
| Mode toggle (form ↔ chat) | `components/intake/IntakeModeToggle.tsx` | 0.5 days |
| Mobile-optimized chat view | `components/intake/MobileChat.tsx` | 1 day |

**Deliverables:**
- Clients can complete intake via natural conversation
- AI extracts structured data from natural language
- Progress tracked against required fields
- Seamless switch between chat and form modes

---

#### Sprint 5-6: Document Intelligence

**Backend Tasks:**

| Task | Files Affected | Effort |
|------|---------------|--------|
| Integrate OCR service (AWS Textract) | `intake/documents/ocr.service.ts` | 2 days |
| AI-powered data extraction | `intake/documents/ai-extractor.service.ts` | 3 days |
| Document classification logic | `intake/documents/classifier.service.ts` | 2 days |
| Confidence scoring implementation | `intake/documents/confidence.service.ts` | 1 day |
| Extraction template system | `intake/documents/templates/` | 2 days |
| Update existing `extractDocumentData` | `intake/intake.service.ts` | 1 day |
| Human review workflow | `intake/documents/review.service.ts` | 1.5 days |
| Tests | `test/intake/documents/` | 2 days |

**Frontend Tasks:**

| Task | Files Affected | Effort |
|------|---------------|--------|
| Document upload with preview | `components/intake/DocumentUploader.tsx` | 2 days |
| Extraction results display | `components/intake/ExtractionResults.tsx` | 1.5 days |
| Manual correction interface | `components/intake/ExtractionCorrection.tsx` | 2 days |
| Confidence indicators | `components/intake/ConfidenceIndicator.tsx` | 0.5 days |
| Review queue for low-confidence | `components/intake/ExtractionReviewQueue.tsx` | 1.5 days |

**Deliverables:**
- OCR processing for scanned documents
- AI extraction of relevant data points
- Automatic document type classification
- Confidence-based review workflow
- Auto-population of form fields from documents

---

#### Sprint 7-8: Predictive Lead Scoring

**Backend Tasks:**

| Task | Files Affected | Effort |
|------|---------------|--------|
| Create scoring models in schema | `prisma/schema.prisma` | 0.5 days |
| Rule-based scoring engine | `intake/scoring/rule-engine.service.ts` | 2 days |
| Scoring configuration service | `intake/scoring/config.service.ts` | 1.5 days |
| Score calculation on submission | `intake/scoring/calculator.service.ts` | 2 days |
| Integration with existing lead-scoring module | `intake/scoring/integration.service.ts` | 1.5 days |
| Notification on high-score leads | `intake/scoring/notification.service.ts` | 1 day |
| API endpoints | `intake/intake.router.ts` | 1 day |
| Database migration | `prisma/migrations/` | 0.5 days |
| Tests | `test/intake/scoring/` | 1.5 days |

**Frontend Tasks:**

| Task | Files Affected | Effort |
|------|---------------|--------|
| Lead score display component | `components/intake/LeadScoreDisplay.tsx` | 1 day |
| Score breakdown visualization | `components/intake/ScoreBreakdown.tsx` | 1.5 days |
| Scoring configuration UI | `components/intake/ScoringConfig.tsx` | 2 days |
| High-priority indicators | `components/intake/PriorityBadge.tsx` | 0.5 days |
| Score-based submission sorting | `pages/ai-tools/IntakePage.tsx` | 1 day |

**Deliverables:**
- Configurable scoring rules per intake config
- Automatic score calculation on submission
- Score breakdown with contributing factors
- Priority notifications for high-value leads
- Integration with existing lead scoring module

---

### Phase 2: CRM & Legal Compliance (Weeks 9-14)

**Goal:** Deep CRM integration and legal industry features.

#### Sprint 9-10: CRM Entity Creation

**Backend Tasks:**

| Task | Files Affected | Effort |
|------|---------------|--------|
| Create CRM mapping models | `prisma/schema.prisma` | 0.5 days |
| Field mapping configuration service | `intake/crm/mapping.service.ts` | 2 days |
| Duplicate detection service | `intake/crm/duplicate-detector.service.ts` | 2 days |
| CRMContact creation from submission | `intake/crm/contact-sync.service.ts` | 2 days |
| Account creation from submission | `intake/crm/account-sync.service.ts` | 1.5 days |
| Opportunity creation from submission | `intake/crm/opportunity-sync.service.ts` | 2 days |
| Sync orchestration service | `intake/crm/sync-orchestrator.service.ts` | 1.5 days |
| API endpoints for mapping config | `intake/intake.router.ts` | 1 day |
| Migration | `prisma/migrations/` | 0.5 days |
| Tests | `test/intake/crm/` | 2 days |

**Frontend Tasks:**

| Task | Files Affected | Effort |
|------|---------------|--------|
| CRM mapping configuration UI | `components/intake/CRMMappingConfig.tsx` | 3 days |
| Field mapping builder | `components/intake/FieldMappingBuilder.tsx` | 2 days |
| Duplicate detection preview | `components/intake/DuplicatePreview.tsx` | 1 day |
| CRM sync status display | `components/intake/CRMSyncStatus.tsx` | 1 day |
| Created entities links | `components/intake/LinkedEntities.tsx` | 1 day |

**Deliverables:**
- Configure field mappings from intake to CRM
- Automatic CRMContact/Account/Opportunity creation
- Duplicate detection before creation
- Sync status tracking on submissions
- Links to created CRM entities

---

#### Sprint 11-12: Activity Timeline & Conflict Checking

**Backend Tasks:**

| Task | Files Affected | Effort |
|------|---------------|--------|
| Activity creation on intake events | `intake/crm/activity-logger.service.ts` | 2 days |
| Create ConflictCheck model | `prisma/schema.prisma` | 0.5 days |
| Conflict checking service | `intake/legal/conflict-check.service.ts` | 3 days |
| Fuzzy name matching algorithm | `intake/legal/fuzzy-matcher.service.ts` | 2 days |
| Conflict workflow service | `intake/legal/conflict-workflow.service.ts` | 1.5 days |
| Conflict check API endpoints | `intake/intake.router.ts` | 1 day |
| Migration | `prisma/migrations/` | 0.5 days |
| Tests | `test/intake/legal/` | 2 days |

**Frontend Tasks:**

| Task | Files Affected | Effort |
|------|---------------|--------|
| Conflict check results display | `components/intake/ConflictCheckResults.tsx` | 2 days |
| Conflict review workflow UI | `components/intake/ConflictReview.tsx` | 2 days |
| Waiver collection interface | `components/intake/WaiverCollection.tsx` | 1.5 days |
| Legal intake configuration | `components/intake/LegalIntakeConfig.tsx` | 1.5 days |

**Deliverables:**
- Activities logged for all intake events
- Automatic conflict of interest checking
- Fuzzy matching for name variations
- Conflict review and waiver workflow
- Legal-specific configuration options

---

#### Sprint 13-14: Legal Pre-Screening & Engagement Letters

**Backend Tasks:**

| Task | Files Affected | Effort |
|------|---------------|--------|
| Practice area configuration | `intake/legal/practice-areas.service.ts` | 1.5 days |
| Case type screening logic | `intake/legal/case-screening.service.ts` | 2 days |
| Statute of limitations calculator | `intake/legal/sol-calculator.service.ts` | 1.5 days |
| Engagement letter templates | `intake/legal/engagement-letter.service.ts` | 2 days |
| Template population service | `intake/legal/template-populator.service.ts` | 1.5 days |
| E-signature trigger integration | `intake/legal/esign-trigger.service.ts` | 2 days |
| API endpoints | `intake/intake.router.ts` | 1 day |
| Tests | `test/intake/legal/` | 2 days |

**Frontend Tasks:**

| Task | Files Affected | Effort |
|------|---------------|--------|
| Practice area configuration UI | `components/intake/PracticeAreaConfig.tsx` | 2 days |
| Case screening results display | `components/intake/CaseScreeningResults.tsx` | 1 day |
| Engagement letter template editor | `components/intake/EngagementLetterEditor.tsx` | 2 days |
| E-signature status tracking | `components/intake/ESignatureStatus.tsx` | 1 day |

**Deliverables:**
- Configure accepted practice areas
- Automatic case type screening
- Statute of limitations warnings
- Engagement letter template management
- Automatic e-signature workflow trigger

---

### Phase 3: Multi-Channel & UX (Weeks 15-20)

**Goal:** Expand intake channels and optimize user experience.

#### Sprint 15-16: SMS & WhatsApp Intake

**Backend Tasks:**

| Task | Files Affected | Effort |
|------|---------------|--------|
| SMS conversation handler | `intake/channels/sms.service.ts` | 3 days |
| WhatsApp integration | `intake/channels/whatsapp.service.ts` | 3 days |
| Channel message adapter | `intake/channels/adapter.service.ts` | 2 days |
| MMS document handling | `intake/channels/mms-handler.service.ts` | 1.5 days |
| Webhook endpoints for providers | `intake/channels/webhooks.router.ts` | 1 day |
| Tests | `test/intake/channels/` | 2 days |

**Frontend Tasks:**

| Task | Files Affected | Effort |
|------|---------------|--------|
| Channel configuration UI | `components/intake/ChannelConfig.tsx` | 2 days |
| SMS/WhatsApp conversation view | `components/intake/ChannelConversationView.tsx` | 2 days |
| Channel analytics | `components/intake/ChannelAnalytics.tsx` | 1 day |

**Deliverables:**
- Complete intake via SMS conversation
- WhatsApp integration with rich messaging
- Document upload via MMS
- Unified conversation management

---

#### Sprint 17-18: Website Embed Widget

**Backend Tasks:**

| Task | Files Affected | Effort |
|------|---------------|--------|
| Widget configuration endpoints | `intake/widget/widget.router.ts` | 1.5 days |
| Public widget form endpoint | `intake/widget/public.router.ts` | 1 day |
| Tests | `test/intake/widget/` | 1 day |

**Frontend Tasks (Widget Package):**

| Task | Files Affected | Effort |
|------|---------------|--------|
| Extend chatbot-widget for intake | `packages/chatbot-widget/` | 3 days |
| Intake mode configuration | `packages/chatbot-widget/src/intake/` | 2 days |
| Form/chat mode toggle in widget | `packages/chatbot-widget/src/components/` | 1.5 days |
| Trigger conditions (exit intent, etc.) | `packages/chatbot-widget/src/triggers/` | 2 days |
| URL parameter handling | `packages/chatbot-widget/src/utils/` | 1 day |
| Widget documentation | `packages/chatbot-widget/README.md` | 0.5 days |

**Deliverables:**
- Embeddable JavaScript widget
- Configurable appearance matching brand
- Multiple display triggers
- Form and conversational modes
- Pre-fill from URL parameters

---

#### Sprint 19-20: Form Optimization & Analytics

**Backend Tasks:**

| Task | Files Affected | Effort |
|------|---------------|--------|
| Field-level analytics collection | `intake/analytics/field-analytics.service.ts` | 2 days |
| Drop-off analysis service | `intake/analytics/dropoff.service.ts` | 2 days |
| AI optimization suggestions | `intake/analytics/ai-optimizer.service.ts` | 2 days |
| Enhanced analytics endpoints | `intake/intake.router.ts` | 1.5 days |
| A/B testing framework | `intake/analytics/ab-testing.service.ts` | 3 days |
| Tests | `test/intake/analytics/` | 2 days |

**Frontend Tasks:**

| Task | Files Affected | Effort |
|------|---------------|--------|
| Analytics dashboard redesign | `pages/ai-tools/IntakeAnalyticsPage.tsx` | 3 days |
| Funnel visualization | `components/intake/FunnelVisualization.tsx` | 2 days |
| Field performance heatmap | `components/intake/FieldHeatmap.tsx` | 1.5 days |
| AI suggestions display | `components/intake/OptimizationSuggestions.tsx` | 1.5 days |
| A/B test configuration | `components/intake/ABTestConfig.tsx` | 2 days |
| Report export functionality | `components/intake/ReportExport.tsx` | 1 day |

**Deliverables:**
- Field-level completion analytics
- Visual drop-off analysis
- AI-generated optimization suggestions
- A/B testing capability
- Exportable reports

---

### Phase 4: Enterprise Features (Weeks 21-26)

**Goal:** Payment, calendar, and enterprise capabilities.

#### Sprint 21-22: Payment Integration

**Backend Tasks:**

| Task | Files Affected | Effort |
|------|---------------|--------|
| Create IntakePayment model | `prisma/schema.prisma` | 0.5 days |
| Stripe integration service | `intake/payments/stripe.service.ts` | 3 days |
| Payment configuration service | `intake/payments/config.service.ts` | 1.5 days |
| Payment processing in submission flow | `intake/payments/processor.service.ts` | 2 days |
| Refund handling | `intake/payments/refund.service.ts` | 1.5 days |
| Webhook handlers for payment events | `intake/payments/webhooks.router.ts` | 1.5 days |
| API endpoints | `intake/intake.router.ts` | 1 day |
| Migration | `prisma/migrations/` | 0.5 days |
| Tests | `test/intake/payments/` | 2 days |

**Frontend Tasks:**

| Task | Files Affected | Effort |
|------|---------------|--------|
| Payment configuration UI | `components/intake/PaymentConfig.tsx` | 2 days |
| Payment collection component | `components/intake/PaymentCollector.tsx` | 2 days |
| Payment status display | `components/intake/PaymentStatus.tsx` | 1 day |
| Receipt display | `components/intake/PaymentReceipt.tsx` | 0.5 days |
| Refund interface | `components/intake/RefundInterface.tsx` | 1 day |

**Deliverables:**
- Stripe payment collection during intake
- Configurable payment amounts and timing
- Payment status tracking
- Automatic receipt generation
- Refund processing for rejected submissions

---

#### Sprint 23-24: Calendar Integration & White-Label

**Backend Tasks:**

| Task | Files Affected | Effort |
|------|---------------|--------|
| Scheduling module integration | `intake/scheduling/integration.service.ts` | 2 days |
| Conditional scheduling logic | `intake/scheduling/conditional.service.ts` | 1.5 days |
| Intake context in appointments | `intake/scheduling/context.service.ts` | 1 day |
| White-label configuration | `intake/whitelabel/config.service.ts` | 2 days |
| Custom domain handling | `intake/whitelabel/domain.service.ts` | 2 days |
| Email template branding | `intake/whitelabel/email.service.ts` | 1.5 days |
| API endpoints | `intake/intake.router.ts` | 1 day |
| Tests | `test/intake/` | 2 days |

**Frontend Tasks:**

| Task | Files Affected | Effort |
|------|---------------|--------|
| Embedded scheduling step | `components/intake/SchedulingStep.tsx` | 2 days |
| White-label configuration UI | `components/intake/WhiteLabelConfig.tsx` | 2 days |
| Custom domain setup | `components/intake/CustomDomainSetup.tsx` | 1.5 days |
| Email template preview | `components/intake/EmailTemplatePreview.tsx` | 1 day |

**Deliverables:**
- Calendar embedded in intake flow
- Score-based scheduling availability
- Intake data passed to appointments
- Full white-label capability
- Custom domain support

---

#### Sprint 25-26: Practice Management Integrations

**Backend Tasks:**

| Task | Files Affected | Effort |
|------|---------------|--------|
| Integration framework | `intake/integrations/framework.ts` | 2 days |
| Clio Manage integration | `intake/integrations/clio.service.ts` | 3 days |
| MyCase integration | `intake/integrations/mycase.service.ts` | 3 days |
| Generic webhook integration | `intake/integrations/webhook.service.ts` | 2 days |
| OAuth flow for integrations | `intake/integrations/oauth.service.ts` | 2 days |
| Sync status tracking | `intake/integrations/sync-status.service.ts` | 1 day |
| Tests | `test/intake/integrations/` | 2 days |

**Frontend Tasks:**

| Task | Files Affected | Effort |
|------|---------------|--------|
| Integration marketplace UI | `components/intake/IntegrationMarketplace.tsx` | 2 days |
| Integration configuration | `components/intake/IntegrationConfig.tsx` | 2 days |
| OAuth connection flow | `components/intake/OAuthConnect.tsx` | 1.5 days |
| Sync status dashboard | `components/intake/IntegrationSyncStatus.tsx` | 1 day |

**Deliverables:**
- Clio Manage client/matter sync
- MyCase client/case sync
- Generic webhook for custom integrations
- Integration status monitoring

---

## File Structure Summary

```
pmo/apps/api/src/modules/intake/
├── ai/
│   ├── form-generator.service.ts
│   ├── field-mapper.ts
│   ├── industry-detector.ts
│   └── prompts/
│       ├── legal.prompt.ts
│       ├── healthcare.prompt.ts
│       ├── consulting.prompt.ts
│       └── generic.prompt.ts
├── analytics/
│   ├── field-analytics.service.ts
│   ├── dropoff.service.ts
│   ├── ai-optimizer.service.ts
│   └── ab-testing.service.ts
├── channels/
│   ├── sms.service.ts
│   ├── whatsapp.service.ts
│   ├── adapter.service.ts
│   ├── mms-handler.service.ts
│   └── webhooks.router.ts
├── conversation/
│   ├── conversation.service.ts
│   ├── entity-extractor.ts
│   ├── state-machine.ts
│   └── stream.service.ts
├── crm/
│   ├── mapping.service.ts
│   ├── duplicate-detector.service.ts
│   ├── contact-sync.service.ts
│   ├── account-sync.service.ts
│   ├── opportunity-sync.service.ts
│   ├── sync-orchestrator.service.ts
│   └── activity-logger.service.ts
├── documents/
│   ├── ocr.service.ts
│   ├── ai-extractor.service.ts
│   ├── classifier.service.ts
│   ├── confidence.service.ts
│   ├── review.service.ts
│   └── templates/
├── integrations/
│   ├── framework.ts
│   ├── clio.service.ts
│   ├── mycase.service.ts
│   ├── webhook.service.ts
│   ├── oauth.service.ts
│   └── sync-status.service.ts
├── legal/
│   ├── conflict-check.service.ts
│   ├── fuzzy-matcher.service.ts
│   ├── conflict-workflow.service.ts
│   ├── practice-areas.service.ts
│   ├── case-screening.service.ts
│   ├── sol-calculator.service.ts
│   ├── engagement-letter.service.ts
│   ├── template-populator.service.ts
│   └── esign-trigger.service.ts
├── payments/
│   ├── stripe.service.ts
│   ├── config.service.ts
│   ├── processor.service.ts
│   ├── refund.service.ts
│   └── webhooks.router.ts
├── scheduling/
│   ├── integration.service.ts
│   ├── conditional.service.ts
│   └── context.service.ts
├── scoring/
│   ├── rule-engine.service.ts
│   ├── config.service.ts
│   ├── calculator.service.ts
│   ├── integration.service.ts
│   └── notification.service.ts
├── whitelabel/
│   ├── config.service.ts
│   ├── domain.service.ts
│   └── email.service.ts
├── widget/
│   ├── widget.router.ts
│   └── public.router.ts
├── intake.service.ts          # Existing - enhanced
├── intake.router.ts           # Existing - enhanced
└── index.ts

pmo/apps/web/src/
├── components/intake/
│   ├── AIFormGenerator.tsx
│   ├── IndustrySelector.tsx
│   ├── GeneratedFormPreview.tsx
│   ├── ConversationalIntake.tsx
│   ├── ChatHistory.tsx
│   ├── TypingIndicator.tsx
│   ├── ConversationProgress.tsx
│   ├── IntakeModeToggle.tsx
│   ├── MobileChat.tsx
│   ├── DocumentUploader.tsx
│   ├── ExtractionResults.tsx
│   ├── ExtractionCorrection.tsx
│   ├── ConfidenceIndicator.tsx
│   ├── ExtractionReviewQueue.tsx
│   ├── LeadScoreDisplay.tsx
│   ├── ScoreBreakdown.tsx
│   ├── ScoringConfig.tsx
│   ├── PriorityBadge.tsx
│   ├── CRMMappingConfig.tsx
│   ├── FieldMappingBuilder.tsx
│   ├── DuplicatePreview.tsx
│   ├── CRMSyncStatus.tsx
│   ├── LinkedEntities.tsx
│   ├── ConflictCheckResults.tsx
│   ├── ConflictReview.tsx
│   ├── WaiverCollection.tsx
│   ├── LegalIntakeConfig.tsx
│   ├── PracticeAreaConfig.tsx
│   ├── CaseScreeningResults.tsx
│   ├── EngagementLetterEditor.tsx
│   ├── ESignatureStatus.tsx
│   ├── ChannelConfig.tsx
│   ├── ChannelConversationView.tsx
│   ├── ChannelAnalytics.tsx
│   ├── FunnelVisualization.tsx
│   ├── FieldHeatmap.tsx
│   ├── OptimizationSuggestions.tsx
│   ├── ABTestConfig.tsx
│   ├── ReportExport.tsx
│   ├── PaymentConfig.tsx
│   ├── PaymentCollector.tsx
│   ├── PaymentStatus.tsx
│   ├── PaymentReceipt.tsx
│   ├── RefundInterface.tsx
│   ├── SchedulingStep.tsx
│   ├── WhiteLabelConfig.tsx
│   ├── CustomDomainSetup.tsx
│   ├── EmailTemplatePreview.tsx
│   ├── IntegrationMarketplace.tsx
│   ├── IntegrationConfig.tsx
│   ├── OAuthConnect.tsx
│   └── IntegrationSyncStatus.tsx
└── pages/ai-tools/
    ├── IntakePage.tsx         # Existing - enhanced
    └── IntakeAnalyticsPage.tsx

pmo/packages/chatbot-widget/
├── src/
│   ├── intake/                # New intake mode
│   ├── triggers/              # Display triggers
│   └── ...
└── README.md
```

---

## Database Migration Summary

### New Models to Add

```prisma
// Add to schema.prisma

model IntakeConversation {
  id              String             @id @default(uuid())
  submissionId    String             @unique
  messages        Json
  currentFieldId  String?
  completedFields String[]
  status          ConversationStatus @default(ACTIVE)
  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt

  submission      IntakeSubmission   @relation(fields: [submissionId], references: [id], onDelete: Cascade)
}

enum ConversationStatus {
  ACTIVE
  PAUSED
  COMPLETED
  ABANDONED
}

model IntakeLeadScore {
  id              String   @id @default(uuid())
  submissionId    String   @unique
  overallScore    Int
  qualityScore    Int
  fitScore        Int
  urgencyScore    Int
  valueScore      Int
  factors         Json
  modelVersion    String
  calculatedAt    DateTime @default(now())

  submission      IntakeSubmission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
}

model IntakeScoringConfig {
  id              String   @id @default(uuid())
  configId        String
  name            String
  rules           Json
  weights         Json
  thresholds      Json
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  config          IntakeConfig @relation(fields: [configId], references: [id], onDelete: Cascade)
}

model IntakeCRMMapping {
  id              String        @id @default(uuid())
  configId        String
  formId          String?
  entity          CRMEntityType
  fieldMappings   Json
  conditions      Json?
  autoCreate      Boolean       @default(true)
  requireApproval Boolean       @default(false)
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  config          IntakeConfig  @relation(fields: [configId], references: [id], onDelete: Cascade)
  form            IntakeForm?   @relation(fields: [formId], references: [id])
}

enum CRMEntityType {
  CONTACT
  ACCOUNT
  OPPORTUNITY
  ACTIVITY
}

model ConflictCheck {
  id              String           @id @default(uuid())
  submissionId    String
  configId        String
  searchTerms     Json
  results         Json
  status          ConflictStatus   @default(PENDING)
  severity        ConflictSeverity?
  reviewedBy      String?
  reviewedAt      DateTime?
  waiverObtained  Boolean          @default(false)
  waiverDocId     String?
  notes           String?
  createdAt       DateTime         @default(now())

  submission      IntakeSubmission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  config          IntakeConfig     @relation(fields: [configId], references: [id])
}

enum ConflictStatus {
  PENDING
  NO_CONFLICT
  POTENTIAL_CONFLICT
  CONFLICT_FOUND
  WAIVED
  DECLINED
}

enum ConflictSeverity {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

model IntakePayment {
  id              String        @id @default(uuid())
  submissionId    String
  amount          Decimal       @db.Decimal(10, 2)
  currency        String        @default("USD")
  status          PaymentStatus
  provider        String
  externalId      String
  metadata        Json?
  paidAt          DateTime?
  refundedAt      DateTime?
  refundAmount    Decimal?      @db.Decimal(10, 2)
  createdAt       DateTime      @default(now())

  submission      IntakeSubmission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
}

enum PaymentStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  REFUNDED
  PARTIALLY_REFUNDED
}

model IntakeChannelConfig {
  id              String   @id @default(uuid())
  configId        String
  channel         IntakeChannel
  isEnabled       Boolean  @default(false)
  credentials     Json?
  settings        Json?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  config          IntakeConfig @relation(fields: [configId], references: [id], onDelete: Cascade)

  @@unique([configId, channel])
}

enum IntakeChannel {
  WEB
  SMS
  WHATSAPP
  WIDGET
}

model IntakeFieldAnalytics {
  id              String   @id @default(uuid())
  formId          String
  fieldId         String
  date            DateTime @db.Date
  views           Int      @default(0)
  starts          Int      @default(0)
  completions     Int      @default(0)
  avgTimeMs       Int?
  dropoffs        Int      @default(0)
  createdAt       DateTime @default(now())

  form            IntakeForm @relation(fields: [formId], references: [id], onDelete: Cascade)

  @@unique([formId, fieldId, date])
}
```

### Modifications to Existing Models

```prisma
// Add to IntakeSubmission
model IntakeSubmission {
  // ... existing fields

  // CRM Integration
  crmContactId      String?
  crmAccountId      String?
  crmOpportunityId  String?
  crmSyncedAt       DateTime?
  crmSyncErrors     Json?

  // Channel tracking
  channel           IntakeChannel @default(WEB)

  // New relations
  conversation      IntakeConversation?
  leadScore         IntakeLeadScore?
  conflictChecks    ConflictCheck[]
  payments          IntakePayment[]
}

// Add to IntakeConfig
model IntakeConfig {
  // ... existing fields

  // New relations
  scoringConfigs    IntakeScoringConfig[]
  crmMappings       IntakeCRMMapping[]
  conflictChecks    ConflictCheck[]
  channelConfigs    IntakeChannelConfig[]
}

// Add to IntakeForm
model IntakeForm {
  // ... existing fields

  // New relations
  crmMappings       IntakeCRMMapping[]
  fieldAnalytics    IntakeFieldAnalytics[]
}
```

---

## Testing Strategy

### Unit Tests

| Module | Coverage Target | Test Files |
|--------|-----------------|------------|
| AI Form Generator | 85% | `test/intake/ai/form-generator.test.ts` |
| Conversational Forms | 90% | `test/intake/conversation/` |
| Document Intelligence | 85% | `test/intake/documents/` |
| Lead Scoring | 90% | `test/intake/scoring/` |
| CRM Integration | 90% | `test/intake/crm/` |
| Legal Compliance | 95% | `test/intake/legal/` |
| Channels | 85% | `test/intake/channels/` |
| Payments | 95% | `test/intake/payments/` |

### Integration Tests

- End-to-end intake flow (form → submission → CRM)
- Conversational intake completion
- Document upload and extraction
- Payment processing flows
- Multi-channel intake paths

### E2E Tests

- Full intake journey for each industry
- Conversational vs traditional form completion
- Mobile responsiveness
- Widget embedding
- Cross-browser compatibility

---

## Environment Variables

### New Required Variables

```bash
# AI Services
OPENAI_API_KEY=sk-...              # Already in use
ANTHROPIC_API_KEY=sk-ant-...       # Optional fallback

# OCR Services
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1

# Payments
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_live_...

# Channels (extend existing)
TWILIO_ACCOUNT_SID=AC...           # Already in use
TWILIO_AUTH_TOKEN=...              # Already in use
WHATSAPP_BUSINESS_ID=...

# Legal Integrations
CLIO_CLIENT_ID=...
CLIO_CLIENT_SECRET=...
MYCASE_CLIENT_ID=...
MYCASE_CLIENT_SECRET=...
```

---

## Rollout Strategy

### Phase 1 Rollout (AI Foundation)

1. **Alpha (Week 8)**: Internal testing with 2-3 pilot clients
2. **Beta (Week 9-10)**: Expand to 10-15 early adopter clients
3. **GA (Week 11)**: Full availability with feature flags

### Phase 2 Rollout (CRM & Legal)

1. **Alpha (Week 14)**: Legal-specific features with 2 law firm partners
2. **Beta (Week 15-16)**: Expand to all legal clients
3. **GA (Week 17)**: Full availability

### Phase 3-4 Rollout

- Progressive rollout based on Phase 1-2 learnings
- Feature flags for enterprise features
- Gradual migration from basic to advanced analytics

---

## Budget Estimates

### Development Costs (Internal)

| Phase | Effort | Duration |
|-------|--------|----------|
| Phase 1 | 45-55 developer days | 8 weeks |
| Phase 2 | 35-40 developer days | 6 weeks |
| Phase 3 | 35-40 developer days | 6 weeks |
| Phase 4 | 35-40 developer days | 6 weeks |
| **Total** | **150-175 developer days** | **26 weeks** |

### External Service Costs (Monthly Estimates)

| Service | Usage Estimate | Cost |
|---------|----------------|------|
| OpenAI API | 50K requests/mo | $500-1,500 |
| AWS Textract | 10K pages/mo | $150-300 |
| Stripe | 2.9% + $0.30/txn | Variable |
| Twilio SMS | 5K messages/mo | $40-100 |
| WhatsApp API | 5K messages/mo | $50-150 |
| **Total** | - | **$750-2,050/mo** |

### One-Time Costs

| Item | Cost |
|------|------|
| SOC 2 Type I Certification | $25,000-50,000 |
| Legal consultation (compliance) | $5,000-10,000 |
| Security audit | $10,000-20,000 |

---

## Approval & Sign-Off

### Required Approvals

- [ ] Product Owner: Requirements approval
- [ ] Technical Lead: Architecture approval
- [ ] Security: Compliance review
- [ ] Legal: Privacy and terms review

### Review Schedule

| Milestone | Review Date | Participants |
|-----------|-------------|--------------|
| Requirements Review | TBD | Product, Engineering |
| Architecture Review | TBD | Technical Lead, Security |
| Phase 1 Demo | End of Week 8 | All stakeholders |
| Phase 2 Demo | End of Week 14 | All stakeholders |
| Phase 3 Demo | End of Week 20 | All stakeholders |
| Final Review | End of Week 26 | All stakeholders |

---

## Appendix A: Competitor Feature Matrix

| Feature | Our Target | Typeform | Jotform | Lawmatics | HoneyBook |
|---------|------------|----------|---------|-----------|-----------|
| AI Form Generation | ✓ | ✓ | ✓ | ✗ | ✗ |
| Conversational Forms | ✓ | ✓ (Formless) | ✓ (basic) | ✗ | ✗ |
| Document AI Extraction | ✓ | ✗ | ✗ | ✗ | ✗ |
| Lead Scoring | ✓ | ✗ | ✗ | ✓ | ✓ (basic) |
| Conflict Checking | ✓ | ✗ | ✗ | ✓ | ✗ |
| CRM Auto-Creation | ✓ | Basic | Basic | ✓ | ✓ |
| Multi-Channel | ✓ | ✗ | ✗ | SMS only | ✗ |
| Payment Collection | ✓ | ✓ | ✓ | ✗ | ✓ |
| White-Label | ✓ | ✓ | ✓ | ✗ | ✗ |
| Legal PMS Integration | ✓ | ✗ | ✗ | ✓ | ✗ |

---

## Appendix B: API Endpoint Summary

### New Endpoints by Phase

**Phase 1 - AI Foundation:**
```
POST /api/intake/ai/generate-form
POST /api/intake/ai/suggest-fields
POST /api/public/intake/conversation/start
POST /api/public/intake/conversation/:token/message
GET  /api/public/intake/conversation/:token/summary
POST /api/intake/documents/:id/extract
GET  /api/intake/submissions/:id/score
POST /api/intake/:configId/scoring-config
POST /api/intake/submissions/:id/recalculate-score
```

**Phase 2 - CRM & Legal:**
```
POST /api/intake/:configId/crm-mappings
POST /api/intake/submissions/:id/sync-to-crm
GET  /api/intake/submissions/:id/crm-entities
POST /api/intake/submissions/:id/conflict-check
GET  /api/intake/submissions/:id/conflict-check
POST /api/intake/conflict-checks/:id/review
POST /api/intake/:configId/practice-areas
POST /api/intake/submissions/:id/screen
POST /api/intake/:configId/engagement-templates
POST /api/intake/submissions/:id/send-engagement
```

**Phase 3 - Multi-Channel:**
```
POST /api/intake/:configId/channels/:channel/config
POST /api/intake/webhooks/twilio
POST /api/intake/webhooks/whatsapp
GET  /api/intake/:configId/analytics/fields
GET  /api/intake/:configId/analytics/dropoff
GET  /api/intake/:configId/analytics/suggestions
POST /api/intake/:configId/ab-tests
```

**Phase 4 - Enterprise:**
```
POST /api/intake/:configId/payment-config
POST /api/intake/submissions/:id/charge
POST /api/intake/payments/:id/refund
GET  /api/intake/integrations
POST /api/intake/integrations/:provider/connect
POST /api/intake/integrations/:provider/sync
```

---

*Document End*
