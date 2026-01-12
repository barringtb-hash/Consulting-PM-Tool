# Project ML API Reference

Complete API documentation for the Project ML module.

## Authentication

All endpoints require authentication. Include JWT token in cookie or Authorization header.

## Project-Level Endpoints

### Generate Prediction

Generate a new ML prediction for a project.

```
POST /api/projects/:projectId/ml/predict
```

**Request Body:**

```json
{
  "predictionType": "SUCCESS_PREDICTION",
  "options": {
    "forceRefresh": false,
    "predictionWindowDays": 90
  }
}
```

**Prediction Types:**

- `SUCCESS_PREDICTION` - Overall project success likelihood
- `RISK_FORECAST` - Potential risks and early warnings
- `TIMELINE_PREDICTION` - Completion date estimates
- `RESOURCE_OPTIMIZATION` - Team workload analysis

**Response:**

```json
{
  "success": true,
  "data": {
    "predictionType": "SUCCESS_PREDICTION",
    "probability": 0.72,
    "confidence": 0.85,
    "predictionWindowDays": 90,
    "onTimeProbability": 0.68,
    "onBudgetProbability": 0.75,
    "overallSuccessProbability": 0.72,
    "successFactors": [...],
    "riskFactors": [...],
    "explanation": "Based on current metrics...",
    "recommendations": [...],
    "llmMetadata": {
      "model": "gpt-4",
      "tokensUsed": 1234,
      "latencyMs": 2500,
      "estimatedCost": 0.02
    }
  }
}
```

---

### Get Success Prediction

Get the latest success prediction for a project.

```
GET /api/projects/:projectId/ml/success-prediction
```

**Query Parameters:**

- `refresh` (boolean) - Force new prediction

**Response:** Returns `SuccessPredictionResult`

---

### Get Risk Forecast

Get the latest risk forecast for a project.

```
GET /api/projects/:projectId/ml/risk-forecast
```

**Query Parameters:**

- `refresh` (boolean) - Force new prediction

**Response:**

```json
{
  "success": true,
  "data": {
    "predictionType": "RISK_FORECAST",
    "probability": 0.45,
    "confidence": 0.80,
    "overallRiskLevel": "medium",
    "identifiedRisks": [
      {
        "category": "schedule",
        "title": "Timeline at risk",
        "description": "Current velocity insufficient...",
        "probability": 0.65,
        "impact": "high",
        "mitigationSuggestion": "Consider..."
      }
    ],
    "delayProbability": 0.35,
    "estimatedDelayDays": 7,
    "earlyWarningIndicators": [...]
  }
}
```

---

### Get Timeline Prediction

Get timeline prediction with estimated completion date.

```
GET /api/projects/:projectId/ml/timeline-prediction
```

**Response:**

```json
{
  "success": true,
  "data": {
    "predictionType": "TIMELINE_PREDICTION",
    "currentEndDate": "2024-06-30",
    "predictedEndDate": "2024-07-15",
    "confidenceInterval": {
      "optimistic": "2024-07-01",
      "pessimistic": "2024-07-30"
    },
    "daysVariance": 15,
    "delayFactors": [...],
    "accelerationOpportunities": [...]
  }
}
```

---

### Get Resource Optimization

Get resource optimization recommendations.

```
GET /api/projects/:projectId/ml/resource-optimization
```

**Response:**

```json
{
  "success": true,
  "data": {
    "predictionType": "RESOURCE_OPTIMIZATION",
    "workloadBalance": {
      "score": 0.75,
      "interpretation": "good",
      "mostOverloaded": { "userId": 1, "name": "John", "taskCount": 15 },
      "mostUnderloaded": { "userId": 2, "name": "Jane", "taskCount": 3 }
    },
    "reassignmentSuggestions": [...],
    "bottlenecks": [...],
    "capacityForecast": [...]
  }
}
```

---

### List Project Predictions

Get all predictions for a project.

```
GET /api/projects/:projectId/ml/predictions
```

**Query Parameters:**

- `type` (string) - Filter by prediction type
- `includeExpired` (boolean) - Include expired predictions

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "predictionType": "SUCCESS_PREDICTION",
      "probability": 0.72,
      "confidence": 0.85,
      "explanation": "...",
      "predictedAt": "2024-01-15T10:00:00Z",
      "validUntil": "2024-01-22T10:00:00Z",
      "status": "ACTIVE",
      "wasAccurate": null
    }
  ]
}
```

---

## Portfolio-Level Endpoints

### Get High-Risk Projects

Get projects with high risk predictions.

```
GET /api/projects/portfolio/ml/at-risk
```

**Query Parameters:**

- `minRisk` (number) - Minimum risk threshold (0-1)
- `limit` (number) - Maximum results

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "project": {
        "id": 1,
        "name": "Project Alpha",
        "status": "IN_PROGRESS",
        "healthStatus": "AT_RISK"
      },
      "prediction": {
        "id": 42,
        "predictionType": "RISK_FORECAST",
        "probability": 0.85,
        "confidence": 0.9,
        "explanation": "High risk due to...",
        "predictedAt": "2024-01-15T10:00:00Z"
      }
    }
  ]
}
```

---

### Batch Predict

Generate predictions for multiple projects.

```
POST /api/projects/portfolio/ml/batch-predict
```

**Request Body:**

```json
{
  "predictionType": "SUCCESS_PREDICTION",
  "projectIds": [1, 2, 3],
  "maxProjects": 50
}
```

**Response:** Returns batch job status.

---

### Validate Predictions

Validate expired predictions against actual outcomes.

```
POST /api/projects/portfolio/ml/validate-predictions
```

**Response:**

```json
{
  "success": true,
  "data": {
    "validated": 15
  }
}
```

---

### Get Prediction Accuracy

Get accuracy metrics for predictions.

```
GET /api/projects/portfolio/ml/accuracy
```

**Query Parameters:**

- `predictionType` (string) - Filter by type

**Response:**

```json
{
  "success": true,
  "data": {
    "totalPredictions": 100,
    "validatedCount": 50,
    "accurateCount": 42,
    "accuracy": 0.84,
    "byType": {
      "SUCCESS_PREDICTION": { "total": 30, "accurate": 26 },
      "RISK_FORECAST": { "total": 20, "accurate": 16 }
    }
  }
}
```

---

### Get ML Status

Check ML service availability and configuration.

```
GET /api/projects/portfolio/ml/status
```

**Response:**

```json
{
  "success": true,
  "data": {
    "available": true,
    "features": [
      "SUCCESS_PREDICTION",
      "RISK_FORECAST",
      "TIMELINE_PREDICTION",
      "RESOURCE_OPTIMIZATION"
    ],
    "config": {
      "defaultPredictionWindowDays": 90,
      "predictionValidityDays": 7
    }
  }
}
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

**Common Error Codes:**

- `UNAUTHORIZED` - Missing or invalid authentication
- `NOT_FOUND` - Project not found
- `INVALID_INPUT` - Invalid request parameters
- `ML_UNAVAILABLE` - ML service not available
- `INSUFFICIENT_DATA` - Not enough project data for prediction

## Rate Limits

- Maximum 100 predictions per project per day
- Batch predictions limited to 50 projects per request
