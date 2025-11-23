import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteUser, getAllUsers, type User } from '../api/users';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Container,
  PageHeader,
  Section,
} from '../ui';

export function AdminUsersListPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllUsers();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleDelete = async (id: number, name: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete user "${name}"? This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      setDeletingId(id);
      await deleteUser(id);
      // Remove the deleted user from the list
      setUsers((prev) => prev.filter((user) => user.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (id: number) => {
    navigate(`/admin/users/${id}`);
  };

  const handleCreateNew = () => {
    navigate('/admin/users/new');
  };

  return (
    <div>
      <PageHeader
        title="User Management"
        description="View and manage all users in the system."
      />

      <Section>
        <Container>
          {error && (
            <div
              className="mb-6 p-4 bg-danger-50 border border-danger-200 rounded-lg text-danger-800"
              role="alert"
            >
              <strong className="font-medium">Error:</strong> {error}
            </div>
          )}

          <div className="mb-6 flex justify-end">
            <Button onClick={handleCreateNew}>Create New User</Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
            </CardHeader>
            <CardBody>
              {loading ? (
                <div className="text-center py-8 text-gray-500">
                  Loading users...
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No users found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Timezone
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {user.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                user.role === 'ADMIN'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.timezone}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleEdit(user.id)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleDelete(user.id, user.name)}
                                isLoading={deletingId === user.id}
                                disabled={deletingId === user.id}
                              >
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        </Container>
      </Section>
    </div>
  );
}
