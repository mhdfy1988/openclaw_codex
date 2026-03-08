[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [string]$PluginSource,
    [string]$PluginName = "openai-codex-auth",
    [string]$TargetRoot = (Join-Path $HOME ".openclaw\extensions"),
    [switch]$RunLogin,
    [switch]$SetDefault
)

$ErrorActionPreference = "Stop"

if (-not $PluginSource) {
    $PluginSource = Split-Path -Parent $MyInvocation.MyCommand.Path
}

function Resolve-OpenClawCmd {
    $candidates = @(
        (Join-Path $env:APPDATA "npm\openclaw.cmd"),
        (Join-Path $env:APPDATA "npm\openclaw.ps1")
    )

    foreach ($candidate in $candidates) {
        if ($candidate -and (Test-Path $candidate)) {
            return $candidate
        }
    }

    $command = Get-Command openclaw.cmd -ErrorAction SilentlyContinue
    if ($command) {
        return $command.Source
    }

    $command = Get-Command openclaw -ErrorAction SilentlyContinue
    if ($command) {
        return $command.Source
    }

    throw "Cannot find openclaw.cmd. Install OpenClaw first or pass a resolvable command in PATH."
}

function Copy-PluginFiles {
    param(
        [Parameter(Mandatory = $true)][string]$SourceDir,
        [Parameter(Mandatory = $true)][string]$DestinationDir
    )

    $requiredFiles = @(
        "index.js",
        "openclaw.plugin.json",
        "package.json"
    )

    $optionalFiles = @(
        "README.md",
        "DEPLOY.md",
        "DEPLOY.zh-CN.md",
        "QUICKSTART.zh-CN.md"
    )

    foreach ($file in $requiredFiles) {
        $path = Join-Path $SourceDir $file
        if (-not (Test-Path $path)) {
            throw "Required plugin file is missing: $path"
        }
    }

    if (-not (Test-Path $DestinationDir)) {
        New-Item -ItemType Directory -Force -Path $DestinationDir | Out-Null
    }

    foreach ($file in $requiredFiles + $optionalFiles) {
        $sourcePath = Join-Path $SourceDir $file
        if (Test-Path $sourcePath) {
            Copy-Item -Force $sourcePath -Destination $DestinationDir
        }
    }
}

$pluginTarget = Join-Path $TargetRoot $PluginName
$openclawCmd = Resolve-OpenClawCmd

Write-Host "Plugin source: $PluginSource"
Write-Host "Plugin target: $pluginTarget"
Write-Host "OpenClaw CLI: $openclawCmd"

if ($PSCmdlet.ShouldProcess($pluginTarget, "Copy plugin files")) {
    Copy-PluginFiles -SourceDir $PluginSource -DestinationDir $pluginTarget
}

if ($PSCmdlet.ShouldProcess($PluginName, "Install plugin via OpenClaw")) {
    & $openclawCmd plugins install --link $pluginTarget
    if ($LASTEXITCODE -ne 0) {
        throw "OpenClaw plugin install failed."
    }
}

if ($PSCmdlet.ShouldProcess($PluginName, "Enable plugin")) {
    & $openclawCmd plugins enable $PluginName
    if ($LASTEXITCODE -ne 0) {
        throw "OpenClaw plugin enable failed."
    }
}

Write-Host ""
Write-Host "Plugin installed and enabled."
Write-Host "Verify with:"
Write-Host "  `"$openclawCmd`" plugins info $PluginName"
Write-Host ""

if ($RunLogin) {
    $loginArgs = @("models", "auth", "login", "--provider", "openai-codex")
    if ($SetDefault) {
        $loginArgs += "--set-default"
    }

    if ($PSCmdlet.ShouldProcess("openai-codex", "Run OAuth login")) {
        & $openclawCmd @loginArgs
        if ($LASTEXITCODE -ne 0) {
            throw "OpenClaw OAuth login failed."
        }
    }
} else {
    Write-Host "Next step:"
    if ($SetDefault) {
        Write-Host "  `"$openclawCmd`" models auth login --provider openai-codex --set-default"
    } else {
        Write-Host "  `"$openclawCmd`" models auth login --provider openai-codex"
    }
}

Write-Host ""
Write-Host "After login, restart the OpenClaw gateway."
