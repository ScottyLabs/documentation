---
title: "Running the scraper"
project: "courses"
projectType: "starlight"
repo: "https://codeberg.org/scottylabs/courses"
---
# Running the scraper

## CLI

| Flag              | Env             | Default                    | Purpose                                                                                                                                                      |
| ----------------- | --------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `--cookie-header` | `COOKIE_HEADER` | (prompt)                   | Stellic full `Cookie:` header value. Required for `courses`, `programs`, `all`. The cookie's session identifies the user; no separate Andrew ID is required. |
| `--canvas-token`  | `CANVAS_TOKEN`  | (none)                     | Canvas API token. Required for `syllabi` and `all`. Generate at `https://canvas.cmu.edu/profile/settings`.                                                   |
| `--mode`          | `MODE`          | `courses`                  | One of `courses`, `programs`, `syllabi`, `all`. Selects which pipeline runs (`all` runs the three in parallel).                                              |
| `--fce-path`      | `FCE_PATH`      | `data/fces.csv`            | SmartEvals FCE CSV (used in `courses` and `all`).                                                                                                            |
| `--out-dir`       | `OUT_DIR`       | `exported/courses_history` | Course pipeline output root.                                                                                                                                 |
| `--programs-dir`  | `PROGRAMS_DIR`  | `exported/programs`        | Programs pipeline output root.                                                                                                                               |
| `--syllabi-dir`   | `SYLLABI_DIR`   | `exported/syllabi`         | Syllabi pipeline output root.                                                                                                                                |
| `--concurrency`   | `CONCURRENCY`   | `32`                       | Worker count for the rayon pool that runs HTTP tasks.                                                                                                        |
| `--limit`         | `LIMIT`         | (no limit)                 | Cap on number of tasks, for smoke tests. Applied to all pipelines that run.                                                                                  |

Log filtering is via `RUST_LOG` (tracing `EnvFilter`); the default level is `info`.

## Output layout

Course pipeline:

```
<out_dir>/
  <course_code_no_dash>/
    info.json                 # /catalog/getcourseinfo/ response with user-state stripped
    ly<lyear>_sm<sem_id>.json # /planner/getcoursesections/ response, one per (lyear, sem)
```

The course directory uses the dash-stripped form (e.g. `21122` for 21-122). Re-runs overwrite, and there is no incremental skip.

`info.json` strips `student_context`, `enrollment_action_windows`, and `alerts` from the upstream response before writing, since those reflect user state rather than catalog data. The sections file strips the `current` field from each `data_list` entry. When `data_list` is empty, the scraper writes nothing, so the absence of a sections file means Stellic returned no sections for that (course, lyear, sem).

Programs pipeline:

```
<programs_dir>/
  <catalog_id>/
    <audit_id>.json   # one audit version of one catalog program
```

Each file wraps the matching `req_tree.programs[]` subtree with audit and program metadata, plus the non-personal scalar fields from the audit response:

```
{
  "catalog_id": <int>,                       // /catalog/getprograms/ id
  "program_name": <str>,                     // catalog program name
  "program_type": <int>,                     // 1=major, 2=minor, 3=add'l major, 4=sub-req bundle, 5=eligibility
  "audit_id": <int>,                         // audit publication id from getauditversions/
  "audit_name": <str>,                       // e.g. "EY2021 Pittsburgh - BS in Mathematical Sciences"
  "requirement_id": <int>,                   // surfaces as req_tree.programs[].id
  "is_combination": <bool>,                  // audit-level flag from the response
  "free_electives_req": <obj|null>,          // free electives spec for this audit version
  "program_reqs": <obj|null>,                // program_reqs[<requirement_id>] only
  "unique_course_parents_mapping": <obj>,    // filtered: only entries that point to this audit version
  "tree": { id, screen_name, constraints, choices, ... }   // the matching req_tree.programs[] node
}
```

