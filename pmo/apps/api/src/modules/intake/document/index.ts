/**
 * Document Intelligence Module Exports
 *
 * Central export point for document processing features.
 */

export {
  extractFromDocument,
  classifyDocument,
  mapExtractedToFormFields,
  getExtractionTemplate,
  getAvailableDocumentTypes,
  type DocumentType,
  type ExtractionField,
  type ExtractionResult,
  type ExtractionTemplate,
} from './document-extraction.service';
