@echo off
echo 正在启动PetDerma后端服务器...
echo.

REM 检查Node.js是否安装
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误: 未找到Node.js，请先安装Node.js
    pause
    exit /b 1
)

REM 检查MongoDB是否运行
tasklist | findstr mongod >nul 2>&1
if %errorlevel% neq 0 (
    echo 警告: MongoDB未运行，请先启动MongoDB服务
    echo 可以运行: net start MongoDB
    pause
)

REM 进入后端目录
cd /d "%~dp0"

REM 检查依赖是否安装
if not exist "node_modules" (
    echo 正在安装依赖...
    npm install
    if %errorlevel% neq 0 (
        echo 错误: 依赖安装失败
        pause
        exit /b 1
    )
)

REM 启动服务器
echo 启动服务器...
node server.js

pause
