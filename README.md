# TOKENICODE DeepSeek Alpha

## 更新记录

### v1.0.8

- 修复 AskUserQuestion 选项点击后只在界面显示已响应、却没有真正发送给模型的问题；答案现在按问题原文组装，并通过 Claude Code 控制协议回传。
- 修复 v1.0.7 过滤掉部分历史会话的问题；即使会话尚未写入助手回复，也会继续保留在历史列表中，避免旧对话莫名消失。
- 修复重新打开历史会话后上下文归零或重复计算的问题；应用会从持久化会话恢复最新上下文快照，并对重复的消息记录去重。
- 完成态的思考过程默认展开，用户可以直接看到小字思考内容；发送 `hi`、弹窗选择、响应完成与重启后的历史恢复均已通过真实桌面交互验证。
- 启动诊断日志只记录事件类型、耗时和字节数，不再写入提示词、回复、思考内容或工具参数。

### v1.0.7

- 修复回退后旧分支与新分支同时出现在历史列表、JSONL 重放记录重复的问题；回退提示不再写进对话历史，旧记录仍保留在本机用于恢复。
- 修复文件监听覆盖用户主目录时产生大量事件，导致 CPU 升高、任务长期显示“仍在运行中”、实际完成却不发送回复的问题；同时保留仅有流式增量时的最终回复。
- 模型名称现在按实际 Provider 和模型映射显示。未配置 Provider 时保持 Claude 原名，Claude 不再被强制改成 DeepSeek；官方 Claude 的思考等级与小字思考内容也会正常保留。
- Skills 的 `/` 调用改为由应用解析，支持一次选择多个技能。默认只扫描 `~/.claude/skills` 和项目的 `.claude/skills`，不再混入 Codex/Agent 专用目录；可在 Skills 面板手动添加兼容目录。
- 外部网站改为在独立的应用内浏览窗口打开，绕过 iframe 的“已阻止访问”；localhost、本地文件仍可在侧栏预览，并移除了没有真实截图能力的“截屏”按钮。
- Windows 上 Provider 与 Skills 翻译 API Key 的加密主密钥改由 DPAPI 绑定当前用户保护，旧 Provider 密钥和旧的本地存储翻译配置会自动迁移；运行日志不再输出参数、PATH、环境变量值和带凭据的代理地址。
- 保留 v1.0.6 的头像上传与稳定上下文快照修复；上下文显示继续计入缓存输入 token，不会因重新查看而归零。

### v1.0.6

- 修复设置页 AI 头像和用户头像无法从本地上传的问题，选图后可以正常预览、裁剪并保存。
- 修复窗口上下文用量在新一轮消息开始或重新查看时意外归零的问题；上下文计算现在保留稳定快照，并计入缓存输入 token。

### v1.0.1

- 以 `v0.10.12-alpha.1` 为完整功能与界面基线重新发布；后续 `0.10.13` 至 `0.10.17` 的功能不包含在此版本中。
- 产品和发行名称统一为 `TOKENICODE DeepSeek Alpha v1.0.1`。

### v0.10.12-alpha.1

- 修正上一版对 DeepSeek OpenAI `base_url` 的处理：官网写法 `https://api.deepseek.com` 会请求 `/chat/completions`，不再强行补 `/v1`。
- 保留 `/v1` 兼容：如果用户显式填写 `https://api.deepseek.com/v1`，仍会请求 `/v1/chat/completions`。
- 翻译配置面板说明同步改为 DeepSeek 官网写法，避免误导用户改成非官网 URL。

### v0.10.11-alpha.1

- 修复 Skills 翻译 API 的 OpenAI/DeepSeek Base URL 拼接兼容性，支持裸 base URL、`/v1` 和完整 `/chat/completions` 地址。
- 翻译请求增加 `Accept-Encoding: identity`，减少代理或网关压缩响应导致的 `error decoding response body`。
- 翻译配置面板补充 Base URL / Proxy URL 说明，明确 Proxy URL 只是网络代理地址，通常可以留空。
- 响应读取失败时会给出更明确的排查提示，方便定位 Base URL、代理或网关改写问题。

### v0.10.10-alpha.1

- 修复切换 Provider 后仍保留旧模型选择的问题，避免把 `gemma4:12b` 这类本地模型名发给 DeepSeek / CC Switch 接口。
- 模型解析现在会严格跟随当前激活 Provider：当前选择不属于该 Provider 时，会回退到当前 Provider 的已配置模型映射。
- 底部模型下拉会在 Provider 变化后自动切换到当前 Provider 可用模型，减少 UI 显示和实际请求模型不一致。

### v0.10.9-alpha.1

