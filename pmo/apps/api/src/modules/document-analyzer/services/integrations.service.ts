/**
 * Document Integration Service
 *
 * Provides integration framework for connecting document analyzer
 * with external business systems like QuickBooks, Xero, Salesforce,
 * DocuSign, and cloud storage providers.
 */

import { IntegrationType } from '@prisma/client';
import { prisma } from '../../../prisma/client';

// ============================================================================
// TYPES
// ============================================================================

export interface IntegrationConfig {
  integrationType: IntegrationType;
  name: string;
  description: string;
  authType: 'oauth2' | 'api_key' | 'basic' | 'webhook';
  oauthScopes?: string[];
  requiredFields: string[];
  optionalFields: string[];
  supportedActions: IntegrationAction[];
  fieldMappings: FieldMapping[];
}

export interface IntegrationAction {
  action: 'export_invoice' | 'export_document' | 'sync_contacts' | 'send_notification' | 'request_signature' | 'upload_file';
  label: string;
  description: string;
  requiredFields: string[];
  supportedCategories: string[];
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transformer?: 'string' | 'number' | 'date' | 'currency' | 'custom';
  customTransformer?: string;
}

export interface IntegrationCredentials {
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  webhookUrl?: string;
  webhookSecret?: string;
  additionalConfig?: Record<string, string>;
}

export interface SyncResult {
  success: boolean;
  externalId?: string;
  message: string;
  syncedAt: Date;
  data?: Record<string, unknown>;
}

// ============================================================================
// INTEGRATION CONFIGURATIONS
// ============================================================================

