---
title: "Text search"
project: "courses"
projectType: "starlight"
repo: "https://codeberg.org/scottylabs/courses"
---
Each course is indexed across five fields with distinct BM25 weights:

| Field              | Weight | Source                                                                          |
| ------------------ | ------ | ------------------------------------------------------------------------------- |
| `code`             | 5.0    | course code (e.g. `15-122`), tokenized into prefix forms so partial codes match |
| `name`             | 2.0    | course title                                                                    |
| `instructor_names` | 1.5    | section instructor list                                                         |
| `description`      | 1.0    | catalog description                                                             |
| `prereqs_text`     | 1.0    | prereq prose, when present                                                      |

Tokenization is field-specific. Course codes go through `tokenize_code`, which emits prefix variants so that `15`, `15-1`, and `15-122` are all reachable. Description, name, and prereq text use a general tokenizer that lowercases and strips punctuation; instructor names use the same general path with diacritic folding.

## FST term dictionary plus baked postings

Per field, the index holds an FST mapping each term to an offset in a posting-list arena. A posting list is `u32 df` followed by `df` entries of `(u32 doc_id, f32 score)`. Eight bytes per posting, no per-query allocation.

The `f32` score is baked at build time, not computed at query time:

```text
field_weight * idf * (tf * (K1 + 1)) / (tf + K1 * (1 - B + B * dl / avg_dl))
```

with `K1 = 1.2` and `B = 0.75`. Query scoring is "read 8 bytes per posting, add to accumulator." This is the dominant reason BM25 queries finish in microseconds even with a few thousand candidates per term.

## Levenshtein typo tolerance

For tokens at least four characters long, the FST runs a Levenshtein automaton with edit distance one (or two for longer tokens). Fuzzy hits get a `0.5` score multiplier so exact matches always rank ahead. The "did you mean" hint surfaces the lowest-distance code variant when the user's literal query returns nothing.

## Prebuilt text region

The `prebuilt_text` region in the catalog binary stores both the FST bytes and the posting arena per field, so loaders skip the most expensive build phase. `Index::build_with_prebuilt_text` reuses these bytes directly; `Index::build` is only needed when generating a fresh `catalog.bin` from a `Corpus`.
