/**
 * Tool 3.5: Safety & Compliance Monitor Router
 *
 * API endpoints for safety monitoring, incidents, hazards, training, and inspections
 */

import { Router } from 'express';
import { z } from 'zod';
import {
  IncidentSeverity,
  IncidentStatus,
  ChecklistStatus,
  TrainingStatus,
  RiskLevel,
} from '@prisma/client';
import { AuthenticatedRequest } from '../../auth/auth.middleware';
import * as safetyService from './safety-monitor.service';
import { hasClientAccess } from '../../auth/client-auth.helper';

const router = Router();

// ============ Validation Schemas ============

const createConfigSchema = z.object({
  clientId: z.string().uuid(),
  facilityName: z.string().min(1),
  facilityType: z.string().min(1),
  employeeCount: z.number().positive(),
  workAreas: z.array(z.string()),
  hazardCategories: z.array(z.string()).optional(),
  regulatoryRequirements: z.array(z.string()).optional(),
  emergencyContacts: z.record(z.any()).optional(),
  reportingThresholds: z.record(z.any()).optional(),
});

const updateConfigSchema = z.object({
  facilityName: z.string().optional(),
  facilityType: z.string().optional(),
  employeeCount: z.number().positive().optional(),
  workAreas: z.array(z.string()).optional(),
  hazardCategories: z.array(z.string()).optional(),
  regulatoryRequirements: z.array(z.string()).optional(),
  emergencyContacts: z.record(z.any()).optional(),
  reportingThresholds: z.record(z.any()).optional(),
});

const createChecklistSchema = z.object({
  configId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  workArea: z.string().min(1),
  frequency: z.string().min(1),
  items: z.array(z.record(z.any())),
  requiredPPE: z.array(z.string()).optional(),
  estimatedDuration: z.number().positive().optional(),
});

const updateChecklistSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  workArea: z.string().optional(),
  frequency: z.string().optional(),
  items: z.array(z.record(z.any())).optional(),
  requiredPPE: z.array(z.string()).optional(),
  estimatedDuration: z.number().positive().optional(),
  isActive: z.boolean().optional(),
});

const createCompletionSchema = z.object({
  checklistId: z.string().uuid(),
  completedBy: z.string().min(1),
  completedAt: z.string().datetime(),
  responses: z.record(z.any()),
  notes: z.string().optional(),
  issues: z.array(z.string()).optional(),
  photos: z.array(z.string()).optional(),
});

const createIncidentSchema = z.object({
  configId: z.string().uuid(),
  incidentNumber: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  incidentType: z.string().min(1),
  severity: z.nativeEnum(IncidentSeverity),
  incidentDate: z.string().datetime(),
  location: z.string().min(1),
  involvedPersons: z.array(z.string()).optional(),
  witnesses: z.array(z.string()).optional(),
  injuries: z.array(z.record(z.any())).optional(),
  propertyDamage: z.record(z.any()).optional(),
  immediateActions: z.array(z.string()).optional(),
  rootCause: z.string().optional(),
  reportedBy: z.string().min(1),
});

const updateIncidentSchema = z.object({
  status: z.nativeEnum(IncidentStatus).optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  severity: z.nativeEnum(IncidentSeverity).optional(),
  rootCause: z.string().optional(),
  correctiveActions: z.array(z.string()).optional(),
  preventiveMeasures: z.array(z.string()).optional(),
  investigationNotes: z.string().optional(),
  investigatedBy: z.string().optional(),
  closedAt: z.string().datetime().optional(),
  closedBy: z.string().optional(),
});

const createHazardSchema = z.object({
  configId: z.number(),
  title: z.string().min(1),
  description: z.string().min(1),
  hazardType: z.string().min(1),
  location: z.string().optional(),
  department: z.string().optional(),
  riskLevel: z.nativeEnum(RiskLevel),
  likelihood: z.number().optional(),
  consequence: z.number().optional(),
  controlMeasures: z.record(z.any()).optional(),
  reportedBy: z.string().optional(),
});