export const INTEGRATION_CONFIGS: Record<IntegrationType, IntegrationConfig> = {
  QUICKBOOKS: {
    integrationType: 'QUICKBOOKS',
    name: 'QuickBooks Online',
    description: 'Sync invoices and bills with QuickBooks Online accounting software',
    authType: 'oauth2',
    oauthScopes: ['com.intuit.quickbooks.accounting'],
    requiredFields: ['clientId', 'clientSecret'],
    optionalFields: ['companyId'],
    supportedActions: [
      {
        action: 'export_invoice',
        label: 'Export Invoice to QuickBooks',
        description: 'Create a bill or invoice in QuickBooks from analyzed document',
        requiredFields: ['vendorName', 'invoiceNumber', 'totalAmount', 'invoiceDate'],
        supportedCategories: ['INVOICE'],
      },
      {
        action: 'sync_contacts',
        label: 'Sync Vendors/Customers',
        description: 'Sync vendor and customer information',
        requiredFields: ['vendorName'],
        supportedCategories: ['INVOICE', 'CONTRACT'],
      },
    ],
    fieldMappings: [
      { sourceField: 'vendorName', targetField: 'VendorRef.name', transformer: 'string' },
      { sourceField: 'invoiceNumber', targetField: 'DocNumber', transformer: 'string' },
      { sourceField: 'totalAmount', targetField: 'TotalAmt', transformer: 'number' },
      { sourceField: 'invoiceDate', targetField: 'TxnDate', transformer: 'date' },
      { sourceField: 'dueDate', targetField: 'DueDate', transformer: 'date' },
      { sourceField: 'lineItems', targetField: 'Line', transformer: 'custom' },
    ],
  },

  XERO: {
    integrationType: 'XERO',
    name: 'Xero',
    description: 'Sync invoices and bills with Xero accounting software',
    authType: 'oauth2',
    oauthScopes: ['accounting.transactions', 'accounting.contacts'],
    requiredFields: ['clientId', 'clientSecret'],
    optionalFields: ['tenantId'],
    supportedActions: [
      {
        action: 'export_invoice',
        label: 'Export Invoice to Xero',
        description: 'Create a bill or invoice in Xero from analyzed document',
        requiredFields: ['vendorName', 'invoiceNumber', 'totalAmount'],
        supportedCategories: ['INVOICE'],
      },
    ],
    fieldMappings: [
      { sourceField: 'vendorName', targetField: 'Contact.Name', transformer: 'string' },
      { sourceField: 'invoiceNumber', targetField: 'InvoiceNumber', transformer: 'string' },
      { sourceField: 'totalAmount', targetField: 'Total', transformer: 'number' },
      { sourceField: 'invoiceDate', targetField: 'Date', transformer: 'date' },
      { sourceField: 'dueDate', targetField: 'DueDate', transformer: 'date' },
    ],
  },

  SALESFORCE: {
    integrationType: 'SALESFORCE',
    name: 'Salesforce',
    description: 'Sync documents and contracts with Salesforce CRM',
    authType: 'oauth2',
    oauthScopes: ['api', 'refresh_token'],
    requiredFields: ['clientId', 'clientSecret', 'instanceUrl'],
    optionalFields: [],
    supportedActions: [
      {
        action: 'export_document',
        label: 'Attach to Salesforce Record',
        description: 'Attach analyzed document to a Salesforce record',
        requiredFields: [],
        supportedCategories: ['CONTRACT', 'INVOICE', 'COMPLIANCE'],
      },
      {
        action: 'sync_contacts',
        label: 'Sync Contacts',
        description: 'Create or update contacts from document data',
        requiredFields: ['customerName'],
        supportedCategories: ['CONTRACT', 'INVOICE'],
      },
    ],
    fieldMappings: [
      { sourceField: 'customerName', targetField: 'Name', transformer: 'string' },
      { sourceField: 'contractValue', targetField: 'Amount', transformer: 'currency' },
      { sourceField: 'effectiveDate', targetField: 'ContractStartDate', transformer: 'date' },
      { sourceField: 'expirationDate', targetField: 'ContractEndDate', transformer: 'date' },
    ],
  },

  DOCUSIGN: {
    integrationType: 'DOCUSIGN',
    name: 'DocuSign',
    description: 'Send documents for electronic signature via DocuSign',
    authType: 'oauth2',
    oauthScopes: ['signature', 'impersonation'],
    requiredFields: ['clientId', 'clientSecret', 'accountId'],
    optionalFields: ['userId'],
    supportedActions: [
      {
        action: 'request_signature',
        label: 'Send for Signature',
        description: 'Send document for electronic signature',
        requiredFields: [],
        supportedCategories: ['CONTRACT'],
      },
    ],
    fieldMappings: [
      { sourceField: 'contractParties', targetField: 'recipients', transformer: 'custom' },
      { sourceField: 'filename', targetField: 'documentName', transformer: 'string' },
    ],
  },

  GOOGLE_DRIVE: {
    integrationType: 'GOOGLE_DRIVE',
    name: 'Google Drive',
    description: 'Sync documents with Google Drive for backup and sharing',
    authType: 'oauth2',
    oauthScopes: ['https://www.googleapis.com/auth/drive.file'],
    requiredFields: ['clientId', 'clientSecret'],
    optionalFields: ['folderId'],
    supportedActions: [
      {
        action: 'upload_file',
        label: 'Upload to Google Drive',
        description: 'Upload analyzed document to Google Drive',
        requiredFields: [],
        supportedCategories: ['INVOICE', 'CONTRACT', 'COMPLIANCE', 'HEALTHCARE', 'LEGAL', 'FINANCIAL', 'REAL_ESTATE', 'MANUFACTURING', 'GENERAL', 'OTHER'],
      },
    ],
    fieldMappings: [
      { sourceField: 'filename', targetField: 'name', transformer: 'string' },
      { sourceField: 'category', targetField: 'folderPath', transformer: 'string' },
    ],
  },

  SHAREPOINT: {
    integrationType: 'SHAREPOINT',
    name: 'Microsoft SharePoint',
    description: 'Sync documents with SharePoint for enterprise document management',
    authType: 'oauth2',
    oauthScopes: ['Sites.ReadWrite.All', 'Files.ReadWrite.All'],
    requiredFields: ['clientId', 'clientSecret', 'tenantId', 'siteId'],
    optionalFields: ['driveId'],
    supportedActions: [
      {
        action: 'upload_file',
        label: 'Upload to SharePoint',
        description: 'Upload analyzed document to SharePoint',
        requiredFields: [],
        supportedCategories: ['INVOICE', 'CONTRACT', 'COMPLIANCE', 'HEALTHCARE', 'LEGAL', 'FINANCIAL', 'REAL_ESTATE', 'MANUFACTURING', 'GENERAL', 'OTHER'],
      },
    ],
    fieldMappings: [
      { sourceField: 'filename', targetField: 'name', transformer: 'string' },
      { sourceField: 'category', targetField: 'folder', transformer: 'string' },
    ],
  },

  DROPBOX: {
    integrationType: 'DROPBOX',
    name: 'Dropbox',
    description: 'Sync documents with Dropbox cloud storage',
    authType: 'oauth2',
    oauthScopes: ['files.content.write', 'files.content.read'],
    requiredFields: ['clientId', 'clientSecret'],
    optionalFields: ['rootPath'],
    supportedActions: [
      {
        action: 'upload_file',
        label: 'Upload to Dropbox',
        description: 'Upload analyzed document to Dropbox',
        requiredFields: [],
        supportedCategories: ['INVOICE', 'CONTRACT', 'COMPLIANCE', 'HEALTHCARE', 'LEGAL', 'FINANCIAL', 'REAL_ESTATE', 'MANUFACTURING', 'GENERAL', 'OTHER'],
      },
    ],
    fieldMappings: [
      { sourceField: 'filename', targetField: 'path', transformer: 'string' },
    ],
  },

  SLACK: {
    integrationType: 'SLACK',
    name: 'Slack',
    description: 'Send notifications and alerts to Slack channels',
    authType: 'oauth2',
    oauthScopes: ['chat:write', 'chat:write.public'],
    requiredFields: ['webhookUrl'],
    optionalFields: ['channelId', 'botToken'],
    supportedActions: [
      {
        action: 'send_notification',
        label: 'Send Slack Notification',
        description: 'Send notification about document processing to Slack',
        requiredFields: [],
        supportedCategories: ['INVOICE', 'CONTRACT', 'COMPLIANCE', 'HEALTHCARE', 'LEGAL', 'FINANCIAL', 'REAL_ESTATE', 'MANUFACTURING', 'GENERAL', 'OTHER'],
      },
    ],
    fieldMappings: [
      { sourceField: 'filename', targetField: 'text', transformer: 'string' },
      { sourceField: 'documentType', targetField: 'blocks[0].text', transformer: 'string' },
    ],
  },

  WEBHOOK: {
    integrationType: 'WEBHOOK',
    name: 'Custom Webhook',
    description: 'Send document data to custom webhook endpoints',
    authType: 'webhook',
    requiredFields: ['webhookUrl'],
    optionalFields: ['webhookSecret', 'headers'],
    supportedActions: [
      {
        action: 'export_document',
        label: 'Send to Webhook',
        description: 'POST document data to custom webhook',
        requiredFields: [],
        supportedCategories: ['INVOICE', 'CONTRACT', 'COMPLIANCE', 'HEALTHCARE', 'LEGAL', 'FINANCIAL', 'REAL_ESTATE', 'MANUFACTURING', 'GENERAL', 'OTHER'],
      },
    ],
    fieldMappings: [],
  },

  API: {
    integrationType: 'API',
    name: 'Custom API',
    description: 'Connect to custom REST APIs',
    authType: 'api_key',
    requiredFields: ['apiKey', 'baseUrl'],
    optionalFields: ['headers', 'authHeader'],
    supportedActions: [
      {
        action: 'export_document',
        label: 'Send to API',
        description: 'Send document data to custom API endpoint',
        requiredFields: [],
        supportedCategories: ['INVOICE', 'CONTRACT', 'COMPLIANCE', 'HEALTHCARE', 'LEGAL', 'FINANCIAL', 'REAL_ESTATE', 'MANUFACTURING', 'GENERAL', 'OTHER'],
      },
    ],
    fieldMappings: [],
  },
};

