import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  ArrowLeft,
  LayoutDashboard,
  CheckSquare,
  Target,
  Users,
  FolderOpen,
  Settings,
  Megaphone,
  Edit2,
  Archive,
  UserPlus,
  Lock,
  Globe,
} from 'lucide-react';
import {
  useClient,
  useDeleteProject,
  useProject,
  useUpdateProject,
} from '../api/queries';
import { useAuth } from '../auth/AuthContext';
import { type Project, type ProjectStatus } from '../api/projects';
import useRedirectOnUnauthorized from '../auth/useRedirectOnUnauthorized';
import { useClientProjectContext } from './ClientProjectContext';
import { Button } from '../ui/Button';
import { PageHeader } from '../ui/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';
import { ProjectOverviewTab } from '../features/projects/ProjectOverviewTab';
import { ProjectTasksTab } from '../features/projects/ProjectTasksTab';
import { ProjectStatusTab } from '../features/status/ProjectStatusTab';
import ProjectMeetingsPanel from '../features/meetings/ProjectMeetingsPanel';
import { Badge } from '../ui/Badge';
import { ProjectStatusPill } from '../components/ProjectStatusPill';
import { ProjectMembersManager } from '../components/projects/ProjectMembersManager';
import { Card, CardBody, CardHeader, CardTitle } from '../ui/Card';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { useToast } from '../ui/Toast';
import { EMPTY_STATES, formatStatus } from '../utils/typography';

// Import milestone components
import {
  useProjectMilestones,
  useCreateMilestone,
  useUpdateMilestone,
  useDeleteMilestone,
  MILESTONE_STATUSES,
} from '../hooks/milestones';
import {
  useProjectAssets,
  useLinkAssetToProject,
  useUnlinkAssetFromProject,
  useAssets,
  useCreateAsset,
} from '../api/queries';
import { type Milestone } from '../api/milestones';
import AssetForm, {
  assetFormValuesToPayload,
  type AssetFormValues,
} from '../components/AssetForm';
import {
  useProjectMarketingContents,
  useArchiveMarketingContent,
} from '../api/marketing';
import { GenerateFromProjectButton } from '../features/marketing';
import MarketingContentFormModal from '../features/marketing/MarketingContentFormModal';
import MarketingContentDetailModal from '../features/marketing/MarketingContentDetailModal';
import {
  type MarketingContent,
  CONTENT_TYPE_LABELS,
  CONTENT_STATUS_LABELS,
  getContentTypeIcon,
} from '../../../../packages/types/marketing';

const STATUS_OPTIONS: Array<{ value: ProjectStatus; label: string }> = [
  { value: 'PLANNING', label: 'Planning' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return EMPTY_STATES.noDate;
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Invalid date';
  }
}

