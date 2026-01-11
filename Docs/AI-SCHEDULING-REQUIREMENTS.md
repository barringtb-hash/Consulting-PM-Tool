# AI Scheduling Module - Requirements & Implementation Plan

**Document Version:** 1.1
**Date:** December 2025
**Status:** Pending Review
**Based On:** SMB Market Research Report, December 2025

---

## Executive Summary

This document outlines the requirements and implementation plan to evolve our AI Scheduling module from a healthcare-focused internal tool into a comprehensive, market-competitive scheduling solution for small to medium businesses.

### Scope Decision

**This implementation will cover BOTH scheduling types:**

| Type | Description | Primary Users |
|------|-------------|---------------|
| **Type A: Appointment Scheduling** | Booking appointments with external clients/customers | Professional services, healthcare, beauty/wellness, consultants |
| **Type B: Employee/Shift Scheduling** | Managing internal staff schedules and shifts | Retail, restaurants, healthcare facilities, manufacturing |

### Current State Assessment

Our existing scheduling module has solid foundations for **Type A (Appointments)**:
- **Implemented:** Appointment CRUD, provider management, appointment types, availability slots, no-show prediction (rule-based), reminder scheduling (simulated), waitlist management, analytics dashboard, HIPAA compliance framework
- **Database Ready:** 7 comprehensive Prisma models with full lifecycle tracking
- **Frontend:** Tab-based dashboard with calendar view, appointment lists, provider management, and analytics

**Type B (Employee Scheduling):** Not yet implemented - greenfield development required.

### Critical Gaps (Based on Market Research)

| Gap | Market Priority | Business Impact |
|-----|-----------------|-----------------|
| No customer-facing booking page/widget | Critical | Blocks self-service booking (70% customer preference) |
| Calendar integrations not active | Critical | 82% cite Google Calendar as top requirement |
| Reminders are simulated only | Critical | 23-40% no-show reduction depends on this |
| No video conferencing integration | High | Required for virtual appointments |
| No employee shift scheduling | High | Blocks retail/restaurant/healthcare facility use cases |
| Payment/deposit collection | TBD | Revenue protection - decision pending |
| Generic, not industry-specific | Medium | Competitors offer templates |

---

## Part 1: Requirements Specification

### 1.1 User Personas

#### Type A: Appointment Scheduling Personas

**Persona A1: Business Owner/Admin**
- Configures scheduling settings
- Manages providers and appointment types
- Views analytics and reports
- Needs: Simple setup (<30 min), mobile access, bulk actions

**Persona A2: Service Provider (Staff)**
- Views their schedule
- Confirms/reschedules appointments
- Adds notes to appointments
- Needs: Clear calendar view, quick status updates

**Persona A3: Customer/Client (End User)**
- Books appointments online
- Receives and responds to reminders
- Reschedules or cancels
- Needs: <60 second booking, no login required, mobile-friendly

#### Type B: Employee/Shift Scheduling Personas

**Persona B1: Manager/Scheduler**
- Creates and publishes weekly/monthly schedules
- Handles time-off requests and shift swaps
- Monitors overtime and labor compliance
- Needs: Drag-drop schedule builder, templates, conflict alerts

**Persona B2: Employee**
- Views assigned shifts on mobile
- Submits availability preferences
- Requests time off and shift swaps
- Needs: Mobile app, push notifications, easy swap requests

**Persona B3: HR/Compliance Officer**
- Reviews overtime reports
- Monitors labor law compliance
- Audits schedule changes
- Needs: Reports, alerts, audit trail

---

### 1.2 Functional Requirements

---

## Type A: Appointment Scheduling Requirements

#### Tier 1A: MVP Critical (Phase 1)

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

#### Tier 2A: Competitive Features (Phase 2)

| ID | Requirement | Description | Acceptance Criteria |
|----|-------------|-------------|---------------------|
| F2.1 | **Video Conferencing Integration** | Auto-generate Zoom/Meet/Teams links | Create meeting on booking, include link in confirmations and reminders |
| F2.2 | **Custom Intake Forms** | Collect customer information at booking | Form builder UI, required/optional fields, conditional logic, data storage |
| F2.3 | **Payment/Deposit Collection** | Stripe integration for payments | Collect deposit at booking, full payment option, refund on cancellation | ✅ **Moved to Phase 1** |
| F2.4 | **Rescheduling Self-Service** | Customer can reschedule without calling | Link in confirmation email, shows available alternatives, sends update notifications |
| F2.5 | **Cancellation Self-Service** | Customer can cancel without calling | Link in confirmation, captures reason, triggers waitlist notification |
| F2.6 | **Buffer Time Configuration** | Time between appointments | Per-provider and per-appointment-type buffers, travel time support |
| F2.7 | **Booking Rules Engine** | Advanced booking constraints | Min/max notice, daily/weekly limits, blackout dates, recurring availability |

#### Tier 3A: AI-Powered Appointment Features (Phase 3)