// ============================================================================
// INTEGRATION SERVICE
// ============================================================================

/**
 * Get integration configuration for a type
 */
export function getIntegrationConfig(type: IntegrationType): IntegrationConfig {
  return INTEGRATION_CONFIGS[type];
}

/**
 * Get all available integrations
 */
export function getAllIntegrationConfigs(): IntegrationConfig[] {
  return Object.values(INTEGRATION_CONFIGS);
}

/**
 * Create or update an integration for a config
 */
export async function upsertIntegration(
  configId: number,
  integrationType: IntegrationType,
  name: string,
  credentials: IntegrationCredentials,
  settings?: Record<string, unknown>,
) {
  const existing = await prisma.documentIntegration.findUnique({
    where: {
      configId_integrationType: {
        configId,
        integrationType,
      },
    },
  });

  if (existing) {
    return prisma.documentIntegration.update({
      where: { id: existing.id },
      data: {
        name,
        credentials: credentials as unknown as Record<string, unknown>,
        accessToken: credentials.accessToken,
        refreshToken: credentials.refreshToken,
        tokenExpiresAt: credentials.tokenExpiresAt,
        webhookUrl: credentials.webhookUrl,
        webhookSecret: credentials.webhookSecret,
        settings: settings as unknown as Record<string, unknown>,
        updatedAt: new Date(),
      },
    });
  }

  return prisma.documentIntegration.create({
    data: {
      configId,
      integrationType,
      name,
      credentials: credentials as unknown as Record<string, unknown>,
      accessToken: credentials.accessToken,
      refreshToken: credentials.refreshToken,
      tokenExpiresAt: credentials.tokenExpiresAt,
      webhookUrl: credentials.webhookUrl,
      webhookSecret: credentials.webhookSecret,
      settings: settings as unknown as Record<string, unknown>,
    },
  });
}

