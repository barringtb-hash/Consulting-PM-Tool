# AI Monitoring Assistant - Requirements & Implementation Plan

## Executive Summary

This document outlines the requirements and implementation plan for integrating an AI-powered assistant into the AI Monitoring system. The assistant will provide conversational access to monitoring data, help diagnose issues, and provide real-time status information through natural language interactions.

**Key Constraint:** This feature will be enabled only for the `default` tenant (Launchpad Consulting Partners), not available to other tenants.

**Tenant Configuration:**
- **Tenant Name:** Launchpad Consulting Partners
- **Tenant Slug:** `default`
- **Tenant Plan:** PROFESSIONAL

---

## 1. High-Level Requirements

### 1.1 Core Functionality

| Requirement | Description | Priority |
|-------------|-------------|----------|
| **R1: Natural Language Interface** | Users can ask questions in plain English about monitoring status, costs, usage, and issues | P0 |
| **R2: Real-Time Status Queries** | Assistant can retrieve and summarize current system health, AI usage, and costs | P0 |
| **R3: Issue Diagnosis** | Assistant can identify anomalies, errors, and their potential causes | P0 |
| **R4: Trend Analysis** | Assistant can analyze usage trends and cost patterns over time | P1 |
| **R5: Proactive Recommendations** | Assistant provides actionable recommendations for cost optimization and issue resolution | P1 |
| **R6: Historical Context** | Assistant can reference historical data to contextualize current issues | P2 |
| **R7: Database Monitoring** | Track and report on database usage, query performance, connection pools | P0 |
| **R8: External Service Health** | Monitor API connections to Vercel, Render, and OpenAI | P0 |
| **R9: Tenant Usage Trends** | Analyze customer tenant usage patterns and trends | P1 |

### 1.2 Data Access Requirements

The assistant must be able to query:

1. **AI Usage Data**
   - Real-time usage statistics (last 24h, 7d, 30d)
   - Token consumption by tool/model
   - Cost breakdown by tool, model, and time period
   - Usage trends and forecasts

2. **Infrastructure Metrics**
   - API latency (P50, P95, P99)
   - Error rates by endpoint
   - System health (memory, CPU, event loop)
   - Slow database queries

3. **Database Monitoring** (NEW)
   - Connection pool status (active, idle, waiting)
   - Query execution times and slow query log
   - Database size and growth trends
   - Table-level statistics

4. **External Service Connections** (NEW)
   - **Vercel**: Deployment status, edge function performance
   - **Render**: Service health, memory/CPU usage, deployment logs
   - **OpenAI**: API health, rate limits, token usage, model availability

5. **Anomaly Data**
   - Open anomalies with severity levels
   - Recent resolved anomalies
   - Anomaly patterns and frequency

6. **Alert Information**
   - Active alert rules
   - Alert history and delivery status
   - Cost threshold status

7. **Predictive Data**
   - Cost forecasts (current month, next month)
   - Usage projections by tool
   - Budget recommendations

8. **Tenant Usage Trends** (NEW)
   - Per-tenant usage patterns over time
   - Cross-tenant comparative analytics
   - Tenant health scores and engagement metrics

### 1.3 Tenant-Specific Enablement

| Requirement | Description |
|-------------|-------------|
| **R7: Tenant Feature Flag** | Feature is controlled via `TenantModuleConfig` for specific tenant only |
| **R8: No Cross-Tenant Leakage** | Assistant can only access data for the requesting tenant |
| **R9: Easy Toggle** | Feature can be enabled/disabled without code deployment |

---

## 2. User Experience Requirements

### 2.1 Interface Design

