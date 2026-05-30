---
title: "Auth"
project: "tartan-vote"
projectType: "starlight"
repo: "https://codeberg.org/scottylabs/tartan-vote"
---
The backend now integrates with Better Auth via cookie-based session lookups instead of `axum-oidc` middleware.

## Overview

- Better Auth runs as a standalone Node service in `auth-service/`.
- Better Auth config is exported from `auth-service/auth.mjs` (used by runtime and CLI migrations).
- `auth-service/server.mjs` only boots the HTTP server and mounts handlers.
- OAuth callback reuses existing backend route `{APP_BASE_URL}/auth/callback`, which then redirects to Better Auth callback endpoint.
- Frontend signs users in through Better Auth client APIs.
- Backend reads Better Auth session via `GET {BETTER_AUTH_BASE_URL}/get-session` using incoming cookies.
- Backend syncs/creates local `user` records and exposes them as `SyncedUser` for domain handlers.

## Better Auth database tables

To avoid conflicts with existing app tables, Better Auth uses dedicated model/table names:

- `auth_user`
- `auth_session`
- `auth_account`
- `auth_verification`

Apply/update these tables with:

```bash
cd auth-service
bun x auth@latest migrate --config ./auth.mjs
```

## Backend flow

### `src/core/auth/middleware.rs`

- Reads the request `Cookie` header.
- Calls Better Auth `get-session` endpoint.
- Extracts Better Auth user identity.
- Finds/creates local DB user (`user.oidc_subject` stores Better Auth user id).
- Inserts `SyncedUser` in request extensions.

### `src/domain/auth/handlers.rs`

- `GET /auth/status`: returns auth state derived from optional `SyncedUser`.
- `GET /auth/callback`: bridges OIDC callback query params to Better Auth callback path (`{BETTER_AUTH_BASE_URL}/oauth2/callback/{provider}`).
- `GET /auth/login`, `/auth/logout`: legacy compatibility redirects to frontend.

### `src/server.rs`

- Removes OIDC/session-layer setup.
- Keeps CORS and auth sync middleware globally.
- Keeps existing API routes unchanged.

## Required env vars

- `BETTER_AUTH_BASE_URL` (backend to Better Auth API base; e.g. `http://localhost:3005/api/auth`)
- `BETTER_AUTH_URL` (Better Auth service public base URL; e.g. `http://localhost:3005`)
- `BETTER_AUTH_SECRET` (high-entropy secret used for signing/encryption)
- `CORS_ALLOWED_ORIGINS` (comma-separated allowlist applied to backend CORS and auth-service CORS/trustedOrigins)
- `VITE_BETTER_AUTH_BASE_URL` (frontend Better Auth API base)
- `BETTER_AUTH_PROVIDER_ID` and `VITE_BETTER_AUTH_PROVIDER_ID`
- Existing `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET` are still used by `auth-service` to configure OAuth provider.
- `OIDC_REDIRECT_URI` is optional. By default auth-service uses `{APP_BASE_URL}/auth/callback` to match existing allowed callbacks.

## Troubleshooting

- Error: `Invalid parameter: redirect_uri`
    - Cause: the redirect URI sent to OIDC is not in the IdP client's allowed redirect URI list.
- Default redirect URI sent to OIDC: `{APP_BASE_URL}/auth/callback` (e.g. `http://localhost:8080/auth/callback`).
- That backend callback bridges to Better Auth callback internally.
- Fix: ensure `{APP_BASE_URL}/auth/callback` is allowlisted on the IdP client, or set `OIDC_REDIRECT_URI` to an already-allowlisted URI.
