<div align="center">

<img src="public/app-icon.png" alt="TOKENICODE Logo" width="120" />

# TOKENICODE DeepSeek Alpha

### 面向 DeepSeek / CC Switch 的 TOKENICODE 魔改版

[![Version](https://img.shields.io/github/v/release/mistydew/tokenicode-deepseek-alpha?style=flat-square&color=blue)](https://github.com/mistydew/tokenicode-deepseek-alpha/releases)
[![License](https://img.shields.io/badge/license-Apache%202.0-green?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20x64-lightgrey?style=flat-square)](#下载)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-FFC131?style=flat-square&logo=tauri&logoColor=white)](https://tauri.app)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)

**TOKENICODE DeepSeek Alpha** 是基于 [TOKENICODE](https://github.com/yiliqi78/TOKENICODE) 的个人魔改分支，专为 DeepSeek / CC Switch 使用场景优化。保留原版的桌面 GUI、会话管理、文件浏览和 Claude Code CLI 工作流，同时加入了独立 Provider 管理、Codex Skills 面板、技能翻译、内置网页预览和 VS Code 风格深色主题。

[**下载**](https://github.com/mistydew/tokenicode-deepseek-alpha/releases) · [**功能**](#功能) · [**更新日志**](CHANGELOG.md)

---

**[English](README.md)** | **[中文](README_zh.md)**

</div>

## 与原版的区别

| 方面 | 原版 TOKENICODE | DeepSeek Alpha |
|------|----------------|----------------|
| 模型显示 | Claude / Opus / Sonnet / Haiku | `DeepseekV4Pro` / `DeepseekV4Flash`，自动映射真实 API model |
| API 接入 | 标准 Anthropic 设置 | 独立多 Provider 管理，支持 Anthropic / OpenAI 兼容格式、Base URL、代理、模型映射 |
| 技能面板 | 基础技能管理 | 自动扫描 Codex/Agent skills，去重、启用/禁用、定位文件 |
| 技能翻译 | — | 一键翻译技能列表和 SKILL.md 预览，不改原文件 |
| 网页预览 | — | 内置浏览器面板，支持网页、localhost、本地文件 |
| 主题 | 浅色 / 深色 | 增加 VS Code Dark、纯白简约风格 |
| 字体 | 部分区域固定等宽 | 可配置界面字体，小标签/路径/模型名跟随 UI 字体 |
| 新对话流程 | 需回到欢迎页重选 | 记住上次项目目录，输入框底部快速切换 |
| 长对话 | 标准上下文显示 | 200K / 1M 上下文仪表盘，可配置自动 compact 阈值，KaTeX 数学公式 |
| 发布 | 原项目发布 | Windows x64 便携版 + NSIS 安装版 + SHA256 校验 |

## 功能

### DeepSeek / CC Switch 适配

- 界面显示 `DeepseekV4Pro` 和 `DeepseekV4Flash`
- 请求时自动映射为 `deepseek-v4-pro` / `deepseek-v4-flash`
- 旧的 Claude 模型名自动归一到 DeepSeek 对应模型
- 兼容 DeepSeek 官方 OpenAI 格式 Base URL（`https://api.deepseek.com`）

### Provider 管理器

- 支持 Anthropic 和 OpenAI 兼容两种格式
- 自定义 Base URL、API Key、模型映射、代理
- 适配 CC Switch、DeepSeek 兼容代理、第三方模型网关
- 一键导入/导出配置（JSON）
- 连接测试显示响应时间

### Codex Skills 面板

- 自动扫描 `.codex/skills`、`.agents/skills`、`.claude/skills` 和插件缓存
- 自动去重，避免重复显示
- 查看、编辑、启用/禁用、复制路径、定位文件
- 技能翻译：翻译技能列表和 SKILL.md 预览（只影响预览、不修改原文件）
- 翻译结果本地缓存

### 桌面工作流

- Tauri 2 + React 19 原生桌面应用
- 文件浏览器：SVG 图标、变更标记、扁平搜索
- CodeMirror 编辑器：12+ 语言语法高亮
- 会话管理：置顶、归档、批量操作、日期分组、导出、AI 标题生成
- 检查点回退：代码、对话或两者同时恢复
- 斜杠命令自动补全 + 命令面板（`Ctrl+K`）
- Agent 活动实时监控
- MCP 服务器管理

### 聊天体验

- NDJSON 实时流式传输，阶段指示器（思考/输出/工具执行）
- SDK 控制协议：结构化权限审批，4 种模式（code / ask / plan / bypass）
- 运行时切换模式和模型，无需重启会话
- 200K / 1M 上下文仪表，包含缓存 Token 统计
- 自动 compact 可配置阈值，20% 下降验证，90 秒超时回退
- KaTeX 数学公式渲染（行内 + 块级，分式、积分、矩阵）
- 消息时间线，按轮次快速跳转

### 个性化

- 多主题：VS Code Dark、纯白简约、浅色、深色、跟随系统
- 可配置界面字体（微软雅黑、思源黑体、霞鹜文楷、等宽）
- 字号快捷键调节
- 中英文界面切换

## 下载

从 [GitHub Releases](https://github.com/mistydew/tokenicode-deepseek-alpha/releases/latest) 下载最新 Windows x64 版本：

| 文件 | 说明 |
|------|------|
| `tokenicode-deepseek-alpha-v*-windows-x64.exe` | 便携版，无需安装 |
| `tokenicode-deepseek-alpha-v*-windows-x64-setup.exe` | NSIS 安装版 |
| `*.sha256.txt` | SHA256 校验文件 |

需要 Windows 10 或更高版本。下载后双击运行即可，无需额外依赖。

## 快速开始

1. **下载**便携版 `.exe` 或安装包。
2. **启动 TOKENICODE** — 首次运行会自动引导安装和认证 Claude Code CLI。
3. **配置 API** — 打开 设置 → API Provider，添加 DeepSeek / CC Switch 凭据。
4. **选择项目文件夹**，开始对话。

### CC Switch / DeepSeek 模型建议

| 用途 | 显示名 | API model |
|------|--------|-----------|
| 复杂/高质量任务 | DeepseekV4Pro | `deepseek-v4-pro` |
| 快速/翻译/轻任务 | DeepseekV4Flash | `deepseek-v4-flash` |

如果使用 DeepSeek 官方 OpenAI 兼容接口，请以官方实际模型名为准，并在 Provider 设置中选择 OpenAI 格式。

### Skills 翻译配置

打开右侧技能面板，点击右上角齿轮图标：

- **格式**：Anthropic 或 OpenAI 兼容
- **Base URL**：CC Switch 或 DeepSeek 网关地址
- **API Key**：密钥
- **Model**：建议使用快速模型（如 `deepseek-v4-flash`）
- **Proxy URL**：可选，通常留空；需要代理时填写 `http://127.0.0.1:7890`

配置后点击翻译按钮即可翻译技能列表。打开 SKILL.md 预览后也可点击翻译按钮翻译正文。

## 本地开发

### 环境要求

- Node.js
- pnpm
- Rust
- Tauri 2 构建环境
- Windows 打包需要 MSVC Build Tools

### 常用命令

```powershell
pnpm install
pnpm build          # TypeScript + Vite 生产构建
pnpm tauri dev      # 开发服务器 + Tauri 应用
pnpm tauri build    # 生产打包
```

### Windows MSVC 构建

```powershell
cmd /c "call C:\BuildTools\VC\Auxiliary\Build\vcvars64.bat && set PATH=%USERPROFILE%\.cargo\bin;%PATH% && cd /d D:\TOKENICODE\TOKENICODE-src && pnpm tauri build"
```

如果没有 Tauri 签名私钥，安装包签名阶段可能失败，但 `src-tauri\target\release\tokenicode.exe` 仍会生成。

## 与原 TOKENICODE 的关系

本仓库是 [TOKENICODE](https://github.com/yiliqi78/TOKENICODE) （作者 TinyZ / yiliqi78）的个人魔改分支，目标是让 DeepSeek / CC Switch / Codex skills 工作流更顺手。核心桌面框架、Claude Code GUI 思路和大量基础功能来自原项目。

如需原版功能、跨平台安装包或官方更新，请访问：
- [github.com/yiliqi78/TOKENICODE](https://github.com/yiliqi78/TOKENICODE)

## 许可证

Apache License 2.0 — 详见 [LICENSE](LICENSE) 和 [NOTICE](NOTICE)。

## 致谢

- [TOKENICODE](https://github.com/yiliqi78/TOKENICODE) — 上游项目
- TinyZ / yiliqi78 — TOKENICODE 原作者
- [Tauri](https://tauri.app) — 桌面应用框架
- [React](https://react.dev) — UI 框架
- Claude Code / Codex skills 生态

---

<div align="center">

**如果觉得有用，请给个 ⭐！**

</div>
