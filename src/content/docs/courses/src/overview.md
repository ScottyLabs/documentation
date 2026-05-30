---
title: "Overview"
project: "courses"
projectType: "starlight"
repo: "https://codeberg.org/scottylabs/courses"
---
# Overview

The CMU Courses project has three layers:

1. `courses-scraper` pulls course information, sections, program audits, and syllabi from Stellic and Canvas. Output lands under `exported/` as JSON files keyed by course code, program, and term.

1. `courses-index` loads `exported/` into a single binary catalog with text, facet, numeric, and schedule indexes baked in. The same crate compiles to native (for the build step that produces `catalog.bin`) and to wasm (for the browser query engine).

1. Two APIs consume the catalog: `courses-api` is the public REST surface (versioned under `/v1/`, in-memory, no database), and `courses-web-api` is the web app's backend, which serves the SPA bundle and the catalog binary to the browser on a single origin.

The scraper section below documents the per-source collection logic. The courses index section documents the on-disk catalog format and the query engine.
