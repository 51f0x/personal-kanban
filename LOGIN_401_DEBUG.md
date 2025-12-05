# Debugging Login 401 Error

## Issue
Login from website is failing with 401 Unauthorized, even though password and username are correct.

## Enhanced Logging Added

I've added detailed logging to help identify the root cause:

### LocalStrategy Logging
- `Login attempt failed: User not found` - User doesn't exist in database
- `Login attempt failed: No password set` - User exists but has no passwordHash
- `Login attempt failed: Invalid password` - Password verification failed
- `Login successful for user: {email}` - Successful authentication

### SessionGuard Logging
- `SessionGuard authentication failed: {error}` - Authentication error details
- `Failed to create session: {error}` - Session creation failure
- `Session created for user: {email}` - Successful session creation

## Common Causes & Solutions

### 1. User Has No Password Hash

**Symptom**: Logs show "Login attempt failed: No password set"

**Solution**: Set a password for the user:

```bash
# Option 1: Use the set-password endpoint (requires authentication)
curl -X POST http://localhost:3000/api/v1/auth/set-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"password":"newpassword123"}'

# Option 2: Update directly in database (if you have access)
# You'll need to hash the password first using Argon2
```

### 2. Password Verification Failing

**Symptom**: Logs show "Login attempt failed: Invalid password"

**Possible Causes**:
- Password was hashed with different algorithm
- Password hash is corrupted
- Password doesn't match

**Solution**: Reset the password using the set-password endpoint

### 3. User Doesn't Exist

**Symptom**: Logs show "Login attempt failed: User not found"

**Solution**: Create the user first:

```bash
curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "name":"Test User",
    "password":"testpassword123"
  }'
```

### 4. Session Creation Failing

**Symptom**: Logs show "Failed to create session"

**Possible Causes**:
- Redis is not running
- Redis connection issue
- Session store configuration issue

**Solution**: 
1. Check Redis is running: `redis-cli ping` (should return `PONG`)
2. Check Redis connection in SessionStoreService
3. Verify session configuration in `session.store.ts`

## Debugging Steps

### Step 1: Check API Logs

When you attempt to login, check the API logs for:
- `LocalStrategy` messages
- `SessionGuard` messages
- Any error stack traces

### Step 2: Verify User in Database

```bash
# Using psql
psql $DATABASE_URL -c "SELECT id, email, CASE WHEN passwordHash IS NULL THEN 'NO PASSWORD' ELSE 'HAS PASSWORD' END as password_status FROM \"User\" WHERE email = 'your-email@example.com';"
```

### Step 3: Test Login with Debug Script

```bash
./debug-login.sh
```

This will show:
- HTTP status code
- Response body
- Possible causes
- Database query to verify user

### Step 4: Test with curl

```bash
curl -v -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com","password":"your-password"}'
```

Check the verbose output for:
- Request headers
- Response headers
- Response body
- HTTP status code

## Quick Fix: Reset User Password

If the user exists but has no password or wrong password:

1. **If you can authenticate another way** (e.g., admin token):
   ```bash
   curl -X POST http://localhost:3000/api/v1/auth/set-password \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <admin-token>" \
     -d '{"password":"newpassword123"}'
   ```

2. **If you need to create a new user with password**:
   ```bash
   curl -X POST http://localhost:3000/api/v1/users \
     -H "Content-Type: application/json" \
     -d '{
       "email":"test@example.com",
       "name":"Test User",
       "password":"testpassword123"
     }'
   ```

## Verification

After fixing the issue, verify login works:

```bash
# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpassword123"}' \
  -c cookies.txt

# Should return 200 with user data and JWT tokens

# Verify session
curl -X GET http://localhost:3000/api/v1/auth/me \
  -b cookies.txt

# Should return 200 with user data
```

## Next Steps

1. Check API logs when attempting login
2. Run `./debug-login.sh` to get detailed diagnostics
3. Verify user exists and has passwordHash set
4. Check Redis is running and accessible
5. Review the specific error message in logs

The enhanced logging will help identify exactly where the authentication is failing.

