---
title: Tech Stack
---

ScottyLabs platform overview. **Click any repo node** to open it on Codeberg; use the diagram fullscreen button to zoom.

Sources: [governance](https://codeberg.org/ScottyLabs/governance) team data, [infrastructure](https://codeberg.org/ScottyLabs/infrastructure) NixOS hosts, and this monorepo checkout.

```mermaid
flowchart TB
  subgraph gov ["Governance & provisioning"]
    gov_repo["governance"]
    gov_repo --> tofu["OpenTofu via Atlantis"]
    tofu --> idp_sync["Keycloak · Forgejo · GitHub"]
    tofu --> comm_sync["Discord · Slack · Sentry"]
  end

  subgraph nix_hosts ["NixOS hosts · infrastructure"]
    infra01["infra-01"]
    deploy01["deploy-01"]
    snoopy["snoopy"]
    bus_display["bus-sign-display"]
  end

  subgraph infra01_svc ["infra-01 platform"]
    keycloak["Keycloak idp.scottylabs.org"]
    openbao["OpenBao secrets2.scottylabs.org"]
    garage["Garage s3.scottylabs.org"]
    forgejo_ci["Forgejo CI runner"]
    matrix["Matrix doggylabs.org"]
    grafana["Grafana · Loki · Tempo"]
    vaultwarden["Vaultwarden"]
    headscale["Headscale tailnet"]
    litellm["LiteLLM gateway"]
    docs_host["docs.scottylabs.org"]
    uptime["Uptime Kuma"]
  end

  subgraph deploy_svc ["deploy-01 platform"]
    kennel["kennel"]
    caddy["Caddy reverse proxy"]
    ia_svc["internet-archive job"]
  end

  subgraph devops_repos ["DevOps repos"]
    infra_repo["infrastructure"]
    kennel_repo["kennel"]
    devenv_repo["devenv"]
    observability_repo["observability"]
    documentation_repo["documentation"]
  end

  subgraph app_repos ["Application repos · Kennel"]
    courses["courses"]
    housing["housing"]
    tartan_vote["tartan-vote"]
    quest["quest"]
    dalmatian["dalmatian"]
    bus_sign["bus-sign"]
    discord_verify["discord-verify"]
    groupme_mirror["groupme-mirror"]
    cmugpt_surface["cmugpt-surface"]
    cmugpt_agent["cmugpt-agent"]
    mcp_server["mcp-server"]
    sms_surface["sms-surface"]
    components["components"]
  end

  subgraph infra_repos ["Infra-adjacent repos"]
    keycloak_theme["keycloak-theme"]
    terrier["terrier"]
    internet_archive["internet-archive"]
  end

  gov_repo --> infra_repo
  infra_repo --> infra01
  infra_repo --> deploy01
  infra_repo --> snoopy
  infra_repo --> bus_display

  infra01 --> infra01_svc
  deploy01 --> deploy_svc
  observability_repo -.-> grafana
  keycloak_theme -.-> keycloak

  forgejo_ci -->|"webhook"| kennel
  kennel --> caddy
  kennel --> app_repos
  devenv_repo -.->|"build env"| kennel
  documentation_repo -.-> docs_host
  internet_archive -.-> ia_svc

  click gov_repo "https://codeberg.org/ScottyLabs/governance" "governance"
  click infra_repo "https://codeberg.org/ScottyLabs/infrastructure" "infrastructure"
  click kennel_repo "https://codeberg.org/ScottyLabs/kennel" "kennel"
  click devenv_repo "https://codeberg.org/ScottyLabs/devenv" "devenv"
  click observability_repo "https://codeberg.org/ScottyLabs/observability" "observability"
  click documentation_repo "https://codeberg.org/ScottyLabs/documentation" "documentation"
  click keycloak_theme "https://codeberg.org/ScottyLabs/keycloak-theme" "keycloak-theme"
  click terrier "https://codeberg.org/ScottyLabs/terrier" "terrier"
  click internet_archive "https://codeberg.org/ScottyLabs/internet-archive" "internet-archive"
  click courses "https://codeberg.org/ScottyLabs/courses" "courses"
  click housing "https://codeberg.org/ScottyLabs/housing" "housing"
  click tartan_vote "https://codeberg.org/ScottyLabs/tartan-vote" "tartan-vote"
  click quest "https://codeberg.org/ScottyLabs/quest" "quest"
  click dalmatian "https://codeberg.org/ScottyLabs/dalmatian" "dalmatian"
  click bus_sign "https://codeberg.org/ScottyLabs/bus-sign" "bus-sign"
  click discord_verify "https://codeberg.org/ScottyLabs/discord-verify" "discord-verify"
  click groupme_mirror "https://codeberg.org/ScottyLabs/groupme-mirror" "groupme-mirror"
  click cmugpt_surface "https://codeberg.org/ScottyLabs/cmugpt-surface" "cmugpt-surface"
  click cmugpt_agent "https://codeberg.org/ScottyLabs/cmugpt-agent" "cmugpt-agent"
  click mcp_server "https://codeberg.org/ScottyLabs/mcp-server" "mcp-server"
  click sms_surface "https://codeberg.org/ScottyLabs/sms-surface" "sms-surface"
  click components "https://codeberg.org/ScottyLabs/components" "components"
```

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
| **infra-01** | Identity (Keycloak), secrets (OpenBao), object storage (Garage), Forgejo CI runner, Matrix, Grafana stack, Vaultwarden, Headscale, LiteLLM, documentation site |
| **deploy-01** | Kennel deployment platform and Caddy routing for `*.scottylabs.org` / preview domains |
| **snoopy** | Auxiliary campus host (monitored via observability stack) |
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
| ScottyLabs AI | cmugpt-surface, cmugpt-agent, mcp-server, sms-surface |
| Community-Based Projects | bus-sign, dalmatian, discord-verify, groupme-mirror |
| UI Architecture | components |
