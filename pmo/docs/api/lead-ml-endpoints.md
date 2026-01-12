# Lead ML API Endpoints

## Overview

The Lead ML API provides machine learning-powered predictions and analytics for lead scoring. All endpoints require authentication.

## Base URL

```
/api/lead-scoring
```

## Authentication

All endpoints require a valid JWT token. Include either:

- Cookie: `token=<jwt>`
- Header: `Authorization: Bearer <jwt>`

## Endpoints

---

### Generate Conversion Prediction

Generate or refresh a conversion probability prediction for a lead.

```http
POST /api/lead-scoring/leads/:id/ml/predict
```

#### Parameters

| Name | Type   | In   | Description |
| ---- | ------ | ---- | ----------- |
| id   | number | path | Lead ID     |

#### Request Body

```json
{
  "forceRefresh": false,
  "ruleBasedOnly": false,
  "includeExplanation": true
}
```

| Field              | Type    | Default | Description                                      |
| ------------------ | ------- | ------- | ------------------------------------------------ |
| forceRefresh       | boolean | false   | Generate new prediction even if valid one exists |
| ruleBasedOnly      | boolean | false   | Use rule-based prediction only (skip LLM)        |
| includeExplanation | boolean | true    | Include text explanation in response             |

#### Response

```json
{
  "prediction": {
    "predictionType": "CONVERSION",
    "probability": 0.72,
    "confidence": 0.85,
    "predictedValue": null,
    "predictedDays": 14,
    "predictedScoreLevel": "HOT",
    "predictionId": 123,
    "riskFactors": [
      {
        "factor": "Low Activity Velocity",
        "impact": "medium",
        "currentValue": 0.5,
        "trend": "stable",
        "description": "Lead has low engagement frequency"
      }
    ],
    "explanation": "High conversion probability based on...",
    "recommendations": [
      {
        "priority": "high",
        "action": "Schedule a demo call",
        "rationale": "Lead has shown strong interest",
        "expectedImpact": "Accelerate sales cycle",
        "timeframe": "Within 3 days"
      }
    ],
    "llmMetadata": {
      "model": "gpt-4o-mini",
      "tokensUsed": 850,
      "latencyMs": 1200,
      "estimatedCost": 0.0012
    }
  }
}
```

---

### Get Latest Prediction

Retrieve the most recent valid prediction for a lead.

```http
GET /api/lead-scoring/leads/:id/ml/prediction
```

#### Parameters

| Name | Type   | In    | Description                                                 |
| ---- | ------ | ----- | ----------------------------------------------------------- |
| id   | number | path  | Lead ID                                                     |
| type | string | query | Prediction type: CONVERSION, TIME_TO_CLOSE, SCORE, PRIORITY |

#### Response

```json
{
  "id": 123,
  "isExpired": false,
  "prediction": {
    "predictionType": "CONVERSION",
    "probability": 0.72,
    "confidence": 0.85,
    "riskFactors": [...],
    "explanation": "...",
    "recommendations": [...]
  }
}
```

#### Errors

| Status | Description         |
| ------ | ------------------- |
| 400    | Invalid lead ID     |
| 404    | No prediction found |

---

### Generate Time-to-Close Prediction

Estimate how long until a lead converts.

```http
POST /api/lead-scoring/leads/:id/ml/predict-time
```

#### Request Body

```json
{
  "forceRefresh": false
}
```

#### Response

```json
{
  "prediction": {
    "predictionType": "TIME_TO_CLOSE",
    "probability": 0.65,
    "confidence": 0.78,
    "predictedDays": 21,
    "confidenceInterval": {
      "low": 14,
      "high": 30
    },
    "predictionId": 124,
    "riskFactors": [...],
    "explanation": "...",
    "recommendations": [...]
  }
}
```

---

### Generate Score Prediction

Get an explained score prediction with component breakdown.

```http
POST /api/lead-scoring/leads/:id/ml/predict-score
```

