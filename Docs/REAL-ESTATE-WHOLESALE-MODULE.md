# Real Estate Wholesale Module - Product Requirements & Implementation Plan

## Executive Summary

This document outlines the product requirements and implementation plan for a Real Estate Wholesale module within the AI CRM Platform. The module targets solo wholesalers and small investment teams, providing AI-powered distressed property identification, predictive lead scoring, and deal analysis to reduce the 100+ hours monthly that operators spend on low-conversion activities.

**Key Differentiator:** Unlike competitors that provide data access without intelligence, this module delivers genuine ML-based prediction—answering "call these 10 today" instead of "here are 500 matching properties."

---

## Table of Contents

1. [Product Requirements](#product-requirements)
   - [User Personas](#user-personas)
   - [Core Features](#core-features)
   - [AI Capabilities](#ai-capabilities)
   - [Integration Requirements](#integration-requirements)
2. [Technical Architecture](#technical-architecture)
   - [Module Structure](#module-structure)
   - [Database Schema](#database-schema)
   - [API Endpoints](#api-endpoints)
3. [Implementation Plan](#implementation-plan)
   - [Phase 1: Foundation](#phase-1-foundation)
   - [Phase 2: AI Intelligence](#phase-2-ai-intelligence)
   - [Phase 3: Outreach & Automation](#phase-3-outreach--automation)
   - [Phase 4: Analytics & Optimization](#phase-4-analytics--optimization)
4. [UI/UX Specifications](#uiux-specifications)
5. [Success Metrics](#success-metrics)

---

## Product Requirements

### User Personas

#### Primary: Solo Wholesaler
- **Profile:** Individual operator managing entire pipeline (lead gen → acquisition → disposition)
- **Pain Points:**
  - Spends 100+ hours/month on manual lead filtering
  - Uses 5-8 separate tools ($400-600/month)
  - Lacks data-driven prioritization
  - Follow-up timing is guesswork
- **Goals:**
  - Identify highest-probability sellers quickly
  - Automate follow-up sequences
  - Close more deals with less effort

#### Secondary: Small Investment Team (2-5 people)
- **Profile:** Team with dedicated acquisition and disposition roles
- **Pain Points:**
  - Coordination between team members
  - Tracking deal assignments
  - Consistent follow-up across team
- **Goals:**
  - Shared pipeline visibility
  - Role-based lead assignment
  - Team performance tracking

---

### Core Features

#### 1. Property Management

| Feature | Description | Priority |
|---------|-------------|----------|
| **Property Database** | Centralized property records with ownership, equity, condition data | P0 |
| **Distress Indicators** | Track pre-foreclosure, tax delinquency, vacancy, probate, code violations | P0 |
| **List Stacking** | Combine multiple distress signals to identify highest-quality leads | P0 |
| **Bulk Import** | Import property lists from CSV, external data providers | P0 |
| **Property Photos** | Store and analyze property images for condition assessment | P1 |
| **Driving for Dollars** | Mobile-first property capture with GPS routes | P1 |
| **Skip Tracing Integration** | Owner contact lookup (phone, email, mailing address) | P0 |

#### 2. Seller/Lead Management

| Feature | Description | Priority |
|---------|-------------|----------|
| **Seller Profiles** | Property owner records linked to properties | P0 |
| **Motivation Tracking** | Record motivation signals (divorce, inheritance, job loss, tired landlord) | P0 |
| **Contact History** | Unified timeline of all communications | P0 |
| **Lead Status Pipeline** | New → Contacted → Qualified → Offer Sent → Under Contract → Closed | P0 |
| **Tags & Segments** | Custom categorization for filtering and automation | P1 |

#### 3. Deal Analysis

| Feature | Description | Priority |
|---------|-------------|----------|
| **ARV Estimation** | After-repair value calculation with comp analysis | P0 |
| **Repair Estimates** | Condition-based repair cost estimation | P1 |
| **Wholesale Margin Calculator** | MAO (Maximum Allowable Offer) at 70% rule | P0 |
| **Comp Finder** | Find comparable sales within radius/timeframe | P0 |
| **Deal Analyzer** | Full deal breakdown with profit projections | P0 |
| **Offer Generator** | Generate LOI/purchase agreements | P2 |

#### 4. Buyer's List Management

| Feature | Description | Priority |
|---------|-------------|----------|
| **Buyer Database** | Cash buyers with preferences (area, property type, budget) | P0 |
| **Buyer Matching** | Auto-match properties to buyers based on criteria | P1 |
| **Buyer Blast** | Send deal alerts to matched buyers | P1 |
| **Disposition Tracking** | Track assignments and double-close deals | P1 |

#### 5. Outreach & Follow-Up

| Feature | Description | Priority |
|---------|-------------|----------|
| **Multi-Channel Campaigns** | SMS, RVM (ringless voicemail), email, direct mail triggers | P0 |
| **Drip Sequences** | Automated follow-up based on lead status and engagement | P0 |
| **Call Tracking** | Click-to-call with recording and transcription | P1 |
| **A2P 10DLC Compliance** | SMS compliance setup and management | P0 |
| **Response Handling** | Auto-route hot responses to priority queue | P1 |

#### 6. Pipeline & Kanban

| Feature | Description | Priority |
|---------|-------------|----------|
| **Visual Pipeline** | Drag-and-drop deal stages | P0 |
| **Stage Automation** | Trigger actions on stage changes | P1 |
| **Deal Velocity** | Track average time per stage | P1 |
| **Forecasting** | Weighted pipeline projections | P2 |

---

### AI Capabilities

#### 1. Predictive Lead Scoring (Primary Differentiator)

**The "Daily Dozen" Feature:**
- AI selects top 12 leads to contact each day
- Explains WHY each is prioritized (distress signals, engagement patterns, timing)
- Updates dynamically based on new data and interactions

**Scoring Model Inputs:**
| Category | Signals | Weight |
|----------|---------|--------|
| **Distress Level** | Pre-foreclosure, tax delinquency, vacancy, probate | 35% |
| **Equity Position** | Estimated equity %, LTV ratio | 20% |
| **Motivation Signals** | Behavioral patterns, communication sentiment | 20% |
| **Property Condition** | Age, condition score, recent permits | 10% |
| **Market Factors** | Days on market (if listed), local foreclosure rates | 10% |
| **Engagement** | Response to outreach, website visits, email opens | 5% |

**Output:**
- **Deal Probability Score:** 0-100 likelihood of closing
- **Timeline Prediction:** Expected days to decision
- **Estimated Margin:** Projected profit based on ARV/repairs

#### 2. AI Property Condition Analysis

**Computer Vision Features:**
- Analyze property photos for condition scoring
- Detect visible damage/deferred maintenance
- Estimate repair categories (cosmetic, moderate, major)
- Compare to neighborhood averages

**Input:** Property photos (exterior, kitchen, bathrooms, roof)
**Output:** Condition score (1-10), repair category, confidence level

#### 3. Conversation Intelligence

**Call Analysis:**
- Real-time transcription
- Automatic extraction of motivation signals
- Sentiment scoring per interaction
- Objection detection and handling suggestions
- CRM auto-update from conversation content

**SMS/Email Analysis:**
- Intent classification (interested, not interested, need more info)
- Urgency detection
- Optimal response timing recommendation

#### 4. Intelligent Follow-Up Timing

**Adaptive Outreach:**
- Analyze engagement patterns to predict optimal contact windows
- Adjust cadence based on response likelihood
- Escalate or de-prioritize based on interaction signals
- Generate personalized messages using property and seller data

#### 5. Comp & ARV Intelligence

**AI-Assisted Valuations:**
- Automated comp selection with similarity scoring
- Adjustment recommendations based on property differences
- Confidence intervals on ARV estimates
- Flag outliers and explain reasoning

---

### Integration Requirements

#### Data Providers (Future Phases)

| Provider | Data Type | Priority |
|----------|-----------|----------|
| **ATTOM Data** | Property records, foreclosure, ownership | P1 |
| **PropertyRadar** | Foreclosure tracking, auction data | P2 |
| **TLO/BatchData** | Skip tracing (phone, email) | P1 |
| **Regrid** | USPS vacancy data, parcel data | P2 |

#### Communication Channels

| Channel | Integration | Priority |
|---------|-------------|----------|
| **Twilio SMS** | A2P 10DLC compliant messaging | P0 |
| **Twilio Voice** | Click-to-call, recording | P1 |
| **Slybroadcast** | Ringless voicemail | P2 |
| **Email (SMTP)** | Drip campaigns | P0 |
| **Direct Mail API** | Trigger postcard sends | P2 |

#### CRM Integration

Leverage existing CRM infrastructure:
- **Accounts** → Seller/Buyer entities
- **Opportunities** → Deals
- **Activities** → Communication log
- **Pipeline** → Deal stages

---

## Technical Architecture

### Module Structure

```
pmo/apps/api/src/modules/real-estate-wholesale/
├── real-estate-wholesale.router.ts     # Main API routes
├── real-estate-wholesale.service.ts    # Core business logic
├── services/
│   ├── property.service.ts             # Property CRUD and search
│   ├── seller.service.ts               # Seller management
│   ├── deal-analysis.service.ts        # ARV, comps, margin calculation
│   ├── buyer.service.ts                # Buyer list management
│   ├── outreach.service.ts             # Campaign management
│   └── analytics.service.ts            # Dashboard analytics
├── ai/
│   ├── lead-scoring.ai.ts              # ML lead scoring
│   ├── property-condition.ai.ts        # CV property analysis
│   ├── conversation-intelligence.ai.ts # NLP for calls/messages
│   ├── comp-analysis.ai.ts             # ARV intelligence
│   └── follow-up-timing.ai.ts          # Optimal outreach timing
├── integrations/
│   ├── skip-trace.integration.ts       # Skip tracing providers
│   └── data-providers.integration.ts   # Property data APIs
└── templates/
    └── drip-sequences.ts               # Built-in campaign templates
```

### Database Schema

```prisma
// ============================================================================
// WHOLESALE MODULE CONFIGURATION
// ============================================================================

model WholesaleConfig {
  id        Int      @id @default(autoincrement())
  tenantId  String
  accountId Int      @unique  // Links to CRM Account

  // Scoring thresholds
  hotLeadThreshold    Int @default(80)
  warmLeadThreshold   Int @default(50)
  coldLeadThreshold   Int @default(20)

  // Default deal parameters
  defaultWholesaleFeePercent Decimal @default(0.30) @db.Decimal(5, 4)
  defaultRepairPercent       Decimal @default(0.70) @db.Decimal(5, 4)  // 70% rule
  defaultHoldingCostMonths   Int     @default(3)

  // Skip trace settings
  skipTraceProvider     String?   // 'batch_data', 'tlo', etc.
  skipTraceCredentials  Json?

  // Outreach settings
  smsFromNumber         String?
  emailFromAddress      String?
  voicemailEnabled      Boolean @default(false)

  // AI settings
  enableAiScoring       Boolean @default(true)
  enableAiCondition     Boolean @default(true)
  enableAiConversation  Boolean @default(false)

  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  account   Account  @relation(fields: [accountId], references: [id], onDelete: Cascade)

  properties        WholesaleProperty[]
  sellers           WholesaleSeller[]
  buyers            WholesaleBuyer[]
  deals             WholesaleDeal[]
  campaigns         WholesaleCampaign[]
  dailyAnalytics    WholesaleAnalytics[]

  @@index([tenantId])
  @@index([accountId])
}

// ============================================================================
// PROPERTY MANAGEMENT
// ============================================================================

model WholesaleProperty {
  id        Int      @id @default(autoincrement())
  configId  Int

  // Address
  streetAddress   String
  city            String
  state           String    @db.VarChar(2)
  zipCode         String    @db.VarChar(10)
  county          String?
  parcelNumber    String?

  // Property details
  propertyType    PropertyType  @default(SINGLE_FAMILY)
  bedrooms        Int?
  bathrooms       Decimal?      @db.Decimal(3, 1)
  squareFeet      Int?
  lotSizeSqFt     Int?
  yearBuilt       Int?

  // Valuation
  estimatedValue      Decimal?  @db.Decimal(12, 2)
  assessedValue       Decimal?  @db.Decimal(12, 2)
  estimatedEquity     Decimal?  @db.Decimal(12, 2)
  estimatedEquityPct  Decimal?  @db.Decimal(5, 2)
  mortgageBalance     Decimal?  @db.Decimal(12, 2)

  // Distress indicators (list stacking)
  isPreForeclosure    Boolean @default(false)
  isTaxDelinquent     Boolean @default(false)
  isVacant            Boolean @default(false)
  isProbate           Boolean @default(false)
  isCodeViolation     Boolean @default(false)
  isHighEquity        Boolean @default(false)  // 40%+ equity
  isAbsenteeOwner     Boolean @default(false)
  isTiredLandlord     Boolean @default(false)
  isInherited         Boolean @default(false)
  distressScore       Int     @default(0)  // Aggregate 0-100

  // Dates
  lastSaleDate        DateTime?
  lastSalePrice       Decimal?  @db.Decimal(12, 2)
  foreclosureDate     DateTime?
  taxDelinquentSince  DateTime?

  // AI analysis
  conditionScore      Int?      // 1-10
  conditionNotes      String?
  repairEstimateLow   Decimal?  @db.Decimal(12, 2)
  repairEstimateHigh  Decimal?  @db.Decimal(12, 2)
  arvEstimate         Decimal?  @db.Decimal(12, 2)
  arvConfidence       Decimal?  @db.Decimal(5, 2)

  // Lead scoring
  dealProbabilityScore   Int?      // 0-100
  predictedDaysToClose   Int?
  predictedMargin        Decimal?  @db.Decimal(12, 2)
  lastScoredAt           DateTime?
  scoreExplanation       Json?     // { factors: [{ name, impact, value }] }

  // Source tracking
  source        String?   // 'driving', 'list', 'referral', 'manual'
  sourceDetails Json?
  addedBy       Int?      // User ID

  // Media
  photos        Json?     // Array of photo URLs with metadata

  // Status
  status        PropertyStatus @default(NEW)

  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  config        WholesaleConfig   @relation(fields: [configId], references: [id], onDelete: Cascade)
  seller        WholesaleSeller?  @relation(fields: [sellerId], references: [id])
  sellerId      Int?
  deals         WholesaleDeal[]
  activities    WholesaleActivity[]
  comps         PropertyComp[]

  @@unique([configId, streetAddress, city, state, zipCode])
  @@index([configId, status])
  @@index([configId, distressScore])
  @@index([configId, dealProbabilityScore])
  @@index([zipCode])
  @@index([county])
}

enum PropertyType {
  SINGLE_FAMILY
  MULTI_FAMILY
  CONDO
  TOWNHOUSE
  MOBILE_HOME
  LAND
  COMMERCIAL
  OTHER
}

enum PropertyStatus {
  NEW
  RESEARCHING
  SKIP_TRACED
  CONTACTED
  FOLLOW_UP
  QUALIFIED
  OFFER_SENT
  UNDER_CONTRACT
  CLOSED
  DEAD
  DO_NOT_CONTACT
}

// ============================================================================
// SELLER MANAGEMENT
// ============================================================================

model WholesaleSeller {
  id        Int      @id @default(autoincrement())
  configId  Int

  // Contact info
  firstName       String?
  lastName        String?
  companyName     String?   // For LLCs, trusts
  email           String?
  phone           String?
  phoneAlt        String?
  mailingAddress  String?
  mailingCity     String?
  mailingState    String?   @db.VarChar(2)
  mailingZip      String?   @db.VarChar(10)

  // Skip trace data
  skipTraceStatus    String?    // 'pending', 'complete', 'failed'
  skipTracedAt       DateTime?
  skipTraceData      Json?      // Raw skip trace response

  // Motivation signals
  motivationLevel    MotivationLevel @default(UNKNOWN)
  motivationReasons  String[]        @default([])  // divorce, inheritance, job_loss, etc.
  motivationNotes    String?

  // Communication preferences
  preferredContact   String?   // phone, text, email
  bestTimeToCall     String?   // morning, afternoon, evening
  doNotCall          Boolean   @default(false)
  doNotText          Boolean   @default(false)
  doNotMail          Boolean   @default(false)

  // Lead scoring
  sellerScore        Int?      // 0-100 motivation score
  lastContactAt      DateTime?
  lastResponseAt     DateTime?
  responseRate       Decimal?  @db.Decimal(5, 2)

  // Sentiment (from AI conversation analysis)
  overallSentiment   Decimal?  @db.Decimal(5, 2)  // -1 to 1

  isActive           Boolean   @default(true)
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  config             WholesaleConfig       @relation(fields: [configId], references: [id], onDelete: Cascade)
  properties         WholesaleProperty[]
  activities         WholesaleActivity[]
  campaigns          CampaignEnrollment[]

  @@index([configId, motivationLevel])
  @@index([configId, sellerScore])
  @@index([email])
  @@index([phone])
}

enum MotivationLevel {
  UNKNOWN
  LOW
  MEDIUM
  HIGH
  VERY_HIGH
}

// ============================================================================
// BUYER MANAGEMENT
// ============================================================================

model WholesaleBuyer {
  id        Int      @id @default(autoincrement())
  configId  Int

  // Contact
  firstName       String
  lastName        String?
  companyName     String?
  email           String
  phone           String?

  // Buying criteria
  buyerType       BuyerType     @default(FIX_AND_FLIP)
  preferredAreas  String[]      @default([])  // ZIP codes or cities
  propertyTypes   PropertyType[] @default([])
  minBedrooms     Int?
  maxPrice        Decimal?      @db.Decimal(12, 2)
  minEquity       Decimal?      @db.Decimal(5, 2)  // Minimum equity %

  // Proof of funds
  proofOfFundsVerified  Boolean   @default(false)
  proofOfFundsDate      DateTime?
  estimatedBudget       Decimal?  @db.Decimal(12, 2)

  // Activity
  totalPurchases    Int       @default(0)
  lastPurchaseDate  DateTime?
  avgResponseTime   Int?      // Hours
  buyerScore        Int?      // 0-100 reliability score

  // Preferences
  wantsDealAlerts     Boolean @default(true)
  dealAlertFrequency  String? // 'instant', 'daily', 'weekly'

  notes             String?
  tags              String[]  @default([])

  isActive          Boolean   @default(true)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  config            WholesaleConfig   @relation(fields: [configId], references: [id], onDelete: Cascade)
  assignments       WholesaleDeal[]   @relation("BuyerDeals")
  dealAlerts        BuyerDealAlert[]

  @@unique([configId, email])
  @@index([configId, buyerType])
  @@index([configId, isActive])
}

enum BuyerType {
  FIX_AND_FLIP
  BUY_AND_HOLD
  LANDLORD
  DEVELOPER
  WHOLESALER
  OTHER
}

// ============================================================================
// DEAL MANAGEMENT
// ============================================================================

model WholesaleDeal {
  id        Int      @id @default(autoincrement())
  configId  Int

  propertyId    Int
  opportunityId Int?     // Link to CRM Opportunity

  // Deal details
  dealName          String
  dealType          DealType    @default(ASSIGNMENT)
  status            DealStatus  @default(LEAD)

  // Financials
  askingPrice       Decimal?    @db.Decimal(12, 2)
  offerPrice        Decimal?    @db.Decimal(12, 2)
  contractPrice     Decimal?    @db.Decimal(12, 2)
  arvEstimate       Decimal     @db.Decimal(12, 2)
  repairEstimate    Decimal     @db.Decimal(12, 2)
  wholesaleFee      Decimal?    @db.Decimal(12, 2)
  projectedProfit   Decimal?    @db.Decimal(12, 2)
  actualProfit      Decimal?    @db.Decimal(12, 2)

  // Dates
  offerDate         DateTime?
  contractDate      DateTime?
  inspectionDeadline DateTime?
  closingDate       DateTime?
  actualCloseDate   DateTime?

  // Assignment
  buyerId           Int?
  assignmentFee     Decimal?    @db.Decimal(12, 2)

  // Documents
  contractUrl       String?
  assignmentUrl     String?
  documents         Json?       // Array of document metadata

  // Notes
  notes             String?
  lostReason        String?

  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
  createdBy         Int?

  config            WholesaleConfig   @relation(fields: [configId], references: [id], onDelete: Cascade)
  property          WholesaleProperty @relation(fields: [propertyId], references: [id])
  buyer             WholesaleBuyer?   @relation("BuyerDeals", fields: [buyerId], references: [id])
  opportunity       Opportunity?      @relation(fields: [opportunityId], references: [id])
  stageHistory      DealStageHistory[]
  activities        WholesaleActivity[]

  @@index([configId, status])
  @@index([configId, closingDate])
}

enum DealType {
  ASSIGNMENT
  DOUBLE_CLOSE
  NOVATION
  SUBJECT_TO
  LEASE_OPTION
}

enum DealStatus {
  LEAD
  CONTACTED
  QUALIFIED
  ANALYZING
  OFFER_PENDING
  OFFER_SENT
  NEGOTIATING
  UNDER_CONTRACT
  DUE_DILIGENCE
  MARKETING_TO_BUYERS
  BUYER_FOUND
  CLOSING
  CLOSED
  DEAD
  CANCELLED
}

model DealStageHistory {
  id        Int      @id @default(autoincrement())
  dealId    Int

  fromStatus  DealStatus?
  toStatus    DealStatus
  changedAt   DateTime    @default(now())
  changedBy   Int?
  notes       String?
  daysInStage Int?

  deal        WholesaleDeal @relation(fields: [dealId], references: [id], onDelete: Cascade)

  @@index([dealId, changedAt])
}

// ============================================================================
// COMPS & ANALYSIS
// ============================================================================

model PropertyComp {
  id          Int      @id @default(autoincrement())
  propertyId  Int

  // Comp address
  streetAddress   String
  city            String
  state           String    @db.VarChar(2)
  zipCode         String    @db.VarChar(10)

  // Comp details
  salePrice       Decimal   @db.Decimal(12, 2)
  saleDate        DateTime
  daysOnMarket    Int?
  squareFeet      Int?
  pricePerSqFt    Decimal?  @db.Decimal(10, 2)
  bedrooms        Int?
  bathrooms       Decimal?  @db.Decimal(3, 1)
  yearBuilt       Int?
  condition       String?
  distanceInMiles Decimal?  @db.Decimal(5, 2)

  // Adjustments
  adjustments     Json?     // { sqft: -5000, condition: +10000, ... }
  adjustedValue   Decimal?  @db.Decimal(12, 2)

  // AI scoring
  similarityScore Decimal?  @db.Decimal(5, 2)  // 0-100
  isAiSelected    Boolean   @default(false)

  createdAt       DateTime  @default(now())

  property        WholesaleProperty @relation(fields: [propertyId], references: [id], onDelete: Cascade)

  @@index([propertyId])
}

// ============================================================================
// ACTIVITY TRACKING
// ============================================================================

model WholesaleActivity {
  id        Int      @id @default(autoincrement())
  configId  Int

  // Links (at least one required)
  propertyId    Int?
  sellerId      Int?
  dealId        Int?
  crmActivityId Int?    // Link to CRM Activity if created there

  // Activity details
  activityType    WholesaleActivityType
  channel         String?   // phone, sms, email, mail, in_person
  direction       String?   // inbound, outbound

  subject         String?
  content         String?
  contentHtml     String?

  // Call details
  callDuration    Int?      // Seconds
  callRecordingUrl String?
  callTranscript  String?

  // AI analysis
  sentiment       Decimal?  @db.Decimal(5, 2)  // -1 to 1
  motivationSignals String[] @default([])
  keyInsights     Json?

  // Status
  status          String?   // scheduled, completed, failed
  scheduledFor    DateTime?
  completedAt     DateTime?

  // Campaign tracking
  campaignId      Int?
  sequenceStepId  String?

  createdBy       Int?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  config          WholesaleConfig     @relation(fields: [configId], references: [id], onDelete: Cascade)
  property        WholesaleProperty?  @relation(fields: [propertyId], references: [id])
  seller          WholesaleSeller?    @relation(fields: [sellerId], references: [id])
  deal            WholesaleDeal?      @relation(fields: [dealId], references: [id])
  campaign        WholesaleCampaign?  @relation(fields: [campaignId], references: [id])

  @@index([configId, activityType])
  @@index([configId, createdAt])
  @@index([sellerId, createdAt])
  @@index([propertyId])
}

enum WholesaleActivityType {
  CALL
  SMS
  EMAIL
  VOICEMAIL
  DIRECT_MAIL
  MEETING
  SITE_VISIT
  NOTE
  OFFER
  CONTRACT
  SYSTEM
}

// ============================================================================
// CAMPAIGNS & AUTOMATION
// ============================================================================

model WholesaleCampaign {
  id        Int      @id @default(autoincrement())
  configId  Int

  name          String
  description   String?
  campaignType  CampaignType    @default(DRIP)
  status        CampaignStatus  @default(DRAFT)

  // Targeting
  targetCriteria  Json?   // { distressScore: { min: 50 }, motivationLevel: ['HIGH'] }

  // Sequence
  steps           Json    // Array of sequence steps
  /*
    [
      { stepId: 'step1', type: 'SMS', delayDays: 0, template: '...' },
      { stepId: 'step2', type: 'CALL_TASK', delayDays: 1 },
      { stepId: 'step3', type: 'SMS', delayDays: 3, template: '...' },
      { stepId: 'step4', type: 'RINGLESS_VOICEMAIL', delayDays: 5, template: '...' },
      { stepId: 'step5', type: 'EMAIL', delayDays: 7, template: '...' },
      { stepId: 'step6', type: 'DIRECT_MAIL', delayDays: 14, template: 'postcard' }
    ]
  */

  // Settings
  exitOnResponse      Boolean @default(true)
  exitOnDeal          Boolean @default(true)
  allowReEnrollment   Boolean @default(false)
  reEnrollmentDays    Int?

  // Stats
  totalEnrolled       Int @default(0)
  totalResponses      Int @default(0)
  totalDeals          Int @default(0)

  startDate           DateTime?
  endDate             DateTime?

  createdBy           Int?
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  config              WholesaleConfig       @relation(fields: [configId], references: [id], onDelete: Cascade)
  enrollments         CampaignEnrollment[]
  activities          WholesaleActivity[]

  @@index([configId, status])
}

enum CampaignType {
  DRIP
  BLAST
  TRIGGERED
}

model CampaignEnrollment {
  id          Int      @id @default(autoincrement())
  campaignId  Int
  sellerId    Int

  status              EnrollmentStatus @default(ACTIVE)
  currentStepIndex    Int              @default(0)
  nextStepScheduledAt DateTime?

  enrolledAt          DateTime         @default(now())
  completedAt         DateTime?
  exitedAt            DateTime?
  exitReason          String?

  // Stats
  messagesSent        Int @default(0)
  messagesOpened      Int @default(0)
  messagesClicked     Int @default(0)
  responses           Int @default(0)

  campaign            WholesaleCampaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  seller              WholesaleSeller   @relation(fields: [sellerId], references: [id], onDelete: Cascade)

  @@unique([campaignId, sellerId])
  @@index([status, nextStepScheduledAt])
}

enum EnrollmentStatus {
  ACTIVE
  PAUSED
  COMPLETED
  EXITED
  RESPONDED
}

// ============================================================================
// BUYER ALERTS
// ============================================================================

model BuyerDealAlert {
  id        Int      @id @default(autoincrement())
  buyerId   Int
  dealId    Int?

  alertType     String    // 'new_deal', 'price_drop', 'closing_soon'
  subject       String
  content       String
  sentVia       String    // 'email', 'sms'
  sentAt        DateTime  @default(now())
  openedAt      DateTime?
  clickedAt     DateTime?
  respondedAt   DateTime?

  buyer         WholesaleBuyer @relation(fields: [buyerId], references: [id], onDelete: Cascade)

  @@index([buyerId, sentAt])
}

// ============================================================================
// ANALYTICS
// ============================================================================

model WholesaleAnalytics {
  id        Int      @id @default(autoincrement())
  configId  Int
  date      DateTime @db.Date

  // Lead metrics
  newProperties       Int @default(0)
  propertiesContacted Int @default(0)
  propertiesQualified Int @default(0)

  // Activity metrics
  callsMade           Int @default(0)
  callsConnected      Int @default(0)
  smsSent             Int @default(0)
  smsResponses        Int @default(0)
  emailsSent          Int @default(0)
  emailsOpened        Int @default(0)

  // Deal metrics
  offersSubmitted     Int @default(0)
  contractsSigned     Int @default(0)
  dealsClosed         Int @default(0)

  // Financial metrics
  totalOfferValue     Decimal @default(0) @db.Decimal(14, 2)
  totalContractValue  Decimal @default(0) @db.Decimal(14, 2)
  totalProfit         Decimal @default(0) @db.Decimal(14, 2)

  // Conversion rates (calculated)
  contactToQualifiedRate  Decimal? @db.Decimal(5, 2)
  qualifiedToOfferRate    Decimal? @db.Decimal(5, 2)
  offerToContractRate     Decimal? @db.Decimal(5, 2)

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  config              WholesaleConfig @relation(fields: [configId], references: [id], onDelete: Cascade)

  @@unique([configId, date])
  @@index([configId, date])
}
```

### API Endpoints

#### Configuration
```
GET    /api/wholesale/configs                    # List user's configs
POST   /api/accounts/:accountId/wholesale        # Create config for account
GET    /api/accounts/:accountId/wholesale        # Get account config
PATCH  /api/accounts/:accountId/wholesale        # Update config
```

#### Properties
```
GET    /api/wholesale/:configId/properties       # List properties (with filters)
POST   /api/wholesale/:configId/properties       # Create property
POST   /api/wholesale/:configId/properties/bulk  # Bulk import
GET    /api/wholesale/properties/:id             # Get property details
PATCH  /api/wholesale/properties/:id             # Update property
DELETE /api/wholesale/properties/:id             # Delete property

# AI Features
POST   /api/wholesale/properties/:id/analyze     # AI condition analysis
POST   /api/wholesale/properties/:id/score       # Calculate lead score
GET    /api/wholesale/:configId/daily-dozen      # Get AI-prioritized leads

# Comps
GET    /api/wholesale/properties/:id/comps       # List comps
POST   /api/wholesale/properties/:id/comps       # Add comp
POST   /api/wholesale/properties/:id/comps/auto  # AI comp selection
```

#### Sellers
```
GET    /api/wholesale/:configId/sellers          # List sellers
POST   /api/wholesale/:configId/sellers          # Create seller
GET    /api/wholesale/sellers/:id                # Get seller
PATCH  /api/wholesale/sellers/:id                # Update seller
DELETE /api/wholesale/sellers/:id                # Delete seller

POST   /api/wholesale/sellers/:id/skip-trace     # Trigger skip trace
```

#### Buyers
```
GET    /api/wholesale/:configId/buyers           # List buyers
POST   /api/wholesale/:configId/buyers           # Create buyer
GET    /api/wholesale/buyers/:id                 # Get buyer
PATCH  /api/wholesale/buyers/:id                 # Update buyer
DELETE /api/wholesale/buyers/:id                 # Delete buyer

POST   /api/wholesale/buyers/match/:propertyId   # Match property to buyers
POST   /api/wholesale/buyers/blast/:dealId       # Send deal alert
```

#### Deals
```
GET    /api/wholesale/:configId/deals            # List deals
POST   /api/wholesale/:configId/deals            # Create deal
GET    /api/wholesale/deals/:id                  # Get deal
PATCH  /api/wholesale/deals/:id                  # Update deal
DELETE /api/wholesale/deals/:id                  # Delete deal

# Deal workflow
POST   /api/wholesale/deals/:id/stage            # Update stage
POST   /api/wholesale/deals/:id/analyze          # AI deal analysis
GET    /api/wholesale/deals/:id/history          # Stage history

# Pipeline
GET    /api/wholesale/:configId/pipeline         # Pipeline view
GET    /api/wholesale/:configId/pipeline/stats   # Pipeline statistics
```

#### Activities
```
GET    /api/wholesale/:configId/activities       # List activities
POST   /api/wholesale/:configId/activities       # Create activity
GET    /api/wholesale/activities/:id             # Get activity

# Quick actions
POST   /api/wholesale/activities/log/call        # Log call
POST   /api/wholesale/activities/log/sms         # Log SMS
POST   /api/wholesale/activities/log/note        # Log note
```

#### Campaigns
```
GET    /api/wholesale/:configId/campaigns        # List campaigns
POST   /api/wholesale/:configId/campaigns        # Create campaign
GET    /api/wholesale/campaigns/:id              # Get campaign
PATCH  /api/wholesale/campaigns/:id              # Update campaign
DELETE /api/wholesale/campaigns/:id              # Delete campaign

POST   /api/wholesale/campaigns/:id/start        # Start campaign
POST   /api/wholesale/campaigns/:id/pause        # Pause campaign
POST   /api/wholesale/campaigns/:id/enroll       # Enroll sellers
GET    /api/wholesale/campaigns/:id/enrollments  # List enrollments
```

#### Analytics
```
GET    /api/wholesale/:configId/analytics        # Dashboard analytics
GET    /api/wholesale/:configId/analytics/trends # Trends over time
GET    /api/wholesale/:configId/analytics/funnel # Conversion funnel
GET    /api/wholesale/:configId/analytics/roi    # Marketing ROI
```

---

## Implementation Plan

### Phase 1: Foundation (Weeks 1-2)

**Goal:** Core data models and basic CRUD operations

#### Backend Tasks
1. Add module to module registry (`realEstateWholesale`)
2. Create Prisma schema for all models
3. Run database migration
4. Implement `WholesaleConfig` service and routes
5. Implement `WholesaleProperty` service and routes
   - CRUD operations
   - Bulk import from CSV
   - List stacking (distress score calculation)
6. Implement `WholesaleSeller` service and routes
7. Implement basic `WholesaleDeal` service and routes
8. Create validation schemas (Zod)

#### Frontend Tasks
1. Add module to navigation (Sidebar)
2. Create `WholesaleDashboardPage` placeholder
3. Create `PropertiesListPage` with filters
4. Create `PropertyDetailPage`
5. Create `SellersListPage`
6. Create `DealsListPage` with Kanban view
7. Create React Query hooks for all endpoints

#### Deliverables
- Working property database with distress indicators
- Seller management
- Basic deal pipeline
- CSV bulk import

### Phase 2: AI Intelligence (Weeks 3-4)

**Goal:** Implement AI-powered lead scoring and analysis

#### Backend Tasks
1. Implement AI lead scoring service
   - Integrate with OpenAI
   - Define scoring model with weighted factors
   - Create rule-based fallback
2. Implement "Daily Dozen" algorithm
   - Score all properties
   - Select top 12 with explanation
   - Cache daily results
3. Implement AI property condition analysis
   - Photo analysis via GPT-4 Vision
   - Condition scoring
   - Repair estimation
4. Implement AI comp analysis
   - Similarity scoring
   - Adjustment recommendations
5. Implement ARV calculator service
6. Implement deal analysis service (MAO, margins)

#### Frontend Tasks
1. Create `DailyDozenPage` (AI recommendations)
2. Add AI scoring display to PropertyDetail
3. Create `DealAnalyzerPage`
4. Add condition analysis UI
5. Create `CompsPage` with AI selection

#### Deliverables
- AI-powered lead prioritization
- Property condition analysis from photos
- Automated ARV estimation
- Deal profit projections

### Phase 3: Outreach & Automation (Weeks 5-6)

**Goal:** Multi-channel outreach and drip campaigns

#### Backend Tasks
1. Implement Twilio SMS integration
   - A2P 10DLC compliance helpers
   - Send/receive SMS
   - Track responses
2. Implement email outreach
   - Template rendering
   - Send via SMTP
   - Track opens/clicks
3. Implement campaign service
   - Create/manage drip sequences
   - Enrollment logic
   - Step execution scheduler
   - Exit conditions
4. Implement activity tracking service
   - Log all communications
   - Link to CRM Activities
5. Implement call logging
   - Transcription via Whisper
   - Sentiment analysis

#### Frontend Tasks
1. Create `CampaignsListPage`
2. Create `CampaignBuilderPage` (sequence editor)
3. Create `OutreachComposePage` (SMS/email templates)
4. Add activity timeline to PropertyDetail
5. Create `CallLogPage`

#### Deliverables
- Multi-channel drip campaigns
- SMS and email outreach
- Call transcription
- Unified activity timeline

### Phase 4: Analytics & Optimization (Weeks 7-8)

**Goal:** Analytics dashboard and buyer management

#### Backend Tasks
1. Implement analytics aggregation
   - Daily rollup job
   - Conversion funnel metrics
   - Marketing attribution
2. Implement buyer management service
3. Implement buyer matching algorithm
4. Implement deal alert system
5. Implement conversation intelligence
   - Motivation signal extraction
   - Optimal timing prediction

#### Frontend Tasks
1. Create `WholesaleDashboardPage` with charts
2. Create `BuyersListPage`
3. Create `BuyerDetailPage`
4. Create `DealDispositionPage`
5. Add ROI tracking to campaigns

#### Deliverables
- Full analytics dashboard
- Buyer list management
- Buyer matching
- Deal disposition workflow
- Marketing ROI tracking

---

## UI/UX Specifications

### Navigation Structure

```
AI Tools
├── Real Estate Wholesale
│   ├── Dashboard           /ai-tools/wholesale
│   ├── Daily Dozen         /ai-tools/wholesale/daily-dozen
│   ├── Properties          /ai-tools/wholesale/properties
│   │   └── [id]            /ai-tools/wholesale/properties/:id
│   ├── Sellers             /ai-tools/wholesale/sellers
│   │   └── [id]            /ai-tools/wholesale/sellers/:id
│   ├── Deals               /ai-tools/wholesale/deals
│   │   └── [id]            /ai-tools/wholesale/deals/:id
│   ├── Buyers              /ai-tools/wholesale/buyers
│   │   └── [id]            /ai-tools/wholesale/buyers/:id
│   ├── Campaigns           /ai-tools/wholesale/campaigns
│   │   └── [id]            /ai-tools/wholesale/campaigns/:id
│   ├── Deal Analyzer       /ai-tools/wholesale/analyzer
│   └── Settings            /ai-tools/wholesale/settings
```

### Key Pages

#### Daily Dozen Dashboard
- Hero card showing today's top 12 leads
- Each lead shows: address, distress indicators, deal probability, explanation
- Quick actions: call, text, view details
- Refresh button to regenerate

#### Properties List
- Table with filters for distress indicators, status, location
- Bulk actions: skip trace, add to campaign, update status
- Map view toggle
- Export functionality

#### Deal Pipeline (Kanban)
- Drag-and-drop stages
- Cards show: address, offer amount, projected profit, days in stage
- Filter by date range, user
- Quick stage transitions

#### Deal Analyzer
- Property input (address or select from database)
- ARV section with comp selection
- Repair estimate (AI-assisted)
- Financial breakdown (MAO, wholesale fee, projected profit)
- Generate offer letter

---

## Success Metrics

### Key Performance Indicators

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Time to First Deal** | 50% reduction | Days from signup to first closed deal |
| **Contact-to-Close Rate** | 3% → 5% | Deals closed / leads contacted |
| **Daily Active Time** | 4 hrs → 2 hrs | Time spent in platform per day |
| **Leads Processed/Day** | 10 → 50 | Properties reviewed with AI assistance |
| **Cost per Deal** | 30% reduction | Marketing spend / deals closed |

### AI Model Accuracy

| Model | Target Accuracy | Validation Method |
|-------|-----------------|-------------------|
| Lead Scoring | 80% AUC | Backtesting on closed deals |
| Condition Analysis | 85% agreement | Human review sampling |
| ARV Estimation | ±5% of actual | Compare to sale prices |
| Sentiment Analysis | 80% accuracy | Manual label validation |

---

## Appendix: Module ID & Registration

### Module Configuration

Add to `packages/modules/index.ts`:
```typescript
export const MODULES = {
  // ... existing modules
  realEstateWholesale: {
    id: 'realEstateWholesale',
    label: 'Real Estate Wholesale',
    description: 'AI-powered distressed property finder and deal analyzer for wholesalers',
    dependencies: ['accounts'],
    routes: ['/ai-tools/wholesale', '/ai-tools/wholesale/*'],
    isCore: false,
  },
};
```

### Environment Variables

```bash
# Required for AI features
OPENAI_API_KEY=sk-xxx

# Optional: Twilio for SMS
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_SMS_FROM=+1xxxxxxxxxx

# Optional: Skip trace provider
SKIP_TRACE_API_KEY=xxx
SKIP_TRACE_PROVIDER=batch_data  # or 'tlo'

# Optional: Data provider
ATTOM_API_KEY=xxx
```

---

## Questions for Stakeholder Review

1. **Data Provider Strategy:** Should we build native integrations with ATTOM/PropertyRadar, or start with CSV import only?

2. **Skip Tracing:** Build integration with a specific provider (BatchData, TLO), or abstract for multiple providers?

3. **Direct Mail:** Include native integration (e.g., Lob API), or just trigger webhooks for third-party services?

4. **Pricing Tier:** Should this be a standalone module or bundled with other AI tools?

5. **Mobile App:** Is a dedicated mobile app for driving-for-dollars a priority, or is mobile-responsive web sufficient?

6. **Multi-Tenant:** Should each Account have separate wholesale configs, or is this an organization-level feature?
