import {
  EquipmentStatus,
  MaintenanceType,
  WorkOrderStatus,
  WorkOrderPriority,
  FailurePrediction,
} from '@prisma/client';
import { prisma } from '../../prisma/client';

// ============ Internal Types ============

interface EquipmentWithSensors {
  id: number;
  status: EquipmentStatus;
  lastMaintenanceDate: Date | null;
  maintenanceInterval: number | null;
  sensors: SensorWithData[];
  downtimeEvents: DowntimeEventData[];
}

interface SensorWithData {
  name: string;
  readings: SensorReading[];
  anomalies: AnomalyData[];
}

interface SensorReading {
  value: number;
}

interface AnomalyData {
  length: number;
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
          failurePredictions: true,
        },
      },
    },
  });
}

export async function createMaintenanceConfig(data: {
  clientId: number;
  facilityName: string;
  facilityType: string;
  equipmentCategories: string[];
  maintenanceSchedule?: Record<string, unknown>;
  alertThresholds?: Record<string, unknown>;
  predictionHorizonDays?: number;
  dataRetentionDays?: number;
}) {
  return prisma.predictiveMaintenanceConfig.create({
    data: {
      clientId: data.clientId,
      facilityName: data.facilityName,
      facilityType: data.facilityType,
      equipmentCategories: data.equipmentCategories,
      maintenanceSchedule: data.maintenanceSchedule ?? {},
      alertThresholds: data.alertThresholds ?? {},
      predictionHorizonDays: data.predictionHorizonDays ?? 30,
      dataRetentionDays: data.dataRetentionDays ?? 365,
    },
  });
}

