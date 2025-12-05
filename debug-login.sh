#!/bin/bash

# Debug script for login 401 issue
# This script helps identify why login is failing

API_URL="${API_URL:-http://localhost:3000/api/v1}"
EMAIL="${TEST_EMAIL:-test@example.com}"
PASSWORD="${TEST_PASSWORD:-testpassword123}"

echo "=========================================="
echo "Login Debug Script"
echo "=========================================="
echo "API URL: $API_URL"
echo "Email: $EMAIL"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Step 1: Testing login endpoint${NC}"
echo "Request: POST $API_URL/auth/login"
echo "Body: {\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}"
echo ""

RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}\nTIME:%{time_total}" -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  -v 2>&1)

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
TIME=$(echo "$RESPONSE" | grep "TIME:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | grep -v "^<" | grep -v "^>" | grep -v "^\*" | grep -v "HTTP_CODE" | grep -v "TIME" | tail -1)

echo "Response HTTP Code: $HTTP_CODE"
echo "Response Time: ${TIME}s"
echo "Response Body:"
echo "$BODY" | head -20
echo ""

if [ "$HTTP_CODE" = "401" ]; then
    echo -e "${RED}✗ Login failed with 401 Unauthorized${NC}"
    echo ""
    echo -e "${YELLOW}Possible causes:${NC}"
    echo "1. User doesn't exist in database"
    echo "2. User exists but passwordHash is not set"
    echo "3. Password is incorrect"
    echo "4. Password verification is failing"
    echo ""
    echo -e "${YELLOW}Check the API logs for:${NC}"
    echo "- 'Login attempt failed: User not found'"
    echo "- 'Login attempt failed: No password set'"
    echo "- 'Login attempt failed: Invalid password'"
    echo "- 'SessionGuard authentication failed'"
    echo ""
    echo -e "${YELLOW}To verify user in database:${NC}"
    echo "Run: psql \$DATABASE_URL -c \"SELECT id, email, CASE WHEN passwordHash IS NULL THEN 'NO PASSWORD' ELSE 'HAS PASSWORD' END as password_status FROM \\\"User\\\" WHERE email = '$EMAIL';\""
    echo ""
elif [ "$HTTP_CODE" = "400" ]; then
    echo -e "${RED}✗ Login failed with 400 Bad Request${NC}"
    echo ""
    echo -e "${YELLOW}Possible causes:${NC}"
    echo "1. Email format is invalid"
    echo "2. Password is less than 8 characters"
    echo "3. Request body validation failed"
    echo ""
    echo "Check the response body above for validation errors"
    echo ""
elif [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    echo -e "${GREEN}✓ Login successful!${NC}"
    echo ""
    echo "Response contains:"
    if echo "$BODY" | grep -q "accessToken"; then
        echo "  - JWT tokens"
    fi
    if echo "$BODY" | grep -q "user"; then
        echo "  - User data"
    fi
else
    echo -e "${RED}✗ Unexpected HTTP code: $HTTP_CODE${NC}"
    echo ""
    echo "Check the response body above for error details"
fi

echo ""
echo "=========================================="
echo "Full Response Details"
echo "=========================================="
echo "$RESPONSE"

