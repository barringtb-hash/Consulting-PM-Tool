# API Versioning Strategy

## Overview

This document outlines the API versioning strategy for the AI CRM Platform. As the platform evolves, we need to ensure backward compatibility for existing clients while allowing new features and breaking changes to be introduced safely.

## Current State

The API currently operates without versioning at `/api/*`. All endpoints share a single version, which creates challenges when making breaking changes.

## Recommended Versioning Strategy

### URL Path Versioning

We recommend using URL path versioning as the primary strategy:

```
/api/v1/clients
/api/v1/projects
/api/v2/accounts
```

**Advantages:**
- Clear and explicit version in URL
- Easy to route in Express
- Simple for clients to understand
- Works well with documentation tools

### Implementation Plan

#### Phase 1: Add Version Prefix (Non-Breaking)

1. Create versioned route prefixes in `app.ts`:
   ```typescript
   // Legacy routes (maintain for backward compatibility)
   app.use('/api/clients', clientRouter);

   // Versioned routes
   app.use('/api/v1/clients', clientRouter);
   ```

2. Both paths work identically during transition period.

#### Phase 2: Deprecation Headers

Add deprecation headers to legacy routes:

```typescript
app.use('/api/clients', (req, res, next) => {
  res.setHeader('Deprecation', 'true');
  res.setHeader('Sunset', 'Sat, 31 Dec 2025 23:59:59 GMT');
  res.setHeader('Link', '</api/v1/clients>; rel="successor-version"');
  next();
}, clientRouter);
```

#### Phase 3: Version-Specific Changes

When breaking changes are needed:

1. Create a new version (v2) with the breaking changes
2. Keep v1 stable for existing clients
3. Document migration path from v1 to v2

### Version Support Policy

| Version | Status | Support Until |
|---------|--------|---------------|
| Unversioned (`/api/*`) | Deprecated | 6 months after v1 release |
| v1 | Current | Minimum 12 months |
| v2+ | Future | TBD |

## Breaking vs Non-Breaking Changes

### Non-Breaking Changes (Safe for any version)
- Adding new optional fields to responses
- Adding new endpoints
- Adding new optional query parameters
- Bug fixes that don't change behavior

### Breaking Changes (Require new version)
- Removing fields from responses
- Changing field types
- Renaming fields
- Changing error response format
- Removing endpoints
- Changing required parameters

## Response Format Standards

### Current State (Legacy)
```json
// Legacy format - varies by endpoint
{ "clients": [...], "pagination": {...} }
{ "error": "message" }
```

### v1 Standard Format
```json
// Success with data
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2
  }
}

// Error
{
  "errors": [
    {
      "code": "VALIDATION_ERROR",
      "message": "Invalid input",
      "field": "email"
    }
  ]
}
```

## Migration Guidelines for Clients

### Updating API Calls

1. Change base URL from `/api/` to `/api/v1/`
2. Update response parsing to use `data` instead of entity-specific keys
3. Update error handling to use `errors` array format
4. Update pagination handling to use `meta` instead of `pagination`

### Example Migration

**Before:**
```typescript
const response = await fetch('/api/clients');
const { clients, pagination } = await response.json();
```

**After:**
```typescript
const response = await fetch('/api/v1/clients');
const { data, meta } = await response.json();
// data contains clients array
// meta contains pagination info
```

## Documentation Requirements

Each API version should have:
1. OpenAPI/Swagger specification
2. Changelog documenting all changes
3. Migration guide from previous version
4. Example requests and responses

## Implementation Checklist

- [ ] Add `/api/v1/` route prefix support in `app.ts`
- [ ] Update frontend to use versioned endpoints (with fallback)
- [ ] Add deprecation headers to unversioned routes
- [ ] Create OpenAPI spec for v1
- [ ] Update CLAUDE.md with versioning information
- [ ] Set sunset date for unversioned endpoints

## References

- [REST API Versioning Best Practices](https://restfulapi.net/versioning/)
- [HTTP Deprecation Header RFC](https://datatracker.ietf.org/doc/html/draft-ietf-httpapi-deprecation-header)
