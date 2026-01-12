/**
 * Admin Users List Page
 *
 * Displays a list of all users in the system with management capabilities.
 * Supports viewing, editing, and deleting users with role-based access control.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Users, Plus, UserCheck, Shield, ShieldAlert } from 'lucide-react';
import { deleteUser, getAllUsers, type User } from '../api/users';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  PageHeader,
} from '../ui';

/**
 * Skeleton loader component for the users table
 * Displays placeholder content while data is being fetched
 */
function UsersTableSkeleton(): JSX.Element {
  return (
    <div className="animate-pulse">
      {/* Table header skeleton */}
      <div className="bg-neutral-100 dark:bg-neutral-800 px-6 py-3 flex gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded flex-1"
          />
        ))}
      </div>
      {/* Table rows skeleton */}
      {[1, 2, 3, 4, 5].map((row) => (
        <div
          key={row}
          className="px-6 py-4 flex gap-4 border-b border-neutral-200 dark:border-neutral-700"
        >
          {[1, 2, 3, 4, 5].map((col) => (
            <div
              key={col}
              className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded flex-1"
            />
          ))}
          <div className="flex gap-2 flex-1">
            <div className="h-8 w-16 bg-neutral-200 dark:bg-neutral-700 rounded" />
            <div className="h-8 w-16 bg-neutral-200 dark:bg-neutral-700 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton loader for stat cards
 */
function StatCardsSkeleton(): JSX.Element {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardBody className="py-3 sm:py-4">
            <div className="flex items-center gap-2 sm:gap-3 animate-pulse">
              <div className="p-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg shrink-0 w-9 h-9 sm:w-10 sm:h-10" />
              <div className="min-w-0 flex-1">
                <div className="h-6 sm:h-7 bg-neutral-200 dark:bg-neutral-700 rounded w-12 mb-1" />
                <div className="h-3 sm:h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-20" />
              </div>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

export function AdminUsersListPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getAllUsers();
        // Only update state if component is still mounted
        if (isMounted) {
          setUsers(data);
        }
      } catch (err) {
        // Only update error state if component is still mounted and not aborted
        if (isMounted && !controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Failed to load users');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadUsers();

    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isMounted = false;
      controller.abort();
    };
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

  // Calculate user stats
  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === 'ADMIN').length,
    superAdmins: users.filter((u) => u.role === 'SUPER_ADMIN').length,
    regularUsers: users.filter((u) => u.role === 'USER').length,
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <PageHeader
        title="User Management"
        description="View and manage all users in the system."
        icon={Users}
        actions={
          <Button onClick={handleCreateNew}>
            <Plus className="w-4 h-4 mr-2" />
            Create New User
          </Button>
        }
      />

      <div className="page-content">
        <div className="container-padding py-6">
          {error && (
            <div
              className="mb-6 p-4 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg text-danger-800 dark:text-danger-200"
              role="alert"
            >
              <strong className="font-medium">Error:</strong> {error}
            </div>
          )}

          {/* Stats Cards */}
          {loading ? (
            <StatCardsSkeleton />
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardBody className="py-3 sm:py-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg shrink-0">
                      <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                        {stats.total}
                      </p>
                      <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 leading-tight">
                        Total Users
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>
              <Card>
                <CardBody className="py-3 sm:py-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg shrink-0">
                      <UserCheck className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                        {stats.regularUsers}
                      </p>
                      <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 leading-tight">
                        Regular Users
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>
              <Card>
                <CardBody className="py-3 sm:py-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg shrink-0">
                      <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                        {stats.admins}
                      </p>
                      <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 leading-tight">
                        Admins
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>
              <Card>
                <CardBody className="py-3 sm:py-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg shrink-0">
                      <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                        {stats.superAdmins}
                      </p>
                      <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 leading-tight">
                        Super Admins
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              {loading ? (
                <UsersTableSkeleton />
              ) : users.length === 0 ? (
                <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                  No users found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
                    <thead className="bg-neutral-50 dark:bg-neutral-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                          Timezone
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                          Created
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-700">
                      {users.map((user) => (
                        <tr
                          key={user.id}
                          className="hover:bg-neutral-50 dark:hover:bg-neutral-700"
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900 dark:text-neutral-100">
                            {user.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400">
                            {user.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                user.role === 'SUPER_ADMIN'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                  : user.role === 'ADMIN'
                                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                                    : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200'
                              }`}
                            >
                              {user.role === 'SUPER_ADMIN'
                                ? 'Super Admin'
                                : user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400">
                            {user.timezone}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400">
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
        </div>
      </div>
    </div>
  );
}
