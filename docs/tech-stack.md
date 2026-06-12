---
title: Tech Stack
---

ScottyLabs platform overview. **Click any repo node** to open it on Codeberg. Scroll horizontally if needed, or use the diagram fullscreen button to zoom.

The platform diagram reads left to right: **governance**, then each **NixOS host**. On every host, **Tailscale** (Headscale client) and **host exporters** run alongside **Caddy**. Public web traffic hits **Caddy first**; tailnet-only services like pgAdmin use **Headscale → Caddy → app** (the reverse order from the [Caddy OIDC proxy](#caddy-oidc-proxy) pattern). Services marked **\*** export Prometheus metrics scraped by the Prometheus server on infra-01. Cross-host links are described in prose below the diagram.

Sources: [governance](https://codeberg.org/ScottyLabs/governance) team data, [infrastructure](https://codeberg.org/ScottyLabs/infrastructure) NixOS hosts, and this monorepo checkout.

## Platform

```mermaid
%%{init: {"flowchart": {"useMaxWidth": false, "curve": "linear", "nodeSpacing": 36, "rankSpacing": 48, "padding": 16}, "themeVariables": {"fontSize": "16px"}}}%%
flowchart LR
  subgraph col_repos ["Governance"]
    direction TB
    gov_repo["governance"]
    gov_repo --> tofu["OpenTofu · Atlantis"]
    tofu --> provisioned["Keycloak · Forgejo · GitHub · Vaultwarden · Discord · Slack · Sentry · Synapse"]
    observability_repo["observability"]
    documentation_repo["documentation"]
    gov_repo --> observability_repo
    gov_repo --> documentation_repo
    infra_repo["infrastructure"]
    gov_repo --> infra_repo
    kennel_repo["kennel"]
    devenv_repo["devenv"]
    keycloak_theme["keycloak-theme"]
    internet_archive["internet-archive"]
  end

  subgraph col_infra01 ["infra-01"]
    direction TB
    tailscale_infra["Tailscale client"]
    host_exp_infra["Host exporters · node · systemd · cAdvisor · comin"]
    caddy_infra["Caddy · public"]
    subgraph chain_id ["Identity & access"]
      direction TB
      keycloak["Keycloak · IdP*"]
      openbao["OpenBao · native OIDC*"]
      vaultwarden["Vaultwarden"]
    end
    subgraph chain_tailnet ["Tailnet control · infra-01 only"]
      direction TB
      headplane["Headplane · native OIDC"]
      headscale_srv["Headscale server*"]
      headplane --> headscale_srv
    end
    subgraph chain_plat ["Storage & CI"]
      direction TB
      forgejo_ci["Forgejo CI"]
      docs_host["docs site"]
      matrix["Matrix · Synapse*"]
    end
    subgraph chain_garage ["Garage S3"]
      direction TB
      garage_s3["Garage*"]
      garage_webadmin["Garage WebAdmin · Caddy OIDC proxy"]
      garage_s3 --> garage_webadmin
    end
    subgraph chain_obs ["Observability · infra-01"]
      direction TB
      grafana["Grafana · native OIDC*"]
      prom_scraper["Prometheus scraper*"]
      loki["Loki*"]
      tempo["Tempo*"]
      uptime["Uptime Kuma*"]
      grafana --> prom_scraper
    end
    subgraph chain_ai ["AI gateway"]
      direction TB
      litellm["LiteLLM · native OIDC*"]
      cli_proxy["cli-proxy-api"]
      litellm --> cli_proxy
    end
    caddy_tail_infra["Caddy · tailnet"]
    pgadmin_infra["pgAdmin"]
    caddy_tail_infra --> pgadmin_infra
    tailscale_infra --> caddy_tail_infra
    caddy_infra --> chain_id
    caddy_infra --> chain_tailnet
    caddy_infra --> chain_plat
    caddy_infra --> chain_garage
    caddy_infra --> chain_obs
    caddy_infra --> chain_ai
  end

  subgraph col_deploy01 ["deploy-01"]
    direction TB
    tailscale_deploy["Tailscale client"]
    host_exp_deploy["Host exporters · node · systemd · cAdvisor · comin"]
    caddy_deploy["Caddy · public"]
    caddy_tail_deploy["Caddy · tailnet"]
    pgadmin_deploy["pgAdmin"]
    caddy_tail_deploy --> pgadmin_deploy
    tailscale_deploy --> caddy_tail_deploy
    subgraph kennel ["kennel"]
      direction LR
      kennel_svc["kennel · platform*"]
      subgraph team_courses ["CMU Courses · Quest"]
        direction TB
        kennel_docs["kennel docs"]
        courses["courses"]
        quest["quest"]
      end
      housing["housing"]
      tartan_vote["tartan-vote"]
      subgraph team_cbp ["CBP"]
        direction TB
        bus_sign["bus-sign"]
        dalmatian["dalmatian"]
        discord_verify["discord-verify"]
      end
      subgraph team_slai ["SLAI"]
        direction TB
        cmugpt_surface["cmugpt-surface"]
        cmugpt_agent["cmugpt-agent"]
        mcp_server["mcp-server"]
        sms_surface["sms-surface"]
      end
      components["components"]
      kennel_svc --> kennel_docs
    end
    ia_batch["internet-archive · batch job"]
    caddy_deploy --> kennel_svc
  end

  infra_repo --> col_infra01
  infra_repo --> col_deploy01

  prom_scraper -.-> host_exp_infra
  prom_scraper -.-> host_exp_deploy

  observability_repo -.-> prom_scraper
  documentation_repo -.-> docs_host
  keycloak_theme -.-> keycloak
  kennel_repo -.-> kennel_svc
  devenv_repo -.-> kennel_svc
  internet_archive -.-> ia_batch

  classDef metrics stroke:#c2410c,stroke-width:3px
  class keycloak,openbao,matrix,garage_s3,grafana,prom_scraper,loki,tempo,uptime,litellm,headscale_srv,kennel_svc metrics

  click gov_repo "https://codeberg.org/ScottyLabs/governance" "governance"
  click infra_repo "https://codeberg.org/ScottyLabs/infrastructure" "infrastructure"
  click kennel_repo "https://codeberg.org/ScottyLabs/kennel" "kennel"
  click devenv_repo "https://codeberg.org/ScottyLabs/devenv" "devenv"
  click observability_repo "https://codeberg.org/ScottyLabs/observability" "observability"
  click documentation_repo "https://codeberg.org/ScottyLabs/documentation" "documentation"
  click keycloak_theme "https://codeberg.org/ScottyLabs/keycloak-theme" "keycloak-theme"
  click internet_archive "https://codeberg.org/ScottyLabs/internet-archive" "internet-archive"
  click courses "https://codeberg.org/ScottyLabs/courses" "courses"
  click housing "https://codeberg.org/ScottyLabs/housing" "housing"
  click tartan_vote "https://codeberg.org/ScottyLabs/tartan-vote" "tartan-vote"
  click quest "https://codeberg.org/ScottyLabs/quest" "quest"
  click dalmatian "https://codeberg.org/ScottyLabs/dalmatian" "dalmatian"
  click bus_sign "https://codeberg.org/ScottyLabs/bus-sign" "bus-sign"
  click discord_verify "https://codeberg.org/ScottyLabs/discord-verify" "discord-verify"
  click cmugpt_surface "https://codeberg.org/ScottyLabs/cmugpt-surface" "cmugpt-surface"
  click cmugpt_agent "https://codeberg.org/ScottyLabs/cmugpt-agent" "cmugpt-agent"
  click mcp_server "https://codeberg.org/ScottyLabs/mcp-server" "mcp-server"
  click sms_surface "https://codeberg.org/ScottyLabs/sms-surface" "sms-surface"
  click components "https://codeberg.org/ScottyLabs/components" "components"
```

**Diagram key:** orange border or `*` = Prometheus service metrics. **Host exporters** (node, systemd, cAdvisor, comin) run on every NixOS host; the **Prometheus scraper** on infra-01 collects them along with service metrics.

**Tailscale on every host:** each VM runs a Tailscale client registered with the Headscale server on infra-01. **Headplane** (admin UI) runs only on infra-01. **pgAdmin** is tailnet-only (`:5050` on `tailscale0`); reach it via **Headscale → Caddy → pgAdmin**, not from the public internet.

Forgejo CI on infra-01 sends deploy webhooks to kennel on deploy-01. Kennel registers app routes on deploy-01 Caddy via the admin API. **Keycloak** is the org IdP; see [Authentication](#authentication).

## Authentication

Keycloak (`idp.scottylabs.org`) is the org IdP. Caddy always terminates TLS and reverse-proxies, but **where the OIDC login happens** differs:

### Caddy OIDC proxy

For apps that need auth but **do not implement OIDC themselves**, Caddy's [caddy-security](https://github.com/greenpau/caddy-security) plugin handles the full login dance: redirect to Keycloak, establish a session, then proxy to the backend.

```text
Browser → Caddy (OIDC gate) ⇄ Keycloak → Caddy → app
```

Example: **Garage WebAdmin** (`garage.scottylabs.org`) — static UI with no OIDC support; Caddy `authenticate` / `authorize` routes gate `/auth/*` and `/api/*` before reaching Garage's admin API and the WebAdmin bundle.

### Native OIDC

For apps that **speak OIDC themselves**, Caddy is a plain reverse proxy on the public web path. The browser talks to the app; the app redirects to Keycloak and completes the OAuth flow on its own.

```text
Browser → Caddy → app ⇄ Keycloak
```

Examples on infra-01:

| Service | Caddy route | App-side auth |
| ------- | ----------- | ------------- |
| OpenBao | `secrets2.scottylabs.org` → `:8200` | JWT auth backend + Keycloak (via OpenTofu `tofu/identity`) |
| Headscale server | `headscale.scottylabs.org` → Headscale API | OIDC in Headscale (`client_id: headscale`) |
| Headplane | `headplane.scottylabs.org` → Headplane UI | OIDC in Headplane (`client_id: headplane`); admin UI for Headscale |
| Grafana | `grafana.scottylabs.org` → Grafana | `generic_oauth` to Keycloak |
| LiteLLM | `litellm.scottylabs.org` → LiteLLM | Generic OIDC SSO (`GENERIC_*` env) |

### Tailnet-first (Headscale before Caddy)

Some services are not on the public internet. Every NixOS host runs a **Tailscale client** joined to the org Headscale server (infra-01 only). For tailnet-only admin tools, you connect over Headscale **first**, then Caddy, then the app — the opposite order from the Caddy OIDC proxy pattern:

```text
Admin → Headscale (Tailscale) → Caddy → pgAdmin
```

**pgAdmin** listens on `:5050` on the `tailscale0` interface on hosts with PostgreSQL (infra-01, deploy-01). Public Caddy routes do not expose it.

## Application repos

Kennel builds and deploys repos marked `kennel = true` in governance. Those deployments live inside the **kennel** node on deploy-01 in the platform diagram above.

## Prometheus exporters

Grafana on infra-01 queries the **Prometheus scraper** there. Metrics come from two layers:

1. **Host exporters** on every NixOS host (infra-01, deploy-01, snoopy, bus-sign-display) — node, systemd, cAdvisor, and comin metrics. These appear as **Host exporters** nodes in the platform diagram.
2. **Service metrics** on individual platform services — marked with **\*** or an orange border in the diagram. Scraped by Prometheus on infra-01 (see [`observability.nix`](https://codeberg.org/ScottyLabs/infrastructure/src/branch/main/hosts/infra-01/observability.nix)). Dashboards and alerts live in [observability](https://codeberg.org/ScottyLabs/observability).

### Host exporters (every NixOS host)

| Scrape job | Exporter | Port | Hosts |
| ---------- | -------- | ---- | ----- |
| `node` | [node_exporter](https://github.com/prometheus/node_exporter) | 9100 | infra-01, deploy-01, snoopy, bus-sign-display |
| `systemd` | [systemd_exporter](https://github.com/prometheus-community/systemd_exporter) | 9558 | infra-01, deploy-01, snoopy, bus-sign-display |
| `cadvisor` | [cAdvisor](https://github.com/google/cadvisor) | 4194 | infra-01, deploy-01, snoopy |
| `comin` | comin built-in metrics | 4243 | infra-01, deploy-01, snoopy, bus-sign-display |

`systemd_exporter` whitelists: kennel, caddy, postgresql, valkey, garage, loki, tempo, grafana, prometheus, opentelemetry-collector, promtail.

### Service metrics (infra-01 unless noted)

| Scrape job | Service | Metrics source | Grafana dashboard |
| ---------- | ------- | -------------- | ----------------- |
| `prometheus` | Prometheus scraper | self-scrape `:9090` | — |
| `grafana` | Grafana | native `:3000` | — |
| `loki` | Loki | native `:3101/metrics` | — |
| `tempo` | Tempo | native `:3200` | — |
| `otel-collector` | OpenTelemetry Collector | native `:8888` | — |
| `keycloak` | Keycloak | native `:9092` | infra/keycloak |
| `keycloak-events` | Keycloak | realm metrics `:8080/realms/master/metrics` | infra/keycloak |
| `openbao` | OpenBao | `:8200/v1/sys/metrics` | infra/openbao |
| `garage` | Garage | native `:3903` | infra/garage |
| `headscale` | Headscale server | native `:9091` | infra/headscale |
| `postgres` | PostgreSQL | [postgres_exporter](https://github.com/prometheus-community/postgres_exporter) `:9187` | infra/postgres |
| `caddy` | Caddy | admin API `:2019` | infra/caddy |
| `synapse` | Synapse (Matrix) | `/_synapse/metrics` `:9008` | infra/synapse |
| `litellm` | LiteLLM | prometheus-client `/metrics` `:4000` | infra/litellm |
| `atlantis` | Atlantis | `/metrics` `:4141` | infra/atlantis |
| `uptime-kuma` | Uptime Kuma | `/metrics` `:3001` (API key auth) | — |
| `kennel` | Kennel | native `:3001` | kennel/overview (deploy-01) |

Garage WebAdmin uses the **Caddy OIDC proxy** pattern; Garage S3 API (`s3.scottylabs.org`) has no OIDC gate. LiteLLM fronts **cli-proxy-api** on localhost (no scrape job yet). `infra/service-health` aggregates systemd and node metrics across hosts.

## Layers

| Layer | Role | Primary repos |
| ----- | ---- | ------------- |
| Governance | Teams, repos, identities, and OpenTofu for Forgejo/GitHub/Keycloak/Discord/Slack | [governance](https://codeberg.org/ScottyLabs/governance) |
| Infrastructure | Declarative NixOS on campus VMs; comin auto-deploys from Codeberg | [infrastructure](https://codeberg.org/ScottyLabs/infrastructure) |
| Platform | Shared identity, secrets, storage, CI, chat bridges, observability | [observability](https://codeberg.org/ScottyLabs/observability), [keycloak-theme](https://codeberg.org/ScottyLabs/keycloak-theme) |
| Deploy | Branch-based preview and production deploys via Nix builds | [kennel](https://codeberg.org/ScottyLabs/kennel), [devenv](https://codeberg.org/ScottyLabs/devenv) |
| Applications | Product repos deployed through Kennel when `kennel = true` in governance | See team pages under [Projects](/scottylabs/organization/projects/) |

## Hosts

| Host | Purpose |
| ---- | ------- |
| **infra-01** | Tailscale client; **Caddy** → public platform services; Headscale server + Headplane; **Headscale → Caddy → pgAdmin** (tailnet); Prometheus scraper + Grafana/Loki/Tempo |
| **deploy-01** | Tailscale client; **Caddy → kennel** → Kennel deployments; **Headscale → Caddy → pgAdmin** (tailnet); internet-archive batch job |
| **snoopy** | Tailscale client + host exporters (scraped by Prometheus on infra-01) |
| **bus-sign-display** | On-prem display for the [bus-sign](https://codeberg.org/ScottyLabs/bus-sign) project |

## Teams and repos

Registered in governance under `data/teams/`:

| Team | Repos |
| ---- | ----- |
| DevOps | infrastructure, governance, kennel, devenv, observability, documentation |
| CMU Courses | courses, internet-archive |
| CMU Housing | housing |
| Tartan Vote | tartan-vote |
| Quest | quest |
| SLAI | cmugpt-surface, cmugpt-agent, mcp-server, sms-surface |
| CBP | bus-sign, dalmatian, discord-verify, groupme-mirror |
| UI Architecture | components |
