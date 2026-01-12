# Customer Success ML - Architecture

System design and data flow documentation for the ML-powered Customer Success predictions.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           API Layer                                      │
│  customer-success-ml.router.ts                                          │
│  - Authentication & Authorization                                        │
│  - Request validation (Zod schemas)                                      │
│  - Response formatting                                                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        Service Layer                                     │
├─────────────────┬─────────────────┬─────────────────┬───────────────────┤
│ cs-ml-prediction│ churn-prediction│ ml-health-      │ intelligent-cta   │
│ .service.ts     │ .service.ts     │ insights.service│ .service.ts       │
│                 │                 │ .ts             │                   │
│ - Context       │ - LLM churn     │ - Health        │ - CTA generation  │
│   gathering     │   analysis      │   analysis      │ - Cooldown        │
│ - Prediction    │ - Rule-based    │ - Anomaly       │   management      │
│   storage       │   fallback      │   detection     │ - Playbook        │
│ - Validation    │ - Risk factors  │ - Trend         │   matching        │
│                 │                 │   prediction    │                   │
└─────────────────┴─────────────────┴─────────────────┴───────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      External Services                                   │
├─────────────────────────────────┬───────────────────────────────────────┤
│        OpenAI API               │           Prisma ORM                   │
│  (via ai-client.ts wrapper)     │       (PostgreSQL/SQLite)             │
│                                 │                                        │
│  - GPT-4 structured output      │  - AccountMLPrediction table          │
│  - JSON response parsing        │  - Account, CTA, Activity data        │
│  - Usage tracking               │  - Health score history               │
└─────────────────────────────────┴───────────────────────────────────────┘
```

## Data Flow

### Prediction Generation Flow

```
┌──────────────┐     ┌─────────────────────┐     ┌──────────────┐
│   Account    │────▶│  Context Gatherer   │────▶│  LLM Client  │
│  (Database)  │     │                     │     │  (OpenAI)    │
│              │     │  Collects:          │     │              │
│  - Profile   │     │  - Health history   │     │  - Sends     │
│  - Health    │     │  - Activities       │     │    prompt    │
│  - CTAs      │     │  - Open CTAs        │     │  - Parses    │
│  - Opps      │     │  - Opportunities    │     │    response  │
└──────────────┘     └─────────────────────┘     └──────────────┘
                                                        │
                                                        ▼
┌──────────────┐     ┌─────────────────────┐     ┌──────────────┐
│ Auto-Gen CTA │◀────│ Prediction Service  │◀────│  ML Response │
│  (Optional)  │     │                     │     │    Parser    │
│              │     │  - Stores result    │     │              │
│  - Priority  │     │  - Links to account │     │  - Validates │
│  - Playbook  │     │  - Tracks metadata  │     │    JSON      │
│  - Due date  │     │                     │     │  - Extracts  │
└──────────────┘     └─────────────────────┘     └──────────────┘
```

### Request Processing Sequence

```
1. API Request
   │
   ├─▶ Authentication Check (requireAuth middleware)
   │   └─▶ JWT validation from cookie/header
   │
   ├─▶ Tenant Resolution (tenantMiddleware)
   │   └─▶ X-Tenant-ID header → tenantContext
   │
   ├─▶ Input Validation (Zod schemas)
   │   └─▶ accountIdParamSchema, generatePredictionSchema
   │
   ├─▶ ML Availability Check
   │   └─▶ isAIAvailable() → OpenAI key configured?
   │
   ├─▶ Cache Check (optional)
   │   └─▶ getExistingChurnPrediction()
   │
   ├─▶ Context Gathering
   │   └─▶ Parallel database queries
   │
   ├─▶ LLM Prediction
   │   └─▶ jsonPrompt() with structured output
   │
   ├─▶ Result Storage
   │   └─▶ storePrediction() → AccountMLPrediction
   │
   └─▶ Response
       └─▶ JSON with prediction data
```

## Module Structure

```
apps/api/src/modules/customer-success-ml/
├── index.ts                              # Module exports
├── customer-success-ml.router.ts         # Express router
│
├── types/
│   ├── index.ts                          # Type exports
│   ├── ml-prediction.types.ts            # Core ML types
│   └── churn-prediction.types.ts         # Churn-specific types
│
├── services/
│   ├── index.ts                          # Service exports
│   ├── cs-ml-prediction.service.ts       # Core orchestration
│   ├── churn-prediction.service.ts       # Churn analysis
│   ├── ml-health-insights.service.ts     # Health insights
│   └── intelligent-cta.service.ts        # CTA generation
│
└── prompts/
    └── cs-ml-prompts.ts                  # LLM prompts
