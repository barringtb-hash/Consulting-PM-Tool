/**
 * CRM New Contact Page
 *
 * Form for creating a new CRM contact.
 */

import React from 'react';
import { useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';

import {
  useAccounts,
  useCreateCRMContact,
  type ContactLifecycle,
  type CRMLeadSource,
} from '../../api/hooks/crm';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { PageHeader } from '../../ui/PageHeader';
import { Select } from '../../ui/Select';
import { useToast } from '../../ui/Toast';

const contactFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z
    .string()
    .email('Invalid email')
    .max(255)
    .optional()
    .or(z.literal('')),
  phone: z.string().max(50).optional().or(z.literal('')),
  mobile: z.string().max(50).optional().or(z.literal('')),
  jobTitle: z.string().max(100).optional().or(z.literal('')),
  department: z.string().max(100).optional().or(z.literal('')),
  accountId: z.string().optional(),
  lifecycle: z.enum([
    'LEAD',
    'MQL',
    'SQL',
    'OPPORTUNITY',
    'CUSTOMER',
    'EVANGELIST',
    'CHURNED',
  ]),
  leadSource: z
    .enum([
      'WEBSITE',
      'REFERRAL',
      'LINKEDIN',
      'COLD_CALL',
      'EMAIL',
      'EVENT',
      'PARTNER',
      'OTHER',
    ])
    .optional()
    .or(z.literal('')),
  isPrimary: z.boolean().optional(),
  doNotContact: z.boolean().optional(),
  linkedinUrl: z
    .string()
    .url('Invalid URL')
    .max(500)
    .optional()
    .or(z.literal('')),
  twitterUrl: z.string().max(100).optional().or(z.literal('')),
});

type ContactFormData = z.infer<typeof contactFormSchema>;

const LIFECYCLE_OPTIONS: { value: ContactLifecycle; label: string }[] = [
  { value: 'LEAD', label: 'Lead' },
  { value: 'MQL', label: 'MQL' },
  { value: 'SQL', label: 'SQL' },
  { value: 'OPPORTUNITY', label: 'Opportunity' },
  { value: 'CUSTOMER', label: 'Customer' },
  { value: 'EVANGELIST', label: 'Evangelist' },
  { value: 'CHURNED', label: 'Churned' },
];

const LEAD_SOURCE_OPTIONS: { value: CRMLeadSource; label: string }[] = [
  { value: 'WEBSITE', label: 'Website' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'LINKEDIN', label: 'LinkedIn' },
  { value: 'COLD_CALL', label: 'Cold Call' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'EVENT', label: 'Event' },
  { value: 'PARTNER', label: 'Partner' },
  { value: 'OTHER', label: 'Other' },
];

export default function ContactNewPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const createContact = useCreateCRMContact();
  const accountsQuery = useAccounts({ limit: 100 });
  const accounts = accountsQuery.data?.data ?? [];

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      mobile: '',
      jobTitle: '',
      department: '',
      accountId: '',
      lifecycle: 'LEAD',
      leadSource: '',
      isPrimary: false,
      doNotContact: false,
      linkedinUrl: '',
      twitterUrl: '',
    },
  });

  const onSubmit = async (data: ContactFormData) => {
    try {
      const payload = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email || undefined,
        phone: data.phone || undefined,
        mobile: data.mobile || undefined,
        jobTitle: data.jobTitle || undefined,
        department: data.department || undefined,
        accountId: data.accountId ? Number(data.accountId) : undefined,
        lifecycle: data.lifecycle,
        leadSource: data.leadSource || undefined,
        isPrimary: data.isPrimary || false,
        doNotContact: data.doNotContact || false,
        linkedinUrl: data.linkedinUrl || undefined,
        twitterUrl: data.twitterUrl || undefined,
      };

      const contact = await createContact.mutateAsync(payload);
      showToast({
        message: 'Contact created successfully',
        variant: 'success',
      });
      navigate(`/crm/contacts/${contact.id}`);
    } catch (error) {
      showToast({
        message:
          error instanceof Error ? error.message : 'Failed to create contact',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/crm/contacts')}
              className="-ml-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span>New Contact</span>
          </div>
        }
        description="Add a new contact to your CRM"
      />

      <div className="container-padding py-6">
        <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl space-y-6">
          {/* Basic Information */}
          <Card className="p-6">
            <h2 className="text-lg font-medium mb-4 dark:text-white">
              Basic Information
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  First Name <span className="text-red-500">*</span>
                </label>
                <Input
                  id="firstName"
                  {...register('firstName')}
                  placeholder="John"
                  className={errors.firstName ? 'border-red-500' : ''}
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.firstName.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="lastName"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Last Name <span className="text-red-500">*</span>
                </label>
                <Input
                  id="lastName"
                  {...register('lastName')}
                  placeholder="Doe"
                  className={errors.lastName ? 'border-red-500' : ''}
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.lastName.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="john.doe@example.com"
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Phone
                </label>
                <Input
                  id="phone"
                  {...register('phone')}
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div>
                <label
                  htmlFor="jobTitle"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Job Title
                </label>
                <Input
                  id="jobTitle"
                  {...register('jobTitle')}
                  placeholder="Marketing Director"
                />
              </div>

              <div>
                <label
                  htmlFor="department"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Department
                </label>
                <Input
                  id="department"
                  {...register('department')}
                  placeholder="Marketing"
                />
              </div>
            </div>
          </Card>

          {/* Account & Classification */}
          <Card className="p-6">
            <h2 className="text-lg font-medium mb-4 dark:text-white">
              Account & Classification
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="accountId"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Account
                </label>
                <Select id="accountId" {...register('accountId')}>
                  <option value="">No Account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label
                  htmlFor="lifecycle"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Lifecycle Stage
                </label>
                <Select id="lifecycle" {...register('lifecycle')}>
                  {LIFECYCLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label
                  htmlFor="leadSource"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Lead Source
                </label>
                <Select id="leadSource" {...register('leadSource')}>
                  <option value="">Select Source</option>
                  {LEAD_SOURCE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex items-center gap-6 pt-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('isPrimary')}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Primary Contact
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('doNotContact')}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Do Not Contact
                  </span>
                </label>
              </div>
            </div>
          </Card>

          {/* Social Links */}
          <Card className="p-6">
            <h2 className="text-lg font-medium mb-4 dark:text-white">
              Social Links
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="linkedinUrl"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  LinkedIn URL
                </label>
                <Input
                  id="linkedinUrl"
                  {...register('linkedinUrl')}
                  placeholder="https://linkedin.com/in/johndoe"
                  className={errors.linkedinUrl ? 'border-red-500' : ''}
                />
                {errors.linkedinUrl && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.linkedinUrl.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="twitterUrl"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Twitter Handle
                </label>
                <Input
                  id="twitterUrl"
                  {...register('twitterUrl')}
                  placeholder="@johndoe"
                />
              </div>
            </div>
          </Card>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/crm/contacts')}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Contact
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
