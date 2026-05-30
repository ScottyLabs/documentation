---
title: "Proxy Voting System - Testing Guide"
project: "tartan-vote"
projectType: "starlight"
repo: "https://codeberg.org/scottylabs/tartan-vote"
---
# Proxy Voting System - Testing Guide

## Pre-Testing Checklist

- [ ] Backend compiled successfully: `cargo check` passes
- [ ] Frontend compiled successfully: `npm run check` passes
- [ ] Database exists and migrations have been run
- [ ] `VITE_API_BASE` environment variable correctly points to backend
- [ ] Auth service running if required
- [ ] Fresh database state recommended

## Test Scenarios

### Scenario 1: Non-Senator (No Proxy)

**Expected Behavior:** User gets 0 vote instances, cannot vote

**Steps:**

1. Log in to voter interface
1. Enter session code and join
1. On `ProxySetup` screen:
    - Select "No" for senator
    - Leave proxy name empty
    - Click "Continue"
1. Should see notice: "You currently have 0 vote instances for this session."
1. Verify on `WaitingPage` that notice is displayed
1. When motion becomes active, verify user sees "No voting options available"

**Verification:**

- [ ] `/session/{code}/proxy` returns `vote_instance_count: 0`
- [ ] Database check: 0 `user_session` rows for this user+session with `join_left = Joined`
- [ ] Attendance endpoint shows user as `is_proxy_holder: false`, `proxy_for: []`

---

### Scenario 2: Non-Senator Proxy

**Expected Behavior:** User gets 1 vote instance (proxy only), can vote once

**Steps:**

1. Log in to voter interface
1. Enter session code and join
1. On `ProxySetup` screen:
    - Select "No" for senator
    - Enter proxy name: "Jane Doe"
    - Click "Continue"
1. Should see notice: "You now have 1 proxy vote instance."
1. When motion becomes active, verify user sees 1 voting option labeled "Jane Doe"
1. Cast vote on that option
1. Verify vote is recorded with `is_proxy: true`, `proxy_for_name: "Jane Doe"`

**Verification:**

- [ ] `/session/{code}/proxy` returns `vote_instance_count: 1, is_senator: false, has_proxy: true`
- [ ] Database check: 1 `user_session` row with `proxy = 'Jane Doe'`
- [ ] `/events/{id}/vote-instances` returns 1 instance with `is_proxy: true, proxy_for_name: "Jane Doe"`
- [ ] Vote in database has `proxy: true` in data field
- [ ] Attendance endpoint shows user as `is_proxy_holder: true`, `proxy_for: ["Jane Doe"]`

---

### Scenario 3: Senator (No Proxy)

**Expected Behavior:** User gets 1 vote instance (base only), can vote once as self

**Steps:**

1. Log in to voter interface
1. Enter session code and join
1. On `ProxySetup` screen:
    - Select "Yes" for senator
    - Leave proxy name empty
    - Click "Continue"
1. Should see notice: "You now have 1 vote instance."
1. When motion becomes active, verify user sees 1 voting option (unnamed, or labeled "Yourself")
1. Cast vote on that option
1. Verify vote is recorded with `is_proxy: false`

**Verification:**

- [ ] `/session/{code}/proxy` returns `vote_instance_count: 1, is_senator: true, has_proxy: false`
- [ ] Database check: 1 `user_session` row with `proxy = NULL`
- [ ] `/events/{id}/vote-instances` returns 1 instance with `is_proxy: false, proxy_for_name: null`
- [ ] Vote in database has `proxy: false` in data field
- [ ] Attendance endpoint shows user as `is_proxy_holder: false`, `proxy_for: []`

---

### Scenario 4: Senator Proxy

**Expected Behavior:** User gets 2 vote instances (base + proxy), can vote twice

**Steps:**

1. Log in to voter interface
1. Enter session code and join
1. On `ProxySetup` screen:
    - Select "Yes" for senator
    - Enter proxy name: "John Smith"
    - Click "Continue"
1. Should see notice: "You now have 2 vote instances (your own vote + one proxy vote)."
1. When motion becomes active, verify user sees 2 voting options: one unnamed (self) + one labeled "John Smith"
1. Cast votes on both options (can be same or different)
1. Verify both votes are recorded correctly

**Verification:**

- [ ] `/session/{code}/proxy` returns `vote_instance_count: 2, is_senator: true, has_proxy: true`
- [ ] Database check: 2 `user_session` rows (one with `proxy = NULL`, one with `proxy = 'John Smith'`)
- [ ] `/events/{id}/vote-instances` returns 2 instances: one with `is_proxy: false`, one with `is_proxy: true, proxy_for_name: "John Smith"`
- [ ] Both votes in database with appropriate `proxy` fields
- [ ] Attendance endpoint shows user as `is_proxy_holder: true`, `proxy_for: ["John Smith"]`

---

### Scenario 5: Idempotency - Same Submission Twice

**Expected Behavior:** Endpoint is idempotent; calling twice with same payload returns same result

**Steps:**

