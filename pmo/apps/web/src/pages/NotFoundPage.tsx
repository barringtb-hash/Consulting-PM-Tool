/**
 * 404 Not Found Page
 *
 * Displayed when users navigate to an invalid route.
 */

import { Link } from 'react-router';
import { Home, ArrowLeft } from 'lucide-react';

import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

export function NotFoundPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="mb-6">
          <div className="text-6xl font-bold text-neutral-300 dark:text-neutral-600">
            404
          </div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mt-4">
            Page Not Found
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-2">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="secondary"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
          <Link to="/dashboard">
            <Button>
              <Home className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

export default NotFoundPage;
