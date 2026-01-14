/**
 * Content Calendar Page
 *
 * A visual calendar for scheduling marketing content with drag-and-drop functionality.
 * Features:
 * - Multi-view calendar (Day/Week/Month)
 * - Content queue with draggable unscheduled items
 * - Drag-and-drop scheduling and rescheduling
 * - Color-coded content status
 * - Optimal posting time recommendations
 * - Content detail modal
 */

import React, { useState, useMemo, useCallback, memo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  GripVertical,
  LayoutGrid,
  List,
  Sparkles,
} from 'lucide-react';
import { PageHeader } from '../ui/PageHeader';
import { Card, CardBody, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge, type BadgeVariant } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/Toast';
import {
  useMarketingContents,
  useUpdateMarketingContent,
} from '../api/marketing';
import useRedirectOnUnauthorized from '../auth/useRedirectOnUnauthorized';
import {
  type MarketingContent,
  type ContentStatus,
  CONTENT_TYPE_LABELS,
  CONTENT_STATUS_LABELS,
  getContentTypeIcon,
} from '../../../../packages/types/marketing';

// ============================================================================
// Types
// ============================================================================

type CalendarView = 'day' | 'week' | 'month';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  contents: MarketingContent[];
}

interface TimeSlot {
  hour: number;
  isOptimalTime: boolean;
  contents: MarketingContent[];
}

// ============================================================================
// Constants
// ============================================================================

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const CONTENT_STATUS_VARIANTS: Record<ContentStatus, BadgeVariant> = {
  IDEA: 'neutral',
  DRAFT: 'neutral',
  IN_REVIEW: 'warning',
  APPROVED: 'primary',
  READY: 'primary',
  PUBLISHED: 'success',
  ARCHIVED: 'secondary',
};

/**
 * Optimal posting times by hour (in 24h format)
 * Based on general social media engagement research
 */
const OPTIMAL_POSTING_HOURS = [9, 10, 12, 14, 15, 17, 18];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Formats a date consistently across the application
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Formats a date with time
 */
function formatDateTime(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Formats time only
 */
function formatTime(hour: number): string {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:00 ${ampm}`;
}

/**
 * Checks if two dates are the same day
 */
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Gets the start of the day
 * Note: Keeping this for potential future use
 */
function _startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Gets the start of the week (Sunday)
 */
function startOfWeek(date: Date): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - result.getDay());
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Gets the end of the week (Saturday)
 */
function endOfWeek(date: Date): Date {
  const result = startOfWeek(date);
  result.setDate(result.getDate() + 6);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Adds days to a date
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Parses a drop target ID to extract date and optional hour
 */
function parseDropTargetId(id: string): { date: Date; hour?: number } | null {
  const parts = id.split('-');
  if (parts[0] === 'day' && parts.length >= 4) {
    const date = new Date(
      parseInt(parts[1], 10),
      parseInt(parts[2], 10),
      parseInt(parts[3], 10),
    );
    const hour = parts.length >= 5 ? parseInt(parts[4], 10) : undefined;
    return { date, hour };
  }
  return null;
}

/**
 * Creates a drop target ID from date and optional hour
 */
function createDropTargetId(date: Date, hour?: number): string {
  const base = `day-${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  return hour !== undefined ? `${base}-${hour}` : base;
}

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Calendar Header - Navigation and view toggles
 */
interface CalendarHeaderProps {
  currentDate: Date;
  view: CalendarView;
  onDateChange: (date: Date) => void;
  onViewChange: (view: CalendarView) => void;
}

function CalendarHeader({
  currentDate,
  view,
  onDateChange,
  onViewChange,
}: CalendarHeaderProps): JSX.Element {
  const navigatePrevious = useCallback(() => {
    let newDate: Date;
    switch (view) {
      case 'day':
        newDate = addDays(currentDate, -1);
        break;
      case 'week':
        newDate = addDays(currentDate, -7);
        break;
      case 'month':
      default:
        newDate = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() - 1,
          1,
        );
        break;
    }
    onDateChange(newDate);
  }, [currentDate, view, onDateChange]);

  const navigateNext = useCallback(() => {
    let newDate: Date;
    switch (view) {
      case 'day':
        newDate = addDays(currentDate, 1);
        break;
      case 'week':
        newDate = addDays(currentDate, 7);
        break;
      case 'month':
      default:
        newDate = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() + 1,
          1,
        );
        break;
    }
    onDateChange(newDate);
  }, [currentDate, view, onDateChange]);

  const goToToday = useCallback(() => {
    onDateChange(new Date());
  }, [onDateChange]);

  const getHeaderTitle = useCallback((): string => {
    switch (view) {
      case 'day':
        return currentDate.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
      case 'week': {
        const weekStart = startOfWeek(currentDate);
        const weekEnd = endOfWeek(currentDate);
        return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      }
      case 'month':
      default:
        return currentDate.toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
        });
    }
  }, [currentDate, view]);

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          {getHeaderTitle()}
        </h2>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={navigatePrevious}
            aria-label="Previous"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={navigateNext}
            aria-label="Next"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1">
        <Button
          variant={view === 'day' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => onViewChange('day')}
        >
          <Clock className="w-4 h-4 mr-1" />
          Day
        </Button>
        <Button
          variant={view === 'week' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => onViewChange('week')}
        >
          <List className="w-4 h-4 mr-1" />
          Week
        </Button>
        <Button
          variant={view === 'month' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => onViewChange('month')}
        >
          <LayoutGrid className="w-4 h-4 mr-1" />
          Month
        </Button>
      </div>
    </div>
  );
}

