# Customer Success ML - Troubleshooting

Common issues and solutions for the ML predictions module.

## Quick Diagnostics

### Check ML Service Status

```bash
curl -X GET "http://localhost:4000/api/crm/accounts/portfolio/ml/status" \
  -H "Cookie: auth_token=YOUR_TOKEN" \
  -H "X-Tenant-ID: your-tenant"
```

Expected response:

```json
{
  "available": true,
  "message": "ML service is available"
}
```

### Verify OpenAI Configuration

```bash
# Check if API key is set
echo $OPENAI_API_KEY | head -c 10

# Test OpenAI connectivity
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

---

## Common Issues

### "ML service unavailable"

**Symptom:** API returns 503 with message "OpenAI API key not configured"

**Causes:**

1. Missing `OPENAI_API_KEY` environment variable
2. Invalid or expired API key
3. OpenAI service outage

**Solutions:**

1. Set the environment variable:

   ```bash
   export OPENAI_API_KEY="sk-..."
   ```

2. Verify key validity:

   ```bash
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer $OPENAI_API_KEY"
   ```

3. Check [OpenAI Status](https://status.openai.com/) for outages

---

### "Tenant context required"

**Symptom:** API returns 400 with error "Tenant context required"

**Cause:** Missing `X-Tenant-ID` header in request

**Solution:** Include the tenant header:

```bash
curl -X POST "http://localhost:4000/api/crm/accounts/123/ml/predict" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: your-tenant-id" \
  -H "Cookie: auth_token=YOUR_TOKEN" \
  -d '{"predictionType": "CHURN"}'
```

---

### "Account not found"

**Symptom:** API returns 404 with error "Account not found"

**Causes:**

1. Invalid account ID
2. Account belongs to different tenant
3. Account has been archived/deleted

**Solutions:**

1. Verify account exists:

   ```sql
   SELECT id, name, tenantId, archived FROM "Account" WHERE id = 123;
   ```

2. Check tenant matches:
   ```sql
   SELECT * FROM "Account" WHERE id = 123 AND tenantId = 'your-tenant';
   ```

---

### Predictions are slow (>5 seconds)

**Symptom:** Prediction requests take longer than expected

**Causes:**

1. Large account context (many activities, CTAs)
2. OpenAI API latency
3. Database query performance
4. Network issues

**Solutions:**

1. Check OpenAI latency:

   ```bash
   time curl https://api.openai.com/v1/chat/completions \
     -H "Authorization: Bearer $OPENAI_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"model": "gpt-4", "messages": [{"role": "user", "content": "test"}]}'
   ```

2. Review database indexes:

   ```sql
   EXPLAIN ANALYZE SELECT * FROM "CRMActivity"
   WHERE "accountId" = 123 AND "createdAt" > NOW() - INTERVAL '30 days';
   ```

3. Reduce context window in configuration:
   ```typescript
   const ML_CONFIG = {
     contextWindowDays: 30, // Reduce from 90
   };
   ```

---

### "Rule-based fallback used" message

**Symptom:** Prediction returns with lower confidence and "fallback" indicator

**Causes:**

1. OpenAI API call failed
2. Rate limit exceeded
3. Invalid response from LLM

**Solutions:**

1. Check API logs for errors:

   ```bash
   grep "ML prediction failed" logs/api.log | tail -20
   ```

2. Verify OpenAI quota:
   - Check [OpenAI Usage Dashboard](https://platform.openai.com/usage)

3. Review fallback configuration:
   ```env
   ML_FALLBACK_ENABLED=true  # Keep enabled for reliability
   ```

---

### CTA not auto-generated for high-risk prediction

**Symptom:** High-risk prediction created but no CTA generated

**Possible Reasons:**

1. **Cooldown Active**: Recent CTA of same type exists

   ```sql
   SELECT * FROM "CTA"
   WHERE "accountId" = 123
     AND "isAutomated" = true
     AND "createdAt" > NOW() - INTERVAL '7 days';
   ```

2. **Duplicate CTA Exists**: Similar CTA already open

   ```sql
   SELECT * FROM "CTA"
   WHERE "accountId" = 123
     AND "status" IN ('OPEN', 'IN_PROGRESS')
     AND "title" LIKE '%churn%';
   ```

3. **Low Confidence**: Prediction confidence below threshold

   ```sql
   SELECT confidence FROM "AccountMLPrediction"
   WHERE "accountId" = 123
   ORDER BY "predictedAt" DESC LIMIT 1;
   ```

4. **No Suggested CTA**: Prediction didn't include CTA suggestion

**Solutions:**

- Wait for cooldown period to expire
- Close or complete existing similar CTAs
- Adjust `minConfidenceThreshold` in configuration
- Use force CTA generation endpoint

---

### Prediction accuracy is low

**Symptom:** `GET /portfolio/ml/accuracy` shows accuracy below 70%

**Causes:**

1. Insufficient training data
2. Unusual account patterns
3. External factors not captured
4. Validation timing issues

**Solutions:**

1. Review prediction factors:

   ```sql
   SELECT "riskFactors", "actualOutcome", "wasAccurate"
   FROM "AccountMLPrediction"
   WHERE "wasAccurate" = false
   ORDER BY "predictedAt" DESC LIMIT 10;
   ```

2. Adjust risk thresholds:

   ```typescript
   churnRiskThresholds: {
     critical: 0.85,  // Raise threshold
     high: 0.7,
     ...
   }
   ```

3. Extend prediction validation window

---

### Database errors

**Symptom:** 500 errors with Prisma-related messages

**Common Errors:**

1. **"Foreign key constraint failed"**
   - Account or CTA referenced doesn't exist
   - Solution: Verify related records exist

2. **"Unique constraint failed"**
   - Duplicate prediction being created
   - Solution: Check for existing prediction first

3. **"Connection pool exhausted"**
   - Too many concurrent connections
   - Solution: Increase pool size or add connection timeout

**Debugging:**

```bash
# Check database connectivity
npx prisma db execute --stdin <<< "SELECT 1;"

