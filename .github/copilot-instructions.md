<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Docsify Helper 项目说明

这是一个用 Node.js + Electron 开发的 Docsify 文档自动化工具项目。

## 项目特点

- **语言**: Node.js / JavaScript
- **GUI 框架**: Electron
- **配置格式**: YAML
- **目标平台**: Windows, macOS, Linux
- **架构**: 模块化设计

## 代码规范

- 使用 ES6+ 语法
- 模块使用 CommonJS 格式
- 函数名使用 camelCase
- 常量使用 UPPER_CASE
- 错误处理要完整和一致
- 注释要清晰说明功能用途

## 模块结构

- `src/config.js` - 配置管理，处理 YAML 配置文件
- `src/generator.js` - 核心功能，生成 _sidebar.md 文件
- `src/deployment.js` - 部署管理，支持 Git 和 Cloudflare
- `src/main.js` - Electron 主进程
- `src/cli.js` - 命令行接口
- `src/renderer/` - 渲染进程（GUI 界面）

## 开发建议

- 新功能先在对应的模块中实现
- GUI 组件保持简洁和直观
- 错误信息要对用户友好
- 支持配置文件热加载
- 保持单一职责原则
