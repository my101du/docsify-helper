#!/bin/bash

echo "正在构建 Docsify Helper..."

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js"
    echo "下载地址: https://nodejs.org/"
    exit 1
fi

# 检查 npm 是否安装
if ! command -v npm &> /dev/null; then
    echo "❌ npm 不可用"
    exit 1
fi

echo "✅ Node.js 环境检查通过"

# 安装依赖
echo "📦 正在安装依赖..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败！"
    exit 1
fi

echo "✅ 依赖安装完成"

# 构建应用
echo "🔨 正在构建应用..."
npm run build-win

if [ $? -eq 0 ]; then
    echo "✅ 构建成功！"
    echo "📁 安装包位置: dist/"
    echo ""
    echo "使用方法:"
    echo "  开发模式: npm start"
    echo "  CLI 模式: node src/cli.js --help"
    echo "  安装应用: 运行 dist/ 目录中的安装程序"
else
    echo "❌ 构建失败！"
    exit 1
fi
