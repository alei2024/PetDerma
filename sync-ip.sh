#!/usr/bin/env bash
# 把当前 Mac 的局域网 IP 同步到前端配置文件
# 用法: bash sync-ip.sh
# 适用场景: 换了 WiFi 后小程序连不上后端

set -e
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_JS="$PROJECT_DIR/Front_Page/app.js"
ENV_JS="$PROJECT_DIR/Front_Page/config/environment.js"

# 取第一个非回环 IPv4 地址(en0/en1)
IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || \
     ifconfig | grep "inet " | grep -v 127.0.0.1 | grep -v 198.18 | head -1 | awk '{print $2}')

if [ -z "$IP" ]; then
  echo "❌ 没找到本机局域网 IP"
  exit 1
fi

echo "==> 当前 IP: $IP"

# 在 app.js / environment.js 里替换所有 192.168.x.x / 10.x.x.x 私网 IP
PATTERN='(192\.168\.[0-9]+\.[0-9]+|10\.[0-9]+\.[0-9]+\.[0-9]+|172\.(1[6-9]|2[0-9]|3[01])\.[0-9]+\.[0-9]+)'

if [ -f "$APP_JS" ]; then
  sed -E -i '' "s|http://${PATTERN}:3000|http://${IP}:3000|g" "$APP_JS"
  echo "✅ 更新 $APP_JS"
fi
if [ -f "$ENV_JS" ]; then
  sed -E -i '' "s|http://${PATTERN}:3000|http://${IP}:3000|g; s|ws://${PATTERN}:3000|ws://${IP}:3000|g" "$ENV_JS"
  echo "✅ 更新 $ENV_JS"
fi

echo ""
echo "下一步:在微信开发者工具点「编译」(Cmd+B)即可生效"
