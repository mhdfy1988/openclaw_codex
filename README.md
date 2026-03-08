# OpenAI Codex OAuth Plugin for OpenClaw

This repository adds an `openai-codex` provider to OpenClaw so Codex can be used as a direct model provider through ChatGPT OAuth instead of an OpenAI API key.

Chinese README: [README.zh-CN.md](./README.zh-CN.md)

## Current behavior

The plugin currently:

- registers provider id `openai-codex`
- uses ChatGPT OAuth for login and token refresh
- opens a local callback on `http://localhost:1455/auth/callback`
- falls back to manual redirect URL or code paste if the callback does not complete automatically
- writes provider config and agent allowlist entries during `models auth login`

Supported model ids in the current code:

- `gpt-5.4`
- `gpt-5.3-codex`
- `gpt-5.2-codex`
- `gpt-5.1-codex`

Default model written by the plugin today:

- `openai-codex/gpt-5.4`

## Files

- `index.js`: provider registration, OAuth flow, token refresh, config patch
- `openclaw.plugin.json`: OpenClaw plugin manifest
- `package.json`: package metadata
- `install-openclaw-codex.ps1`: local install helper for Windows PowerShell

## Quick start

### Option A: bundled installer script

```powershell
.\install-openclaw-codex.ps1
```

Install, enable, login, and set default in one pass:

```powershell
.\install-openclaw-codex.ps1 -RunLogin -SetDefault
```

### Option B: manual install

```powershell
& "$env:APPDATA\npm\openclaw.cmd" plugins install --link D:\C_Project\OPENCLAW_CODEX
& "$env:APPDATA\npm\openclaw.cmd" plugins enable openai-codex-auth
& "$env:APPDATA\npm\openclaw.cmd" models auth login --provider openai-codex --set-default
```

After login, restart the OpenClaw gateway.

## Verify

```powershell
& "$env:APPDATA\npm\openclaw.cmd" plugins info openai-codex-auth
& "$env:APPDATA\npm\openclaw.cmd" models list
& "$env:APPDATA\npm\openclaw.cmd" models status --json
```

`models status --json` is the more reliable auth check.

## Notes

- This plugin is intended for ChatGPT/Codex OAuth, not `OPENAI_API_KEY`.
- On older OpenClaw builds, `models list` may show misleading `Auth no` for some Codex model names even when OAuth is already valid.
- If the browser page says authentication succeeded but the terminal appears stuck, the credential is usually already written; you can stop the command and verify with `models status --json`.

## More docs

- Full deployment notes: [DEPLOY.md](./DEPLOY.md)
- Chinese deployment notes: [DEPLOY.zh-CN.md](./DEPLOY.zh-CN.md)
- Chinese quickstart: [QUICKSTART.zh-CN.md](./QUICKSTART.zh-CN.md)
