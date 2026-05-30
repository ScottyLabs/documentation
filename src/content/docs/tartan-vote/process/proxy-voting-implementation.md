---
title: "Proxy Voting System Implementation - Complete Summary"
project: "tartan-vote"
projectType: "starlight"
repo: "https://codeberg.org/scottylabs/tartan-vote"
---
# Proxy Voting System Implementation - Complete Summary

## Overview

The voting application now supports a sophisticated proxy voting system where users can declare themselves as "senator" elected representatives and optionally proxy vote for other members. The system enforces participation rules server-side to ensure correct vote instance counts.

## Participation Model

The system allocates vote instances based on senator status and proxy assignment:

| User Type               | Base Instance | Proxy Instance | Total Instances | Notes                               |
| ----------------------- | ------------- | -------------- | --------------- | ----------------------------------- |
| Senator, no proxy       | ✓             | -              | 1               | Votes as self                       |
| Senator, with proxy     | ✓             | ✓              | 2               | Votes as self + proxies for someone |
| Non-senator, no proxy   | -             | -              | 0               | Cannot vote                         |
| Non-senator, with proxy | -             | ✓              | 1               | Can only proxy for a senator        |

## Architecture

### User Flow

1. **Authentication** → User logs in via `SignIn.svelte`
1. **Join Session** → User selects voter role via `Home.svelte` (provides session code)
1. **Proxy Setup** → **NEW** User declares senator status + optional proxy target via `ProxySetup.svelte`
1. **Waiting Page** → User waits for motion to become active; sees participation confirmation banner
1. **Voting** → User casts vote(s) on active motion
1. **Results** → View results

### Core Endpoints

#### `POST /session/{code}/proxy`

Declares senator status and optional proxy assignment (idempotent).

**Request:**

```json
{
    "is_senator": true,
    "proxy_for": "Jane Doe" // optional, null if not proxying
}
```

**Response:**

```json
{
    "vote_instance_count": 2,
    "is_senator": true,
    "has_proxy": true
}
```

**Semantics:**

- If `is_senator=true`: Ensures exactly one base (non-proxy) instance exists
- If `is_senator=false`: Deletes all base instances
- If `proxy_for=Some(value)`: Ensures exactly one proxy instance with that value
- If `proxy_for=None`: Deletes all proxy instances
- Returns final instance count (0, 1, or 2)

#### `GET /events/{id}/vote-instances`

Lists all vote instances available to the current user for a specific event.

**Response:**

```json
[
    {
        "voter_instance_id": 42,
        "is_proxy": false,
        "proxy_for_name": null,
        "has_voted": false
    },
    {
        "voter_instance_id": 44,
        "is_proxy": true,
        "proxy_for_name": "Jane Doe",
        "has_voted": false
    }
]
```

#### `POST /events/{id}/vote`

Casts a vote on a specific instance (specified by `voter_instance_id`).

#### `GET /session/{code}/attendance`

Lists all participants in session with proxy metadata (for host meeting overview).

**Response includes:**

```json
{
    "attendees": [
        {
            "user_id": 1,
            "user_name": "Alice",
            "is_proxy_holder": true,
            "proxy_for": ["Bob"]
        },
        {
            "user_id": 2,
            "user_name": "Bob",
            "is_proxy_holder": false,
            "proxy_for": []
        }
    ]
}
```

## Database Schema Changes

### `UserSession` Table

- **New field:** `proxy: Option<String>` — proxy target name (null if not a proxy instance)
- **Semantic:** One user can have multiple `user_session` rows per session:
    - One non-proxy row (base instance, if senator)
    - Zero or one proxy row (if proxying for someone)

**Unique Constraint:** `(user_id, session_id, proxy)` — prevents duplicate entries

### `Vote` Table

- **Keys:** `event_id` + `user_session_id` — links vote to specific instance
- **Payload includes:** `proxy: bool`, `proxy_for_name: String | null`

### Removed

- `Voters` table (no longer needed; participation tracked via `user_session` rows)

## Frontend Components

### `ProxySetup.svelte` (NEW)

Pre-voting-page screen that captures participation configuration.

**Props:**

- `sessionCode: string | null` — session code
- `onBack: () => void` — callback to return to join page
- `onNext: (notice: string | null) => void` — callback when setup complete

**State:**

- `senatorChoice: 'yes' | 'no' | ''` — senator status (mandatory select)
- `proxyFor: string` — proxy target name (optional text input)

**Behavior:**

1. User must select "Yes" or "No" for senator question (no skip option)
1. User optionally enters proxy target name
1. On submit, calls `POST /session/{code}/proxy` with parsed payload
1. On success, generates user-friendly notice:
    - "You now have 2 vote instances (your own vote + one proxy vote)."
    - "You now have 1 proxy vote instance."
    - "You now have 1 vote instance."
    - "You currently have 0 vote instances for this session."
1. Passes notice to `App.svelte` via `onNext(notice)` callback

### `WaitingPage.svelte` (ENHANCED)

Updated to display participation confirmation banner.

**New Props:**

- `notice: string | null` — confirmation message from `ProxySetup`

**New UI Element:**
If `notice` is provided, displays styled banner:

```html
<p class="notice">{notice}</p>
```

### `App.svelte` (ROUTING UPDATED)

Screen navigation flow now includes proxy setup step.

**New State:**

- `waitingNotice: string | null` — stores notice from `ProxySetup` to persist through route

**Updated Routes:**

