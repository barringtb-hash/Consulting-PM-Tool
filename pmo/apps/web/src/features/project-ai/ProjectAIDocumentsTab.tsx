/**
 * Project AI Documents Tab
 *
 * AI-powered document generation for projects.
 * Embedded in the Project Dashboard.
 */

import React, { useCallback } from 'react';
import {
  FileText,
  Download,
  Loader2,
  Sparkles,
  FileCheck,
  FilePlus,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { useToast } from '../../ui/Toast';
import {
  useAIDocumentTemplates,
  useGenerateAIDocument,
  useAIGeneratedDocuments,
} from '../../api/hooks/ai-projects';

interface ProjectAIDocumentsTabProps {
  projectId: number;
}

// Document type icons and descriptions
const DOCUMENT_TYPE_INFO: Record<
  string,
  { icon: typeof FileText; description: string; color: string }
> = {
  charter: {
    icon: FileCheck,
    description: 'Project charter with objectives, scope, and stakeholders',
    color: 'text-blue-500',
  },
  sow: {
    icon: FileText,
    description: 'Statement of Work with deliverables and timeline',
    color: 'text-green-500',
  },
  status_report: {
    icon: FileText,
    description: 'Weekly/monthly status report with progress and metrics',
    color: 'text-purple-500',
  },
  risk_register: {
    icon: FileText,
    description: 'Risk register with identified risks and mitigation plans',
    color: 'text-orange-500',
  },
  meeting_summary: {
    icon: FileText,
    description: 'Meeting summary with action items and decisions',
    color: 'text-teal-500',
  },
  executive_summary: {
    icon: FileText,
    description: 'Executive summary for stakeholder communication',
    color: 'text-indigo-500',
  },
};

export function ProjectAIDocumentsTab({
  projectId,
}: ProjectAIDocumentsTabProps): JSX.Element {
  const { showToast } = useToast();

  // Queries
  const templatesQuery = useAIDocumentTemplates();
  const documentsQuery = useAIGeneratedDocuments(projectId);

  // Mutations
  const generateDocumentMutation = useGenerateAIDocument();

  // Handle document generation
  const handleGenerateDocument = useCallback(
    async (templateId: string) => {
      try {
        const doc = await generateDocumentMutation.mutateAsync({
          projectId,
          templateId,
        });
        showToast(`${doc.title} generated successfully`, 'success');
        documentsQuery.refetch();
      } catch (_error) {
        showToast('Failed to generate document', 'error');
      }
    },
    [projectId, generateDocumentMutation, showToast, documentsQuery],
  );

  const templates = templatesQuery.data || [];
  const documents = documentsQuery.data || [];

  return (
    <div className="space-y-6">
      {/* Document Templates */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary-500" />
            <h3 className="font-semibold">AI Document Templates</h3>
          </div>
        </CardHeader>
        <CardBody>
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">
            Generate AI-powered project documents based on your project data and
            context.
          </p>

          {templatesQuery.isLoading && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-32 bg-neutral-100 dark:bg-neutral-800 rounded-lg animate-pulse"
                />
              ))}
            </div>
          )}

          {!templatesQuery.isLoading && templates.length === 0 && (
            <div className="text-center py-8 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
              <FileText className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
              <p className="text-neutral-500">
                No document templates available
              </p>
            </div>
          )}

          {!templatesQuery.isLoading && templates.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => {
                const typeInfo = DOCUMENT_TYPE_INFO[template.id] || {
                  icon: FileText,
                  description: template.description,
                  color: 'text-neutral-500',
                };
                const Icon = typeInfo.icon;

                return (
                  <div
                    key={template.id}
                    className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-primary-300 dark:hover:border-primary-600 transition-colors"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className={`p-2 rounded-lg bg-white dark:bg-neutral-700 ${typeInfo.color}`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">
                          {template.name}
                        </h4>
                        <p className="text-xs text-neutral-500 line-clamp-2">
                          {typeInfo.description}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => handleGenerateDocument(template.id)}
                      disabled={generateDocumentMutation.isPending}
                    >
                      {generateDocumentMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <FilePlus className="w-4 h-4 mr-2" />
                      )}
                      Generate
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Generated Documents */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-green-500" />
              <h3 className="font-semibold">Generated Documents</h3>
            </div>
            {documents.length > 0 && (
              <Badge variant="secondary">{documents.length}</Badge>
            )}
          </div>
        </CardHeader>
        <CardBody>
          {documentsQuery.isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 bg-neutral-100 dark:bg-neutral-800 rounded-lg animate-pulse"
                />
              ))}
            </div>
          )}

          {!documentsQuery.isLoading && documents.length === 0 && (
            <div className="text-center py-8 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
              <FileText className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
              <p className="text-neutral-500">
                No documents generated yet. Use the templates above to create
                AI-powered documents.
              </p>
            </div>
          )}

          {!documentsQuery.isLoading && documents.length > 0 && (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-neutral-500" />
                    <div>
                      <p className="font-medium">{doc.title}</p>
                      <p className="text-sm text-neutral-500">
                        Generated {new Date(doc.createdAt).toLocaleDateString()}{' '}
                        • {doc.type}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        doc.status === 'completed' ? 'success' : 'secondary'
                      }
                    >
                      {doc.status}
                    </Badge>
                    {doc.downloadUrl && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(doc.downloadUrl, '_blank')}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

export default ProjectAIDocumentsTab;
