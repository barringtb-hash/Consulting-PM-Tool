# Customer Success ML - API Reference

Complete REST API documentation for the Customer Success ML module.

## Authentication

All endpoints require authentication via JWT token in cookies or Authorization header.

**Headers:**

- `Cookie`: Contains `auth_token` httpOnly cookie
- `X-Tenant-ID`: Tenant identifier (required for multi-tenant deployments)

## Base URL

```
/api/crm/accounts
```

---

## Account-Level Endpoints

### Generate ML Prediction

Generate an ML prediction for a specific account.

```
POST /:id/ml/predict
```

**Path Parameters:**

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| id        | number | Account ID  |

**Request Body:**

| Field                | Type    | Required | Description                                    |
| -------------------- | ------- | -------- | ---------------------------------------------- |
| predictionType       | string  | Yes      | One of: `CHURN`, `HEALTH_TREND`                |
| options.forceRefresh | boolean | No       | Force new prediction even if recent one exists |

**Example Request:**

```json
{
  "predictionType": "CHURN",
  "options": {
    "forceRefresh": false
  }
}
```

**Success Response (200):**

```json
{
  "data": {
    "predictionType": "CHURN",
    "probability": 0.72,
    "confidence": 0.85,
    "predictionWindowDays": 90,
    "riskCategory": "high",
    "churnProbability": 0.72,
    "retentionProbability": 0.28,
    "primaryChurnDrivers": [
      "Declining health scores over 60 days",
      "No executive engagement in 45 days",
      "3 unresolved support tickets"
    ],
    "interventionUrgency": "this_week",
    "riskFactors": [
      {
        "factor": "Health Score Decline",
        "impact": "high",
        "description": "Health score dropped from 78 to 52 over 60 days"
      }
    ],
    "recommendations": [
      {
        "action": "Schedule executive business review",
        "priority": "high",
        "timeframe": "Within 5 days",
        "expectedImpact": "Re-establish strategic alignment"
      }
    ],
    "explanation": "Account shows significant churn risk due to declining engagement...",
    "llmMetadata": {
      "model": "gpt-4",
      "tokensUsed": 1250,
      "latencyMs": 2340,
      "estimatedCost": 0.025
    }
  }
}
```

**Cached Response (200):**

```json
{
  "data": { ... },
  "cached": true
}
```

**Error Responses:**

| Status | Error                     | Description                   |
| ------ | ------------------------- | ----------------------------- |
| 400    | `Invalid prediction type` | Unsupported prediction type   |
| 400    | `Tenant context required` | Missing X-Tenant-ID header    |
| 404    | `Account not found`       | Account doesn't exist         |
| 503    | `ML service unavailable`  | OpenAI API key not configured |

---

### Get Churn Prediction

Get churn risk prediction for an account (retrieves existing or generates new).

```
GET /:id/ml/churn-risk
```

**Path Parameters:**

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| id        | number | Account ID  |

**Success Response (200):**

```json
{
  "data": {
    "predictionType": "CHURN",
    "probability": 0.65,
    "confidence": 0.82,
    "riskCategory": "high",
    ...
  },
  "cached": true
}
```

---

### Get Health Insights

Get ML-enhanced health analysis for an account.

```
GET /:id/ml/health-insights
```

**Path Parameters:**

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| id        | number | Account ID  |

**Success Response (200):**

```json
{
  "data": {
    "predictionType": "HEALTH_TREND",
    "currentHealthScore": 65,
    "predictedScore": 58,
    "scoreTrajectory": "declining",
    "insights": [
      {
        "type": "trend",
        "severity": "warning",
        "message": "Health score has declined 12% over the past 30 days"
      }
    ],
    "anomalies": [
      {
        "dimension": "engagement",
        "description": "Unusual drop in login frequency",
        "severity": "high"
      }
    ],
    "strengthAreas": ["product_adoption", "support_satisfaction"],
    "riskAreas": ["engagement", "executive_relationship"],
    "recommendations": [...]
  }
}
```

---

### List Account Predictions

List ML predictions for an account.

```
GET /:id/ml/predictions
```

**Path Parameters:**

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| id        | number | Account ID  |

**Query Parameters:**

| Parameter      | Type    | Default | Description                 |
| -------------- | ------- | ------- | --------------------------- |
| type           | string  | -       | Filter by prediction type   |
| includeExpired | boolean | false   | Include expired predictions |

**Success Response (200):**

```json
{
  "data": [
    {
      "id": 42,
      "predictionType": "CHURN",
      "probability": 0.72,
      "confidence": 0.85,
      "explanation": "Account shows significant churn risk...",
      "predictedAt": "2024-01-15T10:30:00Z",
      "validUntil": "2024-02-14T10:30:00Z",
      "status": "ACTIVE",
      "wasAccurate": null
    }
  ]
}
```

---

### Generate CTA from Prediction

Generate a CTA from the latest prediction for an account.

```
POST /:id/ml/generate-cta
```

**Path Parameters:**

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| id        | number | Account ID  |

**Success Response (201):**

```json
{
  "data": {
    "cta": {
      "id": 156,
      "type": "RISK",
      "priority": "HIGH",
      "title": "Address churn risk - 72% probability",
      "description": "**ML Analysis**: Account shows significant churn risk...",
      "dueDate": "2024-01-20T00:00:00Z",
      "status": "OPEN"
    },
    "predictionId": 42,
    "generationReason": "High churn risk detected",
    "wasCreated": true
  }
}
```

**CTA Not Created Response (400):**

```json
{
  "error": "CTA not created",
  "reason": "CTA cooldown active (7 days)"
}
```

**Error Responses:**

