/**
 * Unified Marketing Page
 *
 * Consolidates Marketing, Social Publishing, and Content Calendar into a single
 * tabbed interface. Uses URL-based tab state for shareable/bookmarkable tab views.
 *
 * Features:
 * - Content Library: Create and manage marketing content
 * - Social Posts: Create, schedule, and publish social media posts
 * - Calendar: Visual calendar view of scheduled content
 * - Settings: Platform connections and configuration
 *
 * @module pages/UnifiedMarketingPage
 */

import React from 'react';
import { useSearchParams } from 'react-router';
import { Megaphone, FileText, Share2, Calendar, Settings } from 'lucide-react';
import { PageHeader } from '../ui/PageHeader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/Tabs';
import {
  ContentLibraryTab,
  SocialPostsTab,
  CalendarTab,
  SettingsTab,
} from '../features/marketing/tabs';

/**
 * Valid tab values for the Marketing page
 */
type MarketingTab = 'content' | 'social' | 'calendar' | 'settings';

/**
 * Type guard to validate tab parameter values
 */
function isValidTab(tab: string | null): tab is MarketingTab {
  return (
    tab === 'content' ||
    tab === 'social' ||
    tab === 'calendar' ||
    tab === 'settings'
  );
}

/**
 * UnifiedMarketingPage Component
 *
 * Main marketing hub that combines content management, social publishing,
 * calendar scheduling, and platform settings into a cohesive interface.
 *
 * URL Parameters:
 * - tab: The active tab ('content' | 'social' | 'calendar' | 'settings')
 *
 * @example
 * // Direct navigation to social posts tab
 * /marketing?tab=social
 *
 * @returns The rendered marketing page with tabbed interface
 */
function UnifiedMarketingPage(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab: MarketingTab = isValidTab(tabParam) ? tabParam : 'content';

  /**
   * Handle tab change by updating URL search params
   * This enables shareable/bookmarkable tab states
   */
  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <PageHeader
        title="Marketing"
        description="Manage content, social posts, and publishing schedules"
        icon={Megaphone}
      />

      <div className="page-content space-y-6">
        <Tabs
          defaultValue="content"
          value={activeTab}
          onValueChange={handleTabChange}
        >
          <TabsList>
            <TabsTrigger value="content">
              <FileText className="w-4 h-4" />
              Content Library
            </TabsTrigger>
            <TabsTrigger value="social">
              <Share2 className="w-4 h-4" />
              Social Posts
            </TabsTrigger>
            <TabsTrigger value="calendar">
              <Calendar className="w-4 h-4" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="content">
            <ContentLibraryTab
              onNavigateToCalendar={() => handleTabChange('calendar')}
            />
          </TabsContent>

          <TabsContent value="social">
            <SocialPostsTab
              onNavigateToSettings={() => handleTabChange('settings')}
            />
          </TabsContent>

          <TabsContent value="calendar">
            <CalendarTab />
          </TabsContent>

          <TabsContent value="settings">
            <SettingsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default UnifiedMarketingPage;
