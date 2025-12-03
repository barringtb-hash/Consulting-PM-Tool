/**
 * Financial Compliance Page (COMP.2)
 *
 * SOX, FINRA, and PCI DSS compliance implementation
 * Dependencies: Before Phase 2.1A (Document Analyzer), Before Phase 3.2A (Compliance Monitor)
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import useRedirectOnUnauthorized from '../../auth/useRedirectOnUnauthorized';
import { PageHeader } from '../../ui/PageHeader';
import { Button } from '../../ui/Button';
import { Card, CardBody, CardHeader } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import {
  DollarSign,
  CheckCircle2,
  Clock,
  Settings,
  Download,
  CreditCard,
  BarChart3,
  Eye,
  Scale,
  Archive,
} from 'lucide-react';

// Types
interface ComplianceFramework {
  name: string;
  shortName: string;
  status: 'compliant' | 'partial' | 'non-compliant';
  lastAudit: string | null;
  nextAudit: string | null;
  controlsCompliant: number;
  controlsTotal: number;
}

interface SoxControl {
  id: string;
  section: string;
  requirement: string;
  status: 'effective' | 'partially-effective' | 'ineffective' | 'not-tested';
  testDate: string | null;
  evidence: string[];
}

interface PciRequirement {
  id: string;
  category: string;
  requirement: string;
  status: 'compliant' | 'non-compliant' | 'not-applicable';
  lastValidated: string | null;
}

interface FinraRecord {
  id: string;
  type: string;
  description: string;
  status: 'current' | 'pending' | 'expired';
  date: string;
}

// Mock API functions
async function fetchFrameworks(): Promise<ComplianceFramework[]> {
  return [
    {
      name: 'Sarbanes-Oxley Act',
      shortName: 'SOX',
      status: 'compliant',
      lastAudit: '2025-09-15',
      nextAudit: '2026-09-15',
      controlsCompliant: 42,
      controlsTotal: 45,
    },
    {
      name: 'Financial Industry Regulatory Authority',
      shortName: 'FINRA',
      status: 'compliant',
      lastAudit: '2025-10-01',
      nextAudit: '2026-10-01',
      controlsCompliant: 28,
      controlsTotal: 30,
    },
    {
      name: 'Payment Card Industry Data Security Standard',
      shortName: 'PCI DSS',
      status: 'compliant',
      lastAudit: '2025-08-20',
      nextAudit: '2026-02-20',
      controlsCompliant: 12,
      controlsTotal: 12,
    },
  ];
}

async function fetchSoxControls(): Promise<SoxControl[]> {
  return [
    {
      id: 'sox-1',
      section: 'Section 302',
      requirement: 'CEO/CFO Financial Statement Certification',
      status: 'effective',
      testDate: '2025-09-15',
      evidence: ['Certification Documents', 'Review Process'],
    },
    {
      id: 'sox-2',
      section: 'Section 404',
      requirement: 'Internal Controls Assessment',
      status: 'effective',
      testDate: '2025-09-15',
      evidence: ['Control Documentation', 'Testing Results'],
    },
    {
      id: 'sox-3',
      section: 'Section 404',
      requirement: 'Segregation of Duties',
      status: 'effective',
      testDate: '2025-09-10',
      evidence: ['Role Matrix', 'Access Reviews'],
    },
    {
      id: 'sox-4',
      section: 'Section 404',
      requirement: 'Change Management Controls',
      status: 'effective',
      testDate: '2025-09-12',
      evidence: ['Change Logs', 'Approval Records'],
    },
    {
      id: 'sox-5',
      section: 'Section 404',
      requirement: 'Financial Close Process',
      status: 'partially-effective',
      testDate: '2025-09-15',
      evidence: ['Close Checklist', 'Reconciliations'],
    },
    {
      id: 'sox-6',
      section: 'Section 409',
      requirement: 'Real-Time Issuer Disclosures',
      status: 'effective',
      testDate: '2025-09-08',
      evidence: ['Disclosure Process', 'Filing Records'],
    },
  ];
}

async function fetchPciRequirements(): Promise<PciRequirement[]> {
  return [
    {
      id: 'pci-1',
      category: 'Build and Maintain a Secure Network',
      requirement: 'Install and maintain a firewall configuration',
      status: 'compliant',
      lastValidated: '2025-08-20',
    },
    {
      id: 'pci-2',
      category: 'Build and Maintain a Secure Network',
      requirement: 'Do not use vendor-supplied defaults',
      status: 'compliant',
      lastValidated: '2025-08-20',
    },
    {
      id: 'pci-3',
      category: 'Protect Cardholder Data',
      requirement: 'Protect stored cardholder data',
      status: 'compliant',
      lastValidated: '2025-08-20',
    },
    {
      id: 'pci-4',
      category: 'Protect Cardholder Data',
      requirement: 'Encrypt transmission of cardholder data',
      status: 'compliant',
      lastValidated: '2025-08-20',
    },
    {
      id: 'pci-5',
      category: 'Maintain a Vulnerability Management Program',
      requirement: 'Use and regularly update anti-virus software',
      status: 'compliant',
      lastValidated: '2025-08-20',
    },
    {
      id: 'pci-6',
      category: 'Maintain a Vulnerability Management Program',
      requirement: 'Develop and maintain secure systems and applications',
      status: 'compliant',
      lastValidated: '2025-08-20',
    },
    {
      id: 'pci-7',
      category: 'Implement Strong Access Control Measures',
      requirement:
        'Restrict access to cardholder data by business need to know',
      status: 'compliant',
      lastValidated: '2025-08-20',
    },
    {
      id: 'pci-8',
      category: 'Implement Strong Access Control Measures',
      requirement: 'Assign a unique ID to each person with computer access',
      status: 'compliant',
      lastValidated: '2025-08-20',
    },
    {
      id: 'pci-9',
      category: 'Implement Strong Access Control Measures',
      requirement: 'Restrict physical access to cardholder data',
      status: 'compliant',
      lastValidated: '2025-08-20',
    },
    {
      id: 'pci-10',
      category: 'Regularly Monitor and Test Networks',
      requirement:
        'Track and monitor all access to network resources and cardholder data',
      status: 'compliant',
      lastValidated: '2025-08-20',
    },
    {
      id: 'pci-11',
      category: 'Regularly Monitor and Test Networks',
      requirement: 'Regularly test security systems and processes',
      status: 'compliant',
      lastValidated: '2025-08-20',
    },
    {
      id: 'pci-12',
      category: 'Maintain an Information Security Policy',
      requirement: 'Maintain a policy that addresses information security',
      status: 'compliant',
      lastValidated: '2025-08-20',
    },
  ];
}

async function fetchFinraRecords(): Promise<FinraRecord[]> {
  return [
    {
      id: 'finra-1',
      type: 'Communications Archiving',
      description: 'Email and messaging archive system',
      status: 'current',
      date: '2025-11-30',
    },
    {
      id: 'finra-2',
      type: 'Supervisory Controls',
      description: 'Review and approval procedures',
      status: 'current',
      date: '2025-11-28',
    },
    {
      id: 'finra-3',
      type: 'Customer Disclosures',
      description: 'Required disclosure documents',
      status: 'current',
      date: '2025-11-25',
    },
    {
      id: 'finra-4',
      type: 'Suitability Documentation',
      description: 'Customer suitability records',
      status: 'current',
      date: '2025-11-20',
    },
    {
      id: 'finra-5',
      type: 'Form U4/U5 Filings',
      description: 'Registration filings',
      status: 'pending',
      date: '2025-12-15',
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
  effective: 'success',
  'partially-effective': 'warning',
  ineffective: 'secondary',
  'not-tested': 'neutral',
  'not-applicable': 'neutral',
  current: 'success',
  pending: 'primary',
  expired: 'secondary',
};

function FinancialCompliancePage(): JSX.Element {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'sox' | 'finra' | 'pci'
  >('overview');

  useRedirectOnUnauthorized();

  // Queries
  const frameworksQuery = useQuery({
    queryKey: ['compliance', 'financial-frameworks'],
    queryFn: fetchFrameworks,
  });

  const soxQuery = useQuery({
    queryKey: ['compliance', 'sox-controls'],
    queryFn: fetchSoxControls,
  });

  const pciQuery = useQuery({
    queryKey: ['compliance', 'pci-requirements'],
    queryFn: fetchPciRequirements,
  });

  const finraQuery = useQuery({
    queryKey: ['compliance', 'finra-records'],
    queryFn: fetchFinraRecords,
  });

  const soxCompliant =
    soxQuery.data?.filter((c) => c.status === 'effective').length || 0;
  const pciCompliant =
    pciQuery.data?.filter((r) => r.status === 'compliant').length || 0;
  const finraCurrentRecords =
    finraQuery.data?.filter((r) => r.status === 'current').length || 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial Compliance"
        subtitle="COMP.2 - SOX, FINRA, and PCI DSS Compliance Management"
        icon={DollarSign}
        actions={
          <Button variant="secondary">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        }
      />

      {/* Framework Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {frameworksQuery.data?.map((framework) => (
          <Card key={framework.shortName}>
            <CardBody>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    {framework.shortName}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {framework.name}
                  </p>
                </div>
                <Badge variant={STATUS_VARIANTS[framework.status]}>
                  {framework.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    {framework.controlsCompliant}/{framework.controlsTotal}
                  </p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Controls Compliant
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p className="text-neutral-600 dark:text-neutral-400">
                    Next Audit
                  </p>
                  <p className="font-medium text-neutral-900 dark:text-neutral-100">
                    {framework.nextAudit
                      ? new Date(framework.nextAudit).toLocaleDateString()
                      : 'TBD'}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-neutral-200 dark:border-neutral-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'sox', label: 'SOX Controls', icon: Scale },
            { id: 'finra', label: 'FINRA', icon: Archive },
            { id: 'pci', label: 'PCI DSS', icon: CreditCard },
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
                Financial Compliance Checklist
              </h3>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                {[
                  { label: 'SOX Requirements Mapping', done: true },
                  { label: 'Internal Controls Implementation', done: true },
                  { label: 'Audit Trail Documentation', done: true },
                  { label: 'Segregation of Duties Controls', done: true },
                  { label: 'Change Management Procedures', done: true },
                  { label: 'SOX Compliance Reporting', done: true },
                  { label: 'FINRA Requirements Mapping', done: true },
                  { label: 'Communications Archiving', done: true },
                  { label: 'Supervisory Controls', done: true },
                  { label: 'Required Disclosures', done: true },
                  { label: 'PCI DSS Scoping', done: true },
                  { label: 'PCI-Compliant Payment Processor', done: true },
                  { label: 'Quarterly Vulnerability Scans', done: false },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-2 border-b border-neutral-200 dark:border-neutral-700 last:border-0"
                  >
                    <span
                      className={
                        item.done
                          ? 'text-neutral-900 dark:text-neutral-100'
                          : 'text-neutral-600 dark:text-neutral-400'
                      }
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
                Compliance Summary
              </h3>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div className="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Scale className="h-5 w-5 text-blue-500" />
                      <span className="font-medium text-neutral-900 dark:text-neutral-100">
                        SOX Controls
                      </span>
                    </div>
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">
                      {soxCompliant}/{soxQuery.data?.length || 0} effective
                    </span>
                  </div>
                  <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-blue-500"
                      style={{
                        width: `${soxQuery.data ? (soxCompliant / soxQuery.data.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Archive className="h-5 w-5 text-purple-500" />
                      <span className="font-medium text-neutral-900 dark:text-neutral-100">
                        FINRA Records
                      </span>
                    </div>
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">
                      {finraCurrentRecords}/{finraQuery.data?.length || 0}{' '}
                      current
                    </span>
                  </div>
                  <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-purple-500"
                      style={{
                        width: `${finraQuery.data ? (finraCurrentRecords / finraQuery.data.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-green-500" />
                      <span className="font-medium text-neutral-900 dark:text-neutral-100">
                        PCI DSS Requirements
                      </span>
                    </div>
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">
                      {pciCompliant}/{pciQuery.data?.length || 0} compliant
                    </span>
                  </div>
                  <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-green-500"
                      style={{
                        width: `${pciQuery.data ? (pciCompliant / pciQuery.data.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* SOX Tab */}
      {activeTab === 'sox' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                Sarbanes-Oxley Controls
              </h3>
              <Button variant="secondary" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                Run Control Test
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {soxQuery.data?.map((control) => (
                <div
                  key={control.id}
                  className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-neutral-100">
                        {control.requirement}
                      </p>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        {control.section}
                      </p>
                    </div>
                    <Badge variant={STATUS_VARIANTS[control.status]}>
                      {control.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex flex-wrap gap-2">
                      {control.evidence.map((ev, idx) => (
                        <span
                          key={idx}
                          className="bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded text-xs text-neutral-700 dark:text-neutral-300"
                        >
                          {ev}
                        </span>
                      ))}
                    </div>
                    <span className="text-neutral-600 dark:text-neutral-400">
                      Tested:{' '}
                      {control.testDate
                        ? new Date(control.testDate).toLocaleDateString()
                        : 'Not tested'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* FINRA Tab */}
      {activeTab === 'finra' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                FINRA Compliance Records
              </h3>
              <Button variant="secondary" size="sm">
                <Archive className="h-4 w-4 mr-2" />
                Add Record
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
                <thead className="bg-neutral-50 dark:bg-neutral-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-700">
                  {finraQuery.data?.map((record) => (
                    <tr key={record.id}>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-neutral-900 dark:text-neutral-100">
                        {record.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-400">
                        {record.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={STATUS_VARIANTS[record.status]}>
                          {record.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-400">
                        {new Date(record.date).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* PCI DSS Tab */}
      {activeTab === 'pci' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                PCI DSS Requirements
              </h3>
              <Button variant="secondary" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                SAQ Assessment
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-6">
              {[
                'Build and Maintain a Secure Network',
                'Protect Cardholder Data',
                'Maintain a Vulnerability Management Program',
                'Implement Strong Access Control Measures',
                'Regularly Monitor and Test Networks',
                'Maintain an Information Security Policy',
              ].map((category) => (
                <div key={category}>
                  <h4 className="font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                    {category}
                  </h4>
                  <div className="space-y-2">
                    {pciQuery.data
                      ?.filter((r) => r.category === category)
                      .map((requirement) => (
                        <div
                          key={requirement.id}
                          className="flex items-center justify-between p-3 border border-neutral-200 dark:border-neutral-700 rounded-lg"
                        >
                          <div>
                            <p className="text-sm text-neutral-900 dark:text-neutral-100">
                              {requirement.requirement}
                            </p>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                              Last validated:{' '}
                              {requirement.lastValidated
                                ? new Date(
                                    requirement.lastValidated,
                                  ).toLocaleDateString()
                                : 'Never'}
                            </p>
                          </div>
                          <Badge variant={STATUS_VARIANTS[requirement.status]}>
                            {requirement.status}
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
    </div>
  );
}

export default FinancialCompliancePage;
