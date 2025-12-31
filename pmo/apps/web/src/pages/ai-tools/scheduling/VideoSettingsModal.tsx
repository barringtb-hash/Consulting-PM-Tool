/**
 * Video Settings Modal
 * Configure default settings for video conferencing integrations
 */

import { useState } from 'react';
import {
  X,
  Video,
  Settings,
  Save,
  Loader2,
  Clock,
  Users,
  Mic,
  Monitor,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../../ui/Card';
import { Button } from '../../../ui/Button';
import { Badge } from '../../../ui/Badge';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { buildApiUrl } from '../../../api/config';
import { buildOptions } from '../../../api/http';
import { useToast } from '../../../ui/Toast';

interface VideoConfig {
  id: number;
  platform: 'ZOOM' | 'GOOGLE_MEET' | 'TEAMS';
  isActive: boolean;
  defaultSettings?: {
    autoRecord?: boolean;
    waitingRoom?: boolean;
    muteParticipantsOnEntry?: boolean;
    joinBeforeHost?: boolean;
    defaultDurationMinutes?: number;
  };
}

interface VideoSettingsModalProps {
  configId: number;
  videoConfig: VideoConfig;
  onClose: () => void;
  onSuccess?: () => void;
}

async function updateVideoConfig(
  configId: number,
  videoConfigId: number,
  data: { isActive?: boolean; defaultSettings?: VideoConfig['defaultSettings'] },
): Promise<VideoConfig> {
  const res = await fetch(
    buildApiUrl(`/scheduling/${configId}/video/config/${videoConfigId}`),
    {
      ...buildOptions(),
      method: 'PATCH',
      body: JSON.stringify(data),
    },
  );
  if (!res.ok) throw new Error('Failed to update video settings');
  const result = await res.json();
  return result.data;
}

const PLATFORM_NAMES: Record<string, string> = {
  ZOOM: 'Zoom',
  GOOGLE_MEET: 'Google Meet',
  TEAMS: 'Microsoft Teams',
};

const PLATFORM_COLORS: Record<string, string> = {
  ZOOM: 'bg-blue-100 text-blue-700',
  GOOGLE_MEET: 'bg-green-100 text-green-700',
  TEAMS: 'bg-purple-100 text-purple-700',
};

export function VideoSettingsModal({
  configId,
  videoConfig,
  onClose,
  onSuccess,
}: VideoSettingsModalProps): JSX.Element {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [settings, setSettings] = useState({
    autoRecord: videoConfig.defaultSettings?.autoRecord ?? false,
    waitingRoom: videoConfig.defaultSettings?.waitingRoom ?? true,
    muteParticipantsOnEntry:
      videoConfig.defaultSettings?.muteParticipantsOnEntry ?? true,
    joinBeforeHost: videoConfig.defaultSettings?.joinBeforeHost ?? false,
    defaultDurationMinutes:
      videoConfig.defaultSettings?.defaultDurationMinutes ?? 30,
    isActive: videoConfig.isActive,
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      updateVideoConfig(configId, videoConfig.id, {
        isActive: settings.isActive,
        defaultSettings: {
          autoRecord: settings.autoRecord,
          waitingRoom: settings.waitingRoom,
          muteParticipantsOnEntry: settings.muteParticipantsOnEntry,
          joinBeforeHost: settings.joinBeforeHost,
          defaultDurationMinutes: settings.defaultDurationMinutes,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['video-configs', configId],
      });
      showToast('Video settings updated successfully', 'success');
      onSuccess?.();
      onClose();
    },
    onError: (error) => {
      showToast(
        error instanceof Error
          ? error.message
          : 'Failed to update video settings',
        'error',
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate();
  };

  const SettingRow = ({
    icon: Icon,
    label,
    description,
    checked,
    onChange,
  }: {
    icon: React.ElementType;
    label: string;
    description: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
  }) => (
    <div className="flex items-start justify-between p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 text-neutral-500 mt-0.5" />
        <div>
          <p className="font-medium text-neutral-900 dark:text-neutral-100">
            {label}
          </p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {description}
          </p>
        </div>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600 peer-checked:bg-blue-600"></div>
      </label>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-lg my-8">
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${PLATFORM_COLORS[videoConfig.platform]}`}
            >
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">
                {PLATFORM_NAMES[videoConfig.platform]} Settings
              </h2>
              <p className="text-sm text-neutral-500">
                Configure default meeting options
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Active Status */}
            <div className="flex items-center justify-between p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg">
              <div>
                <p className="font-medium text-neutral-900 dark:text-neutral-100">
                  Integration Active
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Enable this integration for new appointments
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={settings.isActive ? 'success' : 'secondary'}>
                  {settings.isActive ? 'Active' : 'Inactive'}
                </Badge>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.isActive}
                    onChange={(e) =>
                      setSettings({ ...settings, isActive: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            {/* Default Duration */}
            <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-5 h-5 text-neutral-500" />
                <p className="font-medium text-neutral-900 dark:text-neutral-100">
                  Default Meeting Duration
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {[15, 30, 45, 60, 90, 120].map((duration) => (
                  <button
                    key={duration}
                    type="button"
                    onClick={() =>
                      setSettings({
                        ...settings,
                        defaultDurationMinutes: duration,
                      })
                    }
                    className={`px-3 py-1.5 rounded-lg text-sm ${
                      settings.defaultDurationMinutes === duration
                        ? 'bg-blue-100 text-blue-700 border border-blue-300'
                        : 'bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-600'
                    }`}
                  >
                    {duration >= 60 ? `${duration / 60}h` : `${duration}m`}
                  </button>
                ))}
              </div>
            </div>

            {/* Meeting Settings */}
            <div className="space-y-3">
              <h3 className="font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Meeting Defaults
              </h3>

              <SettingRow
                icon={Users}
                label="Waiting Room"
                description="Participants wait in a lobby before joining"
                checked={settings.waitingRoom}
                onChange={(checked) =>
                  setSettings({ ...settings, waitingRoom: checked })
                }
              />

              <SettingRow
                icon={Mic}
                label="Mute on Entry"
                description="Automatically mute participants when they join"
                checked={settings.muteParticipantsOnEntry}
                onChange={(checked) =>
                  setSettings({ ...settings, muteParticipantsOnEntry: checked })
                }
              />

              <SettingRow
                icon={Users}
                label="Join Before Host"
                description="Allow participants to join before the host"
                checked={settings.joinBeforeHost}
                onChange={(checked) =>
                  setSettings({ ...settings, joinBeforeHost: checked })
                }
              />

              <SettingRow
                icon={Monitor}
                label="Auto-Record"
                description="Automatically record all meetings"
                checked={settings.autoRecord}
                onChange={(checked) =>
                  setSettings({ ...settings, autoRecord: checked })
                }
              />
            </div>

            {/* Platform-specific Notes */}
            {videoConfig.platform === 'ZOOM' && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-700 dark:text-blue-300">
                <p className="font-medium">Zoom-specific features:</p>
                <ul className="list-disc list-inside mt-1 text-blue-600 dark:text-blue-400">
                  <li>Cloud recording available (if plan supports)</li>
                  <li>Breakout rooms supported</li>
                </ul>
              </div>
            )}

            {videoConfig.platform === 'GOOGLE_MEET' && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-sm text-green-700 dark:text-green-300">
                <p className="font-medium">Google Meet notes:</p>
                <ul className="list-disc list-inside mt-1 text-green-600 dark:text-green-400">
                  <li>Recording requires Workspace account</li>
                  <li>Integrates with Google Calendar</li>
                </ul>
              </div>
            )}

            {videoConfig.platform === 'TEAMS' && (
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-sm text-purple-700 dark:text-purple-300">
                <p className="font-medium">Microsoft Teams notes:</p>
                <ul className="list-disc list-inside mt-1 text-purple-600 dark:text-purple-400">
                  <li>Integrates with Outlook Calendar</li>
                  <li>Enterprise features available</li>
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Settings
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}

export default VideoSettingsModal;
