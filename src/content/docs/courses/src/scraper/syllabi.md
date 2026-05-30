---
title: "Syllabi (Canvas)"
project: "courses"
projectType: "starlight"
repo: "https://codeberg.org/scottylabs/courses"
---
CMU's Canvas instance hosts a "Syllabus Registry" course that aggregates instructor-uploaded syllabi across most departments and recent terms.

## Source

Master course: `https://canvas.cmu.edu/courses/sis_course_id:syllabus-registry` (Canvas course id `3769`). The course's metadata is `is_public: true`, but listing files and pages requires an authenticated Canvas API token.

## Token

Authenticate API requests with `Authorization: Bearer <token>` where the token is generated from `https://canvas.cmu.edu/profile/settings` under "Approved Integrations" -> "+ New Access Token".

The token currently in use for development expires August 25 at 12:00 AM. After that, a new token is needed.

## Structure

The registry is a three-level Canvas hierarchy:

1. The master course (`3769`) contains 30 modules, one per term, named like `Spring 2026 (S26)` or `Summer 2024 (M24)`. Term codes follow `<season><yy>` where `season` is `S` (spring), `M` (summer-1), `N` (summer-2), or `F` (fall). Coverage runs from Summer 2019 (M19).
1. Each term module's items are 60 `ExternalUrl` entries, one per department, with titles like `Architecture (48XXX)`. Each item's `external_url` points to a per-(term, department) sub-course identified by `sis_course_id:syllabus-registry-<TERM>-<DEPT>` (e.g. `syllabus-registry-S26-ARC`). At the time of writing, the registry contains 1797 such sub-courses across all terms.
1. Each dept sub-course has up to four modules: `Notice to Users`, `Available Syllabi`, `Unavailable Syllabi`, `Individualized Experiences`. Items inside are either `File` (a Canvas file object that resolves to a downloadable PDF/DOC) or `Page` (a Canvas page).

- "Available Syllabi" `File` items are each a real downloadable file (e.g. `48649_S26_designleadership_mcnutt.pdf`, content type `application/pdf`).
- "Available Syllabi" `Page` items contain only a small JSON redirect blob like `<div id="syllabus-source" style="display: none;">{"canvas_course_id":"52739",...}</div>`. The actual syllabus lives on the regular Canvas course site for that class, which is generally enrollment-restricted, so most of these pointers are not retrievable from a normal student token.
- "Unavailable Syllabi" pages are placeholders the registry generates for courses where the instructor never uploaded a syllabus. They contain no syllabus content.
- "Individualized Experiences" entries are independent-study and similar courses. Most are placeholder pages.

## Retrieval

To list every file in the registry, we walk:

1. `GET /api/v1/courses/3769/modules?include[]=items&per_page=100` to get every term module with its dept items.
1. For each term-module item, the `external_url` ends in `sis_course_id:<id>`. Hit `GET /api/v1/courses/sis_course_id:<id>/modules?include[]=items&per_page=20` for each.
1. Within each sub-course's `Available Syllabi` module, every `File`-typed item has a `url` like `/api/v1/courses/<id>/files/<file_id>`. Fetch that to get the file metadata, including a `url` field that is the actual downloadable URL with a `verifier` query parameter.

Pagination is via the standard Canvas `Link` header; modules and items use `per_page` up to 100. The `?per_page=100` parameter is a soft hint — Canvas may return fewer.

Direct file listing on `/api/v1/courses/3769/files` returns 403, so the module-walk is the only way to enumerate syllabi from this course.

## CLI

The scraper has a `syllabi` mode that walks the registry and saves every `File` and `Page` item from each sub-course's `Available Syllabi` module:

```
cargo run --release -- --mode syllabi --canvas-token <token>
```

The token can also be supplied via `CANVAS_TOKEN` env. Output goes to `exported/syllabi/<term>/<dept>/<course_section>.<ext>` (configurable via `--syllabi-dir`). `File` items are saved as the original PDF/DOC. `Page` items are saved as `<course_section>.url`, a plain-text file containing the Canvas page URL where the syllabus is rendered. We don't try to resolve the page's `syllabus-source` redirect or pull a canonical link from the target course's `syllabus_body`, since those bodies are usually empty or a tangle of mailto links, anchors, and supplementary readings rather than a single syllabus URL.