```
┌──────────────────────────────────────────────────────────────────┐
│  Operations > AI Monitoring Assistant                             │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ 🤖 AI Monitoring Assistant                                   │ │
│  │                                                              │ │
│  │ Ask me about your AI usage, costs, system health,           │ │
│  │ anomalies, or anything related to monitoring.               │ │
│  ├──────────────────────────────────────────────────────────────│ │
│  │                                                              │ │
│  │ You: What's our current AI spending this month?             │ │
│  │                                                              │ │
│  │ Assistant: Your AI spending for December 2025:              │ │
│  │                                                              │ │
│  │   📊 Total Spend: $47.23                                    │ │
│  │   📈 Projected Month-End: $78.50                            │ │
│  │   ⚠️ Status: Within budget (78% of $100 warning)            │ │
│  │                                                              │ │
│  │   Top Tools by Cost:                                        │ │
│  │   1. Document Analyzer - $23.45 (49.7%)                     │ │
│  │   2. Chatbot - $15.32 (32.4%)                               │ │
│  │   3. Content Generator - $8.46 (17.9%)                      │ │
│  │                                                              │ │
│  │ You: Are there any performance issues I should know about?  │ │
│  │                                                              │ │
│  │ Assistant: I found 2 active anomalies requiring attention:  │ │
│  │                                                              │ │
│  │   🔴 HIGH: API latency spike on /api/documents/analyze      │ │
│  │      - P95 latency: 4.2s (normal: 1.2s)                     │ │
│  │      - Started: 2 hours ago                                  │ │
│  │      - Likely cause: Large document batch processing        │ │
│  │                                                              │ │
│  │   🟡 MEDIUM: Elevated error rate on lead-scoring            │ │
│  │      - Error rate: 3.2% (normal: <1%)                       │ │
│  │      - Most errors: Rate limit exceeded                     │ │
│  │                                                              │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Ask a question...                                     [Send] │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  Quick Actions:                                                   │
│  [📊 Cost Summary] [🏥 System Health] [⚠️ Open Anomalies]        │
│  [📈 Usage Trends] [💡 Recommendations]                          │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 Sample Queries the Assistant Should Handle

**Status & Overview:**
- "What's the current system status?"
- "How much have we spent on AI this month?"
- "Show me today's usage summary"
- "What's our most expensive AI tool?"

**Issue Diagnosis:**
- "Are there any problems I should know about?"
- "Why is the chatbot slow today?"
- "What's causing the high error rate?"
- "Investigate the document analyzer performance"

**Trends & Forecasting:**
- "How does this week compare to last week?"
- "What's our projected spend for this month?"
- "Show me usage trends for lead scoring"
- "When do we typically have peak usage?"

**Recommendations:**
- "How can I reduce AI costs?"
- "What should I do about the latency issue?"
- "Are we optimizing our model usage?"
- "Suggest budget adjustments"

---

## 3. Technical Architecture

### 3.1 System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React)                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                   MonitoringAssistantPage.tsx                       │ │
│  │  - Chat interface with message history                              │ │
│  │  - Quick action buttons                                             │ │
│  │  - Markdown/chart rendering for responses                           │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                              │                                           │
│                              ▼                                           │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                   useMonitoringAssistant Hook                       │ │
│  │  - sendMessage mutation                                             │ │
│  │  - conversation state management                                    │ │
│  │  - streaming response support                                       │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │ POST /api/ai-monitoring/assistant/chat
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           BACKEND (Express)                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │              monitoring-assistant.router.ts                         │ │
│  │  POST /api/ai-monitoring/assistant/chat                             │ │
│  │  GET  /api/ai-monitoring/assistant/conversations                    │ │
│  │  GET  /api/ai-monitoring/assistant/suggestions                      │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                              │                                           │
│                              ▼                                           │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │              monitoring-assistant.service.ts                        │ │
│  │                                                                      │ │
│  │  ┌───────────────────┐  ┌───────────────────┐  ┌─────────────────┐ │ │
│  │  │ Intent Classifier │  │ Context Gatherer  │  │ Response Gen    │ │ │
│  │  │ - Status queries  │  │ - Fetch metrics   │  │ - Format data   │ │ │
│  │  │ - Diagnosis       │  │ - Fetch anomalies │  │ - Generate      │ │ │
│  │  │ - Trends          │  │ - Fetch costs     │  │   insights      │ │ │
│  │  │ - Recommendations │  │ - Fetch alerts    │  │ - Recommendations│ │ │
│  │  └───────────────────┘  └───────────────────┘  └─────────────────┘ │ │
│  │                              │                                       │ │
│  └──────────────────────────────┼───────────────────────────────────────┘ │
│                                 ▼                                         │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                    Existing Monitoring Services                     │  │
│  │                                                                      │  │
│  │  ai-usage.service.ts    metrics.service.ts    anomaly-detection.ts  │  │
│  │  predictive.service.ts  alert.service.ts                            │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Component Breakdown

#### Backend Components

| Component | File | Purpose |
|-----------|------|---------|
| **Router** | `monitoring-assistant.router.ts` | API endpoints for chat, history, suggestions |
| **Service** | `monitoring-assistant.service.ts` | Core logic: intent detection, context gathering, response generation |
| **Context Builder** | `assistant-context.builder.ts` | Assembles monitoring data into prompt context |
| **Response Formatter** | `assistant-response.formatter.ts` | Formats AI responses with structured data |
| **Types** | `monitoring-assistant.types.ts` | TypeScript interfaces for assistant |

#### Frontend Components

| Component | File | Purpose |
|-----------|------|---------|
| **Page** | `MonitoringAssistantPage.tsx` | Main page with chat interface |
| **Chat Component** | `AssistantChat.tsx` | Message display and input handling |
| **Message Bubble** | `AssistantMessage.tsx` | Individual message rendering with markdown |
| **Quick Actions** | `AssistantQuickActions.tsx` | Preset query buttons |
| **API Hook** | `useMonitoringAssistant.ts` | React Query mutations for chat |

### 3.3 Feature Flag Configuration

```typescript
// Tenant-specific module configuration
interface TenantModuleConfig {
  tenantId: string;          // Your specific tenant ID
  moduleId: 'monitoring-assistant';
  enabled: boolean;
  settings: {
    maxTokensPerResponse: number;
    conversationHistoryLimit: number;
    enableRecommendations: boolean;
    enableDiagnosis: boolean;
  };
}
```

**Database Entry (to enable for your tenant):**
```sql
INSERT INTO "TenantModuleConfig" ("tenantId", "moduleId", "enabled", "settings", "createdAt", "updatedAt")
VALUES (
  '<your-tenant-id>',
  'monitoring-assistant',
  true,
  '{"maxTokensPerResponse": 2000, "conversationHistoryLimit": 50, "enableRecommendations": true, "enableDiagnosis": true}',
  NOW(),
  NOW()
);
```

---

## 4. Implementation Plan

### Phase 1: Backend Infrastructure (Core)

#### 4.1 Create Assistant Types

**File:** `pmo/apps/api/src/modules/ai-monitoring/assistant/monitoring-assistant.types.ts`

```typescript
export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    intent?: AssistantIntent;
    dataFetched?: string[];
    tokensUsed?: number;
  };
}

