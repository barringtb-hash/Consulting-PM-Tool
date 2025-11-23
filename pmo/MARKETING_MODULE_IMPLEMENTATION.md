# Marketing & Content Module - Implementation Guide

## Overview

The Marketing & Content module enables consultants to generate and repurpose marketing content from project and meeting data using AI (Anthropic Claude). This implementation extends the existing marketing content features with new capabilities for content generation and repurposing.

**Implementation Date:** November 23, 2025
**Phase:** Phase 1A + Repurposing
**Status:** ✅ Complete

---

## What Was Implemented

### ✅ Phase 1A - Core Enhancements

1. **Database Schema Updates**
   - Added `slug` field (optional, unique) to `MarketingContent`
   - Added `channel` field with new `ContentChannel` enum (WEB, LINKEDIN, INSTAGRAM, TWITTER, EMAIL, GENERIC)
   - Added `sourceContentId` for tracking content repurposing chains
   - Added `IDEA` and `READY` statuses to `ContentStatus` enum
   - Created self-referential relation for repurposed content tracking

2. **Backend API Endpoints**
   - `POST /api/projects/:projectId/marketing-contents/generate` - Generate from specific project
   - `POST /api/meetings/:meetingId/marketing-contents/generate` - Generate from specific meeting
   - `POST /api/marketing-contents/:id/repurpose` - Repurpose existing content

3. **Service Layer**
   - `repurposeContent()` function in `marketing.service.ts`
   - Enhanced context building for repurposing
   - Automatic channel assignment based on content type

4. **Frontend Components**
   - `GenerateFromProjectButton` - Drop-in button for project pages
   - `GenerateFromMeetingButton` - Drop-in button for meeting pages
   - `RepurposeContentButton` - Drop-in button for content repurposing
   - `GenerateMarketingContentModal` - Unified generation modal
   - `RepurposeContentModal` - Repurposing workflow modal

5. **Type System Updates**
   - New `ContentChannel` enum and labels
   - `RepurposeContentInput` interface
   - Updated schemas for all new fields
   - Helper function `getDefaultChannelForType()`

---

## Database Changes

### Migration: `20251123211300_add_marketing_content_enhancements`

```sql
-- Add new enum values
ALTER TYPE "ContentStatus" ADD VALUE 'IDEA';
ALTER TYPE "ContentStatus" ADD VALUE 'READY';

-- Create new enum
CREATE TYPE "ContentChannel" AS ENUM ('WEB', 'LINKEDIN', 'INSTAGRAM', 'TWITTER', 'EMAIL', 'GENERIC');

-- Add new columns
ALTER TABLE "MarketingContent"
  ADD COLUMN "slug" TEXT,
  ADD COLUMN "channel" "ContentChannel",
  ADD COLUMN "sourceContentId" INTEGER;

-- Create indexes
CREATE UNIQUE INDEX "MarketingContent_slug_key" ON "MarketingContent"("slug");
CREATE INDEX "MarketingContent_slug_idx" ON "MarketingContent"("slug");

-- Add foreign key
ALTER TABLE "MarketingContent"
  ADD CONSTRAINT "MarketingContent_sourceContentId_fkey"
  FOREIGN KEY ("sourceContentId")
  REFERENCES "MarketingContent"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
```

**To apply migration:**

```bash
cd /home/user/Consulting-PM-Tool/pmo
npx prisma migrate deploy
```

---

## API Reference

### 1. Generate from Project

**Endpoint:** `POST /api/projects/:projectId/marketing-contents/generate`

**Request Body:**

```typescript
{
  type: ContentType;              // Required: BLOG_POST, CASE_STUDY, etc.
  additionalContext?: string;     // Optional: Extra instructions
  tone?: 'professional' | 'casual' | 'technical' | 'enthusiastic';
  length?: 'short' | 'medium' | 'long';
}
```

**Response:**

```typescript
{
  generated: {
    title?: string;
    body: string;
    summary?: string;
    metadata?: Record<string, any>;
  }
}
```

**Example:**

```bash
curl -X POST http://localhost:3001/api/projects/123/marketing-contents/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: token=..." \
  -d '{
    "type": "LINKEDIN_POST",
    "tone": "enthusiastic",
    "length": "short"
  }'
```

---

### 2. Generate from Meeting

**Endpoint:** `POST /api/meetings/:meetingId/marketing-contents/generate`

**Request Body:** Same as project generation

**Example:**

```bash
curl -X POST http://localhost:3001/api/meetings/456/marketing-contents/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: token=..." \
  -d '{
    "type": "CASE_STUDY",
    "tone": "professional",
    "length": "long",
    "additionalContext": "Focus on ROI metrics"
  }'
```

---

### 3. Repurpose Content

**Endpoint:** `POST /api/marketing-contents/:id/repurpose`

**Request Body:**

```typescript
{
  targetType: ContentType;        // Required: Target content type
  targetChannel?: ContentChannel; // Optional: WEB, LINKEDIN, etc. (auto if omitted)
  additionalContext?: string;     // Optional: Repurposing instructions
  tone?: 'professional' | 'casual' | 'technical' | 'enthusiastic';
  length?: 'short' | 'medium' | 'long';
}
```

