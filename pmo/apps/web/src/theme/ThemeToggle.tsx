import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme, Theme } from './ThemeContext';
import { cn } from '../ui/utils';

interface ThemeToggleProps {
  className?: string;
}

const themes: { value: Theme; label: string; icon: React.ElementType }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export function ThemeToggle({ className }: ThemeToggleProps): JSX.Element {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className={cn(
        'flex items-center gap-1 p-1 rounded-lg bg-neutral-100 dark:bg-neutral-800',
        className,
      )}
      role="radiogroup"
      aria-label="Theme selection"
    >
      {themes.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          onClick={() => setTheme(value)}
          className={cn(
            'p-2 rounded-md transition-colors',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 dark:focus-visible:outline-primary-400',
            theme === value
              ? 'bg-white dark:bg-neutral-700 text-primary-600 dark:text-primary-400 shadow-sm'
              : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700',
          )}
          title={label}
          aria-label={`${label} theme`}
        >
          <Icon className="w-4 h-4" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

export default ThemeToggle;
