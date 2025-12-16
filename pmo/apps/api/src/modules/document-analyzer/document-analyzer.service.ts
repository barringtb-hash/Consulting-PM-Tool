/**
 * Tool 2.1: Smart Document Analyzer Service
 *
 * Provides intelligent document analysis capabilities including:
 * - Multi-format document processing (PDF, Word, Excel, images)
 * - OCR for scanned documents
 * - Named Entity Recognition (NER)
 * - Custom field extraction with ML
 * - Compliance flagging and audit trails
 * - Batch processing
 * - Document version comparison
 */

import { prisma } from '../../prisma/client';
import { env } from '../../config/env';
import {
  DocumentFormat,
  AnalysisStatus,
  ComplianceLevel,
  Prisma,
} from '@prisma/client';

// ============================================================================
// TYPES
// ============================================================================

interface DocumentAnalyzerConfigInput {
  enableOCR?: boolean;
  enableNER?: boolean;
  enableCompliance?: boolean;
  enableVersionCompare?: boolean;
  defaultExtractionFields?: Prisma.InputJsonValue;
  complianceRules?: Prisma.InputJsonValue;
  retentionDays?: number;
}

interface DocumentUploadInput {
  filename: string;
  originalUrl: string;
  mimeType: string;
  sizeBytes: number;
  format: DocumentFormat;
}

interface ExtractionResult {
  fields: Record<
    string,
    { value: string; confidence: number; location?: string }
  >;
  entities: Record<
    string,
    Array<{ value: string; confidence: number; location?: string }>
  >;
  documentType?: string;
  documentTypeConfidence?: number;
}

interface ComplianceResult {
  status: ComplianceLevel;
  flags: Array<{
    ruleId: string;
    status: ComplianceLevel;
    message: string;
    location?: string;
  }>;
}

// ============================================================================
// DOCUMENT ANALYZER CONFIG MANAGEMENT
// ============================================================================

/**
 * Get document analyzer config by clientId (deprecated) or accountId (preferred)
 * Handles case where accountId column may not exist in database yet
 */
export async function getDocumentAnalyzerConfig(
  clientId?: number,
  accountId?: number,
) {
  // Prefer accountId if provided
  if (accountId) {
    try {
      return await prisma.documentAnalyzerConfig.findUnique({
        where: { accountId },
        include: {
          account: { select: { id: true, name: true, industry: true } },
          client: { select: { id: true, name: true, industry: true } },
        },
      });
    } catch (error) {
      const errorMessage = (error as Error).message || '';
      if (
        errorMessage.includes('accountId') &&
        errorMessage.includes('does not exist')
      ) {
        console.warn(
          'DocumentAnalyzerConfig.accountId column not found, falling back to clientId query',
        );
        // Fall back to clientId query if we have it
        if (clientId) {
          return prisma.documentAnalyzerConfig.findUnique({
            where: { clientId },
            include: {
              client: { select: { id: true, name: true, industry: true } },
            },
          });
        }
        return null;
      }
      throw error;
    }
  }
  // Fall back to clientId (deprecated)
  if (clientId) {
    return prisma.documentAnalyzerConfig.findUnique({
      where: { clientId },
      include: {
        client: { select: { id: true, name: true, industry: true } },
        account: { select: { id: true, name: true, industry: true } },
      },
    });
  }
  return null;
}