**Response:** Same as generation endpoints

**Example:**

```bash
curl -X POST http://localhost:3001/api/marketing-contents/789/repurpose \
  -H "Content-Type: application/json" \
  -H "Cookie: token=..." \
  -d '{
    "targetType": "TWITTER_POST",
    "targetChannel": "TWITTER",
    "tone": "casual",
    "length": "short"
  }'
```

---

## Frontend Integration Guide

### 1. Add Generation Button to Project Page

```tsx
import { GenerateFromProjectButton } from '@/features/marketing';

function ProjectDetailPage({ project }) {
  return (
    <div>
      {/* ... other project details ... */}

      <GenerateFromProjectButton
        projectId={project.id}
        projectName={project.name}
        clientId={project.clientId}
        variant="secondary"
      />
    </div>
  );
}
```

---

### 2. Add Generation Button to Meeting Page

```tsx
import { GenerateFromMeetingButton } from '@/features/marketing';

function MeetingDetailPage({ meeting }) {
  return (
    <div>
      {/* ... other meeting details ... */}

      <GenerateFromMeetingButton
        meetingId={meeting.id}
        meetingTitle={meeting.title}
        clientId={meeting.project.clientId}
        projectId={meeting.projectId}
        variant="secondary"
      />
    </div>
  );
}
```

---

### 3. Add Repurpose Button to Content List/Detail

```tsx
import { RepurposeContentButton } from '@/features/marketing';

function MarketingContentCard({ content }) {
  return (
    <div>
      <h3>{content.name}</h3>
      <p>{content.summary}</p>

      <RepurposeContentButton
        content={content}
        variant="secondary"
        size="small"
      />
    </div>
  );
}
```

---

### 4. Use React Query Hooks Directly

```tsx
import {
  useGenerateMarketingContentFromProject,
  useRepurposeMarketingContent,
} from '@/api/marketing';

function CustomGenerationComponent({ projectId }) {
  const generateMutation = useGenerateMarketingContentFromProject();

  const handleGenerate = async () => {
    const result = await generateMutation.mutateAsync({
      projectId,
      payload: {
        type: 'BLOG_POST',
        tone: 'professional',
        length: 'medium',
      },
    });

    console.log('Generated:', result);
  };

  return (
    <button onClick={handleGenerate} disabled={generateMutation.isPending}>
      {generateMutation.isPending ? 'Generating...' : 'Generate Content'}
    </button>
  );
}
```

---

## Content Types & Channels

### Content Types

```typescript
- BLOG_POST       → Web blog article
- CASE_STUDY      → Client success story
- LINKEDIN_POST   → LinkedIn update
- TWITTER_POST    → Tweet (280 chars)
- EMAIL_TEMPLATE  → Email campaign
- WHITEPAPER      → Long-form technical content
- SOCIAL_STORY    → Instagram/social media story
- VIDEO_SCRIPT    → Video content script
- NEWSLETTER      → Email newsletter
- OTHER           → Generic content
```

### Content Channels (Auto-assigned)

```typescript
BLOG_POST       → WEB
CASE_STUDY      → WEB
LINKEDIN_POST   → LINKEDIN
TWITTER_POST    → TWITTER
EMAIL_TEMPLATE  → EMAIL
WHITEPAPER      → WEB
SOCIAL_STORY    → INSTAGRAM
VIDEO_SCRIPT    → GENERIC
NEWSLETTER      → EMAIL
OTHER           → GENERIC
```

### Content Statuses

```typescript
IDEA       → Initial concept
DRAFT      → Work in progress
IN_REVIEW  → Under review
APPROVED   → Approved for publication
READY      → Ready to publish
PUBLISHED  → Live/published
ARCHIVED   → Archived
```

---

## LLM Configuration

The module uses **Anthropic Claude API** for content generation:

- **Model:** `claude-3-5-sonnet-20241022`
- **Max Tokens:** 500 (short), 1500 (medium), 3000 (long)
- **Temperature:** Varies by tone (0.2-0.8)

**Environment Variable:**

```bash
ANTHROPIC_API_KEY=sk-ant-xxxxx
```

**Fallback:** If no API key is configured, the system returns placeholder content templates.

---

## Testing the Implementation

### 1. Test Project Generation

```bash
# 1. Get a project ID
curl http://localhost:3001/api/projects -H "Cookie: token=..."

# 2. Generate content
curl -X POST http://localhost:3001/api/projects/1/marketing-contents/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: token=..." \
  -d '{"type":"BLOG_POST","tone":"professional","length":"medium"}'
```

### 2. Test Meeting Generation

```bash
# 1. Get a meeting ID
curl http://localhost:3001/api/meetings -H "Cookie: token=..."

# 2. Generate content
curl -X POST http://localhost:3001/api/meetings/1/marketing-contents/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: token=..." \
  -d '{"type":"CASE_STUDY","tone":"professional"}'
```

### 3. Test Repurposing

