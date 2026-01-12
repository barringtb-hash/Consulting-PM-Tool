/**
 * Project ML Tab Component
 *
 * Main ML insights tab for project dashboard showing:
 * - Success prediction
 * - Risk forecast
 * - Timeline prediction
 * - Resource optimization
 */

import React from 'react';
import {
  useSuccessPrediction,
  useRiskForecast,
  useTimelinePrediction,
  useResourceOptimization,
  useMLStatus,
  useGeneratePrediction,
} from '../../hooks/useProjectML';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Brain,
  Lightbulb,
  Calendar,
} from 'lucide-react';
import type {
  SuccessPredictionResult,
  RiskForecastResult,
  TimelinePredictionResult,
  ResourceOptimizationResult,
  PredictedRisk,
  EarlyWarningIndicator,
  DelayFactor,
  AccelerationOpportunity,
  ResourceBottleneck,
  TaskReassignment,
  CapacityForecast,
  Recommendation,
} from '../../api/project-ml';

interface ProjectMLTabProps {
  projectId: number;
}

export function ProjectMLTab({ projectId }: ProjectMLTabProps) {
  const { data: mlStatus, isLoading: statusLoading } = useMLStatus();
  const {
    data: successPrediction,
    isLoading: successLoading,
    refetch: refetchSuccess,
  } = useSuccessPrediction(projectId);
  const {
    data: riskForecast,
    isLoading: riskLoading,
    refetch: refetchRisk,
  } = useRiskForecast(projectId);
  const {
    data: timelinePrediction,
    isLoading: timelineLoading,
    refetch: refetchTimeline,
  } = useTimelinePrediction(projectId);
  const {
    data: resourceOptimization,
    isLoading: resourceLoading,
    refetch: refetchResource,
  } = useResourceOptimization(projectId);

  const _generatePrediction = useGeneratePrediction();

  const handleRefreshAll = () => {
    refetchSuccess();
    refetchRisk();
    refetchTimeline();
    refetchResource();
  };

  if (statusLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-24 bg-gray-200 rounded-lg"></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-40 bg-gray-200 rounded-lg"></div>
          <div className="h-40 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (!mlStatus?.available) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <Brain className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-yellow-800 mb-2">
          ML Features Not Available
        </h3>
        <p className="text-yellow-700">
          ML predictions require an OpenAI API key. Contact your administrator
          to enable ML features.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">ML Insights</h2>
          <p className="text-sm text-gray-500">
            AI-powered predictions and recommendations
          </p>
        </div>
        <button
          onClick={handleRefreshAll}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh All
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SuccessCard
          data={successPrediction}
          isLoading={successLoading}
          onRefresh={() => refetchSuccess()}
        />
        <RiskCard
          data={riskForecast}
          isLoading={riskLoading}
          onRefresh={() => refetchRisk()}
        />
        <TimelineCard
          data={timelinePrediction}
          isLoading={timelineLoading}
          onRefresh={() => refetchTimeline()}
        />
        <WorkloadCard
          data={resourceOptimization}
          isLoading={resourceLoading}
          onRefresh={() => refetchResource()}
        />
      </div>

      {/* Detailed Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Forecast Panel */}
        <RiskForecastPanel data={riskForecast} isLoading={riskLoading} />

        {/* Timeline Panel */}
        <TimelinePredictionPanel
          data={timelinePrediction}
          isLoading={timelineLoading}
        />
      </div>

      {/* Recommendations Panel */}
      <RecommendationsPanel
        successData={successPrediction}
        riskData={riskForecast}
        timelineData={timelinePrediction}
        resourceData={resourceOptimization}
      />

      {/* Resource Optimization Panel */}
      <ResourceOptimizationPanel
        data={resourceOptimization}
        isLoading={resourceLoading}
      />
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'green' | 'yellow' | 'red' | 'blue' | 'gray';
  isLoading?: boolean;
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  color,
  isLoading,
}: StatCardProps) {
  const colorClasses = {
    green: 'bg-green-50 text-green-700 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    gray: 'bg-gray-50 text-gray-700 border-gray-200',
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
        <div className="h-8 bg-gray-200 rounded w-16"></div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg p-4 border ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{title}</span>
        {icon}
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {subtitle && <div className="text-xs mt-1 opacity-75">{subtitle}</div>}
    </div>
  );
}

