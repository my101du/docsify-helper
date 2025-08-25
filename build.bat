@echo off
setlocal

echo ===========================================
echo     Docsify Helper - 构建脚本
echo ===========================================

REM 检查 Node.js 是否安装
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ❌ 未找到 Node.js，请先安装 Node.js
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

REM 检查 npm 是否安装
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ❌ 未找到 npm，请确保 Node.js 正确安装
    pause
    exit /b 1
)

echo ✅ Node.js 环境检查通过

REM 安装依赖
echo.
echo 📦 正在安装依赖...
call npm install
if %ERRORLEVEL% neq 0 (
    echo ❌ 依赖安装失败
    pause
    exit /b 1
)

echo ✅ 依赖安装完成

REM 构建应用
echo.
echo 🔨 正在构建应用...
call npm run build-win
if %ERRORLEVEL% neq 0 (
    echo ❌ 构建失败
    pause
    exit /b 1
)

echo.
echo ✅ 构建成功！
echo 📁 可执行文件位置: dist/
echo.
echo 使用方法:
echo   GUI 模式: 运行生成的 exe 文件
echo   CLI 模式: node src/cli.js --help

pause
