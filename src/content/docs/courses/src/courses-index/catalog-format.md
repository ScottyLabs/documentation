---
title: "Catalog binary format"
project: "courses"
projectType: "starlight"
repo: "https://codeberg.org/scottylabs/courses"
---
# Catalog binary format

The catalog file (`catalog.bin`) is a region-based bincode encoding wrapped in an outer gzip layer. The browser unwraps the gzip with the native `DecompressionStream` API; native callers use `flate2`. Region bodies inside the wrap are uncompressed, so wasm reads them without an additional decode pass.

## File layout

After gzip is removed:

```text
[16-byte header]
  "CIDX"             4 bytes
  version u32 LE     4 bytes (= 4)
  flags u32 LE       4 bytes (reserved, currently 0)
  region_count u32   4 bytes

[region table, region_count * 40 bytes]
  name              16 bytes ASCII, NUL-padded
  body_offset u64    8 bytes
  body_len u64       8 bytes
  flags u32          4 bytes (reserved)
  reserved u32       4 bytes

[region bodies, concatenated, in table order]
```

The magic number is `CIDX` and the current format version is `4`. Loading rejects any other version.

## Regions

| Region          | Body                                 |
| --------------- | ------------------------------------ |
| `courses`       | bincode of `Vec<Course>`             |
| `professors`    | bincode of `Vec<Professor>`          |
| `sections`      | bincode of `Vec<SectionTime>`        |
| `fce_rows`      | bincode of `Vec<FceRow>`             |
| `prebuilt_text` | bincode of `PrebuiltText` (optional) |

The `prebuilt_text` region carries the FST bytes plus the postings arena that the text index would otherwise rebuild on each load. With it present, building the in-memory index skips the most expensive phase.

## Cold-start subset

`read_catalog_minimal_from_slice` reads only the regions needed to drive search and lookup: `courses`, `sections`, `prebuilt_text`. The browser uses this on initial load to skip the bincode work for `professors` and `fce_rows`, which the search UI does not consult. A subsequent call to `read_catalog_from_slice` (or a targeted region read) hydrates the rest if it is needed.

## Storage abstractions

The reader is generic over a `CatalogStorage` trait so the same code path works for in-memory slices and on-disk files. `read_range` returns `Cow<[u8]>`, so backends that already hold the bytes hand back a borrowed slice with no copy or allocation. Three concrete impls live in `binary/storage.rs`:

- `MemoryStorage` borrows a `&[u8]`, used by the wasm crate after `DecompressionStream` decodes into a typed array.
- `OwnedMemoryStorage` owns a `Vec<u8>`, used when the native side has already pulled the entire file into memory (e.g. after gunzipping a transit blob).
- `FileStorage` mmaps the file. Region reads return borrowed slices into the mapped buffer; the kernel pages bytes in on demand and shares the mapping across reads.

## Format versioning

`FORMAT_VERSION` bumps any time the wire format changes (region layout, header, or any region body that is not strictly additive). The reader compares it on every load and returns an error rather than silently misreading a future version. The public `courses-api` exposes the active version under `/v1/version` so external consumers can pin against it.

## Distribution

The canonical copy of `catalog.bin` lives in a Garage S3 bucket. The forgejo `Scrape and Publish Catalog` workflow runs the scraper, builds the catalog, and uploads the binary to `s3://kennel-courses-main/catalog.bin`. Both `courses-api` and `courses-web-api` poll the object's S3 ETag (default every 300 seconds) and re-fetch when it changes; the in-memory catalog and index swap atomically via `ArcSwap`.

`courses-web-api` exposes the binary back to the browser at `/catalog/binary` along with the current ETag at `/catalog/version`. The SPA's OPFS cache is keyed on that ETag, so a new scrape causes browsers to download once and serve every subsequent visit from local disk until the ETag changes again.

PR and staging deploys point `courses-web-api` at `--catalog-upstream-url=<main-deploy-url>` instead of giving them their own bucket. Their `/catalog/*` routes reverse-proxy to the main deploy, so all branches share one canonical catalog without paying for cross-bucket reads.
