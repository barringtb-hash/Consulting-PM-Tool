/**
 * IoT Infrastructure Page (INF.3)
 *
 * Sensor pipeline, real-time processing, and IoT device management
 * Dependencies: INF.2 (AI/ML Infrastructure), before Phase 3.3A (Predictive Maintenance)
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import useRedirectOnUnauthorized from '../../auth/useRedirectOnUnauthorized';
import { PageHeader } from '../../ui/PageHeader';
import { Button } from '../../ui/Button';
import { Card, CardBody, CardHeader } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import {
  Radio,
  Cpu,
  Activity,
  Wifi,
  Database,
  AlertTriangle,
  Settings,
  RefreshCw,
  CheckCircle2,
  Clock,
  Zap,
  Thermometer,
  Gauge,
  Server,
} from 'lucide-react';

// Types
interface IoTGateway {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline' | 'warning';
  connectedDevices: number;
  lastHeartbeat: string;
  protocol: string;
}

interface Sensor {
  id: string;
  name: string;
  type: string;
  gatewayId: string;
  status: 'active' | 'inactive' | 'error';
  lastReading: {
    value: number;
    unit: string;
    timestamp: string;
  };
  batteryLevel: number | null;
}

interface DataPipelineStatus {
  name: string;
  throughput: number;
  latency: number;
  status: 'healthy' | 'degraded' | 'down';
  messagesProcessed24h: number;
}

interface AlertConfig {
  id: string;
  name: string;
  condition: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  enabled: boolean;
  triggeredCount24h: number;
}

// Mock API functions
async function fetchGateways(): Promise<IoTGateway[]> {
  return [
    {
      id: 'gw-001',
      name: 'Production Floor Gateway',
      location: 'Building A - Floor 1',
      status: 'online',
      connectedDevices: 24,
      lastHeartbeat: new Date().toISOString(),
      protocol: 'MQTT',
    },
    {
      id: 'gw-002',
      name: 'Warehouse Gateway',
      location: 'Building B',
      status: 'online',
      connectedDevices: 18,
      lastHeartbeat: new Date().toISOString(),
      protocol: 'MQTT',
    },
    {
      id: 'gw-003',
      name: 'HVAC Gateway',
      location: 'Building A - Roof',
      status: 'warning',
      connectedDevices: 8,
      lastHeartbeat: new Date(Date.now() - 300000).toISOString(),
      protocol: 'Modbus',
    },
    {
      id: 'gw-004',
      name: 'Vehicle Fleet Gateway',
      location: 'Parking Lot',
      status: 'online',
      connectedDevices: 12,
      lastHeartbeat: new Date().toISOString(),
      protocol: 'LTE/MQTT',
    },
  ];
}

async function fetchSensors(): Promise<Sensor[]> {
  return [
    {
      id: 's-001',
      name: 'CNC Machine #1 - Vibration',
      type: 'Vibration',
      gatewayId: 'gw-001',
      status: 'active',
      lastReading: {
        value: 0.24,
        unit: 'mm/s',
        timestamp: new Date().toISOString(),
      },
      batteryLevel: null,
    },
    {
      id: 's-002',
      name: 'CNC Machine #1 - Temperature',
      type: 'Temperature',
      gatewayId: 'gw-001',
      status: 'active',
      lastReading: {
        value: 72.5,
        unit: '°F',
        timestamp: new Date().toISOString(),
      },
      batteryLevel: null,
    },
    {
      id: 's-003',
      name: 'Warehouse Zone A - Temperature',
      type: 'Temperature',
      gatewayId: 'gw-002',
      status: 'active',
      lastReading: {
        value: 68.2,
        unit: '°F',
        timestamp: new Date().toISOString(),
      },
      batteryLevel: 87,
    },
    {
      id: 's-004',
      name: 'Warehouse Zone A - Humidity',
      type: 'Humidity',
      gatewayId: 'gw-002',
      status: 'active',
      lastReading: {
        value: 45,
        unit: '%',
        timestamp: new Date().toISOString(),
      },
      batteryLevel: 92,
    },
    {
      id: 's-005',
      name: 'HVAC Unit #3 - Pressure',
      type: 'Pressure',
      gatewayId: 'gw-003',
      status: 'error',
      lastReading: {
        value: 0,
        unit: 'PSI',
        timestamp: new Date(Date.now() - 600000).toISOString(),
      },
      batteryLevel: null,
    },
  ];
}

async function fetchPipelineStatus(): Promise<DataPipelineStatus[]> {
  return [
    {
      name: 'Sensor Data Ingestion',
      throughput: 12500,
      latency: 45,
      status: 'healthy',
      messagesProcessed24h: 1080000,
    },
    {
      name: 'Real-Time Processing',
      throughput: 8900,
      latency: 120,
      status: 'healthy',
      messagesProcessed24h: 768960,
    },
    {
      name: 'Anomaly Detection',
      throughput: 4200,
      latency: 250,
      status: 'healthy',
      messagesProcessed24h: 362880,
    },
    {
      name: 'Alert Generation',
      throughput: 150,
      latency: 80,
      status: 'healthy',
      messagesProcessed24h: 12960,
    },
  ];
}

async function fetchAlertConfigs(): Promise<AlertConfig[]> {
  return [
    {
      id: 'alert-001',
      name: 'High Temperature Alert',
      condition: 'temperature > 85°F',
      severity: 'high',
      enabled: true,
      triggeredCount24h: 3,
    },
    {
      id: 'alert-002',
      name: 'Vibration Anomaly',
      condition: 'vibration > 0.5 mm/s',
      severity: 'critical',
      enabled: true,
      triggeredCount24h: 1,
    },
    {
      id: 'alert-003',
      name: 'Gateway Offline',
      condition: 'heartbeat > 5 min',
      severity: 'critical',
      enabled: true,
      triggeredCount24h: 2,
    },
    {
      id: 'alert-004',
      name: 'Low Battery',
      condition: 'battery < 20%',
      severity: 'medium',
      enabled: true,
      triggeredCount24h: 0,
    },
  ];
}

const STATUS_COLORS = {
  online: 'bg-green-500',
  offline: 'bg-red-500',
  warning: 'bg-yellow-500',
  active: 'bg-green-500',
  inactive: 'bg-gray-500',
  error: 'bg-red-500',
  healthy: 'success',
  degraded: 'warning',
  down: 'secondary',
};

const SEVERITY_VARIANTS: Record<
  string,
  'secondary' | 'warning' | 'primary' | 'neutral'
> = {
  critical: 'secondary',
  high: 'warning',
  medium: 'primary',
  low: 'neutral',
};

function IotInfrastructurePage(): JSX.Element {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'gateways' | 'sensors' | 'pipeline' | 'alerts'
  >('overview');

  useRedirectOnUnauthorized();

  // Queries
  const gatewaysQuery = useQuery({
    queryKey: ['infrastructure', 'iot-gateways'],
    queryFn: fetchGateways,
  });

  const sensorsQuery = useQuery({
    queryKey: ['infrastructure', 'iot-sensors'],
    queryFn: fetchSensors,
  });

  const pipelineQuery = useQuery({
    queryKey: ['infrastructure', 'iot-pipeline'],
    queryFn: fetchPipelineStatus,
  });

  const alertsQuery = useQuery({
    queryKey: ['infrastructure', 'iot-alerts'],
    queryFn: fetchAlertConfigs,
  });

  const onlineGateways =
    gatewaysQuery.data?.filter((g) => g.status === 'online').length || 0;
  const activeSensors =
    sensorsQuery.data?.filter((s) => s.status === 'active').length || 0;
  const totalDevices =
    gatewaysQuery.data?.reduce((sum, g) => sum + g.connectedDevices, 0) || 0;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 space-y-6">
      <PageHeader
        title="IoT Infrastructure"
        subtitle="INF.3 - Sensor Pipeline, Real-Time Processing, and Device Management"
        icon={Radio}
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
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Gateways
                </p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                  {onlineGateways}/{gatewaysQuery.data?.length || 0}
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Online
                </p>
              </div>
              <Wifi className="h-8 w-8 text-blue-500" />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Connected Devices
                </p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                  {totalDevices}
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {activeSensors} sensors active
                </p>
              </div>
              <Cpu className="h-8 w-8 text-purple-500" />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Data Throughput
                </p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                  {(pipelineQuery.data?.[0]?.throughput || 0).toLocaleString()}
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  messages/sec
                </p>
              </div>
              <Activity className="h-8 w-8 text-green-500" />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Alerts (24h)
                </p>
                <p className="text-2xl font-bold text-orange-500">
                  {alertsQuery.data?.reduce(
                    (sum, a) => sum + a.triggeredCount24h,
                    0,
                  ) || 0}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-neutral-200 dark:border-neutral-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: Radio },
            { id: 'gateways', label: 'Gateways', icon: Wifi },
            { id: 'sensors', label: 'Sensors', icon: Gauge },
            { id: 'pipeline', label: 'Data Pipeline', icon: Database },
            { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as typeof activeTab)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-600'
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
                IoT Infrastructure Checklist
              </h3>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                {[
                  { label: 'IoT Data Ingestion Pipeline', done: true },
                  { label: 'Sensor Management System', done: true },
                  { label: 'Real-Time Processing Infrastructure', done: true },
                  { label: 'Alert/Notification System', done: true },
                  { label: 'MQTT Broker', done: true },
                  { label: 'Modbus Support', done: true },
                  { label: 'OPC-UA Support', done: false },
                  { label: 'Time Series Database', done: true },
                  { label: 'Device Provisioning', done: true },
                  { label: 'Firmware Updates (OTA)', done: false },
                  { label: 'Edge Computing Support', done: false },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-2 border-b border-neutral-200 dark:border-neutral-700 last:border-0"
                  >
                    <span
                      className={
                        item.done
                          ? 'text-neutral-900 dark:text-neutral-100'
                          : 'text-neutral-500 dark:text-neutral-400'
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
                Supported Protocols
              </h3>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                {[
                  {
                    name: 'MQTT',
                    status: 'active',
                    description: 'Primary IoT messaging protocol',
                  },
                  {
                    name: 'Modbus TCP/RTU',
                    status: 'active',
                    description: 'Industrial equipment',
                  },
                  {
                    name: 'HTTP/REST',
                    status: 'active',
                    description: 'API integrations',
                  },
                  {
                    name: 'WebSocket',
                    status: 'active',
                    description: 'Real-time streaming',
                  },
                  {
                    name: 'OPC-UA',
                    status: 'pending',
                    description: 'Industrial automation',
                  },
                  {
                    name: 'BACnet',
                    status: 'pending',
                    description: 'Building automation',
                  },
                ].map((protocol, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-neutral-100">
                        {protocol.name}
                      </p>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        {protocol.description}
                      </p>
                    </div>
                    <Badge
                      variant={
                        protocol.status === 'active' ? 'success' : 'neutral'
                      }
                    >
                      {protocol.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Gateways Tab */}
      {activeTab === 'gateways' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                IoT Gateways
              </h3>
              <Button variant="secondary" size="sm">
                <Wifi className="h-4 w-4 mr-2" />
                Add Gateway
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {gatewaysQuery.data?.map((gateway) => (
                <div
                  key={gateway.id}
                  className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${STATUS_COLORS[gateway.status]}`}
                      />
                      <div>
                        <p className="font-medium text-neutral-900 dark:text-neutral-100">
                          {gateway.name}
                        </p>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                          {gateway.location}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        gateway.status === 'online'
                          ? 'success'
                          : gateway.status === 'warning'
                            ? 'warning'
                            : 'secondary'
                      }
                    >
                      {gateway.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-neutral-600 dark:text-neutral-400">
                        Devices
                      </p>
                      <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                        {gateway.connectedDevices}
                      </p>
                    </div>
                    <div>
                      <p className="text-neutral-600 dark:text-neutral-400">
                        Protocol
                      </p>
                      <p className="font-medium text-neutral-900 dark:text-neutral-100">
                        {gateway.protocol}
                      </p>
                    </div>
                    <div>
                      <p className="text-neutral-600 dark:text-neutral-400">
                        Last Heartbeat
                      </p>
                      <p className="font-medium text-neutral-900 dark:text-neutral-100">
                        {new Date(gateway.lastHeartbeat).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Sensors Tab */}
      {activeTab === 'sensors' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                Connected Sensors
              </h3>
              <Button variant="secondary" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
                <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase">
                      Sensor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase">
                      Last Reading
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase">
                      Battery
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-700">
                  {sensorsQuery.data?.map((sensor) => (
                    <tr key={sensor.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {sensor.type === 'Temperature' && (
                            <Thermometer className="h-4 w-4 text-red-400 mr-2" />
                          )}
                          {sensor.type === 'Vibration' && (
                            <Activity className="h-4 w-4 text-blue-400 mr-2" />
                          )}
                          {sensor.type === 'Humidity' && (
                            <Gauge className="h-4 w-4 text-cyan-400 mr-2" />
                          )}
                          {sensor.type === 'Pressure' && (
                            <Gauge className="h-4 w-4 text-purple-400 mr-2" />
                          )}
                          <span className="font-medium text-neutral-900 dark:text-neutral-100">
                            {sensor.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-400">
                        {sensor.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div
                            className={`w-2 h-2 rounded-full mr-2 ${STATUS_COLORS[sensor.status]}`}
                          />
                          <span className="text-sm capitalize text-neutral-900 dark:text-neutral-100">
                            {sensor.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="font-medium text-neutral-900 dark:text-neutral-100">
                          {sensor.lastReading.value} {sensor.lastReading.unit}
                        </span>
                        <span className="text-neutral-500 dark:text-neutral-500 ml-2 text-xs">
                          {new Date(
                            sensor.lastReading.timestamp,
                          ).toLocaleTimeString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {sensor.batteryLevel !== null ? (
                          <span
                            className={
                              sensor.batteryLevel < 20
                                ? 'text-red-500'
                                : sensor.batteryLevel < 50
                                  ? 'text-yellow-500'
                                  : 'text-green-500'
                            }
                          >
                            {sensor.batteryLevel}%
                          </span>
                        ) : (
                          <span className="text-neutral-500 dark:text-neutral-400">
                            Wired
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Pipeline Tab */}
      {activeTab === 'pipeline' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                Data Pipeline Status
              </h3>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                {pipelineQuery.data?.map((pipeline, idx) => (
                  <div
                    key={idx}
                    className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Server className="h-5 w-5 text-blue-500" />
                        <span className="font-medium text-neutral-900 dark:text-neutral-100">
                          {pipeline.name}
                        </span>
                      </div>
                      <Badge
                        variant={
                          STATUS_COLORS[pipeline.status] as
                            | 'success'
                            | 'warning'
                            | 'secondary'
                        }
                      >
                        {pipeline.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-neutral-600 dark:text-neutral-400">
                          Throughput
                        </p>
                        <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {pipeline.throughput.toLocaleString()} msg/s
                        </p>
                      </div>
                      <div>
                        <p className="text-neutral-600 dark:text-neutral-400">
                          Latency
                        </p>
                        <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {pipeline.latency}ms
                        </p>
                      </div>
                      <div>
                        <p className="text-neutral-600 dark:text-neutral-400">
                          Processed (24h)
                        </p>
                        <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {pipeline.messagesProcessed24h.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                Alert Configurations
              </h3>
              <Button variant="secondary" size="sm">
                <Zap className="h-4 w-4 mr-2" />
                New Alert Rule
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {alertsQuery.data?.map((alert) => (
                <div
                  key={alert.id}
                  className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <AlertTriangle
                        className={`h-5 w-5 ${
                          alert.severity === 'critical'
                            ? 'text-red-500'
                            : alert.severity === 'high'
                              ? 'text-orange-500'
                              : alert.severity === 'medium'
                                ? 'text-yellow-500'
                                : 'text-neutral-400'
                        }`}
                      />
                      <span className="font-medium text-neutral-900 dark:text-neutral-100">
                        {alert.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={SEVERITY_VARIANTS[alert.severity]}>
                        {alert.severity}
                      </Badge>
                      <Badge variant={alert.enabled ? 'success' : 'neutral'}>
                        {alert.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <p className="text-neutral-600 dark:text-neutral-400 font-mono bg-neutral-50 dark:bg-neutral-800/50 px-2 py-1 rounded">
                      {alert.condition}
                    </p>
                    <p className="text-neutral-600 dark:text-neutral-400">
                      Triggered{' '}
                      <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                        {alert.triggeredCount24h}x
                      </span>{' '}
                      in 24h
                    </p>
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

export default IotInfrastructurePage;
