#!/usr/bin/env bash
# 停止本地 MongoDB 与 Node 后端
set -e
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$PROJECT_DIR/.mongodb-portable/mongod.pid"

if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  if ps -p "$PID" > /dev/null 2>&1; then
    echo "==> 关闭 MongoDB (PID: $PID)"
    kill "$PID"
    sleep 1
  fi
  rm -f "$PID_FILE"
fi

# 关闭 Node 后端(监听 3000 端口的进程)
PIDS=$(lsof -ti:3000 2>/dev/null || true)
if [ -n "$PIDS" ]; then
  echo "==> 关闭 Node 后端 (端口 3000, PID: $PIDS)"
  echo "$PIDS" | xargs kill 2>/dev/null || true
fi

echo "✅ 服务已停止"
