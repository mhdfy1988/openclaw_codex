# OpenClaw 接入 Codex 插件部署说明

这份文档说明如何在另一套 OpenClaw 环境里，通过本仓库的自定义 `openai-codex` provider 插件接入 Codex。

目标是：

- 使用 ChatGPT/Codex OAuth，而不是 `OPENAI_API_KEY`
- 让 OpenClaw 把 Codex 当成“直接模型 provider”来使用
- 能把同一套插件迁移到别的机器或别的 OpenClaw 环境

## 1. 前置条件

- 一套可运行的 OpenClaw
- 目标机器能打开浏览器
- 一个有 Codex 使用权限的 ChatGPT 账号
- 本插件的源码文件：
  - `index.js`
  - `openclaw.plugin.json`
  - `package.json`
  - `README.md`（可选）
  - `DEPLOY.md`（可选）
  - `DEPLOY.zh-CN.md`（可选）

当前插件按 OpenClaw `2026.3.2` 做过验证。

## 2. 插件建议放哪里

不要只把插件放在某个业务工程目录里，否则工程挪走后 OpenClaw 就找不到了。

推荐放到固定目录：

- Windows：`%USERPROFILE%\.openclaw\extensions\openai-codex-auth`
- Linux/macOS：`~/.openclaw/extensions/openai-codex-auth`

先把插件文件复制到这个目录。

## 3. 如何安装插件

### 方案 A：推荐

使用 OpenClaw 的本地路径安装方式：

```powershell
& "$env:APPDATA\npm\openclaw.cmd" plugins install --link C:\Users\<你自己>\.openclaw\extensions\openai-codex-auth
& "$env:APPDATA\npm\openclaw.cmd" plugins enable openai-codex-auth
```

这种方式最稳，因为 OpenClaw 会自动写入插件安装元数据。

### 方案 B：手工写配置

如果你不想走 `plugins install --link`，也可以手工修改 `~/.openclaw/openclaw.json`：

```json
{
  "plugins": {
    "allow": ["openai-codex-auth"],
    "load": {
      "paths": [
        "C:\\Users\\<你自己>\\.openclaw\\extensions\\openai-codex-auth"
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

如果目标机器本来就有别的插件，不要覆盖原有配置，要做 merge。

## 4. 登录命令

插件加载成功后，执行：

```powershell
& "$env:APPDATA\npm\openclaw.cmd" models auth login --provider openai-codex --set-default
```

这条命令会做几件事：

- 打开浏览器，走 ChatGPT OAuth
- 把 OAuth 凭据写入 OpenClaw 的 auth store
- 把 `openai-codex` provider 写入 `openclaw.json`
- 把 Codex 模型加入 agent allowlist
- 给出默认模型建议

如果本地回调没自动成功，插件会允许你手动粘贴回调 URL 或授权 code。

## 5. 迁移时真正关键的文件和配置

### 5.1 插件文件

目标机器上必须有：

- `index.js`
- `openclaw.plugin.json`
- `package.json`

### 5.2 OpenClaw 主配置

主配置文件路径通常是：

- Windows：`%USERPROFILE%\.openclaw\openclaw.json`
- Linux/macOS：`~/.openclaw/openclaw.json`

其中这些键最关键：

- `plugins.allow`
- `plugins.load.paths`
- `plugins.entries.openai-codex-auth.enabled`
- `plugins.installs.openai-codex-auth`
- `models.providers.openai-codex`
- `auth.profiles.openai-codex:default`
- `agents.defaults.model.primary`
- `agents.defaults.models`

### 5.3 Auth 凭据存储

OpenClaw 真正的 OAuth token 不只写在 `openclaw.json`，还会写进 agent 的 auth store。

典型路径：

- `~/.openclaw/agents/main/agent/auth-profiles.json`

注意：

- 不要把这个文件公开出去
- 最好每台机器都重新走一次 OAuth
- 如果你确实要迁移已登录状态，就把这个文件当成敏感凭据处理

## 6. 登录后会生成什么 provider 配置

登录成功后，`openclaw.json` 里应该会出现类似这样的 provider 配置：

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

实际生成的内容会更完整，还会带上输入类型、上下文窗口、最大输出 token 等元数据。

## 7. 默认模型和 allowlist 的区别

这两个配置很容易混：

- `agents.defaults.model.primary`：默认用哪个模型
- `agents.defaults.models`：默认 agent 允许使用哪些模型

如果模型不在 `agents.defaults.models` 里，即使 provider 已经装好、也已经登录了，OpenClaw 也可能不让默认 agent 用它。

示例：

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

## 8. 不同 OpenClaw 版本下的默认模型建议

对 OpenClaw `2026.3.2`，当前更稳的默认值是：

- `openai-codex/gpt-5.3-codex`

原因：

- 这版 OpenClaw 对 `gpt-5.3-codex` 有更明确的内置识别
- `models list` 的认证显示更稳定
- `gpt-5.4` 虽然也能被插件注册进去，但在这版 OpenClaw 里，`models list` 可能会显示误导性的 `Auth no`

如果后面换到更新版本的 OpenClaw，且它已经完整识别 `gpt-5.4`，就可以把默认模型改回：

- `openai-codex/gpt-5.4`

## 9. 验证命令

查看插件是否加载成功：

```powershell
& "$env:APPDATA\npm\openclaw.cmd" plugins info openai-codex-auth
```

查看模型列表：

```powershell
& "$env:APPDATA\npm\openclaw.cmd" models list
```

查看真实认证状态：

```powershell
& "$env:APPDATA\npm\openclaw.cmd" models status --json
```

`models status --json` 比 `models list` 里的 `Auth` 列更可靠。

## 10. 常见问题

### `Unknown provider "openai-codex"`

原因一般只有几个：

- 插件没加载
- 插件路径写错了
- 插件没有启用

排查命令：

- `openclaw plugins info openai-codex-auth`
- `openclaw plugins list`

### `models list` 里看到 `Auth no`

这不一定表示模型不能用。

先看：

```powershell
openclaw models status --json
```

在 OpenClaw `2026.3.2` 上，`gpt-5.4` 即使已经完成 `openai-codex` OAuth，也可能在 `models list` 里显示 `Auth no`。这更像显示层兼容问题，不一定是认证失败。

### 浏览器已经显示成功，但终端退不出来

早期版本里，这通常是本地回调服务没有正常关闭。

当前插件实现已经在 `finally` 里关闭 callback server。

如果终端还是像卡住一样：

- 直接按 `Ctrl + C`
- 或直接关掉终端窗口

只要终端里已经打印了成功信息，OAuth 凭据一般已经写进去了。

### 本地回调端口冲突

插件使用的是：

- `http://localhost:1455/auth/callback`

如果 `1455` 端口被别的程序占用了，本地自动回调可能失败。这时插件会退回到“手动粘贴 URL/code”模式。

## 11. 最小迁移步骤

在另一台机器上，最小可行流程就是：

1. 把插件目录复制到 `~/.openclaw/extensions/openai-codex-auth`
2. 执行 `openclaw plugins install --link <这个目录>`
3. 执行 `openclaw plugins enable openai-codex-auth`
4. 执行 `openclaw models auth login --provider openai-codex --set-default`
5. 执行 `openclaw models status --json` 做验证
6. 重启 OpenClaw gateway

## 12. 不要盲目复制的东西

这些文件或配置不要无脑复制到别的环境：

- `auth-profiles.json`
- `models.json` 里的 API key
- gateway token
- 无关插件配置

如果确实要迁移，先确认你知道这些内容的安全影响。
