# Authentication Roundtrip Validation

This document validates the authentication implementation against [NestJS Authentication Documentation](https://docs.nestjs.com/security/authentication).

## Implementation Overview

Our implementation follows NestJS authentication patterns with:
- **LocalStrategy**: Validates email/password credentials
- **JwtStrategy**: Validates JWT tokens for API clients
- **SessionGuard**: Creates sessions after successful local authentication
- **SessionOrJwtGuard**: Accepts either session or JWT authentication
- **Redis Session Store**: Stores sessions in Redis

## Authentication Flow (According to NestJS Docs)

### 1. Login Flow (Session-based)

```
Client Request
    ↓
POST /api/v1/auth/login {email, password}
    ↓
SessionGuard.canActivate()
    ↓
AuthGuard('local') → LocalStrategy.validate()
    ↓
UserService.findByEmail() + PasswordService.verifyPassword()
    ↓
If valid: user attached to request.user
    ↓
request.login(user) → Creates session in Redis
    ↓
AuthController.login() → Returns user + JWT tokens
    ↓
Response: {user, accessToken, refreshToken} + Set-Cookie: pk.sid
```

### 2. Session Authentication Flow

```
Client Request with Cookie
    ↓
GET /api/v1/auth/me (with pk.sid cookie)
    ↓
passport.session() middleware → Deserializes user from session
    ↓
SessionOrJwtGuard.canActivate()
    ↓
Checks: request.user && request.isAuthenticated()
    ↓
If valid: Returns user data
```

### 3. JWT Authentication Flow

```
Client Request with Bearer Token
    ↓
GET /api/v1/auth/me (with Authorization: Bearer <token>)
    ↓
SessionOrJwtGuard.canActivate()
    ↓
Checks session first, then tries JWT
    ↓
AuthGuard('jwt') → JwtStrategy.validate()
    ↓
JwtService.verifyToken() → UserService.getUser()
    ↓
If valid: Returns user data
```

## Validation Checklist

### ✅ Strategy Implementation

- [x] **LocalStrategy** extends `PassportStrategy(Strategy)` ✓
- [x] Uses `usernameField: 'email'` and `passwordField: 'password'` ✓
- [x] `validate()` method returns user object or throws `UnauthorizedException` ✓
- [x] **JwtStrategy** extends `PassportStrategy(Strategy)` ✓
- [x] Uses `ExtractJwt.fromAuthHeaderAsBearerToken()` ✓
- [x] `validate()` method validates token type and fetches user ✓

### ✅ Guard Implementation

- [x] **SessionGuard** extends `AuthGuard('local')` ✓
- [x] Calls `super.canActivate()` to authenticate ✓
- [x] Calls `request.login()` to create session after successful auth ✓
- [x] **JwtGuard** extends `AuthGuard('jwt')` ✓
- [x] Respects `@Public()` decorator ✓
- [x] **SessionOrJwtGuard** extends `AuthGuard('jwt')` ✓
- [x] Checks session first, then JWT ✓

### ✅ Middleware Setup (main.ts)

- [x] Session middleware configured before Passport ✓
- [x] `passport.initialize()` called ✓
- [x] `passport.session()` called (unconditionally) ✓
- [x] Serialization/deserialization configured ✓

### ✅ Controller Implementation

- [x] Login endpoint uses `@UseGuards(SessionGuard)` ✓
- [x] Login endpoint marked with `@Public()` ✓
- [x] `/auth/me` uses `@UseGuards(SessionOrJwtGuard)` ✓
- [x] Logout endpoint properly destroys session ✓
- [x] Refresh endpoint validates refresh token ✓

### ✅ Security Features

- [x] Rate limiting on authentication endpoints ✓
- [x] Generic error messages (no information leakage) ✓
- [x] Argon2 password hashing ✓
- [x] HttpOnly session cookies ✓
- [x] Secure cookies in production ✓

## Potential Issues & Fixes

### Issue 1: Session Creation Error Handling

**Status**: ✅ Fixed
- Added proper error handling in `SessionGuard`
- Logs errors for debugging
- Properly propagates exceptions

### Issue 2: Passport Session Middleware

**Status**: ✅ Fixed
- Changed from conditional to unconditional application
- Now applies to all routes (guards handle auth requirements)

### Issue 3: Public Endpoint Marking

**Status**: ✅ Fixed
- Login endpoint now has `@Public()` decorator
- Prevents blocking by future global guards

## Testing the Roundtrip

### Quick Test

```bash
# 1. Register user
curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test","password":"testpass123"}'

# 2. Login (creates session)
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}' \
  -c cookies.txt -v

# 3. Verify session works
curl -X GET http://localhost:3000/api/v1/auth/me \
  -b cookies.txt -v

# 4. Test JWT (if tokens received)
curl -X GET http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer <accessToken>" -v

# 5. Logout
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -b cookies.txt -v
```

### Automated Test

```bash
./validate-auth-roundtrip.sh
```

## NestJS Documentation Compliance

Our implementation follows the patterns described in:
- [NestJS Authentication](https://docs.nestjs.com/security/authentication)
- Passport.js integration patterns
- Session-based authentication best practices

### Key Compliance Points

1. ✅ Strategies extend `PassportStrategy` correctly
2. ✅ Guards extend `AuthGuard` with proper strategy names
3. ✅ Session creation via `request.login()` in guard
4. ✅ Serialization/deserialization configured in `main.ts`
5. ✅ Middleware order: session → passport.initialize() → passport.session()
6. ✅ Error handling with proper HTTP exceptions
7. ✅ Public endpoint decorator support

## Expected Behavior

### Successful Login
- HTTP 200 OK
- Session cookie `pk.sid` set
- JWT tokens in response body
- User data in response

### Failed Login
- HTTP 401 Unauthorized
- Generic "Invalid credentials" message
- No session cookie
- No user information leaked

### Session Validation
- HTTP 200 OK with valid session cookie
- HTTP 401 Unauthorized without/invalid session

### JWT Validation
- HTTP 200 OK with valid Bearer token
- HTTP 401 Unauthorized without/invalid token

## Troubleshooting

If login fails, check:
1. User exists in database
2. Password is set (passwordHash is not null)
3. Password matches (Argon2 verification)
4. Redis is running and accessible
5. Session middleware is properly configured
6. Passport serialization/deserialization working
7. CORS allows credentials

Check logs for:
- `SessionGuard` error messages
- `LocalStrategy` validation errors
- Session creation failures
- Redis connection issues

