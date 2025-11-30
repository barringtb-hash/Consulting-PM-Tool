import {
  EquipmentStatus,
  MaintenanceType,
  WorkOrderStatus,
  WorkOrderPriority,
  AlertSeverity,
  FailurePrediction,
  Prisma,
} from '@prisma/client';
import { prisma } from '../../prisma/client';

// ============ Internal Types ============

interface EquipmentWithSensors {
  id: number;
  status: EquipmentStatus;
  lastMaintenanceDate: Date | null;
  nextMaintenanceDate: Date | null;
  installationDate: Date | null;
  criticality: string | null;
  sensors: SensorWithData[];
  downtimeEvents: DowntimeEventData[];
}

interface SensorWithData {
  name: string;
  readings: SensorReadingData[];
  anomalies: AnomalyData[];
}

interface SensorReadingData {
  value: number;
}

interface AnomalyData {
  id: number;
}

interface DowntimeEventData {
  startTime: Date;
}

// ============ Configuration Management ============

export async function getMaintenanceConfig(clientId: number) {
  return prisma.predictiveMaintenanceConfig.findUnique({
    where: { clientId },
    include: {
      equipment: {
        take: 10,
        orderBy: { createdAt: 'desc' },
      },
      _count: {
        select: {
          equipment: true,
          sensors: true,
          workOrders: true,
          predictions: true,
        },
      },
    },
  });
}

export async function createMaintenanceConfig(data: {
  clientId: number;
  facilityName?: string;
  timezone?: string;
  predictionHorizonDays?: number;
  alertThreshold?: number;
  modelUpdateFrequency?: string;
  sensorDataRetentionDays?: number;
  anomalyDetectionEnabled?: boolean;
  realTimeMonitoring?: boolean;
}) {
  return prisma.predictiveMaintenanceConfig.create({
    data: {
      clientId: data.clientId,
      facilityName: data.facilityName,
      timezone: data.timezone ?? 'America/New_York',
      predictionHorizonDays: data.predictionHorizonDays ?? 30,
      alertThreshold: data.alertThreshold ?? 0.7,
      modelUpdateFrequency: data.modelUpdateFrequency ?? 'weekly',
      sensorDataRetentionDays: data.sensorDataRetentionDays ?? 90,
      anomalyDetectionEnabled: data.anomalyDetectionEnabled ?? true,
      realTimeMonitoring: data.realTimeMonitoring ?? true,
    },
  });
}

export async function updateMaintenanceConfig(
  configId: number,
  data: {
    facilityName?: string;
    timezone?: string;
    predictionHorizonDays?: number;
    alertThreshold?: number;
    modelUpdateFrequency?: string;
    sensorDataRetentionDays?: number;
    anomalyDetectionEnabled?: boolean;
    realTimeMonitoring?: boolean;
  },
) {
  return prisma.predictiveMaintenanceConfig.update({
    where: { id: configId },
    data,
  });
}

// ============ Equipment Management ============