- 左侧边栏新增“添加文件夹”入口，可以像 Codex 一样直接选择现有文件夹并创建项目。
- 选择文件夹后会立即切换工作目录，并在会话列表中生成对应项目分组，不需要先进入欢迎页重新选择。
- “新任务”和“添加文件夹”复用同一套 draft 创建逻辑，减少不同入口行为不一致。

### v0.10.8-alpha.1

- 自动 compact 阈值改为可在设置中手动调整，不再只能跟随写死的 160K / 800K。
- 设置页新增 “自动 compact 阈值” 输入框，单位为 K tokens，并提供 160K、400K、800K、950K 快捷按钮。
- 手动修改阈值会对当前会话立即生效；只有“上下文窗口”声明仍用于 200K / 1M 的容量显示和 Claude Code 子进程 compact window。

### v0.10.7-alpha.1

- 新增“上下文窗口”设置，可在“标准 200K”和“声明 1M”之间切换。
- 选择“声明 1M”后，前端上下文仪表盘按 1,000,000 tokens 计算，自动 compact 阈值从 160K 提升到 800K。
- 自动 compact 不再写死 160K，而是跟随当前会话启动时的上下文窗口快照。
- 启动 Claude Code 子进程时会显式传入上下文窗口，并为 1M 模型设置 `CLAUDE_CODE_AUTO_COMPACT_WINDOW=1000000`，避免 CLI 仍按 200K 提前压缩。

### v0.10.6-alpha.1

- 新增聊天区右侧轮次时间线：每一轮用户提问都会生成一个编号节点，点击即可跳转到对应轮次。
- 新增更清楚的“最新”跳转按钮：翻看旧消息后可以一键回到消息底部。
- 时间线会跟随滚动高亮当前所在轮次，长对话中定位上下文更快。
- 轮次跳转复用现有 rewind 的轮次解析逻辑，保证“第几轮”的判断和回退功能一致。

### v0.10.5-alpha.1

- 新增输入框底部 Claude Code 权限模式切换器，不再需要去命令行里手动切换。
- `Code` 模式改名为“标准自动”：自动接受代码编辑，敏感操作仍按 Claude Code 权限规则确认。
- `Bypass` 模式改名为“全自动”：跳过权限检查，适合你确认环境安全时使用。
- 会话启动和新任务预热都会记录当前模式、模型、思考等级和 Provider 快照，避免 UI 显示和实际 CLI 进程权限不一致。
- 如果你在已有会话中切换“标准自动 / 全自动 / 询问 / 计划”，下一次发送会自动丢弃旧权限进程并用新模式启动，不需要手动重启 Claude Code。

### v0.10.4-alpha.1

- 紧急修复：点击左侧“新任务”后不再只取消选中旧会话，而是创建干净的新 draft 会话。
- 修复新任务输入栏在没有 active session 时第一条消息可能无法正确发送的问题。
- 输入栏提交时增加兜底：如果没有当前会话但已有工作目录，会自动创建新 draft 并读取编辑器中的当前文本。
- 修复无 active Provider 时未知残留模型名会被原样发给 API 的问题；现在会回退到 `deepseek-v4-flash`，避免 `Model does not exist`。

### v0.10.3-alpha.1

- MCP 设置页打开时会自动扫描本机已安装/已配置的 MCP。
- 支持扫描 `~/.claude.json` 全局 MCP、Claude 项目级 MCP、`~/.mcp.json` 和 Codex 的 `~/.codex/config.toml`。
- 扫描结果会显示来源、命令和环境变量数量，不直接展示环境变量值。
- 对当前 TOKENICODE 尚未导入的 MCP，会显示“导入”按钮；也可以一键导入全部未导入项。
- 同名 MCP 默认跳过，避免覆盖已有手动配置。

### v0.10.2-alpha.1

- 新增“本地模型”设置页。
- 支持检测本机 Ollama 服务与已安装模型。
- 支持在界面里输入 Ollama 模型名并下载，例如 `qwen2.5-coder:7b`、`deepseek-r1:7b`。
- 下载模型时显示 Ollama 输出进度。
- 已安装模型可以一键设为本地 API Provider，自动使用 OpenAI 兼容端点 `http://localhost:11434/v1`。
- 本机便携版 `D:\TOKENICODE\tokenicode.exe` 已同步更新到 `0.10.2`。

### v0.10.1-alpha.1

- 将应用内“检查更新”源切换到本仓库 `mistydew/tokenicode-deepseek-alpha`。
- 新增本项目自己的 Tauri updater 签名配置。
- 发布 Windows x64 安装包、便携 exe、zip、`latest.json` 和 SHA256 校验文件。
- 修复旧更新入口仍指向原版 TOKENICODE 项目的问题。