function ProjectDashboardPage(): JSX.Element {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();
  const projectId = useMemo(() => Number(id), [id]);

  const projectQuery = useProject(
    Number.isNaN(projectId) ? undefined : projectId,
  );
  const project = projectQuery.data as Project | undefined;
  const clientQuery = useClient(project?.clientId);
  const updateProjectMutation = useUpdateProject(projectId || 0);
  const deleteProjectMutation = useDeleteProject();
  const { setSelectedClient, setSelectedProject } = useClientProjectContext();

  const [activeTab, setActiveTab] = useState('overview');
  const [showStatusEditor, setShowStatusEditor] = useState(false);
  const [editedStatus, setEditedStatus] = useState<ProjectStatus>('PLANNING');
  const [editedStartDate, setEditedStartDate] = useState('');
  const [editedEndDate, setEditedEndDate] = useState('');

  // Milestones
  const milestonesQuery = useProjectMilestones(projectId);
  const createMilestoneMutation = useCreateMilestone();
  const updateMilestoneMutation = useUpdateMilestone(projectId);
  const deleteMilestoneMutation = useDeleteMilestone(projectId);
  const [milestoneForm, setMilestoneForm] = useState({
    name: '',
    description: '',
    status: 'NOT_STARTED' as Milestone['status'],
    dueDate: '',
  });
  const [editingMilestoneId, setEditingMilestoneId] = useState<number | null>(
    null,
  );

  // Assets
  const projectAssetsQuery = useProjectAssets(projectId, false);
  const linkAssetMutation = useLinkAssetToProject(projectId || 0);
  const unlinkAssetMutation = useUnlinkAssetFromProject(projectId || 0);
  const availableAssetsQuery = useAssets(
    project ? { clientId: project.clientId } : undefined,
  );
  const createAssetMutation = useCreateAsset();
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [assetNotes, setAssetNotes] = useState('');
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [assetError, setAssetError] = useState<string | null>(null);

  // Marketing
  const projectMarketingContentsQuery = useProjectMarketingContents(projectId);
  const archiveMarketingContentMutation = useArchiveMarketingContent();
  const [selectedMarketingContent, setSelectedMarketingContent] =
    useState<MarketingContent | null>(null);
  const [editingMarketingContent, setEditingMarketingContent] =
    useState<MarketingContent | null>(null);
  const [showMarketingContentDetail, setShowMarketingContentDetail] =
    useState(false);
  const [showMarketingContentForm, setShowMarketingContentForm] =
    useState(false);

  useRedirectOnUnauthorized(projectQuery.error);
  useRedirectOnUnauthorized(clientQuery.error);

  const handleDeleteProject = async () => {
    if (!project) return;

    if (
      !window.confirm(
        `Are you sure you want to delete "${project.name}"? This will also delete all tasks, milestones, meetings, and other associated data. This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      await deleteProjectMutation.mutateAsync(projectId);
      // Clear context after successful deletion to keep UI consistent on failure
      setSelectedProject(null);
      showToast('Project deleted successfully', 'success');
      navigate('/dashboard');
    } catch {
      showToast('Failed to delete project', 'error');
    }
  };

  useEffect(() => {
    if (project) {
      setSelectedProject(project);
      setEditedStatus(project.status);
      setEditedStartDate(project.startDate?.slice(0, 10) ?? '');
      setEditedEndDate(project.endDate?.slice(0, 10) ?? '');
    }
  }, [project, setSelectedProject]);

  useEffect(() => {
    if (clientQuery.data) {
      setSelectedClient(clientQuery.data);
    }
  }, [clientQuery.data, setSelectedClient]);

  const handleUpdateProjectStatus = async () => {
    if (!project) return;

    try {
      await updateProjectMutation.mutateAsync({
        status: editedStatus,
        startDate: editedStartDate || undefined,
        endDate: editedEndDate || undefined,
      });
      setShowStatusEditor(false);
    } catch (err) {
      console.error('Failed to update project:', err);
    }
  };

  const handleSaveMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;

    const payload = {
      projectId: project.id,
      name: milestoneForm.name,
      description: milestoneForm.description || undefined,
      status: milestoneForm.status,
      dueDate: milestoneForm.dueDate || undefined,
    };

    try {
      if (editingMilestoneId) {
        await updateMilestoneMutation.mutateAsync({
          milestoneId: editingMilestoneId,
          payload: { ...payload, dueDate: milestoneForm.dueDate || null },
        });
      } else {
        await createMilestoneMutation.mutateAsync(payload);
      }

      setMilestoneForm({
        name: '',
        description: '',
        status: 'NOT_STARTED',
        dueDate: '',
      });
      setEditingMilestoneId(null);
    } catch (err) {
      console.error('Failed to save milestone:', err);
    }
  };

  const handleEditMilestone = (milestone: Milestone) => {
    setEditingMilestoneId(milestone.id);
    setMilestoneForm({
      name: milestone.name,
      description: milestone.description ?? '',
      status: milestone.status,
      dueDate: milestone.dueDate?.slice(0, 10) ?? '',
    });
  };

  const handleDeleteMilestone = async (milestoneId: number) => {
    try {
      await deleteMilestoneMutation.mutateAsync(milestoneId);
      if (editingMilestoneId === milestoneId) {
        setMilestoneForm({
          name: '',
          description: '',
          status: 'NOT_STARTED',
          dueDate: '',
        });
        setEditingMilestoneId(null);
      }
    } catch (err) {
      console.error('Failed to delete milestone:', err);
    }
  };

  const handleLinkAsset = async () => {
    if (!selectedAssetId) {
      setAssetError('Please select an asset');
      return;
    }

    try {
      await linkAssetMutation.mutateAsync({
        assetId: Number(selectedAssetId),
        notes: assetNotes || undefined,
      });
      setSelectedAssetId('');
      setAssetNotes('');
      setAssetError(null);
    } catch (err) {
      setAssetError(
        err instanceof Error ? err.message : 'Failed to link asset',
      );
    }
  };

  const handleUnlinkAsset = async (assetId: number) => {
    try {
      await unlinkAssetMutation.mutateAsync(assetId);
    } catch (err) {
      console.error('Failed to unlink asset:', err);
    }
  };

  const handleCreateAsset = async (values: AssetFormValues) => {
    if (!project) return;

    const payload = assetFormValuesToPayload({
      ...values,
      clientId:
        values.clientId || (project?.clientId ? String(project.clientId) : ''),
    });

    try {
      const asset = await createAssetMutation.mutateAsync(payload);
      await linkAssetMutation.mutateAsync({
        assetId: asset.id,
        notes: undefined,
      });
      setShowAssetForm(false);
    } catch (err) {
      console.error('Failed to create asset:', err);
    }
  };

  const projectAssets = useMemo(
    () => projectAssetsQuery.data ?? [],
    [projectAssetsQuery.data],
  );

  const availableAssets = useMemo(() => {
    const linkedIds = new Set(projectAssets.map((entry) => entry.assetId));
    const list = availableAssetsQuery.data ?? [];
    return list.filter((asset) => !linkedIds.has(asset.id));
  }, [availableAssetsQuery.data, projectAssets]);

  const milestones = useMemo(
    () => milestonesQuery.data ?? [],
    [milestonesQuery.data],
  );

  const marketingContents = useMemo(
    () => projectMarketingContentsQuery.data ?? [],
    [projectMarketingContentsQuery.data],
  );

  // Check if current user is admin (owner or has ADMIN role in project members)
  const isAdmin = useMemo(() => {
    if (!project || !user) return false;
    const userId = Number(user.id);
    // Owner always has admin access
    if (project.ownerId === userId) return true;
    // Check if user has ADMIN role in project members
    if (project.members) {
      return project.members.some(
        (m) => m.userId === userId && m.role === 'ADMIN',
      );
    }
    return false;
  }, [project, user]);

  const handleEditMarketingContent = (content: MarketingContent) => {
    setEditingMarketingContent(content);
    setShowMarketingContentForm(true);
    setShowMarketingContentDetail(false);
  };

  const handleViewMarketingContent = (content: MarketingContent) => {
    setSelectedMarketingContent(content);
    setShowMarketingContentDetail(true);
  };

  const handleArchiveMarketingContent = async (contentId: number) => {
    try {
      await archiveMarketingContentMutation.mutateAsync(contentId);
      if (editingMarketingContent?.id === contentId) {
        setEditingMarketingContent(null);
        setShowMarketingContentForm(false);
      }
      if (selectedMarketingContent?.id === contentId) {
        setSelectedMarketingContent(null);
        setShowMarketingContentDetail(false);
      }
      showToast('Marketing content archived successfully', 'success');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to archive marketing content';
      showToast(message, 'error');
    }
  };

  if (projectQuery.isLoading) {
    return (
      <main className="p-6">
        <p className="text-neutral-600 dark:text-neutral-400">
          Loading project…
        </p>
      </main>
    );
  }

  if (projectQuery.error || !project) {
    return (
      <main className="p-6">
        <p className="text-danger-600">
          {projectQuery.error ? 'Unable to load project' : 'Project not found'}
        </p>
        <Link to="/dashboard">
          <Button variant="secondary" className="mt-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </Link>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      {/* Page Header */}
      <PageHeader
        title={project.name}
        description={
          clientQuery.data ? (
            <span>
              Client:{' '}
              <Link
                to={`/clients/${clientQuery.data.id}`}
                className="text-primary-600 hover:text-primary-700"
              >
                {clientQuery.data.name}
              </Link>
            </span>
          ) : (
            'Loading client...'
          )
        }
        action={
          <div className="flex gap-2">
            <Button
              variant="danger"
              size="sm"
              onClick={handleDeleteProject}
              disabled={deleteProjectMutation.isPending}
            >
              {deleteProjectMutation.isPending
                ? 'Deleting...'
                : 'Delete Project'}
            </Button>
            <Link to="/dashboard">
              <Button variant="secondary">
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        }
      />

      {/* Project Status Bar */}
      <div className="bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  Status:
                </span>
                <Badge
                  variant={
                    project.status === 'IN_PROGRESS'
                      ? 'default'
                      : project.status === 'COMPLETED'
                        ? 'success'
                        : project.status === 'ON_HOLD'
                          ? 'warning'
                          : 'secondary'
                  }
                >
                  {formatStatus(project.status)}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  Health:
                </span>
                <ProjectStatusPill
                  healthStatus={project.healthStatus}
                  statusSummary={project.statusSummary}
                  statusUpdatedAt={project.statusUpdatedAt}
                />
              </div>

              <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                <span>{formatDate(project.startDate)}</span>
                <span>→</span>
                <span>{formatDate(project.endDate)}</span>
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowStatusEditor(!showStatusEditor)}
            >
              <Settings className="w-4 h-4" />
              Update Status
            </Button>
          </div>

          {showStatusEditor && (
            <Card className="mt-4">
              <CardBody className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label
                      htmlFor="edit-status"
                      className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1"
                    >
                      Project Status
                    </label>
                    <Select
                      id="edit-status"
                      value={editedStatus}
                      onChange={(e) =>
                        setEditedStatus(e.target.value as ProjectStatus)
                      }
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <label
                      htmlFor="edit-start-date"
                      className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1"
                    >
                      Start Date
                    </label>
                    <Input
                      id="edit-start-date"
                      type="date"
                      value={editedStartDate}
                      onChange={(e) => setEditedStartDate(e.target.value)}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="edit-end-date"
                      className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1"
                    >
                      Target End Date
                    </label>
                    <Input
                      id="edit-end-date"
                      type="date"
                      value={editedEndDate}
                      onChange={(e) => setEditedEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleUpdateProjectStatus}
                    isLoading={updateProjectMutation.isPending}
                    size="sm"
                  >
                    Save Changes
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setShowStatusEditor(false);
                      setEditedStatus(project.status);
                      setEditedStartDate(project.startDate?.slice(0, 10) ?? '');
                      setEditedEndDate(project.endDate?.slice(0, 10) ?? '');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      {/* Tabbed Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs
          defaultValue="overview"
          value={activeTab}
          onValueChange={setActiveTab}
        >
          <TabsList className="mb-6">
            <TabsTrigger value="overview">
              <LayoutDashboard className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="tasks">
              <CheckSquare className="w-4 h-4" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="milestones">
              <Target className="w-4 h-4" />
              Milestones
            </TabsTrigger>
            <TabsTrigger value="meetings">
              <Users className="w-4 h-4" />
              Meetings
            </TabsTrigger>
            <TabsTrigger value="assets">
              <FolderOpen className="w-4 h-4" />
              Assets
            </TabsTrigger>
            <TabsTrigger value="marketing">
              <Megaphone className="w-4 h-4" />
              Marketing
            </TabsTrigger>
            <TabsTrigger value="team">
              <UserPlus className="w-4 h-4" />
              Team
            </TabsTrigger>
            <TabsTrigger value="status">
              <Settings className="w-4 h-4" />
              Status & Reporting
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <ProjectOverviewTab project={project} />
          </TabsContent>

          <TabsContent value="tasks">
            <ProjectTasksTab projectId={project.id} />
          </TabsContent>

          <TabsContent value="milestones">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>
                    {editingMilestoneId ? 'Edit Milestone' : 'Add Milestone'}
                  </CardTitle>
                </CardHeader>
                <CardBody>
                  <form onSubmit={handleSaveMilestone} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="milestone-name"
                          className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1"
                        >
                          Name
                        </label>
                        <Input
                          id="milestone-name"
                          value={milestoneForm.name}
                          onChange={(e) =>
                            setMilestoneForm((prev) => ({
                              ...prev,
                              name: e.target.value,
                            }))
                          }
                          required
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="milestone-status"
                          className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1"
                        >
                          Status
                        </label>
                        <Select
                          id="milestone-status"
                          value={milestoneForm.status}
                          onChange={(e) =>
                            setMilestoneForm((prev) => ({
                              ...prev,
                              status: e.target.value as Milestone['status'],
                            }))
                          }
                        >
                          {MILESTONE_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {formatStatus(status)}
                            </option>
                          ))}
                        </Select>
                      </div>

                      <div>
                        <label
                          htmlFor="milestone-due-date"
                          className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1"
                        >
                          Due Date
                        </label>
                        <Input
                          id="milestone-due-date"
                          type="date"
                          value={milestoneForm.dueDate}
                          onChange={(e) =>
                            setMilestoneForm((prev) => ({
                              ...prev,
                              dueDate: e.target.value,
                            }))
                          }
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label
                          htmlFor="milestone-description"
                          className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1"
                        >
                          Description
                        </label>
                        <Input
                          id="milestone-description"
                          value={milestoneForm.description}
                          onChange={(e) =>
                            setMilestoneForm((prev) => ({
                              ...prev,
                              description: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        isLoading={
                          createMilestoneMutation.isPending ||
                          updateMilestoneMutation.isPending
                        }
                      >
                        {editingMilestoneId ? 'Update' : 'Add'} Milestone
                      </Button>
                      {editingMilestoneId && (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            setMilestoneForm({
                              name: '',
                              description: '',
                              status: 'NOT_STARTED',
                              dueDate: '',
                            });
                            setEditingMilestoneId(null);
                          }}
                        >
                          Cancel Edit
                        </Button>
                      )}
                    </div>
                  </form>
                </CardBody>
              </Card>

              {milestonesQuery.isLoading && (
                <Card>
                  <CardBody>
                    <p className="text-neutral-600 dark:text-neutral-400">
                      Loading milestones...
                    </p>
                  </CardBody>
                </Card>
              )}

              {milestones.length === 0 && !milestonesQuery.isLoading && (
                <Card>
                  <CardBody>
                    <p className="text-neutral-600 dark:text-neutral-400">
                      {EMPTY_STATES.noMilestones}
                    </p>
                  </CardBody>
                </Card>
              )}

              {milestones.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {milestones.map((milestone) => (
                    <Card key={milestone.id}>
                      <CardBody>
                        <div className="space-y-3">
                          <div>
                            <h4 className="font-semibold text-neutral-900 dark:text-neutral-100">
                              {milestone.name}
                            </h4>
                            {milestone.description && (
                              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                                {milestone.description}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                milestone.status === 'IN_PROGRESS'
                                  ? 'default'
                                  : milestone.status === 'DONE'
                                    ? 'success'
                                    : 'secondary'
                              }
                            >
                              {formatStatus(milestone.status)}
                            </Badge>
                            <span className="text-sm text-neutral-600 dark:text-neutral-400">
                              Due: {formatDate(milestone.dueDate)}
                            </span>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleEditMilestone(milestone)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                handleDeleteMilestone(milestone.id)
                              }
                              isLoading={deleteMilestoneMutation.isPending}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="meetings">
            <ProjectMeetingsPanel projectId={projectId} />
          </TabsContent>

          <TabsContent value="assets">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Linked Assets</CardTitle>
                </CardHeader>
                <CardBody>
                  {projectAssetsQuery.isLoading && (
                    <p className="text-neutral-600 dark:text-neutral-400">
                      Loading assets...
                    </p>
                  )}

                  {projectAssets.length === 0 &&
                    !projectAssetsQuery.isLoading && (
                      <p className="text-neutral-600 dark:text-neutral-400">
                        {EMPTY_STATES.noLinkedAssets}
                      </p>
                    )}

                  {projectAssets.length > 0 && (
                    <div className="space-y-3">
                      {projectAssets.map((entry) => (
                        <div
                          key={entry.id}
                          className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold text-neutral-900 dark:text-neutral-100">
                                {entry.asset.name}
                              </h4>
                              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                                {entry.asset.description}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge>{entry.asset.type}</Badge>
                                {entry.asset.isTemplate && (
                                  <Badge variant="secondary">Template</Badge>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleUnlinkAsset(entry.assetId)}
                            >
                              Unlink
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Link Existing Asset</CardTitle>
                </CardHeader>
                <CardBody className="space-y-4">
                  <div>
                    <label
                      htmlFor="asset-select"
                      className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1"
                    >
                      Select Asset
                    </label>
                    <Select
                      id="asset-select"
                      value={selectedAssetId}
                      onChange={(e) => setSelectedAssetId(e.target.value)}
                    >
                      <option value="">Choose an asset...</option>
                      {availableAssets.map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.name} ({asset.type})
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <label
                      htmlFor="asset-notes"
                      className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1"
                    >
                      Notes (optional)
                    </label>
                    <Input
                      id="asset-notes"
                      value={assetNotes}
                      onChange={(e) => setAssetNotes(e.target.value)}
                      placeholder="Context for this project"
                    />
                  </div>

                  {assetError && (
                    <p className="text-danger-600 text-sm">{assetError}</p>
                  )}

                  <Button
                    onClick={handleLinkAsset}
                    isLoading={linkAssetMutation.isPending}
                  >
                    Link Asset
                  </Button>
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Create New Asset</CardTitle>
                </CardHeader>
                <CardBody>
                  {!showAssetForm ? (
                    <Button onClick={() => setShowAssetForm(true)}>
                      New Asset
                    </Button>
                  ) : (
                    <AssetForm
                      initialValues={{
                        name: '',
                        type: '',
                        description: '',
                        clientId: project ? String(project.clientId) : '',
                        tags: '',
                        isTemplate: false,
                      }}
                      onSubmit={handleCreateAsset}
                      submitLabel="Create and Link"
                      isSubmitting={
                        createAssetMutation.isPending ||
                        linkAssetMutation.isPending
                      }
                      onCancel={() => setShowAssetForm(false)}
                      clients={clientQuery.data ? [clientQuery.data] : []}
                      disableClientSelection
                    />
                  )}
                </CardBody>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="marketing">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Marketing Content</CardTitle>
                    {project && (
                      <GenerateFromProjectButton
                        projectId={project.id}
                        projectName={project.name}
                        clientId={project.clientId}
                      />
                    )}
                  </div>
                </CardHeader>
                <CardBody>
                  {projectMarketingContentsQuery.isLoading && (
                    <p className="text-neutral-600 dark:text-neutral-400">
                      Loading marketing content...
                    </p>
                  )}

                  {marketingContents.length === 0 &&
                    !projectMarketingContentsQuery.isLoading && (
                      <p className="text-neutral-600 dark:text-neutral-400">
                        No marketing content for this project yet. Click
                        &ldquo;Generate Marketing Content&rdquo; to create
                        content from this project.
                      </p>
                    )}

                  {marketingContents.length > 0 && (
                    <div className="space-y-4">
                      {marketingContents.map((content) => (
                        <div
                          key={content.id}
                          className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="text-2xl">
                                  {getContentTypeIcon(content.type)}
                                </span>
                                <div>
                                  <h4
                                    className="font-semibold text-neutral-900 dark:text-neutral-100 cursor-pointer hover:text-primary-600"
                                    onClick={() =>
                                      handleViewMarketingContent(content)
                                    }
                                  >
                                    {content.name}
                                  </h4>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="neutral">
                                      {CONTENT_TYPE_LABELS[content.type]}
                                    </Badge>
                                    <Badge variant="secondary">
                                      {CONTENT_STATUS_LABELS[content.status]}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                              {content.summary && (
                                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2 line-clamp-2">
                                  {content.summary}
                                </p>
                              )}
                              {content.tags && content.tags.length > 0 && (
                                <div className="flex gap-2 mt-2 flex-wrap">
                                  {content.tags.map((tag) => (
                                    <span
                                      key={tag}
                                      className="px-2 py-1 text-xs bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded"
                                    >
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() =>
                                  handleEditMarketingContent(content)
                                }
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() =>
                                  handleArchiveMarketingContent(content.id)
                                }
                              >
                                <Archive className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardBody>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="team">
            <div className="space-y-6">
              {/* Visibility Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Project Visibility</CardTitle>
                </CardHeader>
                <CardBody>
                  <div className="flex items-center gap-3">
                    {project.visibility === 'PRIVATE' && (
                      <>
                        <div className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                          <Lock className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                        </div>
                        <div>
                          <p className="font-medium dark:text-neutral-100">
                            Private
                          </p>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            Only the owner and assigned team members can access
                            this project.
                          </p>
                        </div>
                      </>
                    )}
                    {project.visibility === 'TEAM' && (
                      <>
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                          <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="font-medium dark:text-neutral-100">
                            Team Members Only
                          </p>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            Only the owner and assigned team members can access
                            this project.
                          </p>
                        </div>
                      </>
                    )}
                    {project.visibility === 'TENANT' && (
                      <>
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                          <Globe className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="font-medium dark:text-neutral-100">
                            Tenant-wide
                          </p>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            All users in your organization can view this
                            project.
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </CardBody>
              </Card>

              {/* Team Members */}
              <ProjectMembersManager
                projectId={projectId}
                ownerId={project.ownerId}
                ownerName={project.owner?.name || 'Unknown'}
                isAdmin={isAdmin}
              />
            </div>
          </TabsContent>

          <TabsContent value="status">
            <ProjectStatusTab projectId={projectId} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Marketing Content Modals */}
      {showMarketingContentForm && (
        <MarketingContentFormModal
          isOpen={showMarketingContentForm}
          onClose={() => {
            setShowMarketingContentForm(false);
            setEditingMarketingContent(null);
          }}
          editingContent={editingMarketingContent}
          clients={clientQuery.data ? [clientQuery.data] : []}
        />
      )}

      {showMarketingContentDetail && selectedMarketingContent && (
        <MarketingContentDetailModal
          isOpen={showMarketingContentDetail}
          onClose={() => {
            setShowMarketingContentDetail(false);
            setSelectedMarketingContent(null);
          }}
          content={selectedMarketingContent}
          onEdit={handleEditMarketingContent}
          onArchive={handleArchiveMarketingContent}
        />
      )}
    </div>
  );
}

export default ProjectDashboardPage;