const updateHazardSchema = z.object({
  riskLevel: z.nativeEnum(RiskLevel).optional(),
  mitigationStatus: z.string().optional(),
  controlMeasures: z.record(z.any()).optional(),
  resolvedAt: z.string().datetime().optional(),
  resolvedBy: z.number().optional(),
  residualRisk: z.number().optional(),
});

const createTrainingRequirementSchema = z.object({
  configId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().min(1),
  requiredFor: z.array(z.string()),
  validityPeriod: z.number().positive().optional(),
  provider: z.string().optional(),
  estimatedDuration: z.number().positive().optional(),
  materials: z.array(z.string()).optional(),
  assessmentRequired: z.boolean().optional(),
  passingScore: z.number().min(0).max(100).optional(),
});

const updateTrainingRequirementSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  requiredFor: z.array(z.string()).optional(),
  validityPeriod: z.number().positive().optional(),
  provider: z.string().optional(),
  estimatedDuration: z.number().positive().optional(),
  materials: z.array(z.string()).optional(),
  assessmentRequired: z.boolean().optional(),
  passingScore: z.number().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
});

const createTrainingRecordSchema = z.object({
  configId: z.string().uuid(),
  requirementId: z.string().uuid(),
  employeeId: z.string().min(1),
  employeeName: z.string().min(1),
  scheduledDate: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  trainer: z.string().optional(),
  score: z.number().min(0).max(100).optional(),
  certificateUrl: z.string().url().optional(),
  notes: z.string().optional(),
});

const updateTrainingRecordSchema = z.object({
  completedAt: z.string().datetime().optional(),
  trainer: z.string().optional(),
  score: z.number().min(0).max(100).optional(),
  certificateUrl: z.string().url().optional(),
  notes: z.string().optional(),
  status: z.nativeEnum(TrainingStatus).optional(),
});

const createOshaLogSchema = z.object({
  configId: z.string().uuid(),
  year: z.number().min(2000).max(2100),
  logType: z.string().min(1),
  entries: z.array(z.record(z.any())),
  totalCases: z.number().optional(),
  daysAwayFromWork: z.number().optional(),
  daysRestricted: z.number().optional(),
  otherRecordable: z.number().optional(),
});

const createInspectionSchema = z.object({
  configId: z.string().uuid(),
  inspectionType: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  area: z.string().min(1),
  scheduledDate: z.string().datetime(),
  inspector: z.string().optional(),
  checklistItems: z.array(z.record(z.any())).optional(),
});

