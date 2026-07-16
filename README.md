<div align="center">

<img src="public/app-icon.png" alt="TOKENICODE Logo" width="120" />

# TOKENICODE DeepSeek Alpha

### A TOKENICODE fork tuned for DeepSeek & CC Switch

[![Version](https://img.shields.io/github/v/release/mistydew/tokenicode-deepseek-alpha?style=flat-square&color=blue)](https://github.com/mistydew/tokenicode-deepseek-alpha/releases)
[![License](https://img.shields.io/badge/license-Apache%202.0-green?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20x64-lightgrey?style=flat-square)](#download)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-FFC131?style=flat-square&logo=tauri&logoColor=white)](https://tauri.app)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)

**TOKENICODE DeepSeek Alpha** is a personal fork of [TOKENICODE](https://github.com/yiliqi78/TOKENICODE) — a native desktop GUI for [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code). This fork adds DeepSeek / CC Switch model mappings, independent Provider management, Codex skills panel, skills translation, built-in web preview, and a VS Code-styled dark theme.

[**Download**](https://github.com/mistydew/tokenicode-deepseek-alpha/releases) · [**Features**](#features) · [**Changelog**](CHANGELOG.md)

---

**[English](README.md)** | **[中文](README_zh.md)**

</div>

## What's Different

This fork keeps all TOKENICODE desktop workflow features and adds DeepSeek / CC Switch oriented improvements:

| Area | Original TOKENICODE | DeepSeek Alpha |
|------|---------------------|----------------|
| Model display | Claude / Opus / Sonnet / Haiku | `DeepseekV4Pro` / `DeepseekV4Flash` with auto API mapping |
| API providers | Standard Anthropic setup | Multi-provider manager: Anthropic & OpenAI-compatible formats, Base URL, proxy, model mapping |
| Skills | Basic skill management | Codex/Agent skills scanner with dedup, enable/disable, file locate, translate |
| Skills translation | — | One-click translate skill list and SKILL.md preview via separate translation API |
| Preview | — | Built-in browser panel for web, localhost, local files |
| Themes | Light / dark | Adds VS Code Dark and clean white themes |
| Fonts | Fixed monospace areas | Configurable UI font, monospace areas follow UI font for CJK consistency |
| New session flow | Welcome page re-select | Remembers last project folder, in-chat folder switcher |
| Context | Standard context meter | 200K / 1M context dashboard, auto-compact with configurable threshold, KaTeX math rendering |
| Releases | Original project releases | Windows x64 portable + NSIS installer with SHA256 checksums |

## Features

### DeepSeek / CC Switch Adaptation

- UI model names: `DeepseekV4Pro` and `DeepseekV4Flash`
- Automatic API mapping to `deepseek-v4-pro` / `deepseek-v4-flash`
- Legacy Claude model names auto-resolve to DeepSeek equivalents
- Honors DeepSeek official base URL format (`https://api.deepseek.com`)

### Provider Manager

- Anthropic and OpenAI-compatible formats
- Custom Base URL, API Key, model mappings, and proxy support
- Works with CC Switch, DeepSeek-compatible proxies, and third-party API gateways
- Import/export provider configs (JSON)
- One-click connection test with response time

### Codex Skills Panel

- Auto-scan local Codex/Agent skills from `.codex/skills`, `.agents/skills`, `.claude/skills`, and plugin caches
- Automatic deduplication
- View, edit, enable/disable, copy path, locate file
- Skills translation: translate skill list and SKILL.md preview (read-only, does not modify files)
- Translation cache for fewer API calls

### Desktop Workflow

- Tauri 2 + React 19 native desktop app
- File browser with SVG icons, change markers, flat search
- CodeMirror editor with 12+ language syntax highlighting
- Session management: pin, archive, batch operations, date grouping, export, AI title generation
- Checkpoint rewind (code, conversation, or both)
- Slash commands with auto-complete popup, command palette (`Ctrl+K`)
- Agent activity monitoring
- MCP server management

### Chat Experience

- Real-time NDJSON streaming with phase indicators (thinking, output, tool execution)
- SDK control protocol: structured permission approvals, 4 modes (code / ask / plan / bypass)
- Runtime mode and model switching without restart
- 200K / 1M context dashboard with cache token accounting
- Auto-compact with configurable threshold, verified 20% drop detection
- KaTeX math rendering (inline + block, fractions, integrals, matrices)
- Message timeline navigation with round-number jump

### Customization

- Multiple themes: VS Code Dark, clean white, light, dark, system-follow
- Configurable UI font (Microsoft YaHei, Source Han Sans, LXGW WenKai, monospace)
- Font size keyboard shortcuts
- Chinese / English UI (switch in settings)

## Download

Get the latest Windows x64 build from [GitHub Releases](https://github.com/mistydew/tokenicode-deepseek-alpha/releases/latest):

### v1.0.4 stability update

- Long histories now restore in one batch instead of triggering a render for every message.
- Chat initially renders the latest 200 messages; older messages can be loaded in 200-message batches.
- Closing the desktop window no longer waits for the WebView, and managed CLI child processes are cleaned up during exit.

| File | Description |
|------|-------------|
| `tokenicode-deepseek-alpha-v*-windows-x64.exe` | Portable (no install required) |
| `tokenicode-deepseek-alpha-v*-windows-x64-setup.exe` | NSIS installer |
| `*.sha256.txt` | SHA256 checksum for integrity verification |

Requires Windows 10 or later. Download and run — no external dependencies needed.

## Quick Start

1. **Download** the portable `.exe` or installer from [Releases](https://github.com/mistydew/tokenicode-deepseek-alpha/releases/latest).
2. **Launch TOKENICODE** — the setup wizard will guide you through Claude Code CLI installation and authentication on first run.
3. **Configure API** — open Settings → API Provider, add your DeepSeek / CC Switch credentials.
4. **Select a project folder** and start chatting.

### Recommended Models for CC Switch / DeepSeek

| Use case | Display name | API model |
|----------|-------------|-----------|
| Complex tasks | DeepseekV4Pro | `deepseek-v4-pro` |
| Quick / translation / light tasks | DeepseekV4Flash | `deepseek-v4-flash` |

If using DeepSeek's official OpenAI-compatible API, check their current model list and select the OpenAI format in provider settings.

### Skills Translation Setup

Open the Skills panel (right sidebar), click the gear icon:

- **Format**: Anthropic or OpenAI-compatible
- **Base URL**: Your CC Switch or DeepSeek gateway
- **API Key**: Your key
- **Model**: A fast model is recommended (e.g. `deepseek-v4-flash`)
- **Proxy URL**: Optional, leave empty unless you need an HTTP proxy

Click the translate button to translate skill names and descriptions. Open a SKILL.md preview and click translate to translate its content.

## Development

### Prerequisites

- Node.js
- pnpm
- Rust
- Tauri 2 build environment
- Windows: MSVC Build Tools

### Commands

```powershell
pnpm install
pnpm build          # Type check + Vite production build
pnpm tauri dev      # Dev server + Tauri app
pnpm tauri build    # Production app
```

### Windows MSVC Build

```powershell
cmd /c "call C:\BuildTools\VC\Auxiliary\Build\vcvars64.bat && set PATH=%USERPROFILE%\.cargo\bin;%PATH% && cd /d D:\TOKENICODE\TOKENICODE-src && pnpm tauri build"
```

Without a Tauri signing private key, the installer signing step will fail, but `src-tauri\target\release\tokenicode.exe` will still be produced.

## Relationship to TOKENICODE

This is a personal fork of [TOKENICODE](https://github.com/yiliqi78/TOKENICODE) by TinyZ / yiliqi78, focused on DeepSeek / CC Switch / Codex skills workflows. The core desktop framework, Claude Code GUI design, and most base features come from the original project.

For the original feature set, cross-platform installers, or official updates, see:
- [github.com/yiliqi78/TOKENICODE](https://github.com/yiliqi78/TOKENICODE)

## License

Apache License 2.0 — see [LICENSE](LICENSE) and [NOTICE](NOTICE).

## Acknowledgments

- [TOKENICODE](https://github.com/yiliqi78/TOKENICODE) — the upstream project
- TinyZ / yiliqi78 — TOKENICODE author
- [Tauri](https://tauri.app) — desktop app framework
- [React](https://react.dev) — UI framework
- Claude Code / Codex skills ecosystem

---

<div align="center">

**If you find this useful, please give it a ⭐!**

</div>