export async function updateMaintenanceConfig(
  configId: number,
  data: {
    facilityName?: string;
    facilityType?: string;
    equipmentCategories?: string[];
    maintenanceSchedule?: Record<string, unknown>;
    alertThresholds?: Record<string, unknown>;
    predictionHorizonDays?: number;
    dataRetentionDays?: number;
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
        location: { contains: filters.location, mode: 'insensitive' },
      }),
    },
    include: {
      sensors: true,
      _count: {
        select: {
          workOrders: true,
          failurePredictions: true,
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
      failurePredictions: {
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
  assetId: string;
  name: string;
  category: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  location?: string;
  installDate?: Date;
  warrantyExpiry?: Date;
  specifications?: Record<string, unknown>;
  maintenanceInterval?: number;
  criticality?: string;
}) {
  return prisma.equipment.create({
    data: {
      configId: data.configId,
      assetId: data.assetId,
      name: data.name,
      category: data.category,
      manufacturer: data.manufacturer,
      model: data.model,
      serialNumber: data.serialNumber,
      location: data.location,
      installDate: data.installDate,
      warrantyExpiry: data.warrantyExpiry,
      specifications: data.specifications ?? {},
      maintenanceInterval: data.maintenanceInterval,
      criticality: data.criticality ?? 'medium',
      status: EquipmentStatus.OPERATIONAL,
    },
  });
}

export async function updateEquipment(
  equipmentId: number,
  data: {
    name?: string;
    category?: string;
    status?: EquipmentStatus;
    location?: string;
    specifications?: Record<string, unknown>;
    maintenanceInterval?: number;
    criticality?: string;
    lastMaintenanceDate?: Date;
    nextMaintenanceDate?: Date;
  },
) {
  return prisma.equipment.update({
    where: { id: equipmentId },
    data,
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
    isActive?: boolean;
  },
) {
  return prisma.sensor.findMany({
    where: {
      configId,
      ...(filters?.equipmentId && { equipmentId: filters.equipmentId }),
      ...(filters?.sensorType && { sensorType: filters.sensorType }),
      ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
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
  unit: string;
  minThreshold?: number;
  maxThreshold?: number;
  readingInterval?: number;
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
      readingInterval: data.readingInterval ?? 60,
      isActive: true,
    },
  });
}

export async function updateSensor(
  sensorId: number,
  data: {
    name?: string;
    minThreshold?: number;
    maxThreshold?: number;
    readingInterval?: number;
    isActive?: boolean;
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
  metadata?: Record<string, unknown>;
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
      isAnomaly,
      metadata: data.metadata ?? {},
      recordedAt: new Date(),
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
    await prisma.sensorAnomaly.create({
      data: {
        sensorId: data.sensorId,
        anomalyType,
        value: data.value,
        expectedMin: sensor.minThreshold,
        expectedMax: sensor.maxThreshold,
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
): string {
  if (min !== null && value < min) {
    const deviation = (min - value) / min;
    if (deviation > 0.5) return 'critical';
    if (deviation > 0.25) return 'high';
    if (deviation > 0.1) return 'medium';
    return 'low';
  }
  if (max !== null && value > max) {
    const deviation = (value - max) / max;
    if (deviation > 0.5) return 'critical';
    if (deviation > 0.25) return 'high';
    if (deviation > 0.1) return 'medium';
    return 'low';
  }
  return 'low';
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
          recordedAt: {
            gte: filters.startDate,
            lte: filters.endDate,
          },
        }),
    },
    orderBy: { recordedAt: 'desc' },
    take: filters?.limit ?? 100,
  });
}

export async function getAnomalies(
  configId: number,
  filters?: {
    sensorId?: number;
    severity?: string;
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
  // Get all equipment with sensor data
  const equipment = await prisma.equipment.findMany({
    where: { configId, status: { not: EquipmentStatus.DECOMMISSIONED } },
    include: {
      sensors: {
        include: {
          readings: {
            take: 100,
            orderBy: { recordedAt: 'desc' },
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
    const prediction = await predictEquipmentFailure(equip);

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
          contributingFactors: prediction.factors,
          recommendedActions: prediction.recommendations,
          estimatedImpact: prediction.impact,
          isActive: true,
        },
        include: { equipment: true },
      });
      predictions.push(newPrediction);
    }
  }

  return predictions;
}

async function predictEquipmentFailure(
  equipment: EquipmentWithSensors,
): Promise<{
  failureType: string;
  probability: number;
  predictedDate: Date;
  confidenceLevel: number;
  factors: string[];
  recommendations: string[];
  impact: Record<string, unknown>;
}> {
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
  if (equipment.installDate) {
    const ageYears =
      (Date.now() - new Date(equipment.installDate).getTime()) /
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
        recentReadings.reduce((s: number, r: SensorReading) => s + r.value, 0) /
        recentReadings.length;
      const olderAvg =
        olderReadings.reduce((s: number, r: SensorReading) => s + r.value, 0) /
        olderReadings.length;

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
    maintenanceType?: MaintenanceType;
    assignedTo?: string;
  },
) {
  return prisma.maintenanceWorkOrder.findMany({
    where: {
      configId,
      ...(filters?.equipmentId && { equipmentId: filters.equipmentId }),
      ...(filters?.status && { status: filters.status }),
      ...(filters?.priority && { priority: filters.priority }),
      ...(filters?.maintenanceType && {
        maintenanceType: filters.maintenanceType,
      }),
      ...(filters?.assignedTo && { assignedTo: filters.assignedTo }),
    },
    include: {
      equipment: true,
      spareParts: true,
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
  maintenanceType: MaintenanceType;
  priority?: WorkOrderPriority;
  scheduledDate: Date;
  estimatedDuration?: number;
  assignedTo?: string;
  estimatedCost?: number;
  predictionId?: number;
}) {
  return prisma.maintenanceWorkOrder.create({
    data: {
      configId: data.configId,
      equipmentId: data.equipmentId,
      workOrderNumber: data.workOrderNumber,
      title: data.title,
      description: data.description,
      maintenanceType: data.maintenanceType,
      priority: data.priority ?? WorkOrderPriority.MEDIUM,
      status: WorkOrderStatus.PENDING,
      scheduledDate: data.scheduledDate,
      estimatedDuration: data.estimatedDuration,
      assignedTo: data.assignedTo,
      estimatedCost: data.estimatedCost,
      predictionId: data.predictionId,
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
    startedAt?: Date;
    completedAt?: Date;
    actualDuration?: number;
    actualCost?: number;
    assignedTo?: string;
    notes?: string;
    partsUsed?: Record<string, unknown>;
  },
) {
  return prisma.maintenanceWorkOrder.update({
    where: { id: workOrderId },
    data,
    include: {
      equipment: true,
      spareParts: true,
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
    return parts.filter((p) => p.currentStock <= p.reorderLevel);
  }

  return parts;
}

export async function createSparePart(data: {
  configId: number;
  partNumber: string;
  name: string;
  category: string;
  description?: string;
  manufacturer?: string;
  unitCost?: number;
  currentStock?: number;
  reorderLevel?: number;
  reorderQuantity?: number;
  leadTimeDays?: number;
  location?: string;
}) {
  return prisma.sparePart.create({
    data: {
      configId: data.configId,
      partNumber: data.partNumber,
      name: data.name,
      category: data.category,
      description: data.description,
      manufacturer: data.manufacturer,
      unitCost: data.unitCost,
      currentStock: data.currentStock ?? 0,
      reorderLevel: data.reorderLevel ?? 5,
      reorderQuantity: data.reorderQuantity ?? 10,
      leadTimeDays: data.leadTimeDays ?? 7,
      location: data.location,
    },
  });
}

export async function updateSparePart(
  partId: number,
  data: {
    name?: string;
    currentStock?: number;
    reorderLevel?: number;
    reorderQuantity?: number;
    unitCost?: number;
    location?: string;
  },
) {
  return prisma.sparePart.update({
    where: { id: partId },
    data,
  });
}

// ============ Downtime Events ============

export async function recordDowntimeEvent(data: {
  configId: number;
  equipmentId: number;
  reason: string;
  startTime: Date;
  endTime?: Date;
  isPlanned: boolean;
  category?: string;
  rootCause?: string;
  correctiveActions?: string[];
  impactDescription?: string;
  productionLoss?: number;
}) {
  const event = await prisma.downtimeEvent.create({
    data: {
      configId: data.configId,
      equipmentId: data.equipmentId,
      reason: data.reason,
      startTime: data.startTime,
      endTime: data.endTime,
      isPlanned: data.isPlanned,
      category: data.category,
      rootCause: data.rootCause,
      correctiveActions: data.correctiveActions ?? [],
      impactDescription: data.impactDescription,
      productionLoss: data.productionLoss,
    },
  });

  // Update equipment status
  await prisma.equipment.update({
    where: { id: data.equipmentId },
    data: {
      status: data.endTime ? EquipmentStatus.OPERATIONAL : EquipmentStatus.DOWN,
    },
  });

  return event;
}

export async function getDowntimeEvents(
  configId: number,
  filters?: {
    equipmentId?: number;
    isPlanned?: boolean;
    startDate?: Date;
    endDate?: Date;
  },
) {
  return prisma.downtimeEvent.findMany({
    where: {
      configId,
      ...(filters?.equipmentId && { equipmentId: filters.equipmentId }),
      ...(filters?.isPlanned !== undefined && { isPlanned: filters.isPlanned }),
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
          configId,
          startTime: { gte: startDate, lte: endDate },
        },
      }),
      prisma.failurePrediction.findMany({
        where: { configId, isActive: true },
      }),
      prisma.maintenanceAnalytics.findMany({
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
  const failureCount = downtimeEvents.filter((d) => !d.isPlanned).length;
  const mtbf =
    failureCount > 0
      ? totalOperationalHours / failureCount
      : totalOperationalHours;

  // Calculate MTTR (Mean Time To Repair)
  const completedDowntimes = downtimeEvents.filter((d) => d.endTime);
  const totalRepairTime = completedDowntimes.reduce((sum, d) => {
    return (
      sum +
      (new Date(d.endTime!).getTime() - new Date(d.startTime).getTime()) /
        (1000 * 60 * 60)
    );
  }, 0);
  const mttr =
    completedDowntimes.length > 0
      ? totalRepairTime / completedDowntimes.length
      : 0;

  // Calculate availability
  const totalDowntimeHours = downtimeEvents.reduce((sum, d) => {
    const end = d.endTime ? new Date(d.endTime) : new Date();
    return (
      sum + (end.getTime() - new Date(d.startTime).getTime()) / (1000 * 60 * 60)
    );
  }, 0);
  const availability =
    totalOperationalHours > 0
      ? ((totalOperationalHours - totalDowntimeHours) / totalOperationalHours) *
        100
      : 100;

  // Calculate maintenance costs
  const totalMaintenanceCost = workOrders
    .filter((wo) => wo.status === WorkOrderStatus.COMPLETED)
    .reduce((sum, wo) => sum + (wo.actualCost || wo.estimatedCost || 0), 0);

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
      pendingWorkOrders: workOrders.filter(
        (wo) => wo.status === WorkOrderStatus.PENDING,
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
            .filter((d) => !d.isPlanned)
            .reduce((sum, d) => {
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
      down: equipment.filter((e) => e.status === EquipmentStatus.DOWN).length,
      decommissioned: equipment.filter(
        (e) => e.status === EquipmentStatus.DECOMMISSIONED,
      ).length,
    },
    workOrdersByType: {
      preventive: workOrders.filter(
        (wo) => wo.maintenanceType === MaintenanceType.PREVENTIVE,
      ).length,
      corrective: workOrders.filter(
        (wo) => wo.maintenanceType === MaintenanceType.CORRECTIVE,
      ).length,
      predictive: workOrders.filter(
        (wo) => wo.maintenanceType === MaintenanceType.PREDICTIVE,
      ).length,
      emergency: workOrders.filter(
        (wo) => wo.maintenanceType === MaintenanceType.EMERGENCY,
      ).length,
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
      equipmentInMaintenance: equipment.filter(
        (e) => e.status === EquipmentStatus.MAINTENANCE,
      ).length,
      equipmentDown: equipment.filter(
        (e) => e.status === EquipmentStatus.OFFLINE,
      ).length,
      availability,
      pendingWorkOrders: workOrders.filter(
        (wo) => wo.status === WorkOrderStatus.SCHEDULED,
      ).length,
      completedWorkOrders: workOrders.filter(
        (wo) => wo.status === WorkOrderStatus.COMPLETED,
      ).length,
      activeAlerts: predictions.filter((p) => p.probability >= 0.5).length,
    },
    create: {
      configId,
      date: today,
      totalEquipment,
      operationalEquipment,
      equipmentInMaintenance: equipment.filter(
        (e) => e.status === EquipmentStatus.MAINTENANCE,
      ).length,
      equipmentDown: equipment.filter(
        (e) => e.status === EquipmentStatus.OFFLINE,
      ).length,
      availability,
      pendingWorkOrders: workOrders.filter(
        (wo) => wo.status === WorkOrderStatus.SCHEDULED,
      ).length,
      completedWorkOrders: workOrders.filter(
        (wo) => wo.status === WorkOrderStatus.COMPLETED,
      ).length,
      activeAlerts: predictions.filter((p) => p.probability >= 0.5).length,
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