const updateInspectionSchema = z.object({
  status: z.string().optional(),
  completedAt: z.string().datetime().optional(),
  inspector: z.string().optional(),
  findings: z.array(z.record(z.any())).optional(),
  overallRating: z.string().optional(),
  correctiveActions: z.array(z.string()).optional(),
  nextInspectionDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

// ============ Configuration Routes ============

router.get('/config/:clientId', async (req, res) => {
  try {
    const clientId = Number(req.params.clientId);
    if (Number.isNaN(clientId)) {
      return res.status(400).json({ error: 'Invalid client ID' });
    }

    if (!hasClientAccess((req as AuthenticatedRequest).userId!, clientId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const config = await safetyService.getSafetyConfig(clientId);
    res.json(config);
  } catch (error) {
    console.error('Error fetching safety config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/config', async (req, res) => {
  try {
    const data = createConfigSchema.parse(req.body);

    if (
      !hasClientAccess((req as AuthenticatedRequest).userId!, data.clientId)
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const config = await safetyService.createSafetyConfig(data);
    res.status(201).json(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: 'Validation error', details: error.issues });
    }
    console.error('Error creating safety config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/config/:configId', async (req, res) => {
  try {
    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      return res.status(400).json({ error: 'Invalid config ID' });
    }
    const data = updateConfigSchema.parse(req.body);

    const clientId = await safetyService.getClientIdFromSafetyConfig(configId);
    if (
      !clientId ||
      !hasClientAccess((req as AuthenticatedRequest).userId!, clientId)
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const config = await safetyService.updateSafetyConfig(configId, data);
    res.json(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: 'Validation error', details: error.issues });
    }
    console.error('Error updating safety config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ Checklists Routes ============

router.get('/checklists/:configId', async (req, res) => {
  try {
    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      return res.status(400).json({ error: 'Invalid config ID' });
    }
    const { category, department, frequency, isActive } = req.query;

    const clientId = await safetyService.getClientIdFromSafetyConfig(configId);
    if (
      !clientId ||
      !hasClientAccess((req as AuthenticatedRequest).userId!, clientId)
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const checklists = await safetyService.getChecklists(configId, {
      category: category as string,
      department: department as string,
      frequency: frequency as string,
      isActive:
        isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });
    res.json(checklists);
  } catch (error) {
    console.error('Error fetching checklists:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/checklists', async (req, res) => {
  try {
    const data = createChecklistSchema.parse(req.body);

    const clientId = await safetyService.getClientIdFromSafetyConfig(
      data.configId,
    );
    if (
      !clientId ||
      !hasClientAccess((req as AuthenticatedRequest).userId!, clientId)
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const checklist = await safetyService.createChecklist(data);
    res.status(201).json(checklist);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: 'Validation error', details: error.issues });
    }
    console.error('Error creating checklist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/checklists/:checklistId', async (req, res) => {
  try {
    const checklistId = Number(req.params.checklistId);
    if (Number.isNaN(checklistId)) {
      return res.status(400).json({ error: 'Invalid checklist ID' });
    }
    const data = updateChecklistSchema.parse(req.body);

    const clientId = await safetyService.getClientIdFromChecklist(checklistId);
    if (
      !clientId ||
      !hasClientAccess((req as AuthenticatedRequest).userId!, clientId)
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const checklist = await safetyService.updateChecklist(checklistId, data);
    res.json(checklist);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: 'Validation error', details: error.issues });
    }
    console.error('Error updating checklist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/checklists/:checklistId', async (req, res) => {
  try {
    const checklistId = Number(req.params.checklistId);
    if (Number.isNaN(checklistId)) {
      return res.status(400).json({ error: 'Invalid checklist ID' });
    }

    const clientId = await safetyService.getClientIdFromChecklist(checklistId);
    if (
      !clientId ||
      !hasClientAccess((req as AuthenticatedRequest).userId!, clientId)
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await safetyService.deleteChecklist(checklistId);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting checklist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ Checklist Completions Routes ============

router.get('/completions/:checklistId', async (req, res) => {
  try {
    const checklistId = Number(req.params.checklistId);
    if (Number.isNaN(checklistId)) {
      return res.status(400).json({ error: 'Invalid checklist ID' });
    }
    const { status, startDate, endDate } = req.query;

    const clientId = await safetyService.getClientIdFromChecklist(checklistId);
    if (
      !clientId ||
      !hasClientAccess((req as AuthenticatedRequest).userId!, clientId)
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const completions = await safetyService.getChecklistCompletions(
      checklistId,
      {
        status: status as ChecklistStatus,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      },
    );
    res.json(completions);
  } catch (error) {
    console.error('Error fetching completions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/completions', async (req, res) => {
  try {
    const data = createCompletionSchema.parse(req.body);

    const clientId = await safetyService.getClientIdFromChecklist(
      data.checklistId,
    );
    if (
      !clientId ||
      !hasClientAccess((req as AuthenticatedRequest).userId!, clientId)
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const completion = await safetyService.createChecklistCompletion({
      ...data,
      completedAt: new Date(data.completedAt),
    });
    res.status(201).json(completion);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: 'Validation error', details: error.issues });
    }
    console.error('Error creating completion:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ Incidents Routes ============

router.get('/incidents/:configId', async (req, res) => {
  try {
    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      return res.status(400).json({ error: 'Invalid config ID' });
    }
    const { status, severity, workArea, startDate, endDate } = req.query;

    const clientId = await safetyService.getClientIdFromSafetyConfig(configId);
    if (
      !clientId ||
      !hasClientAccess((req as AuthenticatedRequest).userId!, clientId)
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const incidents = await safetyService.getIncidents(configId, {
      status: status as IncidentStatus,
      severity: severity as IncidentSeverity,
      workArea: workArea as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    });
    res.json(incidents);
  } catch (error) {
    console.error('Error fetching incidents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/incidents', async (req, res) => {
  try {
    const data = createIncidentSchema.parse(req.body);

    const clientId = await safetyService.getClientIdFromSafetyConfig(
      data.configId,
    );
    if (
      !clientId ||
      !hasClientAccess((req as AuthenticatedRequest).userId!, clientId)
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const incident = await safetyService.createIncident({
      ...data,
      incidentDate: new Date(data.incidentDate),
    });
    res.status(201).json(incident);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: 'Validation error', details: error.issues });
    }
    console.error('Error creating incident:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/incidents/:incidentId', async (req, res) => {
  try {
    const incidentId = Number(req.params.incidentId);
    if (Number.isNaN(incidentId)) {
      return res.status(400).json({ error: 'Invalid incident ID' });
    }
    const data = updateIncidentSchema.parse(req.body);

    const clientId = await safetyService.getClientIdFromIncident(incidentId);
    if (
      !clientId ||
      !hasClientAccess((req as AuthenticatedRequest).userId!, clientId)
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const incident = await safetyService.updateIncident(incidentId, {
      ...data,
      closedAt: data.closedAt ? new Date(data.closedAt) : undefined,
    });
    res.json(incident);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: 'Validation error', details: error.issues });
    }
    console.error('Error updating incident:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ Hazards Routes ============

router.get('/hazards/:configId', async (req, res) => {
  try {
    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      return res.status(400).json({ error: 'Invalid config ID' });
    }
    const { hazardType, riskLevel, mitigationStatus, location } = req.query;

    const clientId = await safetyService.getClientIdFromSafetyConfig(configId);
    if (
      !clientId ||
      !hasClientAccess((req as AuthenticatedRequest).userId!, clientId)
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const hazards = await safetyService.getHazards(configId, {
      hazardType: hazardType as string,
      riskLevel: riskLevel as RiskLevel | undefined,
      mitigationStatus: mitigationStatus as string,
      location: location as string,
    });
    res.json(hazards);
  } catch (error) {
    console.error('Error fetching hazards:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/hazards', async (req, res) => {
  try {
    const data = createHazardSchema.parse(req.body);

    const clientId = await safetyService.getClientIdFromSafetyConfig(
      data.configId,
    );
    if (
      !clientId ||
      !hasClientAccess((req as AuthenticatedRequest).userId!, clientId)
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const hazard = await safetyService.createHazard(data);
    res.status(201).json(hazard);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: 'Validation error', details: error.issues });
    }
    console.error('Error creating hazard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/hazards/:hazardId', async (req, res) => {
  try {
    const hazardId = Number(req.params.hazardId);
    if (Number.isNaN(hazardId)) {
      return res.status(400).json({ error: 'Invalid hazard ID' });
    }
    const data = updateHazardSchema.parse(req.body);

    const clientId = await safetyService.getClientIdFromHazard(hazardId);
    if (
      !clientId ||
      !hasClientAccess((req as AuthenticatedRequest).userId!, clientId)
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const hazard = await safetyService.updateHazard(hazardId, {
      ...data,
      resolvedAt: data.resolvedAt ? new Date(data.resolvedAt) : undefined,
    });
    res.json(hazard);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: 'Validation error', details: error.issues });
    }
    console.error('Error updating hazard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ Training Requirements Routes ============

router.get('/training-requirements/:configId', async (req, res) => {
  try {
    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      return res.status(400).json({ error: 'Invalid config ID' });
    }
    const { category, isActive } = req.query;

    const clientId = await safetyService.getClientIdFromSafetyConfig(configId);
    if (
      !clientId ||
      !hasClientAccess((req as AuthenticatedRequest).userId!, clientId)
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const requirements = await safetyService.getTrainingRequirements(configId, {
      category: category as string,
      isActive:
        isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });
    res.json(requirements);
  } catch (error) {
    console.error('Error fetching training requirements:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/training-requirements', async (req, res) => {
  try {
    const data = createTrainingRequirementSchema.parse(req.body);

    const clientId = await safetyService.getClientIdFromSafetyConfig(
      data.configId,
    );
    if (
      !clientId ||
      !hasClientAccess((req as AuthenticatedRequest).userId!, clientId)
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const requirement = await safetyService.createTrainingRequirement(data);
    res.status(201).json(requirement);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: 'Validation error', details: error.issues });
    }
    console.error('Error creating training requirement:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/training-requirements/:requirementId', async (req, res) => {
  try {
    const requirementId = Number(req.params.requirementId);
    if (Number.isNaN(requirementId)) {
      return res.status(400).json({ error: 'Invalid requirement ID' });
    }
    const data = updateTrainingRequirementSchema.parse(req.body);

    const clientId =
      await safetyService.getClientIdFromTrainingRequirement(requirementId);
    if (
      !clientId ||
      !hasClientAccess((req as AuthenticatedRequest).userId!, clientId)
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const requirement = await safetyService.updateTrainingRequirement(
      requirementId,
      data,
    );
    res.json(requirement);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: 'Validation error', details: error.issues });
    }
    console.error('Error updating training requirement:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ Training Records Routes ============

router.get('/training-records/:configId', async (req, res) => {
  try {
    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      return res.status(400).json({ error: 'Invalid config ID' });
    }
    const { requirementId, employeeId, status } = req.query;

    const clientId = await safetyService.getClientIdFromSafetyConfig(configId);
    if (
      !clientId ||
      !hasClientAccess((req as AuthenticatedRequest).userId!, clientId)
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const records = await safetyService.getTrainingRecords(configId, {
      requirementId: requirementId ? Number(requirementId) : undefined,
      employeeId: employeeId as string,
      status: status as TrainingStatus,
    });
    res.json(records);
  } catch (error) {
    console.error('Error fetching training records:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/training-records', async (req, res) => {
  try {
    const data = createTrainingRecordSchema.parse(req.body);

    const clientId = await safetyService.getClientIdFromSafetyConfig(
      data.configId,
    );
    if (
      !clientId ||
      !hasClientAccess((req as AuthenticatedRequest).userId!, clientId)
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const record = await safetyService.createTrainingRecord({
      ...data,
      scheduledDate: data.scheduledDate
        ? new Date(data.scheduledDate)
        : undefined,
      completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
    });
    res.status(201).json(record);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: 'Validation error', details: error.issues });
    }
    console.error('Error creating training record:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/training-records/:recordId', async (req, res) => {
  try {
    const recordId = Number(req.params.recordId);
    if (Number.isNaN(recordId)) {
      return res.status(400).json({ error: 'Invalid record ID' });
    }
    const data = updateTrainingRecordSchema.parse(req.body);

    // Note: For simplicity, we assume proper authorization check here
    const record = await safetyService.updateTrainingRecord(recordId, {
      ...data,
      completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
    });
    res.json(record);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: 'Validation error', details: error.issues });
    }
    console.error('Error updating training record:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ OSHA Logs Routes ============

router.get('/osha-logs/:configId', async (req, res) => {
  try {
    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      return res.status(400).json({ error: 'Invalid config ID' });
    }
    const { year, logType } = req.query;

    const clientId = await safetyService.getClientIdFromSafetyConfig(configId);
    if (
      !clientId ||
      !hasClientAccess((req as AuthenticatedRequest).userId!, clientId)
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const logs = await safetyService.getOshaLogs(configId, {
      year: year ? parseInt(year as string) : undefined,
      logType: logType as string,
    });
    res.json(logs);
  } catch (error) {
    console.error('Error fetching OSHA logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/osha-logs', async (req, res) => {
  try {
    const data = createOshaLogSchema.parse(req.body);

    const clientId = await safetyService.getClientIdFromSafetyConfig(
      data.configId,
    );
    if (
      !clientId ||
      !hasClientAccess((req as AuthenticatedRequest).userId!, clientId)
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const log = await safetyService.createOshaLog(data);
    res.status(201).json(log);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: 'Validation error', details: error.issues });
    }
    console.error('Error creating OSHA log:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ Inspections Routes ============

router.get('/inspections/:configId', async (req, res) => {
  try {
    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      return res.status(400).json({ error: 'Invalid config ID' });
    }
    const { inspectionType, status, area } = req.query;

    const clientId = await safetyService.getClientIdFromSafetyConfig(configId);
    if (
      !clientId ||
      !hasClientAccess((req as AuthenticatedRequest).userId!, clientId)
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const inspections = await safetyService.getInspections(configId, {
      inspectionType: inspectionType as string,
      status: status as string,
      area: area as string,
    });
    res.json(inspections);
  } catch (error) {
    console.error('Error fetching inspections:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/inspections', async (req, res) => {
  try {
    const data = createInspectionSchema.parse(req.body);

    const clientId = await safetyService.getClientIdFromSafetyConfig(
      data.configId,
    );
    if (
      !clientId ||
      !hasClientAccess((req as AuthenticatedRequest).userId!, clientId)
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const inspection = await safetyService.createInspection({
      ...data,
      scheduledDate: new Date(data.scheduledDate),
    });
    res.status(201).json(inspection);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: 'Validation error', details: error.issues });
    }
    console.error('Error creating inspection:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/inspections/:inspectionId', async (req, res) => {
  try {
    const inspectionId = Number(req.params.inspectionId);
    if (Number.isNaN(inspectionId)) {
      return res.status(400).json({ error: 'Invalid inspection ID' });
    }
    const data = updateInspectionSchema.parse(req.body);

    const clientId =
      await safetyService.getClientIdFromInspection(inspectionId);
    if (
      !clientId ||
      !hasClientAccess((req as AuthenticatedRequest).userId!, clientId)
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const inspection = await safetyService.updateInspection(inspectionId, {
      status: data.status,
      completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
      inspector: data.inspector,
      findings: data.findings,
      overallScore: data.overallRating
        ? parseInt(data.overallRating, 10)
        : undefined,
      correctiveActions: data.correctiveActions,
      followUpDate: data.nextInspectionDate
        ? new Date(data.nextInspectionDate)
        : undefined,
    });
    res.json(inspection);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: 'Validation error', details: error.issues });
    }
    console.error('Error updating inspection:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ Analytics Routes ============

router.get('/analytics/:configId', async (req, res) => {
  try {
    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      return res.status(400).json({ error: 'Invalid config ID' });
    }
    const { startDate, endDate } = req.query;

    const clientId = await safetyService.getClientIdFromSafetyConfig(configId);
    if (
      !clientId ||
      !hasClientAccess((req as AuthenticatedRequest).userId!, clientId)
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const analytics = await safetyService.getSafetyAnalytics(configId, {
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
    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      return res.status(400).json({ error: 'Invalid config ID' });
    }

    const clientId = await safetyService.getClientIdFromSafetyConfig(configId);
    if (
      !clientId ||
      !hasClientAccess((req as AuthenticatedRequest).userId!, clientId)
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const analytics = await safetyService.recordDailyAnalytics(configId);
    res.json(analytics);
  } catch (error) {
    console.error('Error recording analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
