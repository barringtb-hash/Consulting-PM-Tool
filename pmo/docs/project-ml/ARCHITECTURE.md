# Project ML Architecture

Technical architecture documentation for the Project ML module.

## Overview

The Project ML module provides machine learning capabilities for project management through a hybrid architecture that combines LLM-powered analysis with rule-based fallback.

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   ProjectMLTab                           │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │   │
│  │  │ Success  │ │   Risk   │ │ Timeline │ │ Resource │   │   │
│  │  │   Card   │ │   Card   │ │   Card   │ │   Card   │   │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │   │
│  │  ┌─────────────────────────────────────────────────┐   │   │
│  │  │              Recommendations Panel               │   │   │
│  │  └─────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Backend                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    project-ml.router.ts                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                   │
│         ┌────────────────────┼────────────────────┐             │
│         ▼                    ▼                    ▼             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Success    │    │    Risk      │    │  Timeline    │      │
│  │  Prediction  │    │  Forecast    │    │  Prediction  │      │
│  │   Service    │    │   Service    │    │   Service    │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                    │                    │             │
│         └────────────────────┼────────────────────┘             │
│                              ▼                                   │
│                    ┌──────────────────┐                         │
│                    │  Context Service │                         │
│                    │  (Data Gathering)│                         │
│                    └──────────────────┘                         │
│                              │                                   │
│              ┌───────────────┼───────────────┐                  │
│              ▼                               ▼                  │
│       ┌──────────────┐              ┌──────────────┐           │
│       │  LLM Client  │              │  Rule-Based  │           │
│       │  (OpenAI)    │              │   Engine     │           │
│       └──────────────┘              └──────────────┘           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Database                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                ProjectMLPrediction Table                   │  │
│  │  - id, tenantId, projectId                                 │  │
│  │  - predictionType, status                                  │  │
│  │  - probability, confidence                                 │  │
│  │  - riskFactors, recommendations (JSON)                     │  │
│  │  - predictedAt, validUntil, wasAccurate                    │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
pmo/apps/api/src/modules/project-ml/
├── index.ts                         # Module exports
├── project-ml.router.ts             # Express routes
├── types/
│   ├── index.ts                     # Type exports
│   └── prediction.types.ts          # TypeScript interfaces
├── services/
│   ├── index.ts                     # Service exports
│   ├── project-ml-context.service.ts    # Data gathering
│   ├── project-ml-prediction.service.ts # Storage/retrieval
│   ├── success-prediction.service.ts    # Success analysis
│   ├── risk-forecast.service.ts         # Risk analysis
│   ├── timeline-prediction.service.ts   # Timeline analysis
│   └── resource-optimization.service.ts # Resource analysis
├── prompts/
│   └── project-ml-prompts.ts        # LLM prompt templates
└── validation/
    └── project-ml.schema.ts         # Zod validation schemas
```

## Core Components

### 1. Context Service (`project-ml-context.service.ts`)

Gathers and normalizes project data for ML analysis:

```typescript
interface ProjectMLContext {
  project: ProjectInfo;
  taskMetrics: TaskMetrics;
  milestoneMetrics: MilestoneMetrics;
  teamMetrics: TeamMetrics;
  activityMetrics: ActivityMetrics;
  historicalPerformance: HistoricalPerformance;
  velocityMetrics: VelocityMetrics;
  recentMeetings: MeetingInfo[];
  historicalPredictions: StoredPrediction[];
}
```

**Key Functions:**

- `gatherProjectContext()` - Collects all project data in parallel
- `formatContextForLLM()` - Formats context for LLM consumption

### 2. Prediction Services

Each prediction type has its own service with consistent architecture:

```typescript
// Pattern for all prediction services
export async function predictX(
  projectId: number,
  tenantId: string,
  options: PredictionOptions,
): Promise<XPredictionResult> {
  // 1. Check for recent prediction
  // 2. Gather context
  // 3. Try LLM, fallback to rules
  // 4. Store prediction
  // 5. Return result
}

// Rule-based fallback (exported for testing)
export function predictXRuleBased(
  context: ProjectMLContext,
  predictionWindowDays: number,
): XPredictionResult {
  // Heuristic-based prediction
}
```

### 3. LLM Integration

Uses the shared `ai-monitoring/ai-client.ts` module:

```typescript
import { jsonPrompt, isAIAvailable } from '../../ai-monitoring/ai-client';

// Check availability
if (isAIAvailable()) {
  const { data, usage } = await jsonPrompt<ResponseType>(
    systemPrompt,
    userPrompt,
    {
      model: 'gpt-4',
      maxTokens: 2000,
      temperature: 0.3,
    },
  );
}
```

### 4. Prompt Engineering

Structured prompts in `prompts/project-ml-prompts.ts`:

```typescript
export const PROJECT_ML_SYSTEM_PROMPT = `
You are an expert project management analyst...
`;

export const SUCCESS_PREDICTION_PROMPT = `
## Project Context
{projectContext}

## Analysis Request
Analyze this project and provide:
1. Success probability (0-1)
2. Key risk factors
3. Actionable recommendations
...
`;

export function fillTemplate(
  template: string,
  values: Record<string, string | number>,
): string;
```

## Data Flow

### Prediction Generation

```
1. Request arrives at router
         │
         ▼
2. Validate input with Zod schema
         │
         ▼