1. On `ProxySetup` screen:
    - Select "Yes" for senator
    - Enter "Jane Doe"
    - Click "Continue" → notice shows 2 instances
1. (Hypothetically) Call same endpoint again with identical payload
1. Should still get notice saying 2 instances

**Manual Test (via curl or API client):**

```bash
curl -X POST http://localhost:8000/session/ABC123/proxy \
  -H "Content-Type: application/json" \
  -H "Cookie: <auth_cookie>" \
  -d '{"is_senator": true, "proxy_for": "Jane Doe"}'
# Response: 2 instances

# Call again with same payload
curl -X POST http://localhost:8000/session/ABC123/proxy \
  -H "Content-Type: application/json" \
  -H "Cookie: <auth_cookie>" \
  -d '{"is_senator": true, "proxy_for": "Jane Doe"}'
# Response: should still be 2 instances, no error
```

**Verification:**

- [ ] Both calls return identical response
- [ ] No duplicate `user_session` rows created
- [ ] Database remains consistent

---

### Scenario 6: Re-Submission with Changes

**Expected Behavior:** Changing configuration updates instance set correctly

**Steps:**

1. User goes through flow as senator with proxy "Jane" → gets 2 instances
1. On wait page, user realizes they entered wrong name → goes "Back"
1. Re-enters proxy setup, changes to senator with proxy "John"
1. Should see notice: "You now have 2 vote instances..." (same count, updated proxy)
1. Verify database only has "John", not "Jane"

**Manual Test:**

```bash
# First call
curl -X POST http://localhost:8000/session/ABC123/proxy \
  -d '{"is_senator": true, "proxy_for": "Jane"}'
# Response: 2 instances

# Second call with different proxy
curl -X POST http://localhost:8000/session/ABC123/proxy \
  -d '{"is_senator": true, "proxy_for": "John"}'
# Response: 2 instances (but for John, not Jane)

# Verify database
SELECT proxy FROM user_session WHERE user_id = ? AND session_id = ? AND join_left = 'Joined'
# Should show: NULL and 'John' (not 'Jane')
```

**Verification:**

- [ ] Old proxy instance replaced with new proxy name
- [ ] Instance count remains 2
- [ ] No orphaned database rows

---

### Scenario 7: Changing from Senator to Non-Senator

**Expected Behavior:** Base instance deleted; only proxy remains

**Steps:**

1. User initially selects "Yes" for senator with proxy "Jane" → 2 instances
1. User changes mind on proxy setup, selects "No" for senator + proxy "Jane"
1. Should see notice: "You now have 1 proxy vote instance."
1. Verify database: only 1 row with `proxy = 'Jane'`, no base row

**Manual Test:**

```bash
# First call (senator)
curl -X POST http://localhost:8000/session/ABC123/proxy \
  -d '{"is_senator": true, "proxy_for": "Jane"}'
# Response: 2 instances

# Second call (non-senator, same proxy)
curl -X POST http://localhost:8000/session/ABC123/proxy \
  -d '{"is_senator": false, "proxy_for": "Jane"}'
# Response: 1 instance

# Verify database
SELECT proxy FROM user_session WHERE user_id = ? AND session_id = ? AND join_left = 'Joined'
# Should show: 'Jane' only (no NULL row)
```

**Verification:**

- [ ] Base instance deleted
- [ ] Proxy instance preserved
- [ ] Instance count becomes 1

---

### Scenario 8: Host Attendance View

**Expected Behavior:** Host sees proxy assignments clearly in meeting overview

**Steps:**

1. Host creates session and starts waiting for attendees
1. Multiple users join with different configurations:
    - User A: Senator, no proxy
    - User B: Non-senator, proxying for "User A"
    - User C: Senator, proxying for "User D"
1. Host views attendance (in `SessionCreation` hover cards)
1. Verify each user shows correct proxy status

**Verification:**

- [ ] GET `/session/{code}/attendance` returns:
    - User A: `is_proxy_holder: false, proxy_for: []`
    - User B: `is_proxy_holder: true, proxy_for: ["User A"]`
    - User C: `is_proxy_holder: true, proxy_for: ["User D"]`
- [ ] Host UI displays these correctly in participant hover cards

---

### Scenario 9: Proxy Name Whitespace Handling

**Expected Behavior:** Leading/trailing spaces trimmed server-side

**Steps:**

1. User enters proxy name: " Jane Doe " (with extra spaces)
1. Backend should trim and store as "Jane Doe"
1. Verify notice and voting options show clean name

**Manual Test:**

```bash
curl -X POST http://localhost:8000/session/ABC123/proxy \
  -d '{"is_senator": true, "proxy_for": "  Jane Doe  "}'
# Response: should work, instance created with "Jane Doe"
```

**Verification:**

- [ ] Database stores "Jane Doe" (no extra spaces)
- [ ] Voting interface displays "Jane Doe" (no padding)

---

### Scenario 10: Empty Proxy Name

**Expected Behavior:** Empty string treated as null; no proxy instance created

