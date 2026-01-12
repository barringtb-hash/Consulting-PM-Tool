/**
 * Project ML Prompts
 *
 * LLM prompt templates for all Project ML predictions.
 * Follows patterns from customer-success-ml prompts.
 *
 * @module project-ml/prompts
 */

// ============================================================================
// System Prompts
// ============================================================================

/**
 * System prompt establishing the ML analyst role
 */
export const PROJECT_ML_SYSTEM_PROMPT = `You are an expert project management analyst specializing in project health prediction, risk forecasting, timeline analysis, and resource optimization.

You analyze project data to:
- Predict likelihood of successful project completion
- Identify potential risks and delays before they occur
- Forecast realistic completion timelines
- Optimize resource allocation and team workload

Your analysis should be:
- Data-driven: Base conclusions on the metrics provided
- Specific: Reference actual values, dates, and team metrics
- Actionable: Provide clear, implementable recommendations
- Calibrated: Acknowledge uncertainty with confidence scores

Always respond with valid JSON matching the requested schema exactly.`;

// ============================================================================
// Success Prediction Prompts
// ============================================================================

/**
 * Prompt for success prediction analysis
 */
export const SUCCESS_PREDICTION_PROMPT = `Analyze this project and predict the likelihood of successful completion.

## PROJECT CONTEXT
{projectContext}

## TASK
Predict the probability this project will be completed successfully (on-time and within scope) within the next {predictionWindow} days.

Consider:
- Task completion velocity and trends
- Milestone progress and delays
- Team workload and capacity
- Blocked tasks and bottlenecks
- Historical performance patterns

Respond with JSON matching this exact schema:
{
  "onTimeProbability": <number 0-1: probability of on-time completion>,
  "onBudgetProbability": <number 0-1: probability of staying within scope/budget>,
  "overallSuccessProbability": <number 0-1: combined success probability>,
  "confidence": <number 0-1: your confidence in this prediction>,
  "successFactors": [
    {
      "factor": "<positive indicator name>",
      "weight": <number 0-1: contribution to success>,
      "description": "<why this matters>"
    }
  ],
  "riskFactors": [
    {
      "factor": "<risk indicator name>",
      "impact": "<critical|high|medium|low>",
      "currentValue": "<current state>",
      "threshold": "<concerning threshold>",
      "trend": "<improving|stable|worsening>",
      "description": "<explanation>"
    }
  ],
  "explanation": "<2-3 sentence summary of prediction>",
  "recommendations": [
    {
      "priority": "<urgent|high|medium|low>",
      "action": "<specific action to take>",
      "rationale": "<why this helps>",
      "expectedImpact": "<outcome if implemented>",
      "effort": "<low|medium|high>",
      "timeframe": "<when to do this>"
    }
  ]
}`;

// ============================================================================
// Risk Forecast Prompts
// ============================================================================

/**
 * Prompt for risk forecasting analysis
 */
export const RISK_FORECAST_PROMPT = `Analyze this project and forecast potential risks and delays.

## PROJECT CONTEXT
{projectContext}

## TASK
Identify potential risks that could impact this project within the next {predictionWindow} days.

Consider:
- Schedule risks from task delays and blocked items
- Resource risks from workload imbalances
- Scope risks from uncontrolled changes
- Technical risks from complexity
- External dependencies

Respond with JSON matching this exact schema:
{
  "overallRiskLevel": "<critical|high|medium|low>",
  "delayProbability": <number 0-1: probability of significant delay>,
  "estimatedDelayDays": <number: expected delay in days if risks materialize>,
  "confidence": <number 0-1: your confidence in this forecast>,
  "identifiedRisks": [
    {
      "category": "<scope|schedule|resource|technical|budget|external>",
      "title": "<short risk title>",
      "description": "<detailed description>",
      "probability": <number 0-1: likelihood of occurrence>,
      "impact": "<critical|high|medium|low>",
      "mitigationSuggestion": "<how to mitigate>",
      "triggerIndicators": ["<warning sign 1>", "<warning sign 2>"]
    }
  ],
  "earlyWarningIndicators": [
    {
      "indicator": "<what to watch>",
      "status": "<normal|warning|critical>",
      "description": "<what it means>",
      "threshold": "<when to be concerned>"
    }
  ],
  "riskFactors": [
    {
      "factor": "<contributing factor>",
      "impact": "<critical|high|medium|low>",
      "currentValue": "<current state>",
      "trend": "<improving|stable|worsening>",
      "description": "<explanation>"
    }
  ],
  "explanation": "<2-3 sentence summary of risk forecast>",
  "recommendations": [
    {
      "priority": "<urgent|high|medium|low>",
      "action": "<specific action>",
      "rationale": "<why this helps>",
      "expectedImpact": "<outcome>",
      "effort": "<low|medium|high>",
      "timeframe": "<when>"
    }
  ]
}`;

// ============================================================================
// Timeline Prediction Prompts
// ============================================================================

/**
 * Prompt for timeline prediction analysis
 */