#### Response

```json
{
  "prediction": {
    "predictionType": "SCORE",
    "probability": 0.75,
    "confidence": 0.82,
    "predictedScore": 78,
    "scoreBreakdown": {
      "demographic": 22,
      "behavioral": 28,
      "temporal": 15,
      "engagement": 13
    },
    "predictionId": 125,
    "riskFactors": [...],
    "explanation": "...",
    "recommendations": [...]
  }
}
```

---

### Get Lead Features

Retrieve extracted features for a lead.

```http
GET /api/lead-scoring/leads/:id/ml/features
```

#### Response

```json
{
  "features": {
    "demographic": {
      "hasCompany": true,
      "hasTitle": true,
      "hasPhone": true,
      "emailDomainType": "corporate",
      "titleSeniority": "vp",
      "companySizeEstimate": "medium",
      "emailDomain": "acme.com"
    },
    "behavioral": {
      "emailOpenCount": 12,
      "emailClickCount": 5,
      "pageViewCount": 8,
      "formSubmitCount": 2,
      "meetingCount": 1,
      "callCount": 1,
      "activityVelocity": 1.8,
      "channelDiversity": 5,
      "highValueActionCount": 4,
      "totalActivities": 30
    },
    "temporal": {
      "daysSinceCreated": 14,
      "daysSinceLastActivity": 1,
      "recencyScore": 0.92,
      "activityBurst": false,
      "dayPattern": "weekday",
      "timePattern": "business_hours",
      "leadAgeWeeks": 2
    },
    "engagement": {
      "totalEngagementScore": 75,
      "emailOpenRate": 0.67,
      "emailClickRate": 0.28,
      "sequenceEngagement": 0.6,
      "avgResponseTime": 7200,
      "isInActiveSequence": true,
      "currentSequenceStep": 3
    }
  }
}
```

---

### Bulk Predict Conversions

Generate predictions for multiple leads in a configuration.

```http
POST /api/lead-scoring/:configId/ml/bulk-predict
```

#### Parameters

| Name     | Type   | In   | Description                   |
| -------- | ------ | ---- | ----------------------------- |
| configId | number | path | Lead Scoring Configuration ID |

#### Request Body

```json
{
  "limit": 50,
  "minScore": 0,
  "forceRefresh": false,
  "ruleBasedOnly": false
}
```

#### Response

```json
{
  "processed": 50,
  "successful": 48,
  "failed": 2,
  "predictions": [
    {
      "leadId": 1,
      "result": {...},
      "error": null
    },
    {
      "leadId": 2,
      "result": null,
      "error": "Lead not found"
    }
  ]
}
```

---

### Get Ranked Leads

Get leads ranked by priority with ML predictions.

```http
GET /api/lead-scoring/:configId/ml/ranked-leads
```

#### Parameters

| Name           | Type    | In    | Description                         |
| -------------- | ------- | ----- | ----------------------------------- |
| configId       | number  | path  | Configuration ID                    |
| limit          | number  | query | Max leads to return (default: 20)   |
| minScore       | number  | query | Minimum score filter (default: 0)   |
| minProbability | number  | query | Minimum conversion probability      |
| useLLM         | boolean | query | Use LLM for ranking (default: true) |

#### Response

```json
{
  "rankings": [
    {
      "leadId": 1,
      "email": "john@acme.com",
      "name": "John Smith",
      "company": "ACME Corp",
      "title": "VP Engineering",
      "score": 85,
      "scoreLevel": "HOT",
      "priorityRank": 1,
      "priorityTier": "top",
      "priorityScore": 92,
      "conversionProbability": 0.78,
      "reasoning": "High engagement, decision-maker title"
    }
  ],
  "insights": {
    "topLeadCount": 5,
    "avgConversionProbability": 0.65,
    "commonPatterns": [
      "High activity velocity",
      "Corporate email domains"
    ]
  },
  "llmMetadata": {...}
}
```

---