| ID | Requirement | Description | Acceptance Criteria |
|----|-------------|-------------|---------------------|
| F3.1 | **Smart Scheduling Suggestions** | AI recommends optimal times | Analyzes historical patterns, suggests times with lowest no-show risk |
| F3.2 | **Natural Language Booking** | Handle requests like "move to next Wednesday after 3pm" | Chat interface, voice support, context understanding |
| F3.3 | **Predictive No-Show Model** | ML-based no-show prediction | Improve accuracy from rule-based 60% to ML-based 80%+, continuous learning |
| F3.4 | **Intelligent Overbooking** | Smart overbooking based on predictions | Calculate optimal overbooking rate, minimize customer impact |
| F3.5 | **Automated Waitlist Matching** | Auto-offer cancelled slots to waitlist | Match preferences, priority-based notification, first-come booking |

#### Tier 4A: Industry Templates (Phase 4)

| ID | Requirement | Description |
|----|-------------|-------------|
| F4.1 | **Healthcare Template** | HIPAA-compliant, patient intake, insurance info |
| F4.2 | **Professional Services Template** | Consultation types, intake questionnaire, document upload |
| F4.3 | **Home Services Template** | Service areas, travel time, job categorization |
| F4.4 | **Beauty/Wellness Template** | Service menu, multiple providers, package booking |
| F4.5 | **Restaurant Template** | Party size, table assignment, special occasions |

---

## Type B: Employee/Shift Scheduling Requirements

#### Tier 1B: MVP Critical (Phase 5)

| ID | Requirement | Description | Acceptance Criteria |
|----|-------------|-------------|---------------------|
| S1.1 | **Employee Management** | Add/manage employees with roles and skills | Create employees, assign roles, set hourly rates, track certifications |
| S1.2 | **Shift Creation** | Create individual shifts with time/location/role | Define start/end time, location, required role/skills, employee assignment |
| S1.3 | **Schedule Builder UI** | Drag-and-drop weekly schedule builder | Visual calendar grid, drag shifts, copy/paste, week templates |
| S1.4 | **Availability Preferences** | Employees submit preferred/unavailable times | Weekly recurring availability, one-time blocks, preference vs hard unavailable |
| S1.5 | **Schedule Publishing** | Publish schedules to employees | Draft → Published workflow, notification on publish, locked once published |
| S1.6 | **Employee Mobile View** | Employees view their schedules on mobile | Mobile-responsive schedule view, upcoming shifts, push notifications |
| S1.7 | **Basic Conflict Detection** | Prevent double-booking and availability conflicts | Alert on conflicts, prevent scheduling during unavailable times |

#### Tier 2B: Competitive Features (Phase 6)

| ID | Requirement | Description | Acceptance Criteria |
|----|-------------|-------------|---------------------|
| S2.1 | **Time-Off Requests** | Employees request PTO/vacation | Submit request, manager approval workflow, calendar integration |
| S2.2 | **Shift Swap Requests** | Employees trade shifts with each other | Request swap, peer approval, manager approval (optional), notification |
| S2.3 | **Open Shift Board** | Post unfilled shifts for employees to claim | Manager posts open shifts, qualified employees see and claim |
| S2.4 | **Overtime Alerts** | Warn when approaching overtime thresholds | Configurable thresholds (40hr/week), alert before scheduling, reports |
| S2.5 | **Labor Cost Tracking** | Calculate labor costs per schedule | Hourly rates × hours, overtime premiums, budget vs actual |
| S2.6 | **Schedule Templates** | Save and reuse schedule patterns | Save week as template, apply template, rotate templates |
| S2.7 | **Multi-Location Support** | Manage schedules across locations | Location-based views, transfer shifts between locations |

#### Tier 3B: AI-Powered Shift Features (Phase 7)

| ID | Requirement | Description | Acceptance Criteria |
|----|-------------|-------------|---------------------|
| S3.1 | **Auto-Scheduling** | AI generates optimal schedules | Input requirements, AI assigns shifts respecting constraints |
| S3.2 | **Demand Forecasting** | Predict staffing needs based on history | Analyze past data, predict busy periods, recommend staffing levels |
| S3.3 | **Smart Shift Filling** | AI suggests best employees for open shifts | Consider skills, availability, preferences, fairness, overtime |
| S3.4 | **Fatigue/Compliance Monitoring** | Track rest periods and compliance | Alert on insufficient rest between shifts, break compliance |
| S3.5 | **Schedule Optimization** | Optimize existing schedules for cost/coverage | Minimize labor cost while maintaining coverage, balance workload |

#### Tier 4B: Advanced Compliance (Phase 8)

| ID | Requirement | Description |
|----|-------------|-------------|
| S4.1 | **Labor Law Compliance Engine** | Configurable rules for state/federal labor laws |
| S4.2 | **Break Scheduling** | Automatic break insertion per legal requirements |
| S4.3 | **Minor Work Restrictions** | Enforce hour limits for employees under 18 |
| S4.4 | **Predictive Scheduling Compliance** | Support fair workweek laws (advance notice, etc.) |
| S4.5 | **Audit Trail & Reporting** | Complete history of schedule changes for compliance |

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

// ============================================
// TYPE B: EMPLOYEE/SHIFT SCHEDULING MODELS
// ============================================

