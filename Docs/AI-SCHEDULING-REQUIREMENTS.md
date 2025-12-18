# AI Scheduling Module - Requirements & Implementation Plan

**Document Version:** 1.0
**Date:** December 2025
**Status:** Pending Review
**Based On:** SMB Market Research Report, December 2025

---

## Executive Summary

This document outlines the requirements and implementation plan to evolve our AI Scheduling module from a healthcare-focused internal tool into a comprehensive, market-competitive scheduling solution for small to medium businesses.

### Current State Assessment

Our existing scheduling module has solid foundations:
- **Implemented:** Appointment CRUD, provider management, appointment types, availability slots, no-show prediction (rule-based), reminder scheduling (simulated), waitlist management, analytics dashboard, HIPAA compliance framework
- **Database Ready:** 7 comprehensive Prisma models with full lifecycle tracking
- **Frontend:** Tab-based dashboard with calendar view, appointment lists, provider management, and analytics

### Critical Gaps (Based on Market Research)

| Gap | Market Priority | Business Impact |
|-----|-----------------|-----------------|
| No customer-facing booking page/widget | Critical | Blocks self-service booking (70% customer preference) |
| Calendar integrations not active | Critical | 82% cite Google Calendar as top requirement |
| Reminders are simulated only | Critical | 23-40% no-show reduction depends on this |
| No video conferencing integration | High | Required for virtual appointments |
| No payment/deposit collection | High | Revenue protection and commitment |
| Generic, not industry-specific | Medium | Competitors offer templates |

---

## Part 1: Requirements Specification

### 1.1 User Personas

**Persona A: Business Owner/Admin**
- Configures scheduling settings
- Manages providers and appointment types
- Views analytics and reports
- Needs: Simple setup (<30 min), mobile access, bulk actions

**Persona B: Service Provider (Staff)**
- Views their schedule
- Confirms/reschedules appointments
- Adds notes to appointments
- Needs: Clear calendar view, quick status updates

**Persona C: Customer/Client (End User)**
- Books appointments online
- Receives and responds to reminders
- Reschedules or cancels
- Needs: <60 second booking, no login required, mobile-friendly

---

### 1.2 Functional Requirements

#### Tier 1: MVP Critical (Phase 1)

| ID | Requirement | Description | Acceptance Criteria |
|----|-------------|-------------|---------------------|
| F1.1 | **Embeddable Booking Widget** | Customer-facing booking interface that can be embedded on any website | Widget loads in <2s, works on mobile, completes booking in <60s, no login required |
| F1.2 | **Public Booking Page** | Standalone booking URL for sharing | Shareable link format: `/book/{account-slug}`, shows available slots, mobile-responsive |
| F1.3 | **Google Calendar Sync** | Two-way sync with Google Calendar | Read busy times, create events on booking, update on reschedule, delete on cancel |
| F1.4 | **Microsoft Outlook Sync** | Two-way sync with Outlook/365 | Same as Google Calendar sync |
| F1.5 | **SMS Reminders** | Real SMS delivery via Twilio | Configurable timing, delivery confirmation, response handling (confirm/cancel) |
| F1.6 | **Email Reminders** | Real email delivery via SendGrid | HTML templates, configurable timing, tracking opens/clicks |
| F1.7 | **Automatic Time Zone Handling** | Detect and convert customer time zones | Auto-detect from browser, display in customer's local time, store in UTC |
| F1.8 | **Booking Confirmation Page** | Post-booking confirmation with details | Shows appointment details, calendar add buttons (Google/Outlook/iCal), modify/cancel links |

#### Tier 2: Competitive Features (Phase 2)

