# UAT Testing Script v7.0

## AI CRM Platform - Comprehensive User Acceptance Testing with Machine Learning

**Version:** 7.0
**Last Updated:** January 13, 2026
**Purpose:** Complete UAT with Machine Learning Module Testing for AI Agent Execution
**Application URL:** https://verdanthorizon.ai

---

## What's New in V7.0

This version builds upon UAT v6.0 with comprehensive **Machine Learning Module Testing**:

- **NEW: Lead ML Testing (ML-LEAD)** - Conversion prediction, feature extraction, priority ranking
- **NEW: Customer Success ML Testing (ML-CS)** - Churn prediction, health insights, intelligent CTA
- **NEW: Project ML Testing (ML-PRJ)** - Success prediction, risk forecasting, timeline, resource optimization
- **NEW: ML Integration Testing (ML-INT)** - Cross-module interactions, tenant isolation for ML
- **NEW: ML Performance Testing (ML-PERF)** - Bulk predictions, caching, fallback behavior
- **NEW: ML Accuracy Validation (ML-ACC)** - Prediction validation, accuracy metrics
- **Includes all v6.0 tests** - Multi-tenant isolation, dark mode, visual consistency

### AI Agent Execution Notes

This UAT is designed for execution by AI agents with immediate issue resolution:

1. **Test Execution**: Each test case includes clear pass/fail criteria
2. **Issue Detection**: Failures automatically generate todo items
3. **Immediate Fixing**: Agents should fix issues as they are discovered
4. **Verification**: Re-run failed tests after fixes to confirm resolution

---

## Table of Contents