```

## Database Schema

### AccountMLPrediction Table

```sql
CREATE TABLE "AccountMLPrediction" (
    "id" SERIAL PRIMARY KEY,
    "tenantId" VARCHAR NOT NULL,
    "accountId" INTEGER NOT NULL REFERENCES "Account"("id"),

    -- Prediction details
    "predictionType" "MLPredictionType" NOT NULL,
    "probability" FLOAT NOT NULL,
    "confidence" FLOAT NOT NULL,
    "predictionWindow" INTEGER DEFAULT 90,

    -- Analysis results (JSON)
    "riskFactors" JSONB,
    "explanation" TEXT,
    "recommendations" JSONB,

    -- Lifecycle
    "status" "MLPredictionStatus" DEFAULT 'ACTIVE',
    "predictedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP NOT NULL,
    "validatedAt" TIMESTAMP,

    -- Validation
    "actualOutcome" BOOLEAN,
    "wasAccurate" BOOLEAN,

    -- LLM tracking
    "llmModel" VARCHAR,
    "llmTokensUsed" INTEGER,
    "llmCost" FLOAT,

    -- CTA link
    "generatedCtaId" INTEGER REFERENCES "CTA"("id"),

    -- Indexes
    INDEX ON ("tenantId"),
    INDEX ON ("accountId"),
    INDEX ON ("predictionType", "status"),
    INDEX ON ("validUntil")
);
```

### Entity Relationships

```
Account (1) ──────────────────── (*) AccountMLPrediction
    │                                      │
    │                                      │
    ├── AccountHealthScoreHistory          │
    │   (used for context gathering)       │
    │                                      │
    ├── CRMActivity                        │
    │   (engagement signals)               │
    │                                      │
    ├── CTA                                │
    │   (linked via generatedCtaId) ◀──────┘
    │
    └── Opportunity
        (pipeline context)
```

## LLM Integration

### Prompt Engineering

The system uses structured prompts with clear instructions for JSON output:

```typescript
// System prompt establishes the AI's role and output format
const CS_ML_SYSTEM_PROMPT = `
You are an expert Customer Success analyst...
Respond ONLY with valid JSON matching the specified structure.
`;

// User prompt provides context and analysis request
const buildChurnPredictionPrompt = (context) => `
Analyze this account for churn risk:

## Account: ${context.account.name}
Current Health: ${context.account.healthScore}

## Health History (last 90 days)
${formatHealthHistory(context.healthHistory)}

## Recent Activities
${formatActivities(context.recentActivities)}

...

Provide your analysis as JSON with this structure:
{
  "churnProbability": 0.0-1.0,
  "confidence": 0.0-1.0,
  "riskCategory": "critical|high|medium|low",
  ...
}
`;
```

### Fallback Strategy

When LLM is unavailable, the system uses rule-based calculation:

```
┌────────────────┐     ┌───────────────┐     ┌─────────────────┐
│  predictChurn  │────▶│ LLM Available?│────▶│ LLM Prediction  │
│                │     └───────────────┘     │ (GPT-4)         │
│                │            │ No           └─────────────────┘
│                │            ▼
│                │     ┌───────────────────┐
│                │     │ Rule-Based        │
│                │     │ Fallback          │
│                │     │                   │
│                │     │ - Health score    │
│                │     │   weighting       │
│                │     │ - Activity        │
│                │     │   recency         │
│                │     │ - CTA status      │
│                │     └───────────────────┘
└────────────────┘
```

### AI Usage Tracking

All LLM calls are tracked via the AI monitoring system:

```typescript
// Registration in AI_TOOLS
'customer-success-ml': {
  id: 'customer-success-ml',
  name: 'Customer Success ML',
  operations: ['churn-prediction', 'health-analysis', 'cta-generation'],
}

// Tracked metrics per call
{
  tenantId: string,
  toolId: 'customer-success-ml',
  operation: 'churn-prediction',
  model: 'gpt-4',
  promptTokens: number,
  completionTokens: number,
  latencyMs: number,
  success: boolean,
  estimatedCost: number
}
```

## Caching Strategy

### Prediction Caching

Predictions are cached in the database with validity periods:

- Default validity: 30 days
- Force refresh available via API option
- Expired predictions retained for accuracy validation

### Cache Flow

```
1. Check for existing valid prediction
   │
   ├─▶ Found & Valid → Return cached result
   │
   └─▶ Not found or expired
       │
       ├─▶ Generate new prediction
       │
       └─▶ Store with validity period
```

## Error Handling

### Error Categories

| Category       | Handling                           |
| -------------- | ---------------------------------- |
| Authentication | 401 response, clear message        |
| Validation     | 400 response with field errors     |
| Not Found      | 404 response                       |
| LLM Errors     | Fallback to rule-based, log error  |
| Rate Limits    | 429 response (future)              |
| Internal       | 500 response, logged for debugging |

### Graceful Degradation

```
LLM Call Failed
    │
    ├─▶ Log error with context
    │
    ├─▶ Switch to rule-based fallback
    │
    ├─▶ Mark confidence as "low"
    │
    └─▶ Return result with fallback indicator
```

## Security Considerations

### Data Privacy

- Account data stays within tenant boundaries
- LLM prompts contain only necessary context
- No PII sent to OpenAI (names anonymized in prompts)
- Predictions stored per-tenant with isolation

### Access Control

- All endpoints require authentication
- Tenant middleware enforces data isolation
- User must have account access permissions

## Scalability

### Current Design

- Synchronous prediction generation
- Database-backed caching
- Single-tenant queries

### Future Enhancements

- Job queue for batch predictions
- Redis caching layer
- Parallel LLM calls for portfolio analysis
- Prediction pre-computation for high-value accounts

## Monitoring

### Key Metrics

| Metric                | Description                      |
| --------------------- | -------------------------------- |
| Prediction latency    | Time from request to response    |
| LLM call success rate | % of successful OpenAI calls     |
| Fallback rate         | % using rule-based fallback      |
| Prediction accuracy   | Validated predictions accuracy   |
| CTA completion rate   | % of ML-generated CTAs completed |

### Logging

```typescript
logger.info('Generated CTA from ML prediction', {
  accountId,
  ctaId: cta.id,
  predictionType: prediction.predictionType,
  probability: prediction.probability,
});

logger.error('ML prediction failed', {
  accountId,
  error: error.message,
});
```
