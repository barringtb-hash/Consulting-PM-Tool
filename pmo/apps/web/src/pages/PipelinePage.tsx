import React, { useMemo } from 'react';
import { Plus, DollarSign, Calendar, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useProjects } from '../api/queries';
import { PipelineStage } from '../api/projects';
import useRedirectOnUnauthorized from '../auth/useRedirectOnUnauthorized';
import { Button } from '../ui/Button';
import { PageHeader } from '../ui/PageHeader';
import { Badge } from '../ui/Badge';

interface PipelineDeal {
  id: number;
  name: string;
  clientId: number;
  clientName: string;
  pipelineStage: PipelineStage;
  pipelineValue?: number;
  probability?: number;
  expectedCloseDate?: string;
  leadSource?: string;
}

const PIPELINE_STAGES: {
  value: PipelineStage;
  label: string;
  probability: number;
}[] = [
  { value: 'NEW_LEAD', label: 'New Lead', probability: 10 },
  { value: 'DISCOVERY', label: 'Discovery', probability: 20 },
  { value: 'SHAPING_SOLUTION', label: 'Shaping Solution', probability: 40 },
  { value: 'PROPOSAL_SENT', label: 'Proposal Sent', probability: 60 },
  { value: 'NEGOTIATION', label: 'Negotiation', probability: 80 },
  { value: 'VERBAL_YES', label: 'Verbal Yes', probability: 90 },
];

function formatCurrency(value?: number): string {
  if (!value) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateString?: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface DealCardProps {
  deal: PipelineDeal;
  onClick: () => void;
}

function DealCard({ deal, onClick }: DealCardProps): JSX.Element {
  const probability =
    deal.probability ||
    PIPELINE_STAGES.find((s) => s.value === deal.pipelineStage)?.probability ||
    0;

  return (
    <div
      onClick={onClick}
      className="bg-white border border-neutral-200 rounded-lg p-4 shadow-sm hover:shadow-md cursor-pointer transition-all"
    >
      <h4 className="font-medium text-neutral-900 mb-2 line-clamp-2">
        {deal.name}
      </h4>

      <div className="text-sm text-neutral-600 mb-3">{deal.clientName}</div>

      {deal.pipelineValue && (
        <div className="flex items-center gap-2 mb-2">
          <DollarSign size={14} className="text-green-600" />
          <span className="font-semibold text-neutral-900">
            {formatCurrency(deal.pipelineValue)}
          </span>
          <Badge className="ml-auto bg-neutral-100 text-neutral-700 text-xs">
            {probability}%
          </Badge>
        </div>
      )}

      {deal.expectedCloseDate && (
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <Calendar size={12} />
          <span>{formatDate(deal.expectedCloseDate)}</span>
        </div>
      )}
    </div>
  );
}

interface PipelineColumnProps {
  stage: { value: PipelineStage; label: string; probability: number };
  deals: PipelineDeal[];
  onDealClick: (deal: PipelineDeal) => void;
}

function PipelineColumn({
  stage,
  deals,
  onDealClick,
}: PipelineColumnProps): JSX.Element {
  const totalValue = useMemo(
    () => deals.reduce((sum, deal) => sum + (deal.pipelineValue || 0), 0),
    [deals],
  );

  const weightedValue = useMemo(
    () =>
      deals.reduce(
        (sum, deal) =>
          sum +
          (deal.pipelineValue || 0) *
            ((deal.probability || stage.probability) / 100),
        0,
      ),
    [deals, stage.probability],
  );

  return (
    <div className="flex-shrink-0 w-80 bg-neutral-50 rounded-lg p-4">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-neutral-900">{stage.label}</h3>
          <Badge className="bg-primary-100 text-primary-700">
            {deals.length}
          </Badge>
        </div>
        <div className="text-xs text-neutral-600">
          <div>Total: {formatCurrency(totalValue)}</div>
          <div>Weighted: {formatCurrency(weightedValue)}</div>
        </div>
      </div>

      <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto">
        {deals.length === 0 ? (
          <div className="text-center py-8 text-sm text-neutral-400">
            No deals in this stage
          </div>
        ) : (
          deals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              onClick={() => onDealClick(deal)}
            />
          ))
        )}
      </div>
    </div>
  );
}

