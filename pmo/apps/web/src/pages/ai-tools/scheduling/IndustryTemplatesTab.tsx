/**
 * Industry Templates Tab
 * UI for selecting and applying industry-specific scheduling templates
 */

import { useState } from 'react';
import {
  Building2,
  Stethoscope,
  Briefcase,
  Home,
  Sparkles,
  UtensilsCrossed,
  Check,
  Clock,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Card, Button, Badge } from '../../../ui';
import {
  useTemplates,
  useTemplatePreview,
  useApplyTemplate,
  useAppliedTemplate,
  useCompareWithTemplate,
  useResetToTemplate,
  type TemplateSimplified,
} from '../../../api/hooks/scheduling';

interface IndustryTemplatesTabProps {
  clientId: number;
}

const categoryIcons: Record<string, React.ElementType> = {
  healthcare: Stethoscope,
  professional: Briefcase,
  home_services: Home,
  beauty: Sparkles,
  restaurant: UtensilsCrossed,
};

const categoryColors: Record<string, string> = {
  healthcare:
    'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  professional:
    'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  home_services:
    'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  beauty: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400',
  restaurant: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

export function IndustryTemplatesTab({
  clientId,
}: IndustryTemplatesTabProps): JSX.Element {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );
  const [showComparison, setShowComparison] = useState(false);

  // Fetch templates
  const templatesQuery = useTemplates();
  const templates = templatesQuery.data ?? [];

  // Fetch currently applied template
  const appliedQuery = useAppliedTemplate(clientId);
  const appliedTemplate = appliedQuery.data;

  // Preview selected template
  const previewQuery = useTemplatePreview(selectedTemplateId ?? '');
  const preview = previewQuery.data;

  // Compare with template (only when showing comparison)
  const compareQuery = useCompareWithTemplate(
    clientId,
    selectedTemplateId ?? '',
    { enabled: showComparison && !!selectedTemplateId },
  );
  const comparison = compareQuery.data;

  // Mutations
  const applyMutation = useApplyTemplate();
  const resetMutation = useResetToTemplate();

  const handleApplyTemplate = async () => {
    if (!selectedTemplateId) return;

    await applyMutation.mutateAsync({
      clientId,
      templateId: selectedTemplateId,
    });
    setSelectedTemplateId(null);
  };

  const handleResetTemplate = async () => {
    if (!appliedTemplate) return;

    await resetMutation.mutateAsync({
      clientId,
      templateId: appliedTemplate.id,
    });
  };

  const getCategoryIcon = (category: string) => {
    const Icon = categoryIcons[category] ?? Building2;
    return Icon;
  };

  if (templatesQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400 dark:text-neutral-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold">Industry Templates</h2>
        <p className="text-sm text-gray-600">
          Choose a pre-configured template for your industry to quickly set up
          scheduling with best practices.
        </p>
      </div>

      {/* Currently Applied Template */}
      {appliedTemplate && (
        <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-medium text-green-900 dark:text-green-100">
                  {appliedTemplate.name}
                </h3>
                <p className="text-sm text-green-700 dark:text-green-400">
                  Currently applied
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedTemplateId(appliedTemplate.id);
                  setShowComparison(true);
                }}
              >
                View Changes
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetTemplate}
                disabled={resetMutation.isPending}
              >
                {resetMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1 h-4 w-4" />
                )}
                Reset to Defaults
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Template Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template: TemplateSimplified) => {
          const Icon = getCategoryIcon(template.category);
          const isSelected = selectedTemplateId === template.id;
          const isApplied = appliedTemplate?.id === template.id;

          return (
            <Card
              key={template.id}
              className={`cursor-pointer transition-all ${
                isSelected
                  ? 'border-blue-500 ring-2 ring-blue-200'
                  : isApplied
                    ? 'border-green-300'
                    : 'hover:border-gray-300'
              }`}
              onClick={() => {
                setSelectedTemplateId(template.id);
                setShowComparison(false);
              }}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                      categoryColors[template.category] ?? 'bg-gray-100'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  {isApplied && <Badge variant="success">Applied</Badge>}
                </div>

                <div>
                  <h3 className="font-medium">{template.name}</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    {template.description}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1">
                  {template.features.slice(0, 3).map((feature: string) => (
                    <Badge
                      key={feature}
                      variant="secondary"
                      className="text-xs"
                    >
                      {feature}
                    </Badge>
                  ))}
                  {template.features.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{template.features.length - 3} more
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{template.appointmentTypeCount} appointment types</span>
                  <ChevronRight className="h-4 w-4" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Template Preview / Details Panel */}
      {selectedTemplateId && (
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                Template Preview
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTemplateId(null)}
              >
                Close
              </Button>
            </div>

            {previewQuery.isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
              </div>
            ) : preview ? (
              <div className="space-y-4">
                {/* Setup Time */}
                <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-400">
                  <Clock className="h-4 w-4" />
                  <span>
                    Estimated setup time: {preview.estimatedSetupTime}
                  </span>
                </div>

                {/* Features */}
                <div>
                  <h4 className="mb-2 text-sm font-medium text-blue-900 dark:text-blue-100">
                    Features
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {preview.features.map((feature: string) => (
                      <Badge
                        key={feature}
                        variant="outline"
                        className="bg-white dark:bg-neutral-800"
                      >
                        <Check className="mr-1 h-3 w-3 text-green-500 dark:text-green-400" />
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Recommended For */}
                <div>
                  <h4 className="mb-2 text-sm font-medium text-blue-900 dark:text-blue-100">
                    Recommended For
                  </h4>
                  <ul className="space-y-1 text-sm text-blue-700 dark:text-blue-400">
                    {preview.recommendedFor.map((rec: string) => (
                      <li key={rec} className="flex items-center gap-2">
                        <ChevronRight className="h-3 w-3" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Appointment Types */}
                <div>
                  <h4 className="mb-2 text-sm font-medium text-blue-900 dark:text-blue-100">
                    Appointment Types (
                    {preview.template.appointmentTypes.length})
                  </h4>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {preview.template.appointmentTypes.map((apt) => (
                      <div
                        key={apt.name}
                        className="flex items-center gap-2 rounded bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
                      >
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: apt.color }}
                        />
                        <span className="dark:text-neutral-100">
                          {apt.name}
                        </span>
                        <span className="ml-auto text-gray-500 dark:text-neutral-400">
                          {apt.durationMinutes}min
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Comparison (if showing) */}
                {showComparison && comparison && (
                  <div className="border-t border-blue-200 dark:border-blue-800 pt-4">
                    <h4 className="mb-2 text-sm font-medium text-blue-900 dark:text-blue-100">
                      Configuration Differences
                    </h4>
                    {comparison.differences.length === 0 ? (
                      <p className="text-sm text-blue-700 dark:text-blue-400">
                        No differences from template defaults.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {comparison.differences.map((diff) => (
                          <div
                            key={diff.field}
                            className="flex items-center justify-between rounded bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
                          >
                            <span className="font-medium dark:text-neutral-100">
                              {diff.field}
                            </span>
                            <span>
                              <span className="text-gray-500 dark:text-neutral-400">
                                {String(diff.currentValue)}
                              </span>{' '}
                              <ChevronRight className="inline h-3 w-3 dark:text-neutral-400" />{' '}
                              <span className="text-blue-600 dark:text-blue-400">
                                {String(diff.templateValue)}
                              </span>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Apply Button */}
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handleApplyTemplate}
                    disabled={
                      applyMutation.isPending ||
                      appliedTemplate?.id === selectedTemplateId
                    }
                    className="flex-1"
                  >
                    {applyMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Applying...
                      </>
                    ) : appliedTemplate?.id === selectedTemplateId ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Already Applied
                      </>
                    ) : (
                      'Apply Template'
                    )}
                  </Button>
                </div>

                {/* Warning */}
                {!appliedTemplate?.id && (
                  <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>
                      Applying this template will create a new scheduling
                      configuration with the template&apos;s settings,
                      appointment types, and intake form fields.
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-blue-700 dark:text-blue-400">
                Failed to load preview
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Success Message */}
      {applyMutation.isSuccess && (
        <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
          <div className="flex items-center gap-3">
            <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
            <div>
              <p className="font-medium text-green-900 dark:text-green-100">
                Template Applied!
              </p>
              <p className="text-sm text-green-700 dark:text-green-400">
                Created {applyMutation.data.appointmentTypesCreated} appointment
                types and configured {applyMutation.data.intakeFieldsConfigured}{' '}
                intake form fields.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Error Message */}
      {(applyMutation.isError || resetMutation.isError) && (
        <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <p className="text-sm text-red-700 dark:text-red-400">
              {applyMutation.error?.message ||
                resetMutation.error?.message ||
                'An error occurred'}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
