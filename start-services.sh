#!/usr/bin/env bash
# 启动 PetDerma 本地服务: MongoDB(便携版) + Node 后端
# 用法: bash start-services.sh

set -e
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORTABLE_DIR="$PROJECT_DIR/.mongodb-portable"
DATA_DIR="$PROJECT_DIR/.mongodb-data"
LOG_DIR="$PORTABLE_DIR/log"
PID_FILE="$PORTABLE_DIR/mongod.pid"
BACKEND_DIR="$PROJECT_DIR/Community_backend"

mkdir -p "$DATA_DIR" "$LOG_DIR"

echo "==> 启动 MongoDB (便携版,数据存于 $DATA_DIR)"

# 检查是否已在运行
if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  if ps -p "$PID" > /dev/null 2>&1; then
    echo "    MongoDB 已在运行 (PID: $PID),跳过启动"
  else
    rm "$PID_FILE"
  fi
fi

if [ ! -f "$PID_FILE" ]; then
  "$PORTABLE_DIR/current/bin/mongod" \
    --dbpath "$DATA_DIR" \
    --logpath "$LOG_DIR/mongod.log" \
    --bind_ip 127.0.0.1 \
    --port 27017 \
    --pidfilepath "$PID_FILE" \
    --fork
  echo "    ✅ MongoDB 已启动 (端口 27017)"
fi

echo ""
echo "==> 启动 Node 后端服务"
cd "$BACKEND_DIR"
echo "    日志: tail -f $BACKEND_DIR/backend.log"
echo "    停止: 按 Ctrl+C 或运行 bash stop-services.sh"
echo ""
echo "----------------------------------------"
npm run dev