/**
 * Get integrations for a config
 */
export async function getIntegrations(configId: number) {
  return prisma.documentIntegration.findMany({
    where: { configId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Delete an integration
 */
export async function deleteIntegration(id: number) {
  return prisma.documentIntegration.delete({
    where: { id },
  });
}

/**
 * Test integration connection
 */
export async function testIntegration(
  integrationType: IntegrationType,
  credentials: IntegrationCredentials,
): Promise<{ success: boolean; message: string }> {
  const config = INTEGRATION_CONFIGS[integrationType];

  switch (integrationType) {
    case 'WEBHOOK':
      return testWebhookIntegration(credentials);
    case 'SLACK':
      return testSlackIntegration(credentials);
    case 'API':
      return testAPIIntegration(credentials);
    default:
      // OAuth integrations require redirect flow
      return {
        success: true,
        message: `${config.name} requires OAuth authentication. Redirect user to authorization flow.`,
      };
  }
}

async function testWebhookIntegration(
  credentials: IntegrationCredentials,
): Promise<{ success: boolean; message: string }> {
  if (!credentials.webhookUrl) {
    return { success: false, message: 'Webhook URL is required' };
  }

  try {
    const response = await fetch(credentials.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(credentials.webhookSecret && {
          'X-Webhook-Secret': credentials.webhookSecret,
        }),
      },
      body: JSON.stringify({
        type: 'test',
        timestamp: new Date().toISOString(),
        message: 'Document Analyzer integration test',
      }),
    });

    if (response.ok) {
      return { success: true, message: 'Webhook test successful' };
    }

    return {
      success: false,
      message: `Webhook returned status ${response.status}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Webhook test failed: ${(error as Error).message}`,
    };
  }
}

async function testSlackIntegration(
  credentials: IntegrationCredentials,
): Promise<{ success: boolean; message: string }> {
  if (!credentials.webhookUrl) {
    return { success: false, message: 'Slack webhook URL is required' };
  }

  try {
    const response = await fetch(credentials.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: '✅ Document Analyzer integration test successful!',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*Document Analyzer Integration Test*\nYour Slack integration is configured correctly.',
            },
          },
        ],
      }),
    });

    if (response.ok) {
      return { success: true, message: 'Slack test message sent' };
    }

    return {
      success: false,
      message: `Slack returned status ${response.status}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Slack test failed: ${(error as Error).message}`,
    };
  }
}