```bash
# 1. Create some content first
curl -X POST http://localhost:3001/api/marketing-contents \
  -H "Content-Type: application/json" \
  -H "Cookie: token=..." \
  -d '{
    "name":"Test Blog Post",
    "type":"BLOG_POST",
    "clientId":1,
    "projectId":1,
    "content":{"body":"Long blog content here..."},
    "summary":"A test blog post"
  }'

# 2. Repurpose it
curl -X POST http://localhost:3001/api/marketing-contents/1/repurpose \
  -H "Content-Type: application/json" \
  -H "Cookie: token=..." \
  -d '{"targetType":"TWITTER_POST","tone":"casual"}'
```

---

## File Structure

```
pmo/
├── prisma/
│   ├── schema.prisma                              # ✅ Updated schema
│   └── migrations/
│       └── 20251123211300_.../migration.sql       # ✅ New migration
│
├── packages/types/
│   └── marketing.ts                               # ✅ Updated shared types
│
├── apps/api/src/
│   ├── types/marketing.ts                         # ✅ Updated backend types
│   ├── validation/marketing.schema.ts             # ✅ Updated validation
│   ├── modules/marketing/
│   │   ├── marketing.service.ts                   # ✅ Added repurpose logic
│   │   └── marketing.router.ts                    # ✅ Added 3 new endpoints
│   └── services/
│       └── llm.service.ts                         # ✅ (Already existed)
│
└── apps/web/src/
    ├── api/marketing.ts                           # ✅ Updated API client
    └── features/marketing/
        ├── index.ts                               # ✅ New exports
        ├── GenerateFromProjectButton.tsx          # ✅ New component
        ├── GenerateFromMeetingButton.tsx          # ✅ New component
        ├── RepurposeContentButton.tsx             # ✅ New component
        ├── GenerateMarketingContentModal.tsx      # ✅ New component
        ├── RepurposeContentModal.tsx              # ✅ New component
        ├── GenerateContentButton.tsx              # (Existing)
        ├── MarketingContentFormModal.tsx          # (Existing)
        └── MarketingContentDetailModal.tsx        # (Existing)
```

---

## Future Enhancements (Phase 2 & 3)

### Phase 2 - Campaign Management

- **MarketingCampaign** model
- Campaign CRUD endpoints
- Associate multiple content pieces with campaigns
- Campaign analytics and tracking

### Phase 3 - Brand Profile

- **BrandProfile** model (one per user/org)
- Store brand voice, tone guidelines, taboo phrases
- Auto-apply brand profile to all LLM prompts
- Settings page for brand configuration

---

## Troubleshooting

### Issue: "Environment variable not found: DATABASE_URL"

**Solution:** Ensure `.env` file exists with `DATABASE_URL` configured.

### Issue: Migration fails with "Prisma schema validation error"

**Solution:** Run `npx prisma format` then retry migration.

### Issue: Generated content returns placeholder text

**Solution:** Check that `ANTHROPIC_API_KEY` is set in environment variables.

### Issue: 403 Forbidden on generation endpoints

**Solution:** Ensure user owns the project/meeting being used for generation.

### Issue: Components not rendering

**Solution:** Check that Button, Modal, Select, Input components exist in `apps/web/src/ui/`

---

## Security Considerations

1. **Authorization:** All endpoints verify user ownership of projects/meetings/content
2. **Input Validation:** Zod schemas validate all request bodies
3. **Rate Limiting:** Consider adding rate limits to generation endpoints
4. **API Key Security:** Store ANTHROPIC_API_KEY in environment variables, never commit
5. **Content Moderation:** Consider adding content filtering for generated text

---

## Performance Considerations

1. **LLM Latency:** Generation takes 5-15 seconds depending on length
2. **Caching:** Consider caching generated content for repeat requests
3. **Background Jobs:** For bulk generation, use job queue (future enhancement)
4. **Database Indexes:** Slug and status indexes improve query performance

---

## Support & Maintenance

**Files to Update for New Content Types:**

1. `prisma/schema.prisma` - Add to ContentType enum
2. `packages/types/marketing.ts` - Update labels and icons
3. `apps/api/src/services/llm.service.ts` - Add prompts for new type
4. `apps/api/src/types/marketing.ts` - Update enum

**Files to Update for New Channels:**

1. `prisma/schema.prisma` - Add to ContentChannel enum
2. `packages/types/marketing.ts` - Update labels and default mapping

---

## Conclusion

The Marketing & Content module is now fully implemented with:

- ✅ 3 new API endpoints
- ✅ Database schema updates and migration
- ✅ Full type safety (frontend and backend)
- ✅ 5 new React components
- ✅ LLM-powered generation and repurposing
- ✅ Authorization and validation
- ✅ Drop-in components for easy integration

**Next Steps:**

1. Apply database migration
2. Integrate generation buttons into Project and Meeting pages
3. Test content generation with real projects
4. Configure ANTHROPIC_API_KEY for production use
5. Consider implementing Phase 2 (Campaigns) or Phase 3 (Brand Profile)

---

**Questions or Issues?**
Refer to this guide or check the implementation in the files listed above.
