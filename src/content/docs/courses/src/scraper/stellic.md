---
title: "Stellic"
project: "courses"
projectType: "starlight"
repo: "https://codeberg.org/scottylabs/courses"
---
CMU's Stellic deployment lives at `academicaudit.andrew.cmu.edu`. None of this API is publicly documented; the catalog below is reverse-engineered from the live JS bundle and verified by direct request.

## Auth

The user authenticates in a browser via Shibboleth, then copies the full `Cookie:` header from a network request to the site and pastes it on first run. From that cookie we extract the value of `csrftoken=` and send it as the `X-CSRFToken` request header, while the `_shibsession_*` and `sessionid` cookies are passed through verbatim. There is no API token or refresh flow, so once Shibboleth expires the session the scraper re-prompts.

## XSSI prefix

Every JSON response begins with `)]}',\n`, an XSSI-prevention prefix that we strip before parsing.

## Headers

All requests need:

- `Cookie: <full pasted header>`
- `X-CSRFToken: <csrftoken value>`
- `X-Requested-With: XMLHttpRequest`
- `Referer: https://academicaudit.andrew.cmu.edu/app/...` (some endpoints 403 without a same-origin Referer)

POST requests additionally need a content type, but Stellic is inconsistent about which type each endpoint accepts: some require form-urlencoded, others require JSON. The per-endpoint sections below specify which.

## Endpoints

### POST /planner/getstudentprofile/