# Verify schema is up to date
npx prisma migrate status

# Check for deadlocks
SELECT * FROM pg_stat_activity WHERE state = 'active';
```

---

### JSON parsing errors

**Symptom:** "Failed to parse LLM response" errors

**Cause:** LLM returned invalid or unexpected JSON

**Solutions:**

1. Check recent LLM responses in logs
2. Review prompt templates for clarity
3. Add more explicit JSON formatting instructions
4. Implement stricter response validation

---

## Debugging Tips

### Enable Detailed Logging

```env
LOG_LEVEL=debug
ML_DEBUG_LOGGING=true
```

### Inspect LLM Prompts

Add temporary logging to see prompts:

```typescript
logger.debug('LLM Prompt:', { prompt });
```

### Test with Mock Data

Create test account with known data:

```sql
INSERT INTO "Account" (id, name, "tenantId", "healthScore", ...)
VALUES (99999, 'ML Test Account', 'test-tenant', 50, ...);
```

### Monitor AI Usage

```sql
SELECT
  DATE("createdAt") as date,
  COUNT(*) as calls,
  SUM("promptTokens") as tokens,
  AVG("latencyMs") as avg_latency
FROM "AIUsageEvent"
WHERE "toolId" = 'customer-success-ml'
GROUP BY DATE("createdAt")
ORDER BY date DESC;
```

---

## Getting Help

### Information to Gather

When reporting issues, include:

1. **Request details**: Endpoint, headers, body
2. **Response**: Full error message and status code
3. **Environment**: Node version, OS, deployment type
4. **Logs**: Relevant error logs from API
5. **Database state**: Related records if applicable

### Log Locations

| Log Type       | Location                 |
| -------------- | ------------------------ |
| API Logs       | `logs/api.log` or stdout |
| Prisma Queries | Enable `DEBUG=prisma:*`  |
| OpenAI Calls   | Logged via AI monitoring |

### Health Check Endpoints

```bash
# API health
curl http://localhost:4000/api/healthz

# ML status
curl http://localhost:4000/api/crm/accounts/portfolio/ml/status

# Database connectivity
curl http://localhost:4000/api/healthz/db
```

---

## Recovery Procedures

### Reset Stuck Predictions

```sql
-- Mark stuck predictions as failed
UPDATE "AccountMLPrediction"
SET "status" = 'FAILED'
WHERE "status" = 'ACTIVE'
  AND "predictedAt" < NOW() - INTERVAL '1 hour';
```

### Clear Rate Limits

```bash
# If using Redis
redis-cli KEYS "ml:ratelimit:*" | xargs redis-cli DEL
```

### Regenerate All Predictions

```bash
# Via API - for specific tenant
POST /api/crm/accounts/portfolio/ml/batch-predict
{
  "predictionType": "CHURN",
  "maxAccounts": 100,
  "forceRefresh": true
}
```

---

## Performance Optimization

### Slow Queries

Add indexes if missing:

```sql
CREATE INDEX IF NOT EXISTS "idx_mlprediction_account_type"
ON "AccountMLPrediction" ("accountId", "predictionType");

CREATE INDEX IF NOT EXISTS "idx_mlprediction_tenant_status"
ON "AccountMLPrediction" ("tenantId", "status");
```

### Memory Issues

If encountering out-of-memory errors:

1. Reduce batch sizes
2. Increase Node memory: `NODE_OPTIONS='--max-old-space-size=4096'`
3. Implement pagination for large result sets

### Connection Pooling

Optimize Prisma connection pool:

```env
DATABASE_URL="postgresql://...?connection_limit=10&pool_timeout=30"
```
