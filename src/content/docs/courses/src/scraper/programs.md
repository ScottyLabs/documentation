---
title: "Programs"
project: "courses"
projectType: "starlight"
repo: "https://codeberg.org/scottylabs/courses"
---
# Programs

The Stellic catalog exposes 2129 programs through `GET /catalog/getprograms/`. This doc covers the type vocabulary, the two ID spaces a program lives in, and the shape of the requirement tree.

## Catalog vs audit-version IDs

Each program has two distinct integer IDs that surface in different responses:

- catalog id, returned by `getprograms/` and accepted by `add-program/`. Small integers in the low thousands.
- audit version id, the internal identifier of the requirement tree the audit engine uses for the program. Larger integers in the millions, showing up as `req_tree.programs[].id`, as the inner keys of `unique_course_parents_mapping`, and inside the padded ids described below.

The `getauditinfo` response uses both: its top-level `programs` list is keyed by catalog id, while `req_tree.programs[].id` is the audit version id, with a separate `program_id` field carrying the catalog id back.

A single catalog program resolves to one audit version at a time, the one matching the student's level and campus. For example, catalog id 428 ("BS in Mathematical Sciences") resolves to audit version 2881253 for the EY2021 Pittsburgh undergraduate audit. Catalog programs without a compatible audit version for the requesting student fail `add-program/` with code 400.

## Types

The `type` integer is only exposed by `getprograms/`, and once a program is added to a plan the label disappears. The five values:

| type | name                   | count | examples                                                                                                                                                                                                                                        |
| ---- | ---------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Major                  | 1139  | "BS in Mathematical Sciences", "BFA in Music Performance (Tuba)", "PHD in Architecture-Engineering-Construction Management", "MS in Software Engineering"                                                                                       |
| 2    | Minor                  | 211   | "Minor in Computer Science", "Minor in Decision Making and Intelligent Systems", "Minor in Music Theory"                                                                                                                                        |
| 3    | Additional Major       | 144   | "Additional Major in Computer Science", "Additional Major in International Relations and Politics"                                                                                                                                              |
| 4    | Sub-requirement bundle | 633   | "Mellon College of Science - General Education - EY2021+", "EY2019 - SCS General Education - Cognitive Studies Requirement (AI)", "Health Information Systems Concentration - BS in Information Systems", "EY2017 Drama - MFA PTM Requirements" |
| 5    | Eligibility track      | 2     | "Undergraduate Pre-Health", "Sigma Tau Delta Eligibility"                                                                                                                                                                                       |

Type 1 is the actual degree program a student majors in. Type 3 is a way to declare a second major and is typically a slimmer requirement set than the equivalent type 1. Type 4 is a partial requirement set intended to combine with a major: per-college and per-AY-version gen-ed, concentration tracks within a major, and college-wide degree checks. Type 5 is a reusable eligibility track that lives alongside a major.

## Auto-attach

Adding a major (type 1) to a plan does not just include the major's own requirements: the server also auto-attaches the relevant college gen-ed and degree-check programs (both type 4) into the audit. They appear in `getauditinfo.programs[]` with `is_uni_req: true` and `is_shared: true`, and their requirement trees show up under `req_tree.programs[]` like any other added program.

Concentration-specific type 4 bundles (e.g. "Health Information Systems Concentration ...") do not auto-attach into a plan-based audit; they only enter that audit if explicitly added or selected as the major's concentration. The requirement scraper avoids this entirely by using the test-apply audit path against each catalog program's published audit version directly (see `stellic.md`'s `getauditinfo` section), which works for every type uniformly.

## Coverage ceiling

Of the 2129 catalog programs, 1291 are reachable from a student-role account via the test-apply audit path. The remaining 838 return zero audit versions at every status (`published`, `draft`, `archived`, `unpublished`, `obsolete`). Two separate undergraduate accounts produced identical coverage sets, so visibility on this Stellic deployment does not appear to depend on the student's college or declared major within the undergraduate role.

Among the 838 unreachable:

- 130 are "Student Defined" programs, which are per-student custom degrees with no shared audit by design.
- 22 type-4 entries return a skeleton (no course satisfiers) via `getprogramsrequirements/` even though `getauditversions/` returns nothing. These are mostly older BSA/BHA/BEA gen-ed and concentration requirement bundles.
- 686 return nothing on either endpoint. These are typically MS/PHD programs (`MS in Economics`, `PHD in Applied Physics`, `MS in Computer Science`, etc.), combined-degree programs (`BSA in Mathematical Sciences and Music Performance`), and a small set of older sub-requirement bundles.

It is not yet confirmed whether graduate-role accounts see additional audits for graduate programs that are unreachable from undergrad accounts. If they do, a multi-account scrape would broaden coverage. If they don't, the remaining 838 require an admin/registrar role and are out of reach from any student-role account.

## Requirement tree shape

The `req_tree` returned by `getauditinfo` is a recursive node structure:

```
req_tree
├── id, screen_name, constraints
└── programs: [
    {
      id (audit_version_id), screen_name, program_id (catalog_id),
      is_concentration, is_uni_req, is_shared, ...,
      constraints: [...],
      choices: [
        { id, screen_name, constraints, choices: [...] },        // sub-bucket
        { id, screen_name: "21-122", constraints },              // course leaf
        ...
      ]
    },
    ...
  ]
```

Course satisfiers are leaf nodes inside `choices` whose `screen_name` is a course code (e.g. "21-122"). Buckets like "Discrete Mathematics" carry their own `choices` array of further buckets and course leaves. The `constraints` array on a node holds unit minimums, GPA caps, and the other rule data for that node.

## Padded requirement IDs

In `unique_course_parents_mapping`, each course requirement id maps to a `{audit_version_id: padded_full_id}` dict. The padded full id is the audit version id concatenated with the requirement id zero-padded to 13 digits, so a 7-digit audit version id produces a 20-digit padded id:

```
audit_version_id = 2881254
requirement_id   = 2628
padded full id   = 28812540000000002628
```

The padded form lets the engine identify a (program, requirement) pair with one integer. The scraper preserves padded ids inside the saved `unique_course_parents_mapping`, filtered to the requested audit version, so each course leaf can be cross-referenced back to its requirement node by integer id.
