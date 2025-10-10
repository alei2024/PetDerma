#!/bin/bash

echo "🚀 PetDerma 项目初始化脚本"

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 请先安装 Node.js (>= 14.0.0)"
    exit 1
fi

# 检查MongoDB
if ! command -v mongod &> /dev/null; then
    echo "❌ 请先安装 MongoDB"
    exit 1
fi

echo "✅ 环境检查通过"

# 安装后端依赖
echo "📦 安装后端依赖..."
cd Community_backend
npm install

# 复制环境变量文件
if [ ! -f .env ]; then
    cp .env.example .env
    echo "⚠️  请编辑 Community_backend/.env 文件配置数据库连接"
fi

# 安装前端依赖
echo "📦 安装前端依赖..."
cd ../Front_Page
npm install

echo "✅ 安装完成！"
echo "📝 下一步："
echo "1. 编辑 Community_backend/.env 配置文件"
echo "2. 编辑 Front_Page/config/environment.js 配置文件"
echo "3. 启动MongoDB服务"
echo "4. 运行 'cd Community_backend && npm run dev' 启动后端"
echo "5. 使用微信开发者工具打开 Front_Page 目录"
