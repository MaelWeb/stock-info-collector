#!/bin/bash

# 股票信息收集器 - 清理部署脚本
# 用于清理现有部署并重新开始

set -e

# 配置变量
APP_DIR="/var/www/stock-info-collector"
BACKUP_DIR="/var/backups/stock-info-collector"

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

# 确认操作
confirm_action() {
  echo ""
  echo "⚠️  警告：此操作将清理现有部署！"
  echo ""
  echo "将执行以下操作："
  echo "  1. 停止所有相关服务"
  echo "  2. 备份现有数据"
  echo "  3. 清理应用目录"
  echo "  4. 重新部署应用"
  echo ""
  read -p "确认继续吗？(y/N): " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "操作已取消"
    exit 0
  fi
}

# 停止服务
stop_services() {
  log "停止服务..."

  # 停止 PM2 进程
  if command -v pm2 &>/dev/null; then
    pm2 stop stock-info-collector-api 2>/dev/null || true
    pm2 delete stock-info-collector-api 2>/dev/null || true
  fi

  # 停止 Docker 服务
  if command -v docker-compose &>/dev/null && [[ -f "docker-compose.yml" ]]; then
    docker-compose down 2>/dev/null || true
  fi

  # 停止 Nginx
  sudo systemctl stop nginx 2>/dev/null || true

  log "服务已停止"
}

# 备份数据
backup_data() {
  log "备份现有数据..."

  DATE=$(date +%Y%m%d_%H%M%S)
  BACKUP_PATH="$BACKUP_DIR/clean_deploy_backup_$DATE"

  mkdir -p $BACKUP_PATH

  # 备份应用目录
  if [[ -d "$APP_DIR" ]]; then
    log "备份应用目录..."
    sudo cp -r $APP_DIR $BACKUP_PATH/app_backup 2>/dev/null || true
  fi

  # 备份数据库
  if [[ -f "$APP_DIR/backend/prisma/dev.db" ]]; then
    log "备份数据库..."
    sudo cp $APP_DIR/backend/prisma/dev.db $BACKUP_PATH/database.db 2>/dev/null || true
  fi

  # 备份配置文件
  if [[ -f "$APP_DIR/.env" ]]; then
    log "备份环境变量..."
    sudo cp $APP_DIR/.env $BACKUP_PATH/env_backup 2>/dev/null || true
  fi

  # 备份 Nginx 配置
  if [[ -f "/etc/nginx/sites-available/stock-info-collector" ]]; then
    log "备份 Nginx 配置..."
    sudo cp /etc/nginx/sites-available/stock-info-collector $BACKUP_PATH/nginx_backup 2>/dev/null || true
  fi

  info "数据已备份到: $BACKUP_PATH"
}

# 清理目录
clean_directories() {
  log "清理目录..."

  # 清理应用目录
  if [[ -d "$APP_DIR" ]]; then
    log "清理应用目录..."
    sudo rm -rf $APP_DIR/*
    sudo rm -rf $APP_DIR/.* 2>/dev/null || true
  fi

  # 清理 Nginx 配置
  if [[ -f "/etc/nginx/sites-available/stock-info-collector" ]]; then
    log "清理 Nginx 配置..."
    sudo rm -f /etc/nginx/sites-available/stock-info-collector
    sudo rm -f /etc/nginx/sites-enabled/stock-info-collector
  fi

  # 清理 PM2 日志
  if [[ -d "/var/log/pm2" ]]; then
    log "清理 PM2 日志..."
    sudo rm -f /var/log/pm2/stock-api-*.log
  fi

  # 清理 Docker 数据 (如果使用 Docker)
  if command -v docker &>/dev/null; then
    log "清理 Docker 数据..."
    docker system prune -f 2>/dev/null || true
  fi

  log "目录清理完成"
}

# 重新创建目录
recreate_directories() {
  log "重新创建目录..."

  sudo mkdir -p $APP_DIR
  sudo chown $USER:$USER $APP_DIR

  sudo mkdir -p $BACKUP_DIR
  sudo chown $USER:$USER $BACKUP_DIR

  sudo mkdir -p /var/log/pm2
  sudo chown $USER:$USER /var/log/pm2

  log "目录创建完成"
}

# 重新部署
redeploy() {
  log "开始重新部署..."

  # 根据当前目录选择部署方式
  if [[ -f "docker-compose.yml" ]]; then
    info "检测到 Docker 配置，使用 Docker 部署..."
    ./scripts/docker-deploy.sh deploy
  else
    info "使用传统部署方式..."
    ./scripts/quick-deploy.sh
  fi

  log "重新部署完成"
}

# 显示恢复信息
show_recovery_info() {
  echo ""
  echo "🔄 清理部署完成！"
  echo ""
  echo "📋 备份信息:"
  echo "  备份位置: $BACKUP_DIR"
  echo "  最新备份: $(ls -t $BACKUP_DIR/clean_deploy_backup_* | head -1)"
  echo ""
  echo "🔧 恢复数据 (如需要):"
  echo "  恢复数据库: sudo cp $BACKUP_DIR/clean_deploy_backup_*/database.db $APP_DIR/backend/prisma/dev.db"
  echo "  恢复配置: sudo cp $BACKUP_DIR/clean_deploy_backup_*/env_backup $APP_DIR/.env"
  echo ""
  echo "📝 下一步:"
  echo "  1. 检查应用状态"
  echo "  2. 配置域名和SSL"
  echo "  3. 创建管理员账户"
  echo ""
}

# 主函数
main() {
  echo "🧹 股票信息收集器 - 清理部署"
  echo "================================"

  # 检查是否为 root 用户
  if [[ $EUID -eq 0 ]]; then
    error "请不要使用 root 用户运行此脚本"
  fi

  # 确认操作
  confirm_action

  # 执行清理步骤
  stop_services
  backup_data
  clean_directories
  recreate_directories
  redeploy
  show_recovery_info
}

# 运行主函数
main "$@"
