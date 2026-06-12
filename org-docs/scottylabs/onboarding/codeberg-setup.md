---
title: Codeberg Setup
---

[Sign up on codeberg.org](https://codeberg.org/user/sign_up).

Use the **same username and email** as your GitHub account. That is all you really need to do in this document.

## Extra steps

To clone and push ScottyLabs repos you need SSH. Verified commits are optional. See [Commit signing (optional)](#commit-signing-optional) if you want them.

### SSH setup

SSH is how Git proves you are you when you clone and push. You make a key pair on your laptop, paste the **public** key into Codeberg, and keep the private key on your machine.

1. **Create a key** (replace the email with yours):

   ```bash
   ssh-keygen -t ed25519 -C "your@email"
   ```

   Press Enter to accept the default path (`~/.ssh/id_ed25519`). Set a passphrase when prompted.

2. **Copy the public key:**

   ```bash
   cat ~/.ssh/id_ed25519.pub
   ```

   Copy the whole line (`ssh-ed25519 …`).

3. **Add it on Codeberg:** open [SSH / GPG keys](https://codeberg.org/user/settings/keys), click **Add key**, paste, save.

4. **Test it:**

   ```bash
   ssh -T git@codeberg.org
   ```

   You should see a message with your username, not `Permission denied`.

If `ssh-add` complains later, run `ssh-add ~/.ssh/id_ed25519` and enter your passphrase.

**(Optional) GitHub:** add the same public key at [GitHub SSH and GPG keys](https://github.com/settings/keys) if you push there too.

### Commit signing (optional)

Add your public key under [SSH / GPG keys](https://codeberg.org/user/settings/keys) on Codeberg and click **Verify** to prove ownership.

**SSH signing** (Git 2.34+). You can use your auth key or a separate signing-only key:

```bash
git config --global gpg.format ssh
git config --global user.signingKey '~/.ssh/id_ed25519.pub'
git config --global commit.gpgSign true
```

**GPG signing:**

```bash
git config --global user.signingkey <key-id>
git config --global commit.gpgSign true
```

## Next steps

After SSH is working, follow [Contributing](/scottylabs/onboarding/contributing/) to request access through [Governance](https://codeberg.org/scottylabs/governance). See [GitHub Organizations](/scottylabs/platform/github-orgs/) for how ScottyLabs uses GitHub and Codeberg together.
