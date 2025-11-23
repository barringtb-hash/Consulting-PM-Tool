import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getUserById,
  updateUser,
  type UpdateUserInput,
  type User,
} from '../api/users';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Container,
  Input,
  PageHeader,
  Section,
  Select,
} from '../ui';

export function AdminUserEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [form, setForm] = useState<UpdateUserInput>({
    name: '',
    email: '',
    password: '',
    timezone: '',
    role: 'USER',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      if (!id) {
        setError('Invalid user ID');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await getUserById(parseInt(id, 10));
        setUser(data);
        setForm({
          name: data.name,
          email: data.email,
          password: '', // Leave empty - only set if changing
          timezone: data.timezone,
          role: data.role,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load user');
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !user) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Only send fields that have changed
      const updates: UpdateUserInput = {};
      if (form.name && form.name !== user.name) updates.name = form.name;
      if (form.email && form.email !== user.email) updates.email = form.email;
      if (form.password) updates.password = form.password; // Only if set
      if (form.timezone && form.timezone !== user.timezone)
        updates.timezone = form.timezone;
      if (form.role && form.role !== user.role) updates.role = form.role;

      const updated = await updateUser(parseInt(id, 10), updates);
      setUser(updated);
      setSuccess(true);
      // Clear password field after successful update
      setForm((prev) => ({ ...prev, password: '' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCancel = () => {
    navigate('/admin/users');
  };

  if (loading) {
    return (
      <div>
        <PageHeader title="Edit User" description="Update user information." />
        <Section>
          <Container maxWidth="md">
            <div className="text-center py-8 text-gray-500">
              Loading user...
            </div>
          </Container>
        </Section>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div>
        <PageHeader title="Edit User" description="Update user information." />
        <Section>
          <Container maxWidth="md">
            <div
              className="p-4 bg-danger-50 border border-danger-200 rounded-lg text-danger-800"
              role="alert"
            >
              <strong className="font-medium">Error:</strong> {error}
            </div>
            <div className="mt-4">
              <Button onClick={handleCancel}>Back to Users</Button>
            </div>
          </Container>
        </Section>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Edit User"
        description="Update user information and permissions."
      />

      <Section>
        <Container maxWidth="md">
          {success && (
            <div
              className="mb-6 p-4 bg-success-50 border border-success-200 rounded-lg text-success-800"
              role="alert"
            >
              <strong className="font-medium">Success!</strong> User updated
              successfully.
            </div>
          )}

          {error && (
            <div
              className="mb-6 p-4 bg-danger-50 border border-danger-200 rounded-lg text-danger-800"
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
                  minLength={8}
                  maxLength={255}
                  placeholder="Leave blank to keep current password"
                  helperText="Leave blank to keep current password. If changing, must be at least 8 characters with uppercase, lowercase, number, and special character"
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
                  value={form.role}
                  onChange={handleChange}
                  required
                >
                  <option value="USER">User</option>
                  <option value="ADMIN">Admin</option>
                </Select>

                <div className="flex gap-3 pt-4">
                  <Button type="submit" isLoading={saving} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleCancel}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </Container>
      </Section>
    </div>
  );
}