- `join` → `proxySetup` → `waiting` (was directly `join` → `waiting`)
- `proxySetup.onNext(notice)` sets `waitingNotice` before transitioning to `waiting`
- `waiting.onEventFound()` clears `waitingNotice` before voting
- Vote return routes also clear `waitingNotice`

### `SessionCreation.svelte` (ENHANCED)

Host meeting control screen now displays proxy assignments in participant cards.

**New Fields in Participant Hover Card:**

- Shows `is_proxy_holder: boolean`
- Lists all names the participant is proxying for (e.g., "Proxy: Yes (Jane, Bob)")

## Implementation Details

### Backend Handler: `set_session_proxy()`

**Location:** `backend/crates/voting-app/src/domain/session/handlers.rs`

**Algorithm:**

1. Validate session exists and is open
1. Trim and filter proxy name (null if empty)
1. Fetch all existing joined sessions for user
1. Separate base vs proxy instances
1. **Senator logic:**
    - If `is_senator=true`: Ensure one base instance exists (create if missing)
    - If `is_senator=false`: Delete all base instances
1. **Proxy logic:**
    - If `proxy_for=Some(name)`: Update first proxy or create new if missing
    - If `proxy_for=None`: Delete all proxy instances
1. Query final count and return response

**Idempotency:** Safe to call multiple times; always reconciles instance set to match desired state.

### Vote Instance Filtering

All vote instance queries filter by `JoinLeft::Joined` to ignore stale rows:

```rust
.filter(user_session::Column::JoinLeft.eq(JoinLeft::Joined))
```

This ensures only active, joined sessions are counted when provisioning votes.

## Documentation Updates

### `docs/db/db-schema.md`

- Removed `Voters` table (no longer exists)
- Updated `UserSession` table to document `proxy: Option<String>` field
- Updated `Vote` table to show `event_id + user_session_id` keys + uniqueness constraint

### `docs/db/db-json.md`

- Updated vote data structure to include:
    - `proxy: boolean` — whether this vote instance is a proxy
    - `proxy_for_user_id: number | null` — ID of person being proxied for (preserved for audit)

## Quality Assurance

### Compilation Status

**Frontend (svelte-check + tsc):** ✅ 0 errors, 0 warnings
**Backend (cargo check):** ✅ 2 harmless warnings (unused `HasActiveEventResponse` + `has_active_event()` function)

### Test Coverage Needed

1. **Non-senator proxy flow:**
    - User selects "No" + proxy name "Jane"
    - Verify: 1 vote instance created (proxy only)

1. **Senator proxy flow:**
    - User selects "Yes" + proxy name "John"
    - Verify: 2 vote instances created (base + proxy)

1. **Senator no-proxy flow:**
    - User selects "Yes" + no proxy name
    - Verify: 1 vote instance created (base only)

1. **Non-senator no-proxy flow:**
    - User selects "No" + no proxy name
    - Verify: 0 vote instances created

1. **Idempotency:**
    - Call same endpoint twice with same payload
    - Verify: Same instance count returned both times

1. **Re-submission with changes:**
    - User calls with `(is_senator=true, proxy=null)`
    - Then calls with `(is_senator=false, proxy="Jane")`
    - Verify: Base instance deleted, proxy instance created

1. **Attendance display:**
    - Confirm host sees correct `is_proxy_holder` and `proxy_for` arrays

## Edge Cases Handled

✅ Proxy name with leading/trailing whitespace (trimmed server-side)
✅ Proxy name as empty string (treated as null)
✅ Changing senator status clears base instance if needed
✅ Changing proxy target updates existing instance (no duplicates)
✅ Users with 0 vote instances can view waiting page (no voting options appear)
✅ Multiple proxy assignments for one user (only shows proxy instances, not base)

## Future Enhancements (Out of Scope)

- [ ] Proxy validation: Verify proxy target is eligible to be proxied for
- [ ] Vote instance summary in host overview: "3 senators, 2 proxies, 1 external"
- [ ] Proxy audit log: Track who voted as proxy for whom
- [ ] Revoke proxy mid-session: Allow user to cancel proxy assignment
- [ ] Proxy confirmation: Require explicit confirmation from proxy recipient

## Deployment Checklist

- [ ] Run database migrations (no new migrations needed; `proxy` field made nullable in past migration)
- [ ] Backend: `cargo build --release`
- [ ] Frontend: `npm run build`
- [ ] Test with fresh database
- [ ] Verify session creation and attendance endpoints work
- [ ] Manual end-to-end test: Create session, join as senator with proxy, vote, check results

## Files Modified

### Backend

- `crates/voting-app/src/domain/session/handlers.rs` — Added `SetSessionProxyRequest`, `SetSessionProxyResponse`, rewrote `set_session_proxy()`

### Frontend

- `src/screens/ProxySetup.svelte` — **NEW** participation declaration screen
- `src/screens/WaitingPage.svelte` — Enhanced to display notice
- `src/screens/SessionCreation.svelte` — Participant cards updated with proxy info
- `src/App.svelte` — Updated routing + state threading

### Documentation

- `docs/db/db-schema.md` — Removed voters table, updated schema
- `docs/db/db-json.md` — Updated vote payload structure

## Notes for Integration

1. **No breaking changes** to existing endpoints; new `ProxySetup` screen is additive
1. **Session creation unchanged** — `POST /session/create` returns same response
1. **Voting unchanged** — Vote casting still uses `POST /events/{id}/vote`
1. **Participation is optional** — Non-senator non-proxies simply get 0 instances and see "no voting options"
1. **Proxy names are flexible** — Any string accepted (not validated against user roster)
