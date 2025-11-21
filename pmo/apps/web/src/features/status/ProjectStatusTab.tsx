import React, { useState } from 'react';

import {
  useGenerateStatusSummary,
  useProjectStatus,
  useUpdateProjectHealthStatus,
} from '../../api/queries';
import type { ProjectHealthStatus } from '../../api/projects';

interface ProjectStatusTabProps {
  projectId: number;
}

const healthStatusOptions: Array<{
  value: ProjectHealthStatus;
  label: string;
}> = [
  { value: 'ON_TRACK', label: 'On Track' },
  { value: 'AT_RISK', label: 'At Risk' },
  { value: 'OFF_TRACK', label: 'Off Track' },
];

export function ProjectStatusTab({ projectId }: ProjectStatusTabProps) {
  const {
    data: status,
    isLoading,
    error,
    refetch,
  } = useProjectStatus(projectId);
  const updateHealthMutation = useUpdateProjectHealthStatus(projectId);
  const generateSummaryMutation = useGenerateStatusSummary(projectId);

  const [formData, setFormData] = useState({
    healthStatus: status?.healthStatus || 'ON_TRACK',
    statusSummary: status?.statusSummary || '',
  });

  const [summaryRange, setSummaryRange] = useState<
    'week' | '2weeks' | 'custom'
  >('week');

  // Update form data when status data changes
  React.useEffect(() => {
    if (status) {
      setFormData({
        healthStatus: status.healthStatus,
        statusSummary: status.statusSummary || '',
      });
    }
  }, [status]);

  const handleSave = async () => {
    try {
      await updateHealthMutation.mutateAsync({
        healthStatus: formData.healthStatus,
        statusSummary: formData.statusSummary || undefined,
      });
      refetch();
      alert('Status updated successfully!');
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to update status. Please try again.');
    }
  };

  const handleReset = () => {
    if (status) {
      setFormData({
        healthStatus: status.healthStatus,
        statusSummary: status.statusSummary || '',
      });
    }
  };

  const handleGenerateSummary = async () => {
    try {
      const rangeDays = summaryRange === 'week' ? 7 : 14;
      const result = await generateSummaryMutation.mutateAsync({ rangeDays });

      // Display the markdown in an alert or modal (you can enhance this)
      const blob = new Blob([result.markdown], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `project-${projectId}-status-summary.md`;
      a.click();
      URL.revokeObjectURL(url);

      // Copy to clipboard
      navigator.clipboard.writeText(result.markdown);
      alert('Summary generated and copied to clipboard!');
    } catch (err) {
      console.error('Failed to generate summary:', err);
      alert('Failed to generate summary. Please try again.');
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading project status...</div>;
  }

  if (error) {
    return (
      <div className="p-6 text-red-600">
        Error loading project status: {(error as Error).message}
      </div>
    );
  }

  if (!status) {
    return <div className="p-6">No status data available.</div>;
  }

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Status Editor */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">
              Project Health Status
            </h3>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="healthStatus"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Status
                </label>
                <select
                  id="healthStatus"
                  value={formData.healthStatus}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      healthStatus: e.target.value as ProjectHealthStatus,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  {healthStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="statusSummary"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Status Summary
                </label>
                <textarea
                  id="statusSummary"
                  value={formData.statusSummary}
                  onChange={(e) =>
                    setFormData({ ...formData, statusSummary: e.target.value })
                  }
                  rows={4}
                  maxLength={1000}
                  placeholder="Brief summary of project status (max 1000 characters)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {formData.statusSummary.length} / 1000 characters
                </p>
              </div>

              <div className="text-sm text-gray-600">
                <strong>Last updated:</strong>{' '}
                {formatDate(status.statusUpdatedAt)}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={updateHealthMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {updateHealthMutation.isPending ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* Status Summary Helper */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">
              Status Summary Helper
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time Period
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSummaryRange('week')}
                    className={`px-3 py-1 text-sm rounded ${
                      summaryRange === 'week'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    Last 7 days
                  </button>
                  <button
                    onClick={() => setSummaryRange('2weeks')}
                    className={`px-3 py-1 text-sm rounded ${
                      summaryRange === '2weeks'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    Last 14 days
                  </button>
                </div>
              </div>

              <button
                onClick={handleGenerateSummary}
                disabled={generateSummaryMutation.isPending}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {generateSummaryMutation.isPending
                  ? 'Generating...'
                  : 'Generate & Copy Summary'}
              </button>

              <p className="text-xs text-gray-600">
                Generates a markdown summary of completed and upcoming work. The
                summary will be downloaded as a file and copied to your
                clipboard.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Metrics */}
        <div className="space-y-6">
          {/* Task Counts */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Task Status</h3>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(status.taskCounts).map(([taskStatus, count]) => (
                <div key={taskStatus} className="text-center">
                  <div className="text-2xl font-bold text-gray-800">
                    {count}
                  </div>
                  <div className="text-sm text-gray-600">{taskStatus}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Overdue Tasks */}
          {status.overdueTasks.length > 0 && (
            <div className="bg-white border border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-red-700">
                Overdue Tasks ({status.overdueTasks.length})
              </h3>
              <ul className="space-y-2">
                {status.overdueTasks.map((task) => (
                  <li key={task.id} className="text-sm">
                    <div className="font-medium">{task.title}</div>
                    <div className="text-gray-600">
                      Due: {formatDate(task.dueDate)}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Upcoming Tasks */}
          {status.upcomingTasks.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">
                Upcoming Tasks ({status.upcomingTasks.length})
              </h3>
              <ul className="space-y-2">
                {status.upcomingTasks.slice(0, 5).map((task) => (
                  <li key={task.id} className="text-sm">
                    <div className="font-medium">{task.title}</div>
                    <div className="text-gray-600">
                      Due: {formatDate(task.dueDate)}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Upcoming Milestones */}
          {status.upcomingMilestones.length > 0 && (
            <div className="bg-white border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-blue-700">
                Upcoming Milestones ({status.upcomingMilestones.length})
              </h3>
              <ul className="space-y-2">
                {status.upcomingMilestones.map((milestone) => (
                  <li key={milestone.id} className="text-sm">
                    <div className="font-medium">{milestone.name}</div>
                    <div className="text-gray-600">
                      Due: {formatDate(milestone.dueDate)}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Current Milestone */}
          {status.currentMilestone && (
            <div className="bg-white border border-green-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-green-700">
                Current Milestone
              </h3>
              <div className="text-sm">
                <div className="font-medium">
                  {status.currentMilestone.name}
                </div>
                <div className="text-gray-600">
                  Due: {formatDate(status.currentMilestone.dueDate)}
                </div>
                <div className="text-gray-600">
                  Status: {status.currentMilestone.status}
                </div>
              </div>
            </div>
          )}

          {/* Recent Risks */}
          {status.recentRisks.length > 0 && (
            <div className="bg-white border border-yellow-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-yellow-700">
                Recent Risks
              </h3>
              <ul className="space-y-2">
                {status.recentRisks.map((risk, idx) => (
                  <li key={idx} className="text-sm">
                    <div className="text-gray-700">{risk.snippet}</div>
                    <div className="text-gray-500 text-xs">
                      Meeting on {formatDate(risk.date)}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recent Decisions */}
          {status.recentDecisions.length > 0 && (
            <div className="bg-white border border-purple-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-purple-700">
                Recent Decisions
              </h3>
              <ul className="space-y-2">
                {status.recentDecisions.map((decision, idx) => (
                  <li key={idx} className="text-sm">
                    <div className="text-gray-700">{decision.snippet}</div>
                    <div className="text-gray-500 text-xs">
                      Meeting on {formatDate(decision.date)}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
