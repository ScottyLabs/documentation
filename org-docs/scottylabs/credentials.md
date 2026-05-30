---
title: Credentials
---

## Hashicorp Vault

### UI Login

You can login to the [vault](https://secrets.scottylabs.org/ui/vault/auth?with=oidc)
by pressing the "Sign in with OIDC Provider" button with Method "oidc". Press "ScottyLabs" listed under "Secrets Engines" and navigate to the file you have permissions to access in your team's folder to view the secrets. If you see the following error, it means that you are not in any ScottyLabs [Vault group](https://codeberg.org/scottylabs/governance/src/branch/main/__meta/synchronizer/README.md#hashicorp-vault), so you are not able to log into the vault.

_Well we don't want any CMU student to use our Vault, right?_

<img width="459" height="94" alt="Vault access denied error" src="https://github.com/user-attachments/assets/282552b5-9f67-44ff-910d-e53c88495c06" />

### CLI

Replace tedious copy pasting with a single CLI command!

Run the following command at the root of your project to add the
[secrets sync scripts repo](https://github.com/ScottyLabs/secrets-sync-scripts)
as a [git submodule](https://git-scm.com/docs/git-submodule):

```bash
git submodule add git@github.com:ScottyLabs/secrets-sync-scripts.git scripts/secrets
```

If you cloned an existing repo with the git submodule already added, run the following command
pull the submodule:

```
git submodule update --init --recursive --remote
```

### Secret Metadata

Use it to document where the secret come from. One url for each needed secret.

### Note

We are currently migrating to [OpenBao](https://openbao.org/) for our secrets management. See [OpenBao Secrets](/infrastructure/secrets/03-openbao/) for the current setup.

## OpenBao

See [OpenBao Secrets](/infrastructure/secrets/03-openbao/) for developer and infrastructure documentation.

## VaultWarden

Use [VaultWarden](https://vault.scottylabs.org/#/vault?organizationId=3ef62a20-29b9-4a0f-a745-50a8e6dc13ea) for storing login credentials that need to be accessed by leadership.

### Permission

**Owner**: [ops+vault@scottylabs.org](mailto:ops+vault@scottylabs.org)

**Admin**: Exec + Head of DevOps

**User**: Leadership

## Bitwarden

Use [BitWarden](https://vault.bitwarden.com/) for storing login credentials that will only be accessed by the [Tech Leadership Maintainers](https://codeberg.org/scottylabs/governance/src/branch/main/data/teams/leadership.toml).

The passwords to Bitwarden is meant to be stored locally in these individuals' own password manager and may not be updated without updating all relevant people.
