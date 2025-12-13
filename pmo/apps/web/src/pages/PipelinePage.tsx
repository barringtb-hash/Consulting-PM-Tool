/**
 * Sales Pipeline Page
 *
 * Displays CRM opportunities in a Kanban-style pipeline view.
 * Migrated from legacy Project-based pipeline to CRM Opportunity model.
 */

import React, { useMemo, useState } from 'react';
import { Plus, DollarSign, Calendar, TrendingUp, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import {
  useOpportunities,
  usePipelineStats,
  useClosingSoon,
  type Opportunity,
} from '../api/hooks/crm';
import useRedirectOnUnauthorized from '../auth/useRedirectOnUnauthorized';
import { Button } from '../ui/Button';
import { PageHeader } from '../ui/PageHeader';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';

function formatCurrency(value?: number | null): string {
  if (!value) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateString?: string | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getStageColor(stageType: string): string {
  switch (stageType) {
    case 'WON':
      return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    case 'LOST':
      return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
    default:
      return 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300';
  }
}

interface DealCardProps {
  opportunity: Opportunity;
  onClick: () => void;
}

function DealCard({ opportunity, onClick }: DealCardProps): JSX.Element {
  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 shadow-sm hover:shadow-md cursor-pointer transition-all"
    >
      <h4 className="font-medium text-neutral-900 dark:text-neutral-100 mb-2 line-clamp-2">
        {opportunity.name}
      </h4>

      <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
        {opportunity.account?.name ?? 'No account'}
      </div>

      {opportunity.amount && (
        <div className="flex items-center gap-2 mb-2">
          <DollarSign size={14} className="text-green-600" />
          <span className="font-semibold text-neutral-900 dark:text-neutral-100">
            {formatCurrency(opportunity.amount)}
          </span>
          <Badge className="ml-auto bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs">
            {opportunity.probability}%
          </Badge>
        </div>
      )}

      {opportunity.expectedCloseDate && (
        <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <Calendar size={12} />
          <span>{formatDate(opportunity.expectedCloseDate)}</span>
        </div>
      )}
    </div>
  );
}

interface PipelineColumnProps {
  stageName: string;
  stageType: string;
  opportunities: Opportunity[];
  totalValue: number;
  weightedValue: number;
  onDealClick: (opportunity: Opportunity) => void;
}

function PipelineColumn({
  stageName,
  stageType,
  opportunities,
  totalValue,
  weightedValue,
  onDealClick,
}: PipelineColumnProps): JSX.Element {
  return (
    <div className="flex-shrink-0 w-80 bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
            {stageName}
          </h3>
          <Badge className={getStageColor(stageType)}>
            {opportunities.length}
          </Badge>
        </div>
        <div className="text-xs text-neutral-600 dark:text-neutral-400">
          <div>Total: {formatCurrency(totalValue)}</div>
          <div>Weighted: {formatCurrency(weightedValue)}</div>
        </div>
      </div>

      <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto">
        {opportunities.length === 0 ? (
          <div className="text-center py-8 text-sm text-neutral-400 dark:text-neutral-500">
            No deals in this stage
          </div>
        ) : (
          opportunities.map((opp) => (
            <DealCard
              key={opp.id}
              opportunity={opp}
              onClick={() => onDealClick(opp)}
            />
          ))
        )}
      </div>
    </div>
  );
}

export function PipelinePage(): JSX.Element {
  const navigate = useNavigate();
  const [showClosedDeals, setShowClosedDeals] = useState(false);

  // Fetch CRM opportunities (exclude archived)
  const opportunitiesQuery = useOpportunities({ archived: false });
  const pipelineStatsQuery = usePipelineStats();
  const closingSoonQuery = useClosingSoon(7);

  useRedirectOnUnauthorized(opportunitiesQuery.error);

  const opportunities = useMemo(
    () => opportunitiesQuery.data?.data ?? [],
    [opportunitiesQuery.data],
  );

  const stats = pipelineStatsQuery.data;
  const closingSoon = closingSoonQuery.data ?? [];

  // Group opportunities by stage
  const opportunitiesByStage = useMemo(() => {
    const grouped: Record<number, Opportunity[]> = {};

    opportunities.forEach((opp) => {
      if (!grouped[opp.stageId]) {
        grouped[opp.stageId] = [];
      }
      grouped[opp.stageId].push(opp);
    });

    return grouped;
  }, [opportunities]);

  // Filter stages based on showClosedDeals toggle
  const visibleStages = useMemo(() => {
    if (!stats?.byStage) return [];

    if (showClosedDeals) {
      return stats.byStage;
    }

    // Only show OPEN stages
    return stats.byStage.filter((stage) => stage.stageType === 'OPEN');
  }, [stats?.byStage, showClosedDeals]);

  const handleDealClick = (opportunity: Opportunity) => {
    navigate(`/crm/opportunities/${opportunity.id}`);
  };

  const isLoading =
    opportunitiesQuery.isLoading || pipelineStatsQuery.isLoading;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <PageHeader
        title="Sales Pipeline"
        description="Track deals through your sales process from lead to close."
        actions={
          <Button onClick={() => navigate('/crm/opportunities/new')}>
            <Plus size={16} />
            New Deal
          </Button>
        }
      />

      <main className="container-padding py-6 space-y-6">
        {/* Pipeline Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 mb-1">
                <TrendingUp size={16} />
                <span>Open Deals</span>
              </div>
              <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                {stats.byStage
                  .filter((s) => s.stageType === 'OPEN')
                  .reduce((sum, s) => sum + s.count, 0)}
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 mb-1">
                <DollarSign size={16} />
                <span>Total Pipeline</span>
              </div>
              <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                {formatCurrency(stats.totalValue)}
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 mb-1">
                <DollarSign size={16} />
                <span>Weighted Pipeline</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.weightedValue)}
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 mb-1">
                <Target size={16} />
                <span>Win Rate</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {(stats.winRate * 100).toFixed(1)}%
              </div>
            </Card>
          </div>
        )}

        {/* Closing Soon Alert */}
        {closingSoon.length > 0 && (
          <Card className="p-4 border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-700">
            <h3 className="font-medium mb-3 text-yellow-800 dark:text-yellow-200">
              Closing This Week ({closingSoon.length} deals)
            </h3>
            <div className="flex flex-wrap gap-2">
              {closingSoon.slice(0, 5).map((opp) => (
                <div
                  key={opp.id}
                  onClick={() => navigate(`/crm/opportunities/${opp.id}`)}
                  className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-neutral-800 rounded-lg border border-yellow-200 dark:border-yellow-700 cursor-pointer hover:shadow-sm transition-shadow"
                >
                  <span className="font-medium text-sm">{opp.name}</span>
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">
                    {formatCurrency(opp.amount)}
                  </span>
                  <Badge variant="warning">
                    {opp.daysUntilClose} day
                    {opp.daysUntilClose !== 1 ? 's' : ''}
                  </Badge>
                </div>
              ))}
              {closingSoon.length > 5 && (
                <span className="text-sm text-yellow-700 dark:text-yellow-300 self-center">
                  +{closingSoon.length - 5} more
                </span>
              )}
            </div>
          </Card>
        )}

        {/* Toggle for showing Won/Lost stages */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showClosedDeals}
              onChange={(e) => setShowClosedDeals(e.target.checked)}
              className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
            />
            Show Won/Lost stages
          </label>
        </div>

        {/* Pipeline Board */}
        <Card className="p-6 overflow-x-auto">
          {isLoading ? (
            <div className="text-center py-12 text-neutral-500">
              Loading pipeline...
            </div>
          ) : visibleStages.length === 0 ? (
            <div className="text-center py-12 text-neutral-500">
              No pipeline stages configured. Please contact your administrator.
            </div>
          ) : (
            <div className="flex gap-4 min-w-max">
              {visibleStages.map((stage) => (
                <PipelineColumn
                  key={stage.stageId}
                  stageName={stage.stageName}
                  stageType={stage.stageType}
                  opportunities={opportunitiesByStage[stage.stageId] ?? []}
                  totalValue={stage.value}
                  weightedValue={stage.weightedValue}
                  onDealClick={handleDealClick}
                />
              ))}
            </div>
          )}
        </Card>

        {/* Empty State */}
        {!isLoading && opportunities.length === 0 && (
          <Card className="p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp
                  size={32}
                  className="text-neutral-400 dark:text-neutral-500"
                />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                No opportunities in pipeline yet
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                Get started by creating a new opportunity from an account or
                directly here.
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => navigate('/crm/accounts')}>
                  View Accounts
                </Button>
                <Button
                  variant="subtle"
                  onClick={() => navigate('/crm/opportunities/new')}
                >
                  Create Opportunity
                </Button>
              </div>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}

export default PipelinePage;
