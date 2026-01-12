# Customer Success ML - Configuration

Feature flags, environment variables, and configuration options for the ML predictions module.

## Environment Variables

### Required

| Variable         | Description                  | Example  |
| ---------------- | ---------------------------- | -------- |
| `OPENAI_API_KEY` | OpenAI API key for LLM calls | `sk-...` |

### Optional

| Variable                   | Default | Description                           |
| -------------------------- | ------- | ------------------------------------- |
| `ML_PREDICTION_TIMEOUT_MS` | `30000` | LLM call timeout in milliseconds      |
| `ML_MAX_RETRIES`           | `2`     | Number of LLM call retries on failure |
| `ML_FALLBACK_ENABLED`      | `true`  | Enable rule-based fallback            |

## Module Configuration

### Core ML Settings

Located in `cs-ml-prediction.service.ts`:

```typescript
const ML_CONFIG = {
  // Prediction window
  defaultPredictionWindowDays: 90, // Default forecast period

  // Caching
  predictionValidityDays: 30, // How long predictions stay valid

  // Rate limiting
  maxPredictionsPerDay: 100, // Per-tenant daily limit

  // Quality thresholds
  minConfidenceThreshold: 0.5, // Minimum for CTA generation

  // CTA generation
  ctaCooldownDays: 7, // Days between auto-CTAs

  // Risk thresholds
  churnRiskThresholds: {
    critical: 0.8, // >= 80% = critical
    high: 0.6, // >= 60% = high
    medium: 0.3, // >= 30% = medium
    low: 0, // < 30% = low
  },
};
```

### CTA Configuration

Located in `intelligent-cta.service.ts`:

```typescript
const CTA_CONFIG = {
  // Cooldown period
  cooldownDays: 7, // Min days between auto-CTAs

  // Quality gate
  minConfidenceThreshold: 0.5, // Don't generate below this

  // Priority mapping
  churnPriorityMapping: {
    critical: 'CRITICAL',
    high: 'HIGH',
    medium: 'MEDIUM',
    low: 'LOW',
  },
};
```

### Health Insights Configuration

Located in `ml-health-insights.service.ts`:

```typescript
const HEALTH_CONFIG = {
  // Trend analysis
  trendWindowDays: 30, // Days for trend calculation
  significantChangeThreshold: 0.1, // 10% change is significant

  // Anomaly detection
  anomalyStdDevThreshold: 2.0, // Standard deviations for anomaly

  // Score thresholds
  healthScoreThresholds: {
    excellent: 80,
    good: 60,
    fair: 40,
    poor: 0,
  },
};
```

## Feature Flags

### Database-Backed Flags

The module integrates with the platform's feature flag system:

```typescript
// Feature flag record in TenantModuleConfig
{
  tenantId: 'tenant-abc',
  moduleId: 'customer-success-ml',
  enabled: true,
  config: {
    maxPredictionsPerDay: 200,        // Override default
    autoCtaGeneration: true,           // Enable auto-CTA
    batchPredictions: false,           // Disable batch
  }
}
```

### Environment-Based Flags

For deployment-wide settings:

```env
# Enable/disable ML module entirely
ENABLED_MODULES=dashboard,tasks,clients,projects,customer-success-ml

# Frontend visibility
VITE_ENABLED_MODULES=dashboard,tasks,clients,projects,customer-success-ml
```

## LLM Model Configuration

### Model Selection

Current implementation uses GPT-4 for predictions:

```typescript
// In ai-client.ts
const DEFAULT_MODEL = 'gpt-4';

// For cost optimization, can switch to:
const COST_OPTIMIZED_MODEL = 'gpt-3.5-turbo';
```

### Token Limits

| Model         | Max Tokens | Recommended Context |
| ------------- | ---------- | ------------------- |
| gpt-4         | 8,192      | ~6,000 tokens       |
| gpt-4-32k     | 32,768     | ~28,000 tokens      |
| gpt-3.5-turbo | 4,096      | ~3,000 tokens       |

### Cost Estimates

| Model         | Input Cost | Output Cost | Typical Prediction |
| ------------- | ---------- | ----------- | ------------------ |
| gpt-4         | $0.03/1K   | $0.06/1K    | ~$0.025            |
| gpt-3.5-turbo | $0.0015/1K | $0.002/1K   | ~$0.003            |

## Rate Limiting

