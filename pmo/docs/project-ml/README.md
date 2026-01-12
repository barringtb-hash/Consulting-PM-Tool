# Project ML Module

The Project ML module adds machine learning capabilities to project management, providing predictive analytics for project success, risk forecasting, timeline prediction, and resource optimization.

## Features

### 1. Success Prediction

Predicts the likelihood of successful project completion based on:

- Task completion rates and velocity
- Milestone achievement patterns
- Team workload distribution
- Historical performance metrics

### 2. Risk Forecasting

Identifies potential project risks and early warning indicators:

- Schedule risk assessment
- Resource bottleneck detection
- Scope creep indicators
- Team capacity concerns

### 3. Timeline Prediction

Provides realistic completion date estimates:

- Velocity-based projections
- Confidence intervals
- Delay factor analysis
- Acceleration opportunities

### 4. Resource Optimization

Analyzes and optimizes team workload:

- Workload balance scoring
- Task reassignment suggestions
- Capacity forecasting
- Bottleneck identification

## Architecture

The module uses a hybrid approach:

- **LLM-Powered Analysis**: Uses OpenAI GPT-4 for intelligent, context-aware predictions
- **Rule-Based Fallback**: Provides predictions when LLM is unavailable

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed technical documentation.

## API Endpoints

See [API.md](./API.md) for complete API documentation.

## Quick Start

### Enable the Module

The `projectML` module is a toggleable feature. Enable it via environment variable or tenant configuration:

```env
# In pmo/apps/api/.env
ENABLED_MODULES=dashboard,tasks,clients,projects,projectML
```

Or via per-tenant configuration in the database.

### Access ML Insights

1. Navigate to any project dashboard
2. Click the "ML Insights" tab
3. View predictions and recommendations

### Generate Predictions

Predictions are generated automatically when viewing the ML tab. You can also trigger them via API:

```bash
POST /api/projects/:projectId/ml/predict
{
  "predictionType": "SUCCESS_PREDICTION",
  "options": {
    "forceRefresh": true,
    "predictionWindowDays": 90
  }
}
```

## Configuration

### Environment Variables

```env
# OpenAI API key for LLM predictions
OPENAI_API_KEY=sk-...

# Optional: Override default prediction settings
PROJECT_ML_DEFAULT_WINDOW_DAYS=90
PROJECT_ML_PREDICTION_VALIDITY_DAYS=7
```

### Module Configuration

```typescript
// In packages/modules/index.ts
projectML: {
  id: 'projectML',
  label: 'Project ML Insights',
  navGroup: 'aiTools',
  path: '/projects/:id',
  icon: 'Brain',
  isCore: false,
  dependencies: ['projects'],
  apiPrefixes: ['/api/projects/:projectId/ml', '/api/projects/portfolio/ml'],
  showInNavigation: false,
}
```

## Dependencies

- **projects**: Core project module (required)
- **OpenAI API**: For LLM-powered predictions (optional - falls back to rule-based)

## UI Components

### ProjectMLTab

Main tab component displaying all ML insights:

- Success likelihood card
- Risk level indicator
- Timeline prediction
- Workload balance
- AI recommendations panel
- Risk forecast panel
- Resource optimization panel

## Prediction Accuracy

The system tracks prediction accuracy over time:

- Predictions are validated against actual outcomes
- Accuracy metrics available via `/api/projects/portfolio/ml/accuracy`
- Continuous improvement through feedback loop

## Limitations

- Predictions require sufficient project data (tasks, milestones, team)
- LLM predictions require API key and network connectivity
- Rule-based fallback provides simpler heuristic analysis
- Predictions are estimates, not guarantees

## Related Documentation

- [API Reference](./API.md)
- [Architecture Guide](./ARCHITECTURE.md)
- [Module System Guide](/Docs/MODULES.md)