export const TIMELINE_PREDICTION_PROMPT = `Analyze this project and predict the realistic completion timeline.

## PROJECT CONTEXT
{projectContext}

## TASK
Predict when this project will actually be completed based on current progress and trends.

Consider:
- Current velocity vs required velocity
- Remaining work estimation
- Historical completion patterns
- Known blockers and risks
- Team capacity

Respond with JSON matching this exact schema:
{
  "predictedEndDate": "<ISO date string: predicted completion date>",
  "daysVariance": <number: days early (negative) or late (positive) vs planned>,
  "confidence": <number 0-1: your confidence in this prediction>,
  "confidenceInterval": {
    "optimistic": "<ISO date: best case completion>",
    "pessimistic": "<ISO date: worst case completion>"
  },
  "delayFactors": [
    {
      "factor": "<what's causing delay>",
      "delayDays": <number: days this adds>,
      "confidence": <number 0-1: confidence in this estimate>,
      "description": "<explanation>"
    }
  ],
  "accelerationOpportunities": [
    {
      "opportunity": "<what could speed things up>",
      "potentialDaysSaved": <number: days that could be saved>,
      "effort": "<low|medium|high>",
      "prerequisites": ["<what needs to happen first>"]
    }
  ],
  "riskFactors": [
    {
      "factor": "<timeline risk>",
      "impact": "<critical|high|medium|low>",
      "currentValue": "<current state>",
      "trend": "<improving|stable|worsening>",
      "description": "<explanation>"
    }
  ],
  "explanation": "<2-3 sentence summary of timeline prediction>",
  "recommendations": [
    {
      "priority": "<urgent|high|medium|low>",
      "action": "<specific action>",
      "rationale": "<why>",
      "expectedImpact": "<outcome>",
      "effort": "<low|medium|high>",
      "timeframe": "<when>"
    }
  ]
}`;

// ============================================================================
// Resource Optimization Prompts
// ============================================================================

/**
 * Prompt for resource optimization analysis
 */
export const RESOURCE_OPTIMIZATION_PROMPT = `Analyze this project's resource allocation and suggest optimizations.

## PROJECT CONTEXT
{projectContext}

## TEAM WORKLOAD DETAILS
{workloadDetails}

## TASK
Analyze the team's workload distribution and suggest optimizations to improve efficiency and balance.

Consider:
- Current workload distribution
- Task assignments and skill matching
- Bottlenecks and blockers
- Upcoming capacity needs
- Team member availability

Respond with JSON matching this exact schema:
{
  "workloadBalance": {
    "score": <number 0-1: balance score, 1 = perfectly balanced>,
    "interpretation": "<excellent|good|fair|poor>",
    "mostOverloaded": {
      "userId": <number>,
      "name": "<name>",
      "taskCount": <number>
    } | null,
    "mostUnderloaded": {
      "userId": <number>,
      "name": "<name>",
      "taskCount": <number>
    } | null
  },
  "confidence": <number 0-1: your confidence in suggestions>,
  "reassignmentSuggestions": [
    {
      "taskId": <number: task to reassign>,
      "taskTitle": "<task name>",
      "currentAssignee": { "userId": <number>, "name": "<name>" } | null,
      "suggestedAssignee": { "userId": <number>, "name": "<name>" },
      "reason": "<why this reassignment>",
      "expectedImpact": "<what improves>",
      "confidence": <number 0-1: confidence in this suggestion>
    }
  ],
  "bottlenecks": [
    {
      "type": "<overloaded_member|skill_gap|dependency_chain|unassigned_tasks>",
      "description": "<what's the bottleneck>",
      "severity": "<critical|high|medium|low>",
      "affectedItems": ["<task or member names>"],
      "resolution": "<how to fix>"
    }
  ],
  "capacityForecast": [
    {
      "weekNumber": <1-4>,
      "weekStart": "<ISO date>",
      "availableHours": <number>,
      "requiredHours": <number>,
      "status": "<under_capacity|balanced|over_capacity>"
    }
  ],
  "riskFactors": [
    {
      "factor": "<resource risk>",
      "impact": "<critical|high|medium|low>",
      "currentValue": "<current state>",
      "trend": "<improving|stable|worsening>",
      "description": "<explanation>"
    }
  ],
  "explanation": "<2-3 sentence summary of resource analysis>",
  "recommendations": [
    {
      "priority": "<urgent|high|medium|low>",
      "action": "<specific action>",
      "rationale": "<why>",
      "expectedImpact": "<outcome>",
      "effort": "<low|medium|high>",
      "timeframe": "<when>"
    }
  ]
}`;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format project context for LLM consumption
 */
export function formatProjectContext(contextString: string): string {
  return contextString;
}

/**
 * Format workload details for resource optimization
 */
export function formatWorkloadDetails(
  workloadDistribution: Array<{
    userId: number;
    name: string;
    taskCount: number;
    inProgressCount: number;
    estimatedHours: number;
    overdueCount: number;
  }>,
): string {
  if (workloadDistribution.length === 0) {
    return 'No team members assigned to project.';
  }

  return workloadDistribution
    .map(
      (w) =>
        `- ${w.name} (ID: ${w.userId}): ${w.taskCount} tasks total, ${w.inProgressCount} in progress, ${w.estimatedHours}h estimated, ${w.overdueCount} overdue`,
    )
    .join('\n');
}

/**
 * Fill template with values
 */
export function fillTemplate(
  template: string,
  values: Record<string, string | number>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(values)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
  }
  return result;
}
