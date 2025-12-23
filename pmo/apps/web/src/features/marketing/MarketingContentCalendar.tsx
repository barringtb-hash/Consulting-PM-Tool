import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import {
  type MarketingContent,
  CONTENT_TYPE_LABELS,
  getContentTypeIcon,
} from '../../../../../packages/types/marketing';

interface MarketingContentCalendarProps {
  contents: MarketingContent[];
  onContentClick: (content: MarketingContent) => void;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  contents: MarketingContent[];
}

function MarketingContentCalendar({
  contents,
  onContentClick,
}: MarketingContentCalendarProps): JSX.Element {
  const [currentDate, setCurrentDate] = useState(new Date());

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Get first day of month and last day of month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Get the day of week for the first day (0 = Sunday, 6 = Saturday)
    const startDayOfWeek = firstDay.getDay();

    // Get days from previous month to fill the first week
    const days: CalendarDay[] = [];

    // Add days from previous month
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({
        date,
        isCurrentMonth: false,
        contents: [],
      });
    }

    // Add days from current month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      const dayContents = contents.filter((content) => {
        const scheduledDate = content.scheduledFor;
        if (!scheduledDate) return false;
        const contentDate = new Date(scheduledDate);
        return (
          contentDate.getFullYear() === year &&
          contentDate.getMonth() === month &&
          contentDate.getDate() === day
        );
      });

      days.push({
        date,
        isCurrentMonth: true,
        contents: dayContents,
      });
    }

    // Add days from next month to complete the last week
    const remainingDays = 7 - (days.length % 7);
    if (remainingDays < 7) {
      for (let day = 1; day <= remainingDays; day++) {
        const date = new Date(year, month + 1, day);
        days.push({
          date,
          isCurrentMonth: false,
          contents: [],
        });
      }
    }

    return days;
  }, [currentDate, contents]);

  const goToPreviousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1),
    );
  };

  const goToNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1),
    );
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const monthYear = currentDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const today = new Date();
  const isToday = (date: Date) => {
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">{monthYear}</h2>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={goToPreviousMonth}
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={goToNextMonth}
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden bg-white dark:bg-neutral-800">
        {/* Day of Week Headers */}
        <div className="grid grid-cols-7 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              className="text-center py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => (
            <div
              key={index}
              className={`min-h-[120px] border-b border-r border-neutral-100 dark:border-neutral-700 p-2 ${
                !day.isCurrentMonth ? 'bg-neutral-50 dark:bg-neutral-900' : ''
              } ${isToday(day.date) ? 'bg-primary-50 dark:bg-primary-900/30' : ''}`}
            >
              <div
                className={`text-sm font-medium mb-1 ${
                  !day.isCurrentMonth
                    ? 'text-neutral-400 dark:text-neutral-500'
                    : isToday(day.date)
                      ? 'text-primary-700 dark:text-primary-400'
                      : 'text-neutral-900 dark:text-neutral-100'
                }`}
              >
                {day.date.getDate()}
              </div>
              <div className="space-y-1">
                {day.contents.map((content) => (
                  <div
                    key={content.id}
                    className="text-xs p-1 bg-primary-100 dark:bg-primary-900/50 hover:bg-primary-200 dark:hover:bg-primary-800/50 rounded cursor-pointer transition-colors"
                    onClick={() => onContentClick(content)}
                  >
                    <div className="flex items-center gap-1">
                      <span className="text-sm">
                        {getContentTypeIcon(content.type)}
                      </span>
                      <span className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
                        {content.name}
                      </span>
                    </div>
                    <div className="mt-0.5">
                      <Badge variant="neutral" className="text-xs">
                        {CONTENT_TYPE_LABELS[content.type]}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm text-neutral-600 dark:text-neutral-400">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-700 rounded"></div>
          <span>Today</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-primary-100 dark:bg-primary-900/50 border border-primary-300 dark:border-primary-700 rounded"></div>
          <span>Scheduled content</span>
        </div>
      </div>
    </div>
  );
}

export default MarketingContentCalendar;
