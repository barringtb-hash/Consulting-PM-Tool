import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';

import { Button } from '../../ui/Button';
import { RepurposeContentModal } from './RepurposeContentModal';
import type { MarketingContent } from '../../../../../packages/types/marketing';

interface RepurposeContentButtonProps {
  content: MarketingContent;
  variant?: 'primary' | 'secondary';
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

/**
 * Drop-in button component for repurposing marketing content.
 * Can be added to marketing content detail views or list items.
 *
 * Usage:
 * ```tsx
 * <RepurposeContentButton content={marketingContent} />
 * ```
 */
export function RepurposeContentButton({
  content,
  variant = 'secondary',
  size = 'medium',
  className,
}: RepurposeContentButtonProps): JSX.Element {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsModalOpen(true)}
        className={className}
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        Repurpose
      </Button>

      <RepurposeContentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        sourceContent={content}
      />
    </>
  );
}