export async function listDocumentAnalyzerConfigs(filters?: {
  clientId?: number;
  clientIds?: number[];
  accountId?: number;
  accountIds?: number[];
}) {
  const whereClause: Prisma.DocumentAnalyzerConfigWhereInput = {};

  // Build where clause - prefer account filters if available
  // Note: accountId column may not exist in older databases, so we handle errors gracefully
  if (filters?.accountId) {
    whereClause.accountId = filters.accountId;
  } else if (filters?.accountIds && filters.accountIds.length > 0) {
    whereClause.accountId = { in: filters.accountIds };
  } else if (filters?.clientId) {
    whereClause.clientId = filters.clientId;
  } else if (filters?.clientIds && filters.clientIds.length > 0) {
    whereClause.clientId = { in: filters.clientIds };
  }

  try {
    return await prisma.documentAnalyzerConfig.findMany({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      include: {
        client: { select: { id: true, name: true, industry: true } },
        account: { select: { id: true, name: true, industry: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    // If query fails (e.g., accountId column doesn't exist), fall back to simpler query
    const errorMessage = (error as Error).message || '';
    if (
      errorMessage.includes('accountId') &&
      errorMessage.includes('does not exist')
    ) {
      console.warn(
        'DocumentAnalyzerConfig.accountId column not found, falling back to clientId query',
      );
      // Retry without accountId filter - use clientId instead if we have account IDs
      const fallbackWhere: Prisma.DocumentAnalyzerConfigWhereInput = {};
      if (filters?.clientId) {
        fallbackWhere.clientId = filters.clientId;
      } else if (filters?.clientIds && filters.clientIds.length > 0) {
        fallbackWhere.clientId = { in: filters.clientIds };
      }
      // Note: We lose accountId filtering but at least the query works

      return await prisma.documentAnalyzerConfig.findMany({
        where:
          Object.keys(fallbackWhere).length > 0 ? fallbackWhere : undefined,
        include: {
          client: { select: { id: true, name: true, industry: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }
    throw error;
  }
}

/**
 * Create document analyzer config linked to Account (preferred) or Client (deprecated)
 * Handles case where accountId column may not exist in database yet
 */
export async function createDocumentAnalyzerConfig(
  data: DocumentAnalyzerConfigInput & { clientId?: number; accountId?: number },
) {
  const { clientId, accountId, ...configData } = data;
  try {
    return await prisma.documentAnalyzerConfig.create({
      data: {
        ...(accountId && { accountId }),
        ...(clientId && { clientId }),
        ...configData,
      },
    });
  } catch (error) {
    const errorMessage = (error as Error).message || '';
    if (
      errorMessage.includes('accountId') &&
      errorMessage.includes('does not exist')
    ) {
      console.warn(
        'DocumentAnalyzerConfig.accountId column not found, creating with clientId only',
      );
      // Retry without accountId
      return await prisma.documentAnalyzerConfig.create({
        data: {
          ...(clientId && { clientId }),
          ...configData,
        },
      });
    }
    throw error;
  }
}

/**
 * Update document analyzer config by clientId (deprecated) or accountId (preferred)
 * Handles case where accountId column may not exist in database yet
 */
export async function updateDocumentAnalyzerConfig(
  data: Partial<DocumentAnalyzerConfigInput>,
  clientId?: number,
  accountId?: number,
) {
  if (accountId) {
    try {
      return await prisma.documentAnalyzerConfig.update({
        where: { accountId },
        data,
      });
    } catch (error) {
      const errorMessage = (error as Error).message || '';
      if (
        errorMessage.includes('accountId') &&
        errorMessage.includes('does not exist')
      ) {
        console.warn(
          'DocumentAnalyzerConfig.accountId column not found, falling back to clientId update',
        );
        // Fall back to clientId if available
        if (clientId) {
          return await prisma.documentAnalyzerConfig.update({
            where: { clientId },
            data,
          });
        }
        throw new Error(
          'Cannot update config: accountId column does not exist and no clientId provided',
        );
      }
      throw error;
    }
  }
  if (clientId) {
    return prisma.documentAnalyzerConfig.update({
      where: { clientId },
      data,
    });
  }
  throw new Error('Either clientId or accountId is required');
}

// ============================================================================
// DOCUMENT MANAGEMENT
// ============================================================================

export async function uploadDocument(
  configId: number,
  input: DocumentUploadInput,
) {
  return prisma.analyzedDocument.create({
    data: {
      configId,
      ...input,
      status: 'PENDING',
    },
  });
}

export async function getDocument(id: number) {
  return prisma.analyzedDocument.findUnique({
    where: { id },
    include: {
      config: {
        include: {
          client: { select: { id: true, name: true } },
        },
      },
    },
  });
}

export async function getDocuments(
  configId: number,
  options: {
    status?: AnalysisStatus;
    documentType?: string;
    limit?: number;
    offset?: number;
  } = {},
) {
  const { status, documentType, limit = 50, offset = 0 } = options;

  return prisma.analyzedDocument.findMany({
    where: {
      configId,
      ...(status && { status }),
      ...(documentType && { documentType }),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}

export async function deleteDocument(id: number) {
  return prisma.analyzedDocument.delete({
    where: { id },
  });
}

// ============================================================================
// DOCUMENT ANALYSIS
// ============================================================================

export async function analyzeDocument(
  documentId: number,
  options: {
    extractionTemplateId?: number;
    forceReanalyze?: boolean;
  } = {},
): Promise<{ success: boolean; document: unknown }> {
  const startTime = Date.now();

  // Get document and config
  const document = await prisma.analyzedDocument.findUnique({
    where: { id: documentId },
    include: { config: true },
  });

  if (!document) {
    throw new Error('Document not found');
  }

  // Update status to processing
  await prisma.analyzedDocument.update({
    where: { id: documentId },
    data: { status: 'PROCESSING' },
  });

  try {
    // Perform OCR if enabled and document is scanned/image
    let ocrText: string | null = null;
    let ocrConfidence: number | null = null;

    if (
      document.config.enableOCR &&
      ['SCANNED', 'IMAGE'].includes(document.format)
    ) {
      const ocrResult = await performOCR(document.originalUrl);
      ocrText = ocrResult.text;
      ocrConfidence = ocrResult.confidence;
    }

    // Get extraction template if specified
    let extractionRules: Prisma.JsonValue | null = null;
    if (options.extractionTemplateId) {
      const template = await prisma.extractionTemplate.findUnique({
        where: { id: options.extractionTemplateId },
      });
      extractionRules = template?.extractionRules || null;
    }

    // Perform field extraction
    const extractionResult = await extractFields(
      document.originalUrl,
      ocrText,
      extractionRules,
      document.config.enableNER,
    );

    // Perform compliance check if enabled
    let complianceResult: ComplianceResult | null = null;
    if (document.config.enableCompliance && document.config.complianceRules) {
      complianceResult = await checkCompliance(
        ocrText || '',
        extractionResult,
        document.config.complianceRules as Prisma.JsonArray,
      );
    }

    const analysisTimeMs = Date.now() - startTime;

    // Update document with analysis results
    const updatedDocument = await prisma.analyzedDocument.update({
      where: { id: documentId },
      data: {
        status: 'COMPLETED',
        analyzedAt: new Date(),
        analysisTimeMs,
        ocrText,
        ocrConfidence,
        extractedFields: extractionResult.fields as Prisma.InputJsonValue,
        namedEntities: extractionResult.entities as Prisma.InputJsonValue,
        documentType: extractionResult.documentType,
        documentTypeConfidence: extractionResult.documentTypeConfidence,
        complianceStatus: complianceResult?.status,
        complianceFlags: complianceResult?.flags as Prisma.InputJsonValue,
        auditLog: [
          {
            action: 'analyzed',
            timestamp: new Date().toISOString(),
            details: { analysisTimeMs },
          },
        ] as Prisma.InputJsonValue,
      },
    });

    return { success: true, document: updatedDocument };
  } catch (error) {
    // Update document with error status
    await prisma.analyzedDocument.update({
      where: { id: documentId },
      data: {
        status: 'FAILED',
        errorMessage: (error as Error).message,
      },
    });

    throw error;
  }
}

async function performOCR(
  documentUrl: string,
): Promise<{ text: string; confidence: number }> {
  // Use OpenAI Vision API for OCR if available
  if (env.openaiApiKey) {
    try {
      const response = await fetch(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${env.openaiApiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            max_tokens: 4000,
            messages: [
              {
                role: 'system',
                content:
                  'Extract all text from this document image. Return the text in a structured format, preserving the layout as much as possible.',
              },
              {
                role: 'user',
                content: [
                  {
                    type: 'image_url',
                    image_url: { url: documentUrl },
                  },
                ],
              },
            ],
          }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        return {
          text: data.choices[0].message.content,
          confidence: 0.9,
        };
      }
    } catch (error) {
      console.error('OCR error:', error);
    }
  }

  // Fallback: return empty text
  return { text: '', confidence: 0 };
}

async function extractFields(
  documentUrl: string,
  ocrText: string | null,
  extractionRules: Prisma.JsonValue | null,
  enableNER: boolean,
): Promise<ExtractionResult> {
  const result: ExtractionResult = {
    fields: {},
    entities: {},
  };

  if (!env.openaiApiKey) {
    return result;
  }

  try {
    const prompt = `Analyze this document and extract the following information:
1. Document type (contract, invoice, receipt, form, letter, report, etc.)
2. Key fields and their values
${enableNER ? '3. Named entities (people, organizations, dates, locations, monetary amounts)' : ''}
${extractionRules ? `4. Specific fields to extract: ${JSON.stringify(extractionRules)}` : ''}

${ocrText ? `Document text:\n${ocrText}` : 'Analyze the document image to extract information.'}

Respond with JSON in this format:
{
  "documentType": "string",
  "documentTypeConfidence": 0.0-1.0,
  "fields": { "fieldName": { "value": "string", "confidence": 0.0-1.0 } },
  "entities": { "entityType": [{ "value": "string", "confidence": 0.0-1.0 }] }
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 2000,
        temperature: 0.1,
        messages: [
          {
            role: 'user',
            content: ocrText
              ? prompt
              : [
                  { type: 'text', text: prompt },
                  { type: 'image_url', image_url: { url: documentUrl } },
                ],
          },
        ],
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const content = data.choices[0].message.content;

      // Parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        result.fields = parsed.fields || {};
        result.entities = parsed.entities || {};
        result.documentType = parsed.documentType;
        result.documentTypeConfidence = parsed.documentTypeConfidence;
      }
    }
  } catch (error) {
    console.error('Field extraction error:', error);
  }

  return result;
}

async function checkCompliance(
  text: string,
  extractionResult: ExtractionResult,
  rules: Prisma.JsonArray,
): Promise<ComplianceResult> {
  const flags: ComplianceResult['flags'] = [];
  let overallStatus: ComplianceLevel = 'PASS';

  for (const rule of rules as Array<{
    ruleId: string;
    name: string;
    pattern?: string;
    requiredField?: string;
    severity: ComplianceLevel;
  }>) {
    let ruleStatus: ComplianceLevel = 'PASS';
    let message = '';

    if (rule.pattern) {
      // Pattern-based rule
      const regex = new RegExp(rule.pattern, 'i');
      if (regex.test(text)) {
        ruleStatus = rule.severity;
        message = `Pattern "${rule.name}" detected`;
      }
    }

    if (rule.requiredField) {
      // Required field rule
      if (!extractionResult.fields[rule.requiredField]) {
        ruleStatus = rule.severity;
        message = `Required field "${rule.requiredField}" not found`;
      }
    }

    if (ruleStatus !== 'PASS') {
      flags.push({
        ruleId: rule.ruleId,
        status: ruleStatus,
        message,
      });

      // Update overall status based on severity
      if (ruleStatus === 'FAIL') {
        overallStatus = 'FAIL';
      } else if (ruleStatus === 'WARNING' && overallStatus !== 'FAIL') {
        overallStatus = 'WARNING';
      }
    }
  }

  return { status: overallStatus, flags };
}

// ============================================================================
// EXTRACTION TEMPLATES
// ============================================================================

export async function createExtractionTemplate(
  configId: number,
  data: {
    name: string;
    description?: string;
    documentType?: string;
    extractionRules: Prisma.InputJsonValue;
    useMLExtraction?: boolean;
  },
) {
  return prisma.extractionTemplate.create({
    data: {
      configId,
      ...data,
    },
  });
}

export async function getExtractionTemplates(
  configId: number,
  options: {
    documentType?: string;
    isActive?: boolean;
  } = {},
) {
  return prisma.extractionTemplate.findMany({
    where: {
      configId,
      ...(options.documentType && { documentType: options.documentType }),
      ...(options.isActive !== undefined && { isActive: options.isActive }),
    },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  });
}

export async function updateExtractionTemplate(
  id: number,
  data: Partial<{
    name: string;
    description: string;
    documentType: string;
    extractionRules: Prisma.InputJsonValue;
    useMLExtraction: boolean;
    isDefault: boolean;
    isActive: boolean;
  }>,
) {
  return prisma.extractionTemplate.update({
    where: { id },
    data,
  });
}

export async function deleteExtractionTemplate(id: number) {
  return prisma.extractionTemplate.delete({
    where: { id },
  });
}

// ============================================================================
// BATCH PROCESSING
// ============================================================================

export async function createBatchJob(
  configId: number,
  data: {
    documentIds: number[];
    extractionTemplateId?: number;
    settings?: Prisma.InputJsonValue;
  },
) {
  const job = await prisma.documentBatchJob.create({
    data: {
      configId,
      totalDocuments: data.documentIds.length,
      extractionTemplateId: data.extractionTemplateId,
      settings: data.settings,
      status: 'PENDING',
    },
  });

  // Start batch processing asynchronously
  processBatchJob(job.id, data.documentIds).catch(console.error);

  return job;
}

async function processBatchJob(jobId: number, documentIds: number[]) {
  await prisma.documentBatchJob.update({
    where: { id: jobId },
    data: {
      status: 'PROCESSING',
      startedAt: new Date(),
    },
  });

  let processedCount = 0;
  let successCount = 0;
  let failedCount = 0;
  const errorLog: Array<{ documentId: number; error: string }> = [];

  for (const documentId of documentIds) {
    try {
      await analyzeDocument(documentId);
      successCount++;
    } catch (error) {
      failedCount++;
      errorLog.push({
        documentId,
        error: (error as Error).message,
      });
    }

    processedCount++;

    // Update progress
    await prisma.documentBatchJob.update({
      where: { id: jobId },
      data: {
        processedDocuments: processedCount,
        successfulDocuments: successCount,
        failedDocuments: failedCount,
      },
    });
  }

  // Mark job as complete
  await prisma.documentBatchJob.update({
    where: { id: jobId },
    data: {
      status: failedCount > 0 && successCount === 0 ? 'FAILED' : 'COMPLETED',
      completedAt: new Date(),
      errorLog:
        errorLog.length > 0 ? (errorLog as Prisma.InputJsonValue) : undefined,
    },
  });
}

export async function getBatchJob(id: number) {
  return prisma.documentBatchJob.findUnique({
    where: { id },
    include: {
      config: {
        include: {
          client: { select: { id: true, name: true } },
        },
      },
    },
  });
}

export async function getBatchJobs(
  configId: number,
  options: {
    status?: AnalysisStatus;
    limit?: number;
    offset?: number;
  } = {},
) {
  const { status, limit = 50, offset = 0 } = options;

  return prisma.documentBatchJob.findMany({
    where: {
      configId,
      ...(status && { status }),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}

// ============================================================================
// VERSION COMPARISON
// ============================================================================

export async function compareDocumentVersions(
  currentDocId: number,
  previousDocId: number,
): Promise<{
  added: string[];
  removed: string[];
  changed: Array<{ field: string; oldValue: string; newValue: string }>;
}> {
  const [current, previous] = await Promise.all([
    prisma.analyzedDocument.findUnique({ where: { id: currentDocId } }),
    prisma.analyzedDocument.findUnique({ where: { id: previousDocId } }),
  ]);

  if (!current || !previous) {
    throw new Error('One or both documents not found');
  }

  const currentFields =
    (current.extractedFields as Record<string, { value: string }>) || {};
  const previousFields =
    (previous.extractedFields as Record<string, { value: string }>) || {};

  const added: string[] = [];
  const removed: string[] = [];
  const changed: Array<{ field: string; oldValue: string; newValue: string }> =
    [];

  // Find added and changed fields
  for (const [key, value] of Object.entries(currentFields)) {
    if (!previousFields[key]) {
      added.push(key);
    } else if (previousFields[key].value !== value.value) {
      changed.push({
        field: key,
        oldValue: previousFields[key].value,
        newValue: value.value,
      });
    }
  }

  // Find removed fields
  for (const key of Object.keys(previousFields)) {
    if (!currentFields[key]) {
      removed.push(key);
    }
  }

  // Update current document with comparison results
  await prisma.analyzedDocument.update({
    where: { id: currentDocId },
    data: {
      previousVersionId: previousDocId,
      changesSummary: { added, removed, changed } as Prisma.InputJsonValue,
    },
  });

  return { added, removed, changed };
}
