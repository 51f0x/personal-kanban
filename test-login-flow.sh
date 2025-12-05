#!/bin/bash

# Login Flow Validation Script
# Tests the complete login flow from curl to session validation

API_URL="${API_URL:-http://localhost:3000/api/v1}"
EMAIL="${TEST_EMAIL:-test@example.com}"
PASSWORD="${TEST_PASSWORD:-testpassword123}"

echo "=========================================="
echo "Login Flow Validation Test"
echo "=========================================="
echo "API URL: $API_URL"
echo "Email: $EMAIL"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Test login endpoint
echo -e "${YELLOW}Step 1: Attempting login...${NC}"
LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  -c /tmp/session_cookies.txt)

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -n1)
BODY=$(echo "$LOGIN_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
  echo -e "${GREEN}✓ Login successful (HTTP $HTTP_CODE)${NC}"
  echo "Response: $BODY" | jq '.' 2>/dev/null || echo "$BODY"
  
  # Extract session cookie
  SESSION_COOKIE=$(grep -i "pk.sid" /tmp/session_cookies.txt | awk '{print $7}')
  if [ -n "$SESSION_COOKIE" ]; then
    echo -e "${GREEN}✓ Session cookie received: ${SESSION_COOKIE:0:20}...${NC}"
  else
    echo -e "${RED}✗ No session cookie found${NC}"
  fi
  
  # Extract JWT tokens if present
  ACCESS_TOKEN=$(echo "$BODY" | jq -r '.accessToken' 2>/dev/null)
  REFRESH_TOKEN=$(echo "$BODY" | jq -r '.refreshToken' 2>/dev/null)
  
  if [ -n "$ACCESS_TOKEN" ] && [ "$ACCESS_TOKEN" != "null" ]; then
    echo -e "${GREEN}✓ JWT access token received${NC}"
  fi
  
  if [ -n "$REFRESH_TOKEN" ] && [ "$REFRESH_TOKEN" != "null" ]; then
    echo -e "${GREEN}✓ JWT refresh token received${NC}"
  fi
else
  echo -e "${RED}✗ Login failed (HTTP $HTTP_CODE)${NC}"
  echo "Response: $BODY"
  exit 1
fi

echo ""

# Step 2: Test /auth/me endpoint with session cookie
echo -e "${YELLOW}Step 2: Testing /auth/me with session cookie...${NC}"
ME_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/auth/me" \
  -b /tmp/session_cookies.txt \
  -H "Content-Type: application/json")

ME_HTTP_CODE=$(echo "$ME_RESPONSE" | tail -n1)
ME_BODY=$(echo "$ME_RESPONSE" | sed '$d')

if [ "$ME_HTTP_CODE" -eq 200 ]; then
  echo -e "${GREEN}✓ Session authentication successful (HTTP $ME_HTTP_CODE)${NC}"
  echo "User data: $ME_BODY" | jq '.' 2>/dev/null || echo "$ME_BODY"
else
  echo -e "${RED}✗ Session authentication failed (HTTP $ME_HTTP_CODE)${NC}"
  echo "Response: $ME_BODY"
  exit 1
fi

echo ""

# Step 3: Test /auth/me endpoint with JWT token (if available)
if [ -n "$ACCESS_TOKEN" ] && [ "$ACCESS_TOKEN" != "null" ]; then
  echo -e "${YELLOW}Step 3: Testing /auth/me with JWT token...${NC}"
  JWT_ME_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/auth/me" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN")

  JWT_ME_HTTP_CODE=$(echo "$JWT_ME_RESPONSE" | tail -n1)
  JWT_ME_BODY=$(echo "$JWT_ME_RESPONSE" | sed '$d')

  if [ "$JWT_ME_HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✓ JWT authentication successful (HTTP $JWT_ME_HTTP_CODE)${NC}"
    echo "User data: $JWT_ME_BODY" | jq '.' 2>/dev/null || echo "$JWT_ME_BODY"
  else
    echo -e "${RED}✗ JWT authentication failed (HTTP $JWT_ME_HTTP_CODE)${NC}"
    echo "Response: $JWT_ME_BODY"
  fi
  echo ""
fi

# Step 4: Test logout
echo -e "${YELLOW}Step 4: Testing logout...${NC}"
LOGOUT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/auth/logout" \
  -b /tmp/session_cookies.txt \
  -H "Content-Type: application/json")

LOGOUT_HTTP_CODE=$(echo "$LOGOUT_RESPONSE" | tail -n1)
LOGOUT_BODY=$(echo "$LOGOUT_RESPONSE" | sed '$d')

if [ "$LOGOUT_HTTP_CODE" -eq 200 ]; then
  echo -e "${GREEN}✓ Logout successful (HTTP $LOGOUT_HTTP_CODE)${NC}"
else
  echo -e "${YELLOW}⚠ Logout returned HTTP $LOGOUT_HTTP_CODE${NC}"
  echo "Response: $LOGOUT_BODY"
fi

echo ""

# Step 5: Verify session is invalidated
echo -e "${YELLOW}Step 5: Verifying session is invalidated...${NC}"
INVALID_ME_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/auth/me" \
  -b /tmp/session_cookies.txt \
  -H "Content-Type: application/json")

INVALID_ME_HTTP_CODE=$(echo "$INVALID_ME_RESPONSE" | tail -n1)
INVALID_ME_BODY=$(echo "$INVALID_ME_RESPONSE" | sed '$d')

if [ "$INVALID_ME_HTTP_CODE" -eq 401 ]; then
  echo -e "${GREEN}✓ Session correctly invalidated (HTTP 401)${NC}"
else
  echo -e "${RED}✗ Session still valid after logout (HTTP $INVALID_ME_HTTP_CODE)${NC}"
  echo "Response: $INVALID_ME_BODY"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}Login flow validation complete!${NC}"
echo "=========================================="

# Cleanup
rm -f /tmp/session_cookies.txt