export function PipelinePage(): JSX.Element {
  const navigate = useNavigate();

  // Fetch projects with status = PLANNING (which includes pipeline deals)
  const projectsQuery = useProjects({ status: 'PLANNING' });

  useRedirectOnUnauthorized(projectsQuery.error);

  const pipelineDeals = useMemo<PipelineDeal[]>(() => {
    if (!projectsQuery.data) return [];

    return projectsQuery.data
      .filter(
        (project) =>
          project.status === 'PLANNING' &&
          project.pipelineStage &&
          project.pipelineStage !== 'WON' &&
          project.pipelineStage !== 'LOST',
      )
      .map((project) => ({
        id: project.id,
        name: project.name,
        clientId: project.clientId,
        clientName: '', // We'd need to join with clients to get this
        pipelineStage: project.pipelineStage as PipelineStage,
        pipelineValue: project.pipelineValue
          ? Number(project.pipelineValue)
          : undefined,
        probability: project.probability || undefined,
        expectedCloseDate: project.expectedCloseDate || undefined,
        leadSource: project.leadSource || undefined,
      }));
  }, [projectsQuery.data]);

  const dealsByStage = useMemo(() => {
    const grouped: Record<PipelineStage, PipelineDeal[]> = {
      NEW_LEAD: [],
      DISCOVERY: [],
      SHAPING_SOLUTION: [],
      PROPOSAL_SENT: [],
      NEGOTIATION: [],
      VERBAL_YES: [],
      WON: [],
      LOST: [],
    };

    pipelineDeals.forEach((deal) => {
      if (deal.pipelineStage) {
        grouped[deal.pipelineStage].push(deal);
      }
    });

    return grouped;
  }, [pipelineDeals]);

  const pipelineStats = useMemo(() => {
    const totalValue = pipelineDeals.reduce(
      (sum, deal) => sum + (deal.pipelineValue || 0),
      0,
    );

    const weightedValue = pipelineDeals.reduce((sum, deal) => {
      const probability =
        deal.probability ||
        PIPELINE_STAGES.find((s) => s.value === deal.pipelineStage)
          ?.probability ||
        0;
      return sum + (deal.pipelineValue || 0) * (probability / 100);
    }, 0);

    const avgDealSize =
      pipelineDeals.length > 0 ? totalValue / pipelineDeals.length : 0;

    return {
      totalDeals: pipelineDeals.length,
      totalValue,
      weightedValue,
      avgDealSize,
    };
  }, [pipelineDeals]);

  const handleDealClick = (deal: PipelineDeal) => {
    navigate(`/projects/${deal.id}`);
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <PageHeader
        title="Sales Pipeline"
        description="Track deals through your sales process from lead to close."
        actions={
          <Button onClick={() => navigate('/projects/new')}>
            <Plus size={16} />
            New Deal
          </Button>
        }
      />

      <main className="container-padding py-6 space-y-6">
        {/* Pipeline Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-4">
            <div className="flex items-center gap-2 text-sm text-neutral-500 mb-1">
              <TrendingUp size={16} />
              <span>Open Deals</span>
            </div>
            <div className="text-2xl font-bold text-neutral-900">
              {pipelineStats.totalDeals}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-4">
            <div className="flex items-center gap-2 text-sm text-neutral-500 mb-1">
              <DollarSign size={16} />
              <span>Total Pipeline</span>
            </div>
            <div className="text-2xl font-bold text-neutral-900">
              {formatCurrency(pipelineStats.totalValue)}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-4">
            <div className="flex items-center gap-2 text-sm text-neutral-500 mb-1">
              <DollarSign size={16} />
              <span>Weighted Pipeline</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(pipelineStats.weightedValue)}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-4">
            <div className="flex items-center gap-2 text-sm text-neutral-500 mb-1">
              <DollarSign size={16} />
              <span>Avg Deal Size</span>
            </div>
            <div className="text-2xl font-bold text-neutral-900">
              {formatCurrency(pipelineStats.avgDealSize)}
            </div>
          </div>
        </div>

        {/* Pipeline Board */}
        <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-6 overflow-x-auto">
          <div className="flex gap-4 min-w-max">
            {PIPELINE_STAGES.map((stage) => (
              <PipelineColumn
                key={stage.value}
                stage={stage}
                deals={dealsByStage[stage.value]}
                onDealClick={handleDealClick}
              />
            ))}
          </div>
        </div>

        {/* Empty State */}
        {pipelineDeals.length === 0 && (
          <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp size={32} className="text-neutral-400" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                No deals in pipeline yet
              </h3>
              <p className="text-neutral-600 mb-6">
                Get started by converting leads from your leads page or create a
                new deal directly.
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => navigate('/sales/leads')}>
                  View Leads
                </Button>
                <Button
                  variant="subtle"
                  onClick={() => navigate('/projects/new')}
                >
                  Create Deal
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default PipelinePage;
