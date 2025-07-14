#!/bin/bash

# 修复 PM2 配置脚本
# 解决 "Interpreter bun is NOT AVAILABLE in PATH" 错误

set -e

# 配置变量
APP_DIR="/var/www/stock-info-collector"

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

# 显示帮助信息
show_help() {
  echo "🔧 修复 PM2 配置脚本"
  echo "=================="
  echo ""
  echo "使用方法: $0 [选项]"
  echo ""
  echo "选项:"
  echo "  --help, -h        显示帮助信息"
  echo "  --app-dir <path>  指定应用目录 (默认: $APP_DIR)"
  echo ""
  echo "此脚本将修复 PM2 配置中的 bun 解释器问题"
  echo ""
}

# 修复 PM2 配置
fix_pm2_config() {
  log "开始修复 PM2 配置..."

  # 检查应用目录是否存在
  if [[ ! -d "$APP_DIR" ]]; then
    error "应用目录不存在: $APP_DIR"
  fi

  # 停止现有服务
  log "停止现有 PM2 服务..."
  pm2 stop stock-info-collector-api 2>/dev/null || true
  pm2 delete stock-info-collector-api 2>/dev/null || true

  # 进入应用目录
  cd "$APP_DIR"

  # 检查后端目录
  if [[ ! -d "backend" ]]; then
    error "后端目录不存在: $APP_DIR/backend"
  fi

  # 构建后端项目
  log "构建后端项目..."
  cd backend
  npm install --production
  npm run build
  cd ..

  # 检查构建是否成功
  if [[ ! -f "backend/dist/index.js" ]]; then
    error "后端构建失败，dist/index.js 文件不存在"
  fi

  # 创建新的 PM2 配置
  log "创建新的 PM2 配置..."
  cat >ecosystem.config.js <<EOF
module.exports = {
  apps: [{
    name: 'stock-info-collector-api',
    script: './backend/dist/index.js',
    cwd: '$APP_DIR/backend',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pm2/stock-api-error.log',
    out_file: '/var/log/pm2/stock-api-out.log',
    log_file: '/var/log/pm2/stock-api-combined.log',
    time: true
  }]
};
EOF

  # 创建日志目录
  sudo mkdir -p /var/log/pm2
  sudo chown $USER:$USER /var/log/pm2

  # 启动应用
  log "启动 PM2 应用..."
  pm2 start ecosystem.config.js
  pm2 save
  pm2 startup

  # 检查应用状态
  if pm2 show stock-info-collector-api | grep -q "online"; then
    log "✅ PM2 应用启动成功"
  else
    error "❌ PM2 应用启动失败"
  fi

  log "PM2 配置修复完成！"
}

# 主函数
main() {
  echo "🔧 修复 PM2 配置脚本"
  echo "=================="

  # 检查是否为 root 用户
  if [[ $EUID -eq 0 ]]; then
    error "请不要使用 root 用户运行此脚本"
  fi

  # 解析命令行参数
  while [[ $# -gt 0 ]]; do
    case $1 in
    --help | -h)
      show_help
      exit 0
      ;;
    --app-dir)
      if [[ -z "$2" ]]; then
        error "请指定应用目录路径"
      fi
      APP_DIR="$2"
      shift 2
      ;;
    -*)
      error "未知选项: $1"
      ;;
    *)
      error "未知参数: $1"
      ;;
    esac
  done

  # 执行修复
  fix_pm2_config

  echo ""
  echo "🎉 修复完成！"
  echo ""
  echo "📋 修复信息:"
  echo "  应用目录: $APP_DIR"
  echo "  配置文件: $APP_DIR/ecosystem.config.js"
  echo ""
  echo "🔧 管理命令:"
  echo "  查看状态: pm2 status"
  echo "  查看日志: pm2 logs stock-info-collector-api"
  echo "  重启应用: pm2 restart stock-info-collector-api"
  echo ""
}

# 运行主函数
main "$@"