3. Check for cached prediction
         │
    ┌────┴────┐
    │ cached? │
    └────┬────┘
    yes  │  no
    │    │
    ▼    ▼
4a. Return cached    4b. Gather context
         │                    │
         │                    ▼
         │            5. Check LLM availability
         │                    │
         │           ┌────────┴────────┐
         │           │   available?    │
         │           └────────┬────────┘
         │              yes   │   no
         │               │    │
         │               ▼    ▼
         │        6a. LLM   6b. Rule-based
         │            │         │
         │            └────┬────┘
         │                 │
         │                 ▼
         │         7. Store prediction
         │                 │
         └────────►────────┴────────►─────────
                           │
                           ▼
                   8. Return result
```

## Database Schema

```prisma
model ProjectMLPrediction {
  id        Int    @id @default(autoincrement())
  tenantId  String
  projectId Int

  predictionType ProjectMLPredictionType
  status         MLPredictionStatus @default(ACTIVE)

  probability      Float    // Primary prediction (0-1)
  confidence       Float    // Confidence level (0-1)
  predictionWindow Int      // Days ahead predicted

  riskFactors     Json     // Array of RiskFactor
  explanation     String?  // Human-readable explanation
  recommendations Json?    // Array of Recommendation

  // Timeline-specific
  predictedEndDate DateTime?
  originalEndDate  DateTime?
  daysVariance     Int?

  // Resource-specific
  resourceRecommendations Json?
  workloadAnalysis        Json?

  // Metadata
  predictedAt   DateTime @default(now())
  validUntil    DateTime
  actualOutcome Boolean?
  validatedAt   DateTime?
  wasAccurate   Boolean?

  // LLM tracking
  llmModel      String?
  llmTokensUsed Int?
  llmCost       Float?

  // Relations
  tenant  Tenant  @relation(...)
  project Project @relation(...)

  @@index([projectId, predictionType, status])
  @@index([tenantId, predictionType])
  @@index([validUntil, status])
}
```

## Rule-Based Logic

When LLM is unavailable, predictions use heuristic rules:

### Success Prediction Scoring

```typescript
// Component weights
const WEIGHTS = {
  task: 0.3,
  milestone: 0.25,
  team: 0.2,
  velocity: 0.25,
};

// Task score factors
taskScore =
  completionRateScore * 0.3 +
  overdueScore * 0.3 +
  blockedScore * 0.2 +
  velocityScore * 0.2;

// Final probability
probability =
  taskScore * WEIGHTS.task +
  milestoneScore * WEIGHTS.milestone +
  teamScore * WEIGHTS.team +
  velocityScore * WEIGHTS.velocity;
```

### Risk Level Thresholds

```typescript
const RISK_THRESHOLDS = {
  critical: 0.8, // >80% risk
  high: 0.6, // 60-80%
  medium: 0.3, // 30-60%
  low: 0, // <30%
};
```

## Caching Strategy

- Predictions cached for `predictionValidityDays` (default: 7 days)
- Force refresh available via `forceRefresh` option
- Cache key: `projectId + predictionType + status`

## Frontend Integration

### React Query Hooks

```typescript
// Custom hooks in useProjectML.ts
export function useSuccessPrediction(projectId: number) {
  return useQuery({
    queryKey: projectMLKeys.successPrediction(projectId),
    queryFn: () => getSuccessPrediction(projectId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useGeneratePrediction() {
  return useMutation({
    mutationFn: generatePrediction,
    onSuccess: (data, { projectId }) => {
      queryClient.invalidateQueries(projectMLKeys.project(projectId));
    },
  });
}
```

### Component Architecture

```
ProjectMLTab
├── Header (title, refresh button, ML status)
├── StatCards (4 cards in grid)
│   ├── SuccessCard
│   ├── RiskCard
│   ├── TimelineCard
│   └── WorkloadCard
├── RiskForecastPanel
├── TimelinePredictionPanel
├── RecommendationsPanel
└── ResourceOptimizationPanel
```

## Error Handling

### LLM Failures

```typescript
try {
  result = await llmPrediction(context, window, tenantId);
} catch (error) {
  console.error('LLM prediction failed:', error);
  result = predictProjectSuccessRuleBased(context, window);
}
```

### Validation Errors

```typescript
const params = projectIdParamSchema.safeParse(req.params);
if (!params.success) {
  return res.status(400).json({
    error: 'Invalid project ID',
    details: params.error.issues,
  });
}
```

## Performance Considerations

1. **Parallel Data Fetching**: Context gathering uses `Promise.all()`
2. **Indexed Queries**: Database indexes on frequently queried columns
3. **Caching**: Predictions cached to reduce LLM calls
4. **Batch Processing**: Portfolio-level endpoints support batching

## Security

1. **Tenant Isolation**: All queries filtered by tenantId
2. **Authentication**: All endpoints require JWT auth
3. **Input Validation**: Zod schemas for all inputs
4. **Rate Limiting**: Max predictions per day per project

## Testing Strategy

1. **Unit Tests**: Test rule-based functions directly
2. **Integration Tests**: Test with mocked LLM client
3. **E2E Tests**: Test UI components with Playwright

## Future Enhancements

1. **Model Fine-Tuning**: Train on historical project outcomes
2. **Comparative Analysis**: Compare similar projects
3. **Trend Visualization**: Chart prediction history
4. **Alert System**: Proactive notifications for high-risk projects
5. **Custom Models**: Allow tenant-specific ML configurations