/**
 * Draggable Content Item - Used in queue and calendar
 */
interface DraggableContentItemProps {
  content: MarketingContent;
  compact?: boolean;
  onClick?: (content: MarketingContent) => void;
}

const DraggableContentItem = memo(function DraggableContentItem({
  content,
  compact = false,
  onClick,
}: DraggableContentItemProps): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `content-${content.id}`,
      data: { content },
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const handleClick = useCallback(() => {
    if (!isDragging && onClick) {
      onClick(content);
    }
  }, [content, isDragging, onClick]);

  if (compact) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onClick={handleClick}
        className={`text-xs p-1.5 rounded cursor-grab transition-all ${
          isDragging ? 'opacity-50 cursor-grabbing' : 'hover:shadow-md'
        } ${getStatusBackgroundClass(content.status)}`}
      >
        <div className="flex items-center gap-1">
          <span className="text-sm">{getContentTypeIcon(content.type)}</span>
          <span className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
            {content.name}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className={`p-3 rounded-lg border cursor-grab transition-all ${
        isDragging
          ? 'opacity-50 cursor-grabbing shadow-lg'
          : 'hover:shadow-md hover:border-primary-300 dark:hover:border-primary-600'
      } bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700`}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="w-4 h-4 text-neutral-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{getContentTypeIcon(content.type)}</span>
            <span className="font-medium text-sm text-neutral-900 dark:text-neutral-100 truncate">
              {content.name}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={CONTENT_STATUS_VARIANTS[content.status]} size="sm">
              {CONTENT_STATUS_LABELS[content.status]}
            </Badge>
            <Badge variant="neutral" size="sm">
              {CONTENT_TYPE_LABELS[content.type]}
            </Badge>
          </div>
          {content.summary && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 line-clamp-2">
              {content.summary}
            </p>
          )}
        </div>
      </div>
    </div>
  );
});

/**
 * Get background class based on content status
 */
function getStatusBackgroundClass(status: ContentStatus): string {
  switch (status) {
    case 'PUBLISHED':
      return 'bg-success-100 dark:bg-success-900/50';
    case 'READY':
    case 'APPROVED':
      return 'bg-primary-100 dark:bg-primary-900/50';
    case 'IN_REVIEW':
      return 'bg-warning-100 dark:bg-warning-900/50';
    case 'ARCHIVED':
      return 'bg-neutral-200 dark:bg-neutral-700';
    default:
      return 'bg-neutral-100 dark:bg-neutral-800';
  }
}

/**
 * Content Queue - Sidebar with unscheduled items
 */
interface ContentQueueProps {
  contents: MarketingContent[];
  onContentClick: (content: MarketingContent) => void;
}

