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
    className: 'bg-green-100 border-green-500 text-green-800',
  },
  AT_RISK: {
    label: 'At Risk',
    className: 'bg-yellow-100 border-yellow-500 text-yellow-800',
  },
  OFF_TRACK: {
    label: 'Off Track',
    className: 'bg-red-100 border-red-500 text-red-800',
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
