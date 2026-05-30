---
title: "Query engine"
project: "courses"
projectType: "starlight"
repo: "https://codeberg.org/scottylabs/courses"
---
Queries flow through `Searcher::query`. A `Searcher` owns reusable scratch buffers (a per-doc `f32` accumulator with epoch-based dirty tracking, plus a `Vec<u32>` of touched doc ids), so successive queries do not re-allocate or zero 9k+ entries.

## Query shape

```rust
pub struct Query {
    pub text: Option<String>,
    pub fuzzy: bool,
    pub facets: FacetFilters,
    pub numeric: NumericFilters,
    pub sort: SortOrder,
    pub limit: usize,
    pub offset: usize,
    pub count_facets: Vec<FacetAxis>,
}
```

The wasm and REST surfaces both serialize this struct directly; both accept either `text`-only, filter-only, or combined queries. With no `text`, BM25 is skipped entirely and the engine sorts the filter intersection by the chosen `SortOrder`.

## Sort orders

| Variant                                     | Behavior                                                                                 |
| ------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `Relevance`                                 | BM25 with PageRank tiebreak. Falls back to `PageRankDesc` when no text query is present. |
| `PageRankDesc`                              | Sort by precomputed PageRank, descending. Used for browse-style listings.                |
| `FceHrsPerWeekAsc`                          | Lightest workload first, requires the FCE hours field to be present.                     |
| `FceInterestDesc`, `FceOverallTeachingDesc` | FCE rating ranks.                                                                        |
| `CourseNumAsc`, `CodeAsc`                   | Alphabetical / numeric on the course identifier.                                         |

## Score blending

For text queries, BM25 scores from the postings layer multiply by `1 + alpha * pagerank_normalized` with `alpha = 0.2`. PageRank breaks ties on otherwise equal BM25, so `algorithms` shows 15-451 ahead of an obscure 1-credit elective with the same baseline score. Pure browse (no text) uses raw PageRank descending.

## Top-K early termination

With `Relevance` sort and a known `limit`, the engine maintains a `BinaryHeap<(NotNan<f32>, doc_id)>` of size `limit` and prunes any candidate whose maximum possible remaining score cannot displace the current heap minimum. For typical limits (10-50), the heap kicks in almost immediately and the linear pass over candidates short-circuits.

## Facet counts and "did you mean"

When `count_facets` is non-empty, the engine produces per-axis tallies after applying the filter intersection. Counts are smart-pruned (sorted by size, capped at 100). The `did_you_mean_codes` field on the result populates when the literal query parses as a course code and one or more digit permutations of the trailing identifier match courses in the catalog (`15-122` returning `15-122` and `15-127` for example).

## Result cache

`Searcher::with_cache_capacity` enables an LRU result cache keyed by the bincode-serialized `Query`. Cache hits skip the entire query pipeline and return a clone of the previous result. Cache size is per-searcher and explicit; the wasm surface uses a 64-entry cache and the REST API a larger one.