### Get Top Priority Leads

Get the N highest priority leads.

```http
GET /api/lead-scoring/:configId/ml/top-leads
```

#### Parameters

| Name     | Type   | In    | Description                   |
| -------- | ------ | ----- | ----------------------------- |
| configId | number | path  | Configuration ID              |
| n        | number | query | Number of leads (default: 10) |

#### Response

```json
{
  "leads": [
    {
      "leadId": 1,
      "email": "john@acme.com",
      "name": "John Smith",
      "company": "ACME Corp",
      "title": "VP Engineering",
      "score": 85,
      "scoreLevel": "HOT",
      "priorityRank": 1,
      "priorityTier": "top",
      "priorityScore": 92,
      "conversionProbability": 0.78,
      "reasoning": "High engagement, decision-maker title"
    }
  ]
}
```

---

### Get Leads by Tier

Get leads filtered by priority tier.

```http
GET /api/lead-scoring/:configId/ml/leads-by-tier
```

#### Parameters

| Name     | Type   | In    | Description                           |
| -------- | ------ | ----- | ------------------------------------- |
| configId | number | path  | Configuration ID                      |
| tier     | string | query | Priority tier: top, high, medium, low |

#### Response

```json
{
  "leads": [...]
}
```

#### Errors

| Status | Description        |
| ------ | ------------------ |
| 400    | Invalid tier value |

---

### Validate Prediction

Record whether a prediction was accurate (for model improvement).

```http
POST /api/lead-scoring/predictions/:id/validate
```

#### Parameters

| Name | Type   | In   | Description   |
| ---- | ------ | ---- | ------------- |
| id   | number | path | Prediction ID |

#### Request Body

```json
{
  "wasAccurate": true
}
```

#### Response

```json
{
  "success": true
}
```

---

### Get Prediction Accuracy

Get accuracy metrics for predictions.

```http
GET /api/lead-scoring/:configId/ml/accuracy
```

#### Parameters

| Name      | Type   | In    | Description           |
| --------- | ------ | ----- | --------------------- |
| configId  | number | path  | Configuration ID      |
| startDate | string | query | ISO date filter start |
| endDate   | string | query | ISO date filter end   |

#### Response

```json
{
  "totalPredictions": 500,
  "validatedCount": 150,
  "accurateCount": 120,
  "accuracy": 0.8,
  "byType": {
    "CONVERSION": {
      "total": 100,
      "accurate": 85,
      "accuracy": 0.85
    },
    "TIME_TO_CLOSE": {
      "total": 50,
      "accurate": 35,
      "accuracy": 0.7
    }
  }
}
```

---

### Get Feature Importance

Get the relative importance of scoring features.

```http
GET /api/lead-scoring/:configId/ml/feature-importance
```

#### Response

```json
{
  "importance": [
    {
      "name": "Email Clicks",
      "importance": 0.15,
      "category": "behavioral"
    },
    {
      "name": "Form Submissions",
      "importance": 0.14,
      "category": "behavioral"
    },
    {
      "name": "Title Seniority",
      "importance": 0.12,
      "category": "demographic"
    }
  ]
}
```

---

## Error Responses

All endpoints may return these errors:

| Status | Code           | Description                       |
| ------ | -------------- | --------------------------------- |
| 400    | BAD_REQUEST    | Invalid request parameters        |
| 401    | UNAUTHORIZED   | Missing or invalid authentication |
| 403    | FORBIDDEN      | Insufficient permissions          |
| 404    | NOT_FOUND      | Resource not found                |
| 500    | INTERNAL_ERROR | Server error                      |

Error response format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

---

## Rate Limits

LLM-based predictions are subject to rate limiting:

- 100 predictions per minute per tenant
- 1000 predictions per hour per tenant

Bulk predictions count against these limits.

## Caching

Predictions are cached and reused:

- Default validity: 24 hours
- Use `forceRefresh: true` to bypass cache
- Predictions marked as expired after validity period
