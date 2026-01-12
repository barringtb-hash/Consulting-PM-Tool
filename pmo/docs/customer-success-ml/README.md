# Customer Success ML Predictions

Intelligent ML-powered predictions to help Customer Success Managers (CSMs) prioritize accounts and take proactive action before issues escalate.

## Overview

The Customer Success ML module uses Large Language Models (LLMs) to analyze account data and generate actionable predictions. It integrates with the existing Customer Success platform to provide:

- **Churn Prediction**: Identifies accounts at risk of churning
- **Health Insights**: ML-enhanced health score analysis with anomaly detection
- **Intelligent CTAs**: Automatically generates Call-to-Action items for high-risk accounts

## Features

### Churn Prediction

Predicts which accounts are at risk of churning within a configurable prediction window (default: 90 days).

**How it works:**

1. Gathers account context (health history, activities, CTAs, opportunities)
2. Sends structured data to LLM for analysis
3. Returns probability, risk factors, and actionable recommendations
4. Optionally auto-generates CTAs for high-risk accounts

**Output includes:**

- Churn probability (0-100%)
- Confidence score
- Risk category (critical, high, medium, low)
- Top risk factors with explanations
- Recommended interventions
- Intervention urgency level

### Health Insights

ML-enhanced analysis of account health that goes beyond simple score calculations.

**Capabilities:**

- Predicts future health score trajectory
- Identifies sudden score drops or sustained declines
- Detects anomalies in engagement patterns
- Highlights strength areas and risk areas
- Provides dimension-specific improvement suggestions

### Intelligent CTAs

Automatically generates CTAs based on ML predictions with built-in safeguards.

**Features:**

- Priority assignment based on risk level
- Playbook matching for standardized responses
- Cooldown periods to prevent CTA flooding
- Duplicate detection to avoid redundant CTAs
- Links generated CTAs to source predictions for tracking

## Quick Start

### 1. Check ML Service Availability

```bash
GET /api/crm/accounts/portfolio/ml/status
```

Response:

```json
{
  "available": true,
  "message": "ML service is available"
}
```

### 2. Generate a Churn Prediction

```bash
POST /api/crm/accounts/123/ml/predict
Content-Type: application/json

{
  "predictionType": "CHURN",
  "options": {
    "forceRefresh": false
  }
}
```

Response:

```json
{
  "data": {
    "predictionType": "CHURN",
    "probability": 0.72,
    "confidence": 0.85,
    "riskCategory": "high",
    "churnProbability": 0.72,
    "retentionProbability": 0.28,
    "primaryChurnDrivers": [
      "Declining health scores over 60 days",
      "No executive engagement in 45 days",
      "3 unresolved support tickets"
    ],
    "interventionUrgency": "this_week",
    "riskFactors": [...],
    "recommendations": [...],
    "explanation": "Account shows significant churn risk..."
  }
}
```

### 3. Get Health Insights

```bash
GET /api/crm/accounts/123/ml/health-insights
```

### 4. Generate CTA from Prediction

```bash
POST /api/crm/accounts/123/ml/generate-cta
```

## Understanding Predictions

### Risk Categories

| Category | Probability | Action Required                     |
| -------- | ----------- | ----------------------------------- |
| Critical | 80-100%     | Immediate intervention required     |
| High     | 60-79%      | Action needed within the week       |
| Medium   | 30-59%      | Monitor closely, plan intervention  |
| Low      | 0-29%       | Healthy account, routine engagement |

### Confidence Scores

| Level  | Score  | Meaning                               |
| ------ | ------ | ------------------------------------- |
| High   | > 80%  | Strong signal from comprehensive data |
| Medium | 50-80% | Moderate certainty, some data gaps    |
| Low    | < 50%  | Limited data, fallback algorithm used |

### Intervention Urgency

| Urgency    | Description                      | CTA Due Date |
| ---------- | -------------------------------- | ------------ |
| immediate  | Contact today                    | 1 day        |
| this_week  | Schedule within 5 business days  | 5 days       |
| this_month | Plan intervention within 30 days | 14 days      |
| monitor    | Watch for changes                | 30 days      |

## Portfolio-Level Features

### High-Risk Account Dashboard

Get a prioritized list of accounts requiring attention:

```bash
GET /api/crm/accounts/portfolio/ml/high-risk?minProbability=0.6&limit=20
```

### Batch CTA Generation

Generate CTAs for multiple high-risk accounts at once:

```bash
POST /api/crm/accounts/portfolio/ml/generate-ctas
{
  "predictionType": "CHURN",
  "maxCTAs": 10
}
```

### Prediction Accuracy Tracking

Monitor ML prediction performance:

```bash
GET /api/crm/accounts/portfolio/ml/accuracy?predictionType=CHURN
```

### CTA Statistics

Track ML-generated CTA effectiveness:

```bash
GET /api/crm/accounts/portfolio/ml/cta-stats
```

## Data Requirements

For accurate predictions, accounts should have:

- **Health Score History**: At least 30 days of health score snapshots
- **CRM Activities**: Recent engagement data (meetings, emails, calls)
- **Open CTAs**: Current action items and their status
- **Opportunity Data**: Active deals and their pipeline status

Accounts with limited data will use a rule-based fallback algorithm with lower confidence scores.

## Best Practices

### When to Use ML Predictions

1. **Quarterly Business Reviews (QBRs)**: Generate predictions before QBRs to identify discussion topics
2. **Portfolio Prioritization**: Use high-risk dashboard for daily planning
3. **Renewal Preparation**: Run predictions 90-120 days before renewal
4. **After Major Changes**: Re-run after significant account events

### Interpreting Results

1. **Don't rely solely on probability**: Consider risk factors and recommendations
2. **Review with context**: ML predictions complement, not replace, CSM judgment
3. **Track accuracy**: Monitor prediction validation to calibrate trust
4. **Act on recommendations**: Predictions are valuable only when acted upon

### Handling False Positives/Negatives

- **False Positive** (predicted churn, didn't churn): Better to be cautious
- **False Negative** (didn't predict churn, churned): Review what signals were missed

Use the accuracy tracking endpoint to monitor and improve prediction quality over time.

## Troubleshooting

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues and solutions.

## Related Documentation

- [API Reference](./API.md) - Complete API documentation
- [Architecture](./ARCHITECTURE.md) - System design and data flow
- [Configuration](./CONFIGURATION.md) - Feature flags and settings