async function testAPIIntegration(
  credentials: IntegrationCredentials,
): Promise<{ success: boolean; message: string }> {
  if (!credentials.apiKey || !credentials.additionalConfig?.baseUrl) {
    return { success: false, message: 'API key and base URL are required' };
  }

  try {
    const response = await fetch(credentials.additionalConfig.baseUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${credentials.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      return { success: true, message: 'API connection successful' };
    }

    return {
      success: false,
      message: `API returned status ${response.status}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `API test failed: ${(error as Error).message}`,
    };
  }
}

/**
 * Sync document to integration
 */
export async function syncDocumentToIntegration(
  integrationId: number,
  documentData: Record<string, unknown>,
): Promise<SyncResult> {
  const integration = await prisma.documentIntegration.findUnique({
    where: { id: integrationId },
  });

  if (!integration) {
    return {
      success: false,
      message: 'Integration not found',
      syncedAt: new Date(),
    };
  }

  if (!integration.isActive) {
    return {
      success: false,
      message: 'Integration is disabled',
      syncedAt: new Date(),
    };
  }

  const config = INTEGRATION_CONFIGS[integration.integrationType];

  try {
    let result: SyncResult;

    switch (integration.integrationType) {
      case 'WEBHOOK':
        result = await syncToWebhook(integration, documentData);
        break;
      case 'SLACK':
        result = await syncToSlack(integration, documentData);
        break;
      default:
        result = {
          success: false,
          message: `Sync for ${config.name} not yet implemented`,
          syncedAt: new Date(),
        };
    }

    // Update sync stats
    if (result.success) {
      await prisma.documentIntegration.update({
        where: { id: integrationId },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: 'SUCCESS',
          documentsExported: { increment: 1 },
        },
      });
    } else {
      await prisma.documentIntegration.update({
        where: { id: integrationId },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: 'FAILED',
          lastSyncError: result.message,
        },
      });
    }

    return result;
  } catch (error) {
    const errorMessage = (error as Error).message;

    await prisma.documentIntegration.update({
      where: { id: integrationId },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: 'FAILED',
        lastSyncError: errorMessage,
      },
    });

    return {
      success: false,
      message: `Sync failed: ${errorMessage}`,
      syncedAt: new Date(),
    };
  }
}

async function syncToWebhook(
  integration: { webhookUrl: string | null; webhookSecret: string | null },
  documentData: Record<string, unknown>,
): Promise<SyncResult> {
  if (!integration.webhookUrl) {
    return {
      success: false,
      message: 'Webhook URL not configured',
      syncedAt: new Date(),
    };
  }

  const response = await fetch(integration.webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(integration.webhookSecret && {
        'X-Webhook-Secret': integration.webhookSecret,
      }),
    },
    body: JSON.stringify({
      type: 'document_processed',
      timestamp: new Date().toISOString(),
      data: documentData,
    }),
  });

  if (response.ok) {
    const responseData = await response.json().catch(() => ({}));
    return {
      success: true,
      message: 'Document synced to webhook',
      syncedAt: new Date(),
      externalId: responseData.id,
      data: responseData,
    };
  }

  return {
    success: false,
    message: `Webhook returned status ${response.status}`,
    syncedAt: new Date(),
  };
}

async function syncToSlack(
  integration: { webhookUrl: string | null },
  documentData: Record<string, unknown>,
): Promise<SyncResult> {
  if (!integration.webhookUrl) {
    return {
      success: false,
      message: 'Slack webhook URL not configured',
      syncedAt: new Date(),
    };
  }

  const filename = documentData.filename || 'Unknown document';
  const category = documentData.category || 'GENERAL';
  const status = documentData.status || 'COMPLETED';
  const confidence = documentData.documentTypeConfidence || 0;

  const response = await fetch(integration.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '📄 Document Processed',
          },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*File:*\n${filename}` },
            { type: 'mrkdwn', text: `*Category:*\n${category}` },
            { type: 'mrkdwn', text: `*Status:*\n${status}` },
            { type: 'mrkdwn', text: `*Confidence:*\n${Math.round((confidence as number) * 100)}%` },
          ],
        },
      ],
    }),
  });

  if (response.ok) {
    return {
      success: true,
      message: 'Notification sent to Slack',
      syncedAt: new Date(),
    };
  }

  return {
    success: false,
    message: `Slack returned status ${response.status}`,
    syncedAt: new Date(),
  };
}

/**
 * Get OAuth authorization URL for an integration
 */
export function getOAuthAuthorizationUrl(
  integrationType: IntegrationType,
  credentials: IntegrationCredentials,
  redirectUri: string,
  state: string,
): string | null {
  const config = INTEGRATION_CONFIGS[integrationType];

  if (config.authType !== 'oauth2') {
    return null;
  }

  const scopes = config.oauthScopes?.join(' ') || '';

  switch (integrationType) {
    case 'QUICKBOOKS':
      return `https://appcenter.intuit.com/connect/oauth2?client_id=${credentials.clientId}&response_type=code&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

    case 'XERO':
      return `https://login.xero.com/identity/connect/authorize?client_id=${credentials.clientId}&response_type=code&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

    case 'SALESFORCE':
      return `https://login.salesforce.com/services/oauth2/authorize?client_id=${credentials.clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

    case 'DOCUSIGN':
      return `https://account.docusign.com/oauth/auth?client_id=${credentials.clientId}&response_type=code&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

    case 'GOOGLE_DRIVE':
      return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${credentials.clientId}&response_type=code&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&access_type=offline&prompt=consent`;

    case 'SHAREPOINT':
      const tenantId = credentials.additionalConfig?.tenantId || 'common';
      return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?client_id=${credentials.clientId}&response_type=code&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

    case 'DROPBOX':
      return `https://www.dropbox.com/oauth2/authorize?client_id=${credentials.clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

    default:
      return null;
  }
}
