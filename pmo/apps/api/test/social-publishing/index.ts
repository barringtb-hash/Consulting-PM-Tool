/**
 * Social Publishing Test Suite
 *
 * Comprehensive unit tests for the social publishing module.
 * All tests use mocks to isolate units under test from external dependencies.
 *
 * Total: 173 tests across 4 files
 *
 * Test files:
 *
 * - ayrshare.adapter.test.ts - Ayrshare API adapter unit tests (37 tests)
 *   - Constructor options (API key, logger)
 *   - Publishing to single/multiple platforms
 *   - Scheduled posts with platform-specific scheduling
 *   - Post deletion by reference ID
 *   - Connected platforms retrieval
 *   - Post metrics retrieval
 *   - Error handling (AUTH_ERROR, RATE_LIMIT, INVALID_CONTENT, PLATFORM_UNAVAILABLE, NETWORK_ERROR)
 *   - Mocks: global.fetch for HTTP requests
 *
 * - social-publishing.service.test.ts - Service layer tests (44 tests)
 *   - Configuration CRUD (create, update, sync platforms)
 *   - Post CRUD (create, read, list, update, delete)
 *   - Publishing workflow (publish, partial success, failure)
 *   - Scheduling (schedule, cancel scheduled posts)
 *   - Metrics synchronization (fetch from adapter, update database)
 *   - Mocks: Prisma client, AyrshareAdapter
 *
 * - social-publishing.router.test.ts - Validation and error handling tests (79 tests)
 *   - Zod validation schemas for all API endpoints
 *   - configCreateUpdateSchema validation
 *   - postCreateSchema validation (content, platforms, media, scheduling)
 *   - postUpdateSchema validation (partial updates)
 *   - postListQuerySchema validation (filters, pagination, sorting)
 *   - publishNowSchema, schedulePostSchema, cancelPostSchema validation
 *   - metricsQuerySchema, historyQuerySchema validation
 *   - PublishingError type mapping to HTTP status codes
 *   - Input transformation (platform names, status values, ID parsing)
 *
 * - workers.test.ts - BullMQ worker tests (13 tests)
 *   - Publish worker creation and event handling
 *   - Scheduled post worker creation
 *   - Worker processor registration
 *   - Rate limiting configuration verification
 *   - Mocks: BullMQ Worker/Queue, Redis client, Prisma client
 *
 * Run all social publishing tests:
 *   npm run test --workspace pmo-api -- test/social-publishing
 *
 * Run specific test file:
 *   npm run test --workspace pmo-api -- test/social-publishing/ayrshare.adapter.test.ts
 *
 * Run with coverage:
 *   npm run test --workspace pmo-api -- test/social-publishing --coverage
 */
