import React, { useEffect } from 'react';
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';
import { useLintMarketingContent } from '../../api/marketing';
import type { ContentLintResult } from '../../../../../packages/types/marketing';
import { Card, CardBody } from '../../ui/Card';
import { Badge } from '../../ui/Badge';

interface ContentQualityPanelProps {
  content: {
    title?: string;
    body: string;
    summary?: string;
  };
  autoLint?: boolean;
  onLintComplete?: (result: ContentLintResult) => void;
}

/**
 * Component that displays content quality warnings and lint results
 */
export function ContentQualityPanel({
  content,
  autoLint = true,
  onLintComplete,
}: ContentQualityPanelProps): JSX.Element {
  const lintMutation = useLintMarketingContent();

  useEffect(() => {
    if (autoLint && content.body) {
      lintMutation.mutate(content, {
        onSuccess: (result) => {
          onLintComplete?.(result);
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content.body, content.title, content.summary, autoLint]);

  if (lintMutation.isPending) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-neutral-500">
            Checking content quality...
          </p>
        </CardBody>
      </Card>
    );
  }

  if (lintMutation.isError) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-red-600">
            Failed to check content quality
          </p>
        </CardBody>
      </Card>
    );
  }

  if (!lintMutation.data) {
    return <></>;
  }

  const result = lintMutation.data;

  return (
    <Card>
      <CardBody>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-neutral-900">
              Content Quality
            </h3>
            <div className="flex items-center gap-2">
              {result.isValid ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              <Badge
                variant={
                  result.score >= 80
                    ? 'success'
                    : result.score >= 60
                      ? 'warning'
                      : 'neutral'
                }
              >
                Score: {result.score}/100
              </Badge>
            </div>
          </div>

          {/* Summary */}
          {result.errors.length === 0 && result.warnings.length === 0 ? (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-800">
                ✓ Content passes all quality checks
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {result.errors.length > 0 && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-800">
                    {result.errors.length} critical{' '}
                    {result.errors.length > 1 ? 'issues' : 'issue'} found
                  </p>
                </div>
              )}
              {result.warnings.length > 0 && (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                  <p className="text-sm text-yellow-800">
                    {result.warnings.length}{' '}
                    {result.warnings.length > 1 ? 'warnings' : 'warning'} found
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Errors */}
          {result.errors.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-neutral-700">
                Critical Issues
              </h4>
              {result.errors.map((error, index) => (
                <div
                  key={index}
                  className="p-3 bg-red-50 border border-red-200 rounded-lg"
                >
                  <div className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-900">
                        {error.category}
                      </p>
                      <p className="text-sm text-red-700 mt-1">
                        {error.message}
                      </p>
                      <p className="text-xs text-red-600 mt-1 font-mono bg-red-100 px-2 py-1 rounded">
                        Found: &quot;{error.match}&quot;
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-neutral-700">Warnings</h4>
              {result.warnings
                .filter((w) => w.type === 'warning')
                .map((warning, index) => (
                  <div
                    key={index}
                    className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-yellow-900">
                          {warning.category}
                        </p>
                        <p className="text-sm text-yellow-700 mt-1">
                          {warning.message}
                        </p>
                        <p className="text-xs text-yellow-600 mt-1 font-mono bg-yellow-100 px-2 py-1 rounded">
                          Found: &quot;{warning.match}&quot;
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Info */}
          {result.warnings.filter((w) => w.type === 'info').length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-neutral-700">
                Suggestions
              </h4>
              {result.warnings
                .filter((w) => w.type === 'info')
                .map((info, index) => (
                  <div
                    key={index}
                    className="p-3 bg-blue-50 border border-blue-200 rounded-lg"
                  >
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900">
                          {info.category}
                        </p>
                        <p className="text-sm text-blue-700 mt-1">
                          {info.message}
                        </p>
                        <p className="text-xs text-blue-600 mt-1 font-mono bg-blue-100 px-2 py-1 rounded">
                          Found: &quot;{info.match}&quot;
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

export default ContentQualityPanel;