function SuccessCard({
  data,
  isLoading,
}: {
  data: SuccessPredictionResult | undefined;
  isLoading: boolean;
}) {
  if (isLoading || !data) {
    return (
      <StatCard
        title="Success Likelihood"
        value="-"
        icon={<CheckCircle className="h-5 w-5" />}
        color="gray"
        isLoading={isLoading}
      />
    );
  }

  const probability = data.overallSuccessProbability || data.probability;
  const percentage = Math.round(probability * 100);
  const color =
    percentage >= 70 ? 'green' : percentage >= 50 ? 'yellow' : 'red';

  return (
    <StatCard
      title="Success Likelihood"
      value={`${percentage}%`}
      subtitle={`Confidence: ${Math.round(data.confidence * 100)}%`}
      icon={<CheckCircle className="h-5 w-5" />}
      color={color}
    />
  );
}

function RiskCard({
  data,
  isLoading,
}: {
  data: RiskForecastResult | undefined;
  isLoading: boolean;
}) {
  if (isLoading || !data) {
    return (
      <StatCard
        title="Risk Level"
        value="-"
        icon={<AlertTriangle className="h-5 w-5" />}
        color="gray"
        isLoading={isLoading}
      />
    );
  }

  const riskColors: Record<string, 'green' | 'yellow' | 'red'> = {
    low: 'green',
    medium: 'yellow',
    high: 'red',
    critical: 'red',
  };

  return (
    <StatCard
      title="Risk Level"
      value={data.overallRiskLevel?.toUpperCase() || 'UNKNOWN'}
      subtitle={`${data.identifiedRisks?.length || 0} risks identified`}
      icon={<AlertTriangle className="h-5 w-5" />}
      color={riskColors[data.overallRiskLevel] || 'gray'}
    />
  );
}

function TimelineCard({
  data,
  isLoading,
}: {
  data: TimelinePredictionResult | undefined;
  isLoading: boolean;
}) {
  if (isLoading || !data) {
    return (
      <StatCard
        title="Timeline"
        value="-"
        icon={<Clock className="h-5 w-5" />}
        color="gray"
        isLoading={isLoading}
      />
    );
  }

  const variance = data.daysVariance;
  const color = variance <= 0 ? 'green' : variance <= 7 ? 'yellow' : 'red';
  const display =
    variance === 0
      ? 'On Track'
      : variance < 0
        ? `${Math.abs(variance)}d early`
        : `${variance}d late`;

  return (
    <StatCard
      title="Timeline"
      value={display}
      subtitle={
        data.predictedEndDate
          ? `Est. ${new Date(data.predictedEndDate).toLocaleDateString()}`
          : undefined
      }
      icon={<Clock className="h-5 w-5" />}
      color={color}
    />
  );
}

function WorkloadCard({
  data,
  isLoading,
}: {
  data: ResourceOptimizationResult | undefined;
  isLoading: boolean;
}) {
  if (isLoading || !data) {
    return (
      <StatCard
        title="Workload Balance"
        value="-"
        icon={<Users className="h-5 w-5" />}
        color="gray"
        isLoading={isLoading}
      />
    );
  }

  const balance = data.workloadBalance;
  const colorMap: Record<string, 'green' | 'yellow' | 'red' | 'blue'> = {
    excellent: 'green',
    good: 'blue',
    fair: 'yellow',
    poor: 'red',
  };

  return (
    <StatCard
      title="Workload Balance"
      value={balance?.interpretation?.toUpperCase() || 'UNKNOWN'}
      subtitle={`Score: ${Math.round((balance?.score || 0) * 100)}%`}
      icon={<Users className="h-5 w-5" />}
      color={colorMap[balance?.interpretation] || 'gray'}
    />
  );
}