export interface AssistantConversation {
  id: string;
  tenantId: string;
  userId: number;
  messages: AssistantMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export type AssistantIntent =
  | 'status_overview'
  | 'cost_inquiry'
  | 'usage_inquiry'
  | 'issue_diagnosis'
  | 'anomaly_check'
  | 'trend_analysis'
  | 'recommendation'
  | 'alert_status'
  | 'general_question';

export interface AssistantContext {
  tenantId: string;
  currentUsage?: RealtimeUsageStats;
  costBreakdown?: CostBreakdown[];
  anomalies?: Anomaly[];
  systemHealth?: SystemHealthMetrics;
  forecast?: CostForecast;
  recentAlerts?: AlertHistory[];
}

export interface ChatRequest {
  message: string;
  conversationId?: string;
  includeContext?: boolean;
}

export interface ChatResponse {
  conversationId: string;
  message: AssistantMessage;
  suggestedFollowUps?: string[];
}
```

#### 4.2 Create Context Builder

**File:** `pmo/apps/api/src/modules/ai-monitoring/assistant/assistant-context.builder.ts`

```typescript
export class AssistantContextBuilder {
  async buildContext(tenantId: string, intent: AssistantIntent): Promise<AssistantContext> {
    // Fetch relevant data based on detected intent
    const context: AssistantContext = { tenantId };

    const dataFetchers: Record<AssistantIntent, () => Promise<void>> = {
      status_overview: async () => {
        context.currentUsage = await getRealtimeUsageStats(tenantId, 24);
        context.systemHealth = await getSystemHealthMetrics();
        context.anomalies = await getOpenAnomalies(tenantId);
      },
      cost_inquiry: async () => {
        context.currentUsage = await getRealtimeUsageStats(tenantId, 24);
        context.costBreakdown = await getCostBreakdown(tenantId, 30);
        context.forecast = await getCostForecast(tenantId);
      },
      // ... other intent handlers
    };

    await dataFetchers[intent]?.();
    return context;
  }
}
```

#### 4.3 Create Assistant Service

**File:** `pmo/apps/api/src/modules/ai-monitoring/assistant/monitoring-assistant.service.ts`

```typescript
export class MonitoringAssistantService {
  private contextBuilder: AssistantContextBuilder;

