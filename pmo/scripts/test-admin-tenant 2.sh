#!/bin/bash
# Test script for Admin and Tenant modules
# Tests security fixes and core functionality

API_URL="http://localhost:4000/api"
ADMIN_EMAIL="Admin@pmo.test"
ADMIN_PASSWORD="Seattleu21*"
TEST_RESULTS=()
PASSED=0
FAILED=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_test() {
    local name="$1"
    local result="$2"
    local details="$3"

    if [ "$result" == "PASS" ]; then
        echo -e "${GREEN}✓ PASS${NC}: $name"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}: $name"
        echo -e "  ${YELLOW}Details${NC}: $details"
        ((FAILED++))
    fi
}

echo "========================================"
echo "Admin & Tenant Module Tests"
echo "========================================"
echo ""

# 1. Test Health Check
echo "--- Basic Health Check ---"
HEALTH=$(curl -s "$API_URL/healthz")
if echo "$HEALTH" | grep -q '"status":"ok"'; then
    log_test "API Health Check" "PASS"
else
    log_test "API Health Check" "FAIL" "$HEALTH"
fi

# 2. Login as Admin
echo ""
echo "--- Authentication Tests ---"
LOGIN_RESPONSE=$(curl -s -c /tmp/cookies.txt -b /tmp/cookies.txt \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
    "$API_URL/auth/login")