function ContentQueue({
  contents,
  onContentClick,
}: ContentQueueProps): JSX.Element {
  const unscheduledContents = useMemo(
    () =>
      contents.filter(
        (c) =>
          !c.scheduledFor &&
          c.status !== 'PUBLISHED' &&
          c.status !== 'ARCHIVED',
      ),
    [contents],
  );

  const sortedContents = useMemo(() => {
    const priorityOrder: Record<ContentStatus, number> = {
      READY: 0,
      APPROVED: 1,
      IN_REVIEW: 2,
      DRAFT: 3,
      IDEA: 4,
      PUBLISHED: 5,
      ARCHIVED: 6,
    };
    return [...unscheduledContents].sort(
      (a, b) => priorityOrder[a.status] - priorityOrder[b.status],
    );
  }, [unscheduledContents]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="flex items-center gap-2">
          <List className="w-5 h-5" />
          Content Queue
          <Badge variant="neutral" size="sm">
            {sortedContents.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardBody className="flex-1 overflow-y-auto space-y-3">
        {sortedContents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <CalendarIcon className="w-8 h-8 text-neutral-400 dark:text-neutral-500 mb-2" />
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              No unscheduled content
            </p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
              All content has been scheduled
            </p>
          </div>
        ) : (
          sortedContents.map((content) => (
            <DraggableContentItem
              key={content.id}
              content={content}
              onClick={onContentClick}
            />
          ))
        )}
      </CardBody>
    </Card>
  );
}

/**
 * Droppable Calendar Cell - For month and week views
 */
interface DroppableCellProps {
  day: CalendarDay;
  children?: React.ReactNode;
}

function DroppableCell({ day, children }: DroppableCellProps): JSX.Element {
  const dropId = createDropTargetId(day.date);
  const { isOver, setNodeRef } = useDroppable({ id: dropId });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[120px] border-b border-r border-neutral-100 dark:border-neutral-700 p-2 transition-colors ${
        !day.isCurrentMonth ? 'bg-neutral-50 dark:bg-neutral-900' : ''
      } ${day.isToday ? 'bg-primary-50 dark:bg-primary-900/30' : ''} ${
        isOver
          ? 'bg-primary-100 dark:bg-primary-800/50 ring-2 ring-primary-400 ring-inset'
          : ''
      }`}
    >
      <div
        className={`text-sm font-medium mb-1 ${
          !day.isCurrentMonth
            ? 'text-neutral-400 dark:text-neutral-500'
            : day.isToday
              ? 'text-primary-700 dark:text-primary-400'
              : day.isWeekend
                ? 'text-neutral-500 dark:text-neutral-400'
                : 'text-neutral-900 dark:text-neutral-100'
        }`}
      >
        {day.date.getDate()}
      </div>
      {children}
    </div>
  );
}

/**
 * Droppable Time Slot - For day and week views
 */
interface DroppableTimeSlotProps {
  date: Date;
  slot: TimeSlot;
  onContentClick: (content: MarketingContent) => void;
}

function DroppableTimeSlot({
  date,
  slot,
  onContentClick,
}: DroppableTimeSlotProps): JSX.Element {
  const dropId = createDropTargetId(date, slot.hour);
  const { isOver, setNodeRef } = useDroppable({ id: dropId });

  return (
    <div
      ref={setNodeRef}
      className={`h-16 border-b border-neutral-100 dark:border-neutral-700 p-1 transition-colors ${
        slot.isOptimalTime ? 'bg-success-50/50 dark:bg-success-900/20' : ''
      } ${
        isOver
          ? 'bg-primary-100 dark:bg-primary-800/50 ring-2 ring-primary-400 ring-inset'
          : ''
      }`}
    >
      <div className="flex items-start gap-2 h-full">
        <span className="text-xs text-neutral-400 dark:text-neutral-500 w-16 flex-shrink-0">
          {formatTime(slot.hour)}
          {slot.isOptimalTime && (
            <Sparkles className="w-3 h-3 text-success-500 inline ml-1" />
          )}
        </span>
        <div className="flex-1 space-y-1 overflow-hidden">
          {slot.contents.map((content) => (
            <DraggableContentItem
              key={content.id}
              content={content}
              compact
              onClick={onContentClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Month View Calendar Grid
 */
interface MonthViewProps {
  calendarDays: CalendarDay[];
  onContentClick: (content: MarketingContent) => void;
}

function MonthView({
  calendarDays,
  onContentClick,
}: MonthViewProps): JSX.Element {
  return (
    <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden bg-white dark:bg-neutral-800">
      {/* Day of Week Headers */}
      <div className="grid grid-cols-7 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900">
        {DAYS_OF_WEEK.map((day, index) => (
          <div
            key={day}
            className={`text-center py-2 text-sm font-medium ${
              index === 0 || index === 6
                ? 'text-neutral-500 dark:text-neutral-400'
                : 'text-neutral-700 dark:text-neutral-300'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, index) => (
          <DroppableCell key={index} day={day}>
            <div className="space-y-1 max-h-[80px] overflow-y-auto">
              {day.contents.map((content) => (
                <DraggableContentItem
                  key={content.id}
                  content={content}
                  compact
                  onClick={onContentClick}
                />
              ))}
            </div>
          </DroppableCell>
        ))}
      </div>
    </div>
  );
}

