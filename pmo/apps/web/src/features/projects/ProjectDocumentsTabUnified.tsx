/**
 * Project Documents Tab (Unified)
 *
 * Combines manual project documents and AI-powered document generation
 * into a single tabbed interface.
 *
 * @module features/projects/ProjectDocumentsTabUnified
 */

import React, { useState } from 'react';
import { FileText, Sparkles } from 'lucide-react';
import { ProjectDocumentsTab } from './ProjectDocumentsTab';
import { ProjectAIDocumentsTab } from '../project-ai/ProjectAIDocumentsTab';

interface ProjectDocumentsTabUnifiedProps {
  /** The ID of the project to display documents for */
  projectId: number;
}

/** Active section type for the toggle */
type ActiveSection = 'manual' | 'ai';

/**
 * Unified documents tab that combines manual project documents
 * with AI-powered document generation.
 *
 * @param props - Component props
 * @param props.projectId - The project ID
 * @returns The unified documents tab component
 */
export function ProjectDocumentsTabUnified({
  projectId,
}: ProjectDocumentsTabUnifiedProps): JSX.Element {
  const [activeSection, setActiveSection] = useState<ActiveSection>('manual');

  return (
    <div className="space-y-6">
      {/* Section Toggle - pill-style buttons */}
      <div className="flex gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setActiveSection('manual')}
          className={`
            inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
            ${
              activeSection === 'manual'
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
            }
          `}
        >
          <FileText className="w-4 h-4" />
          Project Documents
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('ai')}
          className={`
            inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
            ${
              activeSection === 'ai'
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
            }
          `}
        >
          <Sparkles className="w-4 h-4" />
          AI Generation
        </button>
      </div>

      {/* Content - conditionally render based on active section */}
      {activeSection === 'manual' && (
        <ProjectDocumentsTab projectId={projectId} />
      )}
      {activeSection === 'ai' && (
        <ProjectAIDocumentsTab projectId={projectId} />
      )}
    </div>
  );
}

export default ProjectDocumentsTabUnified;
