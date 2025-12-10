# AI Tools Developer Documentation

This document provides comprehensive technical documentation for the AI Chatbot and Smart Document Analyzer tools, intended for internal developers extending these tools for new customers.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [AI Chatbot](#ai-chatbot)
  - [Features](#chatbot-features)
  - [Database Schema](#chatbot-database-schema)
  - [API Reference](#chatbot-api-reference)
  - [Configuration Options](#chatbot-configuration-options)
  - [Widget Customization](#widget-customization)
  - [Webhooks](#webhooks)
  - [Multi-Channel Support](#multi-channel-support)
  - [Knowledge Base](#knowledge-base)
  - [Analytics](#chatbot-analytics)
- [Smart Document Analyzer](#smart-document-analyzer)
  - [Features](#document-analyzer-features)
  - [Database Schema](#document-analyzer-database-schema)
  - [API Reference](#document-analyzer-api-reference)
  - [Configuration Options](#document-analyzer-configuration-options)
  - [Extraction Templates](#extraction-templates)
  - [Compliance Checking](#compliance-checking)
  - [Integrations](#document-integrations)
  - [Analytics](#document-analyzer-analytics)
- [Widget Package (@pmo/chatbot-widget)](#widget-package)
  - [Installation](#widget-installation)
  - [Components](#widget-components)
  - [Hooks](#widget-hooks)
  - [Types](#widget-types)
- [AI Integration & Production Setup](#ai-integration--production-setup)
  - [OpenAI Configuration](#openai-configuration)
  - [Fallback Behavior](#fallback-behavior)
  - [Production Checklist](#production-checklist)
- [Troubleshooting](#troubleshooting)

---

## Overview

The AI Tools module provides two powerful customer-facing AI capabilities:

| Tool | Purpose | Key Capabilities |
|------|---------|------------------|
| **AI Chatbot** | Customer service automation | Conversational AI, intent detection, knowledge base, multi-channel messaging, webhooks |
| **Document Analyzer** | Intelligent document processing | OCR, field extraction, NER, compliance checking, version comparison |

Both tools follow a per-client configuration model, where each client can have their own configuration with customized settings.

---

## Architecture

### File Structure

```
pmo/
├── apps/
│   ├── api/src/modules/
│   │   ├── chatbot/
│   │   │   ├── chatbot.router.ts       # Main API routes
│   │   │   ├── chatbot.service.ts      # Core business logic
│   │   │   ├── widget/
│   │   │   │   ├── widget.router.ts    # Widget serving endpoints
│   │   │   │   └── widget.template.ts  # Embeddable JS template
│   │   │   ├── webhooks/
│   │   │   │   ├── webhook.router.ts   # Webhook management routes
│   │   │   │   └── webhook.service.ts  # Webhook dispatch logic
│   │   │   └── channels/
│   │   │       ├── channel.router.ts   # Channel config routes
│   │   │       ├── channel.service.ts  # Channel management
│   │   │       ├── channel-manager.ts  # Message routing
│   │   │       └── adapters/           # Channel-specific adapters
│   │   │           ├── twilio.adapter.ts
│   │   │           └── slack.adapter.ts
│   │   │
│   │   └── document-analyzer/
│   │       ├── document-analyzer.router.ts  # Main API routes
│   │       ├── document-analyzer.service.ts # Core business logic
│   │       ├── services/
│   │       │   ├── classification.service.ts
│   │       │   ├── compliance.service.ts
│   │       │   ├── analytics.service.ts
│   │       │   └── integrations.service.ts
│   │       └── templates/
│   │           └── built-in-templates.ts    # Pre-built extraction templates
│   │
│   └── web/src/pages/ai-tools/
│       ├── ChatbotPage.tsx          # Chatbot admin UI
│       └── DocumentAnalyzerPage.tsx # Document analyzer admin UI
│
├── packages/
│   └── chatbot-widget/              # NPM package for embedding
│       ├── src/
│       │   ├── ChatWidget.tsx       # Floating bubble widget
│       │   ├── ChatWindow.tsx       # Embedded chat window
│       │   ├── useChatbot.ts        # React hook
│       │   ├── types.ts             # TypeScript definitions
│       │   └── index.ts             # Package exports
│       └── package.json
│
└── prisma/
    └── schema.prisma                # Database models
```

### Request Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     External Widget/Client                       │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │ ChatWidget  │    │ Customer    │    │ Third-party │         │
│  │ (embedded)  │    │ Website     │    │ Channel     │         │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘         │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API Layer                                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Public Routes (no auth):                                 │    │
│  │   POST /api/chatbot/:configId/conversations              │    │
│  │   POST /api/chatbot/conversations/:sessionId/messages    │    │
│  │   GET  /api/chatbot/widget/:configId.js                  │    │
│  │   POST /api/chatbot/channels/:channel/webhook            │    │
│  └─────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Authenticated Routes (requireAuth):                      │    │
│  │   GET/POST/PATCH /api/clients/:clientId/chatbot          │    │
│  │   GET/POST /api/chatbot/:configId/knowledge-base         │    │
│  │   GET/POST /api/chatbot/:configId/webhooks               │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Service Layer                               │
│  ┌──────────────────┐    ┌──────────────────┐                   │
│  │ chatbot.service  │    │ webhook.service  │                   │
│  │ - processMessage │    │ - dispatchEvent  │                   │
│  │ - analyzeIntent  │    │ - deliverWebhook │                   │
│  │ - generateResp   │    │ - retry logic    │                   │
│  └────────┬─────────┘    └────────┬─────────┘                   │
│           │                       │                              │
│           ▼                       ▼                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ AI Integration (OpenAI GPT-4o-mini)                      │   │
│  │ - Intent classification                                   │   │
│  │ - Sentiment analysis                                      │   │
│  │ - Response generation                                     │   │
│  │ - OCR (Vision API)                                        │   │
│  │ - Field extraction                                        │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Database (Prisma)                           │
│  ChatbotConfig, ChatConversation, ChatMessage, KnowledgeBase    │
│  WebhookConfig, ChannelConfig, ChatAnalytics                    │
│  DocumentAnalyzerConfig, AnalyzedDocument, ExtractionTemplate   │
└─────────────────────────────────────────────────────────────────┘
```

---

## AI Chatbot

### Chatbot Features

| Feature | Description | Config Flag |
|---------|-------------|-------------|
| **Conversational AI** | Natural language understanding with GPT-4o-mini | Always enabled |
| **Intent Detection** | Classifies messages into predefined intents | Always enabled |
| **Sentiment Analysis** | Analyzes customer sentiment (-1 to +1 scale) | Always enabled |
| **Order Tracking** | Integration with e-commerce for order status | `enableOrderTracking` |
| **Returns Processing** | Handle return/refund requests | `enableReturns` |
| **FAQ/Knowledge Base** | Match questions to knowledge base articles | `enableFAQ` |
| **Human Handoff** | Escalate to live agents | `enableHumanHandoff` |
| **Widget Embedding** | JavaScript widget for customer websites | Always available |
| **Multi-Channel** | SMS, WhatsApp, Slack, Teams, Email | Per-channel config |
| **Webhooks** | Real-time event notifications | Per-webhook config |
| **Analytics** | Daily aggregated metrics | Always enabled |

### Intent Types

The chatbot classifies customer messages into these intents:

| Intent | Description | Example Triggers |
|--------|-------------|------------------|
| `ORDER_STATUS` | Order tracking requests | "where is my order", "track package" |
| `RETURN_REQUEST` | Return/refund inquiries | "return this item", "want a refund" |
| `PRODUCT_INQUIRY` | Product questions | "is this available", "what's the price" |
| `FAQ` | Knowledge base matches | Matched by keyword similarity |
| `COMPLAINT` | Customer dissatisfaction | "terrible service", "very unhappy" |
| `ESCALATION` | Agent request | "speak to a human", "talk to agent" |
| `GENERAL` | Catch-all for other inquiries | Default fallback |

### Chatbot Database Schema

#### ChatbotConfig
Main configuration table, one per client:

```prisma
model ChatbotConfig {
  id                  Int       @id @default(autoincrement())
  clientId            Int       @unique
  name                String
  welcomeMessage      String?
  fallbackMessage     String?

  // Feature toggles
  enableOrderTracking Boolean   @default(true)
  enableReturns       Boolean   @default(true)
  enableFAQ           Boolean   @default(true)
  enableHumanHandoff  Boolean   @default(true)

  // Channel & business hours (JSON)
  channelSettings     Json?
  businessHours       Json?

  // Integration credentials
  shopifyApiKey       String?
  woocommerceApiKey   String?
  zendeskApiKey       String?
  freshdeskApiKey     String?

  // Widget customization
  widgetPosition      String    @default("bottom-right")
  widgetPrimaryColor  String    @default("#3B82F6")
  widgetTextColor     String    @default("#FFFFFF")
  widgetBubbleIcon    String    @default("chat")
  widgetTitle         String?
  widgetSubtitle      String?
  widgetAvatarUrl     String?
  widgetAllowedDomains String?
  widgetCustomCss     String?

  isActive            Boolean   @default(true)
}
```

#### ChatConversation
Tracks individual conversation sessions:

```prisma
model ChatConversation {
  id                Int                 @id @default(autoincrement())
  chatbotConfigId   Int
  channel           ChatChannel         @default(WEB)
  status            ConversationStatus  @default(ACTIVE)
  sessionId         String              @unique

  // Customer info
  customerEmail     String?
  customerName      String?
  customerPhone     String?

  // Escalation
  escalatedAt       DateTime?
  escalatedToAgentId Int?
  escalationReason  String?

  // Satisfaction
  satisfactionRating Int?   // 1-5 stars
  satisfactionFeedback String?
}

enum ConversationStatus {
  ACTIVE
  WAITING_CUSTOMER
  WAITING_AGENT
  ESCALATED
  RESOLVED
  CLOSED
}

enum ChatChannel {
  WEB
  SMS
  WHATSAPP
  SLACK
  TEAMS
  MESSENGER
  EMAIL
}
```

#### ChatMessage
Individual messages within conversations:

```prisma
model ChatMessage {
  id              Int             @id @default(autoincrement())
  conversationId  Int
  sender          MessageSender   // CUSTOMER, BOT, AGENT
  content         String

  // AI analysis
  detectedIntent  IntentType?
  intentConfidence Float?
  sentiment       Float?          // -1 to 1 scale

  // Bot response metadata
  suggestedActions Json?          // Array of quick-reply buttons
}
```

### Chatbot API Reference

#### Public Endpoints (No Authentication)

**Start Conversation**
```
POST /api/chatbot/:configId/conversations
```

Request:
```json
{
  "customerEmail": "customer@example.com",
  "customerName": "John Doe",
  "channel": "WEB"
}
```

Response:
```json
{
  "id": 1,
  "sessionId": "uuid-v4-session-id",
  "status": "ACTIVE",
  "messages": [
    {
      "id": 1,
      "sender": "BOT",
      "content": "Hello! How can I help you today?",
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

**Send Message**
```
POST /api/chatbot/conversations/:sessionId/messages
```

Request:
```json
{
  "content": "Where is my order #12345?",
  "customerEmail": "customer@example.com"
}
```

Response:
```json
{
  "message": {
    "id": 2,
    "sender": "CUSTOMER",
    "content": "Where is my order #12345?",
    "detectedIntent": "ORDER_STATUS",
    "intentConfidence": 0.95,
    "sentiment": 0.1
  },
  "response": {
    "content": "I can help you track your order! Let me look up order #12345 for you.",
    "suggestedActions": [
      { "label": "Track Another Order", "action": "track_order" },
      { "label": "Talk to Agent", "action": "escalate" }
    ]
  }
}
```

**Get Conversation**
```
GET /api/chatbot/conversations/:sessionId
```

#### Authenticated Endpoints

**Get Client Chatbot Config**
```
GET /api/clients/:clientId/chatbot
```

**Create Chatbot Config**
```
POST /api/clients/:clientId/chatbot
```

Request:
```json
{
  "name": "Customer Support Bot",
  "welcomeMessage": "Hi! How can I assist you today?",
  "fallbackMessage": "I'm sorry, I didn't understand. Would you like to speak with an agent?",
  "enableOrderTracking": true,
  "enableReturns": true,
  "enableFAQ": true,
  "enableHumanHandoff": true
}
```

**Update Chatbot Config**
```
PATCH /api/clients/:clientId/chatbot
```

**List Conversations**
```
GET /api/chatbot/:configId/conversations?status=ACTIVE&limit=50&offset=0
```

**Update Conversation Status**
```
PATCH /api/chatbot/conversations/:sessionId/status
```

Request:
```json
{
  "status": "ESCALATED",
  "escalationReason": "Customer requested agent",
  "escalatedToAgentId": 5
}
```

### Chatbot Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | string | required | Display name for the chatbot |
| `welcomeMessage` | string | null | Initial message sent when conversation starts |
| `fallbackMessage` | string | null | Response when intent cannot be determined |
| `enableOrderTracking` | boolean | true | Enable order status lookup |
| `enableReturns` | boolean | true | Enable return/refund processing |
| `enableFAQ` | boolean | true | Enable knowledge base matching |
| `enableHumanHandoff` | boolean | true | Allow escalation to human agents |
| `businessHours` | JSON | null | Operating hours configuration |
| `channelSettings` | JSON | null | Per-channel configuration |

#### Business Hours Format

```json
{
  "timezone": "America/New_York",
  "hours": {
    "monday": { "open": "09:00", "close": "17:00" },
    "tuesday": { "open": "09:00", "close": "17:00" },
    "wednesday": { "open": "09:00", "close": "17:00" },
    "thursday": { "open": "09:00", "close": "17:00" },
    "friday": { "open": "09:00", "close": "17:00" },
    "saturday": null,
    "sunday": null
  }
}
```

### Widget Customization

The chatbot widget can be embedded on customer websites and fully customized.

#### Widget Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `widgetPosition` | string | "bottom-right" | "bottom-right" or "bottom-left" |
| `widgetPrimaryColor` | string | "#3B82F6" | Primary brand color (hex) |
| `widgetTextColor` | string | "#FFFFFF" | Text color on primary elements |
| `widgetBubbleIcon` | string | "chat" | Icon type: chat, message, support, custom |
| `widgetTitle` | string | null | Custom header title |
| `widgetSubtitle` | string | null | Subtitle below header |
| `widgetAvatarUrl` | string | null | Bot avatar image URL |
| `widgetAllowedDomains` | string | null | Comma-separated allowed domains |
| `widgetCustomCss` | string | null | Custom CSS overrides |

#### Embedding the Widget

**Method 1: Script Tag (Recommended)**
```html
<script src="https://your-api.com/api/chatbot/widget/123.js"></script>
```

**Method 2: iframe Embed**
```html
<iframe
  src="https://your-api.com/api/chatbot/embed/123"
  width="400"
  height="600"
  frameborder="0"
></iframe>
```

**Method 3: React Package**
```tsx
import { ChatWidget } from '@pmo/chatbot-widget';

<ChatWidget
  apiUrl="https://your-api.com/api"
  configId={123}
  position="bottom-right"
  primaryColor="#3B82F6"
  onMessageSent={(msg) => console.log('Sent:', msg)}
/>
```

#### Getting Widget Config
```
GET /api/chatbot/widget/:configId/config
```

Returns JSON configuration for the widget.

### Webhooks

The chatbot can send real-time event notifications to external systems.

#### Webhook Events

| Event | Trigger | Payload |
|-------|---------|---------|
| `conversation.started` | New conversation created | conversationId, sessionId, channel, customerEmail |
| `conversation.ended` | Conversation closed/resolved | conversationId, sessionId, status, satisfactionRating |
| `conversation.escalated` | Escalated to human agent | conversationId, sessionId, escalationReason |
| `message.received` | Customer message received | conversationId, messageId, content, intent, sentiment |
| `message.sent` | Bot/agent message sent | conversationId, messageId, content, suggestedActions |
| `customer.rating` | Customer submits rating | conversationId, rating, feedback |

#### Webhook Payload Format

```json
{
  "event": "message.received",
  "timestamp": "2025-01-01T12:00:00.000Z",
  "chatbotConfigId": 123,
  "data": {
    "conversationId": 456,
    "sessionId": "uuid-session-id",
    "messageId": 789,
    "content": "Where is my order?",
    "intent": "ORDER_STATUS",
    "intentConfidence": 0.95,
    "sentiment": 0.1
  }
}
```

#### Webhook Security

All webhooks include HMAC-SHA256 signature in the `X-Webhook-Signature` header:

```typescript
// Verify webhook signature
import crypto from 'crypto';

function verifyWebhook(payload: string, signature: string, secret: string): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

#### Webhook API Endpoints

```
GET    /api/chatbot/:configId/webhooks           # List webhooks
POST   /api/chatbot/:configId/webhooks           # Create webhook
PATCH  /api/chatbot/webhooks/:id                 # Update webhook
DELETE /api/chatbot/webhooks/:id                 # Delete webhook
POST   /api/chatbot/webhooks/:id/test            # Test webhook
POST   /api/chatbot/webhooks/:id/regenerate-secret  # Regenerate secret
GET    /api/chatbot/webhooks/:id/logs            # Get delivery logs
```

### Multi-Channel Support

The chatbot supports receiving messages from multiple channels.

#### Supported Channels

| Channel | Adapter | Webhook Endpoint | Status |
|---------|---------|------------------|--------|
| Web Widget | Built-in | N/A (direct API) | Production |
| Twilio SMS | `twilio.adapter.ts` | `/api/chatbot/channels/twilio/webhook` | Production |
| Twilio WhatsApp | `twilio.adapter.ts` | `/api/chatbot/channels/whatsapp/webhook` | Production |
| Slack | `slack.adapter.ts` | `/api/chatbot/channels/slack/webhook` | Production |
| MS Teams | Planned | N/A | Planned |
| Messenger | Planned | N/A | Planned |
| Email | Planned | N/A | Planned |

#### Channel Configuration

```
GET    /api/chatbot/:configId/channels           # List channels
POST   /api/chatbot/:configId/channels           # Create channel
PATCH  /api/chatbot/channels/:channelId          # Update channel
DELETE /api/chatbot/channels/:channelId          # Delete channel
POST   /api/chatbot/channels/:channelId/test     # Test channel
POST   /api/chatbot/channels/verify              # Verify credentials
```

#### Twilio Configuration Example

```json
{
  "channel": "twilio_sms",
  "name": "Main SMS Line",
  "credentials": {
    "accountSid": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "authToken": "your_auth_token",
    "phoneNumber": "+15551234567"
  },
  "identifier": "+15551234567"
}
```

### Knowledge Base

The knowledge base provides FAQ matching capabilities.

#### API Endpoints

```
GET    /api/chatbot/:configId/knowledge-base     # List KB items
POST   /api/chatbot/:configId/knowledge-base     # Create KB item
PATCH  /api/chatbot/knowledge-base/:id           # Update KB item
DELETE /api/chatbot/knowledge-base/:id           # Delete KB item
```

#### Knowledge Base Item Structure

```json
{
  "question": "What is your return policy?",
  "answer": "You can return any item within 30 days of purchase...",
  "keywords": ["return", "refund", "policy", "30 days"],
  "category": "Returns",
  "priority": 1,
  "isPublished": true
}
```

The chatbot automatically matches incoming messages against the knowledge base using keyword similarity before falling back to AI intent classification.

### Chatbot Analytics

Daily aggregated analytics are stored in the `ChatAnalytics` table.

#### Analytics API

```
GET /api/chatbot/:configId/analytics?startDate=2025-01-01&endDate=2025-01-31
```

Response:
```json
{
  "summary": {
    "totalConversations": 1250,
    "totalMessages": 8500,
    "uniqueCustomers": 980,
    "avgResponseTimeMs": 450,
    "avgSatisfactionRating": 4.2,
    "resolutionRate": 0.78
  },
  "daily": [
    {
      "date": "2025-01-01",
      "totalConversations": 45,
      "resolvedByBot": 35,
      "escalatedToAgent": 8,
      "abandonedByCustomer": 2
    }
  ],
  "intentBreakdown": {
    "ORDER_STATUS": 320,
    "RETURN_REQUEST": 180,
    "PRODUCT_INQUIRY": 250,
    "FAQ": 400,
    "GENERAL": 100
  },
  "channelBreakdown": {
    "WEB": 800,
    "SMS": 250,
    "WHATSAPP": 200
  }
}
```

---

## Smart Document Analyzer

### Document Analyzer Features

| Feature | Description | Config Flag |
|---------|-------------|-------------|
| **Multi-Format Support** | PDF, Word, Excel, Images, Scanned docs | Always enabled |
| **OCR** | Optical character recognition for scanned/image docs | `enableOCR` |
| **Named Entity Recognition** | Extract people, organizations, dates, etc. | `enableNER` |
| **Custom Field Extraction** | ML-based field extraction with confidence scores | Always enabled |
| **Compliance Flagging** | Check documents against compliance rules | `enableCompliance` |
| **Version Comparison** | Compare document versions | `enableVersionCompare` |
| **Document Classification** | Auto-classify document types | `enableAutoClassification` |
| **Batch Processing** | Process multiple documents in jobs | Always enabled |
| **External Integrations** | QuickBooks, Xero, Salesforce, etc. | Per-integration config |

### Document Formats

| Format | Enum Value | Description |
|--------|------------|-------------|
| PDF | `PDF` | Standard PDF documents |
| Word | `WORD` | .doc, .docx files |
| Excel | `EXCEL` | .xls, .xlsx files |
| Image | `IMAGE` | .jpg, .png, .gif files |
| Scanned | `SCANNED` | Scanned documents (requires OCR) |
| Text | `TEXT` | Plain text files |

### Document Categories

| Category | Common Document Types |
|----------|----------------------|
| `Invoice` | Invoices, bills, receipts |
| `Contract` | Agreements, contracts, terms |
| `Compliance` | Audit reports, certifications |
| `Healthcare` | Medical records, prescriptions |
| `Legal` | Legal filings, court documents |
| `Financial` | Financial statements, tax documents |
| `Real Estate` | Property deeds, leases |
| `Manufacturing` | Work orders, quality reports |

### Document Analyzer Database Schema

#### DocumentAnalyzerConfig

```prisma
model DocumentAnalyzerConfig {
  id                    Int       @id @default(autoincrement())
  clientId              Int       @unique

  // Feature toggles
  enableOCR             Boolean   @default(true)
  enableNER             Boolean   @default(true)
  enableCompliance      Boolean   @default(false)
  enableVersionCompare  Boolean   @default(false)
  enableAutoClassification Boolean @default(true)

  // Default extraction fields (JSON array)
  defaultExtractionFields Json?

  // Compliance rules (JSON array of rule definitions)
  complianceRules       Json?

  // Document retention (days, 0 = forever)
  retentionDays         Int       @default(0)

  isActive              Boolean   @default(true)
}
```

#### AnalyzedDocument

```prisma
model AnalyzedDocument {
  id                Int             @id @default(autoincrement())
  configId          Int

  // File info
  filename          String
  originalUrl       String
  mimeType          String
  sizeBytes         Int
  format            DocumentFormat

  // Processing status
  status            AnalysisStatus  @default(PENDING)
  analyzedAt        DateTime?
  analysisTimeMs    Int?
  errorMessage      String?

  // OCR results
  ocrText           String?
  ocrConfidence     Float?

  // Extraction results
  extractedFields   Json?           // { fieldName: { value, confidence, location } }
  namedEntities     Json?           // { entityType: [{ value, confidence }] }

  // Classification
  documentType      String?
  documentTypeConfidence Float?

  // Compliance
  complianceStatus  ComplianceLevel?
  complianceFlags   Json?           // Array of compliance issues

  // Audit trail
  auditLog          Json?           // Array of audit entries
}

enum AnalysisStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}

enum ComplianceLevel {
  COMPLIANT
  WARNING
  NON_COMPLIANT
  UNKNOWN
}
```

#### ExtractionTemplate

```prisma
model ExtractionTemplate {
  id              Int       @id @default(autoincrement())
  configId        Int

  name            String
  description     String?
  documentCategory String?

  // Field definitions (JSON)
  extractionRules Json      // Array of field extraction rules

  isBuiltIn       Boolean   @default(false)
  isActive        Boolean   @default(true)
}
```

### Document Analyzer API Reference

#### Configuration Endpoints

**Get Config**
```
GET /api/clients/:clientId/document-analyzer
```

**Create Config**
```
POST /api/clients/:clientId/document-analyzer
```

Request:
```json
{
  "enableOCR": true,
  "enableNER": true,
  "enableCompliance": true,
  "enableVersionCompare": false,
  "retentionDays": 365,
  "complianceRules": [
    {
      "id": "pii-check",
      "name": "PII Detection",
      "pattern": "\\b\\d{3}-\\d{2}-\\d{4}\\b",
      "severity": "WARNING",
      "message": "Document contains SSN-like pattern"
    }
  ]
}
```

#### Document Endpoints

**Upload Document**
```
POST /api/document-analyzer/:configId/documents
Content-Type: multipart/form-data

file: <binary>
documentType: Invoice
```

Response:
```json
{
  "id": 123,
  "filename": "invoice-2025-001.pdf",
  "status": "PENDING",
  "format": "PDF",
  "sizeBytes": 102400
}
```

**Get Document**
```
GET /api/document-analyzer/documents/:id
```

**List Documents**
```
GET /api/document-analyzer/:configId/documents?status=COMPLETED&documentType=Invoice&limit=50
```

**Analyze Document**
```
POST /api/document-analyzer/documents/:id/analyze
```

Request:
```json
{
  "extractionTemplateId": 5,
  "forceReanalyze": false
}
```

Response:
```json
{
  "success": true,
  "document": {
    "id": 123,
    "status": "COMPLETED",
    "analysisTimeMs": 2340,
    "documentType": "Invoice",
    "documentTypeConfidence": 0.95,
    "extractedFields": {
      "invoiceNumber": { "value": "INV-2025-001", "confidence": 0.98 },
      "invoiceDate": { "value": "2025-01-15", "confidence": 0.95 },
      "totalAmount": { "value": "1,250.00", "confidence": 0.92 },
      "vendorName": { "value": "Acme Corp", "confidence": 0.88 }
    },
    "namedEntities": {
      "ORGANIZATION": [
        { "value": "Acme Corp", "confidence": 0.92 },
        { "value": "Client Inc", "confidence": 0.88 }
      ],
      "DATE": [
        { "value": "January 15, 2025", "confidence": 0.95 }
      ],
      "MONEY": [
        { "value": "$1,250.00", "confidence": 0.92 }
      ]
    },
    "complianceStatus": "COMPLIANT",
    "complianceFlags": []
  }
}
```

**Compare Document Versions**
```
POST /api/document-analyzer/documents/compare
```

Request:
```json
{
  "documentId1": 123,
  "documentId2": 124
}
```

**Delete Document**
```
DELETE /api/document-analyzer/documents/:id
```

### Document Analyzer Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enableOCR` | boolean | true | Enable OCR for scanned/image documents |
| `enableNER` | boolean | true | Enable named entity recognition |
| `enableCompliance` | boolean | false | Enable compliance rule checking |
| `enableVersionCompare` | boolean | false | Enable document version comparison |
| `enableAutoClassification` | boolean | true | Auto-classify document types |
| `defaultExtractionFields` | JSON | null | Default fields to extract |
| `complianceRules` | JSON | null | Custom compliance rules |
| `retentionDays` | number | 0 | Document retention period (0 = forever) |

### Extraction Templates

Templates define which fields to extract from specific document types.

#### Template API

```
GET    /api/document-analyzer/:configId/templates           # List templates
GET    /api/document-analyzer/templates/built-in            # List built-in templates
POST   /api/document-analyzer/:configId/templates           # Create template
PATCH  /api/document-analyzer/templates/:id                 # Update template
DELETE /api/document-analyzer/templates/:id                 # Delete template
```

#### Template Structure

```json
{
  "name": "Standard Invoice",
  "description": "Extract fields from standard invoices",
  "documentCategory": "Invoice",
  "extractionRules": [
    {
      "fieldName": "invoiceNumber",
      "fieldType": "string",
      "patterns": ["Invoice\\s*#?:?\\s*([A-Z0-9-]+)", "INV-\\d+"],
      "required": true,
      "location": "header"
    },
    {
      "fieldName": "invoiceDate",
      "fieldType": "date",
      "patterns": ["Date:?\\s*(\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4})"],
      "required": true
    },
    {
      "fieldName": "totalAmount",
      "fieldType": "currency",
      "patterns": ["Total:?\\s*\\$?([\\d,]+\\.\\d{2})"],
      "required": true,
      "location": "footer"
    },
    {
      "fieldName": "vendorName",
      "fieldType": "string",
      "useNER": true,
      "entityType": "ORGANIZATION"
    }
  ]
}
```

#### Built-in Templates

The system includes pre-built templates for common document types:

| Template | Category | Fields Extracted |
|----------|----------|------------------|
| Standard Invoice | Invoice | invoiceNumber, date, total, vendor, lineItems |
| Purchase Order | Invoice | poNumber, date, vendor, items, total |
| Service Contract | Contract | parties, effectiveDate, term, value, signatures |
| Employment Agreement | Contract | employee, employer, startDate, salary, title |
| HIPAA Release | Healthcare | patientName, dateOfBirth, provider, releaseDate |
| W-9 Form | Financial | name, businessName, taxId, address |
| Real Estate Lease | Real Estate | lessor, lessee, property, term, rent |

### Compliance Checking

The document analyzer can check documents against configurable compliance rules.

#### Compliance Rule Structure

```json
{
  "id": "hipaa-phi",
  "name": "HIPAA PHI Check",
  "category": "HIPAA",
  "severity": "NON_COMPLIANT",
  "pattern": "\\b\\d{3}-\\d{2}-\\d{4}\\b",
  "message": "Document contains unredacted SSN",
  "remediation": "Redact all SSN values before processing"
}
```

#### Industry-Specific Rule Sets

| Ruleset | Description | Default Rules |
|---------|-------------|---------------|
| HIPAA | Healthcare privacy | PHI detection, SSN check, medical record numbers |
| SOX | Financial compliance | Unauthorized modification detection, signature verification |
| GDPR | EU data protection | Personal data detection, consent verification |
| PCI | Payment card industry | Credit card number detection, CVV patterns |

#### Compliance API

```
POST /api/document-analyzer/documents/:id/compliance-check
```

Request:
```json
{
  "rulesets": ["HIPAA", "PCI"]
}
```

Response:
```json
{
  "overallStatus": "WARNING",
  "riskScore": 0.35,
  "flags": [
    {
      "ruleId": "hipaa-phi",
      "status": "WARNING",
      "message": "Document may contain PHI",
      "location": "Page 2, paragraph 3",
      "confidence": 0.75
    }
  ]
}
```

### Document Integrations

The document analyzer supports syncing with external systems.

#### Supported Integrations

| Integration | Type | Capabilities |
|-------------|------|--------------|
| QuickBooks | Accounting | Sync invoices, auto-categorize expenses |
| Xero | Accounting | Sync invoices, bills, receipts |
| Salesforce | CRM | Attach documents to records, update fields |
| DocuSign | E-Signature | Import signed documents |
| Google Drive | Storage | Import/export documents |
| SharePoint | Storage | Import/export documents |
| Dropbox | Storage | Import/export documents |
| Slack | Notifications | Send analysis results |
| Webhooks | Custom | HTTP callbacks on completion |

#### Integration API

```
GET    /api/document-analyzer/:configId/integrations        # List integrations
POST   /api/document-analyzer/:configId/integrations        # Create integration
PATCH  /api/document-analyzer/integrations/:id              # Update integration
DELETE /api/document-analyzer/integrations/:id              # Delete integration
POST   /api/document-analyzer/integrations/:id/test         # Test connection
POST   /api/document-analyzer/integrations/:id/sync         # Trigger sync
```

### Document Analyzer Analytics

```
GET /api/document-analyzer/:configId/analytics
```

Response:
```json
{
  "dashboard": {
    "totalDocuments": 1250,
    "processedThisMonth": 180,
    "avgProcessingTime": 2400,
    "successRate": 0.96
  },
  "categoryBreakdown": {
    "Invoice": 450,
    "Contract": 320,
    "Compliance": 180,
    "Healthcare": 150,
    "Other": 150
  },
  "complianceStats": {
    "compliant": 980,
    "warning": 200,
    "nonCompliant": 70
  },
  "roi": {
    "documentsProcessed": 1250,
    "estimatedTimeSavedHours": 625,
    "estimatedCostSavings": 31250
  }
}
```

---

## Widget Package

The `@pmo/chatbot-widget` package provides React components for embedding the chatbot.

### Widget Installation

```bash
npm install @pmo/chatbot-widget
# or
yarn add @pmo/chatbot-widget
```

### Widget Components

#### ChatWidget

Floating chat bubble that expands to a chat window:

```tsx
import { ChatWidget } from '@pmo/chatbot-widget';

function App() {
  return (
    <ChatWidget
      apiUrl="https://api.example.com/api"
      configId={123}
      position="bottom-right"
      primaryColor="#3B82F6"
      textColor="#FFFFFF"
      title="Support Chat"
      subtitle="We typically reply in minutes"
      avatarUrl="https://example.com/bot-avatar.png"
      theme="light"
      defaultOpen={false}
      zIndex={9999}
      onOpen={() => console.log('Chat opened')}
      onClose={() => console.log('Chat closed')}
      onMessageSent={(msg) => console.log('Sent:', msg)}
      onMessageReceived={(msg) => console.log('Received:', msg)}
    />
  );
}
```

#### ChatWindow

Embedded chat window (no floating bubble):

```tsx
import { ChatWindow } from '@pmo/chatbot-widget';

function SupportPage() {
  return (
    <div style={{ height: '600px' }}>
      <ChatWindow
        apiUrl="https://api.example.com/api"
        configId={123}
        width="100%"
        height="100%"
        theme="light"
        onMessageSent={(msg) => console.log('Sent:', msg)}
        onMessageReceived={(msg) => console.log('Received:', msg)}
      />
    </div>
  );
}
```

### Widget Hooks

#### useChatbot

Low-level hook for custom chat implementations:

```tsx
import { useChatbot } from '@pmo/chatbot-widget';

function CustomChat() {
  const {
    sessionId,
    messages,
    isLoading,
    error,
    sendMessage,
    startConversation,
    endConversation,
    suggestedActions,
  } = useChatbot({
    apiUrl: 'https://api.example.com/api',
    configId: 123,
    autoStart: true,
    customerInfo: {
      email: 'user@example.com',
      name: 'John Doe',
    },
  });

  const handleSend = async (content: string) => {
    await sendMessage(content);
  };

  return (
    <div>
      {messages.map((msg) => (
        <div key={msg.id} className={msg.sender === 'CUSTOMER' ? 'sent' : 'received'}>
          {msg.content}
        </div>
      ))}
      {suggestedActions.map((action) => (
        <button key={action.label} onClick={() => handleSend(action.label)}>
          {action.label}
        </button>
      ))}
    </div>
  );
}
```

### Widget Types

```typescript
interface ChatbotConfig {
  apiUrl: string;
  configId: number;
}

interface WidgetConfig extends ChatbotConfig {
  position?: 'bottom-right' | 'bottom-left';
  primaryColor?: string;
  textColor?: string;
  title?: string;
  subtitle?: string;
  avatarUrl?: string;
  theme?: 'light' | 'dark';
  defaultOpen?: boolean;
  zIndex?: number;
  onOpen?: () => void;
  onClose?: () => void;
  onMessageSent?: (message: string) => void;
  onMessageReceived?: (message: ChatMessage) => void;
  className?: string;
}

interface ChatMessage {
  id: number;
  sender: 'CUSTOMER' | 'BOT' | 'AGENT';
  content: string;
  createdAt: string;
  detectedIntent?: string;
  intentConfidence?: number;
  sentiment?: number;
  suggestedActions?: SuggestedAction[];
}

interface SuggestedAction {
  label: string;
  action: string;
  payload?: unknown;
}

type ConversationStatus =
  | 'ACTIVE'
  | 'WAITING_CUSTOMER'
  | 'WAITING_AGENT'
  | 'ESCALATED'
  | 'RESOLVED'
  | 'CLOSED';
```

---

## AI Integration & Production Setup

### OpenAI Configuration

Both tools use OpenAI's GPT-4o-mini model for AI capabilities. Set the API key in your environment:

```bash
# pmo/apps/api/.env
OPENAI_API_KEY=sk-your-api-key-here
```

#### AI-Powered Features

| Feature | Model | API Used |
|---------|-------|----------|
| Intent Classification | GPT-4o-mini | Chat Completions |
| Sentiment Analysis | GPT-4o-mini | Chat Completions |
| Response Generation | GPT-4o-mini | Chat Completions |
| OCR (Document Analyzer) | GPT-4o Vision | Chat Completions w/ images |
| Field Extraction | GPT-4o-mini | Chat Completions |
| Document Classification | GPT-4o-mini | Chat Completions |

### Fallback Behavior

When `OPENAI_API_KEY` is not configured, both tools gracefully fall back to rule-based implementations:

#### Chatbot Fallbacks

| Feature | AI Behavior | Fallback Behavior |
|---------|-------------|-------------------|
| Intent Classification | GPT classifies with confidence | Rule-based keyword matching |
| Sentiment Analysis | GPT returns -1 to 1 score | Simple keyword sentiment (positive/negative/neutral) |
| Response Generation | Dynamic GPT responses | Template-based responses per intent |

**Rule-based intent classification** (`chatbot.service.ts:446-494`):
```typescript
function classifyIntentRuleBased(message: string): IntentResult {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('order') &&
      (lowerMessage.includes('status') || lowerMessage.includes('track'))) {
    return { intent: 'ORDER_STATUS', confidence: 0.8 };
  }
  // ... more rules
  return { intent: 'GENERAL', confidence: 0.5 };
}
```

#### Document Analyzer Fallbacks

| Feature | AI Behavior | Fallback Behavior |
|---------|-------------|-------------------|
| OCR | GPT-4o Vision extracts text | Returns empty text (OCR unavailable) |
| Field Extraction | GPT extracts with confidence | Pattern-based regex extraction |
| Classification | GPT classifies document type | Pattern/keyword-based classification |

**OCR fallback** (`document-analyzer.service.ts:344-346`):
```typescript
// Fallback: return empty text
return { text: '', confidence: 0 };
```

### Production Checklist

Before deploying for a new customer:

#### Environment Variables

```bash
# Required for AI features
OPENAI_API_KEY=sk-xxx

# Required for multi-channel chatbot
TWILIO_ACCOUNT_SID=ACxxx        # For SMS/WhatsApp
TWILIO_AUTH_TOKEN=xxx
SLACK_BOT_TOKEN=xoxb-xxx        # For Slack integration

# Database
DATABASE_URL=postgresql://...

# Security
JWT_SECRET=strong-random-secret
```

#### Module Enablement

Ensure the modules are enabled in `PMO_MODULES`:

```bash
PMO_MODULES=chatbot,documentAnalyzer,clients,projects
```

Or via the Admin UI at `/admin/modules`.

#### CORS Configuration

Add customer domains to the CORS whitelist in `app.ts`:

```typescript
// Widget needs to be accessible from customer domains
const widgetOrigins = [
  'https://customer-site.com',
  'https://www.customer-site.com',
];
```

Also configure `widgetAllowedDomains` in the ChatbotConfig for domain-level security.

#### Webhook Security

When setting up customer webhooks:
1. Always use HTTPS endpoints
2. Implement signature verification on the customer's side
3. Set appropriate timeout values (default: 30s)
4. Configure retry logic (default: 3 retries)

#### Data Retention

For compliance-sensitive customers:
1. Configure `retentionDays` on DocumentAnalyzerConfig
2. Enable `enableCompliance` with appropriate rule sets
3. Review audit logs periodically

---

## Troubleshooting

### Common Issues

#### Chatbot Widget Not Loading

1. Check CORS configuration includes the customer domain
2. Verify `widgetAllowedDomains` is set correctly
3. Check browser console for script errors
4. Ensure the configId exists and is active

#### Intent Classification Not Working

1. Check `OPENAI_API_KEY` is configured
2. Review API logs for OpenAI errors
3. Verify knowledge base has relevant entries for FAQ matching
4. Check rule-based fallback is working (lower confidence scores)

#### Webhooks Not Delivering

1. Check webhook URL is HTTPS and accessible
2. Review delivery logs: `GET /api/chatbot/webhooks/:id/logs`
3. Verify webhook secret matches on receiving end
4. Test webhook: `POST /api/chatbot/webhooks/:id/test`

#### Document Analysis Failing

1. Check document format is supported
2. Verify file URL is accessible
3. For scanned documents, ensure `enableOCR` is true
4. Check `OPENAI_API_KEY` for vision-based OCR
5. Review error message in document status

#### Channel Messages Not Processing

1. Verify channel credentials are correct
2. Test channel: `POST /api/chatbot/channels/:channelId/test`
3. Check webhook endpoint is accessible from external service
4. Review channel adapter logs for parsing errors

### Debug Logging

Enable debug logging for troubleshooting:

```bash
DEBUG=chatbot:*,document-analyzer:* npm run dev --workspace pmo-api
```

### Database Queries

Useful queries for debugging:

```sql
-- Recent conversations with issues
SELECT * FROM "ChatConversation"
WHERE status = 'ESCALATED'
ORDER BY "createdAt" DESC LIMIT 10;

-- Failed document analyses
SELECT * FROM "AnalyzedDocument"
WHERE status = 'FAILED'
ORDER BY "createdAt" DESC LIMIT 10;

-- Webhook delivery failures
SELECT w.name, l.* FROM "WebhookDeliveryLog" l
JOIN "WebhookConfig" w ON l."webhookId" = w.id
WHERE l."statusCode" IS NULL OR l."statusCode" >= 400
ORDER BY l."createdAt" DESC LIMIT 20;
```

---

## File Reference

| Component | File Path |
|-----------|-----------|
| Chatbot Router | `pmo/apps/api/src/modules/chatbot/chatbot.router.ts` |
| Chatbot Service | `pmo/apps/api/src/modules/chatbot/chatbot.service.ts` |
| Widget Router | `pmo/apps/api/src/modules/chatbot/widget/widget.router.ts` |
| Widget Template | `pmo/apps/api/src/modules/chatbot/widget/widget.template.ts` |
| Webhook Service | `pmo/apps/api/src/modules/chatbot/webhooks/webhook.service.ts` |
| Channel Manager | `pmo/apps/api/src/modules/chatbot/channels/channel-manager.ts` |
| Twilio Adapter | `pmo/apps/api/src/modules/chatbot/channels/adapters/twilio.adapter.ts` |
| Slack Adapter | `pmo/apps/api/src/modules/chatbot/channels/adapters/slack.adapter.ts` |
| Doc Analyzer Router | `pmo/apps/api/src/modules/document-analyzer/document-analyzer.router.ts` |
| Doc Analyzer Service | `pmo/apps/api/src/modules/document-analyzer/document-analyzer.service.ts` |
| Classification Service | `pmo/apps/api/src/modules/document-analyzer/services/classification.service.ts` |
| Compliance Service | `pmo/apps/api/src/modules/document-analyzer/services/compliance.service.ts` |
| Analytics Service | `pmo/apps/api/src/modules/document-analyzer/services/analytics.service.ts` |
| Built-in Templates | `pmo/apps/api/src/modules/document-analyzer/templates/built-in-templates.ts` |
| Chatbot Page (UI) | `pmo/apps/web/src/pages/ai-tools/ChatbotPage.tsx` |
| Doc Analyzer Page (UI) | `pmo/apps/web/src/pages/ai-tools/DocumentAnalyzerPage.tsx` |
| Widget Package | `pmo/packages/chatbot-widget/` |
| Database Schema | `pmo/prisma/schema.prisma` |
