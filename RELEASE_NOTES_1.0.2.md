## TOKENICODE DeepSeek Alpha v1.0.2

本版本重点修复长对话的上下文显示，并增强数学内容与窄面板操作体验。

### 主要更新

- 修复 200K / 1M 上下文占用计算，正确计入缓存 Token，工具调用过程中不再乱跳或错误归零。
- 打开历史对话时恢复真实上下文占用和模型信息。
- 聊天消息与 Markdown 预览支持 KaTeX 数学公式，包括行内公式、块级公式、分式、积分、上下标和矩阵。
- 右侧功能标签支持横向滑条，窄面板仍可访问全部功能。
- 移除输入框上方重复的“最新”按钮，保留右侧时间轴入口。

### 支持的公式分隔符

- 行内：`$...$`、`\(...\)`
- 块级：`$$...$$`、`\[...\]`

### 验证

- 6 个前端单元测试通过。
- TypeScript 与 Vite 生产构建通过。
- Windows Tauri Release 构建通过，并完成本地启动验证。

### 下载

- `tokenicode-deepseek-alpha-v1.0.2-windows-x64.exe`：Windows x64 便携版。
- `tokenicode-deepseek-alpha-v1.0.2-windows-x64-setup.exe`：Windows x64 NSIS 安装版。
- 同名 `.sha256.txt` 文件可用于校验下载完整性。

### SHA256

- 便携版：`aeee6e6cac5c1465233f4c50606b1ae605ad9c599a3c33a51c77b842178c144c`
- 安装版：`13309386b7bf6b4a4aaaa2c0207de5d30a0a4a5deed5d4cb1f2de68a838bea34`
