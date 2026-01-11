/**
 * Admin Create User Page
 *
 * Provides a form interface for creating new users in the system.
 * Supports setting name, email, password, timezone, and role.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { UserPlus, ArrowLeft } from 'lucide-react';
import { createUser, type CreateUserInput } from '../api/users';
import { useAuth } from '../auth/AuthContext';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Input,
  PageHeader,
  Select,
} from '../ui';

export function AdminCreateUserPage() {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  const [form, setForm] = useState<CreateUserInput>({
    name: '',
    email: '',
    password: '',
    timezone: 'America/Chicago',
    role: 'USER',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await createUser(form);
      setSuccess(true);
      // Reset form but keep timezone and role
      setForm({
        name: '',
        email: '',
        password: '',
        timezone: form.timezone,
        role: 'USER',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleBack = () => {
    navigate('/admin/users');
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <PageHeader
        title="Create New User"
        description="Add a new user to the AI Consulting PMO platform."
        icon={UserPlus}
        actions={
          <Button variant="secondary" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Users
          </Button>
        }
      />

      <div className="page-content">
        <div className="container-padding py-6 max-w-2xl mx-auto">
          {success && (
            <div
              className="mb-6 p-4 bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-lg text-success-800 dark:text-success-200"
              role="alert"
            >
              <strong className="font-medium">Success!</strong> User created
              successfully.
            </div>
          )}

          {error && (
            <div
              className="mb-6 p-4 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg text-danger-800 dark:text-danger-200"
              role="alert"
            >
              <strong className="font-medium">Error:</strong> {error}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>User Details</CardTitle>
            </CardHeader>
            <CardBody>
              <form onSubmit={handleSubmit} className="space-y-5">
                <Input
                  label="Name"
                  type="text"
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  maxLength={255}
                  placeholder="Enter full name"
                />

                <Input
                  label="Email"
                  type="email"
                  id="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  maxLength={255}
                  placeholder="user@example.com"
                />

                <Input
                  label="Password"
                  type="password"
                  id="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  minLength={8}
                  maxLength={255}
                  placeholder="Enter password"
                  helperText="Must be at least 8 characters with uppercase, lowercase, number, and special character"
                />

                <Select
                  label="Timezone"
                  id="timezone"
                  name="timezone"
                  value={form.timezone}
                  onChange={handleChange}
                  required
                >
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                  <option value="UTC">UTC</option>
                  <option value="Europe/London">London</option>
                  <option value="Europe/Paris">Paris</option>
                  <option value="Asia/Tokyo">Tokyo</option>
                  <option value="Asia/Shanghai">Shanghai</option>
                  <option value="Australia/Sydney">Sydney</option>
                </Select>

                <Select
                  label="Role"
                  id="role"
                  name="role"
                  value={form.role || 'USER'}
                  onChange={handleChange}
                >
                  <option value="USER">User</option>
                  <option value="ADMIN">Admin</option>
                  {isSuperAdmin && (
                    <option value="SUPER_ADMIN">Super Admin</option>
                  )}
                </Select>

                <div className="flex gap-3 pt-4">
                  <Button type="submit" isLoading={loading} disabled={loading}>
                    {loading ? 'Creating...' : 'Create User'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      setForm({
                        name: '',
                        email: '',
                        password: '',
                        timezone: 'America/Chicago',
                        role: 'USER',
                      })
                    }
                    disabled={loading}
                  >
                    Reset
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
