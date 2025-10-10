@echo off
echo 🚀 PetDerma 项目初始化脚本

REM 检查Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 请先安装 Node.js (>= 14.0.0)
    pause
    exit /b 1
)

echo ✅ 环境检查通过

REM 安装后端依赖
echo 📦 安装后端依赖...
cd Community_backend
call npm install

REM 复制环境变量文件
if not exist .env (
    copy .env.example .env
    echo ⚠️  请编辑 Community_backend\.env 文件配置数据库连接
)

REM 安装前端依赖
echo 📦 安装前端依赖...
cd ..\Front_Page
call npm install

echo ✅ 安装完成！
echo 📝 下一步：
echo 1. 编辑 Community_backend\.env 配置文件
echo 2. 编辑 Front_Page\config\environment.js 配置文件
echo 3. 启动MongoDB服务
echo 4. 运行 'cd Community_backend && npm run dev' 启动后端
echo 5. 使用微信开发者工具打开 Front_Page 目录
pause
