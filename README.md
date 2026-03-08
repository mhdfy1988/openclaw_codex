# OpenAI Codex OAuth Plugin for OpenClaw

Adds an `openai-codex` provider to OpenClaw so Codex can be used as a direct model provider via ChatGPT OAuth instead of an API key.

Full deployment and migration notes are in [DEPLOY.md](./DEPLOY.md).
Chinese deployment notes are in [DEPLOY.zh-CN.md](./DEPLOY.zh-CN.md).
Chinese quickstart notes are in [QUICKSTART.zh-CN.md](./QUICKSTART.zh-CN.md).

## Install

```powershell
& "$env:APPDATA\npm\openclaw.cmd" plugins install --link D:\C_Project\OPENCLAW_CODEX
& "$env:APPDATA\npm\openclaw.cmd" plugins enable openai-codex-auth
```

Or use the bundled installer script:

```powershell
.\install-openclaw-codex.ps1
```

Restart the OpenClaw gateway after enabling.

## Login

```powershell
& "$env:APPDATA\npm\openclaw.cmd" models auth login --provider openai-codex --set-default
```
