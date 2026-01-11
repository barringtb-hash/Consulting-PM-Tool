import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';

import { Button } from '../../ui/Button';
import { GenerateMarketingContentModal } from './GenerateMarketingContentModal';

interface GenerateFromProjectButtonProps {
  projectId: number;
  projectName: string;
  clientId: number;
  variant?: 'primary' | 'secondary';
  className?: string;
}

/**
 * Drop-in button component for generating marketing content from a project.
 * Can be added to any project detail page.
 *
 * Usage:
 * ```tsx
 * <GenerateFromProjectButton
 *   projectId={project.id}
 *   projectName={project.name}
 *   clientId={project.clientId}
 * />
 * ```
 */
export function GenerateFromProjectButton({
  projectId,
  projectName,
  clientId,
  variant = 'secondary',
  className,
}: GenerateFromProjectButtonProps): JSX.Element {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        onClick={() => setIsModalOpen(true)}
        className={className}
      >
        <Sparkles className="w-4 h-4 mr-2" />
        Generate Marketing Content
      </Button>

      <GenerateMarketingContentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        sourceType="project"
        sourceId={projectId}
        sourceName={projectName}
        clientId={clientId}
        projectId={projectId}
      />
    </>
  );
}
