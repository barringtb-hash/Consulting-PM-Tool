import React from 'react';

import type { ProjectHealthStatus } from '../api/projects';

interface ProjectStatusPillProps {
  healthStatus?: ProjectHealthStatus;
  statusSummary?: string | null;
  statusUpdatedAt?: string | null;
  className?: string;
}

const healthStatusConfig = {
  ON_TRACK: {
    label: 'On Track',
    className: 'bg-success-100 border-success-500 text-success-800',
  },
  AT_RISK: {
    label: 'At Risk',
    className: 'bg-warning-100 border-warning-500 text-warning-800',
  },
  OFF_TRACK: {
    label: 'Off Track',
    className: 'bg-danger-100 border-danger-500 text-danger-800',
  },
};

export function ProjectStatusPill({
  healthStatus = 'ON_TRACK',
  statusSummary,
  statusUpdatedAt,
  className = '',
}: ProjectStatusPillProps) {
  const config = healthStatusConfig[healthStatus];

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const tooltipContent = [
    statusSummary,
    statusUpdatedAt ? `Updated: ${formatDate(statusUpdatedAt)}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.className} ${className}`}
      title={tooltipContent}
    >
      {config.label}
    </span>
  );
}