// Shift scheduling configuration (separate from appointment config)
model ShiftSchedulingConfig {
  id              String   @id @default(cuid())
  tenantId        String
  accountId       String?  // Link to Account/business

  // Business settings
  businessName    String
  timezone        String   @default("America/New_York")
  weekStartDay    Int      @default(0)  // 0 = Sunday, 1 = Monday

  // Overtime rules
  weeklyOvertimeThreshold  Int @default(40)  // Hours before overtime
  dailyOvertimeThreshold   Int?              // Optional daily threshold
  overtimeMultiplier       Decimal @default(1.5)

  // Compliance settings
  minRestBetweenShifts     Int @default(8)   // Minimum hours between shifts
  maxConsecutiveDays       Int @default(6)   // Max days without day off
  requireBreaks            Boolean @default(true)
  breakDurationMinutes     Int @default(30)
  breakAfterHours          Int @default(6)   // Require break after X hours

  // Notification settings
  schedulePublishLeadDays  Int @default(7)   // Days in advance to publish
  enableShiftReminders     Boolean @default(true)
  reminderHoursBefore      Int @default(12)

  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  employees       Employee[]
  shifts          Shift[]
  schedules       Schedule[]
  locations       ShiftLocation[]
  roles           ShiftRole[]

  @@index([tenantId])
  @@index([accountId])
}

// Employee record for shift scheduling
model Employee {
  id              String   @id @default(cuid())
  configId        String
  config          ShiftSchedulingConfig @relation(fields: [configId], references: [id])
  userId          String?  // Link to User if they have system access

  // Basic info
  firstName       String
  lastName        String
  email           String
  phone           String?
  employeeNumber  String?  // External employee ID

  // Employment details
  roleId          String?
  role            ShiftRole? @relation(fields: [roleId], references: [id])
  hourlyRate      Decimal?
  employmentType  EmploymentType @default(FULL_TIME)
  hireDate        DateTime?

  // Skills and certifications
  skills          Json?    // Array of skill tags
  certifications  Json?    // Array of { name, expiresAt }

  // Scheduling preferences
  maxHoursPerWeek Int?
  minHoursPerWeek Int?
  preferredLocations Json? // Array of location IDs

  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  shifts          Shift[]
  availability    EmployeeAvailability[]
  timeOffRequests TimeOffRequest[]
  swapRequestsFrom ShiftSwapRequest[] @relation("SwapRequester")
  swapRequestsTo   ShiftSwapRequest[] @relation("SwapTarget")

  @@unique([configId, email])
  @@index([configId])
  @@index([roleId])
}

enum EmploymentType {
  FULL_TIME
  PART_TIME
  CONTRACTOR
  SEASONAL
  TEMPORARY
}

// Locations/departments for multi-location scheduling
model ShiftLocation {
  id              String   @id @default(cuid())
  configId        String
  config          ShiftSchedulingConfig @relation(fields: [configId], references: [id])

  name            String
  address         String?
  timezone        String?  // Override config timezone
  color           String   @default("#3B82F6")

  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  shifts          Shift[]

  @@index([configId])
}

// Job roles/positions
model ShiftRole {
  id              String   @id @default(cuid())
  configId        String
  config          ShiftSchedulingConfig @relation(fields: [configId], references: [id])

  name            String   // e.g., "Server", "Manager", "Cashier"
  description     String?
  color           String   @default("#10B981")
  defaultHourlyRate Decimal?

  // Requirements
  requiredSkills  Json?    // Skills needed for this role

  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  employees       Employee[]
  shifts          Shift[]

  @@index([configId])
}

// Weekly/monthly schedule container
model Schedule {
  id              String   @id @default(cuid())
  configId        String
  config          ShiftSchedulingConfig @relation(fields: [configId], references: [id])

  name            String?  // e.g., "Week of Dec 16, 2025"
  startDate       DateTime
  endDate         DateTime
  status          ScheduleStatus @default(DRAFT)

  publishedAt     DateTime?
  publishedBy     String?  // User ID who published

  notes           String?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  shifts          Shift[]

  @@index([configId])
  @@index([startDate, endDate])
}

enum ScheduleStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

// Individual shift assignment
model Shift {
  id              String   @id @default(cuid())
  configId        String
  config          ShiftSchedulingConfig @relation(fields: [configId], references: [id])
  scheduleId      String?
  schedule        Schedule? @relation(fields: [scheduleId], references: [id])

  // Assignment
  employeeId      String?
  employee        Employee? @relation(fields: [employeeId], references: [id])
  roleId          String?
  role            ShiftRole? @relation(fields: [roleId], references: [id])
  locationId      String?
  location        ShiftLocation? @relation(fields: [locationId], references: [id])

  // Timing
  startTime       DateTime
  endTime         DateTime
  breakMinutes    Int      @default(0)

  // Status
  status          ShiftStatus @default(SCHEDULED)
  isOpen          Boolean  @default(false)  // Open for claiming

  // Notes
  notes           String?
  color           String?  // Override role/location color

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  swapRequests    ShiftSwapRequest[]

  @@index([configId])
  @@index([scheduleId])
  @@index([employeeId])
  @@index([startTime, endTime])
}

enum ShiftStatus {
  SCHEDULED
  CONFIRMED
  IN_PROGRESS
  COMPLETED
  MISSED
  CANCELLED
}

// Employee availability preferences
model EmployeeAvailability {
  id              String   @id @default(cuid())
  employeeId      String
  employee        Employee @relation(fields: [employeeId], references: [id])

  // Recurring weekly availability
  dayOfWeek       Int?     // 0-6 (Sunday-Saturday), null for specific date
  specificDate    DateTime? // For one-time availability/unavailability

  startTime       String   // "09:00" format
  endTime         String   // "17:00" format

  type            AvailabilityType @default(AVAILABLE)
  notes           String?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([employeeId])
  @@index([dayOfWeek])
  @@index([specificDate])
}