### Part A: Setup & Environment
1. [Pre-Test Setup](#1-pre-test-setup)
2. [ML Environment Setup](#2-ml-environment-setup)

### Part B: Core Functionality (from v6.0)
3. [Authentication (AUTH)](#3-authentication-auth)
4. [Navigation (NAV)](#4-navigation-nav)
5. [CRM Accounts (CRM-ACC)](#5-crm-accounts-crm-acc)
6. [CRM Opportunities (CRM-OPP)](#6-crm-opportunities-crm-opp)
7. [CRM Contacts (CRM-CON)](#7-crm-contacts-crm-con)
8. [PMO Projects (PMO-PRJ)](#8-pmo-projects-pmo-prj)
9. [PMO Tasks (PMO-TSK)](#9-pmo-tasks-pmo-tsk)
10. [Leads Management (LEAD)](#10-leads-management-lead)
11. [Finance Module (FIN)](#11-finance-module-fin)

### Part C: Machine Learning Testing (NEW in v7.0)
12. [**Lead ML - Feature Extraction (ML-LEAD-FE)**](#12-lead-ml---feature-extraction-ml-lead-fe)
13. [**Lead ML - Conversion Prediction (ML-LEAD-CP)**](#13-lead-ml---conversion-prediction-ml-lead-cp)
14. [**Lead ML - Priority Ranking (ML-LEAD-PR)**](#14-lead-ml---priority-ranking-ml-lead-pr)
15. [**Customer Success ML - Churn Prediction (ML-CS-CH)**](#15-customer-success-ml---churn-prediction-ml-cs-ch)
16. [**Customer Success ML - Health Insights (ML-CS-HI)**](#16-customer-success-ml---health-insights-ml-cs-hi)
17. [**Customer Success ML - Intelligent CTA (ML-CS-CTA)**](#17-customer-success-ml---intelligent-cta-ml-cs-cta)
18. [**Project ML - Success Prediction (ML-PRJ-SP)**](#18-project-ml---success-prediction-ml-prj-sp)
19. [**Project ML - Risk Forecasting (ML-PRJ-RF)**](#19-project-ml---risk-forecasting-ml-prj-rf)
20. [**Project ML - Timeline Prediction (ML-PRJ-TL)**](#20-project-ml---timeline-prediction-ml-prj-tl)
21. [**Project ML - Resource Optimization (ML-PRJ-RO)**](#21-project-ml---resource-optimization-ml-prj-ro)

### Part D: ML Integration & Performance
22. [**ML Tenant Isolation (ML-TI)**](#22-ml-tenant-isolation-ml-ti)
23. [**ML Performance & Caching (ML-PERF)**](#23-ml-performance--caching-ml-perf)
24. [**ML Accuracy & Validation (ML-ACC)**](#24-ml-accuracy--validation-ml-acc)
25. [**ML Fallback Behavior (ML-FB)**](#25-ml-fallback-behavior-ml-fb)

### Part E: Summary & Sign-Off
26. [Test Results Summary](#26-test-results-summary)
27. [Issue Log](#27-issue-log)
28. [Sign-Off](#28-sign-off)

---

## 1. Pre-Test Setup

### 1.1 Test Credentials

| Role | Email | Password | Tenant | Use For |
|------|-------|----------|--------|---------|
| Admin | admin@pmo.test | AdminDemo123! | default | Admin features, ML testing |
| Consultant | avery.chen@pmo.test | PmoDemo123! | default | Consultant workflow |
| Tenant 2 Admin | acme.admin@pmo.test | AcmeDemo123! | acme-corp | ML tenant isolation |
| Tenant 3 Admin | global.admin@pmo.test | GlobalDemo123! | global-tech | ML tenant isolation |

### 1.2 Pre-Test Checklist

Before starting UAT testing, verify:
- [ ] Database has been seeded with test data (`npm run db:seed`)
- [ ] Application is running and accessible
- [ ] Clear browser cache/use incognito mode
- [ ] API health check (`/api/healthz`) returns 200
- [ ] **OpenAI API key configured** (for LLM-based predictions)
- [ ] **ML modules enabled in ENABLED_MODULES**
- [ ] **Test leads exist with activities** (for ML feature extraction)
- [ ] **Test accounts exist with health history** (for churn prediction)
- [ ] **Test projects exist with tasks and milestones** (for project ML)

### 1.3 Environment Verification

| Check | Status | Notes |
|-------|--------|-------|
| Application URL accessible | [ ] Pass [ ] Fail | |
| API health check returns 200 | [ ] Pass [ ] Fail | |
| Database connectivity verified | [ ] Pass [ ] Fail | |
| OpenAI API key configured | [ ] Pass [ ] Fail | Required for LLM predictions |
| Lead ML endpoints responding | [ ] Pass [ ] Fail | |
| CS ML endpoints responding | [ ] Pass [ ] Fail | |
| Project ML endpoints responding | [ ] Pass [ ] Fail | |

---

## 2. ML Environment Setup

### 2.1 ML Configuration Overview

The ML modules require specific configuration:

**Environment Variables (pmo/apps/api/.env):**
```env
OPENAI_API_KEY=sk-...          # Required for LLM-based predictions
ENABLED_MODULES=...,lead-scoring,customer-success-ml,project-ml
```

### 2.2 ML Test Data Requirements

**Lead ML Testing:**
| Data Type | Minimum Count | Purpose |
|-----------|---------------|---------|
| Leads with activities | 5+ | Feature extraction testing |
| Leads with emails | 5+ | Email domain classification |
| Leads with company info | 5+ | Demographic feature extraction |
| Leads in various stages | All stages | Stage-based prediction testing |

**Customer Success ML Testing:**
| Data Type | Minimum Count | Purpose |
|-----------|---------------|---------|
| Accounts with health history | 3+ | Churn prediction testing |
| Accounts with activities | 3+ | Engagement metrics |
| Accounts with opportunities | 2+ | Revenue-at-risk testing |
| Accounts with CTAs | 2+ | CTA generation testing |

**Project ML Testing:**
| Data Type | Minimum Count | Purpose |
|-----------|---------------|---------|
| Projects with tasks | 3+ | Success prediction testing |
| Projects with milestones | 2+ | Timeline prediction |
| Projects with team members | 2+ | Resource optimization |
| Tasks in various statuses | All statuses | Completion rate calculation |

### 2.3 Verifying ML Data

```bash
# API calls to verify test data
curl https://verdanthorizon.ai/api/leads -H "Authorization: Bearer $TOKEN"
curl https://verdanthorizon.ai/api/crm/accounts -H "Authorization: Bearer $TOKEN"
curl https://verdanthorizon.ai/api/projects -H "Authorization: Bearer $TOKEN"
```

---

## 3. Authentication (AUTH)

> **Note:** Authentication tests from v6.0 apply. Verify ML endpoints require authentication.

### AUTH-001: ML Endpoints Require Authentication
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Call GET /api/lead-scoring/leads/1/ml/features without auth | Returns 401 Unauthorized |
| 2 | Call GET /api/crm/accounts/1/ml/churn-risk without auth | Returns 401 Unauthorized |
| 3 | Call GET /api/projects/1/ml/success-prediction without auth | Returns 401 Unauthorized |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Add authentication middleware to ML endpoints
- Check requireAuth middleware is applied
- Verify JWT token validation
- Test 401 response format
```

---

## 4-11. Core Functionality

> **Note:** All tests from v6.0 sections 4-19 apply. Reference UAT-TESTING-V6.0.md for detailed test cases.

---

# Part C: Machine Learning Testing (NEW in v7.0)

---

## 12. Lead ML - Feature Extraction (ML-LEAD-FE)

### Purpose
Test the lead feature extraction service that powers conversion predictions.

### ML-LEAD-FE-001: Extract Features for Lead with Complete Data
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as admin@pmo.test | Login successful |
| 2 | Find a lead with activities, email, and company | Record lead ID: _____ |
| 3 | GET /api/lead-scoring/leads/{id}/ml/features | Returns 200 |
| 4 | Verify demographicFeatures present | emailDomain, titleSeniority, companySize returned |
| 5 | Verify behavioralFeatures present | activityCount, lastActivityDaysAgo returned |
| 6 | Verify temporalFeatures present | leadAgeDays, recencyScore returned |
| 7 | Verify engagementFeatures present | emailOpenRate, sequenceCompletionRate returned |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix lead feature extraction
- File: pmo/apps/api/src/modules/lead-ml/services/lead-feature-extraction.service.ts
- Check extractLeadFeatures() method
- Verify all feature categories are being extracted
- Check Prisma includes for related data
```

### ML-LEAD-FE-002: Email Domain Classification
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create/find lead with corporate email (e.g., user@company.com) | Lead exists |
| 2 | GET /api/lead-scoring/leads/{id}/ml/features | Returns features |
| 3 | Check emailDomain classification | Should be "corporate" |
| 4 | Find/create lead with gmail.com email | Lead exists |
| 5 | GET /api/lead-scoring/leads/{id}/ml/features | Returns features |
| 6 | Check emailDomain classification | Should be "free" |

**Expected Classifications:**
- Corporate: Custom domain (not gmail, yahoo, hotmail, outlook)
- Free: gmail.com, yahoo.com, hotmail.com, outlook.com
- Education: .edu domains
- Government: .gov domains

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix email domain classification
- File: pmo/apps/api/src/modules/lead-ml/services/lead-feature-extraction.service.ts
- Check extractDemographicFeatures() method
- Verify email parsing logic
- Add missing domain categories
```

### ML-LEAD-FE-003: Title Seniority Detection
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Find/create lead with title containing "CEO" or "CTO" | Lead exists |
| 2 | GET /api/lead-scoring/leads/{id}/ml/features | Returns features |
| 3 | Check titleSeniority | Should be "c_level" |
| 4 | Find/create lead with title containing "VP" | Lead exists |
| 5 | GET /api/lead-scoring/leads/{id}/ml/features | Returns features |
| 6 | Check titleSeniority | Should be "vp" |
| 7 | Find/create lead with title containing "Director" | Lead exists |
| 8 | Check titleSeniority | Should be "director" |
| 9 | Find/create lead with title containing "Manager" | Lead exists |
| 10 | Check titleSeniority | Should be "manager" |

**Expected Seniority Levels:**
- c_level: CEO, CTO, CFO, COO, CMO, CIO
- vp: VP, Vice President
- director: Director
- manager: Manager
- individual: All others

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix title seniority detection
- File: pmo/apps/api/src/modules/lead-ml/services/lead-feature-extraction.service.ts
- Check title parsing regex patterns
- Add case-insensitive matching
- Handle variations (e.g., "Vice President" vs "VP")
```

### ML-LEAD-FE-004: Activity Burst Detection
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Find lead with 3+ activities within 24 hours | Lead ID: _____ |
| 2 | GET /api/lead-scoring/leads/{id}/ml/features | Returns features |
| 3 | Check temporalFeatures.hasActivityBurst | Should be true |
| 4 | Find lead with sparse activities (>24h apart) | Lead ID: _____ |
| 5 | GET /api/lead-scoring/leads/{id}/ml/features | Returns features |
| 6 | Check temporalFeatures.hasActivityBurst | Should be false |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix activity burst detection
- File: pmo/apps/api/src/modules/lead-ml/services/lead-feature-extraction.service.ts
- Check extractTemporalFeatures() method
- Verify 24-hour sliding window calculation
- Ensure activity timestamps are properly parsed
```

### ML-LEAD-FE-005: Recency Score Calculation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Find lead with activity today | Lead ID: _____ |
| 2 | GET /api/lead-scoring/leads/{id}/ml/features | Returns features |
| 3 | Check recencyScore | Should be close to 1.0 (high) |
| 4 | Find lead with last activity 30+ days ago | Lead ID: _____ |
| 5 | GET /api/lead-scoring/leads/{id}/ml/features | Returns features |
| 6 | Check recencyScore | Should be lower (exponential decay) |

**Recency Score Formula:**
- recencyScore = exp(-daysSinceActivity / 30)
- 0 days = 1.0, 30 days = 0.37, 60 days = 0.14

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix recency score calculation
- File: pmo/apps/api/src/modules/lead-ml/services/lead-feature-extraction.service.ts
- Check exponential decay formula
- Verify daysSinceActivity calculation
- Handle leads with no activities
```

### ML-LEAD-FE-006: Lead with No Activities
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create a new lead with no activities | Lead created |
| 2 | GET /api/lead-scoring/leads/{id}/ml/features | Returns 200 (not error) |
| 3 | Verify behavioralFeatures.activityCount | Should be 0 |
| 4 | Verify temporalFeatures.recencyScore | Should be 0 or low default |
| 5 | Verify no runtime errors | All features have defaults |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Handle leads with no activities
- File: pmo/apps/api/src/modules/lead-ml/services/lead-feature-extraction.service.ts
- Add null/empty checks for activities array
- Set sensible defaults for missing data
- Prevent division by zero errors
```

---

## 13. Lead ML - Conversion Prediction (ML-LEAD-CP)

### Purpose
Test lead conversion probability predictions using both LLM and rule-based methods.

### ML-LEAD-CP-001: Generate Conversion Prediction
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as admin@pmo.test | Login successful |
| 2 | Find lead with complete data | Record lead ID: _____ |
| 3 | POST /api/lead-scoring/leads/{id}/ml/predict | Returns 200 |
| 4 | Verify conversionProbability | Number between 0 and 1 |
| 5 | Verify confidence | Number between 0 and 1 |
| 6 | Verify riskFactors array | Contains identified risks |
| 7 | Verify recommendations array | Contains actionable items |
| 8 | Verify explanation present | Text explanation of prediction |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix conversion prediction generation
- File: pmo/apps/api/src/modules/lead-ml/services/lead-conversion-prediction.service.ts
- Check predictLeadConversion() method
- Verify LLM prompt is correct
- Check rule-based fallback
- Validate response schema
```

### ML-LEAD-CP-002: Prediction Probability Range Validation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Generate predictions for 5+ different leads | Multiple predictions |
| 2 | Record each conversionProbability | All values between 0-1 |
| 3 | Verify no probability exceeds 1.0 | Max is 1.0 |
| 4 | Verify no probability below 0.0 | Min is 0.0 |
| 5 | Verify varied probabilities | Not all same value |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix probability range validation
- File: pmo/apps/api/src/modules/lead-ml/services/lead-rule-based-prediction.service.ts
- Add Math.min(1, Math.max(0, probability)) clamping
- Verify weighted calculation doesn't exceed bounds
```

### ML-LEAD-CP-003: Risk Factor Generation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Find lead with stale activity (>14 days) | Lead ID: _____ |
| 2 | POST /api/lead-scoring/leads/{id}/ml/predict | Prediction generated |
| 3 | Verify riskFactors includes inactivity warning | Risk present |
| 4 | Find lead with free email domain | Lead ID: _____ |
| 5 | POST /api/lead-scoring/leads/{id}/ml/predict | Prediction generated |
| 6 | Verify riskFactors includes email domain risk | Risk present |

**Expected Risk Factors:**
- Stale lead (no activity >14 days)
- Free email domain
- Low seniority title
- Small company size
- Low engagement score

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix risk factor generation
- File: pmo/apps/api/src/modules/lead-ml/services/lead-rule-based-prediction.service.ts
- Check risk factor logic conditions
- Verify thresholds (14 days, etc.)
- Add missing risk categories
```

### ML-LEAD-CP-004: Recommendation Generation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Generate prediction with low probability (<0.3) | Prediction returned |
| 2 | Verify recommendations array is not empty | At least 1 recommendation |
| 3 | Verify recommendations have priority field | low, medium, or high |
| 4 | Verify recommendations have effort field | low, medium, or high |
| 5 | Verify recommendations have actionable text | Clear action items |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix recommendation generation
- File: pmo/apps/api/src/modules/lead-ml/services/lead-rule-based-prediction.service.ts
- Check generateRecommendations() method
- Verify priority/effort assignment logic
- Ensure recommendations are contextual to features
```

### ML-LEAD-CP-005: Time-to-Close Prediction
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Find lead with high engagement | Lead ID: _____ |
| 2 | POST /api/lead-scoring/leads/{id}/ml/predict-time | Returns 200 |
| 3 | Verify estimatedDays returned | Positive integer |
| 4 | Verify confidenceInterval present | min and max days |
| 5 | Find lead with low engagement | Lead ID: _____ |
| 6 | POST /api/lead-scoring/leads/{id}/ml/predict-time | Returns 200 |
| 7 | Compare estimatedDays | Low engagement = longer time |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix time-to-close prediction
- File: pmo/apps/api/src/modules/lead-ml/services/lead-conversion-prediction.service.ts
- Check predictTimeToClose() method
- Verify activity velocity calculation
- Check confidence interval bounds
```

### ML-LEAD-CP-006: Lead Score Prediction
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Find lead with complete data | Lead ID: _____ |
| 2 | POST /api/lead-scoring/leads/{id}/ml/predict-score | Returns 200 |
| 3 | Verify score between 0-100 | Valid range |
| 4 | Verify breakdown present | demographic, behavioral, temporal, engagement |
| 5 | Verify breakdown sums correctly | Total matches score |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix lead score prediction
- File: pmo/apps/api/src/modules/lead-ml/services/lead-conversion-prediction.service.ts
- Check predictLeadScore() method
- Verify component weight distribution
- Ensure score breakdown accuracy
```

### ML-LEAD-CP-007: Get Existing Prediction (Caching)
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Generate a new prediction for lead | POST returns prediction |
| 2 | Immediately GET /api/lead-scoring/leads/{id}/ml/prediction | Returns cached prediction |
| 3 | Verify same prediction data | Values match |
| 4 | Verify confidence = 0 (cached indicator) or same | Cached flag respected |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix prediction caching
- File: pmo/apps/api/src/modules/lead-ml/services/lead-conversion-prediction.service.ts
- Check getLeadPrediction() method
- Verify cache lookup by leadId
- Check expiration logic
```

---

## 14. Lead ML - Priority Ranking (ML-LEAD-PR)

### Purpose
Test lead priority ranking and tier assignment.

### ML-LEAD-PR-001: Get Ranked Leads
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as admin@pmo.test | Login successful |
| 2 | GET /api/lead-scoring/{configId}/ml/ranked-leads | Returns 200 |
| 3 | Verify leads are sorted by priority | Highest priority first |
| 4 | Verify each lead has priorityScore | Score present |
| 5 | Verify descending order | scores[0] >= scores[1] >= ... |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix lead ranking
- File: pmo/apps/api/src/modules/lead-ml/services/lead-priority-ranking.service.ts
- Check getRankedLeads() method
- Verify sorting by priorityScore descending
- Check prediction retrieval for each lead
```

### ML-LEAD-PR-002: Get Top Priority Leads
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | GET /api/lead-scoring/{configId}/ml/top-leads?limit=5 | Returns 200 |
| 2 | Verify exactly 5 leads returned | Array length = 5 |
| 3 | Verify all are high priority | All priorityScores > threshold |
| 4 | GET /api/lead-scoring/{configId}/ml/top-leads?limit=3 | Returns 200 |
| 5 | Verify exactly 3 leads returned | Array length = 3 |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix top leads retrieval
- File: pmo/apps/api/src/modules/lead-ml/services/lead-priority-ranking.service.ts
- Check getTopPriorityLeads() method
- Verify limit parameter handling
- Check sorting before limiting
```

### ML-LEAD-PR-003: Get Leads by Tier
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | GET /api/lead-scoring/{configId}/ml/leads-by-tier?tier=hot | Returns 200 |
| 2 | Verify all returned leads are "hot" tier | All high probability |
| 3 | GET /api/lead-scoring/{configId}/ml/leads-by-tier?tier=warm | Returns 200 |
| 4 | Verify all returned leads are "warm" tier | Medium probability |
| 5 | GET /api/lead-scoring/{configId}/ml/leads-by-tier?tier=cold | Returns 200 |
| 6 | Verify all returned leads are "cold" tier | Low probability |

**Tier Definitions:**
- hot: probability >= 0.7
- warm: probability >= 0.4 and < 0.7
- cold: probability < 0.4

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix tier filtering
- File: pmo/apps/api/src/modules/lead-ml/services/lead-priority-ranking.service.ts
- Check getLeadsByTier() method
- Verify tier threshold constants
- Check probability comparison logic
```

### ML-LEAD-PR-004: Bulk Predictions
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | POST /api/lead-scoring/{configId}/ml/bulk-predict with 5 lead IDs | Returns 200 |
| 2 | Verify 5 predictions returned | Array length = 5 |
| 3 | Verify each prediction has leadId | IDs match request |
| 4 | Verify processing time is reasonable | < 30 seconds for 5 leads |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix bulk predictions
- File: pmo/apps/api/src/modules/lead-ml/services/lead-conversion-prediction.service.ts
- Check bulkPredictConversions() method
- Verify batch processing logic
- Check error handling for individual failures
```

---

## 15. Customer Success ML - Churn Prediction (ML-CS-CH)

### Purpose
Test churn risk prediction for accounts.

### ML-CS-CH-001: Generate Churn Prediction
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as admin@pmo.test | Login successful |
| 2 | Find account with health history | Record account ID: _____ |
| 3 | POST /api/crm/accounts/{id}/ml/predict | Returns 200 |
| 4 | Verify churnProbability | Number between 0 and 1 |
| 5 | Verify riskCategory | critical, high, medium, or low |
| 6 | Verify interventionUrgency | immediate, this_week, this_month, or monitor |
| 7 | Verify primaryChurnDrivers array | Top risk factors |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix churn prediction generation
- File: pmo/apps/api/src/modules/customer-success-ml/services/churn-prediction.service.ts
- Check predictChurn() method
- Verify context gathering
- Check LLM/rule-based fallback
```

### ML-CS-CH-002: Risk Category Assignment
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Generate predictions for accounts with varying health | Multiple predictions |
| 2 | Find prediction with churnProbability >= 0.8 | Should be "critical" |
| 3 | Find prediction with churnProbability >= 0.6 | Should be "high" |
| 4 | Find prediction with churnProbability >= 0.3 | Should be "medium" |
| 5 | Find prediction with churnProbability < 0.3 | Should be "low" |

**Risk Category Thresholds:**
- critical: >= 0.8
- high: >= 0.6
- medium: >= 0.3
- low: < 0.3

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix risk category assignment
- File: pmo/apps/api/src/modules/customer-success-ml/services/churn-prediction.service.ts
- Check getRiskCategory() method
- Verify threshold constants
- Check comparison operators
```

### ML-CS-CH-003: Intervention Urgency Mapping
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Find critical risk prediction | interventionUrgency = "immediate" |
| 2 | Find high risk prediction | interventionUrgency = "this_week" |
| 3 | Find medium risk prediction | interventionUrgency = "this_month" |
| 4 | Find low risk prediction | interventionUrgency = "monitor" |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix intervention urgency mapping
- File: pmo/apps/api/src/modules/customer-success-ml/services/churn-prediction.service.ts
- Check getInterventionUrgency() method
- Verify mapping from risk category to urgency
```

### ML-CS-CH-004: Churn Factor Calculation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Find account with low health score (<30) | Account ID: _____ |
| 2 | POST /api/crm/accounts/{id}/ml/predict | Prediction generated |
| 3 | Verify health score factor in primaryChurnDrivers | Factor present |
| 4 | Find account with no recent activity (>30 days) | Account ID: _____ |
| 5 | POST /api/crm/accounts/{id}/ml/predict | Prediction generated |
| 6 | Verify engagement/inactivity factor present | Factor present |

**Churn Factors (Rule-Based):**
- Health score (40% weight): Critical <30, warning <50
- Engagement (20% weight): Activities <3 in 30 days
- Support burden (20% weight): Notes/tickets >3
- Sentiment (15% weight): >30% negative interactions
- Recency (15% weight): >30 days inactive

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix churn factor calculation
- File: pmo/apps/api/src/modules/customer-success-ml/services/churn-prediction.service.ts
- Check calculateChurnFactors() method
- Verify weight distribution
- Check individual factor calculations
```

### ML-CS-CH-005: Get Existing Churn Prediction
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Generate new churn prediction | POST returns prediction |
| 2 | GET /api/crm/accounts/{id}/ml/churn-risk | Returns cached prediction |
| 3 | Verify same prediction values | Data matches |
| 4 | Verify createdAt timestamp | Within expected range |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix churn prediction retrieval
- File: pmo/apps/api/src/modules/customer-success-ml/services/churn-prediction.service.ts
- Check getExistingChurnPrediction() method
- Verify cache lookup by accountId and type
```

### ML-CS-CH-006: High-Risk Accounts Portfolio
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | GET /api/crm/accounts/portfolio/ml/high-risk | Returns 200 |
| 2 | Verify all returned accounts are high risk | churnProbability >= 0.6 |
| 3 | Verify sorted by probability descending | Highest risk first |
| 4 | Verify tenant isolation | Only current tenant accounts |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix high-risk accounts retrieval
- File: pmo/apps/api/src/modules/customer-success-ml/services/cs-ml-prediction.service.ts
- Check getHighRiskAccounts() method
- Verify threshold parameter
- Check tenant filtering
```

---

## 16. Customer Success ML - Health Insights (ML-CS-HI)

### Purpose
Test health insights analysis for accounts.

### ML-CS-HI-001: Analyze Account Health
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Find account with health history | Account ID: _____ |
| 2 | GET /api/crm/accounts/{id}/ml/health-insights | Returns 200 |
| 3 | Verify predictedScore present | Number 0-100 |
| 4 | Verify trajectory present | improving, stable, or declining |
| 5 | Verify dimensionScores present | usage, support, engagement, sentiment |
| 6 | Verify insights array | Actionable insights |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix health insights analysis
- File: pmo/apps/api/src/modules/customer-success-ml/services/ml-health-insights.service.ts
- Check analyzeAccountHealth() method
- Verify dimension score calculation
- Check insight generation
```

### ML-CS-HI-002: Trajectory Calculation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Find account with improving health scores | Account ID: _____ |
| 2 | GET /api/crm/accounts/{id}/ml/health-insights | Returns insights |
| 3 | Verify trajectory = "improving" | Correct trajectory |
| 4 | Find account with declining health scores | Account ID: _____ |
| 5 | GET /api/crm/accounts/{id}/ml/health-insights | Returns insights |
| 6 | Verify trajectory = "declining" | Correct trajectory |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix trajectory calculation
- File: pmo/apps/api/src/modules/customer-success-ml/services/ml-health-insights.service.ts
- Check trajectory calculation logic
- Compare newest vs oldest health scores
- Verify threshold for improving/declining
```

### ML-CS-HI-003: Anomaly Detection
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Find/create account with sudden health drop (>15 points) | Account ID: _____ |
| 2 | GET /api/crm/accounts/{id}/ml/health-insights | Returns insights |
| 3 | Verify anomalies array contains "sudden_drop" | Anomaly detected |
| 4 | Find/create account with 3+ consecutive declines | Account ID: _____ |
| 5 | GET /api/crm/accounts/{id}/ml/health-insights | Returns insights |
| 6 | Verify anomalies array contains "sustained_decline" | Anomaly detected |

**Anomaly Types:**
- sudden_drop: >15 point single decrease
- sustained_decline: 3+ consecutive decreases

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix anomaly detection
- File: pmo/apps/api/src/modules/customer-success-ml/services/ml-health-insights.service.ts
- Check anomaly detection logic
- Verify sudden drop threshold (15 points)
- Check consecutive decline counter
```

### ML-CS-HI-004: Dimension Scoring
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | GET /api/crm/accounts/{id}/ml/health-insights | Returns insights |
| 2 | Verify dimensionScores.usage present | Number 0-100 |
| 3 | Verify dimensionScores.support present | Number 0-100 |
| 4 | Verify dimensionScores.engagement present | Number 0-100 |
| 5 | Verify dimensionScores.sentiment present | Number 0-100 |
| 6 | Verify strengthAreas array | High-scoring dimensions |
| 7 | Verify riskAreas array | Low-scoring dimensions |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix dimension scoring
- File: pmo/apps/api/src/modules/customer-success-ml/services/ml-health-insights.service.ts
- Check dimension score calculation
- Verify strength/risk area assignment thresholds
```

---

## 17. Customer Success ML - Intelligent CTA (ML-CS-CTA)

### Purpose
Test intelligent Call-to-Action generation from predictions.

### ML-CS-CTA-001: Generate CTA from Churn Prediction
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Generate churn prediction for account | Prediction exists |
| 2 | POST /api/crm/accounts/{id}/ml/generate-cta | Returns 200 |
| 3 | Verify CTA title present | Descriptive title |
| 4 | Verify CTA dueDate set | Based on urgency |
| 5 | Verify CTA type matches prediction | churn_prevention, health_review, etc. |
| 6 | Verify CTA priority set | Based on risk level |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix CTA generation from prediction
- File: pmo/apps/api/src/modules/customer-success-ml/services/intelligent-cta.service.ts
- Check generateCTAFromPrediction() method
- Verify due date calculation from urgency
- Check CTA type mapping
```

### ML-CS-CTA-002: CTA Confidence Threshold
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Generate low-confidence prediction (< 0.5) | Prediction with low confidence |
| 2 | POST /api/crm/accounts/{id}/ml/generate-cta | Returns 200 or skipped |
| 3 | Verify CTA skipped or flagged as low-confidence | Threshold respected |
| 4 | Generate high-confidence prediction (>= 0.5) | Prediction with high confidence |
| 5 | POST /api/crm/accounts/{id}/ml/generate-cta | Returns 200 |
| 6 | Verify CTA created | CTA in response |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix CTA confidence threshold
- File: pmo/apps/api/src/modules/customer-success-ml/services/intelligent-cta.service.ts
- Check confidence threshold constant (0.5)
- Verify filtering logic before CTA creation
```

### ML-CS-CTA-003: CTA Cooldown Enforcement
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Generate CTA for account | CTA created |
| 2 | Note CTA type (e.g., churn_prevention) | Type: _____ |
| 3 | Immediately try to generate same type CTA | POST request |
| 4 | Verify cooldown message or skip | 7-day cooldown enforced |
| 5 | Wait or modify timestamp | After cooldown |
| 6 | Generate CTA again | CTA created |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix CTA cooldown enforcement
- File: pmo/apps/api/src/modules/customer-success-ml/services/intelligent-cta.service.ts
- Check cooldown checking logic
- Verify 7-day window calculation
- Check CTA type matching in cooldown check
```

### ML-CS-CTA-004: CTA Duplicate Detection
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Generate CTA with specific title | CTA created |
| 2 | Try to generate CTA with similar title | POST request |
| 3 | Verify duplicate detected | Similarity check passed |
| 4 | CTA should be skipped or merged | No duplicate created |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix CTA duplicate detection
- File: pmo/apps/api/src/modules/customer-success-ml/services/intelligent-cta.service.ts
- Check title similarity calculation
- Verify duplicate threshold
- Implement deduplication logic
```

### ML-CS-CTA-005: Batch CTA Generation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | POST /api/crm/accounts/portfolio/ml/generate-ctas | Returns 200 |
| 2 | Verify multiple CTAs generated | Array of CTAs |
| 3 | Verify sorted by priority | High priority first |
| 4 | Verify each CTA has valid metadata | All required fields |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix batch CTA generation
- File: pmo/apps/api/src/modules/customer-success-ml/services/intelligent-cta.service.ts
- Check generateBatchCTAs() method
- Verify sorting by probability
- Check error handling for individual failures
```

### ML-CS-CTA-006: CTA Statistics
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Generate several CTAs | CTAs exist |
| 2 | GET /api/crm/accounts/portfolio/ml/cta-stats | Returns 200 |
| 3 | Verify totalGenerated count | Matches created count |
| 4 | Verify byType breakdown | Counts per CTA type |
| 5 | Verify byUrgency breakdown | Counts per urgency level |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix CTA statistics
- File: pmo/apps/api/src/modules/customer-success-ml/services/intelligent-cta.service.ts
- Check getMLCTAStats() method
- Verify aggregation queries
- Check filtering by ML-generated CTAs
```

---

## 18. Project ML - Success Prediction (ML-PRJ-SP)

### Purpose
Test project success probability predictions.

### ML-PRJ-SP-001: Generate Success Prediction
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as admin@pmo.test | Login successful |
| 2 | Find project with tasks and milestones | Record project ID: _____ |
| 3 | POST /api/projects/{id}/ml/predict with type=success | Returns 200 |
| 4 | Verify onTimeProbability | Number between 0 and 1 |
| 5 | Verify onBudgetProbability | Number between 0 and 1 |
| 6 | Verify overallSuccessProbability | Number between 0 and 1 |
| 7 | Verify successFactors array | Positive indicators |
| 8 | Verify riskFactors array | Risk indicators |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix success prediction generation
- File: pmo/apps/api/src/modules/project-ml/services/success-prediction.service.ts
- Check predictProjectSuccess() method
- Verify context gathering
- Check probability calculations
```

### ML-PRJ-SP-002: Success Score Components
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Generate success prediction | Prediction returned |
| 2 | Verify task score component (35% weight) | Calculated from completion rate |
| 3 | Verify milestone score component (25% weight) | Calculated from on-time rate |
| 4 | Verify team score component (20% weight) | Calculated from workload balance |
| 5 | Verify velocity score component (20% weight) | Calculated from trend |

**Score Component Weights:**
- Task score: 35% - completion rate, overdue penalties, blocked penalties
- Milestone score: 25% - on-time rate, completion bonus
- Team score: 20% - workload balance, active member ratio
- Velocity score: 20% - trend (improving/stable/declining)

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix success score components
- File: pmo/apps/api/src/modules/project-ml/services/success-prediction.service.ts
- Check individual score calculations
- Verify weight application
- Check weighted average formula
```

### ML-PRJ-SP-003: Success Factor Generation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Find project with high completion rate | Project ID: _____ |
| 2 | Generate success prediction | Prediction returned |
| 3 | Verify successFactors includes completion rate | Factor present |
| 4 | Find project with balanced workload | Project ID: _____ |
| 5 | Generate success prediction | Prediction returned |
| 6 | Verify successFactors includes workload balance | Factor present |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix success factor generation
- File: pmo/apps/api/src/modules/project-ml/services/success-prediction.service.ts
- Check successFactors generation logic
- Verify threshold for positive factors
- Add missing factor categories
```

### ML-PRJ-SP-004: Risk Factor Generation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Find project with overdue tasks | Project ID: _____ |
| 2 | Generate success prediction | Prediction returned |
| 3 | Verify riskFactors includes overdue tasks | Factor present |
| 4 | Find project with blocked tasks | Project ID: _____ |
| 5 | Verify riskFactors includes blocked tasks | Factor present |
| 6 | Find project with declining velocity | Project ID: _____ |
| 7 | Verify riskFactors includes velocity decline | Factor present |

**Expected Risk Factors:**
- Overdue tasks or milestones
- Blocked tasks
- Workload imbalance (>0.5)
- Declining velocity trend
- Low completion rate

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix risk factor generation
- File: pmo/apps/api/src/modules/project-ml/services/success-prediction.service.ts
- Check riskFactors generation logic
- Verify risk thresholds
- Check metric calculations for triggers
```

### ML-PRJ-SP-005: Get Success Prediction
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Generate success prediction | POST successful |
| 2 | GET /api/projects/{id}/ml/success-prediction | Returns 200 |
| 3 | Verify prediction matches generated | Values equal |
| 4 | Verify prediction not expired | Within validity window |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix success prediction retrieval
- File: pmo/apps/api/src/modules/project-ml/services/project-ml-prediction.service.ts
- Check getLatestPrediction() method
- Verify type filtering
- Check expiration logic
```

---

## 19. Project ML - Risk Forecasting (ML-PRJ-RF)

### Purpose
Test project risk forecasting and early warning indicators.

### ML-PRJ-RF-001: Generate Risk Forecast
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Find project with varied task states | Project ID: _____ |
| 2 | POST /api/projects/{id}/ml/predict with type=risk | Returns 200 |
| 3 | Verify overallRiskLevel | low, medium, high, or critical |
| 4 | Verify identifiedRisks array | List of risks |
| 5 | Verify earlyWarningIndicators array | Warning indicators |
| 6 | Verify delayProbability | Number between 0 and 1 |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix risk forecast generation
- File: pmo/apps/api/src/modules/project-ml/services/risk-forecast.service.ts
- Check forecastProjectRisks() method
- Verify risk identification logic
- Check early warning detection
```

### ML-PRJ-RF-002: Risk Category Identification
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Generate risk forecast | Forecast returned |
| 2 | Verify identifiedRisks have category | scope, schedule, resource, technical, budget, external |
| 3 | Verify each risk has probability | Number between 0 and 1 |
| 4 | Verify each risk has impact | low, medium, or high |
| 5 | Verify each risk has mitigationSuggestion | Actionable text |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix risk category identification
- File: pmo/apps/api/src/modules/project-ml/services/risk-forecast.service.ts
- Check risk categorization logic
- Verify category enum values
- Add missing risk categories
```

### ML-PRJ-RF-003: Early Warning Indicators
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Generate risk forecast | Forecast returned |
| 2 | Verify earlyWarningIndicators array | Indicators present |
| 3 | Verify each indicator has name | Descriptive name |
| 4 | Verify each indicator has status | normal, warning, or critical |
| 5 | Verify each indicator has trigger | What caused the warning |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix early warning indicators
- File: pmo/apps/api/src/modules/project-ml/services/risk-forecast.service.ts
- Check early warning detection logic
- Verify status thresholds
- Add trigger descriptions
```

### ML-PRJ-RF-004: Get Risk Forecast
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Generate risk forecast | POST successful |
| 2 | GET /api/projects/{id}/ml/risk-forecast | Returns 200 |
| 3 | Verify forecast matches generated | Values equal |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix risk forecast retrieval
- File: pmo/apps/api/src/modules/project-ml/services/project-ml-prediction.service.ts
- Check getLatestPrediction() for risk type
- Verify query filtering
```

---

## 20. Project ML - Timeline Prediction (ML-PRJ-TL)

### Purpose
Test project timeline and completion date predictions.

### ML-PRJ-TL-001: Generate Timeline Prediction
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Find project with tasks and end date | Project ID: _____ |
| 2 | POST /api/projects/{id}/ml/predict with type=timeline | Returns 200 |
| 3 | Verify currentEndDate | Project's planned end date |
| 4 | Verify predictedEndDate | ML-calculated end date |
| 5 | Verify daysVariance | Difference in days |
| 6 | Verify confidenceInterval | min and max dates |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix timeline prediction generation
- File: pmo/apps/api/src/modules/project-ml/services/timeline-prediction.service.ts
- Check predictProjectTimeline() method
- Verify date calculations
- Check variance calculation
```

### ML-PRJ-TL-002: Delay Factor Calculation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Find project with blocked tasks | Project ID: _____ |
| 2 | Generate timeline prediction | Prediction returned |
| 3 | Verify delayFactors includes blocked tasks | +2 days each |
| 4 | Find project with overdue milestones | Project ID: _____ |
| 5 | Verify delayFactors includes milestone delays | +3 days each |
| 6 | Find project with declining velocity | Project ID: _____ |
| 7 | Verify delayFactors includes velocity decline | +5 days |

**Delay Factor Weights:**
- Blocked tasks: +2 days each
- Overdue milestones: +3 days each
- Declining velocity: +5 days

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix delay factor calculation
- File: pmo/apps/api/src/modules/project-ml/services/timeline-prediction.service.ts
- Check delay factor accumulation logic
- Verify factor weights
- Check blocked task counting
```

### ML-PRJ-TL-003: Confidence Interval Calculation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Generate timeline prediction | Prediction returned |
| 2 | Verify confidenceInterval.optimistic | Earlier than predicted |
| 3 | Verify confidenceInterval.pessimistic | Later than predicted |
| 4 | Verify interval width is reasonable | Based on uncertainty |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix confidence interval calculation
- File: pmo/apps/api/src/modules/project-ml/services/timeline-prediction.service.ts
- Check confidence interval formula
- Verify optimistic/pessimistic bounds
- Check uncertainty factor
```

### ML-PRJ-TL-004: Acceleration Opportunities
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Find project with improvement potential | Project ID: _____ |
| 2 | Generate timeline prediction | Prediction returned |
| 3 | Verify accelerationOpportunities array | Opportunities present |
| 4 | Verify opportunities include "resolve blockers" | If blocked tasks exist |
| 5 | Verify opportunities include "balance workload" | If imbalance exists |
| 6 | Verify opportunities include "improve velocity" | If velocity declining |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix acceleration opportunities
- File: pmo/apps/api/src/modules/project-ml/services/timeline-prediction.service.ts
- Check opportunity generation logic
- Add contextual opportunity suggestions
- Verify trigger conditions
```

### ML-PRJ-TL-005: Get Timeline Prediction
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Generate timeline prediction | POST successful |
| 2 | GET /api/projects/{id}/ml/timeline-prediction | Returns 200 |
| 3 | Verify prediction matches generated | Values equal |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix timeline prediction retrieval
- File: pmo/apps/api/src/modules/project-ml/services/project-ml-prediction.service.ts
- Check getLatestPrediction() for timeline type
```

---

## 21. Project ML - Resource Optimization (ML-PRJ-RO)

### Purpose
Test resource allocation analysis and optimization suggestions.

### ML-PRJ-RO-001: Generate Resource Optimization
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Find project with multiple team members | Project ID: _____ |
| 2 | POST /api/projects/{id}/ml/predict with type=resource | Returns 200 |
| 3 | Verify workloadBalance score | Number between 0 and 1 |
| 4 | Verify reassignmentSuggestions array | Suggestions present |
| 5 | Verify bottlenecks array | Bottlenecks identified |
| 6 | Verify capacityForecast | 4-week projection |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix resource optimization generation
- File: pmo/apps/api/src/modules/project-ml/services/resource-optimization.service.ts
- Check optimizeProjectResources() method
- Verify workload calculation
- Check bottleneck detection
```

### ML-PRJ-RO-002: Workload Balance Scoring
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Find project with evenly distributed tasks | Project ID: _____ |
| 2 | Generate resource optimization | Optimization returned |
| 3 | Verify workloadBalance is high (>0.7) | Well-balanced |
| 4 | Find project with imbalanced distribution | Project ID: _____ |
| 5 | Generate resource optimization | Optimization returned |
| 6 | Verify workloadBalance is lower (<0.5) | Imbalanced |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix workload balance scoring
- File: pmo/apps/api/src/modules/project-ml/services/resource-optimization.service.ts
- Check workload balance calculation (Gini coefficient)
- Verify task distribution analysis
```

### ML-PRJ-RO-003: Reassignment Suggestions
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Find project with overloaded member | Project ID: _____ |
| 2 | Generate resource optimization | Optimization returned |
| 3 | Verify reassignmentSuggestions not empty | Suggestions present |
| 4 | Verify each suggestion has taskId | Task to reassign |
| 5 | Verify each suggestion has fromUserId | Current assignee |
| 6 | Verify each suggestion has toUserId | Suggested assignee |
| 7 | Verify each suggestion has reason | Explanation |
| 8 | Verify each suggestion has confidence | 0-1 score |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix reassignment suggestions
- File: pmo/apps/api/src/modules/project-ml/services/resource-optimization.service.ts
- Check reassignment logic
- Verify overloaded/underloaded detection
- Add skill matching consideration
```

### ML-PRJ-RO-004: Bottleneck Detection
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Find project with clear bottlenecks | Project ID: _____ |
| 2 | Generate resource optimization | Optimization returned |
| 3 | Verify bottlenecks array | Bottlenecks identified |
| 4 | Check for "overloaded_member" bottleneck | If applicable |
| 5 | Check for "skill_gap" bottleneck | If applicable |
| 6 | Check for "dependency_chain" bottleneck | If applicable |
| 7 | Check for "unassigned_tasks" bottleneck | If tasks unassigned |

**Bottleneck Types:**
- overloaded_member: Single person has too many tasks
- skill_gap: Tasks requiring unavailable skills
- dependency_chain: Long chains of blocked tasks
- unassigned_tasks: Tasks without assignees

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix bottleneck detection
- File: pmo/apps/api/src/modules/project-ml/services/resource-optimization.service.ts
- Check bottleneck detection logic
- Add missing bottleneck types
- Verify threshold values
```

### ML-PRJ-RO-005: Capacity Forecast
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Generate resource optimization | Optimization returned |
| 2 | Verify capacityForecast has 4 weeks | Array length = 4 |
| 3 | Verify each week has weekNumber | 1-4 |
| 4 | Verify each week has availableCapacity | Hours/percentage |
| 5 | Verify each week has projectedDemand | Task hours |
| 6 | Verify each week has utilizationRate | Demand/Capacity |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix capacity forecast
- File: pmo/apps/api/src/modules/project-ml/services/resource-optimization.service.ts
- Check capacity projection logic
- Verify weekly calculation
- Add utilization rate calculation
```

### ML-PRJ-RO-006: Get Resource Optimization
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Generate resource optimization | POST successful |
| 2 | GET /api/projects/{id}/ml/resource-optimization | Returns 200 |
| 3 | Verify optimization matches generated | Values equal |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix resource optimization retrieval
- File: pmo/apps/api/src/modules/project-ml/services/project-ml-prediction.service.ts
- Check getLatestPrediction() for resource type
```

---

## 22. ML Tenant Isolation (ML-TI)

### Purpose
Verify ML predictions are properly isolated between tenants.

### ML-TI-001: Lead ML Tenant Isolation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as Tenant 1 (admin@pmo.test) | Login successful |
| 2 | Find a lead in Tenant 1 | Record Lead ID: _____ |
| 3 | Generate prediction for Tenant 1 lead | Prediction returned |
| 4 | Record prediction ID | ID: _____ |
| 5 | Logout and login as Tenant 2 (acme.admin@pmo.test) | Login successful |
| 6 | Try GET /api/lead-scoring/leads/{Tenant1_LeadID}/ml/prediction | **Should return 404** |
| 7 | Try POST /api/lead-scoring/leads/{Tenant1_LeadID}/ml/predict | **Should return 404** |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix lead ML tenant isolation
- File: pmo/apps/api/src/modules/lead-ml/lead-ml.router.ts
- Add tenant check to all lead ML routes
- Verify lead belongs to current tenant before ML operations
```

### ML-TI-002: Customer Success ML Tenant Isolation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as Tenant 1 | Login successful |
| 2 | Find an account in Tenant 1 | Record Account ID: _____ |
| 3 | Generate churn prediction for Tenant 1 account | Prediction returned |
| 4 | Logout and login as Tenant 2 | Login successful |
| 5 | Try GET /api/crm/accounts/{Tenant1_AccountID}/ml/churn-risk | **Should return 404** |
| 6 | Try POST /api/crm/accounts/{Tenant1_AccountID}/ml/predict | **Should return 404** |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix CS ML tenant isolation
- File: pmo/apps/api/src/modules/customer-success-ml/customer-success-ml.router.ts
- Add tenant check to all CS ML routes
- Verify account belongs to current tenant before ML operations
```

### ML-TI-003: Project ML Tenant Isolation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as Tenant 1 | Login successful |
| 2 | Find a project in Tenant 1 | Record Project ID: _____ |
| 3 | Generate success prediction for Tenant 1 project | Prediction returned |
| 4 | Logout and login as Tenant 2 | Login successful |
| 5 | Try GET /api/projects/{Tenant1_ProjectID}/ml/success-prediction | **Should return 404** |
| 6 | Try POST /api/projects/{Tenant1_ProjectID}/ml/predict | **Should return 404** |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix project ML tenant isolation
- File: pmo/apps/api/src/modules/project-ml/project-ml.router.ts
- Add tenant check to all project ML routes
- Verify project belongs to current tenant before ML operations
```

### ML-TI-004: ML Accuracy Metrics Tenant Isolation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as Tenant 1 | Login successful |
| 2 | GET /api/lead-scoring/{configId}/ml/accuracy | Tenant 1 metrics |
| 3 | Record accuracy metrics | Values: _____ |
| 4 | Login as Tenant 2 | Login successful |
| 5 | GET /api/lead-scoring/{configId}/ml/accuracy | Tenant 2 metrics |
| 6 | **Verify different metrics** | Tenant-specific data |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix accuracy metrics tenant isolation
- File: pmo/apps/api/src/modules/lead-ml/services/lead-conversion-prediction.service.ts
- Verify getPredictionAccuracy() filters by tenantId
- Add tenant check to configId resolution
```

### ML-TI-005: High-Risk Portfolio Tenant Isolation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as Tenant 1 | Login successful |
| 2 | GET /api/crm/accounts/portfolio/ml/high-risk | Tenant 1 accounts |
| 3 | Count high-risk accounts | Count: _____ |
| 4 | Login as Tenant 2 | Login successful |
| 5 | GET /api/crm/accounts/portfolio/ml/high-risk | Tenant 2 accounts |
| 6 | **Verify different accounts** | Tenant-specific list |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix portfolio tenant isolation
- File: pmo/apps/api/src/modules/customer-success-ml/services/cs-ml-prediction.service.ts
- Verify getHighRiskAccounts() filters by tenantId
- Add tenant context to all portfolio queries
```

---

## 23. ML Performance & Caching (ML-PERF)

### Purpose
Test ML prediction performance and caching behavior.

### ML-PERF-001: Prediction Caching
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Clear any existing predictions (or use new entity) | Clean state |
| 2 | POST prediction request | Note response time: _____ ms |
| 3 | Immediately GET same prediction | Note response time: _____ ms |
| 4 | **Verify GET is faster** | Cached response |
| 5 | Verify prediction data matches | Same values |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix prediction caching
- Verify prediction storage after generation
- Check cache lookup before generation
- Verify expiration logic
```

### ML-PERF-002: Cache Expiration
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Generate prediction | Prediction created |
| 2 | Check expiresAt timestamp | Should be ~7 days from now |
| 3 | Verify prediction returned before expiration | Cached response |
| 4 | **(Manual)** Wait or modify expiresAt | Past expiration |
| 5 | Request prediction again | New prediction generated |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix cache expiration
- Verify expiresAt calculation (7 days default)
- Check expiration comparison in lookup
- Force refresh when expired
```

### ML-PERF-003: Force Refresh
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Generate prediction | Prediction cached |
| 2 | Note prediction ID/timestamp | ID: _____, time: _____ |
| 3 | POST with forceRefresh=true | New prediction generated |
| 4 | Note new prediction ID/timestamp | ID: _____, time: _____ |
| 5 | **Verify different prediction** | New ID/timestamp |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix force refresh
- Check forceRefresh parameter handling
- Bypass cache lookup when forceRefresh=true
- Verify new prediction storage
```

### ML-PERF-004: Bulk Prediction Performance
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Prepare list of 10 entity IDs | IDs ready |
| 2 | POST bulk prediction request | Note start time |
| 3 | Wait for response | Note end time |
| 4 | Calculate processing time | Should be < 60 seconds |
| 5 | Verify all 10 predictions returned | Complete results |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Optimize bulk predictions
- Implement batch processing
- Add parallel API calls where safe
- Consider queue-based processing for large batches
```

### ML-PERF-005: Concurrent Request Handling
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Send 5 prediction requests simultaneously | Multiple requests |
| 2 | Wait for all responses | All complete |
| 3 | Verify no errors | All return 200 |
| 4 | Verify no duplicate predictions | One per entity |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix concurrent request handling
- Add request deduplication
- Implement prediction locking
- Handle race conditions
```

---

## 24. ML Accuracy & Validation (ML-ACC)

### Purpose
Test prediction validation and accuracy tracking.

### ML-ACC-001: Validate Prediction
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Generate a prediction | Prediction exists |
| 2 | Record prediction ID | ID: _____ |
| 3 | POST /api/lead-scoring/predictions/{id}/validate with isAccurate=true | Returns 200 |
| 4 | Verify prediction marked as validated | validatedAt set |
| 5 | Verify isAccurate = true | Correct value |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix prediction validation
- File: pmo/apps/api/src/modules/lead-ml/services/lead-conversion-prediction.service.ts
- Check validatePrediction() method
- Verify database update
```

### ML-ACC-002: Accuracy Metrics Calculation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create several predictions | Predictions exist |
| 2 | Validate some as accurate, some as inaccurate | Mixed results |
| 3 | GET /api/lead-scoring/{configId}/ml/accuracy | Returns metrics |
| 4 | Verify totalPredictions count | Matches created count |
| 5 | Verify validatedCount | Matches validated count |
| 6 | Verify accuracyRate | Accurate / Validated |

**Accuracy Formula:**
- accuracyRate = accurateCount / validatedCount
- Only includes predictions that have been validated

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix accuracy metrics calculation
- Check getPredictionAccuracy() method
- Verify count queries
- Check accuracy rate calculation
```

### ML-ACC-003: Feature Importance
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | GET /api/lead-scoring/{configId}/ml/feature-importance | Returns 200 |
| 2 | Verify features array | List of features |
| 3 | Verify each feature has name | Feature identifier |
| 4 | Verify each feature has weight | Importance score |
| 5 | Verify weights sum to ~1.0 | Normalized weights |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix feature importance
- Calculate feature weights from validated predictions
- Normalize weights to sum to 1.0
- Return top contributing features
```

### ML-ACC-004: Validate Expired Predictions
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | POST /api/crm/accounts/portfolio/ml/validate-predictions | Returns 200 |
| 2 | Verify count of validated | Number processed |
| 3 | Check previously expired predictions | Now validated |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix expired prediction validation
- Find predictions past expiresAt
- Mark as validated
- Trigger outcome check
```

---

## 25. ML Fallback Behavior (ML-FB)

### Purpose
Test ML module behavior when LLM is unavailable.

### ML-FB-001: Rule-Based Fallback for Lead Prediction
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | **(Setup)** Disable OpenAI API key or mock failure | AI unavailable |
| 2 | POST /api/lead-scoring/leads/{id}/ml/predict | Returns 200 (not error) |
| 3 | Verify prediction returned | Has all required fields |
| 4 | Verify confidence = 0.6 | Rule-based indicator |
| 5 | Verify explanation mentions rule-based | Clear source |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix rule-based fallback
- File: pmo/apps/api/src/modules/lead-ml/services/lead-rule-based-prediction.service.ts
- Verify fallback triggers on AI failure
- Check all required fields are returned
- Set confidence to 0.6 for rule-based
```

### ML-FB-002: Rule-Based Fallback for Churn Prediction
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | **(Setup)** Disable OpenAI API key | AI unavailable |
| 2 | POST /api/crm/accounts/{id}/ml/predict | Returns 200 (not error) |
| 3 | Verify churn prediction returned | Has required fields |
| 4 | Verify reasonable churnProbability | Based on rule factors |
| 5 | Verify riskCategory assigned | Correct threshold |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix CS rule-based fallback
- File: pmo/apps/api/src/modules/customer-success-ml/services/churn-prediction.service.ts
- Check predictChurnRuleBased() implementation
- Verify factor calculations
```

### ML-FB-003: Rule-Based Fallback for Project Success
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | **(Setup)** Disable OpenAI API key | AI unavailable |
| 2 | POST /api/projects/{id}/ml/predict type=success | Returns 200 (not error) |
| 3 | Verify success prediction returned | Has required fields |
| 4 | Verify probability calculations | Based on task/milestone metrics |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix project rule-based fallback
- File: pmo/apps/api/src/modules/project-ml/services/success-prediction.service.ts
- Check predictProjectSuccessRuleBased() implementation
- Verify score component calculations
```

### ML-FB-004: Graceful Error Handling
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Request prediction for non-existent entity | Returns 404 |
| 2 | Request prediction with invalid parameters | Returns 400 |
| 3 | Verify error response format | Consistent error schema |
| 4 | Verify no stack traces exposed | Secure error messages |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Fix error handling
- Add proper error responses for edge cases
- Ensure consistent error schema
- Remove stack traces from production errors
```

### ML-FB-005: ML Service Status Check
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | GET /api/crm/accounts/portfolio/ml/status | Returns 200 |
| 2 | Verify llmAvailable field | true/false |
| 3 | Verify fallbackMode field | Indicates if using rules |
| 4 | Verify lastHealthCheck timestamp | Recent timestamp |

**Status:** [ ] Pass [ ] Fail
**Notes:**

**AI Agent Action on Failure:**
```
TODO: Implement ML status endpoint
- Check OpenAI API availability
- Return fallback mode status
- Include last health check timestamp
```

---

## 26. Test Results Summary

### Overall Results

| Category | Total Tests | Passed | Failed | Blocked | Pass Rate |
|----------|-------------|--------|--------|---------|-----------|
| ML-LEAD-FE (Feature Extraction) | 6 | | | | |
| ML-LEAD-CP (Conversion Prediction) | 7 | | | | |
| ML-LEAD-PR (Priority Ranking) | 4 | | | | |
| ML-CS-CH (Churn Prediction) | 6 | | | | |
| ML-CS-HI (Health Insights) | 4 | | | | |
| ML-CS-CTA (Intelligent CTA) | 6 | | | | |
| ML-PRJ-SP (Success Prediction) | 5 | | | | |
| ML-PRJ-RF (Risk Forecasting) | 4 | | | | |
| ML-PRJ-TL (Timeline Prediction) | 5 | | | | |
| ML-PRJ-RO (Resource Optimization) | 6 | | | | |
| ML-TI (Tenant Isolation) | 5 | | | | |
| ML-PERF (Performance & Caching) | 5 | | | | |
| ML-ACC (Accuracy & Validation) | 4 | | | | |
| ML-FB (Fallback Behavior) | 5 | | | | |
| **TOTAL ML TESTS** | **72** | | | | |

### ML Module Summary

| Module | Tests | Critical Issues | Status |
|--------|-------|-----------------|--------|
| Lead ML | 17 | | [ ] Pass [ ] Fail |
| Customer Success ML | 16 | | [ ] Pass [ ] Fail |
| Project ML | 20 | | [ ] Pass [ ] Fail |
| ML Integration | 19 | | [ ] Pass [ ] Fail |
| **Overall ML** | **72** | | **[ ] PASS [ ] FAIL** |

---

## 27. Issue Log

### AI Agent Issue Tracking Format

When an AI agent discovers an issue during testing, log it in this format:

```markdown
### Issue: [TEST-ID] - [Brief Description]

**Test Case:** [Full test case reference]
**Severity:** Critical | High | Medium | Low
**Status:** Open | In Progress | Fixed | Verified

**Description:**
[What was expected vs what happened]

**Root Cause:**
[If identified, the cause of the issue]

**Fix Required:**
[Specific file(s) and changes needed]

**TODO:**
- [ ] [Specific action item 1]
- [ ] [Specific action item 2]
- [ ] Verify fix by re-running test

**Fixed By:** [Agent/Human identifier]
**Fix Date:** [Date]
**Verification:** [ ] Re-tested and passed
```

### Critical Issues (ML Functionality Failures)

| Issue ID | Test ID | Description | Severity | Status |
|----------|---------|-------------|----------|--------|
| | | | | |

### High Priority Issues

| Issue ID | Test ID | Description | Severity | Status |
|----------|---------|-------------|----------|--------|
| | | | | |

### Medium Priority Issues

| Issue ID | Test ID | Description | Severity | Status |
|----------|---------|-------------|----------|--------|
| | | | | |

### Low Priority Issues

| Issue ID | Test ID | Description | Severity | Status |
|----------|---------|-------------|----------|--------|
| | | | | |

---

## 28. Sign-Off

### Testing Completion

| Section | Tester | Date | Status |
|---------|--------|------|--------|
| Lead ML (ML-LEAD-*) | | | |
| Customer Success ML (ML-CS-*) | | | |
| Project ML (ML-PRJ-*) | | | |
| ML Integration (ML-TI, ML-PERF, ML-ACC, ML-FB) | | | |

### Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| QA Lead | | | |
| ML Engineer | | | |
| Development Lead | | | |
| Product Owner | | | |

### Certification Statement

**I certify that:**
- [ ] All ML tests in this document have been executed
- [ ] ML predictions return valid, bounded values
- [ ] ML tenant isolation is verified
- [ ] Rule-based fallback works when LLM unavailable
- [ ] Prediction caching and performance is acceptable
- [ ] All critical ML issues have been resolved

---

## Appendix A: ML API Testing Commands

### Lead ML Testing
```bash
# Feature extraction
curl -X GET "https://verdanthorizon.ai/api/lead-scoring/leads/{id}/ml/features" \
  -H "Authorization: Bearer $TOKEN"

# Conversion prediction
curl -X POST "https://verdanthorizon.ai/api/lead-scoring/leads/{id}/ml/predict" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Get ranked leads
curl -X GET "https://verdanthorizon.ai/api/lead-scoring/{configId}/ml/ranked-leads" \
  -H "Authorization: Bearer $TOKEN"

# Bulk prediction
curl -X POST "https://verdanthorizon.ai/api/lead-scoring/{configId}/ml/bulk-predict" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"leadIds": ["id1", "id2", "id3"]}'
```

### Customer Success ML Testing
```bash
# Churn prediction
curl -X POST "https://verdanthorizon.ai/api/crm/accounts/{id}/ml/predict" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Health insights
curl -X GET "https://verdanthorizon.ai/api/crm/accounts/{id}/ml/health-insights" \
  -H "Authorization: Bearer $TOKEN"

# Generate CTA
curl -X POST "https://verdanthorizon.ai/api/crm/accounts/{id}/ml/generate-cta" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# High-risk accounts
curl -X GET "https://verdanthorizon.ai/api/crm/accounts/portfolio/ml/high-risk" \
  -H "Authorization: Bearer $TOKEN"
```

### Project ML Testing
```bash
# Success prediction
curl -X POST "https://verdanthorizon.ai/api/projects/{id}/ml/predict" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "success"}'

# Risk forecast
curl -X POST "https://verdanthorizon.ai/api/projects/{id}/ml/predict" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "risk"}'

# Timeline prediction
curl -X POST "https://verdanthorizon.ai/api/projects/{id}/ml/predict" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "timeline"}'

# Resource optimization
curl -X POST "https://verdanthorizon.ai/api/projects/{id}/ml/predict" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "resource"}'

# At-risk projects
curl -X GET "https://verdanthorizon.ai/api/projects/portfolio/ml/at-risk" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Appendix B: AI Agent Execution Guide

### Running UAT with AI Agent

This UAT document is designed for AI agent execution. Here's how to use it:

1. **Test Execution**: Execute each test case in order, recording pass/fail status

2. **Issue Detection**: When a test fails:
   - Create a todo item immediately
   - Log the issue in the Issue Log section
   - Note the specific failure details

3. **Immediate Fixing**: For each failed test:
   - Read the "AI Agent Action on Failure" section
   - Navigate to the specified file
   - Apply the suggested fix
   - Re-run the test to verify

4. **Verification Loop**:
   ```
   FOR each test case:
     Execute test
     IF failed:
       Create TODO item
       Read failure action
       Apply fix
       Re-run test
       IF passed:
         Mark TODO complete
         Update test status to Pass
       ELSE:
         Escalate to human review
   ```

5. **Progress Tracking**: Update the Test Results Summary after each section

### Example AI Agent Todo List

```markdown
## UAT Execution Todos

- [x] Setup test environment
- [x] Verify ML endpoints accessible
- [ ] Execute ML-LEAD-FE tests (0/6 complete)
  - [x] ML-LEAD-FE-001: Extract Features
  - [ ] ML-LEAD-FE-002: Email Domain Classification - FAILED
    - TODO: Fix email domain parsing in lead-feature-extraction.service.ts
  - [ ] ML-LEAD-FE-003: Title Seniority Detection
  - [ ] ML-LEAD-FE-004: Activity Burst Detection
  - [ ] ML-LEAD-FE-005: Recency Score Calculation
  - [ ] ML-LEAD-FE-006: Lead with No Activities
- [ ] Execute ML-LEAD-CP tests (0/7 complete)
- [ ] Execute ML-LEAD-PR tests (0/4 complete)
... etc
```

---

**End of UAT Testing Script v7.0**
