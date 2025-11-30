/**
 * General Compliance Page (COMP.3)
 *
 * GDPR and CCPA compliance implementation
 * Dependencies: Before any customer-facing launch
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import useRedirectOnUnauthorized from '../../auth/useRedirectOnUnauthorized';
import { PageHeader } from '../../ui/PageHeader';
import { Button } from '../../ui/Button';
import { Card, CardBody, CardHeader } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import {
  Globe,
  UserX,
  CheckCircle2,
  Clock,
  Download,
  Users,
  Eye,
  Database,
  Trash2,
  Bell,
  FileText,
  MapPin,
} from 'lucide-react';

// Types
interface PrivacyFramework {
  name: string;
  shortName: string;
  region: string;
  status: 'compliant' | 'partial' | 'non-compliant';
  lastReview: string | null;
  requirementsCompliant: number;
  requirementsTotal: number;
}

interface DataSubjectRequest {
  id: string;
  type: 'access' | 'deletion' | 'portability' | 'rectification' | 'opt-out';
  status: 'pending' | 'in-progress' | 'completed' | 'denied';
  submittedDate: string;
  dueDate: string;
  email: string;
}

interface ConsentRecord {
  id: string;
  purpose: string;
  category: string;
  optInRate: number;
  totalConsents: number;
  lastUpdated: string;
}

interface DataMapping {
  id: string;
  dataCategory: string;
  purpose: string;
  retentionPeriod: string;
  thirdPartySharing: boolean;
  crossBorderTransfer: boolean;
}

// Mock API functions
async function fetchFrameworks(): Promise<PrivacyFramework[]> {
  return [
    {
      name: 'General Data Protection Regulation',
      shortName: 'GDPR',
      region: 'European Union',
      status: 'compliant',
      lastReview: '2025-11-01',
      requirementsCompliant: 18,
      requirementsTotal: 20,
    },
    {
      name: 'California Consumer Privacy Act',
      shortName: 'CCPA',
      region: 'California, USA',
      status: 'compliant',
      lastReview: '2025-11-01',
      requirementsCompliant: 8,
      requirementsTotal: 8,
    },
  ];
}

async function fetchDataSubjectRequests(): Promise<DataSubjectRequest[]> {
  return [
    {
      id: 'dsr-001',
      type: 'access',
      status: 'completed',
      submittedDate: '2025-11-25',
      dueDate: '2025-12-25',
      email: 'user1@example.com',
    },
    {
      id: 'dsr-002',
      type: 'deletion',
      status: 'in-progress',
      submittedDate: '2025-11-28',
      dueDate: '2025-12-28',
      email: 'user2@example.com',
    },
    {
      id: 'dsr-003',
      type: 'portability',
      status: 'pending',
      submittedDate: '2025-11-30',
      dueDate: '2025-12-30',
      email: 'user3@example.com',
    },
    {
      id: 'dsr-004',
      type: 'opt-out',
      status: 'completed',
      submittedDate: '2025-11-20',
      dueDate: '2025-12-05',
      email: 'user4@example.com',
    },
  ];
}

async function fetchConsentRecords(): Promise<ConsentRecord[]> {
  return [
    {
      id: 'consent-1',
      purpose: 'Marketing Communications',
      category: 'Marketing',
      optInRate: 45.2,
      totalConsents: 12450,
      lastUpdated: '2025-11-30',
    },
    {
      id: 'consent-2',
      purpose: 'Analytics & Performance',
      category: 'Analytics',
      optInRate: 78.5,
      totalConsents: 21560,
      lastUpdated: '2025-11-30',
    },
    {
      id: 'consent-3',
      purpose: 'Personalization',
      category: 'Functional',
      optInRate: 62.3,
      totalConsents: 17120,
      lastUpdated: '2025-11-30',
    },
    {
      id: 'consent-4',
      purpose: 'Third-Party Advertising',
      category: 'Marketing',
      optInRate: 28.1,
      totalConsents: 7720,
      lastUpdated: '2025-11-30',
    },
  ];
}

async function fetchDataMapping(): Promise<DataMapping[]> {
  return [
    {
      id: 'dm-1',
      dataCategory: 'Contact Information',
      purpose: 'Service Delivery',
      retentionPeriod: 'Duration of service + 7 years',
      thirdPartySharing: false,
      crossBorderTransfer: true,
    },
    {
      id: 'dm-2',
      dataCategory: 'Payment Information',
      purpose: 'Transaction Processing',
      retentionPeriod: '7 years after transaction',
      thirdPartySharing: true,
      crossBorderTransfer: false,
    },
    {
      id: 'dm-3',
      dataCategory: 'Usage Data',
      purpose: 'Product Improvement',
      retentionPeriod: '2 years',
      thirdPartySharing: false,
      crossBorderTransfer: true,
    },
    {
      id: 'dm-4',
      dataCategory: 'Marketing Preferences',
      purpose: 'Marketing Communications',
      retentionPeriod: 'Until consent withdrawn',
      thirdPartySharing: true,
      crossBorderTransfer: true,
    },
    {
      id: 'dm-5',
      dataCategory: 'Support Tickets',
      purpose: 'Customer Support',
      retentionPeriod: '3 years after resolution',
      thirdPartySharing: false,
      crossBorderTransfer: false,
    },
  ];
}

const STATUS_VARIANTS: Record<
  string,
  'success' | 'warning' | 'secondary' | 'neutral' | 'primary'
> = {
  compliant: 'success',
  partial: 'warning',
  'non-compliant': 'secondary',
  pending: 'warning',
  'in-progress': 'primary',
  completed: 'success',
  denied: 'secondary',
};

const REQUEST_TYPE_LABELS: Record<string, string> = {
  access: 'Access Request',
  deletion: 'Deletion Request',
  portability: 'Data Portability',
  rectification: 'Rectification',
  'opt-out': 'Opt-Out Request',
};

function GeneralCompliancePage(): JSX.Element {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'requests' | 'consent' | 'data-mapping'
  >('overview');

  useRedirectOnUnauthorized();

  // Queries
  const frameworksQuery = useQuery({
    queryKey: ['compliance', 'privacy-frameworks'],
    queryFn: fetchFrameworks,
  });

  const requestsQuery = useQuery({
    queryKey: ['compliance', 'dsr-requests'],
    queryFn: fetchDataSubjectRequests,
  });

  const consentQuery = useQuery({
    queryKey: ['compliance', 'consent-records'],
    queryFn: fetchConsentRecords,
  });

  const dataMappingQuery = useQuery({
    queryKey: ['compliance', 'data-mapping'],
    queryFn: fetchDataMapping,
  });

  const pendingRequests =
    requestsQuery.data?.filter(
      (r) => r.status === 'pending' || r.status === 'in-progress',
    ).length || 0;
  const avgOptInRate =
    consentQuery.data && consentQuery.data.length > 0
      ? (
          consentQuery.data.reduce((sum, c) => sum + c.optInRate, 0) /
          consentQuery.data.length
        ).toFixed(1)
      : '0';

  return (
    <div className="space-y-6">
      <PageHeader
        title="General Compliance"
        subtitle="COMP.3 - GDPR and CCPA Privacy Compliance"
        icon={Globe}
        actions={
          <Button variant="secondary">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        }
      />

      {/* Framework Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {frameworksQuery.data?.map((framework) => (
          <Card key={framework.shortName}>
            <CardBody>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-500">
                    {framework.region}
                  </span>
                </div>
                <Badge variant={STATUS_VARIANTS[framework.status]}>
                  {framework.status}
                </Badge>
              </div>
              <p className="text-lg font-bold">{framework.shortName}</p>
              <p className="text-xs text-gray-400 mb-2">{framework.name}</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  {framework.requirementsCompliant}/
                  {framework.requirementsTotal} requirements
                </span>
              </div>
            </CardBody>
          </Card>
        ))}
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending DSRs</p>
                <p className="text-2xl font-bold text-orange-500">
                  {pendingRequests}
                </p>
                <p className="text-sm text-gray-400">requests open</p>
              </div>
              <Users className="h-8 w-8 text-orange-500" />
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg Opt-In Rate</p>
                <p className="text-2xl font-bold text-green-600">
                  {avgOptInRate}%
                </p>
                <p className="text-sm text-gray-400">across all purposes</p>
              </div>
              <Bell className="h-8 w-8 text-green-500" />
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: Globe },
            { id: 'requests', label: 'Data Subject Requests', icon: UserX },
            { id: 'consent', label: 'Consent Management', icon: Bell },
            { id: 'data-mapping', label: 'Data Mapping', icon: Database },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as typeof activeTab)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">
                GDPR Implementation Checklist
              </h3>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                {[
                  { label: 'Data Mapping Completed', done: true },
                  { label: 'Data Subject Rights Functionality', done: true },
                  { label: 'Privacy Policy Documentation', done: true },
                  { label: 'Consent Management Platform', done: true },
                  { label: 'Data Retention/Deletion Processes', done: true },
                  { label: 'DPA Templates Created', done: true },
                  { label: 'Cross-Border Transfer Mechanisms', done: true },
                  { label: 'Data Breach Response Plan', done: true },
                  { label: 'DPO Appointment (if required)', done: false },
                  { label: 'DPIA Process Established', done: true },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <span
                      className={item.done ? 'text-gray-900' : 'text-gray-500'}
                    >
                      {item.label}
                    </span>
                    {item.done ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <Clock className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">
                CCPA Implementation Checklist
              </h3>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                {[
                  { label: 'CCPA Requirements Mapping', done: true },
                  { label: 'Consumer Rights Functionality', done: true },
                  { label: 'Required Disclosures Created', done: true },
                  { label: 'Opt-Out Mechanisms Implemented', done: true },
                  { label: 'Data Inventory Completed', done: true },
                  { label: '"Do Not Sell" Link Added', done: true },
                  { label: 'Verification Process for Requests', done: true },
                  { label: 'Service Provider Agreements', done: true },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <span
                      className={item.done ? 'text-gray-900' : 'text-gray-500'}
                    >
                      {item.label}
                    </span>
                    {item.done ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <Clock className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Data Subject Requests Tab */}
      {activeTab === 'requests' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Data Subject Requests</h3>
              <Button variant="secondary" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                New Request
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Requester
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Submitted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Due Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {requestsQuery.data?.map((request) => (
                    <tr key={request.id}>
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
                        {request.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {request.type === 'access' && (
                            <Eye className="h-4 w-4 text-blue-400 mr-2" />
                          )}
                          {request.type === 'deletion' && (
                            <Trash2 className="h-4 w-4 text-red-400 mr-2" />
                          )}
                          {request.type === 'portability' && (
                            <Download className="h-4 w-4 text-green-400 mr-2" />
                          )}
                          {request.type === 'opt-out' && (
                            <UserX className="h-4 w-4 text-orange-400 mr-2" />
                          )}
                          <span className="text-sm">
                            {REQUEST_TYPE_LABELS[request.type]}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {request.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={STATUS_VARIANTS[request.status]}>
                          {request.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {new Date(request.submittedDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {new Date(request.dueDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Button variant="secondary" size="sm">
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Consent Management Tab */}
      {activeTab === 'consent' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                Consent Records by Purpose
              </h3>
              <Button variant="secondary" size="sm">
                <Bell className="h-4 w-4 mr-2" />
                Configure Purposes
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {consentQuery.data?.map((consent) => (
                <div key={consent.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium">{consent.purpose}</p>
                      <p className="text-sm text-gray-500">
                        {consent.category}
                      </p>
                    </div>
                    <Badge variant="neutral">{consent.category}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Opt-In Rate</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              consent.optInRate > 50
                                ? 'bg-green-500'
                                : 'bg-orange-500'
                            }`}
                            style={{ width: `${consent.optInRate}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">
                          {consent.optInRate}%
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Consents</p>
                      <p className="font-semibold">
                        {consent.totalConsents.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Last Updated</p>
                      <p className="font-medium">
                        {new Date(consent.lastUpdated).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Data Mapping Tab */}
      {activeTab === 'data-mapping' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                Data Processing Inventory
              </h3>
              <Button variant="secondary" size="sm">
                <Database className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Data Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Purpose
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Retention
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Third-Party
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Cross-Border
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dataMappingQuery.data?.map((mapping) => (
                    <tr key={mapping.id}>
                      <td className="px-6 py-4 whitespace-nowrap font-medium">
                        {mapping.dataCategory}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {mapping.purpose}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {mapping.retentionPeriod}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          variant={
                            mapping.thirdPartySharing ? 'warning' : 'success'
                          }
                        >
                          {mapping.thirdPartySharing ? 'Yes' : 'No'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          variant={
                            mapping.crossBorderTransfer ? 'primary' : 'success'
                          }
                        >
                          {mapping.crossBorderTransfer ? 'Yes' : 'No'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

export default GeneralCompliancePage;