enum AvailabilityType {
  AVAILABLE
  PREFERRED
  UNAVAILABLE
}

// Time-off requests (PTO, vacation, sick)
model TimeOffRequest {
  id              String   @id @default(cuid())
  employeeId      String
  employee        Employee @relation(fields: [employeeId], references: [id])

  startDate       DateTime
  endDate         DateTime
  type            TimeOffType
  reason          String?

  status          TimeOffStatus @default(PENDING)
  reviewedBy      String?  // User ID of reviewer
  reviewedAt      DateTime?
  reviewNotes     String?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([employeeId])
  @@index([startDate, endDate])
  @@index([status])
}

enum TimeOffType {
  VACATION
  SICK
  PERSONAL
  BEREAVEMENT
  JURY_DUTY
  UNPAID
  OTHER
}

enum TimeOffStatus {
  PENDING
  APPROVED
  DENIED
  CANCELLED
}

// Shift swap requests between employees
model ShiftSwapRequest {
  id              String   @id @default(cuid())
  shiftId         String
  shift           Shift    @relation(fields: [shiftId], references: [id])

  requesterId     String
  requester       Employee @relation("SwapRequester", fields: [requesterId], references: [id])
  targetEmployeeId String?  // Null if open swap (anyone can take)
  targetEmployee  Employee? @relation("SwapTarget", fields: [targetEmployeeId], references: [id])

  offeredShiftId  String?  // Shift offered in exchange (null for giveaway)

  status          SwapStatus @default(PENDING)
  reason          String?

  // Approval chain
  peerApprovedAt  DateTime?
  managerApprovedAt DateTime?
  managerApprovedBy String?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([shiftId])
  @@index([requesterId])
  @@index([targetEmployeeId])
  @@index([status])
}

