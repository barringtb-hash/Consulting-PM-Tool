/**
 * Project AI Scheduling Tab
 *
 * AI-powered auto-scheduling for project tasks.
 * Embedded in the Project Dashboard.
 */

import React, { useState, useCallback } from 'react';
import {
  RefreshCw,
  Calendar,
  Loader2,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { useToast } from '../../ui/Toast';
import {
  useGenerateSchedule,
  useApplySchedule,
  type ScheduleResult,
} from '../../api/hooks/ai-projects';

interface ProjectAISchedulingTabProps {
  projectId: number;
}

export function ProjectAISchedulingTab({
  projectId,
}: ProjectAISchedulingTabProps): JSX.Element {
  const [generatedSchedule, setGeneratedSchedule] =
    useState<ScheduleResult | null>(null);
  const { showToast } = useToast();

  // Mutations
  const generateScheduleMutation = useGenerateSchedule();
  const applyScheduleMutation = useApplySchedule();

  // Handle generate schedule
  const handleGenerateSchedule = useCallback(async () => {
    try {
      const schedule = await generateScheduleMutation.mutateAsync(projectId);
      setGeneratedSchedule(schedule);
      showToast('Schedule generated successfully', 'success');
    } catch (_error) {
      showToast('Failed to generate schedule', 'error');
    }
  }, [projectId, generateScheduleMutation, showToast]);

  // Handle apply schedule
  const handleApplySchedule = useCallback(async () => {
    if (!generatedSchedule) return;

    try {
      await applyScheduleMutation.mutateAsync({
        projectId,
        scheduleId: generatedSchedule.id,
      });
      showToast('Schedule applied successfully', 'success');
      setGeneratedSchedule(null);
    } catch (_error) {
      showToast('Failed to apply schedule', 'error');
    }
  }, [projectId, generatedSchedule, applyScheduleMutation, showToast]);

  return (
    <div className="space-y-6">
      {/* Main Scheduling Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-500" />
              <h3 className="font-semibold">AI Auto-Scheduling</h3>
            </div>
            <Button
              onClick={handleGenerateSchedule}
              disabled={generateScheduleMutation.isPending}
            >
              {generateScheduleMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Generate Schedule
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">
            AI will analyze task dependencies, team capacity, and project
            constraints to generate an optimal schedule for your tasks.
          </p>

          {!generatedSchedule && !generateScheduleMutation.isPending && (
            <div className="text-center py-8 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
              <Calendar className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
              <p className="text-neutral-500">
                Click &ldquo;Generate Schedule&rdquo; to create an AI-optimized
                task schedule
              </p>
            </div>
          )}

          {generateScheduleMutation.isPending && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-3" />
              <p className="text-neutral-600 dark:text-neutral-400">
                Analyzing tasks and generating optimal schedule...
              </p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Generated Schedule Results */}
      {generatedSchedule && (
        <>
          {/* Summary */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Generated Schedule</h3>
                <Button
                  onClick={handleApplySchedule}
                  disabled={applyScheduleMutation.isPending}
                >
                  {applyScheduleMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Apply Schedule
                </Button>
              </div>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {generatedSchedule.scheduledTasks.length}
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Tasks Scheduled
                  </p>
                </div>
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-center">
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {generatedSchedule.criticalPath?.length || 0}
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Critical Path Tasks
                  </p>
                </div>
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {generatedSchedule.conflicts?.length || 0}
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    Conflicts
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Scheduled Tasks */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold">Scheduled Tasks</h3>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                {generatedSchedule.scheduledTasks.map((task) => (
                  <div
                    key={task.taskId}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      task.isCriticalPath
                        ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                        : 'bg-neutral-50 dark:bg-neutral-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium">{task.taskTitle}</p>
                        <div className="flex items-center gap-2 text-sm text-neutral-500">
                          <Clock className="w-3 h-3" />
                          {task.suggestedStartDate &&
                            new Date(
                              task.suggestedStartDate,
                            ).toLocaleDateString()}{' '}
                          -{' '}
                          {task.suggestedEndDate &&
                            new Date(
                              task.suggestedEndDate,
                            ).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {task.isCriticalPath && (
                        <Badge variant="warning">Critical Path</Badge>
                      )}
                      {task.estimatedDuration && (
                        <Badge variant="secondary">
                          {task.estimatedDuration}h
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* Conflicts */}
          {generatedSchedule.conflicts &&
            generatedSchedule.conflicts.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <h3 className="font-semibold">Scheduling Conflicts</h3>
                  </div>
                </CardHeader>
                <CardBody>
                  <ul className="space-y-2">
                    {generatedSchedule.conflicts.map((conflict, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg"
                      >
                        <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-red-800 dark:text-red-300">
                            {conflict.type}
                          </p>
                          <p className="text-sm text-red-600 dark:text-red-400">
                            {conflict.description}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            )}

          {/* Warnings */}
          {generatedSchedule.warnings &&
            generatedSchedule.warnings.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    <h3 className="font-semibold">Warnings</h3>
                  </div>
                </CardHeader>
                <CardBody>
                  <ul className="space-y-2">
                    {generatedSchedule.warnings.map((warning, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg"
                      >
                        <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                          {warning.message || warning}
                        </p>
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            )}
        </>
      )}
    </div>
  );
}

export default ProjectAISchedulingTab;
