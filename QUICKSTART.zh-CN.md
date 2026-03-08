# OpenClaw 接入 Codex 快速说明

这是一份最短可执行版本，适合你后续把同一套插件迁移到别的 OpenClaw 环境。

## 1. 最小目录结构

把插件放到固定目录，不要放在会移动的业务工程里。

推荐目录：

```text
%USERPROFILE%\.openclaw\extensions\openai-codex-auth\
├─ index.js
├─ openclaw.plugin.json
└─ package.json
```

可选文件：

- `README.md`
- `README.en.md`
- `README.zh-CN.md`
- `DEPLOY.md`
- `DEPLOY.zh-CN.md`
- `QUICKSTART.zh-CN.md`

## 2. 一键复制到 OpenClaw 插件目录

在本仓库目录里执行：

```powershell
$pluginDir = Join-Path $env:USERPROFILE ".openclaw\extensions\openai-codex-auth"
New-Item -ItemType Directory -Force -Path $pluginDir | Out-Null
Copy-Item -Force .\index.js, .\openclaw.plugin.json, .\package.json, .\README.md, .\README.en.md, .\README.zh-CN.md, .\DEPLOY.md, .\DEPLOY.zh-CN.md, .\QUICKSTART.zh-CN.md -Destination $pluginDir
```

如果某些说明文件不存在，把它们从命令里删掉即可。真正必须的只有：

- `index.js`
- `openclaw.plugin.json`
- `package.json`

## 3. 一键安装并启用插件

```powershell
$pluginDir = Join-Path $env:USERPROFILE ".openclaw\extensions\openai-codex-auth"
& "$env:APPDATA\npm\openclaw.cmd" plugins install --link $pluginDir
& "$env:APPDATA\npm\openclaw.cmd" plugins enable openai-codex-auth
```

也可以直接运行仓库自带脚本：

```powershell
.\install-openclaw-codex.ps1
```

如果你想安装后直接进入登录流程：

```powershell
.\install-openclaw-codex.ps1 -RunLogin -SetDefault
```

如果你习惯用 `cmd`，按下面这样一步一步执行：

1. 进入仓库目录

```cmd
cd /d D:\C_Project\OPENCLAW_CODEX
```

2. 设置插件目录

```cmd
set pluginDir=%USERPROFILE%\.openclaw\extensions\openai-codex-auth
```

3. 创建目录

```cmd
mkdir "%pluginDir%"
```

4. 复制插件文件

```cmd
copy /Y index.js "%pluginDir%"
copy /Y openclaw.plugin.json "%pluginDir%"
copy /Y package.json "%pluginDir%"
```

5. 复制说明文档

```cmd
copy /Y README.md "%pluginDir%"
copy /Y README.en.md "%pluginDir%"
copy /Y README.zh-CN.md "%pluginDir%"
copy /Y DEPLOY.md "%pluginDir%"
copy /Y DEPLOY.zh-CN.md "%pluginDir%"
copy /Y QUICKSTART.zh-CN.md "%pluginDir%"
```

6. 安装插件

```cmd
%APPDATA%\npm\openclaw.cmd plugins install --link "%pluginDir%"
```

7. 启用插件

```cmd
%APPDATA%\npm\openclaw.cmd plugins enable openai-codex-auth
```

## 4. 一键登录 Codex

```powershell
& "$env:APPDATA\npm\openclaw.cmd" models auth login --provider openai-codex --set-default
```

如果你在 `cmd` 里执行，对应命令是：

```cmd
%APPDATA%\npm\openclaw.cmd models auth login --provider openai-codex --set-default
```

## 5. 重启 Gateway

如果你使用的是已安装的 gateway service：

```powershell
& "$env:APPDATA\npm\openclaw.cmd" gateway restart
```

`cmd` 里对应是：

```cmd
%APPDATA%\npm\openclaw.cmd gateway restart
```

如果你是手工以前台方式运行的 `openclaw gateway run`，就先停止原来的 gateway 进程，再重新启动它。

## 6. 一键验证

PowerShell：

1. 查看插件状态

```powershell
& "$env:APPDATA\npm\openclaw.cmd" plugins info openai-codex-auth
```

2. 查看模型列表

```powershell
& "$env:APPDATA\npm\openclaw.cmd" models list
```

3. 查看详细认证状态

```powershell
& "$env:APPDATA\npm\openclaw.cmd" models status --json
```

`cmd` 里对应是：

1. 查看插件状态

```cmd
%APPDATA%\npm\openclaw.cmd plugins info openai-codex-auth
```

2. 查看模型列表

```cmd
%APPDATA%\npm\openclaw.cmd models list
```

3. 查看详细认证状态

```cmd
%APPDATA%\npm\openclaw.cmd models status --json
```

判断标准：

- `plugins info openai-codex-auth` 能看到 `Status: loaded`
- `models status --json` 里 `openai-codex` 应该是 `ok`
- `models list` 里的 `Auth` 列只能参考，不能作为唯一判断依据

## 7. 最小需要改哪些配置

如果走 `plugins install --link` 和 `models auth login`，大多数配置会自动生成。

最终你至少会看到这些关键项：

### `~/.openclaw/openclaw.json`

- `plugins.allow` 包含 `openai-codex-auth`
- `plugins.load.paths` 包含插件目录
- `plugins.entries.openai-codex-auth.enabled = true`
- `models.providers.openai-codex`
- `auth.profiles.openai-codex:default`
- `agents.defaults.model.primary`
- `agents.defaults.models`

### `~/.openclaw/agents/main/agent/auth-profiles.json`

- 会生成 `openai-codex:default` 的 OAuth 凭据

## 8. 推荐默认模型

如果目标机器还是 OpenClaw `2026.3.2`，建议默认模型先用：

```text
openai-codex/gpt-5.3-codex
```

原因是这版 OpenClaw 对它的兼容显示更稳定。

如果你只是想保留当前配置，也可以继续用：

```text
openai-codex/gpt-5.4
```

只是 `models list` 里可能出现误导性的 `Auth no`。

## 9. 常见问题

### `Unknown provider "openai-codex"`

说明插件没真正加载成功。先查：

```powershell
& "$env:APPDATA\npm\openclaw.cmd" plugins info openai-codex-auth
```

### 浏览器显示成功，但终端像卡住

直接：

- `Ctrl + C`
- 或关掉终端窗口

只要终端里已经出现 OAuth 成功提示，通常凭据已经写入。

### 为什么看到很多 `Auth no`

优先看：

```powershell
& "$env:APPDATA\npm\openclaw.cmd" models status --json
```

它比 `models list` 更可靠。