Stripped before writing: `audit_data`, top-level `programs`, `course_plan_info`, `placeholders_info`, `unmatched`, `notcounted`, `unmatched_slots`, `permissions`, `program_permissions`, `student_audit`, `full_gpa`, `student_enrollment_levels`, `plan_diplomas`, `remaining_reqs_details`, `last_computed`, `debug_info`, `uni_req_programs`. Cross-reference fields (`unique_course_parents_mapping`, `program_reqs`) are filtered to keys that match the requested audit version, since unfiltered they would also include the caller's auto-attached gen-ed audits and leak the caller's college affiliation.

Syllabi pipeline:

```
<syllabi_dir>/
  <term_code>/                   # e.g. S26, F24, M25, N23
    <dept_code>/                 # e.g. ARC, CS, ART
      <course_section>.<ext>     # File items: original PDF/DOC
      <course_section>.url       # Page items: plain-text Canvas page URL
```

The pipeline only saves items in each sub-course's "Available Syllabi" module. `File` items are downloaded with their original filename extension. `Page` items are saved as a single-line `.url` file containing the Canvas page URL where the syllabus is rendered, since the page body itself is just a redirect stub and the target course's `syllabus_body` is empty most of the time and ambiguous when populated. Downstream consumers can either link directly to the URL or follow it for users who can authenticate. "Unavailable Syllabi" and "Individualized Experiences" modules are skipped because their items are placeholders without retrievable content. See [`syllabi.md`](./syllabi/) for the registry structure and the rationale.

The syllabi pipeline is rerun-safe: before any HTTP work, `save_task` checks whether `<course_section>.*` already exists under `<term>/<dept>/` and skips if so. To force a full re-fetch, delete the matching files (or the whole `<syllabi_dir>`) before running.

## Concurrency

A custom rayon thread pool sized by `--concurrency` runs every pipeline. When `--mode all`, the three pipelines run concurrently within the same pool via nested `rayon::join`, sharing the thread budget; their outputs go to separate directories so they don't collide. A shared `ureq::Agent` provides the HTTP connection pool internally.

Course pipeline:

1. Startup discovery uses `rayon::join` to overlap the FCE parse (single-threaded CSV read) with the four SOC fetches, which themselves run as a rayon par_iter across the four seasons.
1. Task execution sends one HTTP GET per task (course info or course sections), so `--concurrency` directly bounds in-flight HTTP requests. Progress is logged every 500 completed tasks.

Programs pipeline:

1. Audit-version discovery: one `GET /planner/getauditversions/` per catalog program in parallel, building the task list. Progress is logged every 200 programs.
1. Audit fetch: one `POST /planner/getauditinfo/` (test-apply mode) per task in parallel. Progress is logged every 200 completed tasks.

Step 2 of the programs pipeline is heavier than any course-pipeline call: each `getauditinfo` returns ~80 KB and the server takes several seconds to compute the audit, so its tolerable concurrency is lower than the course endpoint's.

Syllabi pipeline:

1. Sub-course discovery: walks the master `syllabus-registry` course's term modules, resolves each dept's `sis_course_id`, and lists each sub-course's modules to gather `Available Syllabi` items. Roughly 1797 sub-course module-list calls.
1. Item save: for each `File` item, fetches file metadata then downloads the file; for each `Page` item, fetches the page body and writes its HTML.

Empirical concurrency findings:

- Programs pipeline (`getauditinfo` test-apply): best throughput at concurrency 32 (~1.2 s per task on a 512-task run). Concurrency 64 dropped to ~3 s per task with sporadic failures, and 128 stalled. The default is 32.
- Course pipeline (`getcourseinfo`, `getcoursesections`): handles concurrency 64 cleanly during full-history scrapes; the per-call cost is small enough that the bottleneck is HTTP latency rather than server compute. If running the course pipeline alone, raising `--concurrency` to 64 is safe.
- Syllabi pipeline (Canvas file downloads): plateaus around concurrency 32 at ~28 MB/s on the dev machine. 64 and 128 do not improve throughput, with 128 slightly regressing. The bottleneck is most likely client-side bandwidth or Canvas's per-IP connection cap.
