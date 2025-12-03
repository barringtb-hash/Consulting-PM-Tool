/**
 * Healthcare Compliance Page (COMP.1)
 *
 * HIPAA compliance implementation and monitoring
 * Dependencies: Before Phase 1.3A (AI Scheduling), Before Phase 2.4A (Prior Auth)
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import useRedirectOnUnauthorized from '../../auth/useRedirectOnUnauthorized';
import { PageHeader } from '../../ui/PageHeader';
import { Button } from '../../ui/Button';
import { Card, CardBody, CardHeader } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import {
  Heart,
  Shield,
  FileCheck,
  Lock,
  CheckCircle2,
  Clock,
  Settings,
  Download,
  Users,
  Eye,
  Server,
  FileText,
  BookOpen,
} from 'lucide-react';

// Types
interface HipaaControl {
  id: string;
  category: string;
  requirement: string;
  status: 'compliant' | 'partial' | 'non-compliant' | 'not-applicable';
  lastAudit: string | null;
  evidence: string[];
}

interface BaaStatus {
  partnerId: string;
  partnerName: string;
  status: 'active' | 'pending' | 'expired';
  signedDate: string | null;
  expirationDate: string | null;
}

interface SecurityAssessment {
  date: string;
  type: string;
  findings: number;
  criticalFindings: number;
  status: 'completed' | 'in-progress' | 'scheduled';
}

interface TrainingRecord {
  userId: string;
  userName: string;
  course: string;
  completedDate: string | null;
  dueDate: string;
  status: 'completed' | 'overdue' | 'pending';
}

// Mock API functions
async function fetchHipaaControls(): Promise<HipaaControl[]> {
  return [
    // Administrative Safeguards
    {
      id: 'admin-1',
      category: 'Administrative Safeguards',
      requirement: 'Security Management Process',
      status: 'compliant',
      lastAudit: '2025-11-15',
      evidence: ['Risk Assessment', 'Security Policies'],
    },
    {
      id: 'admin-2',
      category: 'Administrative Safeguards',
      requirement: 'Assigned Security Responsibility',
      status: 'compliant',
      lastAudit: '2025-11-15',
      evidence: ['Security Officer Appointment'],
    },
    {
      id: 'admin-3',
      category: 'Administrative Safeguards',
      requirement: 'Workforce Security',
      status: 'compliant',
      lastAudit: '2025-11-15',
      evidence: ['Access Control Procedures', 'Termination Procedures'],
    },
    {
      id: 'admin-4',
      category: 'Administrative Safeguards',
      requirement: 'Information Access Management',
      status: 'compliant',
      lastAudit: '2025-11-15',
      evidence: ['Access Authorization Policy', 'Role-Based Access'],
    },
    {
      id: 'admin-5',
      category: 'Administrative Safeguards',
      requirement: 'Security Awareness and Training',
      status: 'partial',
      lastAudit: '2025-11-15',
      evidence: ['Training Program', 'Completion Records'],
    },
    // Physical Safeguards
    {
      id: 'phys-1',
      category: 'Physical Safeguards',
      requirement: 'Facility Access Controls',
      status: 'compliant',
      lastAudit: '2025-11-10',
      evidence: ['Access Logs', 'Visitor Policy'],
    },
    {
      id: 'phys-2',
      category: 'Physical Safeguards',
      requirement: 'Workstation Use',
      status: 'compliant',
      lastAudit: '2025-11-10',
      evidence: ['Workstation Policy', 'Physical Security Measures'],
    },
    {
      id: 'phys-3',
      category: 'Physical Safeguards',
      requirement: 'Device and Media Controls',
      status: 'compliant',
      lastAudit: '2025-11-10',
      evidence: ['Media Disposal Policy', 'Encryption Standards'],
    },
    // Technical Safeguards
    {
      id: 'tech-1',
      category: 'Technical Safeguards',
      requirement: 'Access Control',
      status: 'compliant',
      lastAudit: '2025-11-20',
      evidence: [
        'Unique User IDs',
        'Emergency Access',
        'Auto Logoff',
        'Encryption',
      ],
    },
    {
      id: 'tech-2',
      category: 'Technical Safeguards',
      requirement: 'Audit Controls',
      status: 'compliant',
      lastAudit: '2025-11-20',
      evidence: ['Audit Logging System', 'Log Review Procedures'],
    },
    {
      id: 'tech-3',
      category: 'Technical Safeguards',
      requirement: 'Integrity',
      status: 'compliant',
      lastAudit: '2025-11-20',
      evidence: ['Data Integrity Controls', 'Checksums'],
    },
    {
      id: 'tech-4',
      category: 'Technical Safeguards',
      requirement: 'Transmission Security',
      status: 'compliant',
      lastAudit: '2025-11-20',
      evidence: ['TLS Encryption', 'Secure Messaging'],
    },
  ];
}

async function fetchBaaStatus(): Promise<BaaStatus[]> {
  return [
    {
      partnerId: '1',
      partnerName: 'AWS Cloud Services',
      status: 'active',
      signedDate: '2024-06-15',
      expirationDate: '2026-06-15',
    },
    {
      partnerId: '2',
      partnerName: 'Twilio Communications',
      status: 'active',
      signedDate: '2024-08-01',
      expirationDate: '2025-08-01',
    },
    {
      partnerId: '3',
      partnerName: 'SendGrid Email',
      status: 'active',
      signedDate: '2024-07-20',
      expirationDate: '2025-07-20',
    },
    {
      partnerId: '4',
      partnerName: 'Epic EHR Integration',
      status: 'pending',
      signedDate: null,
      expirationDate: null,
    },
    {
      partnerId: '5',
      partnerName: 'Stripe Payments',
      status: 'active',
      signedDate: '2024-09-01',
      expirationDate: '2025-09-01',
    },
  ];
}

async function fetchSecurityAssessments(): Promise<SecurityAssessment[]> {
  return [
    {
      date: '2025-11-15',
      type: 'Annual Security Risk Assessment',
      findings: 12,
      criticalFindings: 0,
      status: 'completed',
    },
    {
      date: '2025-10-01',
      type: 'Penetration Testing',
      findings: 5,
      criticalFindings: 0,
      status: 'completed',
    },
    {
      date: '2025-08-15',
      type: 'Vulnerability Scan',
      findings: 23,
      criticalFindings: 2,
      status: 'completed',
    },
    {
      date: '2026-02-01',
      type: 'Q1 2026 Vulnerability Scan',
      findings: 0,
      criticalFindings: 0,
      status: 'scheduled',
    },
  ];
}

async function fetchTrainingRecords(): Promise<TrainingRecord[]> {
  return [
    {
      userId: '1',
      userName: 'John Smith',
      course: 'HIPAA Privacy & Security',
      completedDate: '2025-11-01',
      dueDate: '2025-12-31',
      status: 'completed',
    },
    {
      userId: '2',
      userName: 'Sarah Johnson',
      course: 'HIPAA Privacy & Security',
      completedDate: '2025-10-15',
      dueDate: '2025-12-31',
      status: 'completed',
    },
    {
      userId: '3',
      userName: 'Mike Davis',
      course: 'HIPAA Privacy & Security',
      completedDate: null,
      dueDate: '2025-12-31',
      status: 'pending',
    },
    {
      userId: '4',
      userName: 'Emily Chen',
      course: 'HIPAA Privacy & Security',
      completedDate: null,
      dueDate: '2025-11-15',
      status: 'overdue',
    },
  ];
}

const STATUS_VARIANTS: Record<
  string,
  'success' | 'warning' | 'secondary' | 'neutral'
> = {
  compliant: 'success',
  partial: 'warning',
  'non-compliant': 'secondary',
  'not-applicable': 'neutral',
  active: 'success',
  pending: 'warning',
  expired: 'secondary',
  completed: 'success',
  'in-progress': 'primary',
  scheduled: 'neutral',
  overdue: 'secondary',
};

function HealthcareCompliancePage(): JSX.Element {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'controls' | 'baa' | 'assessments' | 'training'
  >('overview');

  useRedirectOnUnauthorized();

  // Queries
  const controlsQuery = useQuery({
    queryKey: ['compliance', 'hipaa-controls'],
    queryFn: fetchHipaaControls,
  });

  const baaQuery = useQuery({
    queryKey: ['compliance', 'baa-status'],
    queryFn: fetchBaaStatus,
  });

  const assessmentsQuery = useQuery({
    queryKey: ['compliance', 'security-assessments'],
    queryFn: fetchSecurityAssessments,
  });

  const trainingQuery = useQuery({
    queryKey: ['compliance', 'training-records'],
    queryFn: fetchTrainingRecords,
  });

  const compliantControls =
    controlsQuery.data?.filter((c) => c.status === 'compliant').length || 0;
  const totalControls = controlsQuery.data?.length || 0;
  const activeBaas =
    baaQuery.data?.filter((b) => b.status === 'active').length || 0;
  const completedTraining =
    trainingQuery.data?.filter((t) => t.status === 'completed').length || 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Healthcare Compliance"
        subtitle="COMP.1 - HIPAA Privacy and Security Rule Implementation"
        icon={Heart}
        actions={
          <Button variant="secondary">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        }
      />

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">HIPAA Controls</p>
                <p className="text-2xl font-bold text-green-600">
                  {compliantControls}/{totalControls}
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Compliant</p>
              </div>
              <Shield className="h-8 w-8 text-green-500" />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">BAA Agreements</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                  {activeBaas}/{baaQuery.data?.length || 0}
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Active</p>
              </div>
              <FileCheck className="h-8 w-8 text-blue-500" />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Security Assessments</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                  {assessmentsQuery.data?.filter(
                    (a) => a.status === 'completed',
                  ).length || 0}
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Completed YTD</p>
              </div>
              <Eye className="h-8 w-8 text-purple-500" />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Training Compliance</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                  {completedTraining}/{trainingQuery.data?.length || 0}
                </p>
                <p className="text-sm text-orange-500 dark:text-orange-400">
                  {trainingQuery.data?.filter((t) => t.status === 'overdue')
                    .length || 0}{' '}
                  overdue
                </p>
              </div>
              <Users className="h-8 w-8 text-orange-500" />
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-neutral-200 dark:border-neutral-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: Heart },
            { id: 'controls', label: 'HIPAA Controls', icon: Shield },
            { id: 'baa', label: 'BAA Management', icon: FileCheck },
            { id: 'assessments', label: 'Assessments', icon: Eye },
            { id: 'training', label: 'Training', icon: BookOpen },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as typeof activeTab)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:border-neutral-300 dark:hover:border-neutral-600'
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
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                HIPAA Implementation Checklist
              </h3>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                {[
                  { label: 'HIPAA Gap Analysis', done: true },
                  { label: 'Technical Safeguards Implementation', done: true },
                  {
                    label: 'Administrative Safeguards Implementation',
                    done: true,
                  },
                  { label: 'Physical Safeguards Implementation', done: true },
                  { label: 'BAA Templates Created', done: true },
                  { label: 'Access Controls & Audit Logging', done: true },
                  { label: 'Security Risk Assessment', done: true },
                  { label: 'HIPAA Compliance Documentation', done: true },
                  { label: 'Development Team Training', done: true },
                  { label: 'Breach Notification Procedures', done: true },
                  { label: 'Annual HIPAA Audit', done: false },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-2 border-b border-neutral-200 dark:border-neutral-700 last:border-0"
                  >
                    <span
                      className={item.done ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-600 dark:text-neutral-400'}
                    >
                      {item.label}
                    </span>
                    {item.done ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <Clock className="h-5 w-5 text-neutral-400 dark:text-neutral-500" />
                    )}
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                Compliance by Safeguard Category
              </h3>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                {[
                  {
                    category: 'Administrative Safeguards',
                    compliant: 4,
                    total: 5,
                  },
                  { category: 'Physical Safeguards', compliant: 3, total: 3 },
                  { category: 'Technical Safeguards', compliant: 4, total: 4 },
                ].map((item, idx) => (
                  <div key={idx} className="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-neutral-900 dark:text-neutral-100">{item.category}</span>
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">
                        {item.compliant}/{item.total}
                      </span>
                    </div>
                    <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          item.compliant === item.total
                            ? 'bg-green-500'
                            : 'bg-yellow-500'
                        }`}
                        style={{
                          width: `${(item.compliant / item.total) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Controls Tab */}
      {activeTab === 'controls' && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              HIPAA Security Rule Controls
            </h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-6">
              {[
                'Administrative Safeguards',
                'Physical Safeguards',
                'Technical Safeguards',
              ].map((category) => (
                <div key={category}>
                  <h4 className="font-medium text-neutral-700 dark:text-neutral-300 mb-3 flex items-center gap-2">
                    {category === 'Administrative Safeguards' && (
                      <Users className="h-4 w-4" />
                    )}
                    {category === 'Physical Safeguards' && (
                      <Server className="h-4 w-4" />
                    )}
                    {category === 'Technical Safeguards' && (
                      <Lock className="h-4 w-4" />
                    )}
                    {category}
                  </h4>
                  <div className="space-y-2">
                    {controlsQuery.data
                      ?.filter((c) => c.category === category)
                      .map((control) => (
                        <div
                          key={control.id}
                          className="flex items-center justify-between p-3 border border-neutral-200 dark:border-neutral-700 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-neutral-900 dark:text-neutral-100">{control.requirement}</p>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">
                              Last audit:{' '}
                              {control.lastAudit
                                ? new Date(
                                    control.lastAudit,
                                  ).toLocaleDateString()
                                : 'N/A'}
                            </p>
                          </div>
                          <Badge variant={STATUS_VARIANTS[control.status]}>
                            {control.status}
                          </Badge>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* BAA Tab */}
      {activeTab === 'baa' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                Business Associate Agreements
              </h3>
              <Button variant="secondary" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                New BAA
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
                <thead className="bg-neutral-50 dark:bg-neutral-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase">
                      Partner
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase">
                      Signed Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase">
                      Expiration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-700">
                  {baaQuery.data?.map((baa) => (
                    <tr key={baa.partnerId}>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-neutral-900 dark:text-neutral-100">
                        {baa.partnerName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={STATUS_VARIANTS[baa.status]}>
                          {baa.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-400">
                        {baa.signedDate
                          ? new Date(baa.signedDate).toLocaleDateString()
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-400">
                        {baa.expirationDate
                          ? new Date(baa.expirationDate).toLocaleDateString()
                          : '-'}
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

      {/* Assessments Tab */}
      {activeTab === 'assessments' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Security Assessments</h3>
              <Button variant="secondary" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Schedule Assessment
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {assessmentsQuery.data?.map((assessment, idx) => (
                <div key={idx} className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-neutral-100">{assessment.type}</p>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        {new Date(assessment.date).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge
                      variant={
                        STATUS_VARIANTS[assessment.status] as
                          | 'success'
                          | 'neutral'
                      }
                    >
                      {assessment.status}
                    </Badge>
                  </div>
                  {assessment.status === 'completed' && (
                    <div className="flex gap-4 text-sm">
                      <span>
                        <span className="text-neutral-600 dark:text-neutral-400">Findings:</span>{' '}
                        <span className="font-medium text-neutral-900 dark:text-neutral-100">
                          {assessment.findings}
                        </span>
                      </span>
                      <span>
                        <span className="text-neutral-600 dark:text-neutral-400">Critical:</span>{' '}
                        <span
                          className={`font-medium ${assessment.criticalFindings > 0 ? 'text-red-500 dark:text-red-400' : 'text-green-500 dark:text-green-400'}`}
                        >
                          {assessment.criticalFindings}
                        </span>
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Training Tab */}
      {activeTab === 'training' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">HIPAA Training Records</h3>
              <Button variant="secondary" size="sm">
                <Users className="h-4 w-4 mr-2" />
                Assign Training
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
                <thead className="bg-neutral-50 dark:bg-neutral-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase">
                      Course
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase">
                      Completed
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase">
                      Due Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-700">
                  {trainingQuery.data?.map((record) => (
                    <tr key={record.userId}>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-neutral-900 dark:text-neutral-100">
                        {record.userName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-400">
                        {record.course}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={STATUS_VARIANTS[record.status]}>
                          {record.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-400">
                        {record.completedDate
                          ? new Date(record.completedDate).toLocaleDateString()
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-400">
                        {new Date(record.dueDate).toLocaleDateString()}
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

export default HealthcareCompliancePage;
