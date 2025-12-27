import React, { useState, useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, UserPlus, X, Shield, Edit2, Eye, Crown } from 'lucide-react';
import {
  fetchProjectMembers,
  fetchTenantUsers,
  addProjectMember,
  updateProjectMember,
  removeProjectMember,
  type ProjectRole,
} from '../../api/projects';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { useToast } from '../../ui/Toast';

interface ProjectMembersManagerProps {
  projectId: number;
  ownerId: number;
  ownerName?: string;
  isAdmin: boolean;
}

const ROLE_OPTIONS: Array<{
  value: ProjectRole;
  label: string;
  icon: React.ElementType;
}> = [
  { value: 'VIEW_ONLY', label: 'View Only', icon: Eye },
  { value: 'EDIT', label: 'Editor', icon: Edit2 },
  { value: 'ADMIN', label: 'Admin', icon: Shield },
];

const getRoleIcon = (role: ProjectRole) => {
  const option = ROLE_OPTIONS.find((r) => r.value === role);
  return option?.icon || Eye;
};

const getRoleLabel = (role: ProjectRole) => {
  const option = ROLE_OPTIONS.find((r) => r.value === role);
  return option?.label || role;
};

export function ProjectMembersManager({
  projectId,
  ownerId,
  ownerName,
  isAdmin,
}: ProjectMembersManagerProps): JSX.Element {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState<ProjectRole>('VIEW_ONLY');

  // Fetch project members
  const membersQuery = useQuery({
    queryKey: ['project-members', projectId],
    queryFn: () => fetchProjectMembers(projectId),
  });

  // Fetch tenant users for the dropdown
  const tenantUsersQuery = useQuery({
    queryKey: ['tenant-users', searchTerm],
    queryFn: () => fetchTenantUsers(searchTerm),
    enabled: showAddMember,
  });

  // Filter out users who are already members or the owner
  const availableUsers = useMemo(() => {
    if (!tenantUsersQuery.data) return [];
    const memberIds = new Set(membersQuery.data?.map((m) => m.userId) || []);
    return tenantUsersQuery.data.filter(
      (u) => u.id !== ownerId && !memberIds.has(u.id),
    );
  }, [tenantUsersQuery.data, membersQuery.data, ownerId]);

  // Add member mutation
  const addMemberMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: ProjectRole }) =>
      addProjectMember(projectId, { userId, role }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['project-members', projectId],
      });
      showToast('Member added successfully', 'success');
      setShowAddMember(false);
      setSelectedUserId(null);
      setSelectedRole('VIEW_ONLY');
    },
    onError: (error: Error) => {
      showToast(error.message || 'Failed to add member', 'error');
    },
  });

  // Update member mutation
  const updateMemberMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: ProjectRole }) =>
      updateProjectMember(projectId, userId, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['project-members', projectId],
      });
      showToast('Member role updated', 'success');
    },
    onError: (error: Error) => {
      showToast(error.message || 'Failed to update member', 'error');
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: (userId: number) => removeProjectMember(projectId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['project-members', projectId],
      });
      showToast('Member removed', 'success');
    },
    onError: (error: Error) => {
      showToast(error.message || 'Failed to remove member', 'error');
    },
  });

  const handleAddMember = useCallback(() => {
    if (selectedUserId) {
      addMemberMutation.mutate({ userId: selectedUserId, role: selectedRole });
    }
  }, [selectedUserId, selectedRole, addMemberMutation]);

  const handleUpdateRole = useCallback(
    (userId: number, newRole: ProjectRole) => {
      updateMemberMutation.mutate({ userId, role: newRole });
    },
    [updateMemberMutation],
  );

  const handleRemoveMember = useCallback(
    (userId: number) => {
      if (window.confirm('Are you sure you want to remove this member?')) {
        removeMemberMutation.mutate(userId);
      }
    },
    [removeMemberMutation],
  );

  return (
    <div className="space-y-4">
      {/* Owner Section */}
      <div className="border-b border-neutral-200 dark:border-neutral-700 pb-4">
        <h4 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-2">
          Owner
        </h4>
        <div className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900">
            <Crown className="h-4 w-4 text-primary-600 dark:text-primary-400" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-neutral-900 dark:text-neutral-100">
              {ownerName || 'Project Owner'}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Full admin access
            </p>
          </div>
        </div>
      </div>

      {/* Team Members Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
            Team Members ({membersQuery.data?.length || 0})
          </h4>
          {isAdmin && !showAddMember && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowAddMember(true)}
            >
              <UserPlus className="w-4 h-4" />
              Add Member
            </Button>
          )}
        </div>

        {/* Add Member Form */}
        {showAddMember && isAdmin && (
          <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg mb-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {tenantUsersQuery.isLoading && (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Loading users...
              </p>
            )}

            {availableUsers.length > 0 && (
              <div className="max-h-48 overflow-y-auto space-y-1">
                {availableUsers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => setSelectedUserId(user.id)}
                    className={`w-full p-2 text-left rounded-lg transition-colors ${
                      selectedUserId === user.id
                        ? 'bg-primary-100 dark:bg-primary-900/50 border-primary-300'
                        : 'hover:bg-neutral-100 dark:hover:bg-neutral-700'
                    }`}
                  >
                    <p className="font-medium text-neutral-900 dark:text-neutral-100 text-sm">
                      {user.name}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {user.email}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {searchTerm &&
              availableUsers.length === 0 &&
              !tenantUsersQuery.isLoading && (
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  No users found or all users are already members.
                </p>
              )}

            {selectedUserId && (
              <div className="flex items-center gap-2">
                <label className="text-sm text-neutral-700 dark:text-neutral-300">
                  Role:
                </label>
                <Select
                  value={selectedRole}
                  onChange={(e) =>
                    setSelectedRole(e.target.value as ProjectRole)
                  }
                  className="flex-1"
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <Button
                size="sm"
                onClick={handleAddMember}
                disabled={!selectedUserId || addMemberMutation.isPending}
                isLoading={addMemberMutation.isPending}
              >
                Add Member
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setShowAddMember(false);
                  setSelectedUserId(null);
                  setSearchTerm('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Members List */}
        {membersQuery.isLoading && (
          <p className="text-neutral-500 dark:text-neutral-400">
            Loading members...
          </p>
        )}

        {membersQuery.data && membersQuery.data.length === 0 && (
          <p className="text-neutral-500 dark:text-neutral-400 text-sm py-4 text-center">
            No team members yet.{' '}
            {isAdmin && 'Click "Add Member" to invite someone.'}
          </p>
        )}

        {membersQuery.data && membersQuery.data.length > 0 && (
          <div className="space-y-2">
            {membersQuery.data.map((member) => {
              const RoleIcon = getRoleIcon(member.role);
              return (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-3 border border-neutral-200 dark:border-neutral-700 rounded-lg"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-700">
                    <RoleIcon className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
                      {member.user.name}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                      {member.user.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAdmin ? (
                      <Select
                        value={member.role}
                        onChange={(e) =>
                          handleUpdateRole(
                            member.userId,
                            e.target.value as ProjectRole,
                          )
                        }
                        className="text-sm"
                        disabled={updateMemberMutation.isPending}
                      >
                        {ROLE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">
                        {getRoleLabel(member.role)}
                      </span>
                    )}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member.userId)}
                        className="p-1 text-neutral-400 hover:text-danger-600 transition-colors"
                        title="Remove member"
                        disabled={removeMemberMutation.isPending}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProjectMembersManager;
