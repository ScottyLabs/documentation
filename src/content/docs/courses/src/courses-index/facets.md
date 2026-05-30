---
title: "Facets and numeric filters"
project: "courses"
projectType: "starlight"
repo: "https://codeberg.org/scottylabs/courses"
---
# Facets and numeric filters

The index splits filters into two shapes by data type. Categorical filters live in `FacetIndex`; numeric range filters live in `NumericIndex`.

## Categorical facets

Each facet axis interns its values to dense `u16` ids at build time and stores a `Vec<RoaringBitmap>` indexed by id. Lookup is one indexed access plus a `HashMap<String, u16>` (or `HashMap<T, u16>` for integer axes) to translate user input. RoaringBitmap intersections drive the AND across multiple selected values within an axis, and across multiple axes within a query.

Axes the index currently exposes:

- `dept` (string) — first segment of the course code, e.g. `15`, `21`
- `level` (string) — `100`, `200`, ..., or `grad`
- `school` (string) — SCS, CIT, MCS, etc.
- `attribute_tags`, `gened_tags`, `skills` (string, multi-valued per course)
- `has_syllabus_terms` (string, multi-valued)
- `units_int` (integer) — discrete units bucket

Multi-valued axes simply OR together the per-value bitmaps within a single course before pushing into the postings layer.

## Smart facet pruning

When a query asks for facet counts (`Query.with_facet_counts(true)`), the index sorts axis values by current set size and returns at most 100 entries per axis. Long-tail values stay reachable via direct lookup but do not flood the response payload.

## Numeric ranges

`NumericIndex` keeps three flavors that match the catalog data:

- `NumericFieldF32` — used for FCE-derived means (workload, instruction quality).
- `NumericFieldU32` — used for `pagerank` (scaled), section IDs, etc.
- `NumericFieldU16Optional` — used for `units` (some courses have variable/no units).

Each variant stores values in a flat `Vec` keyed by doc id, so a range filter is a linear scan with predicate, intersected with whatever bitmap the rest of the query produces.

## Interning of low-cardinality fields

Course fields with few distinct values use `Arc<str>` interning across the catalog: `description` (rare duplicates from cross-listed courses), `level`, `school`, and the multi-valued tag fields. The interning pool lives in the `courses` region itself; bincode emits each unique string once and references it by index.