  async chat(tenantId: string, userId: number, request: ChatRequest): Promise<ChatResponse> {
    // 1. Detect intent from user message
    const intent = await this.detectIntent(request.message);

    // 2. Build context based on intent
    const context = await this.contextBuilder.buildContext(tenantId, intent);

    // 3. Generate system prompt with context
    const systemPrompt = this.buildSystemPrompt(context);

    // 4. Call OpenAI with conversation history
    const response = await this.generateResponse(systemPrompt, request.message, conversationHistory);

    // 5. Track usage
    await trackAIUsage({
      tenantId,
      toolId: 'monitoring-assistant',
      operation: 'chat',
      // ...
    });

    // 6. Return formatted response
    return {
      conversationId,
      message: { id, role: 'assistant', content: response, timestamp: new Date() },
      suggestedFollowUps: this.generateFollowUps(intent),
    };
  }

  private buildSystemPrompt(context: AssistantContext): string {
    return `You are an AI Monitoring Assistant for a CRM platform. Your role is to help users understand their AI usage, diagnose issues, and optimize costs.

## Current System State

### AI Usage (Last 24 Hours)
- Total Calls: ${context.currentUsage?.totalCalls || 'N/A'}
- Total Tokens: ${context.currentUsage?.totalTokens || 'N/A'}
- Total Cost: $${context.currentUsage?.totalCost?.toFixed(2) || 'N/A'}
- Success Rate: ${context.currentUsage?.successRate || 'N/A'}%

### Cost Breakdown (This Month)
${this.formatCostBreakdown(context.costBreakdown)}

### Active Anomalies
${this.formatAnomalies(context.anomalies)}

### System Health
${this.formatSystemHealth(context.systemHealth)}

## Instructions
- Provide concise, actionable responses
- Use bullet points and structured formatting
- Include specific numbers and percentages
- Suggest next steps when diagnosing issues
- Be proactive about warning of potential problems`;
  }
}
```

#### 4.4 Create Router

**File:** `pmo/apps/api/src/modules/ai-monitoring/assistant/monitoring-assistant.router.ts`

```typescript
const router = Router();

// Middleware to check if feature is enabled for tenant
router.use(async (req, res, next) => {
  const tenantId = getTenantId();
  const isEnabled = await isModuleEnabledForTenant('monitoring-assistant', tenantId);

  if (!isEnabled) {
    return res.status(403).json({
      error: 'Monitoring Assistant is not enabled for your organization'
    });
  }
  next();
});

router.post('/chat', requireAuth, async (req, res, next) => {
  try {
    const tenantId = getTenantId();
    const userId = req.user!.id;
    const { message, conversationId, includeContext } = req.body;

    const response = await monitoringAssistantService.chat(tenantId, userId, {
      message,
      conversationId,
      includeContext,
    });

    res.json({ data: response });
  } catch (error) {
    next(error);
  }
});

router.get('/conversations', requireAuth, async (req, res, next) => {
  // List user's conversation history
});

router.get('/suggestions', requireAuth, async (req, res, next) => {
  // Return suggested queries based on current state
});

export default router;
```

### Phase 2: Frontend Implementation

#### 4.5 Create API Hook

**File:** `pmo/apps/web/src/api/hooks/useMonitoringAssistant.ts`

```typescript
export function useMonitoringAssistant() {
  const queryClient = useQueryClient();

  const sendMessage = useMutation({
    mutationFn: async (request: ChatRequest) => {
      const response = await http.post<ChatResponse>(
        '/api/ai-monitoring/assistant/chat',
        request
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitoring-conversations'] });
    },
  });

  const getSuggestions = useQuery({
    queryKey: ['monitoring-assistant-suggestions'],
    queryFn: async () => {
      const response = await http.get<string[]>('/api/ai-monitoring/assistant/suggestions');
      return response;
    },
    staleTime: 60000,
  });

  return { sendMessage, getSuggestions };
}
```

#### 4.6 Create Page Component

**File:** `pmo/apps/web/src/pages/operations/MonitoringAssistantPage.tsx`

```typescript
export default function MonitoringAssistantPage() {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState('');
  const { sendMessage } = useMonitoringAssistant();

  const handleSend = async () => {
    if (!input.trim()) return;

    // Add user message
    const userMessage: AssistantMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    // Get assistant response
    const response = await sendMessage.mutateAsync({ message: input });
    setMessages(prev => [...prev, response.data.message]);
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="AI Monitoring Assistant" />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
      </div>

      <QuickActions onAction={(query) => setInput(query)} />

      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about monitoring, costs, or issues..."
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <Button onClick={handleSend} disabled={sendMessage.isPending}>
            {sendMessage.isPending ? 'Thinking...' : 'Send'}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

### Phase 3: Feature Flag & Tenant Configuration

#### 4.7 Register Module

**File:** `pmo/apps/api/src/modules/module-config.ts` (update)

```typescript
export const MODULE_DEFINITIONS: Record<string, ModuleDefinition> = {
  // ... existing modules

  'monitoring-assistant': {
    id: 'monitoring-assistant',
    name: 'AI Monitoring Assistant',
    description: 'Conversational AI assistant for monitoring insights and diagnosis',
    category: 'operations',
    tier: 'enterprise',
    isCore: false,
    dependencies: ['ai-monitoring'],
  },
};
```

#### 4.8 Database Migration

**File:** Create migration for storing conversations (optional, for history)

```prisma
model MonitoringConversation {
  id        String   @id @default(cuid())
  tenantId  String
  userId    Int
  title     String?
  messages  Json     // Array of AssistantMessage
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  user      User     @relation(fields: [userId], references: [id])

  @@index([tenantId])
  @@index([userId])
}
```

---

## 5. Enabling for Your Tenant Only

### Option A: Database Configuration (Recommended)

```sql
-- First, find your tenant ID
SELECT id, name, slug FROM "Tenant" WHERE slug = '<your-tenant-slug>';

-- Enable the module for your tenant only
INSERT INTO "TenantModuleConfig" ("id", "tenantId", "moduleId", "enabled", "settings", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  '<your-tenant-id>',
  'monitoring-assistant',
  true,
  '{"maxTokensPerResponse": 2000}',
  NOW(),
  NOW()
);
```

### Option B: Environment Variable (For Development)

```bash
# In .env, add to enabled modules for your tenant
MONITORING_ASSISTANT_TENANT_IDS="<your-tenant-id>"
```

### Option C: Admin API

```bash
# Use the admin API to enable
curl -X POST http://localhost:3001/api/admin/modules \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "tenantId": "<your-tenant-id>",
    "moduleId": "monitoring-assistant",
    "enabled": true,
    "settings": {"maxTokensPerResponse": 2000}
  }'
```

---

## 6. Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `pmo/apps/api/src/modules/ai-monitoring/assistant/monitoring-assistant.types.ts` | Type definitions |
| `pmo/apps/api/src/modules/ai-monitoring/assistant/monitoring-assistant.service.ts` | Core service |
| `pmo/apps/api/src/modules/ai-monitoring/assistant/monitoring-assistant.router.ts` | API routes |
| `pmo/apps/api/src/modules/ai-monitoring/assistant/assistant-context.builder.ts` | Context builder |
| `pmo/apps/api/src/modules/ai-monitoring/assistant/assistant-prompts.ts` | System prompts |
| `pmo/apps/api/src/modules/ai-monitoring/assistant/index.ts` | Module exports |
| `pmo/apps/web/src/api/hooks/useMonitoringAssistant.ts` | React Query hook |
| `pmo/apps/web/src/pages/operations/MonitoringAssistantPage.tsx` | Main page |
| `pmo/apps/web/src/components/monitoring/AssistantChat.tsx` | Chat component |
| `pmo/apps/web/src/components/monitoring/AssistantMessage.tsx` | Message bubble |
| `pmo/apps/web/src/components/monitoring/AssistantQuickActions.tsx` | Quick action buttons |

### Modified Files

| File | Changes |
|------|---------|
| `pmo/apps/api/src/app.ts` | Register assistant router |
| `pmo/apps/api/src/modules/module-config.ts` | Add module definition |
| `pmo/apps/web/src/App.tsx` | Add route for assistant page |
| `pmo/apps/web/src/layouts/Sidebar.tsx` | Add navigation link (conditionally shown) |
| `pmo/prisma/schema.prisma` | Add MonitoringConversation model (optional) |

---

## 7. Sample Interactions

### Example 1: Cost Inquiry

**User:** "How much have we spent on AI this month?"

**Assistant:**
```markdown
## AI Spending - December 2025

**Current Month Total:** $47.23

### Breakdown by Tool:
| Tool | Calls | Tokens | Cost | % of Total |
|------|-------|--------|------|------------|
| Document Analyzer | 156 | 89,450 | $23.45 | 49.7% |
| Chatbot | 892 | 45,230 | $15.32 | 32.4% |
| Content Generator | 43 | 28,100 | $8.46 | 17.9% |

### Projection:
- **Projected Month-End:** $78.50
- **Budget Status:** ✅ Within budget (78% of $100 warning threshold)
- **Daily Average:** $2.62

### Cost Optimization Tip:
Your Document Analyzer usage is highest. Consider:
- Using the gpt-4o-mini model for simple extractions (70% cheaper)
- Batching similar documents to reduce API calls
```

### Example 2: Issue Diagnosis

**User:** "The chatbot seems slow. What's going on?"

**Assistant:**
```markdown
## Chatbot Performance Analysis

I analyzed the chatbot performance over the last 24 hours and found some issues:

### Current Status: ⚠️ Degraded Performance

**Latency Metrics:**
- Average Response Time: 3.2s (normal: 1.5s)
- P95 Latency: 5.8s (normal: 2.5s)
- Peak: 8.1s at 2:15 PM

### Root Cause Analysis:

1. **Primary Issue: High Token Count**
   - Average prompt tokens: 2,400 (normal: 800)
   - Knowledge base context is too large

2. **Contributing Factor: Model Choice**
   - Currently using GPT-4 for all requests
   - Simple queries could use GPT-4o-mini

### Recommendations:

1. ✅ **Immediate:** Reduce knowledge base context window from 10 to 5 items
2. ✅ **Short-term:** Route simple queries to faster models
3. 📋 **Long-term:** Implement response caching for common questions

Would you like me to explain any of these recommendations in detail?
```

### Example 3: Anomaly Check

**User:** "Are there any problems I should know about?"

**Assistant:**
```markdown
## Active Issues & Anomalies

I found **3 active issues** requiring attention:

### 🔴 HIGH SEVERITY (1)

**API Latency Spike - Document Analyzer**
- Endpoint: `/api/documents/analyze`
- Current P95: 4.2s (normal: 1.2s)
- Duration: 2 hours
- Impact: Document processing delays
- Suggested Action: Check queue backlog

---

### 🟡 MEDIUM SEVERITY (1)

**Elevated Error Rate - Lead Scoring**
- Error Rate: 3.2% (normal: <1%)
- Most Common: `RateLimitError` (78%)
- Suggestion: Review rate limits or upgrade plan

---

### 🟢 LOW SEVERITY (1)

**Unusual Usage Pattern - Content Generator**
- Usage: 340% above daily average
- Likely Cause: Marketing campaign content creation
- Status: Monitoring (no action needed)

---

Would you like me to investigate any of these in more detail?
```

---

## 8. Success Criteria

| Criteria | Measurement |
|----------|-------------|
| **Functionality** | All sample queries return accurate, relevant responses |
| **Accuracy** | Data in responses matches actual monitoring data (100%) |
| **Response Time** | Assistant responds within 5 seconds for 95% of queries |
| **Tenant Isolation** | Feature only accessible to configured tenant |
| **Usability** | Users can diagnose basic issues without documentation |

---

## 9. Future Enhancements (Out of Scope for Initial Release)

1. **Proactive Notifications** - Push alerts through the assistant
2. **Action Execution** - "Acknowledge this anomaly" or "Create an alert rule"
3. **Custom Dashboards** - "Create a chart showing..."
4. **Voice Interface** - Speech-to-text queries
5. **Scheduled Reports** - "Send me a daily summary at 9 AM"

---

## 10. Approval & Next Steps

Please review this plan and let me know:

1. **Scope Confirmation:** Does this cover all the functionality you need?
2. **Priority Adjustment:** Should any features be moved up/down in priority?
3. **Tenant ID:** What is your tenant ID/slug for the feature flag?
4. **Timeline Preference:** Any specific order you'd like implementation to follow?

Once approved, I'll begin implementation starting with the backend services.
