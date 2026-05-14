#!/usr/bin/env bash
# 一键清除项目内 MongoDB 便携版安装(无系统残留)
# 用法: bash uninstall-mongodb.sh

set -e
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORTABLE_DIR="$PROJECT_DIR/.mongodb-portable"
DATA_DIR="$PROJECT_DIR/.mongodb-data"
PID_FILE="$PORTABLE_DIR/mongod.pid"

echo "==> 清理 PetDerma 便携版 MongoDB"
echo "    项目目录: $PROJECT_DIR"

# 1. 停止正在运行的 mongod 进程
if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  if ps -p "$PID" > /dev/null 2>&1; then
    echo "==> 关闭 mongod 进程 (PID: $PID)"
    kill "$PID" || true
    sleep 2
    if ps -p "$PID" > /dev/null 2>&1; then
      kill -9 "$PID" || true
    fi
  fi
fi

# 兜底:杀掉所有指向本目录的 mongod
pkill -f "$PORTABLE_DIR/bin/mongod" 2>/dev/null || true

# 2. 删除 MongoDB 二进制目录
if [ -d "$PORTABLE_DIR" ]; then
  echo "==> 删除二进制目录: $PORTABLE_DIR"
  rm -rf "$PORTABLE_DIR"
fi

# 3. 删除数据目录
if [ -d "$DATA_DIR" ]; then
  echo "==> 删除数据目录: $DATA_DIR"
  rm -rf "$DATA_DIR"
fi

echo ""
echo "✅ 清除完成。系统中再无 MongoDB 残留。"
echo "   如果不再需要整个项目,直接 rm -rf $PROJECT_DIR 即可。"
