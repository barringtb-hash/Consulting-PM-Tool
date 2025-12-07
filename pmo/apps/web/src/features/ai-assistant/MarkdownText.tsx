/**
 * MarkdownText Component
 *
 * A lightweight markdown renderer for AI assistant responses.
 * Handles common markdown patterns: headers, bold, lists, and paragraphs.
 */

import React from 'react';

interface MarkdownTextProps {
  content: string;
  className?: string;
}

/**
 * Parse and render markdown content
 */
export function MarkdownText({
  content,
  className = '',
}: MarkdownTextProps): JSX.Element {
  const lines = content.split('\n');
  const elements: JSX.Element[] = [];
  let listItems: string[] = [];
  let listKey = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul
          key={`list-${listKey++}`}
          className="list-disc list-inside space-y-1 my-2"
        >
          {listItems.map((item, i) => (
            <li key={i} className="text-sm">
              {renderInlineMarkdown(item)}
            </li>
          ))}
        </ul>,
      );
      listItems = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines but flush any pending list
    if (!trimmed) {
      flushList();
      continue;
    }

    // Headers
    if (trimmed.startsWith('#### ')) {
      flushList();
      elements.push(
        <h4 key={i} className="font-semibold text-sm mt-3 mb-1">
          {renderInlineMarkdown(trimmed.slice(5))}
        </h4>,
      );
      continue;
    }

    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <h3 key={i} className="font-semibold text-sm mt-3 mb-1">
          {renderInlineMarkdown(trimmed.slice(4))}
        </h3>,
      );
      continue;
    }

    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(
        <h2 key={i} className="font-bold text-base mt-3 mb-2">
          {renderInlineMarkdown(trimmed.slice(3))}
        </h2>,
      );
      continue;
    }

    // List items (- or *)
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      listItems.push(trimmed.slice(2));
      continue;
    }

    // Regular paragraph
    flushList();
    elements.push(
      <p key={i} className="text-sm my-1">
        {renderInlineMarkdown(trimmed)}
      </p>,
    );
  }

  // Flush any remaining list items
  flushList();

  return <div className={`space-y-1 ${className}`}>{elements}</div>;
}

/**
 * Render inline markdown (bold, italic)
 */
function renderInlineMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold: **text**
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    if (boldMatch && boldMatch.index !== undefined) {
      // Add text before the match
      if (boldMatch.index > 0) {
        parts.push(remaining.slice(0, boldMatch.index));
      }
      // Add bold text
      parts.push(
        <strong key={key++} className="font-semibold">
          {boldMatch[1]}
        </strong>,
      );
      remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
      continue;
    }

    // No more matches, add remaining text
    parts.push(remaining);
    break;
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

export default MarkdownText;
