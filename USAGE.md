# Usage Examples

## Example 1: Adding a Starlight Documentation Project

```toml
# projects.toml
[[project]]
slug = "user-guide"
name = "User Guide"
repo = "https://codeberg.org/scottylabs/user-guide"
type = "starlight"
docs_dir = "docs"
description = "User guides and tutorials"
```

Project structure in the repository:
```
user-guide/
└── docs/
    ├── index.md
    ├── getting-started.md
    ├── tutorials/
    │   ├── tutorial-1.md
    │   └── tutorial-2.md
    └── reference/
        └── api.md
```

Build output:
- Pages will be available at `/user-guide/`, `/user-guide/getting-started/`, etc.
- Navigation will be auto-generated in sidebar under "User Guide"

## Example 2: Adding a Rust Project with Rustdoc

```toml
# projects.toml
[[project]]
slug = "core-lib"
name = "Core Library"
repo = "https://codeberg.org/scottylabs/core-lib"
type = "rust"
docs_dir = "docs"
description = "Core Rust library with shared utilities"
```

Requirements:
- Must be a valid Cargo workspace or package
- Should have a `docs/` directory with prose documentation (optional)

Build output:
- Prose docs at `/core-lib/` (if they exist)
- Full rustdoc at `/core-lib/api/`

## Example 3: Adding an OpenAPI Project

```toml
# projects.toml
[[project]]
slug = "courses-api"
name = "Courses API"
repo = "https://codeberg.org/scottylabs/courses-backend"
type = "openapi"
docs_dir = "docs"
openapi_spec = "openapi.json"
export_command = "cargo run --bin export-openapi"
description = "Course scheduling and registration API"
```

Project requirements:
1. Export command that generates OpenAPI spec without starting server
2. Spec written to path specified in `openapi_spec`
3. Valid OpenAPI 3.0+ JSON format

Example export binary (Rust with utoipa):
```rust
// bin/export-openapi.rs
use utoipa::OpenApi;
use std::fs;

#[derive(OpenApi)]
#[openapi(
    paths(/* your paths */),
    components(schemas(/* your schemas */))
)]
struct ApiDoc;

fn main() {
    let doc = ApiDoc::openapi();
    fs::write(
        "openapi.json",
        serde_json::to_string_pretty(&doc).unwrap()
    ).unwrap();
    println!("OpenAPI spec written to openapi.json");
}
```

Build output:
- Prose docs at `/courses-api/`
- Interactive API reference at `/courses-api/api/` (powered by Scalar)

## Example 4: Complete Multi-Project Setup

```toml
# projects.toml

# Main documentation
[[project]]
slug = "platform-guide"
name = "Platform Guide"
repo = "https://codeberg.org/scottylabs/platform-docs"
type = "starlight"
docs_dir = "docs"
description = "Complete platform documentation and guides"

# Backend API
[[project]]
slug = "api"
name = "Platform API"
repo = "https://codeberg.org/scottylabs/platform-api"
type = "openapi"
docs_dir = "docs"
openapi_spec = "docs/openapi.json"
export_command = "bun run export-spec"
description = "REST API for platform services"

# Shared Rust library
[[project]]
slug = "common"
name = "Common Library"
repo = "https://codeberg.org/scottylabs/common-rs"
type = "rust"
docs_dir = "docs"
description = "Shared types and utilities"

# Frontend documentation
[[project]]
slug = "frontend"
name = "Frontend Guide"
repo = "https://codeberg.org/scottylabs/platform-web"
type = "starlight"
docs_dir = "docs"
description = "Frontend architecture and component docs"
```

Result: Unified site with:
- `/` - Hub landing page
- `/platform-guide/*` - Platform documentation
- `/api/` - API prose docs
- `/api/api/` - Interactive API reference
- `/common/*` - Rust library docs
- `/common/api/` - Rustdoc
- `/frontend/*` - Frontend documentation

## Local Development Workflow

```bash
# 1. Add project to projects.toml
vim projects.toml

# 2. Test build
bun run build

# 3. Preview locally
bun run dev
# Visit http://localhost:4321

# 4. Check specific project
# Prose: http://localhost:4321/<slug>/
# API (OpenAPI): http://localhost:4321/<slug>/api/
# Rustdoc: http://localhost:4321/<slug>/api/

# 5. Clean and rebuild
bun run scripts/build.ts clean
bun run build
```

## CI/CD Workflow

When you push to main:
1. Forgejo Actions triggers workflow
2. Installs Bun dependencies
3. Runs build script (clones all projects, aggregates docs)
4. Builds Astro site
5. Uploads to Garage S3 bucket

## Troubleshooting

### Project docs not showing up
```bash
# Check if repo cloned successfully
ls -la .repos/

# Verify docs directory exists
ls -la .repos/<slug>/docs/

# Check build logs for errors
bun run build 2>&1 | tee build.log
```

### Rustdoc build fails
```bash
# Test cargo doc locally in the project
cd .repos/<slug>/
cargo doc --no-deps

# Check for compilation errors
cargo check
```

### OpenAPI spec not generated
```bash
# Test export command locally
cd .repos/<slug>/
<export-command>  # e.g., cargo run --bin export-openapi

# Verify spec exists and is valid
cat openapi.json | jq .  # Should be valid JSON
```
