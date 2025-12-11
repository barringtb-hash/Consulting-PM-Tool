/**
 * Export Service
 *
 * Handles exporting reports and data to various formats:
 * - CSV
 * - Excel (XLSX)
 * - PDF
 */

import type { ReportColumn, ExportOptions } from '../analytics/analytics.types';

// ============================================================================
// CSV EXPORT
// ============================================================================

/**
 * Export data to CSV format.
 */
export function exportToCsv(
  columns: ReportColumn[],
  rows: Record<string, unknown>[],
  options: ExportOptions = { format: 'CSV' },
): string {
  const includeHeaders = options.includeHeaders !== false;
  const dateFormat = options.dateFormat || 'YYYY-MM-DD';

  const lines: string[] = [];

  // Add headers
  if (includeHeaders) {
    const headers = columns.map((col) => escapeCSV(col.label));
    lines.push(headers.join(','));
  }

  // Add data rows
  for (const row of rows) {
    const values = columns.map((col) => {
      const value = row[col.field];
      return formatCsvValue(value, col.type, dateFormat);
    });
    lines.push(values.join(','));
  }

  return lines.join('\n');
}

/**
 * Format a value for CSV output.
 */
function formatCsvValue(
  value: unknown,
  type: string,
  dateFormat: string,
): string {
  if (value === null || value === undefined) {
    return '';
  }

  switch (type) {
    case 'DATE':
      return escapeCSV(formatDate(value as Date | string, dateFormat));
    case 'CURRENCY':
      return escapeCSV(formatCurrency(value as number));
    case 'PERCENTAGE':
      return escapeCSV(`${(value as number).toFixed(2)}%`);
    case 'BOOLEAN':
      return value ? 'Yes' : 'No';
    case 'NUMBER':
      return String(value);
    default:
      return escapeCSV(String(value));
  }
}

/**
 * Escape a value for CSV.
 */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ============================================================================
// EXCEL EXPORT
// ============================================================================

/**
 * Export data to Excel format.
 * Returns a JSON structure that can be converted to XLSX on the client
 * or using a library like exceljs.
 */
export function exportToExcel(
  columns: ReportColumn[],
  rows: Record<string, unknown>[],
  options: ExportOptions = { format: 'EXCEL' },
): {
  sheets: Array<{
    name: string;
    columns: Array<{
      header: string;
      key: string;
      width: number;
      type: string;
    }>;
    rows: Record<string, unknown>[];
  }>;
  metadata: { filename: string; createdAt: string };
} {
  const dateFormat = options.dateFormat || 'YYYY-MM-DD';

  const sheetColumns = columns.map((col) => ({
    header: col.label,
    key: col.field,
    width: col.width || 15,
    type: col.type,
  }));

  const formattedRows = rows.map((row) => {
    const formattedRow: Record<string, unknown> = {};

    for (const col of columns) {
      const value = row[col.field];

      switch (col.type) {
        case 'DATE':
          formattedRow[col.field] = value
            ? formatDate(value as Date | string, dateFormat)
            : null;
          break;
        case 'CURRENCY':
          formattedRow[col.field] = value as number;
          break;
        case 'PERCENTAGE':
          formattedRow[col.field] = value as number;
          break;
        default:
          formattedRow[col.field] = value;
      }
    }

    return formattedRow;
  });

  return {
    sheets: [
      {
        name: 'Report',
        columns: sheetColumns,
        rows: formattedRows,
      },
    ],
    metadata: {
      filename: options.filename || `report_${Date.now()}.xlsx`,
      createdAt: new Date().toISOString(),
    },
  };
}

/**
 * Generate Excel file bytes using a simple XML-based XLSX format.
 * For production, consider using a library like exceljs or xlsx.
 */
export function generateExcelXml(
  columns: ReportColumn[],
  rows: Record<string, unknown>[],
  options: ExportOptions = { format: 'EXCEL' },
): string {
  const dateFormat = options.dateFormat || 'YYYY-MM-DD';

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<?mso-application progid="Excel.Sheet"?>\n';
  xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n';
  xml += '  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n';
  xml += '  <Worksheet ss:Name="Report">\n';
  xml += '    <Table>\n';

  // Headers
  xml += '      <Row>\n';
  for (const col of columns) {
    xml += `        <Cell><Data ss:Type="String">${escapeXml(col.label)}</Data></Cell>\n`;
  }
  xml += '      </Row>\n';

  // Data rows
  for (const row of rows) {
    xml += '      <Row>\n';
    for (const col of columns) {
      const value = row[col.field];
      const { type, formattedValue } = formatExcelValue(
        value,
        col.type,
        dateFormat,
      );
      xml += `        <Cell><Data ss:Type="${type}">${escapeXml(formattedValue)}</Data></Cell>\n`;
    }
    xml += '      </Row>\n';
  }

  xml += '    </Table>\n';
  xml += '  </Worksheet>\n';
  xml += '</Workbook>';

  return xml;
}

