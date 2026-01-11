/**
 * Virtualized List Component
 *
 * Uses react-window for efficient rendering of large lists.
 * Only renders visible items, dramatically improving performance
 * for lists with hundreds or thousands of items.
 *
 * Usage:
 * - Use VIRTUALIZATION_THRESHOLD to decide when to virtualize
 * - Small lists (< 50 items) render normally for simplicity
 * - Large lists use virtualization for performance
 */

// Note: Using aliased imports to work around TypeScript module resolution
// with react-window types in bundler moduleResolution mode
import type { ListChildComponentProps } from 'react-window';
import { FixedSizeList } from 'react-window';
import React, { memo, useCallback, useMemo } from 'react';

// Lists smaller than this render without virtualization
export const VIRTUALIZATION_THRESHOLD = 50;

interface VirtualizedListProps<T> {
  items: T[];
  height: number;
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  overscanCount?: number;
}

interface ItemData<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
}

// Memoized row component to prevent unnecessary re-renders
const Row = memo(function Row<T>({
  index,
  style,
  data,
}: ListChildComponentProps<ItemData<T>>) {
  const { items, renderItem } = data;
  return <div style={style}>{renderItem(items[index], index)}</div>;
}) as <T>(props: ListChildComponentProps<ItemData<T>>) => JSX.Element;

/**
 * VirtualizedList - Efficiently renders large lists
 *
 * @param items - Array of items to render
 * @param height - Total height of the list container (px)
 * @param itemHeight - Height of each item row (px)
 * @param renderItem - Function to render each item. IMPORTANT: Wrap this function
 *                     with useCallback in the parent component to prevent unnecessary
 *                     re-renders of all visible items when the parent re-renders.
 * @param className - Optional CSS class for the container
 * @param overscanCount - Number of extra items to render outside visible area (default: 5)
 *
 * @example
 * ```tsx
 * // Good - renderItem is stable across re-renders
 * const renderItem = useCallback((item: Item) => <ItemRow item={item} />, []);
 * <VirtualizedList items={items} renderItem={renderItem} ... />
 *
 * // Bad - creates new function on every render, causing all rows to re-render
 * <VirtualizedList items={items} renderItem={(item) => <ItemRow item={item} />} ... />
 * ```
 */
export function VirtualizedList<T>({
  items,
  height,
  itemHeight,
  renderItem,
  className,
  overscanCount = 5,
}: VirtualizedListProps<T>): JSX.Element {
  // Memoize item data to prevent unnecessary re-renders
  const itemData = useMemo<ItemData<T>>(
    () => ({ items, renderItem }),
    [items, renderItem],
  );

  return (
    <FixedSizeList<ItemData<T>>
      height={height}
      itemCount={items.length}
      itemSize={itemHeight}
      width="100%"
      className={className}
      itemData={itemData}
      overscanCount={overscanCount}
    >
      {Row}
    </FixedSizeList>
  );
}

/**
 * Helper hook to determine if virtualization should be used
 */
export function useVirtualization<T>(
  items: T[],
  threshold = VIRTUALIZATION_THRESHOLD,
): boolean {
  return items.length > threshold;
}

/**
 * VirtualizedTable - For table-based virtualization
 * Wraps the list in a table structure for semantic HTML
 */
interface VirtualizedTableProps<T> {
  items: T[];
  height: number;
  itemHeight: number;
  renderRow: (item: T, index: number) => React.ReactNode;
  header: React.ReactNode;
  className?: string;
}

export function VirtualizedTable<T>({
  items,
  height,
  itemHeight,
  renderRow,
  header,
  className,
}: VirtualizedTableProps<T>): JSX.Element {
  const renderItem = useCallback(
    (item: T, index: number) => renderRow(item, index),
    [renderRow],
  );

  return (
    <div className={className}>
      <table className="w-full">
        <thead className="sticky top-0 bg-white dark:bg-neutral-800 z-10">
          {header}
        </thead>
      </table>
      <VirtualizedList
        items={items}
        height={height}
        itemHeight={itemHeight}
        renderItem={renderItem}
      />
    </div>
  );
}