function RiskForecastPanel({
  data,
  isLoading,
}: {
  data: RiskForecastResult | undefined;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-yellow-500" />
        Risk Forecast
      </h3>

      {data.identifiedRisks?.length > 0 ? (
        <div className="space-y-3">
          {data.identifiedRisks
            .slice(0, 5)
            .map((risk: PredictedRisk, index: number) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <div
                  className={`w-2 h-2 rounded-full mt-2 ${
                    risk.impact === 'critical' || risk.impact === 'high'
                      ? 'bg-red-500'
                      : risk.impact === 'medium'
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                  }`}
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{risk.title}</div>
                  <div className="text-sm text-gray-600">
                    {risk.description}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {risk.category} | {Math.round(risk.probability * 100)}%
                    probability
                  </div>
                </div>
              </div>
            ))}
        </div>
      ) : (
        <p className="text-gray-500">No significant risks identified.</p>
      )}

      {data.earlyWarningIndicators?.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Early Warning Indicators
          </h4>
          <div className="flex flex-wrap gap-2">
            {data.earlyWarningIndicators.map(
              (indicator: EarlyWarningIndicator, index: number) => (
                <span
                  key={index}
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    indicator.status === 'critical'
                      ? 'bg-red-100 text-red-700'
                      : indicator.status === 'warning'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-green-100 text-green-700'
                  }`}
                >
                  {indicator.indicator}
                </span>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TimelinePredictionPanel({
  data,
  isLoading,
}: {
  data: TimelinePredictionResult | undefined;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Calendar className="h-5 w-5 text-blue-500" />
        Timeline Prediction
      </h3>

      <div className="space-y-4">
        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-500">Planned End</div>
            <div className="font-medium">
              {data.currentEndDate
                ? new Date(data.currentEndDate).toLocaleDateString()
                : 'Not set'}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Predicted End</div>
            <div className="font-medium">
              {data.predictedEndDate
                ? new Date(data.predictedEndDate).toLocaleDateString()
                : '-'}
            </div>
          </div>
        </div>

        {/* Variance */}
        <div className="flex items-center gap-2">
          {data.daysVariance > 0 ? (
            <TrendingDown className="h-5 w-5 text-red-500" />
          ) : data.daysVariance < 0 ? (
            <TrendingUp className="h-5 w-5 text-green-500" />
          ) : (
            <Minus className="h-5 w-5 text-gray-500" />
          )}
          <span
            className={`font-medium ${
              data.daysVariance > 0
                ? 'text-red-600'
                : data.daysVariance < 0
                  ? 'text-green-600'
                  : 'text-gray-600'
            }`}
          >
            {data.daysVariance === 0
              ? 'On schedule'
              : data.daysVariance > 0
                ? `${data.daysVariance} days behind`
                : `${Math.abs(data.daysVariance)} days ahead`}
          </span>
        </div>

        {/* Delay Factors */}
        {data.delayFactors?.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Delay Factors
            </h4>
            <div className="space-y-2">
              {data.delayFactors
                .slice(0, 3)
                .map((factor: DelayFactor, index: number) => (
                  <div
                    key={index}
                    className="flex justify-between items-center text-sm"
                  >
                    <span className="text-gray-600">{factor.factor}</span>
                    <span className="text-red-600">
                      +{factor.delayDays} days
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Acceleration Opportunities */}
        {data.accelerationOpportunities?.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Speed Up Opportunities
            </h4>
            <div className="space-y-2">
              {data.accelerationOpportunities
                .slice(0, 3)
                .map((opp: AccelerationOpportunity, index: number) => (
                  <div
                    key={index}
                    className="flex justify-between items-center text-sm"
                  >
                    <span className="text-gray-600">{opp.opportunity}</span>
                    <span className="text-green-600">
                      -{opp.potentialDaysSaved} days
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RecommendationsPanel({
  successData,
  riskData,
  timelineData,
  resourceData,
}: {
  successData: SuccessPredictionResult | undefined;
  riskData: RiskForecastResult | undefined;
  timelineData: TimelinePredictionResult | undefined;
  resourceData: ResourceOptimizationResult | undefined;
}) {
  // Collect all recommendations
  const allRecommendations: Recommendation[] = [
    ...(successData?.recommendations || []),
    ...(riskData?.recommendations || []),
    ...(timelineData?.recommendations || []),
    ...(resourceData?.recommendations || []),
  ];

  // Sort by priority
  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
  const sortedRecommendations = allRecommendations
    .sort(
      (a, b) =>
        (priorityOrder[a.priority as keyof typeof priorityOrder] || 4) -
        (priorityOrder[b.priority as keyof typeof priorityOrder] || 4),
    )
    .slice(0, 6);

  if (sortedRecommendations.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Lightbulb className="h-5 w-5 text-amber-500" />
        AI Recommendations
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedRecommendations.map((rec, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border ${
              rec.priority === 'urgent'
                ? 'border-red-200 bg-red-50'
                : rec.priority === 'high'
                  ? 'border-orange-200 bg-orange-50'
                  : rec.priority === 'medium'
                    ? 'border-yellow-200 bg-yellow-50'
                    : 'border-gray-200 bg-gray-50'
            }`}
          >
            <div className="flex items-start gap-2 mb-2">
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${
                  rec.priority === 'urgent'
                    ? 'bg-red-200 text-red-800'
                    : rec.priority === 'high'
                      ? 'bg-orange-200 text-orange-800'
                      : rec.priority === 'medium'
                        ? 'bg-yellow-200 text-yellow-800'
                        : 'bg-gray-200 text-gray-800'
                }`}
              >
                {rec.priority}
              </span>
            </div>
            <h4 className="font-medium text-gray-900 mb-1">{rec.action}</h4>
            <p className="text-sm text-gray-600">{rec.rationale}</p>
            <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
              <span>Effort: {rec.effort}</span>
              <span>|</span>
              <span>{rec.timeframe}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResourceOptimizationPanel({
  data,
  isLoading,
}: {
  data: ResourceOptimizationResult | undefined;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-40 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Users className="h-5 w-5 text-purple-500" />
        Resource Optimization
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bottlenecks */}
        {data.bottlenecks?.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Identified Bottlenecks
            </h4>
            <div className="space-y-2">
              {data.bottlenecks.map(
                (bottleneck: ResourceBottleneck, index: number) => (
                  <div
                    key={index}
                    className="p-3 bg-red-50 border border-red-200 rounded-lg"
                  >
                    <div className="font-medium text-red-800">
                      {bottleneck.description}
                    </div>
                    <div className="text-sm text-red-600 mt-1">
                      Resolution: {bottleneck.resolution}
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        )}

        {/* Reassignment Suggestions */}
        {data.reassignmentSuggestions?.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Task Reassignment Suggestions
            </h4>
            <div className="space-y-2">
              {data.reassignmentSuggestions
                .slice(0, 3)
                .map((suggestion: TaskReassignment, index: number) => (
                  <div
                    key={index}
                    className="p-3 bg-blue-50 border border-blue-200 rounded-lg"
                  >
                    <div className="font-medium text-blue-800">
                      {suggestion.taskTitle || 'Task reassignment'}
                    </div>
                    <div className="text-sm text-blue-600 mt-1">
                      {suggestion.currentAssignee?.name || 'Unassigned'} {'->'}{' '}
                      {suggestion.suggestedAssignee?.name}
                    </div>
                    <div className="text-xs text-blue-500 mt-1">
                      {suggestion.reason}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Capacity Forecast */}
        {data.capacityForecast?.length > 0 && (
          <div className="md:col-span-2">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              4-Week Capacity Forecast
            </h4>
            <div className="grid grid-cols-4 gap-2">
              {data.capacityForecast.map(
                (week: CapacityForecast, index: number) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg text-center ${
                      week.status === 'over_capacity'
                        ? 'bg-red-100 text-red-800'
                        : week.status === 'balanced'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    <div className="text-xs font-medium">
                      Week {week.weekNumber}
                    </div>
                    <div className="text-lg font-bold mt-1">
                      {Math.round(
                        (week.requiredHours / week.availableHours) * 100,
                      )}
                      %
                    </div>
                    <div className="text-xs mt-1">
                      {week.status === 'over_capacity'
                        ? 'Over'
                        : week.status === 'balanced'
                          ? 'OK'
                          : 'Under'}
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProjectMLTab;
