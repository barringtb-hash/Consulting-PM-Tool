/**
 * AI/ML Infrastructure Page (INF.2)
 *
 * NLP services, ML models, and integrations framework management
 * Dependencies: INF.1 (Core Infrastructure)
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import useRedirectOnUnauthorized from '../../auth/useRedirectOnUnauthorized';
import { PageHeader } from '../../ui/PageHeader';
import { Button } from '../../ui/Button';
import { Card, CardBody, CardHeader } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import {
  Brain,
  Cpu,
  MessageSquare,
  Zap,
  BarChart3,
  Settings,
  RefreshCw,
  CheckCircle2,
  Clock,
  GitBranch,
  Layers,
  Link,
  Activity,
} from 'lucide-react';

// Types
interface NlpServiceStatus {
  name: string;
  provider: string;
  status: 'active' | 'inactive' | 'error';
  requestsToday: number;
  avgLatency: number;
  errorRate: number;
}

interface MlModel {
  id: string;
  name: string;
  version: string;
  type: string;
  status: 'deployed' | 'training' | 'pending';
  accuracy: number;
  lastTrained: string;
}

interface IntegrationConnector {
  name: string;
  category: string;
  status: 'connected' | 'configured' | 'pending';
  lastSync: string | null;
}

// Mock API functions
async function fetchNlpServices(): Promise<NlpServiceStatus[]> {
  return [
    {
      name: 'GPT-4 Chat Completion',
      provider: 'OpenAI',
      status: 'active',
      requestsToday: 4521,
      avgLatency: 1250,
      errorRate: 0.02,
    },
    {
      name: 'Embeddings API',
      provider: 'OpenAI',
      status: 'active',
      requestsToday: 12340,
      avgLatency: 180,
      errorRate: 0.01,
    },
    {
      name: 'Document OCR',
      provider: 'Google Vision',
      status: 'active',
      requestsToday: 892,
      avgLatency: 2100,
      errorRate: 0.05,
    },
    {
      name: 'Named Entity Recognition',
      provider: 'Custom',
      status: 'active',
      requestsToday: 3456,
      avgLatency: 450,
      errorRate: 0.01,
    },
    {
      name: 'Sentiment Analysis',
      provider: 'Custom',
      status: 'active',
      requestsToday: 1234,
      avgLatency: 120,
      errorRate: 0.02,
    },
  ];
}

async function fetchMlModels(): Promise<MlModel[]> {
  return [
    {
      id: '1',
      name: 'Lead Scoring Model',
      version: '2.3.1',
      type: 'Classification',
      status: 'deployed',
      accuracy: 87.5,
      lastTrained: '2025-11-28T10:00:00Z',
    },
    {
      id: '2',
      name: 'No-Show Prediction',
      version: '1.5.0',
      type: 'Classification',
      status: 'deployed',
      accuracy: 82.3,
      lastTrained: '2025-11-25T14:30:00Z',
    },
    {
      id: '3',
      name: 'Inventory Forecast',
      version: '3.0.0',
      type: 'Time Series',
      status: 'deployed',
      accuracy: 91.2,
      lastTrained: '2025-11-29T08:00:00Z',
    },
    {
      id: '4',
      name: 'Equipment Failure Prediction',
      version: '1.0.0',
      type: 'Anomaly Detection',
      status: 'training',
      accuracy: 78.9,
      lastTrained: '2025-11-20T16:00:00Z',
    },
    {
      id: '5',
      name: 'Dynamic Pricing',
      version: '2.1.0',
      type: 'Regression',
      status: 'deployed',
      accuracy: 85.6,
      lastTrained: '2025-11-27T12:00:00Z',
    },
  ];
}

async function fetchIntegrations(): Promise<IntegrationConnector[]> {
  return [
    {
      name: 'Salesforce',
      category: 'CRM',
      status: 'connected',
      lastSync: '2025-11-30T09:00:00Z',
    },
    {
      name: 'HubSpot',
      category: 'CRM',
      status: 'connected',
      lastSync: '2025-11-30T08:45:00Z',
    },
    {
      name: 'Shopify',
      category: 'E-commerce',
      status: 'connected',
      lastSync: '2025-11-30T09:15:00Z',
    },
    {
      name: 'Epic EHR',
      category: 'Healthcare',
      status: 'configured',
      lastSync: null,
    },
    {
      name: 'Stripe',
      category: 'Payments',
      status: 'connected',
      lastSync: '2025-11-30T09:30:00Z',
    },
    {
      name: 'Twilio',
      category: 'Communications',
      status: 'connected',
      lastSync: '2025-11-30T09:00:00Z',
    },
    {
      name: 'SendGrid',
      category: 'Communications',
      status: 'connected',
      lastSync: '2025-11-30T08:30:00Z',
    },
    {
      name: 'Google Calendar',
      category: 'Productivity',
      status: 'connected',
      lastSync: '2025-11-30T09:10:00Z',
    },
    { name: 'NetSuite', category: 'ERP', status: 'pending', lastSync: null },
    {
      name: 'Zendesk',
      category: 'Support',
      status: 'connected',
      lastSync: '2025-11-30T08:00:00Z',
    },
  ];
}

const STATUS_COLORS = {
  active: 'bg-green-500',
  inactive: 'bg-gray-500',
  error: 'bg-red-500',
  deployed: 'success',
  training: 'warning',
  pending: 'neutral',
  connected: 'success',
  configured: 'primary',
};

function AiMlInfrastructurePage(): JSX.Element {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'nlp' | 'models' | 'integrations'
  >('overview');

  useRedirectOnUnauthorized();

  // Queries
  const nlpQuery = useQuery({
    queryKey: ['infrastructure', 'nlp-services'],
    queryFn: fetchNlpServices,
  });

  const modelsQuery = useQuery({
    queryKey: ['infrastructure', 'ml-models'],
    queryFn: fetchMlModels,
  });

  const integrationsQuery = useQuery({
    queryKey: ['infrastructure', 'integrations'],
    queryFn: fetchIntegrations,
  });

  const totalRequests =
    nlpQuery.data?.reduce((sum, s) => sum + s.requestsToday, 0) || 0;
  const avgLatency =
    nlpQuery.data && nlpQuery.data.length > 0
      ? Math.round(
          nlpQuery.data.reduce((sum, s) => sum + s.avgLatency, 0) /
            nlpQuery.data.length,
        )
      : 0;
  const deployedModels =
    modelsQuery.data?.filter((m) => m.status === 'deployed').length || 0;
  const connectedIntegrations =
    integrationsQuery.data?.filter((i) => i.status === 'connected').length || 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI/ML Infrastructure"
        subtitle="INF.2 - NLP Services, Machine Learning Models, and Integration Framework"
        icon={Brain}
        actions={
          <Button variant="secondary">
            <Settings className="mr-2 h-4 w-4" />
            Configure
          </Button>
        }
      />

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">NLP Requests (Today)</p>
                <p className="text-2xl font-bold">
                  {totalRequests.toLocaleString()}
                </p>
                <p className="text-sm text-gray-400">
                  {avgLatency}ms avg latency
                </p>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-500" />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">ML Models</p>
                <p className="text-2xl font-bold">
                  {deployedModels}/{modelsQuery.data?.length || 0}
                </p>
                <p className="text-sm text-gray-400">Deployed</p>
              </div>
              <Cpu className="h-8 w-8 text-purple-500" />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Integrations</p>
                <p className="text-2xl font-bold">
                  {connectedIntegrations}/{integrationsQuery.data?.length || 0}
                </p>
                <p className="text-sm text-gray-400">Connected</p>
              </div>
              <Link className="h-8 w-8 text-green-500" />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg Model Accuracy</p>
                <p className="text-2xl font-bold text-green-600">
                  {modelsQuery.data
                    ? (
                        modelsQuery.data.reduce(
                          (sum, m) => sum + m.accuracy,
                          0,
                        ) / modelsQuery.data.length
                      ).toFixed(1)
                    : 0}
                  %
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-emerald-500" />
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: Layers },
            { id: 'nlp', label: 'NLP Services', icon: MessageSquare },
            { id: 'models', label: 'ML Models', icon: Cpu },
            { id: 'integrations', label: 'Integrations', icon: Link },
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
                AI/ML Infrastructure Checklist
              </h3>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                {[
                  { label: 'NLP Model Serving Infrastructure', done: true },
                  { label: 'Document Analysis Pipeline', done: true },
                  { label: 'Chatbot/Conversation Framework', done: true },
                  { label: 'Content Generation Service', done: true },
                  { label: 'Intent Recognition Service', done: true },
                  { label: 'ML Model Training Infrastructure', done: true },
                  { label: 'Model Versioning System', done: true },
                  { label: 'Model Deployment Pipeline', done: true },
                  { label: 'Model Monitoring System', done: false },
                  { label: 'A/B Testing Framework', done: false },
                  { label: 'Integration Connector Framework', done: true },
                  { label: 'OAuth Handling System', done: true },
                  { label: 'Webhook Management', done: true },
                  { label: 'Data Transformation Layer', done: true },
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
              <h3 className="text-lg font-semibold">AI Service Providers</h3>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                {[
                  {
                    name: 'OpenAI',
                    services: ['GPT-4', 'Embeddings', 'Whisper'],
                    status: 'connected',
                  },
                  {
                    name: 'Google Cloud',
                    services: ['Vision OCR', 'Speech-to-Text'],
                    status: 'connected',
                  },
                  {
                    name: 'Custom Models',
                    services: ['NER', 'Classification', 'Forecasting'],
                    status: 'deployed',
                  },
                  {
                    name: 'Hugging Face',
                    services: ['Transformers', 'Inference API'],
                    status: 'pending',
                  },
                ].map((provider, idx) => (
                  <div key={idx} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{provider.name}</span>
                      <Badge
                        variant={
                          provider.status === 'connected' ||
                          provider.status === 'deployed'
                            ? 'success'
                            : 'neutral'
                        }
                      >
                        {provider.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {provider.services.map((service, sidx) => (
                        <span
                          key={sidx}
                          className="text-xs bg-gray-100 px-2 py-1 rounded"
                        >
                          {service}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* NLP Services Tab */}
      {activeTab === 'nlp' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">NLP Services</h3>
              <Button variant="secondary" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Service
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Provider
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Requests (Today)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Avg Latency
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Error Rate
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {nlpQuery.data?.map((service, idx) => (
                    <tr key={idx}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <MessageSquare className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="font-medium">{service.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {service.provider}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div
                            className={`w-2 h-2 rounded-full mr-2 ${STATUS_COLORS[service.status]}`}
                          />
                          <span className="text-sm capitalize">
                            {service.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {service.requestsToday.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {service.avgLatency}ms
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={
                            service.errorRate > 0.03
                              ? 'text-red-500'
                              : 'text-green-600'
                          }
                        >
                          {(service.errorRate * 100).toFixed(2)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ML Models Tab */}
      {activeTab === 'models' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Machine Learning Models</h3>
              <Button variant="secondary" size="sm">
                <Zap className="h-4 w-4 mr-2" />
                Train New Model
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {modelsQuery.data?.map((model) => (
                <div key={model.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Cpu className="h-5 w-5 text-purple-500" />
                      <div>
                        <p className="font-medium">{model.name}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <GitBranch className="h-3 w-3" />
                          <span>v{model.version}</span>
                          <span className="text-gray-300">|</span>
                          <span>{model.type}</span>
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant={
                        STATUS_COLORS[model.status] as
                          | 'success'
                          | 'warning'
                          | 'neutral'
                      }
                    >
                      {model.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Accuracy</p>
                      <p className="font-semibold text-green-600">
                        {model.accuracy}%
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Last Trained</p>
                      <p className="font-medium">
                        {new Date(model.lastTrained).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Type</p>
                      <p className="font-medium">{model.type}</p>
                    </div>
                    <div className="flex items-end justify-end">
                      <Button variant="secondary" size="sm">
                        <Activity className="h-4 w-4 mr-1" />
                        Metrics
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Integrations Tab */}
      {activeTab === 'integrations' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Integration Connectors</h3>
              <Button variant="secondary" size="sm">
                <Link className="h-4 w-4 mr-2" />
                Add Integration
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {integrationsQuery.data?.map((integration, idx) => (
                <div key={idx} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{integration.name}</span>
                    <Badge
                      variant={
                        integration.status === 'connected'
                          ? 'success'
                          : integration.status === 'configured'
                            ? 'primary'
                            : 'neutral'
                      }
                    >
                      {integration.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500 mb-2">
                    {integration.category}
                  </p>
                  {integration.lastSync && (
                    <p className="text-xs text-gray-400">
                      Last sync:{' '}
                      {new Date(integration.lastSync).toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

export default AiMlInfrastructurePage;