/**
 * Format a value for Excel XML.
 */
function formatExcelValue(
  value: unknown,
  type: string,
  _dateFormat: string,
): { type: string; formattedValue: string } {
  if (value === null || value === undefined) {
    return { type: 'String', formattedValue: '' };
  }

  switch (type) {
    case 'NUMBER':
    case 'CURRENCY':
    case 'PERCENTAGE':
      return { type: 'Number', formattedValue: String(value) };
    case 'DATE':
      return {
        type: 'DateTime',
        formattedValue: formatDate(
          value as Date | string,
          'YYYY-MM-DDTHH:mm:ss',
        ),
      };
    case 'BOOLEAN':
      return { type: 'Boolean', formattedValue: value ? '1' : '0' };
    default:
      return { type: 'String', formattedValue: String(value) };
  }
}

/**
 * Escape XML special characters.
 */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ============================================================================
// PDF EXPORT
// ============================================================================

/**
 * Export data to PDF format.
 * Returns HTML that can be converted to PDF using a library like puppeteer or wkhtmltopdf.
 */
export function exportToPdfHtml(
  columns: ReportColumn[],
  rows: Record<string, unknown>[],
  options: ExportOptions & { title?: string; subtitle?: string } = {
    format: 'PDF',
  },
): string {
  const dateFormat = options.dateFormat || 'YYYY-MM-DD';
  const title = options.title || 'Report';
  const subtitle =
    options.subtitle || `Generated on ${new Date().toLocaleDateString()}`;

  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      font-size: 12px;
      margin: 20px;
    }
    h1 {
      font-size: 18px;
      margin-bottom: 5px;
    }
    .subtitle {
      font-size: 11px;
      color: #666;
      margin-bottom: 20px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #f5f5f5;
      font-weight: bold;
    }
    tr:nth-child(even) {
      background-color: #fafafa;
    }
    .number, .currency, .percentage {
      text-align: right;
    }
    .footer {
      margin-top: 20px;
      font-size: 10px;
      color: #666;
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="subtitle">${escapeHtml(subtitle)}</div>

  <table>
    <thead>
      <tr>
`;

  // Headers
  for (const col of columns) {
    const className =
      col.type === 'NUMBER' ||
      col.type === 'CURRENCY' ||
      col.type === 'PERCENTAGE'
        ? 'number'
        : '';
    html += `        <th class="${className}">${escapeHtml(col.label)}</th>\n`;
  }

  html += `
      </tr>
    </thead>
    <tbody>
`;

  // Data rows
  for (const row of rows) {
    html += '      <tr>\n';
    for (const col of columns) {
      const value = row[col.field];
      const formattedValue = formatPdfValue(value, col.type, dateFormat);
      const className =
        col.type === 'NUMBER' ||
        col.type === 'CURRENCY' ||
        col.type === 'PERCENTAGE'
          ? col.type.toLowerCase()
          : '';
      html += `        <td class="${className}">${escapeHtml(formattedValue)}</td>\n`;
    }
    html += '      </tr>\n';
  }

  html += `
    </tbody>
  </table>

  <div class="footer">
    Total rows: ${rows.length}
  </div>
</body>
</html>
`;

  return html;
}

/**
 * Format a value for PDF output.
 */
function formatPdfValue(
  value: unknown,
  type: string,
  dateFormat: string,
): string {
  if (value === null || value === undefined) {
    return '-';
  }

  switch (type) {
    case 'DATE':
      return formatDate(value as Date | string, dateFormat);
    case 'CURRENCY':
      return formatCurrency(value as number);
    case 'PERCENTAGE':
      return `${(value as number).toFixed(2)}%`;
    case 'BOOLEAN':
      return value ? 'Yes' : 'No';
    case 'NUMBER':
      return formatNumber(value as number);
    default:
      return String(value);
  }
}

/**
 * Escape HTML special characters.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ============================================================================
// FORMATTING HELPERS
// ============================================================================

/**
 * Format a date value.
 */
function formatDate(value: Date | string, format: string): string {
  const date = typeof value === 'string' ? new Date(value) : value;

  if (isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * Format a currency value.
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

/**
 * Format a number value.
 */
function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

// ============================================================================
// EXPORT UTILITIES
// ============================================================================

/**
 * Get content type for export format.
 */
export function getContentType(format: 'CSV' | 'EXCEL' | 'PDF'): string {
  switch (format) {
    case 'CSV':
      return 'text/csv';
    case 'EXCEL':
      return 'application/vnd.ms-excel';
    case 'PDF':
      return 'application/pdf';
    default:
      return 'text/plain';
  }
}

/**
 * Get file extension for export format.
 */
export function getFileExtension(format: 'CSV' | 'EXCEL' | 'PDF'): string {
  switch (format) {
    case 'CSV':
      return 'csv';
    case 'EXCEL':
      return 'xls';
    case 'PDF':
      return 'pdf';
    default:
      return 'txt';
  }
}