enum SwapStatus {
  PENDING
  PEER_APPROVED
  APPROVED
  DENIED
  CANCELLED
  EXPIRED
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

#### Type B: Shift Scheduling API (Authenticated)

```typescript
// Configuration
GET /api/shifts/configs                        // List configs
POST /api/shifts/configs                       // Create config
GET /api/shifts/configs/:configId              // Get config
PATCH /api/shifts/configs/:configId            // Update config

// Employees
GET /api/shifts/:configId/employees            // List employees
POST /api/shifts/:configId/employees           // Create employee
GET /api/shifts/employees/:id                  // Get employee
PATCH /api/shifts/employees/:id                // Update employee
DELETE /api/shifts/employees/:id               // Soft delete

// Locations
GET /api/shifts/:configId/locations            // List locations
POST /api/shifts/:configId/locations           // Create location
PATCH /api/shifts/locations/:id                // Update location
DELETE /api/shifts/locations/:id               // Delete location

// Roles
GET /api/shifts/:configId/roles                // List roles
POST /api/shifts/:configId/roles               // Create role
PATCH /api/shifts/roles/:id                    // Update role
DELETE /api/shifts/roles/:id                   // Delete role

// Schedules
GET /api/shifts/:configId/schedules            // List schedules
POST /api/shifts/:configId/schedules           // Create schedule
GET /api/shifts/schedules/:id                  // Get schedule with shifts
PATCH /api/shifts/schedules/:id                // Update schedule
POST /api/shifts/schedules/:id/publish         // Publish schedule
DELETE /api/shifts/schedules/:id               // Delete draft schedule

// Shifts
GET /api/shifts/:configId/shifts               // List shifts (with date filters)
POST /api/shifts/:configId/shifts              // Create shift
GET /api/shifts/shifts/:id                     // Get shift
PATCH /api/shifts/shifts/:id                   // Update shift
DELETE /api/shifts/shifts/:id                  // Delete shift
POST /api/shifts/shifts/:id/assign             // Assign employee
POST /api/shifts/shifts/:id/unassign           // Unassign employee

// Open Shifts
GET /api/shifts/:configId/open-shifts          // List open shifts
POST /api/shifts/shifts/:id/claim              // Employee claims shift

// Employee Availability
GET /api/shifts/employees/:id/availability     // Get employee availability
POST /api/shifts/employees/:id/availability    // Add availability
PATCH /api/shifts/availability/:id             // Update availability
DELETE /api/shifts/availability/:id            // Delete availability

// Time-Off Requests
GET /api/shifts/:configId/time-off             // List time-off requests
POST /api/shifts/employees/:id/time-off        // Request time off
PATCH /api/shifts/time-off/:id                 // Update request
POST /api/shifts/time-off/:id/approve          // Approve request
POST /api/shifts/time-off/:id/deny             // Deny request

// Shift Swaps
GET /api/shifts/:configId/swap-requests        // List swap requests
POST /api/shifts/shifts/:id/swap-request       // Create swap request
POST /api/shifts/swap-requests/:id/approve     // Approve swap (peer or manager)
POST /api/shifts/swap-requests/:id/deny        // Deny swap

// Analytics & Reports
GET /api/shifts/:configId/analytics            // Dashboard stats
GET /api/shifts/:configId/labor-costs          // Labor cost report
GET /api/shifts/:configId/overtime-alerts      // Overtime warnings
GET /api/shifts/:configId/coverage             // Coverage analysis
```

#### Employee Self-Service API (Limited Auth - Employee Portal)

```typescript
// Employee views their own data
GET /api/employee-portal/my-shifts             // My upcoming shifts
GET /api/employee-portal/my-schedule           // My schedule view
GET /api/employee-portal/my-availability       // My availability
POST /api/employee-portal/my-availability      // Update my availability
GET /api/employee-portal/my-time-off           // My time-off requests
POST /api/employee-portal/my-time-off          // Request time off
GET /api/employee-portal/open-shifts           // Available open shifts
POST /api/employee-portal/open-shifts/:id/claim // Claim open shift
POST /api/employee-portal/shifts/:id/swap      // Request shift swap
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

### Phase 1: MVP Foundation + Payment (Weeks 1-5)

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

#### Sprint 1.4: Payment Integration (Week 4)

| Task | Description | Effort |
|------|-------------|--------|
| 1.4.1 | Add PaymentConfig and PaymentTransaction models | S |
| 1.4.2 | Implement Stripe Connect onboarding flow | L |
| 1.4.3 | Integrate Stripe Elements into booking flow | L |
| 1.4.4 | Implement deposit collection at booking | M |
| 1.4.5 | Implement refund on cancellation | M |
| 1.4.6 | Build payment settings UI in admin | M |

**Deliverables:**
- Businesses can connect Stripe account
- Collect deposits/full payment at booking
- Automatic refunds on cancellation

#### Sprint 1.5: Embeddable Widget (Week 5)

| Task | Description | Effort |
|------|-------------|--------|
| 1.5.1 | Create scheduling widget npm package | M |
| 1.5.2 | Build widget UI (React, compiled to vanilla JS) | L |
| 1.5.3 | Implement widget configuration options | M |
| 1.5.4 | Add widget embed code generator in admin | S |
| 1.5.5 | Test cross-origin embedding | M |

**Deliverables:**
- Embeddable booking widget
- Widget works on external websites
- Admin can customize widget appearance

---

### Phase 2: Competitive Features (Weeks 6-9)

#### Sprint 2.1: Video Conferencing (Week 6)

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

#### Sprint 2.2: Intake Forms (Week 6-7)

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

#### Sprint 2.3: Self-Service Features (Week 7-8)

| Task | Description | Effort |
|------|-------------|--------|
| 2.3.1 | Build self-service reschedule page | M |
| 2.3.2 | Build self-service cancellation page | M |
| 2.3.3 | Add reschedule/cancel links to reminders | S |
| 2.3.4 | Implement booking modification rules | M |
| 2.3.5 | Trigger waitlist on cancellation | M |

**Deliverables:**
- Customers can reschedule without calling
- Customers can cancel with reason capture
- Waitlist automatically notified of openings

#### Sprint 2.4: Advanced Booking Features (Week 8-9)

| Task | Description | Effort |
|------|-------------|--------|
| 2.4.1 | Implement buffer time configuration | M |
| 2.4.2 | Build booking rules engine | L |
| 2.4.3 | Add payment reporting and analytics | M |
| 2.4.4 | Implement blackout dates and recurring availability | M |

**Deliverables:**
- Per-provider and per-type buffer times
- Min/max notice, daily/weekly booking limits
- Payment history and reporting dashboard

---

### Phase 3: AI-Powered Features (Weeks 10-13)

#### Sprint 3.1: Enhanced No-Show Prediction (Week 10-11)

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

#### Sprint 3.2: Smart Scheduling (Week 11-12)

| Task | Description | Effort |
|------|-------------|--------|
| 3.2.1 | Analyze booking patterns by time/day | M |
| 3.2.2 | Build optimal slot recommendation engine | L |
| 3.2.3 | Surface "recommended times" in booking UI | M |
| 3.2.4 | Implement intelligent overbooking | L |

**Deliverables:**
- AI suggests optimal booking times
- Smart overbooking to maximize utilization

#### Sprint 3.3: Natural Language Booking (Week 12-13)

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

### Phase 4: Industry Templates - Type A (Weeks 14-17)

> **Building ALL 5 templates as decided by stakeholder**

#### Sprint 4.1: Healthcare & Professional Services Templates (Week 14-15)

| Task | Description | Effort |
|------|-------------|--------|
| 4.1.1 | Build Healthcare template (HIPAA, patient intake, insurance) | L |
| 4.1.2 | Build Professional Services template (consultation types, documents) | L |
| 4.1.3 | Create template selection/onboarding UI | M |
| 4.1.4 | Implement template-specific intake forms | M |

**Deliverables:**
- Healthcare template with HIPAA compliance
- Professional Services template with intake questionnaires

#### Sprint 4.2: Home Services & Beauty/Wellness Templates (Week 15-16)

| Task | Description | Effort |
|------|-------------|--------|
| 4.2.1 | Build Home Services template (service areas, travel time) | L |
| 4.2.2 | Build Beauty/Wellness template (service menu, packages) | L |
| 4.2.3 | Implement location/travel time configuration | M |
| 4.2.4 | Add service package and add-on booking | M |

**Deliverables:**
- Home Services template with service area management
- Beauty/Wellness template with service menus

#### Sprint 4.3: Restaurant Template & Template System (Week 16-17)

| Task | Description | Effort |
|------|-------------|--------|
| 4.3.1 | Build Restaurant template (party size, tables, occasions) | L |
| 4.3.2 | Implement table/resource assignment | M |
| 4.3.3 | Build template customization UI | M |
| 4.3.4 | Create template marketplace/gallery | M |

**Deliverables:**
- Restaurant template with table management
- Template customization capabilities
- All 5 industry templates complete

---

## Type B: Employee/Shift Scheduling Implementation

> **PARALLEL DEVELOPMENT:** Type B runs simultaneously with Type A using a separate development team.
> Week numbers below are relative to Type B team start (same as Type A Week 1).

### Phase 5: Shift Scheduling MVP (Weeks 1-4) [PARALLEL WITH TYPE A]

#### Sprint 5.1: Core Infrastructure (Week 1-2)

| Task | Description | Effort |
|------|-------------|--------|
| 5.1.1 | Add all Type B models to Prisma schema | M |
| 5.1.2 | Create ShiftSchedulingConfig CRUD endpoints | M |
| 5.1.3 | Build Employee management API | M |
| 5.1.4 | Build Location and Role management API | M |
| 5.1.5 | Create admin dashboard shell for shift scheduling | L |

**Deliverables:**
- Database models migrated
- Basic configuration management
- Employee/Location/Role CRUD

#### Sprint 5.2: Schedule Builder (Week 2-3)

| Task | Description | Effort |
|------|-------------|--------|
| 5.2.1 | Build Schedule model API (create, list, get) | M |
| 5.2.2 | Build Shift CRUD API | M |
| 5.2.3 | Create drag-and-drop schedule builder UI | XL |
| 5.2.4 | Implement week view calendar component | L |
| 5.2.5 | Add shift assignment functionality | M |

**Deliverables:**
- Visual schedule builder with drag-and-drop
- Create and assign shifts to employees
- Week view calendar

#### Sprint 5.3: Availability & Publishing (Week 3-4)

| Task | Description | Effort |
|------|-------------|--------|
| 5.3.1 | Build Employee Availability API | M |
| 5.3.2 | Create availability input UI (employee view) | L |
| 5.3.3 | Implement conflict detection logic | L |
| 5.3.4 | Build schedule publish workflow | M |
| 5.3.5 | Send notifications on schedule publish | M |

**Deliverables:**
- Employees can set weekly availability
- Conflicts detected during scheduling
- Draft → Published workflow with notifications

#### Sprint 5.4: Employee Mobile View (Week 4)

| Task | Description | Effort |
|------|-------------|--------|
| 5.4.1 | Build employee portal API endpoints | M |
| 5.4.2 | Create mobile-responsive employee schedule view | L |
| 5.4.3 | Implement push notification setup | M |
| 5.4.4 | Add shift reminder notifications | M |

**Deliverables:**
- Employees view their schedules on mobile
- Push notifications for schedule changes
- Shift reminders

---

### Phase 6: Competitive Shift Features (Weeks 5-8) [PARALLEL WITH TYPE A]

#### Sprint 6.1: Time-Off Management (Week 5)

| Task | Description | Effort |
|------|-------------|--------|
| 6.1.1 | Build Time-Off Request API | M |
| 6.1.2 | Create time-off request UI (employee) | M |
| 6.1.3 | Build manager approval workflow UI | M |
| 6.1.4 | Integrate time-off with schedule builder | M |

**Deliverables:**
- Employees request time off
- Managers approve/deny requests
- Approved time-off blocks scheduling

#### Sprint 6.2: Shift Swaps (Week 5-6)

| Task | Description | Effort |
|------|-------------|--------|
| 6.2.1 | Build Shift Swap Request API | M |
| 6.2.2 | Create swap request UI | M |
| 6.2.3 | Implement peer approval flow | M |
| 6.2.4 | Add manager approval option | M |
| 6.2.5 | Send notifications for swap requests | S |

**Deliverables:**
- Employees request shift swaps
- Peer + optional manager approval
- Notifications throughout process

#### Sprint 6.3: Open Shifts & Coverage (Week 6-7)

| Task | Description | Effort |
|------|-------------|--------|
| 6.3.1 | Build open shift board API | M |
| 6.3.2 | Create open shift posting UI (manager) | M |
| 6.3.3 | Build open shift claiming UI (employee) | M |
| 6.3.4 | Implement coverage analysis report | L |

**Deliverables:**
- Managers post open shifts
- Employees claim available shifts
- Coverage gaps visualization

#### Sprint 6.4: Labor Cost & Overtime (Week 7-8)

| Task | Description | Effort |
|------|-------------|--------|
| 6.4.1 | Implement labor cost calculation engine | L |
| 6.4.2 | Build overtime detection and alerts | M |
| 6.4.3 | Create labor cost reporting UI | L |
| 6.4.4 | Add budget vs actual comparison | M |

**Deliverables:**
- Real-time labor cost tracking
- Overtime warnings during scheduling
- Labor cost reports and forecasts

---

### Phase 7: AI-Powered Shift Features (Weeks 9-12) [PARALLEL WITH TYPE A]

#### Sprint 7.1: Auto-Scheduling (Week 9-10)

| Task | Description | Effort |
|------|-------------|--------|
| 7.1.1 | Define scheduling constraints model | M |
| 7.1.2 | Build constraint satisfaction solver | XL |
| 7.1.3 | Implement "auto-fill" schedule feature | L |
| 7.1.4 | Add manual override capabilities | M |

**Deliverables:**
- AI generates schedules respecting all constraints
- One-click schedule generation
- Manual adjustments after auto-fill

#### Sprint 7.2: Demand Forecasting (Week 10-11)

| Task | Description | Effort |
|------|-------------|--------|
| 7.2.1 | Build historical data analysis pipeline | L |
| 7.2.2 | Implement demand prediction model | L |
| 7.2.3 | Create staffing recommendations UI | M |
| 7.2.4 | Integrate with schedule builder | M |

**Deliverables:**
- Predict busy periods from history
- Staffing level recommendations
- Visual demand forecast

#### Sprint 7.3: Smart Shift Filling (Week 11-12)

| Task | Description | Effort |
|------|-------------|--------|
| 7.3.1 | Build employee ranking algorithm | L |
| 7.3.2 | Implement fairness balancing | M |
| 7.3.3 | Add skill-based matching | M |
| 7.3.4 | Create "suggested employees" for open shifts | M |

**Deliverables:**
- AI suggests best employees for shifts
- Fairness in shift distribution
- Skill-based recommendations

---

### Phase 8: Compliance & Advanced Features (Weeks 13-16) [PARALLEL WITH TYPE A]

#### Sprint 8.1: Labor Law Compliance (Week 13-14)

| Task | Description | Effort |
|------|-------------|--------|
| 8.1.1 | Build configurable compliance rules engine | L |
| 8.1.2 | Implement common labor law templates | L |
| 8.1.3 | Add compliance violation alerts | M |
| 8.1.4 | Create compliance dashboard | M |

**Deliverables:**
- Configurable labor law rules
- Real-time compliance checking
- Compliance violation alerts

#### Sprint 8.2: Advanced Scheduling (Week 14-15)

| Task | Description | Effort |
|------|-------------|--------|
| 8.2.1 | Implement schedule templates | M |
| 8.2.2 | Add rotating schedule support | L |
| 8.2.3 | Build multi-location scheduling | L |
| 8.2.4 | Implement schedule versioning | M |

**Deliverables:**
- Reusable schedule templates
- Rotating schedule patterns
- Cross-location scheduling

#### Sprint 8.3: Reporting & Analytics (Week 15-16)

| Task | Description | Effort |
|------|-------------|--------|
| 8.3.1 | Build comprehensive analytics dashboard | L |
| 8.3.2 | Create exportable reports | M |
| 8.3.3 | Implement audit trail | M |
| 8.3.4 | Add payroll integration exports | M |

**Deliverables:**
- Full analytics dashboard
- Exportable reports (PDF, CSV)
- Complete audit trail
- Payroll system exports

---

## Implementation Timeline Summary

### Parallel Development Model (APPROVED)

```
Week:    1   2   3   4   5   6   7   8   9  10  11  12  13  14  15  16  17
         │   │   │   │   │   │   │   │   │   │   │   │   │   │   │   │   │
TEAM A:  ├───Phase 1────┤├───Phase 2────┤├───Phase 3────┤├───Phase 4────┤
         │ MVP + Payment ││  Competitive  ││  AI Features  ││  Templates   │
         │               ││               ││               ││              │
TEAM B:  ├───Phase 5────┤├───Phase 6────┤├───Phase 7────┤├───Phase 8────┤
         │  Shift MVP   ││ Shift Features││  AI Shifts    ││  Compliance  │
```

### Type A: Appointment Scheduling (Team A)

| Phase | Focus | Weeks | Duration |
|-------|-------|-------|----------|
| Phase 1 | MVP Foundation + Payment | 1-5 | 5 weeks |
| Phase 2 | Competitive Features | 6-9 | 4 weeks |
| Phase 3 | AI-Powered Features | 10-13 | 4 weeks |
| Phase 4 | Industry Templates (ALL 5) | 14-17 | 4 weeks |

### Type B: Employee/Shift Scheduling (Team B)

| Phase | Focus | Weeks | Duration |
|-------|-------|-------|----------|
| Phase 5 | Shift Scheduling MVP | 1-4 | 4 weeks |
| Phase 6 | Competitive Shift Features | 5-8 | 4 weeks |
| Phase 7 | AI-Powered Shift Features | 9-12 | 4 weeks |
| Phase 8 | Compliance & Advanced | 13-16 | 4 weeks |

### Total Timeline

| Scenario | Duration | Notes |
|----------|----------|-------|
| **Parallel Development (2 teams)** | **17 weeks (~4 months)** | Both types complete simultaneously |
| Sequential Development (1 team) | 33 weeks (~8 months) | Type A then Type B |

**✅ APPROVED: Parallel Development with 2 teams**

---

## Part 4: Success Metrics

### Type A: Appointment Scheduling KPIs

| Metric | Current | Phase 1 Target | Phase 2 Target |
|--------|---------|----------------|----------------|
| Booking completion rate | N/A | 70% | 85% |
| Time to book | N/A | <90s | <60s |
| No-show rate | 15% baseline | 12% | 8% |
| Calendar sync reliability | 0% | 95% | 99.9% |
| Reminder delivery rate | 0% | 95% | 98% |
| Customer satisfaction | N/A | 4.0/5 | 4.5/5 |

### Type B: Employee/Shift Scheduling KPIs

| Metric | Current | Phase 5 Target | Phase 6 Target |
|--------|---------|----------------|----------------|
| Schedule creation time | N/A | <30 min/week | <15 min/week |
| Schedule conflict rate | N/A | <5% | <2% |
| Time-off request turnaround | N/A | <24 hours | <4 hours |
| Shift swap completion rate | N/A | 70% | 85% |
| Open shift fill rate | N/A | 80% | 95% |
| Employee schedule view adoption | N/A | 60% | 90% |
| Labor law compliance rate | N/A | 95% | 99% |
| Overtime violations prevented | N/A | 80% | 95% |

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

### Resolved Decisions

| # | Question | Decision | Notes |
|---|----------|----------|-------|
| 1 | **Scope Priority:** Type A only or include Type B? | ✅ **BOTH** | Implementing both appointment scheduling AND employee shift scheduling |
| 2 | **Booking Page Hosting:** Subdomains or paths? | ✅ **Paths** | `/book/acme` format, custom domains as future feature |
| 3 | **Customer Payment Collection:** When to implement Stripe? | ✅ **Phase 1** | As early as possible - moving to Phase 1 |
| 4 | **Widget vs. Page:** Which to prioritize? | ✅ **Page first** | Standalone page first, widget in Phase 1 Week 4 |
| 5 | **Industry Templates:** Which template first? | ✅ **ALL** | Build all 5 templates in Phase 4 |
| 6 | **SaaS Pricing Model:** How to charge businesses? | ✅ **Flat monthly** | Per market research, customers prefer predictable pricing |
| 7 | **Employee Portal:** Separate app or integrated? | ✅ **Responsive web** | Mobile-responsive web for MVP |
| 8 | **Type A + B Sequencing:** Sequential or parallel? | ✅ **PARALLEL** | Both types developed simultaneously with separate teams |

### Remaining Open Questions

| # | Question | Options | Notes |
|---|----------|---------|-------|
| 9 | **Labor Law Templates:** Which states/countries first? | US federal, California, NY, EU | Affects Phase 8 compliance engine |
| 10 | **Pricing Tiers:** What features in each tier? | Basic/Pro/Enterprise | Needs pricing strategy session |

---

## Appendix A: Competitive Feature Comparison

### Type A: Appointment Scheduling Competitors

| Feature | Calendly | Acuity | Cal.com | Our Tool (Current) | Our Tool (Phase 2) |
|---------|----------|--------|---------|--------------------|--------------------|
| Online Booking | ✅ | ✅ | ✅ | ❌ | ✅ |
| Google Calendar | ✅ | ✅ | ✅ | ❌ | ✅ |
| Outlook Sync | ✅ | ✅ | ✅ | ❌ | ✅ |
| SMS Reminders | ✅ | ✅ | ✅ | Simulated | ✅ |
| Email Reminders | ✅ | ✅ | ✅ | Simulated | ✅ |
| Payment Collection | ✅ | ✅ | ✅ | ❌ | TBD |
| No-Show Prediction | ❌ | ❌ | ❌ | ✅ | ✅ (ML) |
| Waitlist | ❌ | ✅ | ❌ | ✅ | ✅ |
| Intake Forms | Limited | ✅ | ✅ | ❌ | ✅ |
| HIPAA Compliance | ❌ | ✅ | ❌ | ✅ | ✅ |
| Embeddable Widget | ✅ | ✅ | ✅ | ❌ | ✅ |
| AI Suggestions | ❌ | ❌ | ❌ | ❌ | ✅ |
| NL Booking | ❌ | ❌ | ❌ | ❌ | ✅ (Phase 3) |

### Type B: Employee/Shift Scheduling Competitors

| Feature | When I Work | Deputy | Homebase | 7shifts | Our Tool (Phase 6) |
|---------|-------------|--------|----------|---------|-------------------|
| Schedule Builder | ✅ | ✅ | ✅ | ✅ | ✅ |
| Employee App | ✅ | ✅ | ✅ | ✅ | ✅ (Web) |
| Availability Mgmt | ✅ | ✅ | ✅ | ✅ | ✅ |
| Time-Off Requests | ✅ | ✅ | ✅ | ✅ | ✅ |
| Shift Swaps | ✅ | ✅ | ✅ | ✅ | ✅ |
| Open Shifts | ✅ | ✅ | ✅ | ✅ | ✅ |
| Overtime Alerts | ✅ | ✅ | ✅ | ✅ | ✅ |
| Labor Costing | ✅ | ✅ | ✅ | ✅ | ✅ |
| Auto-Scheduling | Limited | ✅ | ❌ | Limited | ✅ (AI) |
| Demand Forecasting | ❌ | ✅ | ❌ | ✅ | ✅ (AI) |
| Compliance Engine | Basic | ✅ | Basic | ✅ | ✅ |
| Multi-Location | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Combined A+B** | ❌ | ❌ | ❌ | ❌ | **✅ Unique** |

**Our Differentiator:** Single platform offering both appointment scheduling (Type A) AND employee shift scheduling (Type B) - competitors typically only offer one.

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
