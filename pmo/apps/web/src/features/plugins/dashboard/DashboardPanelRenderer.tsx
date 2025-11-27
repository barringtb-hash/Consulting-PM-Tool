/**
 * Dashboard Panel Renderer
 *
 * Components for rendering dashboard plugins in their respective positions.
 */

import { Component, type ReactNode, type ErrorInfo } from 'react';
import { Card, CardBody } from '../../../ui/Card';
import { Button } from '../../../ui/Button';
import type {
  DashboardPanelPosition,
  RegisteredPlugin,
  DashboardPanelProps,
} from './types';
import { useDashboardPluginContext } from './DashboardPluginContext';

/**
 * Error boundary for individual dashboard panels
 */
interface ErrorBoundaryProps {
  pluginId: string;
  pluginName: string;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class DashboardPanelErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(
      `Dashboard plugin "${this.props.pluginId}" error:`,
      error,
      errorInfo,
    );
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: undefined });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <Card className="border-danger-200 bg-danger-50/30">
          <CardBody>
            <div className="text-center py-4">
              <p className="text-danger-700 font-medium mb-2">
                Failed to load {this.props.pluginName}
              </p>
              <p className="text-sm text-danger-600 mb-3">
                {this.state.error?.message ?? 'An unexpected error occurred'}
              </p>
              <Button variant="secondary" size="sm" onClick={this.handleRetry}>
                Retry
              </Button>
            </div>
          </CardBody>
        </Card>
      );
    }

    return this.props.children;
  }
}

/**
 * Props for single panel renderer
 */
interface PanelRendererProps {
  plugin: RegisteredPlugin;
}

/**
 * Renders a single dashboard panel plugin
 */
export function DashboardPanelRenderer({
  plugin,
}: PanelRendererProps): JSX.Element {
  const context = useDashboardPluginContext();
  const { config, component: Component, isVisible, mapProps } = plugin.plugin;

  // Check visibility
  if (isVisible && !isVisible(context)) {
    return <></>;
  }

  // Get additional props if mapProps is provided
  const additionalProps = mapProps ? mapProps(context) : {};

  const props: DashboardPanelProps = {
    userId: context.user ? Number(context.user.id) : undefined,
    isLoading: context.isLoading,
    onNavigate: context.navigate,
    ...additionalProps,
  };

  return (
    <DashboardPanelErrorBoundary pluginId={config.id} pluginName={config.name}>
      <Component {...props} />
    </DashboardPanelErrorBoundary>
  );
}

/**
 * Props for the panel grid component
 */
interface PanelGridProps {
  position: DashboardPanelPosition;
  className?: string;
}

/**
 * Renders all enabled panels for a specific position
 */
export function DashboardPanelGrid({
  position,
  className = '',
}: PanelGridProps): JSX.Element {
  const { getPluginsByPosition } = useDashboardPluginContext();
  const plugins = getPluginsByPosition(position);

  if (plugins.length === 0) {
    return <></>;
  }

  // Apply position-specific grid styles
  const gridStyles: Record<DashboardPanelPosition, string> = {
    'summary-cards': 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4',
    'main-left': 'space-y-6',
    'main-right': 'space-y-6',
    'full-width': 'space-y-6',
  };

  return (
    <div className={`${gridStyles[position]} ${className}`}>
      {plugins.map((plugin) => (
        <DashboardPanelRenderer key={plugin.plugin.config.id} plugin={plugin} />
      ))}
    </div>
  );
}

/**
 * Props for the two-column layout component
 */
interface TwoColumnLayoutProps {
  leftPosition?: DashboardPanelPosition;
  rightPosition?: DashboardPanelPosition;
  className?: string;
}

/**
 * Renders a two-column layout with panels
 */
export function DashboardTwoColumnLayout({
  leftPosition = 'main-left',
  rightPosition = 'main-right',
  className = '',
}: TwoColumnLayoutProps): JSX.Element {
  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${className}`}>
      <DashboardPanelGrid position={leftPosition} />
      <DashboardPanelGrid position={rightPosition} />
    </div>
  );
}

/**
 * Props for the full dashboard layout component
 */
interface DashboardLayoutProps {
  className?: string;
  children?: ReactNode;
}

/**
 * Complete dashboard layout with all panel positions
 */
export function DashboardLayout({
  className = '',
  children,
}: DashboardLayoutProps): JSX.Element {
  return (
    <div className={className}>
      {/* Summary Cards Row */}
      <DashboardPanelGrid position="summary-cards" className="mb-8" />

      {/* Full Width Panels (above two-column) */}
      <DashboardPanelGrid position="full-width" className="mb-6" />

      {/* Two Column Layout */}
      <DashboardTwoColumnLayout />

      {/* Additional content slot */}
      {children}
    </div>
  );
}
