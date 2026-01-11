/**
 * OAuth Callback Page for Scheduling Integrations
 * Handles OAuth redirects from Google, Outlook, Zoom, Google Meet, and Teams
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Card, CardBody } from '../../../ui/Card';
import { Button } from '../../../ui/Button';
import { buildApiUrl } from '../../../api/config';
import { buildOptions } from '../../../api/http';

type IntegrationType = 'calendar' | 'video';
type Platform = 'google' | 'outlook' | 'zoom' | 'google-meet' | 'teams';

interface OAuthCallbackPageProps {
  integrationType: IntegrationType;
  platform: Platform;
}

export function OAuthCallbackPage({
  integrationType,
  platform,
}: OAuthCallbackPageProps): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>(
    'processing',
  );
  const [message, setMessage] = useState<string>(
    'Processing authentication...',
  );
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      // Check for OAuth errors
      if (error) {
        setStatus('error');
        setMessage('Authentication was cancelled or failed');
        setErrorDetails(errorDescription || error);
        return;
      }

      // Check for required parameters
      if (!code) {
        setStatus('error');
        setMessage('Missing authorization code');
        setErrorDetails(
          'The OAuth callback did not include an authorization code.',
        );
        return;
      }

      try {
        // Determine the callback endpoint based on integration type and platform
        let callbackEndpoint: string;

        if (integrationType === 'calendar') {
          if (platform === 'google') {
            callbackEndpoint = '/scheduling/calendar/google/callback';
          } else if (platform === 'outlook') {
            callbackEndpoint = '/scheduling/calendar/outlook/callback';
          } else {
            throw new Error(`Unknown calendar platform: ${platform}`);
          }
        } else if (integrationType === 'video') {
          // Parse configId from state with proper error handling
          let stateData: { configId?: number } = {};
          if (state) {
            try {
              stateData = JSON.parse(atob(state));
            } catch {
              throw new Error(
                'Invalid OAuth state parameter. Please try connecting again.',
              );
            }
          }
          const configId = stateData.configId;

          if (!configId) {
            throw new Error('Missing configuration ID in state');
          }

          callbackEndpoint = `/scheduling/${configId}/video/oauth/${platform}/callback`;
        } else {
          throw new Error(`Unknown integration type: ${integrationType}`);
        }

        // Build the callback URL with query params
        const callbackUrl = new URL(buildApiUrl(callbackEndpoint));
        callbackUrl.searchParams.set('code', code);
        if (state) {
          callbackUrl.searchParams.set('state', state);
        }

        // Call the backend to complete the OAuth flow
        const response = await fetch(callbackUrl.toString(), {
          ...buildOptions(),
          method: integrationType === 'video' ? 'POST' : 'GET',
          body:
            integrationType === 'video'
              ? JSON.stringify({ code, state })
              : undefined,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || 'Failed to complete authentication',
          );
        }

        setStatus('success');
        setMessage(getSuccessMessage(platform));
      } catch (err) {
        setStatus('error');
        setMessage('Failed to complete authentication');
        setErrorDetails(
          err instanceof Error ? err.message : 'Unknown error occurred',
        );
      }
    };

    handleCallback();
  }, [searchParams, integrationType, platform]);

  const getSuccessMessage = (platform: Platform): string => {
    const platformNames: Record<Platform, string> = {
      google: 'Google Calendar',
      outlook: 'Outlook Calendar',
      zoom: 'Zoom',
      'google-meet': 'Google Meet',
      teams: 'Microsoft Teams',
    };
    return `${platformNames[platform]} connected successfully!`;
  };

  const getPlatformIcon = (platform: Platform): string => {
    const icons: Record<Platform, string> = {
      google: 'G',
      outlook: 'O',
      zoom: 'Z',
      'google-meet': 'M',
      teams: 'T',
    };
    return icons[platform];
  };

  const getPlatformColor = (platform: Platform): string => {
    const colors: Record<Platform, string> = {
      google: 'bg-red-100 text-red-600',
      outlook: 'bg-blue-100 text-blue-600',
      zoom: 'bg-blue-100 text-blue-600',
      'google-meet': 'bg-green-100 text-green-600',
      teams: 'bg-purple-100 text-purple-600',
    };
    return colors[platform];
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardBody className="text-center space-y-6 py-8">
          {/* Platform Icon */}
          <div className="flex justify-center">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${getPlatformColor(platform)}`}
            >
              {getPlatformIcon(platform)}
            </div>
          </div>

          {/* Status Icon */}
          <div className="flex justify-center">
            {status === 'processing' && (
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle className="w-12 h-12 text-green-500" />
            )}
            {status === 'error' && (
              <XCircle className="w-12 h-12 text-red-500" />
            )}
          </div>

          {/* Message */}
          <div>
            <h2
              className={`text-xl font-semibold ${
                status === 'success'
                  ? 'text-green-700 dark:text-green-400'
                  : status === 'error'
                    ? 'text-red-700 dark:text-red-400'
                    : 'text-neutral-900 dark:text-neutral-100'
              }`}
            >
              {message}
            </h2>
            {errorDetails && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                {errorDetails}
              </p>
            )}
          </div>

          {/* Actions */}
          {status !== 'processing' && (
            <div className="flex gap-3 justify-center">
              <Button
                onClick={() => navigate('/ai-tools/scheduling')}
                variant={status === 'success' ? 'primary' : 'secondary'}
              >
                {status === 'success'
                  ? 'Continue to Scheduling'
                  : 'Back to Scheduling'}
              </Button>
              {status === 'error' && (
                <Button
                  variant="outline"
                  onClick={() => navigate('/ai-tools/scheduling?retry=true')}
                >
                  Try Again
                </Button>
              )}
            </div>
          )}

          {/* Auto-redirect for success */}
          {status === 'success' && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Redirecting to scheduling in 3 seconds...
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

// Export pre-configured callback pages for each integration
export function GoogleCalendarCallback(): JSX.Element {
  return <OAuthCallbackPage integrationType="calendar" platform="google" />;
}

export function OutlookCalendarCallback(): JSX.Element {
  return <OAuthCallbackPage integrationType="calendar" platform="outlook" />;
}

export function ZoomCallback(): JSX.Element {
  return <OAuthCallbackPage integrationType="video" platform="zoom" />;
}

export function GoogleMeetCallback(): JSX.Element {
  return <OAuthCallbackPage integrationType="video" platform="google-meet" />;
}

export function TeamsCallback(): JSX.Element {
  return <OAuthCallbackPage integrationType="video" platform="teams" />;
}

export default OAuthCallbackPage;
