import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Container,
  PageHeader,
  Section,
  Input,
  Modal,
} from '../../ui';
import { useTenant, useCreateTenant, useUpdateTenant } from '../../api/hooks';
import type {
  TenantPlan,
  CreateTenantInput,
  UpdateTenantInput,
} from '../../api/tenant-admin';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

export function TenantFormPage(): JSX.Element {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const isEditing = !!tenantId;

  const { data: existingTenant, isLoading: loadingTenant } =
    useTenant(tenantId);
  const createMutation = useCreateTenant();
  const updateMutation = useUpdateTenant();

  // Form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [plan, setPlan] = useState<TenantPlan>('STARTER');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [trialEndsAt, setTrialEndsAt] = useState('');
  const [status, setStatus] = useState<
    'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED'
  >('ACTIVE');

  // Result modal
  const [createResult, setCreateResult] = useState<{
    tenantName: string;
    ownerEmail: string;
    tempPassword: string | null;
    isNewUser: boolean;
  } | null>(null);

  // Reset form when tenantId changes (navigating between edit/create modes)
  useEffect(() => {
    if (!isEditing) {
      // Reset to default values when creating a new tenant
      setName('');
      setSlug('');
      setSlugManuallyEdited(false);
      setPlan('STARTER');
      setOwnerEmail('');
      setOwnerName('');
      setBillingEmail('');
      setTrialEndsAt('');
      setStatus('ACTIVE');
    }
  }, [tenantId, isEditing]);

  // Populate form when editing an existing tenant
  useEffect(() => {
    if (existingTenant && isEditing) {
      setName(existingTenant.name);
      setSlug(existingTenant.slug);
      setSlugManuallyEdited(true);
      setPlan(existingTenant.plan);
      setBillingEmail(existingTenant.billingEmail || '');
      setTrialEndsAt(
        existingTenant.trialEndsAt
          ? new Date(existingTenant.trialEndsAt).toISOString().split('T')[0]
          : '',
      );
      setStatus(existingTenant.status);
    }
  }, [existingTenant, isEditing]);

  // Auto-generate slug from name (only when creating)
  useEffect(() => {
    if (!isEditing && !slugManuallyEdited && name) {
      setSlug(generateSlug(name));
    }
  }, [name, slugManuallyEdited, isEditing]);

  const handleBack = () => {
    if (isEditing) {
      navigate(`/admin/tenants/${tenantId}`);
    } else {
      navigate('/admin/tenants');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isEditing) {
        const input: UpdateTenantInput = {
          name,
          plan,
          status,
          billingEmail: billingEmail || null,
          trialEndsAt: trialEndsAt ? new Date(trialEndsAt).toISOString() : null,
        };

        await updateMutation.mutateAsync({ tenantId: tenantId!, input });
        navigate(`/admin/tenants/${tenantId}`);
      } else {
        const input: CreateTenantInput = {
          name,
          slug: slug || undefined,
          plan,
          ownerEmail,
          ownerName: ownerName || undefined,
          billingEmail: billingEmail || undefined,
          trialEndsAt: trialEndsAt
            ? new Date(trialEndsAt).toISOString()
            : undefined,
        };

        const result = await createMutation.mutateAsync(input);

        setCreateResult({
          tenantName: result.tenant.name,
          ownerEmail: result.owner.email,
          tempPassword: result.owner.tempPassword,
          isNewUser: result.owner.isNewUser,
        });
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Operation failed');
    }
  };

  const handleResultClose = () => {
    setCreateResult(null);
    navigate('/admin/tenants');
  };

  if (isEditing && loadingTenant) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center">
        <div className="text-neutral-500 dark:text-neutral-400">
          Loading tenant...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <PageHeader
        title={isEditing ? 'Edit Tenant' : 'Create New Tenant'}
        description={
          isEditing
            ? `Editing ${existingTenant?.name}`
            : 'Create a new customer tenant for the platform'
        }
      />

      <Section>
        <Container>
          <div className="mb-6">
            <Button variant="secondary" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {isEditing ? 'Back to Tenant' : 'Back to Tenants'}
            </Button>
          </div>

          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>
                {isEditing ? 'Tenant Details' : 'New Tenant'}
              </CardTitle>
            </CardHeader>
            <CardBody>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Tenant Name */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Tenant Name *
                  </label>
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Acme Corporation"
                    required
                  />
                </div>

                {/* Slug */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Slug {!isEditing && '(auto-generated from name)'}
                  </label>
                  <Input
                    type="text"
                    value={slug}
                    onChange={(e) => {
                      setSlug(e.target.value);
                      if (!isEditing) setSlugManuallyEdited(true);
                    }}
                    placeholder="acme-corporation"
                    pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                    title="Lowercase letters, numbers, and hyphens only"
                    disabled={isEditing}
                  />
                  {isEditing && (
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                      Slug cannot be changed after creation.
                    </p>
                  )}
                </div>

                {/* Plan */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Plan *
                  </label>
                  <select
                    value={plan}
                    onChange={(e) => setPlan(e.target.value as TenantPlan)}
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                    required
                  >
                    <option value="TRIAL">Trial</option>
                    <option value="STARTER">Starter</option>
                    <option value="PROFESSIONAL">Professional</option>
                    <option value="ENTERPRISE">Enterprise</option>
                  </select>
                </div>

                {/* Trial End Date (only for Trial plan) */}
                {plan === 'TRIAL' && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Trial End Date
                    </label>
                    <Input
                      type="date"
                      value={trialEndsAt}
                      onChange={(e) => setTrialEndsAt(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                )}

                {/* Status (only when editing) */}
                {isEditing && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) =>
                        setStatus(
                          e.target.value as
                            | 'PENDING'
                            | 'ACTIVE'
                            | 'SUSPENDED'
                            | 'CANCELLED',
                        )
                      }
                      className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="PENDING">Pending</option>
                      <option value="SUSPENDED">Suspended</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>
                )}

                {/* Owner fields (only when creating) */}
                {!isEditing && (
                  <>
                    <hr className="border-neutral-200 dark:border-neutral-700" />
                    <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
                      Owner Account
                    </h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 -mt-4">
                      If the email does not exist, a new user will be created
                      with a temporary password.
                    </p>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        Owner Email *
                      </label>
                      <Input
                        type="email"
                        value={ownerEmail}
                        onChange={(e) => setOwnerEmail(e.target.value)}
                        placeholder="owner@acme.com"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        Owner Name (for new users)
                      </label>
                      <Input
                        type="text"
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        placeholder="John Doe"
                      />
                    </div>
                  </>
                )}

                <hr className="border-neutral-200 dark:border-neutral-700" />

                {/* Billing Email */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Billing Email (optional)
                  </label>
                  <Input
                    type="email"
                    value={billingEmail}
                    onChange={(e) => setBillingEmail(e.target.value)}
                    placeholder="billing@acme.com"
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleBack}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    isLoading={
                      createMutation.isPending || updateMutation.isPending
                    }
                  >
                    {isEditing ? 'Save Changes' : 'Create Tenant'}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </Container>
      </Section>

      {/* Create Result Modal */}
      <Modal
        isOpen={!!createResult}
        onClose={handleResultClose}
        title="Tenant Created Successfully"
      >
        <div className="space-y-4">
          <p className="text-neutral-700 dark:text-neutral-300">
            The tenant <strong>{createResult?.tenantName}</strong> has been
            created successfully.
          </p>

          {createResult?.isNewUser && createResult?.tempPassword && (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                New User Account Created
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                Please share these credentials securely with the tenant owner:
              </p>
              <div className="p-3 bg-white dark:bg-neutral-800 rounded font-mono text-sm">
                <div className="mb-1">
                  <span className="text-neutral-500">Email:</span>{' '}
                  <span className="text-neutral-900 dark:text-neutral-100">
                    {createResult.ownerEmail}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500">Password:</span>{' '}
                  <span className="text-neutral-900 dark:text-neutral-100">
                    {createResult.tempPassword}
                  </span>
                </div>
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                The user should change this password after their first login.
              </p>
            </div>
          )}

          {createResult?.isNewUser === false && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              The owner ({createResult?.ownerEmail}) already had an account and
              has been added to this tenant.
            </p>
          )}
        </div>
        <div className="flex justify-end mt-6">
          <Button onClick={handleResultClose}>Go to Tenants</Button>
        </div>
      </Modal>
    </div>
  );
}

export default TenantFormPage;
