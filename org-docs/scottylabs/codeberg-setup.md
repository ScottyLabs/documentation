---
title: CodeBerg Setup
---

This guide walks you through registering on Codeberg and configuring SSH so you can clone and push to ScottyLabs repositories. It should take about 3–5 minutes.

If you only need GitHub access, skip steps 1 and 3; complete step 3.5 instead.

## 1. Register a CodeBerg account

Go to [codeberg.org/user/sign_up](https://codeberg.org/user/sign_up) and create an account.

Use the **same username and email** as your GitHub account. Follow the registration flow until you are signed in.

## 2. Generate an SSH key

Open a terminal and run:

```bash
ssh-keygen -t ed25519 -C "<email>"
```

Replace `<email>` with the email you use for Codeberg and GitHub.

When prompted for a file location, press Enter to accept the default (`~/.ssh/id_ed25519`). The rest of this guide assumes you used the default path.

Set a passphrase when prompted. Do not leave it blank.

If you already created the key without a passphrase, add one with:

```bash
ssh-keygen -p -f ~/.ssh/id_ed25519
```

Display your public key:

```bash
cat ~/.ssh/id_ed25519.pub
```

It should look like `ssh-ed25519 <hash> <your-email>`. Copy the entire line.

## 3. Add the key to CodeBerg

1. Open [SSH / GPG keys](https://codeberg.org/user/settings/keys) in your Codeberg settings.
2. Click **Add key**.
3. Enter a name (for example, `ScottyLabs laptop`) and paste your public key.
4. Click **Add key**.

## 3.5. (Optional but recommended) Add the key to GitHub

1. Open [GitHub SSH and GPG keys](https://github.com/settings/keys).
2. Click **New SSH key**.
3. Add the same public key twice:
   - Once as a **Signing key**
   - Once as an **Authentication key**

GitHub historically required separate key types for signing and authentication; use the same public key for both.

## 3.6. Add the key to your local SSH agent

Run:

```bash
eval "$(ssh-agent -s)"
```

You should see `Agent pid <number>`. If the command is unsupported, restart your terminal and continue.

Load your key:

```bash
ssh-add ~/.ssh/id_ed25519
```

Enter your passphrase when prompted.

## 4. Test authentication

Test CodeBerg:

```bash
ssh -T git@codeberg.org
```

Expected output is similar to:

```text
Hi there, <username>! You've successfully authenticated with the key named <key name>, but Forgejo does not provide shell access.
```

If you completed steps 3.5 and 3.6, test GitHub as well:

```bash
ssh -T git@github.com
```

Expected output is similar to:

```text
Hi <username>! You've successfully authenticated, but GitHub does not provide shell access.
```

If either command returns **permission denied**, ask a tech lead or someone in DevOps for help.

## Next steps

After SSH is working, follow [Contributing](/scottylabs/contributing/) to request access through [Governance](https://codeberg.org/scottylabs/governance). See [GitHub Organizations](/scottylabs/github-orgs/) for how ScottyLabs uses GitHub and Codeberg together.
