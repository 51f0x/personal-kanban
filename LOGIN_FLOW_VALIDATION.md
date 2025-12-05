# Login Flow Validation Guide

This document describes how to validate the login flow from curl to session creation.

## Login Flow Overview

1. **POST /api/v1/auth/login** - Authenticates user and creates session
2. **GET /api/v1/auth/me** - Validates session is working
3. **POST /api/v1/auth/logout** - Destroys session

## Prerequisites

1. API server running on `http://localhost:3000`
2. Redis running (for session storage)
3. PostgreSQL running (for user data)
4. A test user with email and password set

## Quick Test with curl

### Step 1: Create/Register a User (if needed)

```bash
curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User",
    "password": "testpassword123"
  }'
```

### Step 2: Login and Save Session Cookie

```bash
# Login and save cookies to file
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123"
  }' \
  -c cookies.txt \
  -v
```

**Expected Response:**
- HTTP 200 OK
- Set-Cookie header with `pk.sid` (session cookie)
- JSON body with:
  - `user`: { id, email, name, timezone }
  - `accessToken`: JWT access token
  - `refreshToken`: JWT refresh token

**Example Response:**
```json
{
  "user": {
    "id": "uuid-here",
    "email": "test@example.com",
    "name": "Test User",
    "timezone": "UTC"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Step 3: Verify Session with /auth/me

```bash
# Use saved cookies to authenticate
curl -X GET http://localhost:3000/api/v1/auth/me \
  -b cookies.txt \
  -v
```

**Expected Response:**
- HTTP 200 OK
- JSON body with user data (same as login response user object)

### Step 4: Test JWT Authentication (Alternative)

```bash
# Use JWT token instead of session cookie
curl -X GET http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -v
```

**Expected Response:**
- HTTP 200 OK
- JSON body with user data

### Step 5: Test Logout

```bash
# Logout and destroy session
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -b cookies.txt \
  -v
```

**Expected Response:**
- HTTP 200 OK
- Session cookie should be invalidated

### Step 6: Verify Session is Invalidated

```bash
# Try to access /auth/me with invalidated session
curl -X GET http://localhost:3000/api/v1/auth/me \
  -b cookies.txt \
  -v
```

**Expected Response:**
- HTTP 401 Unauthorized
- Error message: "Authentication required"

## Automated Test Script

Use the provided test script for automated validation:

```bash
# Set test credentials (optional, defaults shown)
export TEST_EMAIL="test@example.com"
export TEST_PASSWORD="testpassword123"
export API_URL="http://localhost:3000/api/v1"

# Run the test
./test-login-flow.sh
```

## Session Cookie Details

- **Cookie Name**: `pk.sid`
- **HttpOnly**: Yes (prevents JavaScript access)
- **Secure**: Only in production (HTTPS)
- **SameSite**: `lax`
- **Max Age**: 24 hours
- **Storage**: Redis (key prefix: `pk:sess:`)

## Troubleshooting

### Issue: Login returns 401 Unauthorized

**Possible causes:**
1. User doesn't exist
2. Password is incorrect
3. User exists but password is not set
4. Rate limiting (5 attempts per minute)

**Check:**
- Verify user exists in database
- Verify password is set and correct
- Check API logs for specific error

### Issue: Session cookie not set

**Possible causes:**
1. CORS configuration blocking credentials
2. Cookie domain/path mismatch
3. Redis connection issue

**Check:**
- Ensure `credentials: true` in CORS config
- Verify Redis is running and accessible
- Check session store configuration

### Issue: /auth/me returns 401 after login

**Possible causes:**
1. Session cookie not being sent
2. Session not properly stored in Redis
3. Session serialization issue

**Check:**
- Verify cookie is in request headers
- Check Redis for session key: `pk:sess:COOKIE_VALUE`
- Verify passport serialization/deserialization

## Flow Diagram

```
┌─────────┐
│ Client  │
└────┬────┘
     │ POST /auth/login {email, password}
     ▼
┌─────────────────┐
│ SessionGuard    │
│ (LocalStrategy) │
└────┬────────────┘
     │ Validate credentials
     ▼
┌─────────────────┐
│ UserService     │
│ PasswordService │
└────┬────────────┘
     │ User authenticated
     ▼
┌─────────────────┐
│ request.login() │ ← Creates session
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│ Redis Store     │ ← Stores session
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│ AuthController  │
│ login()         │
└────┬────────────┘
     │ Return {user, tokens}
     ▼
┌─────────┐
│ Client  │ ← Receives cookie + JWT tokens
└─────────┘
```

## Security Features

1. **Rate Limiting**: 5 login attempts per minute
2. **Password Hashing**: Argon2id with secure parameters
3. **Session Security**: HttpOnly, Secure (production), SameSite
4. **Error Messages**: Generic to prevent information leakage
5. **JWT Tokens**: Short-lived access tokens (15m) + refresh tokens (7d)

