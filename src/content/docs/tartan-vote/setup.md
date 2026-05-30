---
title: "Extensive Guide to Running Tartan Vote"
project: "tartan-vote"
projectType: "starlight"
repo: "https://codeberg.org/scottylabs/tartan-vote"
---
## Prerequisites

This project uses [devenv](https://devenv.sh/getting-started/) to provide Bun, Cargo, PostgreSQL, and all other development dependencies. Follow the devenv installation instructions.

## Starting up

Now, we will get your own instance of Tartan Vote running!

### Setup

You will need [git](https://git-scm.com/install/).

Run `git clone https://github.com/ScottyLabs/voting-app.git` in your favorite (or least favorite) folder to download the repository, and run `cd voting-app` to enter.

Then run `devenv shell` (or use [direnv](https://direnv.net/)) to enter the development environment. This starts PostgreSQL and exposes Bun, Cargo, and other tooling.

### Backend

The backend is the link between the frontend and the database.

```bash
# Copy the .env.example into a .env
cp .env.example .env

# Start Better Auth service in a separate terminal
cd auth-service
bun install
bun x auth@latest migrate --config ./auth.mjs
bun run dev
cd ..

# Build and run the backend (postgres is managed by devenv)
cd backend/crates/voting-app
cargo run
```

### Frontend

Now that your backend is running, we can set up the frontend. Navigate to the frontend folder. You will probably need another terminal instance, because you need both running at the same time.

```bash
# Navigate with

cd frontend

# We want to install the proper dependencies for the frontend. Run

frontend $ bun install

# followed by

frontend $ bun run dev

# to start up the frontend.
```
