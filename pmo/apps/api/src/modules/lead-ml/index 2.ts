/**
 * Lead ML Module
 *
 * Machine Learning capabilities for Lead Scoring and Conversion Prediction.
 *
 * Features:
 * - Conversion probability prediction (LLM + rule-based)
 * - Time-to-close estimation
 * - Lead priority ranking
 * - Score explanation and feature importance
 * - Prediction validation and accuracy tracking
 *
 * @module lead-ml
 */

// Router
export { default as leadMLRouter } from './lead-ml.router';

// Types
export * from './types';

// Services
export * from './services';

// Prompts
export * from './prompts/lead-ml-prompts';