export async function getEquipment(
  configId: number,
  filters?: {
    category?: string;
    status?: EquipmentStatus;
    location?: string;
  },
) {
  return prisma.equipment.findMany({
    where: {
      configId,
      ...(filters?.category && { category: filters.category }),
      ...(filters?.status && { status: filters.status }),
      ...(filters?.location && {
        location: { contains: filters.location, mode: 'insensitive' as const },
      }),
    },
    include: {
      sensors: true,
      _count: {
        select: {
          workOrders: true,
          predictions: true,
          downtimeEvents: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });
}

export async function getEquipmentById(equipmentId: number) {
  return prisma.equipment.findUnique({
    where: { id: equipmentId },
    include: {
      sensors: true,
      workOrders: {
        take: 10,
        orderBy: { createdAt: 'desc' },
      },
      predictions: {
        where: { isActive: true },
        orderBy: { predictedDate: 'asc' },
      },
      downtimeEvents: {
        take: 10,
        orderBy: { startTime: 'desc' },
      },
    },
  });
}

export async function createEquipment(data: {
  configId: number;
  assetTag: string;
  name: string;
  description?: string;
  category?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  location?: string;
  department?: string;
  criticality?: string;
  installationDate?: Date;
  warrantyExpiry?: Date;
  expectedLifeYears?: number;
  maintenanceSchedule?: Record<string, unknown>;
}) {
  return prisma.equipment.create({
    data: {
      configId: data.configId,
      assetTag: data.assetTag,
      name: data.name,
      description: data.description,
      category: data.category,
      manufacturer: data.manufacturer,
      model: data.model,
      serialNumber: data.serialNumber,
      location: data.location,
      department: data.department,
      criticality: data.criticality ?? 'medium',
      installationDate: data.installationDate,
      warrantyExpiry: data.warrantyExpiry,
      expectedLifeYears: data.expectedLifeYears,
      maintenanceSchedule: data.maintenanceSchedule as Prisma.InputJsonValue,
      status: EquipmentStatus.OPERATIONAL,
    },
  });
}

export async function updateEquipment(
  equipmentId: number,
  data: {
    name?: string;
    description?: string;
    category?: string;
    status?: EquipmentStatus;
    location?: string;
    department?: string;
    criticality?: string;
    healthScore?: number;
    maintenanceSchedule?: Record<string, unknown>;
    lastMaintenanceDate?: Date;
    nextMaintenanceDate?: Date;
  },
) {
  const updateData: Prisma.EquipmentUpdateInput = {
    ...data,
    maintenanceSchedule: data.maintenanceSchedule as Prisma.InputJsonValue,
  };
  return prisma.equipment.update({
    where: { id: equipmentId },
    data: updateData,
  });
}

export async function deleteEquipment(equipmentId: number) {
  return prisma.equipment.delete({
    where: { id: equipmentId },
  });
}

// ============ Sensor Management ============

export async function getSensors(
  configId: number,
  filters?: {
    equipmentId?: number;
    sensorType?: string;
    isOnline?: boolean;
  },
) {
  return prisma.sensor.findMany({
    where: {
      configId,
      ...(filters?.equipmentId && { equipmentId: filters.equipmentId }),
      ...(filters?.sensorType && { sensorType: filters.sensorType }),
      ...(filters?.isOnline !== undefined && { isOnline: filters.isOnline }),
    },
    include: {
      equipment: true,
    },
    orderBy: { name: 'asc' },
  });
}

export async function createSensor(data: {
  configId: number;
  equipmentId: number;
  sensorId: string;
  name: string;
  sensorType: string;
  unit?: string;
  minThreshold?: number;
  maxThreshold?: number;
  normalRangeMin?: number;
  normalRangeMax?: number;
  alertEnabled?: boolean;
  alertThreshold?: number;
}) {
  return prisma.sensor.create({
    data: {
      configId: data.configId,
      equipmentId: data.equipmentId,
      sensorId: data.sensorId,
      name: data.name,
      sensorType: data.sensorType,
      unit: data.unit,
      minThreshold: data.minThreshold,
      maxThreshold: data.maxThreshold,
      normalRangeMin: data.normalRangeMin,
      normalRangeMax: data.normalRangeMax,
      alertEnabled: data.alertEnabled ?? true,
      alertThreshold: data.alertThreshold,
      isOnline: true,
    },
  });
}

export async function updateSensor(
  sensorId: number,
  data: {
    name?: string;
    minThreshold?: number;
    maxThreshold?: number;
    normalRangeMin?: number;
    normalRangeMax?: number;
    alertEnabled?: boolean;
    alertThreshold?: number;
    isOnline?: boolean;
    lastReading?: number;
    lastReadingAt?: Date;
  },
) {
  return prisma.sensor.update({
    where: { id: sensorId },
    data,
  });
}

// ============ Sensor Readings ============

export async function recordSensorReading(data: {
  sensorId: number;
  value: number;
  quality?: string;
  timestamp?: Date;
}) {
  const sensor = await prisma.sensor.findUnique({
    where: { id: data.sensorId },
  });

  if (!sensor) {
    throw new Error('Sensor not found');
  }

  // Check for anomaly
  let isAnomaly = false;
  let anomalyType: string | undefined;

  if (sensor.minThreshold !== null && data.value < sensor.minThreshold) {
    isAnomaly = true;
    anomalyType = 'below_threshold';
  } else if (sensor.maxThreshold !== null && data.value > sensor.maxThreshold) {
    isAnomaly = true;
    anomalyType = 'above_threshold';
  }

  // Record the reading
  const reading = await prisma.sensorReading.create({
    data: {
      sensorId: data.sensorId,
      value: data.value,
      quality: data.quality ?? 'good',
      timestamp: data.timestamp ?? new Date(),
    },
  });

  // Update sensor's last reading
  await prisma.sensor.update({
    where: { id: data.sensorId },
    data: {
      lastReading: data.value,
      lastReadingAt: new Date(),
    },
  });

  // Create anomaly record if detected
  if (isAnomaly && anomalyType) {
    const expectedValue =
      sensor.minThreshold !== null && data.value < sensor.minThreshold
        ? sensor.minThreshold
        : sensor.maxThreshold;

    await prisma.sensorAnomaly.create({
      data: {
        sensorId: data.sensorId,
        anomalyType,
        actualValue: data.value,
        expectedValue,
        severity: calculateAnomalySeverity(
          data.value,
          sensor.minThreshold,
          sensor.maxThreshold,
        ),
        detectedAt: new Date(),
        isResolved: false,
      },
    });
  }

  return reading;
}

function calculateAnomalySeverity(
  value: number,
  min: number | null,
  max: number | null,
): AlertSeverity {
  if (min !== null && value < min) {
    const deviation = (min - value) / min;
    if (deviation > 0.5) return AlertSeverity.CRITICAL;
    if (deviation > 0.25) return AlertSeverity.HIGH;
    if (deviation > 0.1) return AlertSeverity.MEDIUM;
    return AlertSeverity.LOW;
  }
  if (max !== null && value > max) {
    const deviation = (value - max) / max;
    if (deviation > 0.5) return AlertSeverity.CRITICAL;
    if (deviation > 0.25) return AlertSeverity.HIGH;
    if (deviation > 0.1) return AlertSeverity.MEDIUM;
    return AlertSeverity.LOW;
  }
  return AlertSeverity.LOW;
}

export async function getSensorReadings(
  sensorId: number,
  filters?: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  },
) {
  return prisma.sensorReading.findMany({
    where: {
      sensorId,
      ...(filters?.startDate &&
        filters?.endDate && {
          timestamp: {
            gte: filters.startDate,
            lte: filters.endDate,
          },
        }),
    },
    orderBy: { timestamp: 'desc' },
    take: filters?.limit ?? 100,
  });
}

export async function getAnomalies(
  configId: number,
  filters?: {
    sensorId?: number;
    severity?: AlertSeverity;
    isResolved?: boolean;
  },
) {
  return prisma.sensorAnomaly.findMany({
    where: {
      sensor: { configId },
      ...(filters?.sensorId && { sensorId: filters.sensorId }),
      ...(filters?.severity && { severity: filters.severity }),
      ...(filters?.isResolved !== undefined && {
        isResolved: filters.isResolved,
      }),
    },
    include: {
      sensor: {
        include: { equipment: true },
      },
    },
    orderBy: { detectedAt: 'desc' },
  });
}

// ============ Failure Predictions ============

export async function getFailurePredictions(
  configId: number,
  filters?: {
    equipmentId?: number;
    failureType?: string;
    isActive?: boolean;
    minProbability?: number;
  },
) {
  return prisma.failurePrediction.findMany({
    where: {
      configId,
      ...(filters?.equipmentId && { equipmentId: filters.equipmentId }),
      ...(filters?.failureType && { failureType: filters.failureType }),
      ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
      ...(filters?.minProbability && {
        probability: { gte: filters.minProbability },
      }),
    },
    include: {
      equipment: true,
    },
    orderBy: { probability: 'desc' },
  });
}

export async function generateFailurePredictions(configId: number) {
  // Get all equipment with sensor data (exclude OFFLINE as a reasonable filter)
  const equipment = await prisma.equipment.findMany({
    where: { configId, isActive: true },
    include: {
      sensors: {
        include: {
          readings: {
            take: 100,
            orderBy: { timestamp: 'desc' },
          },
          anomalies: {
            where: { isResolved: false },
          },
        },
      },
      downtimeEvents: {
        take: 10,
        orderBy: { startTime: 'desc' },
      },
    },
  });

  const predictions: FailurePrediction[] = [];

  for (const equip of equipment) {
    // Simple ML-inspired prediction logic
    const equipWithSensors: EquipmentWithSensors = {
      id: equip.id,
      status: equip.status,
      lastMaintenanceDate: equip.lastMaintenanceDate,
      nextMaintenanceDate: equip.nextMaintenanceDate,
      installationDate: equip.installationDate,
      criticality: equip.criticality,
      sensors: equip.sensors.map((s) => ({
        name: s.name,
        readings: s.readings.map((r) => ({ value: r.value })),
        anomalies: s.anomalies.map((a) => ({ id: a.id })),
      })),
      downtimeEvents: equip.downtimeEvents.map((d) => ({
        startTime: d.startTime,
      })),
    };
    const prediction = predictEquipmentFailure(equipWithSensors);

    if (prediction.probability > 0.3) {
      // Deactivate old predictions for this equipment
      await prisma.failurePrediction.updateMany({
        where: { equipmentId: equip.id, isActive: true },
        data: { isActive: false },
      });

      // Create new prediction
      const newPrediction = await prisma.failurePrediction.create({
        data: {
          configId,
          equipmentId: equip.id,
          failureType: prediction.failureType,
          probability: prediction.probability,
          predictedDate: prediction.predictedDate,
          confidenceLevel: prediction.confidenceLevel,
          features: prediction.factors as Prisma.InputJsonValue,
          recommendedAction: prediction.recommendations.join('; '),
          impactEstimate: prediction.impact as Prisma.InputJsonValue,
          isActive: true,
        },
        include: { equipment: true },
      });
      predictions.push(newPrediction);
    }
  }

  return predictions;
}

function predictEquipmentFailure(equipment: EquipmentWithSensors): {
  failureType: string;
  probability: number;
  predictedDate: Date;
  confidenceLevel: number;
  factors: string[];
  recommendations: string[];
  impact: Record<string, unknown>;
} {
  const factors: string[] = [];
  let riskScore = 0;

  // Factor 1: Recent anomalies
  const totalAnomalies = equipment.sensors.reduce(
    (sum: number, s: SensorWithData) => sum + s.anomalies.length,
    0,
  );
  if (totalAnomalies > 5) {
    riskScore += 0.3;
    factors.push(`High anomaly count: ${totalAnomalies} unresolved anomalies`);
  } else if (totalAnomalies > 2) {
    riskScore += 0.15;
    factors.push(
      `Elevated anomaly count: ${totalAnomalies} unresolved anomalies`,
    );
  }

  // Factor 2: Equipment age
  if (equipment.installationDate) {
    const ageYears =
      (Date.now() - new Date(equipment.installationDate).getTime()) /
      (365.25 * 24 * 60 * 60 * 1000);
    if (ageYears > 10) {
      riskScore += 0.25;
      factors.push(`Aging equipment: ${Math.round(ageYears)} years old`);
    } else if (ageYears > 5) {
      riskScore += 0.1;
      factors.push(`Maturing equipment: ${Math.round(ageYears)} years old`);
    }
  }

  // Factor 3: Recent downtime
  if (equipment.downtimeEvents.length > 3) {
    riskScore += 0.2;
    factors.push(
      `Frequent downtime: ${equipment.downtimeEvents.length} recent events`,
    );
  }

  // Factor 4: Maintenance overdue
  if (
    equipment.nextMaintenanceDate &&
    new Date(equipment.nextMaintenanceDate) < new Date()
  ) {
    riskScore += 0.15;
    factors.push('Maintenance overdue');
  }

  // Factor 5: Criticality
  if (
    equipment.criticality === 'high' ||
    equipment.criticality === 'critical'
  ) {
    riskScore += 0.05;
  }

  // Factor 6: Sensor reading trends (simplified)
  for (const sensor of equipment.sensors) {
    if (sensor.readings.length >= 10) {
      const recentReadings = sensor.readings.slice(0, 5);
      const olderReadings = sensor.readings.slice(5, 10);

      const recentAvg =
        recentReadings.reduce(
          (s: number, r: SensorReadingData) => s + r.value,
          0,
        ) / recentReadings.length;
      const olderAvg =
        olderReadings.reduce(
          (s: number, r: SensorReadingData) => s + r.value,
          0,
        ) / olderReadings.length;

      const changePercent = Math.abs((recentAvg - olderAvg) / olderAvg);
      if (changePercent > 0.2) {
        riskScore += 0.1;
        factors.push(
          `Sensor ${sensor.name} showing ${Math.round(changePercent * 100)}% change`,
        );
      }
    }
  }

  // Cap probability at 0.95
  const probability = Math.min(riskScore, 0.95);

  // Predict failure date based on probability
  const daysUntilFailure = Math.round((1 - probability) * 60) + 1;
  const predictedDate = new Date(
    Date.now() + daysUntilFailure * 24 * 60 * 60 * 1000,
  );

  // Determine failure type
  let failureType = 'general_wear';
  if (totalAnomalies > 3) {
    failureType = 'sensor_indicated';
  } else if (equipment.downtimeEvents.length > 3) {
    failureType = 'recurring_issue';
  }

  // Generate recommendations
  const recommendations: string[] = [];
  if (probability > 0.7) {
    recommendations.push('Schedule immediate inspection');
    recommendations.push('Prepare replacement parts');
  } else if (probability > 0.5) {
    recommendations.push('Schedule preventive maintenance within 2 weeks');
    recommendations.push('Monitor sensor readings closely');
  } else {
    recommendations.push('Continue regular monitoring');
    recommendations.push('Plan maintenance in next cycle');
  }

  return {
    failureType,
    probability,
    predictedDate,
    confidenceLevel: Math.min(0.85, 0.5 + equipment.sensors.length * 0.05),
    factors,
    recommendations,
    impact: {
      estimatedDowntimeHours: Math.round(probability * 48),
      estimatedRepairCost: Math.round(probability * 5000),
      productionImpact:
        probability > 0.7 ? 'high' : probability > 0.4 ? 'medium' : 'low',
    },
  };
}

// ============ Work Orders ============

export async function getWorkOrders(
  configId: number,
  filters?: {
    equipmentId?: number;
    status?: WorkOrderStatus;
    priority?: WorkOrderPriority;
    type?: MaintenanceType;
    assignedTo?: string;
  },
) {
  return prisma.maintenanceWorkOrder.findMany({
    where: {
      configId,
      ...(filters?.equipmentId && { equipmentId: filters.equipmentId }),
      ...(filters?.status && { status: filters.status }),
      ...(filters?.priority && { priority: filters.priority }),
      ...(filters?.type && { type: filters.type }),
      ...(filters?.assignedTo && { assignedTo: filters.assignedTo }),
    },
    include: {
      equipment: true,
    },
    orderBy: [{ priority: 'desc' }, { scheduledDate: 'asc' }],
  });
}

export async function createWorkOrder(data: {
  configId: number;
  equipmentId: number;
  workOrderNumber: string;
  title: string;
  description?: string;
  type: MaintenanceType;
  priority?: WorkOrderPriority;
  scheduledDate?: Date;
  dueDate?: Date;
  assignedTo?: string;
  assignedTeam?: string;
}) {
  return prisma.maintenanceWorkOrder.create({
    data: {
      configId: data.configId,
      equipmentId: data.equipmentId,
      workOrderNumber: data.workOrderNumber,
      title: data.title,
      description: data.description,
      type: data.type,
      priority: data.priority ?? WorkOrderPriority.MEDIUM,
      status: WorkOrderStatus.DRAFT,
      scheduledDate: data.scheduledDate,
      dueDate: data.dueDate,
      assignedTo: data.assignedTo,
      assignedTeam: data.assignedTeam,
    },
    include: { equipment: true },
  });
}

export async function updateWorkOrder(
  workOrderId: number,
  data: {
    status?: WorkOrderStatus;
    priority?: WorkOrderPriority;
    scheduledDate?: Date;
    dueDate?: Date;
    startedAt?: Date;
    completedAt?: Date;
    assignedTo?: string;
    assignedTeam?: string;
    laborHours?: number;
    notes?: string;
    findings?: string;
    partsUsed?: Record<string, unknown>;
  },
) {
  const updateData: Prisma.MaintenanceWorkOrderUpdateInput = {
    ...data,
    partsUsed: data.partsUsed as Prisma.InputJsonValue,
  };
  return prisma.maintenanceWorkOrder.update({
    where: { id: workOrderId },
    data: updateData,
    include: {
      equipment: true,
    },
  });
}

// ============ Spare Parts ============

export async function getSpareParts(
  configId: number,
  filters?: {
    category?: string;
    lowStock?: boolean;
  },
) {
  const parts = await prisma.sparePart.findMany({
    where: {
      configId,
      ...(filters?.category && { category: filters.category }),
    },
    orderBy: { name: 'asc' },
  });

  if (filters?.lowStock) {
    return parts.filter(
      (p) => p.reorderPoint !== null && p.quantityOnHand <= p.reorderPoint,
    );
  }

  return parts;
}

export async function createSparePart(data: {
  configId: number;
  partNumber: string;
  name: string;
  description?: string;
  category?: string;
  quantityOnHand?: number;
  reorderPoint?: number;
  reorderQuantity?: number;
  location?: string;
  unitCost?: number;
  supplier?: string;
  leadTimeDays?: number;
  compatibleEquipment?: string[];
}) {
  return prisma.sparePart.create({
    data: {
      configId: data.configId,
      partNumber: data.partNumber,
      name: data.name,
      description: data.description,
      category: data.category,
      quantityOnHand: data.quantityOnHand ?? 0,
      reorderPoint: data.reorderPoint ?? 5,
      reorderQuantity: data.reorderQuantity ?? 10,
      location: data.location,
      unitCost: data.unitCost,
      supplier: data.supplier,
      leadTimeDays: data.leadTimeDays ?? 7,
      compatibleEquipment: data.compatibleEquipment ?? [],
    },
  });
}

export async function updateSparePart(
  partId: number,
  data: {
    name?: string;
    description?: string;
    category?: string;
    quantityOnHand?: number;
    reorderPoint?: number;
    reorderQuantity?: number;
    location?: string;
    unitCost?: number;
    supplier?: string;
    leadTimeDays?: number;
  },
) {
  return prisma.sparePart.update({
    where: { id: partId },
    data,
  });
}

// ============ Downtime Events ============

export async function recordDowntimeEvent(data: {
  equipmentId: number;
  reason: string;
  description?: string;
  startTime: Date;
  endTime?: Date;
  durationMinutes?: number;
  rootCause?: string;
  wasPlanned?: boolean;
  wasPredicted?: boolean;
  productionLoss?: number;
}) {
  const event = await prisma.downtimeEvent.create({
    data: {
      equipmentId: data.equipmentId,
      reason: data.reason,
      description: data.description,
      startTime: data.startTime,
      endTime: data.endTime,
      durationMinutes: data.durationMinutes,
      rootCause: data.rootCause,
      wasPlanned: data.wasPlanned ?? false,
      wasPredicted: data.wasPredicted ?? false,
      productionLoss: data.productionLoss,
    },
  });

  // Update equipment status
  await prisma.equipment.update({
    where: { id: data.equipmentId },
    data: {
      status: data.endTime
        ? EquipmentStatus.OPERATIONAL
        : EquipmentStatus.OFFLINE,
    },
  });

  return event;
}

export async function getDowntimeEvents(
  configId: number,
  filters?: {
    equipmentId?: string;
    wasPlanned?: boolean;
    startDate?: Date;
    endDate?: Date;
  },
) {
  return prisma.downtimeEvent.findMany({
    where: {
      equipment: { configId },
      ...(filters?.equipmentId && {
        equipmentId: parseInt(filters.equipmentId, 10),
      }),
      ...(filters?.wasPlanned !== undefined && {
        wasPlanned: filters.wasPlanned,
      }),
      ...(filters?.startDate &&
        filters?.endDate && {
          startTime: {
            gte: filters.startDate,
            lte: filters.endDate,
          },
        }),
    },
    include: {
      equipment: true,
    },
    orderBy: { startTime: 'desc' },
  });
}

// ============ Analytics ============

export async function getMaintenanceAnalytics(
  configId: number,
  filters?: {
    startDate?: Date;
    endDate?: Date;
  },
) {
  const startDate =
    filters?.startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const endDate = filters?.endDate || new Date();

  const [equipment, workOrders, downtimeEvents, predictions, analytics] =
    await Promise.all([
      prisma.equipment.findMany({
        where: { configId },
      }),
      prisma.maintenanceWorkOrder.findMany({
        where: {
          configId,
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      prisma.downtimeEvent.findMany({
        where: {
          equipment: { configId },
          startTime: { gte: startDate, lte: endDate },
        },
      }),
      prisma.failurePrediction.findMany({
        where: { configId, isActive: true },
      }),
      prisma.predictiveMaintenanceAnalytics.findMany({
        where: {
          configId,
          date: { gte: startDate, lte: endDate },
        },
        orderBy: { date: 'asc' },
      }),
    ]);

  // Calculate MTBF (Mean Time Between Failures)
  const totalOperationalHours =
    equipment.length *
    ((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60));
  const failureCount = downtimeEvents.filter(
    (d) => !d.wasPlanned,
  ).length;
  const mtbf =
    failureCount > 0
      ? totalOperationalHours / failureCount
      : totalOperationalHours;

  // Calculate MTTR (Mean Time To Repair)
  const completedDowntimes = downtimeEvents.filter(
    (d) => d.endTime,
  );
  const totalRepairTime = completedDowntimes.reduce(
    (sum: number, d) => {
      return (
        sum +
        (new Date(d.endTime!).getTime() - new Date(d.startTime).getTime()) /
          (1000 * 60 * 60)
      );
    },
    0,
  );
  const mttr =
    completedDowntimes.length > 0
      ? totalRepairTime / completedDowntimes.length
      : 0;

  // Calculate availability
  const totalDowntimeHours = downtimeEvents.reduce(
    (sum: number, d) => {
      const end = d.endTime ? new Date(d.endTime) : new Date();
      return (
        sum +
        (end.getTime() - new Date(d.startTime).getTime()) / (1000 * 60 * 60)
      );
    },
    0,
  );
  const availability =
    totalOperationalHours > 0
      ? ((totalOperationalHours - totalDowntimeHours) / totalOperationalHours) *
        100
      : 100;

  // Calculate maintenance costs
  const totalMaintenanceCost = workOrders
    .filter((wo) => wo.status === WorkOrderStatus.COMPLETED)
    .reduce(
      (sum: number, wo) => sum + Number(wo.totalCost || 0),
      0,
    );

  return {
    historicalData: analytics,
    currentMetrics: {
      totalEquipment: equipment.length,
      operationalEquipment: equipment.filter(
        (e) => e.status === EquipmentStatus.OPERATIONAL,
      ).length,
      mtbf: Math.round(mtbf * 100) / 100,
      mttr: Math.round(mttr * 100) / 100,
      availability: Math.round(availability * 100) / 100,
      scheduledWorkOrders: workOrders.filter(
        (wo) => wo.status === WorkOrderStatus.SCHEDULED,
      ).length,
      inProgressWorkOrders: workOrders.filter(
        (wo) => wo.status === WorkOrderStatus.IN_PROGRESS,
      ).length,
      completedWorkOrders: workOrders.filter(
        (wo) => wo.status === WorkOrderStatus.COMPLETED,
      ).length,
      activeFailurePredictions: predictions.length,
      highRiskPredictions: predictions.filter((p) => p.probability >= 0.7)
        .length,
      totalDowntimeHours: Math.round(totalDowntimeHours * 100) / 100,
      unplannedDowntimeHours:
        Math.round(
          downtimeEvents
            .filter((d) => !d.wasPlanned)
            .reduce((sum: number, d) => {
              const end = d.endTime ? new Date(d.endTime) : new Date();
              return (
                sum +
                (end.getTime() - new Date(d.startTime).getTime()) /
                  (1000 * 60 * 60)
              );
            }, 0) * 100,
        ) / 100,
      totalMaintenanceCost,
    },
    equipmentByStatus: {
      operational: equipment.filter(
        (e) => e.status === EquipmentStatus.OPERATIONAL,
      ).length,
      maintenance: equipment.filter(
        (e) => e.status === EquipmentStatus.MAINTENANCE,
      ).length,
      offline: equipment.filter((e) => e.status === EquipmentStatus.OFFLINE)
        .length,
      critical: equipment.filter((e) => e.status === EquipmentStatus.CRITICAL)
        .length,
    },
    workOrdersByType: {
      preventive: workOrders.filter(
        (wo) => wo.type === MaintenanceType.PREVENTIVE,
      ).length,
      corrective: workOrders.filter(
        (wo) => wo.type === MaintenanceType.CORRECTIVE,
      ).length,
      predictive: workOrders.filter(
        (wo) => wo.type === MaintenanceType.PREDICTIVE,
      ).length,
      emergency: workOrders.filter((wo) => wo.type === MaintenanceType.EMERGENCY)
        .length,
    },
  };
}

export async function recordDailyAnalytics(configId: number) {
  const [equipment, workOrders, predictions] = await Promise.all([
    prisma.equipment.findMany({ where: { configId } }),
    prisma.maintenanceWorkOrder.findMany({ where: { configId } }),
    prisma.failurePrediction.findMany({
      where: { configId, isActive: true },
    }),
  ]);

  const totalEquipment = equipment.length;
  const operationalEquipment = equipment.filter(
    (e) => e.status === EquipmentStatus.OPERATIONAL,
  ).length;
  const availability =
    totalEquipment > 0 ? (operationalEquipment / totalEquipment) * 100 : 100;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const equipmentInMaintenance = equipment.filter(
    (e) => e.status === EquipmentStatus.MAINTENANCE,
  ).length;
  const criticalEquipment = equipment.filter(
    (e) => e.status === EquipmentStatus.CRITICAL,
  ).length;
  const workOrdersCreated = workOrders.filter(
    (wo) => wo.status === WorkOrderStatus.DRAFT,
  ).length;
  const workOrdersCompleted = workOrders.filter(
    (wo) => wo.status === WorkOrderStatus.COMPLETED,
  ).length;
  const highRiskPredictions = predictions.filter(
    (p) => p.probability >= 0.7,
  ).length;

  return prisma.predictiveMaintenanceAnalytics.upsert({
    where: {
      configId_date: {
        configId,
        date: today,
      },
    },
    update: {
      totalEquipment,
      operationalEquipment,
      equipmentInMaintenance,
      criticalEquipment,
      availability,
      predictionsGenerated: predictions.length,
      highRiskPredictions,
      workOrdersCreated,
      workOrdersCompleted,
    },
    create: {
      configId,
      date: today,
      totalEquipment,
      operationalEquipment,
      equipmentInMaintenance,
      criticalEquipment,
      availability,
      predictionsGenerated: predictions.length,
      highRiskPredictions,
      workOrdersCreated,
      workOrdersCompleted,
    },
  });
}

// ============ Authorization Helpers ============

export async function getClientIdFromMaintenanceConfig(
  configId: number,
): Promise<number | null> {
  const config = await prisma.predictiveMaintenanceConfig.findUnique({
    where: { id: configId },
    select: { clientId: true },
  });
  return config?.clientId ?? null;
}

export async function getClientIdFromEquipment(
  equipmentId: number,
): Promise<number | null> {
  const equipment = await prisma.equipment.findUnique({
    where: { id: equipmentId },
    include: { config: { select: { clientId: true } } },
  });
  return equipment?.config?.clientId ?? null;
}

export async function getClientIdFromSensor(
  sensorId: number,
): Promise<number | null> {
  const sensor = await prisma.sensor.findUnique({
    where: { id: sensorId },
    include: { config: { select: { clientId: true } } },
  });
  return sensor?.config?.clientId ?? null;
}

export async function getClientIdFromWorkOrder(
  workOrderId: number,
): Promise<number | null> {
  const workOrder = await prisma.maintenanceWorkOrder.findUnique({
    where: { id: workOrderId },
    include: { config: { select: { clientId: true } } },
  });
  return workOrder?.config?.clientId ?? null;
}
