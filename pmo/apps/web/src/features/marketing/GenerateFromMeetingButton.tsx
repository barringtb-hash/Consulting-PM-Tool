import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';

import { Button } from '../../ui/Button';
import { GenerateMarketingContentModal } from './GenerateMarketingContentModal';

interface GenerateFromMeetingButtonProps {
  meetingId: number;
  meetingTitle: string;
  clientId: number;
  projectId: number;
  variant?: 'primary' | 'secondary';
  className?: string;
}

/**
 * Drop-in button component for generating marketing content from a meeting.
 * Can be added to any meeting detail page.
 *
 * Usage:
 * ```tsx
 * <GenerateFromMeetingButton
 *   meetingId={meeting.id}
 *   meetingTitle={meeting.title}
 *   clientId={meeting.project.clientId}
 *   projectId={meeting.projectId}
 * />
 * ```
 */
export function GenerateFromMeetingButton({
  meetingId,
  meetingTitle,
  clientId,
  projectId,
  variant = 'secondary',
  className,
}: GenerateFromMeetingButtonProps): JSX.Element {
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
        sourceType="meeting"
        sourceId={meetingId}
        sourceName={meetingTitle}
        clientId={clientId}
        projectId={projectId}
      />
    </>
  );
}
