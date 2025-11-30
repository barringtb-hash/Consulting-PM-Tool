/**
 * Tool 3.3: Predictive Maintenance Platform Router
 *
 * API endpoints for predictive maintenance, equipment monitoring, and work orders
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { EquipmentStatus, MaintenanceType, WorkOrderStatus, WorkOrderPriority } from '@prisma/client';
import { AuthenticatedRequest, requireAuth } from '../../auth/auth.middleware';
import * as maintenanceService from './predictive-maintenance.service';
import {
  hasClientAccess,
  getClientIdFromPredictiveMaintenanceConfig,
} from '../../auth/client-auth.helper';

const router = Router();

// ============ Validation Schemas ============

const createConfigSchema = z.object({
  clientId: z.string().uuid(),
  facilityName: z.string().min(1),
  facilityType: z.string().min(1),
  equipmentCategories: z.array(z.string()),
  maintenanceSchedule: z.record(z.any()).optional(),
  alertThresholds: z.record(z.any()).optional(),
  predictionHorizonDays: z.number().positive().optional(),
  dataRetentionDays: z.number().positive().optional(),
});

const updateConfigSchema = z.object({
  facilityName: z.string().optional(),
  facilityType: z.string().optional(),
  equipmentCategories: z.array(z.string()).optional(),
  maintenanceSchedule: z.record(z.any()).optional(),
  alertThresholds: z.record(z.any()).optional(),
  predictionHorizonDays: z.number().positive().optional(),
  dataRetentionDays: z.number().positive().optional(),
});

const createEquipmentSchema = z.object({
  configId: z.string().uuid(),
  assetId: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  location: z.string().optional(),
  installDate: z.string().datetime().optional(),
  warrantyExpiry: z.string().datetime().optional(),
  specifications: z.record(z.any()).optional(),
  maintenanceInterval: z.number().positive().optional(),
  criticality: z.string().optional(),
});

const updateEquipmentSchema = z.object({
  name: z.string().optional(),
  category: z.string().optional(),
  status: z.nativeEnum(EquipmentStatus).optional(),
  location: z.string().optional(),
  specifications: z.record(z.any()).optional(),
  maintenanceInterval: z.number().positive().optional(),
  criticality: z.string().optional(),
  lastMaintenanceDate: z.string().datetime().optional(),
  nextMaintenanceDate: z.string().datetime().optional(),
});

const createSensorSchema = z.object({
  configId: z.string().uuid(),
  equipmentId: z.string().uuid(),
  sensorId: z.string().min(1),
  name: z.string().min(1),
  sensorType: z.string().min(1),
  unit: z.string().min(1),
  minThreshold: z.number().optional(),
  maxThreshold: z.number().optional(),
  readingInterval: z.number().positive().optional(),
});

const updateSensorSchema = z.object({
  name: z.string().optional(),
  minThreshold: z.number().optional(),
  maxThreshold: z.number().optional(),
  readingInterval: z.number().positive().optional(),
  isActive: z.boolean().optional(),
});

const recordReadingSchema = z.object({
  sensorId: z.string().uuid(),
  value: z.number(),
  quality: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const createWorkOrderSchema = z.object({
  configId: z.string().uuid(),
  equipmentId: z.string().uuid(),
  workOrderNumber: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  maintenanceType: z.nativeEnum(MaintenanceType),
  priority: z.nativeEnum(WorkOrderPriority).optional(),
  scheduledDate: z.string().datetime(),
  estimatedDuration: z.number().positive().optional(),
  assignedTo: z.string().optional(),
  estimatedCost: z.number().optional(),
  predictionId: z.string().uuid().optional(),
});

const updateWorkOrderSchema = z.object({
  status: z.nativeEnum(WorkOrderStatus).optional(),
  priority: z.nativeEnum(WorkOrderPriority).optional(),
  scheduledDate: z.string().datetime().optional(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  actualDuration: z.number().optional(),
  actualCost: z.number().optional(),
  assignedTo: z.string().optional(),
  notes: z.string().optional(),
  partsUsed: z.record(z.any()).optional(),
});

const createSparePartSchema = z.object({
  configId: z.string().uuid(),
  partNumber: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  description: z.string().optional(),
  manufacturer: z.string().optional(),
  unitCost: z.number().optional(),
  currentStock: z.number().optional(),
  reorderLevel: z.number().optional(),
  reorderQuantity: z.number().optional(),
  leadTimeDays: z.number().optional(),
  location: z.string().optional(),
});

const updateSparePartSchema = z.object({
  name: z.string().optional(),
  currentStock: z.number().optional(),
  reorderLevel: z.number().optional(),
  reorderQuantity: z.number().optional(),
  unitCost: z.number().optional(),
  location: z.string().optional(),
});

const recordDowntimeSchema = z.object({
  configId: z.string().uuid(),
  equipmentId: z.string().uuid(),
  reason: z.string().min(1),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  isPlanned: z.boolean(),
  category: z.string().optional(),
  rootCause: z.string().optional(),
  correctiveActions: z.array(z.string()).optional(),
  impactDescription: z.string().optional(),
  productionLoss: z.number().optional(),
});

// ============ Configuration Routes ============

router.get('/config/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;

    if (!hasClientAccess(req, clientId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const config = await maintenanceService.getMaintenanceConfig(clientId);
    res.json(config);
  } catch (error) {
    console.error('Error fetching maintenance config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/config', async (req, res) => {
  try {
    const data = createConfigSchema.parse(req.body);

    if (!hasClientAccess(req, data.clientId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const config = await maintenanceService.createMaintenanceConfig(data);
    res.status(201).json(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error creating maintenance config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/config/:configId', async (req, res) => {
  try {
    const { configId } = req.params;
    const data = updateConfigSchema.parse(req.body);

    const clientId = await maintenanceService.getClientIdFromMaintenanceConfig(configId);
    if (!clientId || !hasClientAccess(req, clientId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const config = await maintenanceService.updateMaintenanceConfig(configId, data);
    res.json(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error updating maintenance config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ Equipment Routes ============

router.get('/equipment/:configId', async (req, res) => {
  try {
    const { configId } = req.params;
    const { category, status, location } = req.query;

    const clientId = await maintenanceService.getClientIdFromMaintenanceConfig(configId);
    if (!clientId || !hasClientAccess(req, clientId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const equipment = await maintenanceService.getEquipment(configId, {
      category: category as string,
      status: status as EquipmentStatus,
      location: location as string,
    });
    res.json(equipment);
  } catch (error) {
    console.error('Error fetching equipment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/equipment/detail/:equipmentId', async (req, res) => {
  try {
    const { equipmentId } = req.params;

    const clientId = await maintenanceService.getClientIdFromEquipment(equipmentId);
    if (!clientId || !hasClientAccess(req, clientId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const equipment = await maintenanceService.getEquipmentById(equipmentId);
    res.json(equipment);
  } catch (error) {
    console.error('Error fetching equipment detail:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/equipment', async (req, res) => {
  try {
    const data = createEquipmentSchema.parse(req.body);

    const clientId = await maintenanceService.getClientIdFromMaintenanceConfig(data.configId);
    if (!clientId || !hasClientAccess(req, clientId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const equipment = await maintenanceService.createEquipment({
      ...data,
      installDate: data.installDate ? new Date(data.installDate) : undefined,
      warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : undefined,
    });
    res.status(201).json(equipment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error creating equipment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/equipment/:equipmentId', async (req, res) => {
  try {
    const { equipmentId } = req.params;
    const data = updateEquipmentSchema.parse(req.body);

    const clientId = await maintenanceService.getClientIdFromEquipment(equipmentId);
    if (!clientId || !hasClientAccess(req, clientId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const equipment = await maintenanceService.updateEquipment(equipmentId, {
      ...data,
      lastMaintenanceDate: data.lastMaintenanceDate ? new Date(data.lastMaintenanceDate) : undefined,
      nextMaintenanceDate: data.nextMaintenanceDate ? new Date(data.nextMaintenanceDate) : undefined,
    });
    res.json(equipment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error updating equipment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/equipment/:equipmentId', async (req, res) => {
  try {
    const { equipmentId } = req.params;

    const clientId = await maintenanceService.getClientIdFromEquipment(equipmentId);
    if (!clientId || !hasClientAccess(req, clientId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await maintenanceService.deleteEquipment(equipmentId);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting equipment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ Sensor Routes ============

router.get('/sensors/:configId', async (req, res) => {
  try {
    const { configId } = req.params;
    const { equipmentId, sensorType, isActive } = req.query;

    const clientId = await maintenanceService.getClientIdFromMaintenanceConfig(configId);
    if (!clientId || !hasClientAccess(req, clientId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const sensors = await maintenanceService.getSensors(configId, {
      equipmentId: equipmentId as string,
      sensorType: sensorType as string,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });
    res.json(sensors);
  } catch (error) {
    console.error('Error fetching sensors:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/sensors', async (req, res) => {
  try {
    const data = createSensorSchema.parse(req.body);

    const clientId = await maintenanceService.getClientIdFromMaintenanceConfig(data.configId);
    if (!clientId || !hasClientAccess(req, clientId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const sensor = await maintenanceService.createSensor(data);
    res.status(201).json(sensor);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error creating sensor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/sensors/:sensorId', async (req, res) => {
  try {
    const { sensorId } = req.params;
    const data = updateSensorSchema.parse(req.body);

    const clientId = await maintenanceService.getClientIdFromSensor(sensorId);
    if (!clientId || !hasClientAccess(req, clientId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const sensor = await maintenanceService.updateSensor(sensorId, data);
    res.json(sensor);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error updating sensor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ Sensor Readings Routes ============

router.post('/readings', async (req, res) => {
  try {
    const data = recordReadingSchema.parse(req.body);

    const clientId = await maintenanceService.getClientIdFromSensor(data.sensorId);
    if (!clientId || !hasClientAccess(req, clientId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const reading = await maintenanceService.recordSensorReading(data);
    res.status(201).json(reading);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error recording sensor reading:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/readings/:sensorId', async (req, res) => {
  try {
    const { sensorId } = req.params;
    const { startDate, endDate, limit } = req.query;

    const clientId = await maintenanceService.getClientIdFromSensor(sensorId);
    if (!clientId || !hasClientAccess(req, clientId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const readings = await maintenanceService.getSensorReadings(sensorId, {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json(readings);
  } catch (error) {
    console.error('Error fetching sensor readings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ Anomalies Routes ============

router.get('/anomalies/:configId', async (req, res) => {
  try {
    const { configId } = req.params;
    const { sensorId, severity, isResolved } = req.query;

    const clientId = await maintenanceService.getClientIdFromMaintenanceConfig(configId);
    if (!clientId || !hasClientAccess(req, clientId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const anomalies = await maintenanceService.getAnomalies(configId, {
      sensorId: sensorId as string,
      severity: severity as string,
      isResolved: isResolved === 'true' ? true : isResolved === 'false' ? false : undefined,
    });
    res.json(anomalies);
  } catch (error) {
    console.error('Error fetching anomalies:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ Failure Predictions Routes ============

router.get('/predictions/:configId', async (req, res) => {
  try {
    const { configId } = req.params;
    const { equipmentId, failureType, isActive, minProbability } = req.query;

    const clientId = await maintenanceService.getClientIdFromMaintenanceConfig(configId);
    if (!clientId || !hasClientAccess(req, clientId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const predictions = await maintenanceService.getFailurePredictions(configId, {
      equipmentId: equipmentId as string,
      failureType: failureType as string,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      minProbability: minProbability ? parseFloat(minProbability as string) : undefined,
    });
    res.json(predictions);
  } catch (error) {
    console.error('Error fetching predictions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/predictions/:configId/generate', async (req, res) => {
  try {
    const { configId } = req.params;

    const clientId = await maintenanceService.getClientIdFromMaintenanceConfig(configId);
    if (!clientId || !hasClientAccess(req, clientId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const predictions = await maintenanceService.generateFailurePredictions(configId);
    res.json({
      generated: predictions.length,
      predictions,
    });
  } catch (error) {
    console.error('Error generating predictions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ Work Orders Routes ============

router.get('/work-orders/:configId', async (req, res) => {
  try {
    const { configId } = req.params;
    const { equipmentId, status, priority, maintenanceType, assignedTo } = req.query;

    const clientId = await maintenanceService.getClientIdFromMaintenanceConfig(configId);
    if (!clientId || !hasClientAccess(req, clientId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const workOrders = await maintenanceService.getWorkOrders(configId, {
      equipmentId: equipmentId as string,
      status: status as WorkOrderStatus,
      priority: priority as WorkOrderPriority,
      maintenanceType: maintenanceType as MaintenanceType,
      assignedTo: assignedTo as string,
    });
    res.json(workOrders);
  } catch (error) {
    console.error('Error fetching work orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/work-orders', async (req, res) => {
  try {
    const data = createWorkOrderSchema.parse(req.body);

    const clientId = await maintenanceService.getClientIdFromMaintenanceConfig(data.configId);
    if (!clientId || !hasClientAccess(req, clientId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const workOrder = await maintenanceService.createWorkOrder({
      ...data,
      scheduledDate: new Date(data.scheduledDate),
    });
    res.status(201).json(workOrder);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error creating work order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/work-orders/:workOrderId', async (req, res) => {
  try {
    const { workOrderId } = req.params;
    const data = updateWorkOrderSchema.parse(req.body);

    const clientId = await maintenanceService.getClientIdFromWorkOrder(workOrderId);
    if (!clientId || !hasClientAccess(req, clientId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const workOrder = await maintenanceService.updateWorkOrder(workOrderId, {
      ...data,
      scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : undefined,
      startedAt: data.startedAt ? new Date(data.startedAt) : undefined,
      completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
    });
    res.json(workOrder);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error updating work order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ Spare Parts Routes ============

router.get('/spare-parts/:configId', async (req, res) => {
  try {
    const { configId } = req.params;
    const { category, lowStock } = req.query;

    const clientId = await maintenanceService.getClientIdFromMaintenanceConfig(configId);
    if (!clientId || !hasClientAccess(req, clientId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const parts = await maintenanceService.getSpareParts(configId, {
      category: category as string,
      lowStock: lowStock === 'true',
    });
    res.json(parts);
  } catch (error) {
    console.error('Error fetching spare parts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/spare-parts', async (req, res) => {
  try {
    const data = createSparePartSchema.parse(req.body);

    const clientId = await maintenanceService.getClientIdFromMaintenanceConfig(data.configId);
    if (!clientId || !hasClientAccess(req, clientId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const part = await maintenanceService.createSparePart(data);
    res.status(201).json(part);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error creating spare part:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/spare-parts/:partId', async (req, res) => {
  try {
    const { partId } = req.params;
    const data = updateSparePartSchema.parse(req.body);

    // Note: For simplicity, we're using the configId from the part itself
    const part = await maintenanceService.updateSparePart(partId, data);
    res.json(part);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error updating spare part:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ Downtime Events Routes ============

router.get('/downtime/:configId', async (req, res) => {
  try {
    const { configId } = req.params;
    const { equipmentId, isPlanned, startDate, endDate } = req.query;

    const clientId = await maintenanceService.getClientIdFromMaintenanceConfig(configId);
    if (!clientId || !hasClientAccess(req, clientId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const events = await maintenanceService.getDowntimeEvents(configId, {
      equipmentId: equipmentId as string,
      isPlanned: isPlanned === 'true' ? true : isPlanned === 'false' ? false : undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    });
    res.json(events);
  } catch (error) {
    console.error('Error fetching downtime events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/downtime', async (req, res) => {
  try {
    const data = recordDowntimeSchema.parse(req.body);

    const clientId = await maintenanceService.getClientIdFromMaintenanceConfig(data.configId);
    if (!clientId || !hasClientAccess(req, clientId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const event = await maintenanceService.recordDowntimeEvent({
      ...data,
      startTime: new Date(data.startTime),
      endTime: data.endTime ? new Date(data.endTime) : undefined,
    });
    res.status(201).json(event);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error recording downtime event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ Analytics Routes ============

router.get('/analytics/:configId', async (req, res) => {
  try {
    const { configId } = req.params;
    const { startDate, endDate } = req.query;

    const clientId = await maintenanceService.getClientIdFromMaintenanceConfig(configId);
    if (!clientId || !hasClientAccess(req, clientId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const analytics = await maintenanceService.getMaintenanceAnalytics(configId, {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    });
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/analytics/:configId/record', async (req, res) => {
  try {
    const { configId } = req.params;

    const clientId = await maintenanceService.getClientIdFromMaintenanceConfig(configId);
    if (!clientId || !hasClientAccess(req, clientId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const analytics = await maintenanceService.recordDailyAnalytics(configId);
    res.json(analytics);
  } catch (error) {
    console.error('Error recording analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
