# OpenClaw 的 OpenAI Codex OAuth 插件

这个文件是中文 README 的兼容别名。GitHub 仓库首页现在优先显示 [README.md](./README.md)。

说明：本插件由 AI 参与论证、设计和编写，最终以当前仓库中的实际代码与文档为准。

English README: [README.en.md](./README.en.md)

## 当前代码实现了什么

当前这版插件会：

- 注册 provider id `openai-codex`
- 使用 ChatGPT OAuth 完成登录和 token 刷新
- 在本地开启 `http://localhost:1455/auth/callback` 作为回调地址
- 如果本地回调没有自动完成，允许手动粘贴回调 URL 或授权 code
- 在执行 `models auth login` 时自动写入 provider 配置和 agent allowlist

当前代码内置的模型 id：

- `gpt-5.4`
- `gpt-5.3-codex`
- `gpt-5.2-codex`
- `gpt-5.1-codex`

当前插件写入的默认模型是：

- `openai-codex/gpt-5.4`

## 仓库文件说明

- `index.js`：provider 注册、OAuth 流程、token refresh、配置补丁
- `openclaw.plugin.json`：OpenClaw 插件清单
- `package.json`：包元数据
- `install-openclaw-codex.ps1`：Windows PowerShell 安装脚本

## 快速开始

### 方案 A：直接用仓库自带安装脚本

```powershell
.\install-openclaw-codex.ps1
```

如果你想安装完直接进入登录，并把 Codex 设为默认模型：

```powershell
.\install-openclaw-codex.ps1 -RunLogin -SetDefault
```

### 方案 B：手工执行

```powershell
$pluginDir = Join-Path $env:USERPROFILE ".openclaw\extensions\openai-codex-auth"
New-Item -ItemType Directory -Force -Path $pluginDir | Out-Null
Copy-Item -Force .\index.js, .\openclaw.plugin.json, .\package.json, .\README.md, .\README.en.md, .\README.zh-CN.md, .\DEPLOY.md, .\DEPLOY.zh-CN.md, .\QUICKSTART.zh-CN.md -Destination $pluginDir
& "$env:APPDATA\npm\openclaw.cmd" plugins install --link $pluginDir
& "$env:APPDATA\npm\openclaw.cmd" plugins enable openai-codex-auth
& "$env:APPDATA\npm\openclaw.cmd" models auth login --provider openai-codex --set-default
```

登录完成后，重启 OpenClaw gateway。

## 验证命令

```powershell
& "$env:APPDATA\npm\openclaw.cmd" plugins info openai-codex-auth
& "$env:APPDATA\npm\openclaw.cmd" models list
& "$env:APPDATA\npm\openclaw.cmd" models status --json
```

判断时优先看：

- `plugins info openai-codex-auth` 是否为 `loaded`
- `models status --json` 里 `openai-codex` 是否为 `ok`

其中 `models status --json` 比 `models list` 里的 `Auth` 列更可靠。

## 注意事项

- 这个插件走的是 ChatGPT/Codex OAuth，不是 OpenAI API key。
- 在较老的 OpenClaw 版本上，`models list` 可能会对某些 Codex 模型显示误导性的 `Auth no`，但不一定代表认证失败。
- 如果浏览器已经显示登录成功，但终端看起来像卡住，一般凭据已经写入，可以中断命令后再用 `models status --json` 验证。

## 更多文档

- 完整部署说明：[DEPLOY.zh-CN.md](./DEPLOY.zh-CN.md)
- 中文速查说明：[QUICKSTART.zh-CN.md](./QUICKSTART.zh-CN.md)
- 英文部署说明：[DEPLOY.md](./DEPLOY.md)