Body (form): empty, or `student_username=<anything>`. The session cookie identifies the user; the body's `student_username` value is ignored by the server for student-role callers (Stellic returns the cookie's profile regardless of the value sent). Returns the student profile, of which the scraper uses `username` (echoed back in subsequent calls' `student_username` field), `default_plan_id`, and `term_joined: {semester, year}` (the latter anchors the `lyear` window). The scraper also uses this call as its auth check on startup: if the response is not XSSI-prefixed JSON, the cookie is bad and we re-prompt.

### GET /catalog/getcourseinfo/

Query: `campus_id=1&course_code=21-122&physical_year=2026`. Returns metadata for one course; before saving, the scraper strips `student_context`, `enrollment_action_windows`, and `alerts`, which all reflect user state rather than catalog data.

### GET /planner/getcoursesections/

Query: `campus_id=1&course_code=21-122&physical_year=2026&plan_id=<uuid>&sem_id=<1|2|3>&year=<lyear>`. Returns sections for one course in one (lyear, sem). `plan_id` is required even though the data is not plan-specific, so we pass the user's `default_plan_id`, and an empty `data_list` is the normal response for a course that was not offered (the scraper writes nothing in that case).

The `year` URL parameter is the `lyear` offset (see `discovery.md`), not a calendar year, and `sem_id` maps 1 to Fall, 2 to Spring, 3 to Summer.

### GET /catalog/getprograms/

Query: `campus_id=1`. Returns the flat list of all programs in the catalog (currently 2129), where each entry is `{id, name, type}`. The `type` integer is only exposed here, and once a program is added to a plan the label is gone. See `programs.md` for what the type values mean.

### POST /planner/createplan/

Body (JSON): `{name, programs: [<catalog_id>, ...], visibility: "private"|"advisor"}` (the `programs` list may be empty). Returns `{success, new_plan_id, new_plan_name}`.

### POST /planner/deleteplan/

Body (JSON): `{plan_id, reason}`. JSON only; the form-urlencoded variant returns 500.

### POST /planner/add-program/

Body (form): `plan_id=<uuid>&program_id=<catalog_id>`, adding one program to a plan. Success returns the program's metadata; failure returns `{success: false, message: {code, text}}` with one of:

- `493`, "Too many programs added. For now, you can't add more than 5 majors." See "Limits".
- `400`, "We are unable to process your request at the moment. Please try again later." This usually means the program has no audit version compatible with the plan's campus or the student's level (for example, a graduate-only program on an undergrad plan).

### POST /planner/getauditinfo/

The same endpoint serves two distinct flows depending on the body shape.

**Plan audit.** Body (JSON): `{plan_id}`. Returns the full audit for whatever programs are in the plan. Fields of interest:

- `audit_data`: per-requirement, the courses chosen toward it and the remaining count.
- `req_tree`: the nested requirement tree, with course satisfiers attached as `choices` nodes carrying course codes.
- `unique_course_parents_mapping`: course requirement id to a `{audit_version_id: padded_id}` map, used to determine which audit version a course satisfies.
- `programs`: the catalog programs currently in the plan, including auto-attached ones (see "Auto-attached programs").

The JS sends additional fields (`mainaudit`, `official`, `uids`, `isTemplate`, etc.) but the server accepts the body with `plan_id` alone. Response size scales with program count.

**Test-apply audit (no plan).** Body (JSON): `{student_username, audit, default_audit_version: {id}, official: true}` where `audit` is the audit publication id from `getauditversions/`. Returns the same shape as the plan audit but for a single audit version, against the calling user's profile, without creating or modifying any plan. The user's currently declared programs are still returned alongside the requested one in `req_tree.programs[]`; the scraper filters those out by matching `req_tree.programs[].id == <audit_version.requirement>`. This is the path the requirement scraper takes, since it bypasses both the 3-plan and 5-major caps.

### GET /planner/getauditversions/

Query: `program=<catalog_id>&status=published`. Returns `{audits: [{id, requirement, name, ...}, ...]}` listing every published audit version of a program. The `id` is the audit publication id (use it as the `audit` field in `getauditinfo`'s test-apply body); `requirement` is the audit-version-id that surfaces as `req_tree.programs[].id` and is the value to match on when filtering the audit response. The two are distinct integers and both are needed.

### POST /planner/getauditinfobulk/

Body (JSON): `{student_usernames: [<username>, ...], audits_to_print: [{auditId, reqId, include}, ...], official, without_planned, grades, force, purpose: "print"}`. Used by advisors to compute audits for many students at once for PDF printing. Returns `{student_audits: {<username>: {req_trees: {<auditId>: ...}, audit_data, ...}, ...}, audit_reqs: {...}}`.

The endpoint is user-scoped: the server runs each listed student's own declared-program audit, and `audits_to_print` filters which of those declared audits show up in the response. Audit ids in `audits_to_print` that aren't in the student's declared set are silently dropped, so this endpoint cannot be used to fetch arbitrary catalog programs. The requirement scraper does not use it.

### GET /planner/getprogramsrequirements/

Query: `program_id=<id>&programs=<id>` (both required, both the same value). Returns `{requirement_dict: {<program_id>: [{id, name, level, parent_id}, ...]}}`. The tree is a skeleton without course satisfiers; the scraper does not currently use this endpoint because the test-apply audit returns the full tree with courses.

## Limits

| Resource                                                        | Cap           | Notes                                                                                                                                                   |
| --------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plans per user                                                  | 3             | Server-enforced; the 4th `createplan` returns code 493 with text "You can't have more than 3 plans at a time."                                          |
| Majors (type 1) per plan                                        | 5             | Server-enforced and counts the user's existing declared majors, so a student with two declared majors gets only three free major slots on a fresh plan. |
| Minors, additional majors, sub-requirement bundles, eligibility | None observed | 22 mixed programs of these types fit in one plan without rejection.                                                                                     |
| `lyear` on `getcoursesections/`                                 | `0..=3`       | Out-of-range values fail or return empty.                                                                                                               |

The plan and major caps only matter for the plan-based audit flow. The requirement scraper uses the test-apply path, which is plan-free, so neither cap applies to it.

## Retries

The scraper retries 5xx responses with exponential backoff capped at 5 seconds, while 4xx fails immediately. No explicit rate limit has been observed, but high concurrency occasionally produces transient 502/504 from the upstream proxy and the retry handles those.

## Auto-attached programs

Adding a major (catalog type 1) to a plan auto-attaches that major's college gen-ed and degree-check programs (catalog type 4) into the audit. They surface in the `getauditinfo` response with `is_uni_req: true` and `is_shared: true` and contribute their full requirement trees, so the scraper does not need a separate `add-program` call for those.
