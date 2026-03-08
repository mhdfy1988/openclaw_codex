# OpenClaw Codex Provider Deployment Guide

This document describes how to make another OpenClaw installation support Codex through the custom `openai-codex` provider plugin in this repository.

The goal is:

- Use ChatGPT/Codex OAuth instead of `OPENAI_API_KEY`
- Let OpenClaw treat Codex as a direct model provider
- Reuse the same plugin on other machines or other OpenClaw workspaces

## 1. What you need

- An OpenClaw installation
- A browser on the target machine
- A ChatGPT account that can use Codex
- This plugin's source files:
  - `index.js`
  - `openclaw.plugin.json`
  - `package.json`
  - `README.md` (Chinese primary README, optional)
  - `README.en.md` (optional)
  - `README.zh-CN.md` (Chinese alias, optional)
  - `DEPLOY.md` (optional)

This plugin was tested against OpenClaw `2026.3.2`.

## 2. Recommended plugin location

Do not keep the plugin only inside a project folder that may move later.

Recommended stable locations:

- Windows: `%USERPROFILE%\.openclaw\extensions\openai-codex-auth`
- Linux/macOS: `~/.openclaw/extensions/openai-codex-auth`

Copy the plugin files there first.

## 3. Install or register the plugin

### Option A: recommended

Use OpenClaw's plugin installer with a local path:

```powershell
& "$env:APPDATA\npm\openclaw.cmd" plugins install --link C:\Users\<you>\.openclaw\extensions\openai-codex-auth
& "$env:APPDATA\npm\openclaw.cmd" plugins enable openai-codex-auth
```

This is the simplest path because OpenClaw writes the plugin metadata for you.

### Option B: manual config

If you do not want to use `plugins install --link`, add the following to `~/.openclaw/openclaw.json` yourself:

```json
{
  "plugins": {
    "allow": ["openai-codex-auth"],
    "load": {
      "paths": [
        "C:\\Users\\<you>\\.openclaw\\extensions\\openai-codex-auth"
      ]
    },
    "entries": {
      "openai-codex-auth": {
        "enabled": true
      }
    }
  }
}
```

If the machine already has other plugins, merge these keys instead of overwriting them.

## 4. Login flow

After the plugin is loaded, run:

```powershell
& "$env:APPDATA\npm\openclaw.cmd" models auth login --provider openai-codex --set-default
```

What this does:

- Opens the browser for ChatGPT OAuth
- Stores the OAuth credential in OpenClaw's auth store
- Registers the `openai-codex` provider in `openclaw.json`
- Adds the Codex models to the agent allowlist
- Exposes a default model suggestion

If the local callback does not complete automatically, the plugin will let you paste the redirect URL or the auth code manually.

## 5. Files and config that matter

### 5.1 Plugin files

These must exist on the target machine:

- `index.js`
- `openclaw.plugin.json`
- `package.json`

### 5.2 OpenClaw config

Main config file:

- Windows: `%USERPROFILE%\.openclaw\openclaw.json`
- Linux/macOS: `~/.openclaw/openclaw.json`

Keys that matter:

- `plugins.allow`
- `plugins.load.paths`
- `plugins.entries.openai-codex-auth.enabled`
- `plugins.installs.openai-codex-auth`
- `models.providers.openai-codex`
- `auth.profiles.openai-codex:default`
- `agents.defaults.model.primary`
- `agents.defaults.models`

### 5.3 Auth store

OpenClaw stores the real OAuth token in the agent auth store, not only in `openclaw.json`.

Typical path:

- `~/.openclaw/agents/main/agent/auth-profiles.json`

Important:

- Do not publish this file
- Prefer re-running OAuth on each machine instead of copying tokens around
- If you intentionally migrate a logged-in state, treat this file like a secret

## 6. Provider block created by login

After login, you should have a provider block equivalent to:

```json
{
  "models": {
    "providers": {
      "openai-codex": {
        "baseUrl": "https://chatgpt.com/backend-api",
        "auth": "oauth",
        "api": "openai-codex-responses",
        "models": [
          { "id": "gpt-5.4" },
          { "id": "gpt-5.3-codex" },
          { "id": "gpt-5.2-codex" },
          { "id": "gpt-5.1-codex" }
        ]
      }
    }
  }
}
```

The real generated config contains more metadata such as input types, context window and token limits.

## 7. Default model and allowlist

Two different settings are easy to confuse:

- `agents.defaults.model.primary`: the model OpenClaw uses by default
- `agents.defaults.models`: the allowlist of models the default agent is allowed to use

If a model is not listed in `agents.defaults.models`, it may not be selectable even when the provider is installed and logged in.

Example:

```json
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "openai-codex/gpt-5.3-codex"
      },
      "models": {
        "openai-codex/gpt-5.3-codex": {},
        "openai-codex/gpt-5.2-codex": {},
        "openai-codex/gpt-5.1-codex": {},
        "openai-codex/gpt-5.4": {}
      }
    }
  }
}
```

## 8. Recommended default by OpenClaw version

For OpenClaw `2026.3.2`, the safest default is currently:

- `openai-codex/gpt-5.3-codex`

Reason:

- This OpenClaw build has internal recognition for `gpt-5.3-codex`
- It may display cleaner auth status in `models list`
- `gpt-5.4` can still be registered by the plugin, but `models list` may show misleading auth output on this older build

If a newer OpenClaw build fully recognizes `gpt-5.4`, you can switch the default back to:

- `openai-codex/gpt-5.4`

## 9. Verification commands

Check whether the plugin is loaded:

```powershell
& "$env:APPDATA\npm\openclaw.cmd" plugins info openai-codex-auth
```

Check the model registry view:

```powershell
& "$env:APPDATA\npm\openclaw.cmd" models list
```

Check the real auth status:

```powershell
& "$env:APPDATA\npm\openclaw.cmd" models status --json
```

The JSON status output is more reliable than the compact `Auth` column in `models list`.

## 10. Troubleshooting

### `Unknown provider "openai-codex"`

Cause:

- The plugin is not loaded
- The plugin path is wrong
- The plugin was not enabled

Check:

- `openclaw plugins info openai-codex-auth`
- `openclaw plugins list`

### `Auth no` in `models list`

This does not always mean the model is unusable.

Check `openclaw models status --json` first.

On OpenClaw `2026.3.2`, `gpt-5.4` may show `Auth no` even when the `openai-codex` OAuth provider is already valid.

### Browser says success but terminal does not exit

This was caused by the callback server not closing cleanly in an earlier plugin revision.

Current plugin behavior closes the callback server in `finally`.

If the terminal still looks stuck after a success message:

- Press `Ctrl + C`
- Or close the terminal window

The OAuth profile is usually already written at that point if the success message was printed.

### Callback port conflict

The plugin uses:

- `http://localhost:1455/auth/callback`

If another process is using port `1455`, local callback may fail and the plugin will fall back to manual paste mode.

## 11. Minimum migration checklist

On another machine, the minimum practical sequence is:

1. Copy the plugin folder to `~/.openclaw/extensions/openai-codex-auth`
2. Run `openclaw plugins install --link <that path>`
3. Run `openclaw plugins enable openai-codex-auth`
4. Run `openclaw models auth login --provider openai-codex --set-default`
5. Verify with `openclaw models status --json`
6. Restart the OpenClaw gateway

## 12. What not to copy blindly

Do not blindly copy these between unrelated machines:

- `auth-profiles.json`
- API keys from `models.json`
- gateway tokens
- unrelated plugin config

Only copy them intentionally, and only if you understand the security impact.