| Status | Error                          | Description                         |
| ------ | ------------------------------ | ----------------------------------- |
| 400    | `CTA not created`              | Cooldown active or duplicate exists |
| 401    | `User authentication required` | Missing user context                |
| 404    | `No prediction found`          | Generate prediction first           |

---

## Portfolio-Level Endpoints

### Get High-Risk Accounts

List accounts with high churn risk based on ML predictions.

```
GET /portfolio/ml/high-risk
```

**Query Parameters:**

| Parameter      | Type   | Default | Description                |
| -------------- | ------ | ------- | -------------------------- |
| minProbability | number | 0.6     | Minimum churn probability  |
| limit          | number | 50      | Maximum accounts to return |

**Success Response (200):**

```json
{
  "data": [
    {
      "account": {
        "id": 123,
        "name": "Acme Corp",
        "type": "CUSTOMER",
        "healthScore": 52
      },
      "prediction": {
        "id": 42,
        "probability": 0.78,
        "confidence": 0.85,
        "explanation": "Critical churn risk due to...",
        "predictedAt": "2024-01-15T10:30:00Z"
      }
    }
  ],
  "count": 12
}
```

---

### Batch Predict

Queue batch predictions for multiple accounts.

```
POST /portfolio/ml/batch-predict
```

**Request Body:**

| Field          | Type   | Required | Description                               |
| -------------- | ------ | -------- | ----------------------------------------- |
| predictionType | string | Yes      | Prediction type to generate               |
| maxAccounts    | number | No       | Maximum accounts to process (default: 50) |
| priorityFilter | string | No       | Filter by priority segment                |

**Success Response (202):**

```json
{
  "message": "Batch prediction queued",
  "predictionType": "CHURN",
  "maxAccounts": 50,
  "note": "Full batch processing implementation requires a job queue"
}
```

---

### Batch Generate CTAs

Generate CTAs for multiple high-risk accounts.

```
POST /portfolio/ml/generate-ctas
```

**Request Body:**

| Field          | Type   | Required | Description                            |
| -------------- | ------ | -------- | -------------------------------------- |
| predictionType | string | Yes      | Source prediction type                 |
| maxCTAs        | number | No       | Maximum CTAs to generate (default: 20) |

**Success Response (200):**

```json
{
  "generated": 8,
  "skipped": 4,
  "results": [
    {
      "cta": { "id": 157, ... },
      "predictionId": 43,
      "generationReason": "High churn risk",
      "wasCreated": true
    },
    {
      "cta": null,
      "predictionId": 44,
      "generationReason": "High churn risk",
      "wasCreated": false,
      "skippedReason": "Similar CTA already exists"
    }
  ]
}
```

---

### Validate Predictions

Validate expired predictions against actual outcomes.

```
POST /portfolio/ml/validate-predictions
```

**Success Response (200):**

```json
{
  "validated": 15,
  "message": "Validated 15 expired predictions"
}
```

---

### Get Prediction Accuracy

Get prediction accuracy metrics.

```
GET /portfolio/ml/accuracy
```

**Query Parameters:**

| Parameter      | Type   | Required | Description               |
| -------------- | ------ | -------- | ------------------------- |
| predictionType | string | No       | Filter by prediction type |

**Success Response (200):**

```json
{
  "data": {
    "totalPredictions": 245,
    "validatedCount": 120,
    "accurateCount": 96,
    "accuracy": 0.8,
    "byType": {
      "CHURN": {
        "total": 80,
        "accurate": 68
      },
      "HEALTH_TREND": {
        "total": 40,
        "accurate": 28
      }
    }
  }
}
```

---

### Get CTA Statistics

Get statistics on ML-generated CTAs.

```
GET /portfolio/ml/cta-stats
```

**Success Response (200):**

```json
{
  "data": {
    "totalGenerated": 156,
    "openCount": 42,
    "completedCount": 98,
    "completionRate": 0.628,
    "byType": {
      "RISK": 78,
      "RENEWAL": 45,
      "ONBOARDING": 33
    },
    "averageResolutionDays": 8
  }
}
```

---

### Check ML Status

Check if ML service is available.

```
GET /portfolio/ml/status
```

**Success Response (200):**

```json
{
  "available": true,
  "message": "ML service is available"
}
```

**Unavailable Response (200):**

```json
{
  "available": false,
  "message": "ML service unavailable - OpenAI API key not configured"
}
```

---

## Error Codes

| Status | Code                      | Description                 |
| ------ | ------------------------- | --------------------------- |
| 400    | `INVALID_PREDICTION_TYPE` | Unsupported prediction type |
| 400    | `TENANT_REQUIRED`         | Missing tenant context      |
| 401    | `AUTH_REQUIRED`           | Authentication required     |
| 404    | `ACCOUNT_NOT_FOUND`       | Account doesn't exist       |
| 404    | `PREDICTION_NOT_FOUND`    | No prediction exists        |
| 500    | `PREDICTION_FAILED`       | Internal prediction error   |
| 503    | `ML_UNAVAILABLE`          | OpenAI API not configured   |

---

## Rate Limits

| Endpoint           | Limit                      |
| ------------------ | -------------------------- |
| Single predictions | 100 per day per tenant     |
| Batch predictions  | 5 batch operations per day |
| CTA generation     | 50 per day per tenant      |

---

## Webhooks (Future)

Planned webhook events for ML predictions:

| Event                  | Description                    |
| ---------------------- | ------------------------------ |
| `prediction.created`   | New prediction generated       |
| `prediction.high_risk` | High-risk prediction detected  |
| `cta.auto_generated`   | CTA automatically created      |
| `prediction.validated` | Prediction accuracy determined |
