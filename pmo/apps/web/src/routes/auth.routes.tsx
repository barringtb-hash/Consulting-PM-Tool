/**
 * Authentication Routes
 *
 * Public routes that do not require authentication:
 * - Login, forgot password, reset password
 * - Public booking pages
 */

import { lazy, Suspense } from 'react';
import { Route } from 'react-router';

// Core auth pages (always loaded)
import LoginPage from '../pages/LoginPage';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import ResetPasswordPage from '../pages/ResetPasswordPage';

// Public booking pages (lazy-loaded)
const PublicBookingPage = lazy(
  () => import('../pages/public/PublicBookingPage'),
);
const BookingWidget = lazy(() =>
  import('../pages/public/BookingWidget').then((m) => ({
    default: m.BookingWidget,
  })),
);
const BookingManagementPage = lazy(() =>
  import('../pages/public/BookingManagementPage').then((m) => ({
    default: m.BookingManagementPage,
  })),
);

/**
 * Loading spinner for booking pages
 */
function BookingLoader(): JSX.Element {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
}

/**
 * Loading spinner for widget (smaller, white background)
 */
function WidgetLoader(): JSX.Element {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
}

/**
 * Authentication and public routes
 */
export function authRoutes(): JSX.Element {
  return (
    <>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/book/:slug"
        element={
          <Suspense fallback={<BookingLoader />}>
            <PublicBookingPage />
          </Suspense>
        }
      />
      <Route
        path="/booking/:slug/widget"
        element={
          <Suspense fallback={<WidgetLoader />}>
            <BookingWidget />
          </Suspense>
        }
      />
      <Route
        path="/booking/:slug/manage"
        element={
          <Suspense fallback={<BookingLoader />}>
            <BookingManagementPage />
          </Suspense>
        }
      />
    </>
  );
}
