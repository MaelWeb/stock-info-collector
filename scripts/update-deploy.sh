#!/bin/bash

# 股票信息收集器 - 更新部署脚本
# 用于更新现有部署，保护配置文件

set -e

# 配置变量
APP_NAME="stock-info-collector"
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

# 检查应用是否已部署
check_existing_deployment() {
  if [[ ! -d "$APP_DIR" ]]; then
    error "应用目录不存在，请先运行完整部署脚本"
  fi

  if [[ ! -f "$APP_DIR/.env" ]]; then
    error "环境配置文件不存在，请先运行完整部署脚本"
  fi

  log "检测到现有部署，开始更新..."
}

# 备份现有部署
backup_existing_deployment() {
  log "备份现有部署..."

  BACKUP_DIR="${APP_DIR}.backup.$(date +%Y%m%d_%H%M%S)"
  sudo cp -r $APP_DIR $BACKUP_DIR

  log "备份完成: $BACKUP_DIR"
}

# 保护配置文件
protect_config_files() {
  log "保护配置文件..."

  # 备份关键配置文件
  CONFIG_BACKUP_DIR="/tmp/stock-config-backup-$(date +%Y%m%d_%H%M%S)"
  mkdir -p $CONFIG_BACKUP_DIR

  # 备份环境变量文件
  if [[ -f "$APP_DIR/.env" ]]; then
    cp $APP_DIR/.env $CONFIG_BACKUP_DIR/
  fi

  # 备份数据库
  if [[ -f "$APP_DIR/backend/prisma/dev.db" ]]; then
    cp $APP_DIR/backend/prisma/dev.db $CONFIG_BACKUP_DIR/
  fi

  # 备份 Nginx 配置
  if [[ -f "/etc/nginx/sites-available/$APP_NAME" ]]; then
    sudo cp /etc/nginx/sites-available/$APP_NAME $CONFIG_BACKUP_DIR/
  fi

  log "配置文件备份完成: $CONFIG_BACKUP_DIR"
  echo $CONFIG_BACKUP_DIR
}

# 恢复配置文件
restore_config_files() {
  local backup_dir=$1

  log "恢复配置文件..."

  # 恢复环境变量文件
  if [[ -f "$backup_dir/.env" ]]; then
    cp $backup_dir/.env $APP_DIR/
    log "已恢复 .env 文件"
  fi

  # 恢复数据库
  if [[ -f "$backup_dir/dev.db" ]]; then
    cp $backup_dir/dev.db $APP_DIR/backend/prisma/
    log "已恢复数据库文件"
  fi

  # 恢复 Nginx 配置
  if [[ -f "$backup_dir/$APP_NAME" ]]; then
    sudo cp $backup_dir/$APP_NAME /etc/nginx/sites-available/
    log "已恢复 Nginx 配置"
  fi

  # 清理临时备份
  rm -rf $backup_dir
}

# 更新代码
update_code() {
  log "更新代码..."

  cd $APP_DIR

  # 检查是否为 git 仓库
  if [[ ! -d ".git" ]]; then
    error "应用目录不是 git 仓库，无法更新代码"
  fi

  # 拉取最新代码
  git fetch origin
  git reset --hard origin/main

  log "代码更新完成"
}

# 更新后端
update_backend() {
  log "更新后端..."

  cd $APP_DIR/backend

  # 安装依赖
  npm install

  # 生成 Prisma 客户端
  npx prisma generate

  # 执行数据库迁移（不重新创建数据库）
  log "执行数据库迁移..."
  npx prisma db push

  log "后端更新完成"
}

# 更新前端
update_frontend() {
  log "更新前端..."

  cd $APP_DIR/frontend

  # 安装依赖
  npm install

  # 检查内存并选择构建方式
  TOTAL_MEM=$(free -m | awk 'NR==2{printf "%.0f", $2}')
  if [[ $TOTAL_MEM -lt 512 ]]; then
    log "检测到极低内存环境，使用紧急构建..."
    cd ..
    ./scripts/emergency-build.sh
    cd frontend
  elif [[ $TOTAL_MEM -lt 1024 ]]; then
    log "检测到低内存环境，使用低内存构建..."
    npm run build:low-memory
  else
    log "使用标准构建..."
    export NODE_OPTIONS="--max-old-space-size=2048"
    npm run build
  fi

  log "前端更新完成"
}

# 重启服务
restart_services() {
  log "重启服务..."

  # 重启 PM2 应用
  pm2 restart stock-info-collector-api

  # 重启 Nginx
  sudo systemctl restart nginx

  log "服务重启完成"
}

# 验证部署
verify_deployment() {
  log "验证部署..."

  # 检查 PM2 状态
  if pm2 list | grep -q "stock-info-collector-api.*online"; then
    log "✅ PM2 应用运行正常"
  else
    warn "⚠️  PM2 应用可能有问题，请检查日志"
  fi

  # 检查 Nginx 状态
  if sudo systemctl is-active --quiet nginx; then
    log "✅ Nginx 运行正常"
  else
    warn "⚠️  Nginx 可能有问题"
  fi

  # 检查端口监听
  if netstat -tlnp | grep -q ":3000"; then
    log "✅ API 服务监听正常"
  else
    warn "⚠️  API 服务可能有问题"
  fi

  log "部署验证完成"
}

# 显示更新信息
show_update_info() {
  echo ""
  echo "🎉 更新完成！"
  echo ""
  echo "📋 更新信息:"
  echo "  应用目录: $APP_DIR"
  echo "  备份目录: ${APP_DIR}.backup.$(date +%Y%m%d_%H%M%S)"
  echo ""
  echo "🔧 管理命令:"
  echo "  查看状态: pm2 status"
  echo "  查看日志: pm2 logs stock-info-collector-api"
  echo "  重启应用: pm2 restart stock-info-collector-api"
  echo ""
  echo "📝 注意事项:"
  echo "  - 配置文件已保护，未覆盖现有配置"
  echo "  - 数据库已保留，未重新初始化"
  echo "  - 如需回滚，请使用备份目录"
  echo ""
}

# 主函数
main() {
  echo "🚀 股票信息收集器 - 更新部署"
  echo "=============================="

  # 检查是否为 root 用户
  if [[ $EUID -eq 0 ]]; then
    error "请不要使用 root 用户运行此脚本"
  fi

  # 检查现有部署
  check_existing_deployment

  # 备份现有部署
  backup_existing_deployment

  # 保护配置文件
  CONFIG_BACKUP=$(protect_config_files)

  # 更新代码
  update_code

  # 更新后端
  update_backend

  # 更新前端
  update_frontend

  # 恢复配置文件
  restore_config_files $CONFIG_BACKUP

  # 重启服务
  restart_services

  # 验证部署
  verify_deployment

  # 显示更新信息
  show_update_info
}

# 运行主函数
main "$@"
