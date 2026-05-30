---
title: "Generating migrations"
project: "tartan-vote"
projectType: "starlight"
repo: "https://codeberg.org/scottylabs/tartan-vote"
---
Using sea-orm, we follow the standard migration-first approach. We recommend using sea-orm-cli to generate migrations and entities.

## Migrations

To create a new migration file, navigate to the `crates` folder and run

```sh
backend/crates $ sea-orm-cli migrate generate MIGRATION_NAME
```

To migrate the database, follow the steps in [SETUP.md](/tartan-vote/setup/#backend) or for short, run

```sh
backend/crates/voting-app $ cargo run
```

(PostgreSQL is managed automatically by devenv when you enter the shell.)

## Entities

Generating entities requires the database to be migrated, so that the entities can be built off the structure of the database. After migrating the database, run either

```sh
backend/crates/entity/src $ sea-orm-cli generate entity
```

or

```sh
backend/crates $ sea-orm-cli generate entity -o entity/src
```
