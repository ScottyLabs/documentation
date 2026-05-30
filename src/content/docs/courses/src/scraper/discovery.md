---
title: "Course discovery"
project: "courses"
projectType: "starlight"
repo: "https://codeberg.org/scottylabs/courses"
---
# Course discovery

How the scraper builds the course list and the per-course tasks it sends to Stellic.

## Sources

The course set is the union of two feeds.

1. The FCE CSV at `data/fces.csv`, exported from SmartEvals. Columns used: `Year`, `Sem` (`Fall`/`Spring`/`Summer`), `Num` (5-digit, e.g. `21122`). Each row indicates the course was offered in that (year, sem).

1. Schedule of Classes dumps at `https://enr-apps.as.cmu.edu/assets/SOC/sched_layout_{season}.dat`, where `season` is one of `fall`, `spring`, `summer_1`, `summer_2`. Tab-delimited; the term comes from a `Semester: <Fall|Spring|Summer> <year>` header line, course codes from rows starting with a tab.

A failed fetch (404 or parse failure) on a season means the season has not been published yet. That season contributes no codes or tuples.

5-digit `Num` values are normalized to `DD-DDD`. Rows that don't match the 5-digit pattern are dropped.

## Course code format

Canonical form is `21-122`. The catalog and SOC use this form. The FCE CSV uses the 5-digit form. On disk, output directories use the dash-stripped form (`21122`).

## Task generation

For each course we emit one info task plus zero or more sections tasks. A sections task is identified by `(course, lyear, sem_id)`.

Section tasks come from the (year, sem) tuples we know the course was offered in: FCE tuples plus the SOC term if that course appears in that season's SOC. Each tuple is converted to an `lyear` and dropped if out of range.

## `lyear`

Stellic's `getcoursesections/` URL parameter is named `year`, but the value is not a calendar year. It is an academic-year offset, 0-indexed from the student's `term_joined`. Internally we call the variable `lyear` so it doesn't collide with calendar `year`. On the wire it is still `year=<n>`.

Computation:

```
anchor = ay_start(joined_sem, joined_year)        # AY of the user's term_joined
lyear  = ay_start(sem, year) - anchor + 1
```

`ay_start` returns the calendar year the AY started in: Fall maps to its own year; Spring/Summer map to year - 1.

Bounds: `lyear ∈ 0..=3`. Out-of-range values (negative or > 3) yield server errors or empty data. Stellic exposes about four academic years from the user's join term. Scraping further back requires an account with an earlier `term_joined`.

## 98- courses (StuCo)

StuCo instructors can opt out of FCEs, so a `98-` course that ran may have no FCE tuples. When a `98-` course has no FCE tuples, we issue section tasks for every `lyear ∈ 0..=3` crossed with {Fall, Spring, Summer}. Most come back empty from Stellic and the section save no-ops on empty data.

## Deduplication

| Boundary                                  | Mechanism                                 |
| ----------------------------------------- | ----------------------------------------- |
| FCE rows to (year, sem) tuples per course | `HashSet<(year, sem)>`                    |
| FCE codes union SOC codes                 | `HashSet<String>`                         |
| FCE tuples union SOC term per course      | `HashSet<(year, sem)>`                    |
| Re-runs (output files)                    | None; re-runs overwrite the output files. |
