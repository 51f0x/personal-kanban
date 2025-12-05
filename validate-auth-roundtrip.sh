#!/bin/bash

# Comprehensive Authentication Roundtrip Validation
# Based on NestJS authentication patterns: https://docs.nestjs.com/security/authentication

API_URL="${API_URL:-http://localhost:3000/api/v1}"
EMAIL="${TEST_EMAIL:-test@example.com}"
PASSWORD="${TEST_PASSWORD:-testpassword123}"

echo "=========================================="
echo "NestJS Authentication Roundtrip Validation"
echo "=========================================="
echo "API URL: $API_URL"
echo "Email: $EMAIL"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASSED=0
FAILED=0

test_step() {
    local name="$1"
    local command="$2"
    local expected_code="${3:-200}"
    
    echo -e "${BLUE}Testing: $name${NC}"
    RESPONSE=$(eval "$command" 2>&1)
    HTTP_CODE=$(echo "$RESPONSE" | grep -oP 'HTTP/\d\.\d \K\d+' | tail -1 || echo "000")
    
    if [ "$HTTP_CODE" = "$expected_code" ]; then
        echo -e "${GREEN}✓ PASS${NC} - HTTP $HTTP_CODE"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} - Expected HTTP $expected_code, got $HTTP_CODE"
        echo "Response: $RESPONSE" | head -20
        ((FAILED++))
        return 1
    fi
}

# Step 1: Register/Create User (if needed)
echo -e "\n${YELLOW}=== Step 1: User Registration ===${NC}"
test_step "Register user" \
    "curl -s -w '\nHTTP_CODE:%{http_code}' -X POST '$API_URL/users' \
    -H 'Content-Type: application/json' \
    -d '{\"email\":\"$EMAIL\",\"name\":\"Test User\",\"password\":\"$PASSWORD\"}'" \
    "200"

# Step 2: Login with LocalStrategy (Session-based)
echo -e "\n${YELLOW}=== Step 2: Login (LocalStrategy + Session) ===${NC}"
LOGIN_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  -c /tmp/auth_cookies.txt -v 2>&1)

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | grep -oP 'HTTP/\d\.\d \K\d+' | tail -1 || echo "000")
BODY=$(echo "$LOGIN_RESPONSE" | grep -v "HTTP_CODE" | grep -v "^<" | grep -v "^>" | grep -v "^\*" | tail -1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Login successful (HTTP 200)${NC}"
    
    # Check for session cookie
    if grep -q "pk.sid" /tmp/auth_cookies.txt 2>/dev/null; then
        echo -e "${GREEN}✓ Session cookie (pk.sid) received${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ No session cookie found${NC}"
        ((FAILED++))
    fi
    
    # Check for JWT tokens
    if echo "$BODY" | grep -q "accessToken"; then
        ACCESS_TOKEN=$(echo "$BODY" | grep -oP '"accessToken":"\K[^"]+' | head -1)
        REFRESH_TOKEN=$(echo "$BODY" | grep -oP '"refreshToken":"\K[^"]+' | head -1)
        echo -e "${GREEN}✓ JWT tokens received${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ No JWT tokens in response${NC}"
        ((FAILED++))
    fi
    
    echo "Response preview: $(echo "$BODY" | head -c 200)..."
    ((PASSED++))
else
    echo -e "${RED}✗ Login failed (HTTP $HTTP_CODE)${NC}"
    echo "Response: $BODY"
    ((FAILED++))
fi

# Step 3: Validate Session Authentication
echo -e "\n${YELLOW}=== Step 3: Session Authentication (/auth/me) ===${NC}"
ME_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X GET "$API_URL/auth/me" \
  -b /tmp/auth_cookies.txt \
  -H "Content-Type: application/json" -v 2>&1)

ME_HTTP_CODE=$(echo "$ME_RESPONSE" | grep -oP 'HTTP/\d\.\d \K\d+' | tail -1 || echo "000")
ME_BODY=$(echo "$ME_RESPONSE" | grep -v "HTTP_CODE" | grep -v "^<" | grep -v "^>" | grep -v "^\*" | tail -1)

