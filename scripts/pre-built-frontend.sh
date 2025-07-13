#!/bin/bash

# 股票信息收集器 - 预构建前端文件
# 在本地构建后上传到服务器

set -e

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
  echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}"
}

error() {
  echo -e "${RED}[$(date +'%H:%M:%S')] ERROR: $1${NC}"
  exit 1
}

warn() {
  echo -e "${YELLOW}[$(date +'%H:%M:%S')] WARNING: $1${NC}"
}

info() {
  echo -e "${BLUE}[$(date +'%H:%M:%S')] INFO: $1${NC}"
}

# 本地构建
local_build() {
  log "在本地构建前端..."

  # 检查是否在正确的目录
  if [[ ! -f "frontend/package.json" ]]; then
    error "请在项目根目录运行此脚本"
  fi

  # 进入前端目录
  cd frontend

  # 安装依赖
  log "安装依赖..."
  npm install

  # 构建
  log "构建前端..."
  npm run build

  # 检查构建结果
  if [[ ! -d "dist" ]]; then
    error "构建失败：dist 目录不存在"
  fi

  # 创建压缩包
  log "创建压缩包..."
  tar -czf ../frontend-dist.tar.gz dist/

  cd ..

  info "本地构建完成: frontend-dist.tar.gz"
}

# 上传到服务器
upload_to_server() {
  log "上传到服务器..."

  if [[ -z "$1" ]]; then
    error "请提供服务器信息"
    echo "使用方法: $0 upload <server_user>@<server_ip>"
    exit 1
  fi

  SERVER_INFO=$1

  # 上传压缩包
  log "上传前端文件..."
  scp frontend-dist.tar.gz $SERVER_INFO:/tmp/

  # 在服务器上解压
  log "在服务器上解压..."
  ssh $SERVER_INFO <<'EOF'
        cd /var/www/stock-info-collector/frontend
        rm -rf dist
        tar -xzf /tmp/frontend-dist.tar.gz
        rm /tmp/frontend-dist.tar.gz
        chown -R www-data:www-data dist/
        echo "前端文件部署完成"
EOF

  info "前端文件上传完成"
}

# 显示帮助
show_help() {
  echo "股票信息收集器 - 预构建前端文件"
  echo ""
  echo "使用方法:"
  echo "  $0 build                    # 在本地构建前端"
  echo "  $0 upload user@server       # 上传到服务器"
  echo "  $0 deploy user@server       # 构建并上传"
  echo ""
  echo "示例:"
  echo "  $0 deploy ubuntu@192.168.1.100"
  echo ""
}

# 主函数
main() {
  case "${1:-}" in
  "build")
    local_build
    ;;
  "upload")
    upload_to_server "$2"
    ;;
  "deploy")
    local_build
    upload_to_server "$2"
    ;;
  "--help" | "-h" | "")
    show_help
    ;;
  *)
    error "未知命令: $1"
    show_help
    exit 1
    ;;
  esac
}

# 运行主函数
main "$@"