**Steps:**

1. User enters proxy name: "" (empty string)
1. Backend should treat as null
1. If senator, should get 1 base instance
1. If non-senator, should get 0 instances

**Manual Test:**

```bash
curl -X POST http://localhost:8000/session/ABC123/proxy \
  -d '{"is_senator": true, "proxy_for": ""}'
# Response: 1 instance (base only)

curl -X POST http://localhost:8000/session/ABC123/proxy \
  -d '{"is_senator": false, "proxy_for": ""}'
# Response: 0 instances
```

**Verification:**

- [ ] Empty string not stored in database
- [ ] Instance count calculated correctly

---

## Integration Test: Full Voting Flow

**Objective:** Test complete proxy voting flow from session creation to vote recording

**Setup:**

- Create a session as admin
- 3 attendees join: Alice (senator), Bob (non-senator proxying for Alice), Charlie (senator proxying for David)

**Steps:**

1. Alice: "Yes" senator, no proxy → expects 1 instance
1. Bob: "No" non-senator, proxy "Alice" → expects 1 instance
1. Charlie: "Yes" senator, proxy "David" → expects 2 instances
1. Admin starts a motion
1. Each user casts votes on all available options
1. Verify vote counts in results:
    - Should see 4 total votes (1 + 1 + 2 = 4, not 3)
    - Votes labeled with their "from" user and proxy status

**Verification:**

- [ ] Vote instances total 4 (not 3)
- [ ] Each vote correctly tagged with user + proxy info
- [ ] Results display includes proxy vote attribution

---

## Performance & Edge Cases

### High Concurrency Test

- 100+ users join session simultaneously
- All submit participation config in parallel
- Verify no duplicate instances created

### SQL Injection / Input Validation

- Try proxy name: `"'; DROP TABLE user_session; --"`
- Verify: Safely escaped, stored literally (or rejected)

### Large Proxy Names

- Try proxy name: 1000+ character string
- Verify: Either accepted or reasonable error message

### Special Characters

- Try proxy names with: emoji, unicode, quotes, ampersands
- Verify: Accepted and displayed correctly

---

## Regression Tests

### Ensure No Breaking Changes

1. **Session creation still works:**
    - `POST /session/create` returns expected response
    - No proxy fields in response

1. **Regular voting still works (non-proxy case):**
    - Users without proxy can still vote normally
    - Vote structure unchanged

1. **Results endpoints unchanged:**
    - `/events/{id}/results` returns same structure
    - (Proxy data is supplementary in vote metadata)

1. **Admin endpoints unchanged:**
    - Session status checks work
    - Event start/end unchanged

---

## Debugging Commands

### Check instance count for user

```bash
SELECT COUNT(*) FROM user_session
WHERE user_id = ? AND session_id = ? AND join_left = 'Joined'
```

### Check proxy assignments

```bash
SELECT user_id, proxy FROM user_session
WHERE session_id = ? AND join_left = 'Joined'
ORDER BY user_id
```

### Check votes cast

```bash
SELECT user_session_id, data FROM vote
WHERE event_id = ?
ORDER BY user_session_id
```

### Verify attendance endpoint

```bash
curl http://localhost:8000/session/ABC123/attendance \
  -H "Cookie: <auth_cookie>"
```

### Test proxy endpoint directly

```bash
curl -X POST http://localhost:8000/session/ABC123/proxy \
  -H "Content-Type: application/json" \
  -H "Cookie: <auth_cookie>" \
  -d '{"is_senator": true, "proxy_for": "Test Name"}'
```

---

## Expected Behavior Matrix

| User Type   | Input        | Expected Instances | Base | Proxy | Notice                                 |
| ----------- | ------------ | ------------------ | ---- | ----- | -------------------------------------- |
| Senator     | No proxy     | 1                  | ✓    | -     | "You now have 1 vote instance."        |
| Senator     | Proxy "Jane" | 2                  | ✓    | ✓     | "You now have 2 vote instances..."     |
| Non-senator | No proxy     | 0                  | -    | -     | "You currently have 0 vote instances." |
| Non-senator | Proxy "Jane" | 1                  | -    | ✓     | "You now have 1 proxy vote instance."  |

---

## Cleanup After Testing

```bash
# Clear all sessions (if needed)
DELETE FROM vote;
DELETE FROM user_session;
DELETE FROM session;

# Or reset database
# (Depends on your DB setup/teardown strategy)
```

---

## Sign-Off Checklist

After all tests pass:

- [ ] Non-senator no-proxy test OK
- [ ] Non-senator proxy test OK
- [ ] Senator no-proxy test OK
- [ ] Senator proxy test OK
- [ ] Idempotency test OK
- [ ] Configuration change test OK
- [ ] Senator→Non-senator change test OK
- [ ] Host attendance view test OK
- [ ] Whitespace handling test OK
- [ ] Empty proxy name test OK
- [ ] Full voting flow test OK
- [ ] Regression tests OK
- [ ] Code compiles without errors
- [ ] Documentation is accurate
