---
title: "ProxySetup Endpoint - Debugging Guide"
project: "tartan-vote"
projectType: "starlight"
repo: "https://codeberg.org/scottylabs/tartan-vote"
---
# ProxySetup Endpoint - Debugging Guide

## What I've Updated

I've enhanced the `ProxySetup.svelte` component with comprehensive logging and debugging to help identify why the backend request isn't working correctly.

### Changes Made:

1. **Enhanced Console Logging** - The component now logs:
    - Request URL being called
    - Full request body
    - Response status and headers
    - Response body (success and error cases)
    - Detailed error messages with colored console output (🔵, 🟢, 🔴)

1. **Debug Info Display** - The ProxySetup screen now shows:
    - The `VITE_API_BASE` value currently being used
    - The full URL being constructed for the request

1. **Better Error Handling**:
    - Detects response content-type and parses accordingly
    - Shows user-friendly error messages
    - Validates that response is JSON before parsing

1. **Session Code Validation** - Shows error if session code is missing

## How to Debug

### Step 1: Check Console Logs

When the ProxySetup screen appears:

1. Open browser DevTools (F12)
1. Go to "Console" tab
1. The component will show:
    - `Debug Info` box with the API base URL and full endpoint URL being used
    - Expected URLs: `http://localhost:8000/session/ABC123/proxy` (adjust port/domain as needed)

### Step 2: Click Continue and Watch Logs

When you select a senator option and click "Continue":

1. Look for 🔵 (blue circle) logs showing the request being sent
1. Watch for response logs:
    - If you see 🟢 (green circle): Request succeeded! Check that the notice message appears
    - If you see 🔴 (red circle): Request failed. Error message will be displayed

### Step 3: Common Issues and Solutions

#### Issue: "HTTP 401 Unauthorized"

**Causes:**

- User is not authenticated with the auth service
- Auth cookie is not being sent with request
- Auth service session expired

**Solutions:**

- Make sure you're logged in via SignIn screen first
- Check if auth service cookie is set (look in DevTools > Application > Cookies)
- Try clearing cookies and re-authenticating

#### Issue: "HTTP 404 Not Found"

**Causes:**

- API base URL is wrong
- Endpoint path is incorrect
- Backend isn't running

**Solutions:**

- Check the Debug Info box on the screen - verify the URL matches your backend
- Make sure `VITE_API_BASE` environment variable is set correctly (e.g., `http://localhost:8000`)
- Verify backend is running on the expected port: `cargo run --bin backend`

#### Issue: "HTTP 500 Internal Server Error"

**Causes:**

- Backend crashed or database error
- Session code doesn't exist
- Database not initialized

**Solutions:**

- Check backend console for error messages
- Verify database migrations have run
- Try a known valid session code

#### Issue: "Expected JSON response, got text/html"

**Causes:**

- Request is hitting a different endpoint (maybe a 404 page)
- CORS issue preventing proper response

**Solutions:**

- Verify the API base URL in Debug Info is correct
- Check backend CORS configuration is allowing the request
- Look at "Network" tab in DevTools to see actual response

#### Issue: "Error: Timeout" or no response at all

**Causes:**

- Backend not running
- Network connectivity issue
- API base URL unreachable

**Solutions:**

- Start backend: `cd backend && cargo run --bin backend`
- Verify API base URL is accessible (try pinging it, or open in browser)
- Check firewall/network settings

### Step 4: Network Tab Inspection

For more detailed information:

1. Open DevTools
1. Go to "Network" tab
1. Click "Continue" button
1. Look for the `proxy` request
1. Click on it to see:
    - **Headers**: Shows request headers (Content-Type, credentials)
    - **Request**: Shows the JSON body being sent
    - **Response**: Shows the server's response
    - **Timing**: Shows how long the request took

### Step 5: Backend Logs

If the console logs show the request was sent but you can't see what the backend is doing:

1. Run backend with verbose logging:

```bash
cd /home/yy/repos/voting-app/backend
RUST_LOG=debug cargo run --bin backend
```

2. Look for logs about:
    - Incoming requests
    - Database queries
    - User authentication
    - Session lookups

## Expected Behavior When Working

When everything is working correctly:

1. **ProxySetup screen appears** with:
    - The correct session code
    - Debug info showing the API URL
    - Senator dropdown and optional proxy input

1. **You select options and click Continue**:
    - Senator: Yes/No (required)
    - Proxying for: Name (optional)

1. **Console shows** (in order):

    ```
    🔵 Sending proxy request: { url: "...", ... }
    🔵 Response received: { status: 200, statusText: "OK", ... }
    🟢 Success! Proxy response: { vote_instance_count: 2, is_senator: true, has_proxy: true }
    ```

1. **Success message appears**:
    - "You now have 2 vote instances (your own vote + one proxy vote)."
    - Or appropriate message based on your configuration

1. **Moves to WaitingPage** with the participation notice displayed

## Testing the Endpoint Manually

If you want to test directly without the frontend:

### Using curl:

```bash
curl -X POST http://localhost:8000/session/ABC123/proxy \
  -H "Content-Type: application/json" \
  -H "Cookie: <your_auth_cookie>" \
  -d '{"is_senator": true, "proxy_for": "Jane Doe"}'
```

### Expected Response:

```json
{
    "vote_instance_count": 2,
    "is_senator": true,
    "has_proxy": true
}
```

### Using API Client (Postman, REST Client, etc.):

1. **Method**: POST
1. **URL**: `http://localhost:8000/session/{SESSION_CODE}/proxy`
1. **Headers**:
    - `Content-Type: application/json`
    - `Cookie: <auth_session_cookie>`
1. **Body** (JSON):

```json
{
    "is_senator": true,
    "proxy_for": "Jane Doe"
}
```

## Additional Debug Info

### Backend Endpoint Details

- **Route**: `POST /session/{session_code}/proxy`
- **Auth Required**: Yes (needs valid session cookie)
- **Request Type**: `SetSessionProxyRequest`
    - `is_senator: bool` (required)
    - `proxy_for: Option<String>` (optional, null if not proxying)
- **Response Type**: `SetSessionProxyResponse`
    - `vote_instance_count: number`
    - `is_senator: boolean`
    - `has_proxy: boolean`

### Frontend Environment Variables

Make sure these are set correctly:

```bash
# .env or .env.local
VITE_API_BASE=http://localhost:8000
# or for production:
VITE_API_BASE=https://api.example.com
```

## Next Steps After Debugging

Once you identify the issue:

1. **If it's an auth issue**: Ensure auth service is running and cookies are being set
1. **If it's a URL issue**: Update `VITE_API_BASE` environment variable
1. **If it's a backend issue**: Check database, migrations, and server logs
1. **If everything works**: Remove debug info display (optional - it won't hurt to leave it)

To remove debug info display later, simply delete or comment out the `<div class="debug-info">` block in `ProxySetup.svelte`.

## Questions to Answer

When debugging, try to identify:

- ✅ Is the request being sent at all? (Check console logs)
- ✅ What is the response status code? (200, 401, 404, 500, etc.)
- ✅ What is the API base URL being used?
- ✅ Is the user authenticated? (Check cookies)
- ✅ Is the backend running? (Try accessing `/health` endpoint)
- ✅ Does the session code exist? (Check database or backend logs)

Good luck debugging!