| ID | Requirement | Description | Acceptance Criteria |
|----|-------------|-------------|---------------------|
| F2.1 | **Video Conferencing Integration** | Auto-generate Zoom/Meet/Teams links | Create meeting on booking, include link in confirmations and reminders |
| F2.2 | **Custom Intake Forms** | Collect customer information at booking | Form builder UI, required/optional fields, conditional logic, data storage |
| F2.3 | **Payment/Deposit Collection** | Stripe integration for payments | Collect deposit at booking, full payment option, refund on cancellation |
| F2.4 | **Rescheduling Self-Service** | Customer can reschedule without calling | Link in confirmation email, shows available alternatives, sends update notifications |
| F2.5 | **Cancellation Self-Service** | Customer can cancel without calling | Link in confirmation, captures reason, triggers waitlist notification |
| F2.6 | **Buffer Time Configuration** | Time between appointments | Per-provider and per-appointment-type buffers, travel time support |
| F2.7 | **Booking Rules Engine** | Advanced booking constraints | Min/max notice, daily/weekly limits, blackout dates, recurring availability |

#### Tier 3: AI-Powered Features (Phase 3)

| ID | Requirement | Description | Acceptance Criteria |
|----|-------------|-------------|---------------------|
| F3.1 | **Smart Scheduling Suggestions** | AI recommends optimal times | Analyzes historical patterns, suggests times with lowest no-show risk |
| F3.2 | **Natural Language Booking** | Handle requests like "move to next Wednesday after 3pm" | Chat interface, voice support, context understanding |
| F3.3 | **Predictive No-Show Model** | ML-based no-show prediction | Improve accuracy from rule-based 60% to ML-based 80%+, continuous learning |
| F3.4 | **Intelligent Overbooking** | Smart overbooking based on predictions | Calculate optimal overbooking rate, minimize customer impact |
| F3.5 | **Automated Waitlist Matching** | Auto-offer cancelled slots to waitlist | Match preferences, priority-based notification, first-come booking |

#### Tier 4: Industry Templates (Phase 4)

| ID | Requirement | Description |
|----|-------------|-------------|
| F4.1 | **Healthcare Template** | HIPAA-compliant, patient intake, insurance info |
| F4.2 | **Professional Services Template** | Consultation types, intake questionnaire, document upload |
| F4.3 | **Home Services Template** | Service areas, travel time, job categorization |
| F4.4 | **Beauty/Wellness Template** | Service menu, multiple providers, package booking |
| F4.5 | **Restaurant Template** | Party size, table assignment, special occasions |

---

### 1.3 Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NF1 | **Page Load Time** | Booking widget <2s, dashboard <3s |
| NF2 | **Booking Completion Time** | <60 seconds from page load to confirmation |
| NF3 | **Mobile Responsiveness** | Full functionality on mobile devices |
| NF4 | **Calendar Sync Reliability** | 99.9% sync success rate |
| NF5 | **Reminder Delivery Rate** | 98%+ successful delivery |
| NF6 | **System Uptime** | 99.5% availability |
| NF7 | **Data Security** | SSL/TLS, encryption at rest, GDPR compliance |
| NF8 | **HIPAA Compliance** | Optional per-config, encrypted PHI storage |

---

### 1.4 Integration Requirements

#### Phase 1 Integrations (MVP)

| Integration | Type | Purpose | API/SDK |
|-------------|------|---------|---------|
| Google Calendar | Calendar | Two-way sync | Google Calendar API v3 |
| Microsoft Outlook | Calendar | Two-way sync | Microsoft Graph API |
| Twilio | SMS | Reminder delivery | Twilio SMS API |
| SendGrid | Email | Reminder/confirmation delivery | SendGrid Web API v3 |

#### Phase 2 Integrations

| Integration | Type | Purpose |
|-------------|------|---------|
| Zoom | Video | Meeting link generation |
| Google Meet | Video | Meeting link generation |
| Microsoft Teams | Video | Meeting link generation |
| Stripe | Payment | Deposit/payment collection |

#### Phase 3 Integrations

| Integration | Type | Purpose |
|-------------|------|---------|
| Zapier | Automation | Connect to 5,000+ apps |
| HubSpot | CRM | Contact sync |
| Salesforce | CRM | Contact sync |
| Slack | Notifications | Team alerts |

---

## Part 2: Technical Design

