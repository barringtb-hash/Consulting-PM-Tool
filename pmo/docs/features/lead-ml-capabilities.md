# Lead ML Capabilities

## Overview

The Lead ML module brings machine learning-powered intelligence to the Lead Scoring feature. It provides conversion probability predictions, time-to-close estimations, lead priority rankings, and explainable scoring insights.

## Key Features

### 1. Conversion Prediction

Predicts the likelihood that a lead will convert to a customer.

**How it works:**

- Extracts features from lead data (demographic, behavioral, temporal, engagement)
- Uses a hybrid approach: LLM-based prediction with rule-based fallback
- Returns probability score (0-1), confidence level, and explanation

**Use cases:**

- Prioritize sales outreach
- Focus resources on high-probability leads
- Identify leads at risk of going cold

### 2. Time-to-Close Estimation

Estimates how many days until a lead is likely to convert.

**Output includes:**

- Predicted days to close
- Confidence interval (optimistic/pessimistic)
- Factors affecting timeline
- Acceleration opportunities

### 3. Lead Priority Ranking

Automatically ranks leads by conversion potential and urgency.

**Priority tiers:**

- **Top**: Highest priority, immediate attention needed
- **High**: Strong prospects, engage soon
- **Medium**: Developing leads, nurture
- **Low**: Early stage, monitor

### 4. Score Explanation

Provides transparency into how lead scores are calculated.

**Score breakdown by category:**

- Demographic (25%): Company, title, contact info
- Behavioral (35%): Activities, engagement patterns
- Temporal (20%): Recency, velocity, timing
- Engagement (20%): Email opens, sequence progress

### 5. Risk Factor Analysis

Identifies factors that may negatively impact conversion.

**Example risk factors:**

- Low activity velocity
- Long time since last engagement
- Missing company/title information
- Free email domain

### 6. AI-Generated Recommendations

Provides actionable next steps for each lead.

**Recommendation types:**

- Immediate actions (urgent priority)
- Follow-up activities (high priority)
- Nurture suggestions (medium priority)
- Monitoring tasks (low priority)

## Feature Engineering

The ML system extracts four categories of features:

### Demographic Features

| Feature             | Description                                |
| ------------------- | ------------------------------------------ |
| hasCompany          | Whether company name is provided           |
| hasTitle            | Whether job title is provided              |
| hasPhone            | Whether phone number is provided           |
| emailDomainType     | corporate, free, or edu                    |
| titleSeniority      | c_level, vp, director, manager, individual |
| companySizeEstimate | Based on domain analysis                   |

### Behavioral Features

| Feature              | Description              |
| -------------------- | ------------------------ |
| emailOpenCount       | Number of email opens    |
| emailClickCount      | Number of email clicks   |
| pageViewCount        | Website page views       |
| formSubmitCount      | Form submissions         |
| meetingCount         | Meetings scheduled/held  |
| callCount            | Phone calls              |
| activityVelocity     | Activities per day       |
| channelDiversity     | Unique activity types    |
| highValueActionCount | Meetings + calls + forms |

### Temporal Features

| Feature               | Description                 |
| --------------------- | --------------------------- |
| daysSinceCreated      | Lead age in days            |
| daysSinceLastActivity | Recency of engagement       |
| recencyScore          | Exponential decay score     |
| activityBurst         | 3+ activities in 24h        |
| dayPattern            | weekday vs weekend          |
| timePattern           | business hours vs off hours |

### Engagement Features

| Feature            | Description                       |
| ------------------ | --------------------------------- |
| emailOpenRate      | Opens / sends                     |
| emailClickRate     | Clicks / sends                    |
| sequenceEngagement | Progress through nurture sequence |
| avgResponseTime    | Average response time             |
| isInActiveSequence | Currently in nurture sequence     |

## API Endpoints

### Generate Predictions

```
POST /api/lead-scoring/leads/:id/ml/predict
```

Request body:

```json
{
  "forceRefresh": false,
  "ruleBasedOnly": false
}
```

### Get Latest Prediction

```
GET /api/lead-scoring/leads/:id/ml/prediction?type=CONVERSION
```

### Get Lead Features

```
GET /api/lead-scoring/leads/:id/ml/features
```

### Bulk Predictions

```
POST /api/lead-scoring/:configId/ml/bulk-predict
```

Request body:

```json
{
  "limit": 50,
  "minScore": 0,
  "forceRefresh": false
}
```

### Get Ranked Leads

```
GET /api/lead-scoring/:configId/ml/ranked-leads?limit=20&minScore=0
```

### Get Top Priority Leads

```
GET /api/lead-scoring/:configId/ml/top-leads?n=10
```

### Get Leads by Tier

```
GET /api/lead-scoring/:configId/ml/leads-by-tier?tier=top
```

### Validate Prediction

```
POST /api/lead-scoring/predictions/:id/validate
```

Request body:

```json
{
  "wasAccurate": true
}
```

### Get Prediction Accuracy

```
GET /api/lead-scoring/:configId/ml/accuracy
```

### Get Feature Importance

```
GET /api/lead-scoring/:configId/ml/feature-importance
```

## User Interface

### ML Insights Tab

Access ML features through the "ML Insights" tab in Lead Scoring:

1. **Performance Metrics**: Model accuracy, total predictions, validated count
2. **Feature Importance Chart**: Visual breakdown of scoring factors
3. **Top Priority Leads**: Ranked list with conversion probabilities
4. **Prediction Details Panel**: Click a lead to see full analysis

### Running Bulk Predictions

1. Navigate to Lead Scoring > ML Insights
2. Click "Run Bulk Predictions"
3. Wait for processing to complete
4. View ranked leads in the priority list

### Understanding Predictions

Each prediction includes:

- **Probability**: Likelihood of conversion (0-100%)
- **Confidence**: Model's certainty in the prediction
- **Risk Factors**: Issues that may prevent conversion
- **Recommendations**: Suggested actions to improve conversion

## Configuration

### Prediction Settings

Predictions are configured per Lead Scoring configuration:

- Hot threshold: 80 (default)
- Warm threshold: 50 (default)
- Cold threshold: 20 (default)

### LLM vs Rule-Based

The system automatically uses LLM predictions when available, falling back to rule-based predictions when:

- OpenAI API is unavailable
- LLM rate limits are reached
- `ruleBasedOnly: true` is specified

## Best Practices

### For Sales Teams

1. **Check ML Insights daily** to identify hot leads
2. **Act on urgent recommendations** within 24-48 hours
3. **Validate predictions** after outcomes to improve accuracy
4. **Use risk factors** to address objections proactively

### For Marketing Teams

1. **Monitor feature importance** to optimize lead gen campaigns
2. **Target high-probability segments** for campaigns
3. **Adjust nurture sequences** based on engagement patterns
4. **Track prediction accuracy** to evaluate lead quality

### For Administrators

1. **Run bulk predictions** weekly to keep rankings fresh
2. **Monitor model accuracy** and retrain when needed
3. **Review feature importance** to ensure data quality
4. **Validate predictions** systematically for feedback loop

## Troubleshooting

### Predictions Not Generating

1. Check if OpenAI API key is configured
2. Verify lead has sufficient activity data
3. Try with `ruleBasedOnly: true` to test fallback

### Low Confidence Scores

1. Ensure lead has complete profile data
2. Wait for more behavioral signals
3. Verify tracking is working correctly

### Accuracy Issues

1. Validate more predictions for training data
2. Check for data quality issues
3. Review feature extraction logs