/**
 * Week View Calendar Grid
 */
interface WeekViewProps {
  currentDate: Date;
  contents: MarketingContent[];
  onContentClick: (content: MarketingContent) => void;
}

function WeekView({
  currentDate,
  contents,
  onContentClick,
}: WeekViewProps): JSX.Element {
  const weekStart = startOfWeek(currentDate);

  const weekDays = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      return {
        date,
        isToday: isSameDay(date, today),
        isWeekend: i === 0 || i === 6,
      };
    });
  }, [weekStart]);

  const timeSlots = useMemo(() => {
    return Array.from({ length: 24 }, (_, hour) => ({
      hour,
      isOptimalTime: OPTIMAL_POSTING_HOURS.includes(hour),
    }));
  }, []);

  const getContentsForSlot = useCallback(
    (date: Date, hour: number): MarketingContent[] => {
      return contents.filter((content) => {
        if (!content.scheduledFor) return false;
        const scheduled = new Date(content.scheduledFor);
        return isSameDay(scheduled, date) && scheduled.getHours() === hour;
      });
    },
    [contents],
  );

  return (
    <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden bg-white dark:bg-neutral-800">
      {/* Day Headers */}
      <div className="grid grid-cols-8 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900">
        <div className="py-2 px-2 text-xs font-medium text-neutral-500 dark:text-neutral-400" />
        {weekDays.map((day, index) => (
          <div
            key={index}
            className={`text-center py-2 text-sm font-medium ${
              day.isToday
                ? 'text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30'
                : day.isWeekend
                  ? 'text-neutral-500 dark:text-neutral-400'
                  : 'text-neutral-700 dark:text-neutral-300'
            }`}
          >
            <div>{DAYS_OF_WEEK[index]}</div>
            <div className="text-lg">{day.date.getDate()}</div>
          </div>
        ))}
      </div>

      {/* Time Slots */}
      <div className="max-h-[600px] overflow-y-auto">
        {timeSlots.map((slot) => (
          <div key={slot.hour} className="grid grid-cols-8">
            <div className="border-b border-r border-neutral-100 dark:border-neutral-700 py-2 px-2">
              <span className="text-xs text-neutral-400 dark:text-neutral-500">
                {formatTime(slot.hour)}
              </span>
              {slot.isOptimalTime && (
                <Sparkles className="w-3 h-3 text-success-500 inline ml-1" />
              )}
            </div>
            {weekDays.map((day, dayIndex) => (
              <DroppableTimeSlot
                key={dayIndex}
                date={day.date}
                slot={{
                  ...slot,
                  contents: getContentsForSlot(day.date, slot.hour),
                }}
                onContentClick={onContentClick}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Day View Calendar Grid
 */
interface DayViewProps {
  currentDate: Date;
  contents: MarketingContent[];
  onContentClick: (content: MarketingContent) => void;
}

function DayView({
  currentDate,
  contents,
  onContentClick,
}: DayViewProps): JSX.Element {
  const timeSlots = useMemo(() => {
    return Array.from({ length: 24 }, (_, hour) => {
      const slotContents = contents.filter((content) => {
        if (!content.scheduledFor) return false;
        const scheduled = new Date(content.scheduledFor);
        return (
          isSameDay(scheduled, currentDate) && scheduled.getHours() === hour
        );
      });

      return {
        hour,
        isOptimalTime: OPTIMAL_POSTING_HOURS.includes(hour),
        contents: slotContents,
      };
    });
  }, [currentDate, contents]);

  return (
    <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden bg-white dark:bg-neutral-800">
      <div className="max-h-[600px] overflow-y-auto">
        {timeSlots.map((slot) => (
          <DroppableTimeSlot
            key={slot.hour}
            date={currentDate}
            slot={slot}
            onContentClick={onContentClick}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Content Detail Modal
 */
interface ContentDetailModalProps {
  content: MarketingContent | null;
  isOpen: boolean;
  onClose: () => void;
}

function ContentDetailModal({
  content,
  isOpen,
  onClose,
}: ContentDetailModalProps): JSX.Element | null {
  if (!content) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Content Details"
      size="large"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <span className="text-4xl">{getContentTypeIcon(content.type)}</span>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
              {content.name}
            </h3>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={CONTENT_STATUS_VARIANTS[content.status]}>
                {CONTENT_STATUS_LABELS[content.status]}
              </Badge>
              <Badge variant="neutral">
                {CONTENT_TYPE_LABELS[content.type]}
              </Badge>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              Scheduled For
            </label>
            <p className="text-neutral-900 dark:text-neutral-100">
              {content.scheduledFor
                ? formatDateTime(new Date(content.scheduledFor))
                : 'Not scheduled'}
            </p>
          </div>
          {content.publishedAt && (
            <div>
              <label className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                Published At
              </label>
              <p className="text-neutral-900 dark:text-neutral-100">
                {formatDateTime(new Date(content.publishedAt))}
              </p>
            </div>
          )}
          {content.client && (
            <div>
              <label className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                Client
              </label>
              <p className="text-neutral-900 dark:text-neutral-100">
                {content.client.name}
              </p>
            </div>
          )}
          {content.project && (
            <div>
              <label className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                Project
              </label>
              <p className="text-neutral-900 dark:text-neutral-100">
                {content.project.name}
              </p>
            </div>
          )}
        </div>

        {/* Summary */}
        {content.summary && (
          <div>
            <label className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              Summary
            </label>
            <p className="text-neutral-900 dark:text-neutral-100 mt-1">
              {content.summary}
            </p>
          </div>
        )}

        {/* Tags */}
        {content.tags && content.tags.length > 0 && (
          <div>
            <label className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mt-1">
              {content.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 text-xs bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Created Info */}
        <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Created {formatDate(new Date(content.createdAt))}
            {content.createdBy && ` by ${content.createdBy.name}`}
          </p>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Drag Overlay Content - Shows while dragging
 */
interface DragOverlayContentProps {
  content: MarketingContent;
}

function DragOverlayContent({ content }: DragOverlayContentProps): JSX.Element {
  return (
    <div className="p-3 rounded-lg border bg-white dark:bg-neutral-800 border-primary-400 shadow-xl opacity-90 rotate-3 scale-105">
      <div className="flex items-center gap-2">
        <span className="text-lg">{getContentTypeIcon(content.type)}</span>
        <span className="font-medium text-sm text-neutral-900 dark:text-neutral-100">
          {content.name}
        </span>
      </div>
      <Badge
        variant={CONTENT_STATUS_VARIANTS[content.status]}
        size="sm"
        className="mt-2"
      >
        {CONTENT_STATUS_LABELS[content.status]}
      </Badge>
    </div>
  );
}

/**
 * Calendar Legend
 */
function CalendarLegend(): JSX.Element {
  return (
    <div className="flex items-center gap-6 text-sm text-neutral-600 dark:text-neutral-400 mt-4">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-700 rounded" />
        <span>Today</span>
      </div>
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-success-500" />
        <span>Optimal posting time</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-success-100 dark:bg-success-900/50 border border-success-300 dark:border-success-700 rounded" />
        <span>Published</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-primary-100 dark:bg-primary-900/50 border border-primary-300 dark:border-primary-700 rounded" />
        <span>Ready/Approved</span>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

function ContentCalendarPage(): JSX.Element {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('month');
  const [activeContent, setActiveContent] = useState<MarketingContent | null>(
    null,
  );
  const [selectedContent, setSelectedContent] =
    useState<MarketingContent | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const { showToast } = useToast();

  // Fetch contents (excluding archived)
  const contentsQuery = useMarketingContents({ archived: false });
  const updateContentMutation = useUpdateMarketingContent();

  useRedirectOnUnauthorized(contentsQuery.error);

  // Memoize contents to prevent unnecessary re-renders
  const contents = useMemo(
    () => contentsQuery.data ?? [],
    [contentsQuery.data],
  );

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor),
  );

  // Generate calendar days for month view
  const calendarDays = useMemo((): CalendarDay[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const today = new Date();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDay.getDay();

    const days: CalendarDay[] = [];

    // Add days from previous month
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: isSameDay(date, today),
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        contents: [],
      });
    }

    // Add days from current month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      const dayContents = contents.filter((content) => {
        if (!content.scheduledFor) return false;
        return isSameDay(new Date(content.scheduledFor), date);
      });

      days.push({
        date,
        isCurrentMonth: true,
        isToday: isSameDay(date, today),
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        contents: dayContents,
      });
    }

    // Add days from next month to complete grid
    const remainingDays = 7 - (days.length % 7);
    if (remainingDays < 7) {
      for (let day = 1; day <= remainingDays; day++) {
        const date = new Date(year, month + 1, day);
        days.push({
          date,
          isCurrentMonth: false,
          isToday: isSameDay(date, today),
          isWeekend: date.getDay() === 0 || date.getDay() === 6,
          contents: [],
        });
      }
    }

    return days;
  }, [currentDate, contents]);

  // Handle drag start
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const contentId = String(event.active.id).replace('content-', '');
      const content = contents.find((c) => c.id === parseInt(contentId, 10));
      setActiveContent(content ?? null);
    },
    [contents],
  );

  // Handle drag end
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveContent(null);

      const { active, over } = event;
      if (!over) return;

      const contentId = String(active.id).replace('content-', '');
      const content = contents.find((c) => c.id === parseInt(contentId, 10));
      if (!content) return;

      const dropTarget = parseDropTargetId(String(over.id));
      if (!dropTarget) return;

      // Create scheduled date with optional hour
      const scheduledFor = new Date(dropTarget.date);
      if (dropTarget.hour !== undefined) {
        scheduledFor.setHours(dropTarget.hour, 0, 0, 0);
      } else {
        // Default to 9 AM if no hour specified (month view)
        scheduledFor.setHours(9, 0, 0, 0);
      }

      // Validate: cannot schedule in the past
      const now = new Date();
      if (scheduledFor < now) {
        showToast('Cannot schedule content in the past', 'error');
        return;
      }

      try {
        await updateContentMutation.mutateAsync({
          contentId: content.id,
          payload: { scheduledFor },
        });
        showToast(
          `"${content.name}" scheduled for ${formatDateTime(scheduledFor)}`,
          'success',
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to schedule content';
        showToast(message, 'error');
      }
    },
    [contents, updateContentMutation, showToast],
  );

  // Handle content click
  const handleContentClick = useCallback((content: MarketingContent) => {
    setSelectedContent(content);
    setShowDetailModal(true);
  }, []);

  // Handle modal close
  const handleCloseModal = useCallback(() => {
    setShowDetailModal(false);
    setSelectedContent(null);
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <PageHeader
        title="Content Calendar"
        description="Schedule and manage your marketing content with drag-and-drop"
        icon={CalendarIcon}
      />

      <div className="page-content">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-12 gap-6">
            {/* Left Sidebar - Content Queue */}
            <div className="col-span-3">
              <ContentQueue
                contents={contents}
                onContentClick={handleContentClick}
              />
            </div>

            {/* Main Area - Calendar */}
            <div className="col-span-9">
              <Card>
                <CardBody>
                  <CalendarHeader
                    currentDate={currentDate}
                    view={view}
                    onDateChange={setCurrentDate}
                    onViewChange={setView}
                  />

                  {contentsQuery.isLoading ? (
                    <div className="h-96 flex items-center justify-center">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4" />
                        <p className="text-neutral-500 dark:text-neutral-400">
                          Loading calendar...
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {view === 'month' && (
                        <MonthView
                          calendarDays={calendarDays}
                          onContentClick={handleContentClick}
                        />
                      )}
                      {view === 'week' && (
                        <WeekView
                          currentDate={currentDate}
                          contents={contents}
                          onContentClick={handleContentClick}
                        />
                      )}
                      {view === 'day' && (
                        <DayView
                          currentDate={currentDate}
                          contents={contents}
                          onContentClick={handleContentClick}
                        />
                      )}
                    </>
                  )}

                  <CalendarLegend />
                </CardBody>
              </Card>
            </div>
          </div>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeContent && <DragOverlayContent content={activeContent} />}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Content Detail Modal */}
      <ContentDetailModal
        content={selectedContent}
        isOpen={showDetailModal}
        onClose={handleCloseModal}
      />
    </div>
  );
}

export default ContentCalendarPage;