### 2.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend Layer                            │
├─────────────────┬─────────────────┬────────────────────────────┤
│  Admin Dashboard │  Booking Widget  │  Public Booking Page       │
│  (React/Vite)    │  (Embed Script)  │  (React/Vite)              │
└─────────────────┴─────────────────┴────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API Layer                                │
├─────────────────────────────────────────────────────────────────┤
│  /api/scheduling/*          - Admin/provider endpoints           │
│  /api/booking/*             - Public booking endpoints (NEW)     │
│  /api/scheduling/webhooks/* - Integration webhooks              │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Service Layer                              │
├────────────┬────────────┬──────────────┬───────────────────────┤
│ Scheduling │ Calendar   │ Notification │ Payment               │
│ Service    │ Sync       │ Service      │ Service               │
│            │ Service    │              │                       │
└────────────┴────────────┴──────────────┴───────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    External Services                             │
├──────────┬──────────┬─────────┬─────────┬──────────┬──────────┤
│  Google  │ Microsoft │ Twilio  │ SendGrid │ Stripe   │ Zoom     │
│ Calendar │  Graph    │   SMS   │  Email   │ Payments │ Meetings │
└──────────┴──────────┴─────────┴─────────┴──────────┴──────────┘
```

### 2.2 New Database Models Required

```prisma
// Add to schema.prisma

// Public booking configuration
model BookingPage {
  id              String   @id @default(cuid())
  configId        String
  config          SchedulingConfig @relation(fields: [configId], references: [id])

  // URL and branding
  slug            String   @unique  // e.g., "acme-consulting" -> /book/acme-consulting
  title           String
  description     String?
  logoUrl         String?
  primaryColor    String   @default("#3B82F6")

  // Booking settings
  showProviderSelection   Boolean @default(true)
  showAppointmentTypes    Boolean @default(true)
  requirePhone            Boolean @default(true)
  requireIntakeForm       Boolean @default(false)

  // SEO
  metaTitle       String?
  metaDescription String?

  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  intakeForms     IntakeForm[]

  @@index([slug])
  @@index([configId])
}

// Custom intake forms
model IntakeForm {
  id              String   @id @default(cuid())
  bookingPageId   String
  bookingPage     BookingPage @relation(fields: [bookingPageId], references: [id])

  name            String
  description     String?
  fields          Json     // Array of field definitions
  isRequired      Boolean  @default(false)
  displayOrder    Int      @default(0)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  responses       IntakeFormResponse[]

  @@index([bookingPageId])
}

// Intake form responses
model IntakeFormResponse {
  id              String   @id @default(cuid())
  formId          String
  form            IntakeForm @relation(fields: [formId], references: [id])
  appointmentId   String
  appointment     Appointment @relation(fields: [appointmentId], references: [id])

  responses       Json     // Field ID -> value mapping
  submittedAt     DateTime @default(now())

  @@index([formId])
  @@index([appointmentId])
}

// Calendar integration tokens
model CalendarIntegration {
  id              String   @id @default(cuid())
  configId        String
  config          SchedulingConfig @relation(fields: [configId], references: [id])
  providerId      String?  // If null, applies to all providers
  provider        Provider? @relation(fields: [providerId], references: [id])

  platform        CalendarPlatform  // GOOGLE, OUTLOOK
  accessToken     String   // Encrypted
  refreshToken    String?  // Encrypted
  tokenExpiresAt  DateTime?
  calendarId      String   // Selected calendar ID
  syncEnabled     Boolean  @default(true)
  lastSyncAt      DateTime?
  lastSyncError   String?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([configId, providerId, platform])
  @@index([configId])
}

enum CalendarPlatform {
  GOOGLE
  OUTLOOK
}

// Video meeting configurations
model VideoMeetingConfig {
  id              String   @id @default(cuid())
  configId        String
  config          SchedulingConfig @relation(fields: [configId], references: [id])

  platform        VideoPlatform  // ZOOM, GOOGLE_MEET, TEAMS
  accessToken     String   // Encrypted
  refreshToken    String?  // Encrypted
  tokenExpiresAt  DateTime?
  defaultSettings Json?    // Platform-specific settings

  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([configId, platform])
}

enum VideoPlatform {
  ZOOM
  GOOGLE_MEET
  TEAMS
}

// Payment configurations
model PaymentConfig {
  id              String   @id @default(cuid())
  configId        String   @unique
  config          SchedulingConfig @relation(fields: [configId], references: [id])

  stripeAccountId String?  // Connected Stripe account
  currency        String   @default("USD")
  collectPaymentAt PaymentTiming @default(BOOKING)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

enum PaymentTiming {
  BOOKING     // Collect at time of booking
  APPOINTMENT // Collect at appointment time
  NONE        // No payment collection
}

// Payment transactions
model PaymentTransaction {
  id              String   @id @default(cuid())
  appointmentId   String
  appointment     Appointment @relation(fields: [appointmentId], references: [id])

  stripePaymentIntentId String?
  amount          Decimal
  currency        String
  status          PaymentStatus
  type            PaymentType  // DEPOSIT, FULL, REFUND

  processedAt     DateTime?
  refundedAt      DateTime?
  failureReason   String?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([appointmentId])
  @@index([stripePaymentIntentId])
}

enum PaymentStatus {
  PENDING
  PROCESSING
  SUCCEEDED
  FAILED
  REFUNDED
  PARTIALLY_REFUNDED
}

enum PaymentType {
  DEPOSIT
  FULL
  REFUND
}
```

### 2.3 New API Endpoints

#### Public Booking API (Unauthenticated)

```typescript
// New public booking routes - no authentication required
// These are customer-facing endpoints

// Get booking page configuration
GET /api/booking/:slug
Response: { bookingPage, config, providers, appointmentTypes }

// Get available slots for a date range
GET /api/booking/:slug/availability
Query: { startDate, endDate, providerId?, appointmentTypeId?, timezone? }
Response: { slots: [{ datetime, providerId, available }] }

// Create booking (public, no auth)
POST /api/booking/:slug/book
Body: {
  appointmentTypeId, providerId, scheduledAt,
  patientName, patientEmail, patientPhone?,
  intakeFormResponses?, timezone
}
Response: { appointment, confirmationCode }

// Get booking details (by confirmation code)
GET /api/booking/confirmation/:code
Response: { appointment, canReschedule, canCancel }

// Reschedule booking (by confirmation code)
POST /api/booking/confirmation/:code/reschedule
Body: { newScheduledAt, timezone }

// Cancel booking (by confirmation code)
POST /api/booking/confirmation/:code/cancel
Body: { reason? }
```

#### Calendar Sync API (Authenticated)

```typescript
// OAuth flow endpoints
GET /api/scheduling/calendar/google/auth
GET /api/scheduling/calendar/google/callback
GET /api/scheduling/calendar/outlook/auth
GET /api/scheduling/calendar/outlook/callback

// Calendar management
GET /api/scheduling/:configId/calendar/integrations
POST /api/scheduling/:configId/calendar/sync  // Trigger manual sync
DELETE /api/scheduling/:configId/calendar/:integrationId
```

### 2.4 Booking Widget Architecture

```typescript
// Widget embed code (similar to chatbot widget)
<script>
  (function(w,d,s,o,f,js,fjs){
    w['PMOScheduling']=o;w[o]=w[o]||function(){(w[o].q=w[o].q||[]).push(arguments)};
    js=d.createElement(s);fjs=d.getElementsByTagName(s)[0];
    js.id=o;js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
  }(window,document,'script','pmoScheduling','https://app.pmo.com/scheduling-widget.js'));

  pmoScheduling('init', {
    slug: 'acme-consulting',
    primaryColor: '#3B82F6',
    position: 'bottom-right' // or 'inline'
  });
</script>

// For inline embedding:
<div id="pmo-scheduling-widget" data-slug="acme-consulting"></div>
```

---

## Part 3: Implementation Plan

### Phase 1: MVP Foundation (Weeks 1-4)

#### Sprint 1.1: Public Booking Infrastructure (Week 1-2)

| Task | Description | Effort |
|------|-------------|--------|
| 1.1.1 | Add BookingPage model to Prisma schema | S |
| 1.1.2 | Create booking page CRUD endpoints (admin) | M |
| 1.1.3 | Create public booking API endpoints | L |
| 1.1.4 | Build public booking page React component | L |
| 1.1.5 | Implement availability slot generation for public API | M |
| 1.1.6 | Add confirmation code generation and tracking | S |
| 1.1.7 | Build booking confirmation page | M |

**Deliverables:**
- Standalone booking page at `/book/:slug`
- Admin can configure booking page settings
- Customers can complete bookings without login

#### Sprint 1.2: Calendar Integration (Week 2-3)

| Task | Description | Effort |
|------|-------------|--------|
| 1.2.1 | Add CalendarIntegration model to schema | S |
| 1.2.2 | Implement Google OAuth flow | M |
| 1.2.3 | Implement Google Calendar read (busy times) | M |
| 1.2.4 | Implement Google Calendar write (create events) | M |
| 1.2.5 | Implement Microsoft Graph OAuth flow | M |
| 1.2.6 | Implement Outlook Calendar sync | M |
| 1.2.7 | Build calendar connection UI in admin | M |
| 1.2.8 | Implement background sync job | L |

**Deliverables:**
- Connect Google/Outlook calendars via OAuth
- Appointments sync to external calendars
- External busy times block booking slots

#### Sprint 1.3: Real Notifications (Week 3-4)

| Task | Description | Effort |
|------|-------------|--------|
| 1.3.1 | Integrate Twilio SDK for SMS | M |
| 1.3.2 | Build SMS message templates | S |
| 1.3.3 | Implement SMS delivery with status tracking | M |
| 1.3.4 | Set up Twilio webhook for SMS replies | M |
| 1.3.5 | Integrate SendGrid SDK for email | M |
| 1.3.6 | Build HTML email templates | M |
| 1.3.7 | Implement email delivery with tracking | M |
| 1.3.8 | Build reminder job scheduler | L |

**Deliverables:**
- Real SMS reminders via Twilio
- Real email confirmations/reminders via SendGrid
- Customers can reply to confirm/cancel

#### Sprint 1.4: Embeddable Widget (Week 4)

| Task | Description | Effort |
|------|-------------|--------|
| 1.4.1 | Create scheduling widget npm package | M |
| 1.4.2 | Build widget UI (React, compiled to vanilla JS) | L |
| 1.4.3 | Implement widget configuration options | M |
| 1.4.4 | Add widget embed code generator in admin | S |
| 1.4.5 | Test cross-origin embedding | M |

**Deliverables:**
- Embeddable booking widget
- Widget works on external websites
- Admin can customize widget appearance

---

### Phase 2: Competitive Features (Weeks 5-8)

#### Sprint 2.1: Video Conferencing (Week 5)

| Task | Description | Effort |
|------|-------------|--------|
| 2.1.1 | Add VideoMeetingConfig model | S |
| 2.1.2 | Implement Zoom OAuth and meeting creation | L |
| 2.1.3 | Implement Google Meet integration | M |
| 2.1.4 | Implement Microsoft Teams integration | M |
| 2.1.5 | Auto-include meeting links in appointments | M |

**Deliverables:**
- Auto-generate video meeting links on booking
- Meeting links included in confirmations/reminders

#### Sprint 2.2: Intake Forms (Week 5-6)

| Task | Description | Effort |
|------|-------------|--------|
| 2.2.1 | Add IntakeForm and IntakeFormResponse models | S |
| 2.2.2 | Build intake form builder UI | L |
| 2.2.3 | Integrate forms into booking flow | M |
| 2.2.4 | Store and display form responses | M |
| 2.2.5 | Add conditional logic to forms | L |

**Deliverables:**
- Admin can create custom intake forms
- Forms display during booking
- Responses stored with appointments

#### Sprint 2.3: Payment Integration (Week 6-7)

| Task | Description | Effort |
|------|-------------|--------|
| 2.3.1 | Add PaymentConfig and PaymentTransaction models | S |
| 2.3.2 | Implement Stripe Connect onboarding | L |
| 2.3.3 | Integrate Stripe Elements into booking | L |
| 2.3.4 | Implement deposit/full payment collection | M |
| 2.3.5 | Implement refund on cancellation | M |
| 2.3.6 | Build payment reporting in admin | M |

**Deliverables:**
- Collect deposits/payments at booking
- Automatic refunds on cancellation
- Payment history and reporting

#### Sprint 2.4: Self-Service Features (Week 7-8)

| Task | Description | Effort |
|------|-------------|--------|
| 2.4.1 | Build self-service reschedule page | M |
| 2.4.2 | Build self-service cancellation page | M |
| 2.4.3 | Add reschedule/cancel links to reminders | S |
| 2.4.4 | Implement booking modification rules | M |
| 2.4.5 | Trigger waitlist on cancellation | M |

**Deliverables:**
- Customers can reschedule without calling
- Customers can cancel with reason capture
- Waitlist automatically notified of openings

---

### Phase 3: AI-Powered Features (Weeks 9-12)

#### Sprint 3.1: Enhanced No-Show Prediction (Week 9-10)

| Task | Description | Effort |
|------|-------------|--------|
| 3.1.1 | Collect training data from prediction logs | M |
| 3.1.2 | Build ML model with additional features | L |
| 3.1.3 | Implement model serving API | M |
| 3.1.4 | Add A/B testing framework | M |
| 3.1.5 | Implement continuous learning pipeline | L |

**Deliverables:**
- ML-based no-show prediction (80%+ accuracy)
- Continuous model improvement

#### Sprint 3.2: Smart Scheduling (Week 10-11)

| Task | Description | Effort |
|------|-------------|--------|
| 3.2.1 | Analyze booking patterns by time/day | M |
| 3.2.2 | Build optimal slot recommendation engine | L |
| 3.2.3 | Surface "recommended times" in booking UI | M |
| 3.2.4 | Implement intelligent overbooking | L |

**Deliverables:**
- AI suggests optimal booking times
- Smart overbooking to maximize utilization

#### Sprint 3.3: Natural Language Booking (Week 11-12)

| Task | Description | Effort |
|------|-------------|--------|
| 3.3.1 | Build NLU intent recognition for scheduling | L |
| 3.3.2 | Implement slot-filling dialogue | L |
| 3.3.3 | Integrate with chatbot module | M |
| 3.3.4 | Add voice interface (optional) | XL |

**Deliverables:**
- Chat-based booking interface
- Handle "move my Friday appointment to next week"

---

### Phase 4: Industry Templates (Weeks 13-16)

| Template | Key Features | Target Industry |
|----------|--------------|-----------------|
| Healthcare | HIPAA, patient intake, insurance | Medical, dental, therapy |
| Professional Services | Consultation types, documents | Legal, consulting, accounting |
| Home Services | Service areas, travel time | HVAC, plumbing, contractors |
| Beauty/Wellness | Service menu, packages | Salons, spas, fitness |
| Restaurant | Party size, tables, occasions | Food service, hospitality |

---

## Part 4: Success Metrics

### Key Performance Indicators

| Metric | Current | Phase 1 Target | Phase 2 Target |
|--------|---------|----------------|----------------|
| Booking completion rate | N/A | 70% | 85% |
| Time to book | N/A | <90s | <60s |
| No-show rate | 15% baseline | 12% | 8% |
| Calendar sync reliability | 0% | 95% | 99.9% |
| Reminder delivery rate | 0% | 95% | 98% |
| Customer satisfaction | N/A | 4.0/5 | 4.5/5 |

### Tracking Implementation

- Add analytics events for funnel tracking
- Implement booking completion monitoring
- Track reminder delivery and response rates
- Monitor calendar sync success/failures
- Collect customer feedback post-booking

---

## Part 5: Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Calendar API rate limits | Medium | High | Implement caching, batch operations |
| SMS delivery failures | Medium | High | Fallback to email, retry logic |
| Stripe integration complexity | Medium | Medium | Start with simple payment flow |
| Time zone bugs | High | Medium | Comprehensive testing, use proven libraries |
| Widget cross-origin issues | Medium | Medium | Thorough CORS testing |
| HIPAA compliance gaps | Low | High | Security review before healthcare rollout |

---

## Part 6: Dependencies

### External Services Required

| Service | Purpose | Account Setup | Cost Estimate |
|---------|---------|---------------|---------------|
| Twilio | SMS delivery | API credentials | $0.0079/SMS |
| SendGrid | Email delivery | API credentials | Free tier available |
| Google Cloud | Calendar API | OAuth credentials | Free |
| Microsoft Azure | Graph API | App registration | Free |
| Stripe | Payments | Connect account | 2.9% + $0.30/txn |
| Zoom | Video meetings | OAuth app | Free API |

### Internal Dependencies

- CRM Account model for business/practice data
- CRM Contact model for customer records
- Feature flags module for gradual rollout
- Existing scheduling models (Provider, AppointmentType, Appointment)

---

## Part 7: Open Questions for Review

1. **Scope Priority:** Should we focus on appointment scheduling (Type A) only, or include employee shift scheduling (Type B)?
   - *Recommendation:* Type A first - faster ROI, broader market applicability

2. **Booking Page Hosting:** Should booking pages be subdomains (acme.book.pmo.com) or paths (/book/acme)?
   - *Recommendation:* Paths for simpler implementation, custom domains as future feature

3. **Payment Model:** Should payment processing be included in Phase 1 or deferred to Phase 2?
   - *Recommendation:* Phase 2 - adds complexity, not critical for initial launch

4. **Widget vs. Page:** Should we prioritize the embeddable widget or standalone booking page?
   - *Recommendation:* Standalone page first (simpler), widget in Phase 1 Week 4

5. **Industry Templates:** Which template should be built first?
   - *Recommendation:* Professional Services (aligns with consulting focus)

6. **Pricing Model:** Per-booking fees vs. flat monthly?
   - *Recommendation:* Flat monthly (market research shows customers dislike per-booking)

---

## Appendix A: Competitive Feature Comparison

| Feature | Calendly | Acuity | Cal.com | Our Tool (Current) | Our Tool (Phase 2) |
|---------|----------|--------|---------|--------------------|--------------------|
| Online Booking | ✅ | ✅ | ✅ | ❌ | ✅ |
| Google Calendar | ✅ | ✅ | ✅ | ❌ | ✅ |
| Outlook Sync | ✅ | ✅ | ✅ | ❌ | ✅ |
| SMS Reminders | ✅ | ✅ | ✅ | Simulated | ✅ |
| Email Reminders | ✅ | ✅ | ✅ | Simulated | ✅ |
| Payment Collection | ✅ | ✅ | ✅ | ❌ | ✅ |
| No-Show Prediction | ❌ | ❌ | ❌ | ✅ | ✅ (ML) |
| Waitlist | ❌ | ✅ | ❌ | ✅ | ✅ |
| Intake Forms | Limited | ✅ | ✅ | ❌ | ✅ |
| HIPAA Compliance | ❌ | ✅ | ❌ | ✅ | ✅ |
| Embeddable Widget | ✅ | ✅ | ✅ | ❌ | ✅ |
| AI Suggestions | ❌ | ❌ | ❌ | ❌ | ✅ |
| NL Booking | ❌ | ❌ | ❌ | ❌ | ✅ (Phase 3) |

---

## Appendix B: ROI Calculator for Customers

To be included in marketing materials:

**For a business with:**
- 100 appointments/month
- 15% no-show rate (industry average)
- $100 average appointment value

**Current Loss:** 15 appointments × $100 = $1,500/month = **$18,000/year**

**With AI Scheduling (40% no-show reduction):**
- New no-show rate: 9%
- Appointments recovered: 6/month
- Monthly savings: $600
- **Annual ROI: $7,200**

**Plus time savings:**
- 3.5 minutes saved per online booking
- 100 bookings × 3.5 min = 5.8 hours/month saved
- **70 hours/year in admin time recovered**

---

*Document prepared for Launchpad Consulting Partners internal review.*
*Implementation to begin upon stakeholder approval.*
