/**
 * CRM Opportunities Page
 *
 * Displays a pipeline view of CRM opportunities with stats and filtering.
 */

import React, { useMemo, useState } from 'react';
import { TrendingUp, DollarSign, Target, Clock, Search } from 'lucide-react';

import {
  useOpportunities,
  usePipelineStats,
  useClosingSoon,
  type Opportunity,
} from '../../api/hooks/crm';
import useRedirectOnUnauthorized from '../../auth/useRedirectOnUnauthorized';
import { Badge } from '../../ui/Badge';
import { Card } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { PageHeader } from '../../ui/PageHeader';
import { Select } from '../../ui/Select';
import { EMPTY_STATES } from '../../utils/typography';

interface Filters {
  search: string;
  stageType: '' | 'OPEN' | 'WON' | 'LOST';
}

function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getStageVariant(
  stageType: string,
): 'default' | 'success' | 'warning' | 'destructive' {
  switch (stageType) {
    case 'WON':
      return 'success';
    case 'LOST':
      return 'destructive';
    default:
      return 'default';
  }
}

function OpportunitiesPage(): JSX.Element {
  const [filters, setFilters] = useState<Filters>({
    search: '',
    stageType: '',
  });

  const filterParams = useMemo(
    () => ({
      search: filters.search || undefined,
    }),
    [filters.search],
  );

  const opportunitiesQuery = useOpportunities(filterParams);
  const statsQuery = usePipelineStats();
  const closingSoonQuery = useClosingSoon(7);

  useRedirectOnUnauthorized(opportunitiesQuery.error);

  const opportunities = useMemo(() => {
    const data = opportunitiesQuery.data?.data ?? [];
    if (!filters.stageType) return data;
    return data.filter((opp) => opp.stage?.stageType === filters.stageType);
  }, [opportunitiesQuery.data, filters.stageType]);

  const stats = statsQuery.data;
  const closingSoon = closingSoonQuery.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Opportunities"
        description="Manage your sales pipeline and deals"
      />

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <DollarSign className="h-4 w-4" />
              Pipeline Value
            </div>
            <div className="text-2xl font-semibold">
              {formatCurrency(stats.totalValue)}
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <TrendingUp className="h-4 w-4" />
              Weighted Value
            </div>
            <div className="text-2xl font-semibold text-green-600">
              {formatCurrency(stats.weightedValue)}
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Target className="h-4 w-4" />
              Win Rate
            </div>
            <div className="text-2xl font-semibold text-blue-600">
              {(stats.winRate * 100).toFixed(1)}%
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="h-4 w-4" />
              Avg Deal Size
            </div>
            <div className="text-2xl font-semibold">
              {formatCurrency(stats.averageDealSize)}
            </div>
          </Card>
        </div>
      )}

      {/* Closing Soon */}
      {closingSoon.length > 0 && (
        <Card className="p-4">
          <h3 className="font-medium mb-3">Closing This Week</h3>
          <div className="flex flex-wrap gap-2">
            {closingSoon.map((opp) => (
              <div
                key={opp.id}
                className="flex items-center gap-2 px-3 py-2 bg-yellow-50 rounded-lg border border-yellow-200"
              >
                <span className="font-medium">{opp.name}</span>
                <span className="text-sm text-gray-600">
                  {formatCurrency(opp.amount)}
                </span>
                <Badge variant="warning">
                  {opp.daysUntilClose} day{opp.daysUntilClose !== 1 ? 's' : ''}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
                placeholder="Search opportunities..."
                className="pl-10"
              />
            </div>
          </div>
          <Select
            value={filters.stageType}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                stageType: e.target.value as Filters['stageType'],
              }))
            }
          >
            <option value="">All Stages</option>
            <option value="OPEN">Open</option>
            <option value="WON">Won</option>
            <option value="LOST">Lost</option>
          </Select>
        </div>
      </Card>

      {/* Pipeline by Stage */}
      {stats && (
        <Card className="p-4">
          <h3 className="font-medium mb-4">Pipeline by Stage</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {stats.byStage.map((stage) => (
              <div
                key={stage.stageId}
                className="p-3 bg-gray-50 rounded-lg border"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{stage.stageName}</span>
                  <Badge variant={getStageVariant(stage.stageType)}>
                    {stage.count}
                  </Badge>
                </div>
                <div className="text-lg font-semibold">
                  {formatCurrency(stage.value)}
                </div>
                <div className="text-xs text-gray-500">
                  Weighted: {formatCurrency(stage.weightedValue)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Opportunities List */}
      <Card>
        {opportunitiesQuery.isLoading ? (
          <div className="p-8 text-center text-gray-500">
            Loading opportunities...
          </div>
        ) : opportunities.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {filters.search || filters.stageType
              ? 'No opportunities match your filters'
              : EMPTY_STATES.opportunities}
          </div>
        ) : (
          <div className="divide-y">
            {opportunities.map((opportunity) => (
              <OpportunityRow key={opportunity.id} opportunity={opportunity} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

interface OpportunityRowProps {
  opportunity: Opportunity;
}

function OpportunityRow({ opportunity }: OpportunityRowProps): JSX.Element {
  return (
    <div className="flex items-center justify-between p-4 hover:bg-gray-50">
      <div className="flex-1">
        <div className="font-medium">{opportunity.name}</div>
        <div className="text-sm text-gray-500">
          {opportunity.account?.name ?? 'No account'} •{' '}
          {opportunity._count?.contacts ?? 0} contacts
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="text-right">
          <div className="font-semibold">
            {formatCurrency(opportunity.amount)}
          </div>
          <div className="text-xs text-gray-500">
            {opportunity.probability}% probability
          </div>
        </div>
        {opportunity.stage && (
          <Badge variant={getStageVariant(opportunity.stage.stageType)}>
            {opportunity.stage.name}
          </Badge>
        )}
        <div className="text-sm text-gray-500 min-w-[100px] text-right">
          {opportunity.expectedCloseDate
            ? `Close: ${formatDate(opportunity.expectedCloseDate)}`
            : 'No close date'}
        </div>
      </div>
    </div>
  );
}

export default OpportunitiesPage;
