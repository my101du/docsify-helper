# Docsify Helper

一个用于自动化 Docsify 文档项目的工具，支持自动生成侧边栏和多种部署方式。使用 Electron + Node.js 开发，界面友好，易于使用。

## 功能特性

- 🔍 **自动扫描** - 扫描指定目录下的 Markdown 文件
- 📋 **智能生成** - 根据目录结构自动生成 `_sidebar.md` 文件
- 🎨 **图形界面** - 现代化的 Electron GUI 界面
- 💻 **命令行支持** - 支持命令行模式进行快速操作
- 🚀 **多种部署** - 支持 Git 和 Cloudflare Pages 部署
- ⚙️ **灵活配置** - 通过 YAML 配置文件自定义行为
- 📦 **跨平台** - 支持 Windows、macOS、Linux

## 系统要求

- Node.js 16.0 或更高版本
- npm 包管理器
一个用于自动化 Docsify 文档项目的工具，支持自动生成侧边栏和多种部署方式。

## 功能特性

- 🔍 **自动扫描** - 扫描指定目录下的 Markdown 文件
- 📋 **智能生成** - 根据目录结构自动生成 `_sidebar.md` 文件
- 🎨 **图形界面** - 简洁易用的 GUI 界面
- 💻 **命令行支持** - 支持命令行模式进行快速操作
- 🚀 **多种部署** - 支持 Git 和 Cloudflare Pages 部署
- ⚙️ **灵活配置** - 通过 YAML 配置文件自定义行为
- 📦 **单文件执行** - 生成单个可执行文件，无需依赖

## 系统要求

- Windows 操作系统
- Node.js 16.0 或更高版本

## 安装与使用

### 从源码构建

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd docsify-helper
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **开发模式运行**
   ```bash
   # GUI 模式
   npm start
   
   # 开发模式（显示开发者工具）
   npm run dev
   
   # 命令行模式
   node src/cli.js --help
   ```

4. **构建可执行文件**
   ```bash
   # Windows
   build.bat
   
   # 或使用 npm
   npm run build-win
   ```

### 直接下载

从 [Releases](releases) 页面下载最新的可执行文件。

## 使用方法

### GUI 模式

直接运行 `Docsify Helper.exe` 即可启动图形界面：

1. **配置路径** - 设置文档目录和输出目录
2. **选择部署方式** - Git 或 Cloudflare Pages
3. **生成侧边栏** - 点击 "生成 _sidebar.md" 按钮
4. **检查环境** - 验证部署环境是否就绪
5. **执行部署** - 一键部署到指定平台

### 命令行模式

```bash
# 显示帮助
node src/cli.js --help

# 初始化配置文件
node src/cli.js config --init

# 显示当前配置
node src/cli.js config --show

# 仅生成侧边栏
node src/cli.js generate

# 检查部署环境
node src/cli.js check

# 生成并部署
node src/cli.js deploy

# 使用自定义配置文件
node src/cli.js generate -c custom-config.yaml

# 指定目录
node src/cli.js generate -d ./docs -o ./dist
```

### 配置文件

程序会自动创建 `config.yaml` 配置文件，你可以根据需要修改：

```yaml
# 文档目录
docsDir: "./docs"

# 输出目录
outputDir: "./docs"

# 侧边栏配置
sidebar:
  exclude:
    - "_sidebar.md"
    - "README.md"
    - ".DS_Store"
    - "Thumbs.db"
    - ".git"
    - "node_modules"
  showFolders: true
  recursive: true
  sortBy: "name"  # name, date, size

# 部署配置
deployment:
  type: "git"  # git, cloudflare
  
  git:
    executablePath: ""  # 留空使用系统 PATH
    remoteUrl: ""
    branch: "main"
    commitMessage: "docs: 更新文档 {{date}}"
  
  cloudflare:
    wranglerPath: ""    # 留空使用系统 PATH
    projectName: ""
    accountId: ""
```

## 部署配置

### Git 部署

1. **检查 Git 安装**
   ```bash
   git --version
   ```

2. **配置 Git 仓库**
   ```bash
   cd your-docs-directory
   git init
   git remote add origin <your-repo-url>
   ```

3. **在配置文件中设置**
   ```yaml
   deployment:
     type: "git"
     git:
       remoteUrl: "https://github.com/username/repo.git"
       branch: "main"
   ```

### Cloudflare Pages 部署

1. **安装 Wrangler CLI**
   ```bash
   npm install -g wrangler
   ```

2. **登录 Cloudflare**
   ```bash
   wrangler login
   ```

3. **在配置文件中设置**
   ```yaml
   deployment:
     type: "cloudflare"
     cloudflare:
       projectName: "my-docs"
   ```

## 开发

### 项目结构

```
docsify-helper/
├── package.json              # 项目配置
├── config.yaml              # 默认配置文件
├── build.bat                # Windows 构建脚本
├── src/
│   ├── main.js              # Electron 主进程
│   ├── config.js            # 配置管理
│   ├── generator.js         # 侧边栏生成器
│   ├── deployment.js        # 部署管理
│   ├── cli.js               # 命令行接口
│   └── renderer/            # 渲染进程
│       ├── index.html       # GUI 界面
│       ├── styles.css       # 样式文件
│       └── renderer.js      # 前端逻辑
├── assets/                  # 资源文件
├── example-docs/            # 示例文档
└── README.md
```

### 添加新功能

1. **扩展配置** - 在 `src/config.js` 中添加新的配置选项
2. **实现功能** - 在相应的模块中实现功能逻辑
3. **更新界面** - 在 `src/renderer/` 中更新 GUI 界面
4. **命令行支持** - 在 `src/cli.js` 中添加命令行命令

### 开发脚本

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 启动应用
npm start

# 构建 Windows 版本
npm run build-win

# 测试 CLI
npm test
```

## 技术栈

- **前端**: HTML, CSS, JavaScript
- **后端**: Node.js, Electron
- **配置**: YAML
- **打包**: electron-builder
- **CLI**: Commander.js

## 许可证

本项目采用 MIT 许可证，详见 [LICENSE](LICENSE) 文件。

## 贡献

欢迎提交 Issue 和 Pull Request！

## 更新日志

### v1.0.0
- 初始版本
- 支持自动生成 _sidebar.md
- 支持 Git 和 Cloudflare Pages 部署
- 提供 GUI 和 CLI 两种界面
- 基于 Electron + Node.js 技术栈