if [ "$ME_HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Session authentication successful (HTTP 200)${NC}"
    echo "User data: $(echo "$ME_BODY" | head -c 150)..."
    ((PASSED++))
else
    echo -e "${RED}✗ Session authentication failed (HTTP $ME_HTTP_CODE)${NC}"
    echo "Response: $ME_BODY"
    ((FAILED++))
fi

# Step 4: Validate JWT Authentication (if tokens available)
if [ -n "$ACCESS_TOKEN" ]; then
    echo -e "\n${YELLOW}=== Step 4: JWT Authentication (/auth/me with Bearer token) ===${NC}"
    JWT_ME_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X GET "$API_URL/auth/me" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $ACCESS_TOKEN" -v 2>&1)
    
    JWT_ME_HTTP_CODE=$(echo "$JWT_ME_RESPONSE" | grep -oP 'HTTP/\d\.\d \K\d+' | tail -1 || echo "000")
    JWT_ME_BODY=$(echo "$JWT_ME_RESPONSE" | grep -v "HTTP_CODE" | grep -v "^<" | grep -v "^>" | grep -v "^\*" | tail -1)
    
    if [ "$JWT_ME_HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓ JWT authentication successful (HTTP 200)${NC}"
        echo "User data: $(echo "$JWT_ME_BODY" | head -c 150)..."
        ((PASSED++))
    else
        echo -e "${RED}✗ JWT authentication failed (HTTP $JWT_ME_HTTP_CODE)${NC}"
        echo "Response: $JWT_ME_BODY"
        ((FAILED++))
    fi
fi

# Step 5: Test Refresh Token
if [ -n "$REFRESH_TOKEN" ]; then
    echo -e "\n${YELLOW}=== Step 5: Refresh Token ===${NC}"
    REFRESH_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$API_URL/auth/refresh" \
      -H "Content-Type: application/json" \
      -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}" -v 2>&1)
    
    REFRESH_HTTP_CODE=$(echo "$REFRESH_RESPONSE" | grep -oP 'HTTP/\d\.\d \K\d+' | tail -1 || echo "000")
    REFRESH_BODY=$(echo "$REFRESH_RESPONSE" | grep -v "HTTP_CODE" | grep -v "^<" | grep -v "^>" | grep -v "^\*" | tail -1)
    
    if [ "$REFRESH_HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓ Token refresh successful (HTTP 200)${NC}"
        if echo "$REFRESH_BODY" | grep -q "accessToken"; then
            echo -e "${GREEN}✓ New access token received${NC}"
            ((PASSED++))
        else
            echo -e "${RED}✗ No new access token in response${NC}"
            ((FAILED++))
        fi
        ((PASSED++))
    else
        echo -e "${RED}✗ Token refresh failed (HTTP $REFRESH_HTTP_CODE)${NC}"
        echo "Response: $REFRESH_BODY"
        ((FAILED++))
    fi
fi

# Step 6: Test Logout
echo -e "\n${YELLOW}=== Step 6: Logout ===${NC}"
LOGOUT_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$API_URL/auth/logout" \
  -b /tmp/auth_cookies.txt \
  -H "Content-Type: application/json" -v 2>&1)

LOGOUT_HTTP_CODE=$(echo "$LOGOUT_RESPONSE" | grep -oP 'HTTP/\d\.\d \K\d+' | tail -1 || echo "000")

if [ "$LOGOUT_HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Logout successful (HTTP 200)${NC}"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠ Logout returned HTTP $LOGOUT_HTTP_CODE${NC}"
    ((FAILED++))
fi

# Step 7: Verify Session Invalidated
echo -e "\n${YELLOW}=== Step 7: Verify Session Invalidated ===${NC}"
INVALID_ME_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X GET "$API_URL/auth/me" \
  -b /tmp/auth_cookies.txt \
  -H "Content-Type: application/json" -v 2>&1)

INVALID_ME_HTTP_CODE=$(echo "$INVALID_ME_RESPONSE" | grep -oP 'HTTP/\d\.\d \K\d+' | tail -1 || echo "000")

if [ "$INVALID_ME_HTTP_CODE" = "401" ]; then
    echo -e "${GREEN}✓ Session correctly invalidated (HTTP 401)${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ Session still valid after logout (HTTP $INVALID_ME_HTTP_CODE)${NC}"
    ((FAILED++))
fi

# Summary
echo ""
echo "=========================================="
echo "Validation Summary"
echo "=========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All authentication roundtrip tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Please review the output above.${NC}"
    exit 1
fi

# Cleanup
rm -f /tmp/auth_cookies.txt