> 后续每次发布新版，都会在这里继续追加更新说明。

一个面向 DeepSeek / CC Switch 使用场景的 TOKENICODE 魔改版。它保留 TOKENICODE 的桌面 GUI、会话管理、文件浏览和 Claude Code CLI 工作流，同时把模型显示、第三方 API、Skills 管理和翻译体验做了更适合本地使用的改造。

> 本项目基于 [TOKENICODE](https://github.com/yiliqi78/TOKENICODE) 修改而来。感谢原作者 TinyZ / yiliqi78 以及 TOKENICODE 项目的开源工作。本仓库保留原项目 Apache License 2.0 授权与 attribution，详见 [LICENSE](LICENSE) 和 [NOTICE](NOTICE)。

## 功能亮点

- **Provider 与模型显示**
  - 界面始终显示实际选择或映射后的模型名称，不再把 Claude 强制伪装成 DeepSeek
  - DeepSeek / CC Switch 仍可通过 Provider 预设和模型映射使用 `deepseek-v4-pro` / `deepseek-v4-flash`
  - 支持 Anthropic、OpenAI 兼容网关和自定义模型映射

- **独立 Provider 配置**
  - 支持 Anthropic 格式和 OpenAI 兼容格式
  - 支持自定义 Base URL、API Key、模型映射和代理
  - 适合接入 CC Switch、DeepSeek 兼容代理、第三方模型网关

- **Claude Skills 面板**
  - 默认只扫描全局和项目内的 `.claude/skills`
  - 可由用户手动添加其它 Claude 兼容技能目录
  - 支持 `/skill` 调用和一次组合多个 Skills
  - 可查看、编辑、启用/禁用、复制、定位 skill 文件

- **Skills 翻译**
  - 技能列表名称和简介可调用独立翻译 API 翻译为中文
  - `SKILL.md` 预览正文也可一键翻译
  - 翻译只影响预览，不会修改原始 skill 文件
  - 翻译结果本地缓存，减少重复 API 调用

- **内置网页预览**
  - localhost 和本地预览地址可直接在右侧 Preview 面板打开
  - 外部网站使用独立的应用内浏览窗口，避免 iframe 拒绝访问
  - 支持后退、前进、刷新、外部浏览器打开
  - 提供 Tauri 预览控制命令，方便后续接入 AI/MCP 工具调用

- **界面主题与字体优化**
  - 新增 VS Code Dark 黑暗界面，接近 VS Code 的深色工作区观感
  - 新增纯白简约风格，适合喜欢干净白底界面的用户
  - 支持界面字体切换，可选择微软雅黑、系统字体、思源黑体、霞鹜文楷和等宽字体
  - 默认让路径、模型名、小标签等原本等宽字体区域跟随界面字体，减少中英文/拼音混排时的割裂感

- **更顺手的新对话流程**
  - 记住上一次选择的项目文件夹，作为新对话的默认工作目录
  - 点击“新任务”不再强制回到欢迎页重新选择文件夹
  - 输入框底部新增文件夹选择按钮，可以像 Codex 一样在对话区快速切换项目目录

- **桌面工作流**
  - Tauri 2 + React 19 桌面应用
  - 内置文件浏览、Markdown/HTML/SVG/PDF/图片预览
  - CodeMirror 编辑器，支持多种语言语法高亮
  - 会话历史、归档、置顶、导出、AI 标题生成
  - 支持计划模式、权限模式、回退和文件恢复

## 相比原版 TOKENICODE 多了什么

这个仓库不是简单改名版，而是围绕 DeepSeek、CC Switch 和 Codex skills 工作流做了一组定向魔改：

| 方向 | 原版 TOKENICODE | DeepSeek Alpha 魔改版 |
| --- | --- | --- |
| 模型显示 | 主要沿用 Claude / Opus / Sonnet / Haiku 等命名 | 显示实际模型；DeepSeek 等第三方模型只在 Provider 映射后显示 |
| CC Switch 适配 | 需要用户自己理解 Claude 名称和代理映射关系 | 内置 DeepSeek V4 Pro / Flash 显示与请求映射，减少填错模型名的问题 |
| Provider 配置 | 更偏原始 Claude Code 使用方式 | 增加独立 Provider 管理，支持 Anthropic / OpenAI 兼容格式、Base URL、API Key、模型映射、代理 |
| Skills 面板 | 原版没有完整管理面板 | 默认管理 Claude Skills，支持自定义目录、斜杠调用和多 Skills 组合 |
| Skills 翻译 | 需要自己读英文 `SKILL.md` | 可以调用独立翻译 API 翻译技能列表和 `SKILL.md` 预览正文，且只改预览不改原文件 |
| Preview 工具 | 没有内置网页预览控制面板 | 本地页面在侧栏预览，外部网站在独立应用内浏览窗口打开 |
| 主题 | 以原有浅/深色和背景为主 | 新增 VS Code Dark、纯白简约等更偏工作流的界面风格 |
| 字体 | 字体跟随范围有限，部分小标签仍固定等宽 | 增加字体选择，并让小标签/路径/模型名等区域默认跟随界面字体 |
| 新对话目录 | 新建对话时容易回到重新选文件夹流程 | 记住上次项目目录，新任务直接进入默认文件夹，并可在输入框下方快速切换 |
| 发布包 | 需要自行构建或使用原项目发布 | Release 提供 Windows x64 exe / zip 和 SHA256 校验文件 |

## 下载

请到 GitHub Releases 下载对应系统的安装包：

- Windows x64 便携版：`tokenicode-deepseek-alpha-v1.0.8-windows-x64.exe`
- Windows x64 安装版：`tokenicode-deepseek-alpha-v1.0.8-windows-x64-setup.exe`

下载后双击运行即可。首次运行时请按需要配置 CC Switch / DeepSeek API。

## 快速开始

1. 下载 release 里的 Windows exe。
2. 打开 TOKENICODE。
3. 在设置里配置 API Provider，或在 Skills 面板里单独配置翻译 API。
4. 选择项目文件夹，开始对话。

### DeepSeek / CC Switch 模型建议

如果你的网关支持本项目当前的 DeepSeek V4 命名：

| 用途 | 显示名 | 实际 API model |
| --- | --- | --- |
| 高质量/复杂任务 | DeepseekV4Pro | `deepseek-v4-pro` |
| 快速/翻译/轻任务 | DeepseekV4Flash | `deepseek-v4-flash` |

如果你使用 DeepSeek 官方 OpenAI 兼容接口，请以官方实际支持的模型名为准，并在配置里选择 OpenAI 格式。

## Skills 翻译 API 配置

打开右侧 **技能** 面板，点击右上角齿轮按钮：

- `Anthropic` / `OpenAI`：选择接口格式
- `Base URL`：填写 API 地址，例如 CC Switch 或 DeepSeek 网关地址
- `API Key`：填写密钥
- `Model`：填写供应商实际支持的模型，例如 `claude-sonnet-4-6` 或 `deepseek-v4-flash`
- `Proxy URL`：可选，通常留空；仅需要代理时填写 `http://127.0.0.1:7890` 这类地址

配置后点击 `译` 即可翻译技能列表。打开 `SKILL.md` 预览时，也可以点击右上角 `译` 翻译正文。

## 本地开发

环境要求：

- Node.js
- pnpm
- Rust
- Tauri 2 构建环境
- Windows 打包需要 MSVC Build Tools

常用命令：

```powershell
pnpm install
pnpm build
pnpm tauri build
```

在本机使用 MSVC 环境构建的示例：

```powershell
cmd /c "call C:\BuildTools\VC\Auxiliary\Build\vcvars64.bat && set PATH=C:\Users\Administrator\.cargo\bin;%PATH% && cd /d D:\TOKENICODE\TOKENICODE-src && pnpm tauri build"
```

如果没有 Tauri 签名私钥，安装包签名阶段可能失败，但 `src-tauri\target\release\tokenicode.exe` 仍会生成。

## 与原 TOKENICODE 的关系

这是 TOKENICODE 的个人魔改版，主要目标是让本机 DeepSeek / CC Switch / Codex skills 工作流更顺手。核心桌面框架、Claude Code GUI 思路和大量基础功能来自原 TOKENICODE 项目。

本项目会在源码和文档中保留原项目许可声明。若你需要原版功能、跨平台安装包或官方更新，请优先参考原项目：

- 原项目仓库：[https://github.com/yiliqi78/TOKENICODE](https://github.com/yiliqi78/TOKENICODE)

## 许可证

本项目沿用原项目的 **Apache License 2.0**。

请阅读：

- [LICENSE](LICENSE)
- [NOTICE](NOTICE)

## 致谢

- [TOKENICODE](https://github.com/yiliqi78/TOKENICODE)：本项目的基础来源
- TinyZ / yiliqi78：TOKENICODE 原作者
- [Tauri](https://tauri.app)：桌面应用框架
- [React](https://react.dev)：前端 UI 框架
- Claude Code / Codex skills 生态：提供 agent 工作流基础