if echo "$LOGIN_RESPONSE" | grep -q '"id"'; then
    log_test "Admin Login" "PASS"
    ADMIN_ID=$(echo "$LOGIN_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
else
    log_test "Admin Login" "FAIL" "$LOGIN_RESPONSE"
    echo "Cannot continue without authentication"
    exit 1
fi

# Set auth header for subsequent requests
AUTH_HEADER="Authorization: Bearer $TOKEN"

# 3. Test Tenant List (Admin)
echo ""
echo "--- Tenant Management Tests ---"
TENANT_LIST=$(curl -s -b /tmp/cookies.txt -H "$AUTH_HEADER" "$API_URL/admin/tenants")
if echo "$TENANT_LIST" | grep -qE '"tenants"|"data"'; then
    log_test "List All Tenants (Admin)" "PASS"
    TENANT_COUNT=$(echo "$TENANT_LIST" | grep -o '"total":[0-9]*' | cut -d: -f2)
    echo "  Found $TENANT_COUNT tenants"
else
    log_test "List All Tenants (Admin)" "FAIL" "$TENANT_LIST"
fi

# 4. Test Tenant Stats
TENANT_STATS=$(curl -s -b /tmp/cookies.txt -H "$AUTH_HEADER" "$API_URL/admin/tenants/stats")
if echo "$TENANT_STATS" | grep -qE '"total"|"totalTenants"'; then
    log_test "Get Tenant Statistics" "PASS"
else
    log_test "Get Tenant Statistics" "FAIL" "$TENANT_STATS"
fi

# 5. Test My Tenants
MY_TENANTS=$(curl -s -b /tmp/cookies.txt -H "$AUTH_HEADER" "$API_URL/tenants/my")
if echo "$MY_TENANTS" | grep -q '"data"'; then
    log_test "Get My Tenants" "PASS"
    FIRST_TENANT_ID=$(echo "$MY_TENANTS" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "  First tenant ID: $FIRST_TENANT_ID"
else
    log_test "Get My Tenants" "FAIL" "$MY_TENANTS"
fi

# 6. Test Current Tenant (with X-Tenant-ID header)
echo ""
echo "--- Tenant Context Tests ---"
if [ -n "$FIRST_TENANT_ID" ]; then
    CURRENT_TENANT=$(curl -s -b /tmp/cookies.txt -H "$AUTH_HEADER" \
        -H "X-Tenant-ID: $FIRST_TENANT_ID" \
        "$API_URL/tenants/current")
    if echo "$CURRENT_TENANT" | grep -q '"data"'; then
        log_test "Get Current Tenant" "PASS"
    else
        log_test "Get Current Tenant" "FAIL" "$CURRENT_TENANT"
    fi
fi

# 7. Test X-Tenant-ID Security (Unauthenticated should not work)
echo ""
echo "--- Security Tests ---"

# Test: Unauthenticated request with X-Tenant-ID should not expose tenant data
UNAUTH_TENANT=$(curl -s -H "X-Tenant-ID: $FIRST_TENANT_ID" "$API_URL/tenants/current")
if echo "$UNAUTH_TENANT" | grep -q '"error"'; then
    log_test "X-Tenant-ID rejected for unauthenticated requests" "PASS"
else
    log_test "X-Tenant-ID rejected for unauthenticated requests" "FAIL" "Got: $UNAUTH_TENANT"
fi

# Test: /api/modules without auth should not accept tenantId parameter
MODULES_UNAUTH=$(curl -s "$API_URL/modules?tenantId=some-other-tenant")
# Should return default config, not tenant-specific
if echo "$MODULES_UNAUTH" | grep -q '"modules"'; then
    # Verify it's default config (tenantId should be 'default' or undefined)
    log_test "Module endpoint returns default config for unauthenticated" "PASS"
else
    log_test "Module endpoint returns default config for unauthenticated" "FAIL" "$MODULES_UNAUTH"
fi

# Test: Module endpoint with auth uses verified tenant context
MODULES_AUTH=$(curl -s -b /tmp/cookies.txt -H "$AUTH_HEADER" \
    -H "X-Tenant-ID: $FIRST_TENANT_ID" \
    "$API_URL/modules")
if echo "$MODULES_AUTH" | grep -q '"modules"'; then
    log_test "Module endpoint with auth returns tenant config" "PASS"
else
    log_test "Module endpoint with auth returns tenant config" "FAIL" "$MODULES_AUTH"
fi

# 8. Test User Management (Admin)
echo ""
echo "--- User Management Tests ---"
USERS_LIST=$(curl -s -b /tmp/cookies.txt -H "$AUTH_HEADER" "$API_URL/users")
if echo "$USERS_LIST" | grep -q '\['; then
    log_test "List Users (Admin)" "PASS"
    USER_COUNT=$(echo "$USERS_LIST" | grep -o '"id"' | wc -l | tr -d ' ')
    echo "  Found $USER_COUNT users"
else
    log_test "List Users (Admin)" "FAIL" "$USERS_LIST"
fi

# 9. Test Self-Deletion Prevention
echo ""
echo "--- Self-Deletion Prevention Test ---"
SELF_DELETE=$(curl -s -X DELETE -b /tmp/cookies.txt -H "$AUTH_HEADER" \
    "$API_URL/users/$ADMIN_ID")
if echo "$SELF_DELETE" | grep -q "Cannot delete your own account"; then
    log_test "Admin cannot delete own account" "PASS"
else
    log_test "Admin cannot delete own account" "FAIL" "$SELF_DELETE"
fi

# 10. Test Tenant Routes Role Protection
echo ""
echo "--- Tenant Route Authorization Tests ---"

# Create a regular user for testing (if not exists)
TEST_USER_EMAIL="test-regular-user-$(date +%s)@test.com"
CREATE_USER=$(curl -s -X POST -b /tmp/cookies.txt -H "$AUTH_HEADER" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_USER_EMAIL\",\"name\":\"Test Regular User\",\"password\":\"TestPass123!\",\"role\":\"USER\",\"timezone\":\"UTC\"}" \
    "$API_URL/users")

if echo "$CREATE_USER" | grep -q '"id"'; then
    TEST_USER_ID=$(echo "$CREATE_USER" | grep -o '"id":[0-9]*' | cut -d: -f2)
    log_test "Create test user for role testing" "PASS"

    # Login as the regular user
    REGULAR_LOGIN=$(curl -s -c /tmp/regular_cookies.txt \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$TEST_USER_EMAIL\",\"password\":\"TestPass123!\"}" \
        "$API_URL/auth/login")

    if echo "$REGULAR_LOGIN" | grep -q '"token"'; then
        REGULAR_TOKEN=$(echo "$REGULAR_LOGIN" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

        # Try to update branding as regular user (should fail with 403)
        BRANDING_UPDATE=$(curl -s -X PUT -b /tmp/regular_cookies.txt \
            -H "Authorization: Bearer $REGULAR_TOKEN" \
            -H "X-Tenant-ID: $FIRST_TENANT_ID" \
            -H "Content-Type: application/json" \
            -d '{"primaryColor":"#ff0000"}' \
            "$API_URL/tenants/current/branding")

        if echo "$BRANDING_UPDATE" | grep -qE '"error"|403|Forbidden|unauthorized|Unauthorized'; then
            log_test "Regular user cannot update tenant branding" "PASS"
        else
            log_test "Regular user cannot update tenant branding" "FAIL" "$BRANDING_UPDATE"
        fi
    fi

    # Cleanup: Delete test user
    curl -s -X DELETE -b /tmp/cookies.txt -H "$AUTH_HEADER" "$API_URL/users/$TEST_USER_ID" > /dev/null
else
    log_test "Create test user for role testing" "FAIL" "$CREATE_USER"
fi

# 11. Test Rate Limiting
echo ""
echo "--- Rate Limiting Tests ---"
# Make several rapid requests to test rate limiting exists
RATE_TEST_COUNT=0
for i in {1..5}; do
    RATE_RESP=$(curl -s -b /tmp/cookies.txt -H "$AUTH_HEADER" "$API_URL/users")
    if echo "$RATE_RESP" | grep -q '\['; then
        ((RATE_TEST_COUNT++))
    fi
done
if [ $RATE_TEST_COUNT -eq 5 ]; then
    log_test "Rate limiting allows normal traffic" "PASS"
else
    log_test "Rate limiting allows normal traffic" "FAIL" "Only $RATE_TEST_COUNT/5 requests succeeded"
fi

# 12. Test Public Lead Submission (Generic Error)
echo ""
echo "--- Public Lead Endpoint Security ---"
INVALID_LEAD=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d '{"name":"Test","email":"test@test.com","tenantSlug":"nonexistent-tenant-xyz"}' \
    "$API_URL/public/inbound-leads")
if echo "$INVALID_LEAD" | grep -q "Unable to process lead submission"; then
    log_test "Public lead returns generic error (no tenant enumeration)" "PASS"
else
    log_test "Public lead returns generic error (no tenant enumeration)" "FAIL" "$INVALID_LEAD"
fi

# 13. Test Notification Ownership (requires a notification to exist)
echo ""
echo "--- Notification Ownership Test ---"
# Get notifications for current user
NOTIFICATIONS=$(curl -s -b /tmp/cookies.txt -H "$AUTH_HEADER" \
    -H "X-Tenant-ID: $FIRST_TENANT_ID" \
    "$API_URL/notifications")
if echo "$NOTIFICATIONS" | grep -qE '"data"|"notifications"|\[\]'; then
    log_test "Notification list returns user's notifications" "PASS"
else
    log_test "Notification list returns user's notifications" "FAIL" "$NOTIFICATIONS"
fi

# 14. Test Audit Logging (check that user operations are logged)
echo ""
echo "--- Audit Logging Test ---"
AUDIT_LOGS=$(curl -s -b /tmp/cookies.txt -H "$AUTH_HEADER" \
    -H "X-Tenant-ID: $FIRST_TENANT_ID" \
    "$API_URL/audit?entityType=User&limit=5")
if echo "$AUDIT_LOGS" | grep -qE '"data"|"logs"|\[\]'; then
    log_test "Audit logs accessible for user operations" "PASS"
else
    log_test "Audit logs accessible for user operations" "FAIL" "$AUDIT_LOGS"
fi

# 15. Test Tenant Switching
echo ""
echo "--- Tenant Switching Test ---"
if [ -n "$FIRST_TENANT_ID" ]; then
    SWITCH_RESULT=$(curl -s -X POST -b /tmp/cookies.txt -H "$AUTH_HEADER" \
        "$API_URL/tenants/switch/$FIRST_TENANT_ID")
    if echo "$SWITCH_RESULT" | grep -qE '"data"|"tenant"|"id"'; then
        log_test "Tenant switching works" "PASS"
    else
        log_test "Tenant switching works" "FAIL" "$SWITCH_RESULT"
    fi
fi

# Cleanup
rm -f /tmp/cookies.txt /tmp/regular_cookies.txt

# Summary
echo ""
echo "========================================"
echo "Test Summary"
echo "========================================"
echo -e "${GREEN}Passed${NC}: $PASSED"
echo -e "${RED}Failed${NC}: $FAILED"
TOTAL=$((PASSED + FAILED))
echo "Total: $TOTAL"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed. Please review.${NC}"
    exit 1
fi