### Per-Tenant Limits

```typescript
const RATE_LIMITS = {
  // Predictions per day
  predictionsPerDay: 100,

  // Batch operations
  batchOpsPerDay: 5,

  // CTA generation
  ctaGenerationPerDay: 50,

  // Concurrent requests
  maxConcurrentRequests: 3,
};
```

### Implementation

Rate limiting is handled at the service layer:

```typescript
async function checkRateLimit(
  tenantId: string,
  operation: string,
): Promise<boolean> {
  const key = `ratelimit:${tenantId}:${operation}`;
  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, 86400); // 24 hours
  }

  return count <= RATE_LIMITS[operation];
}
```

## Caching Configuration

### Prediction Cache

```typescript
const CACHE_CONFIG = {
  // How long predictions are considered fresh
  predictionTTL: 30 * 24 * 60 * 60, // 30 days in seconds

  // When to suggest refresh
  suggestRefreshAfter: 7 * 24 * 60 * 60, // 7 days

  // Maximum cached predictions per account
  maxCachedPerAccount: 10,
};
```

### Cache Keys

```
ml:prediction:{tenantId}:{accountId}:{predictionType}
ml:accuracy:{tenantId}:{predictionType}
ml:ratelimit:{tenantId}:{operation}
```

## Validation Schemas

### Prediction Request

```typescript
// In validation/crm/ml-prediction.schema.ts
export const generatePredictionSchema = z.object({
  predictionType: z.enum([
    'CHURN',
    'HEALTH_TREND',
    'EXPANSION',
    'ENGAGEMENT_DECLINE',
  ]),
  options: z
    .object({
      forceRefresh: z.boolean().optional().default(false),
      skipCTAGeneration: z.boolean().optional().default(false),
      predictionWindowDays: z.number().min(30).max(365).optional(),
    })
    .optional(),
});
```

### Batch Request

```typescript
export const batchPredictSchema = z.object({
  predictionType: z.enum(['CHURN', 'HEALTH_TREND']),
  maxAccounts: z.number().min(1).max(100).optional().default(50),
  priorityFilter: z.enum(['high_value', 'at_risk', 'all']).optional(),
});
```

## Customization Options

### Per-Tenant Overrides

Tenants can customize through their module config:

```json
{
  "moduleId": "customer-success-ml",
  "config": {
    "churnRiskThresholds": {
      "critical": 0.85,
      "high": 0.7,
      "medium": 0.4,
      "low": 0
    },
    "ctaCooldownDays": 14,
    "autoCtaForRiskLevels": ["critical", "high"],
    "defaultPredictionWindow": 60
  }
}
```

### Prompt Customization

Custom prompts can be configured per tenant (future feature):

```json
{
  "customPrompts": {
    "churnAnalysis": {
      "systemPrompt": "You are a Customer Success analyst for {industry}...",
      "emphasize": ["contract_value", "product_usage"],
      "deemphasize": ["support_tickets"]
    }
  }
}
```

## Monitoring Configuration

### Logging Levels

```env
# Set log level for ML module
LOG_LEVEL=info

# Enable detailed LLM logging
ML_DEBUG_LOGGING=true
```

### Metrics Export

```typescript
const METRICS_CONFIG = {
  // Export interval
  exportIntervalMs: 60000,

  // Metrics to track
  enabledMetrics: [
    'prediction_latency',
    'llm_success_rate',
    'fallback_rate',
    'accuracy_score',
    'cta_completion_rate',
  ],

  // Export destination
  metricsEndpoint: process.env.METRICS_ENDPOINT,
};
```

## Security Configuration

### Data Anonymization

```typescript
const ANONYMIZATION_CONFIG = {
  // Fields to anonymize in LLM prompts
  anonymizeFields: ['contactName', 'contactEmail', 'companyName'],

  // Replacement strategy
  strategy: 'placeholder', // or 'hash'

  // Enable for sensitive industries
  strictMode: process.env.ML_STRICT_ANONYMIZATION === 'true',
};
```

### API Key Rotation

```typescript
const KEY_ROTATION_CONFIG = {
  // Primary key
  primaryKey: process.env.OPENAI_API_KEY,

  // Fallback key (optional)
  fallbackKey: process.env.OPENAI_API_KEY_FALLBACK,

  // Rotation schedule
  rotationCheckIntervalMs: 3600000, // 1 hour
};
```
