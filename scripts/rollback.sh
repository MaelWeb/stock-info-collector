#!/bin/bash

# 回滚脚本 - 用于在部署失败时恢复之前的版本

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
  echo "🔄 股票信息收集器 - 回滚脚本"
  echo "=========================="
  echo ""
  echo "使用方法: $0 [选项]"
  echo ""
  echo "选项:"
  echo "  --list, -l        列出可用的备份"
  echo "  --latest          回滚到最新的备份"
  echo "  --backup <name>   回滚到指定的备份"
  echo "  --help, -h        显示帮助信息"
  echo ""
  echo "示例:"
  echo "  $0 --list                    # 列出所有备份"
  echo "  $0 --latest                  # 回滚到最新备份"
  echo "  $0 --backup backup.20231201  # 回滚到指定备份"
  echo ""
}

# 列出可用备份
list_backups() {
  echo "📋 可用备份列表"
  echo "=============="

  if [[ ! -d "$APP_DIR" ]]; then
    error "应用目录不存在: $APP_DIR"
  fi

  # 查找备份目录
  BACKUP_DIRS=$(find /var/www -name "stock-info-collector.backup.*" -type d 2>/dev/null | sort -r)

  if [[ -z "$BACKUP_DIRS" ]]; then
    echo "❌ 没有找到任何备份"
    return
  fi

  echo "找到以下备份:"
  echo ""

  local count=1
  while IFS= read -r backup_dir; do
    if [[ -d "$backup_dir" ]]; then
      backup_name=$(basename "$backup_dir")
      backup_date=$(echo "$backup_name" | sed 's/stock-info-collector.backup.//')
      backup_size=$(du -sh "$backup_dir" 2>/dev/null | cut -f1)

      echo "$count. $backup_name"
      echo "   日期: $backup_date"
      echo "   大小: $backup_size"
      echo "   路径: $backup_dir"
      echo ""

      ((count++))
    fi
  done <<<"$BACKUP_DIRS"
}

# 回滚到指定备份
rollback_to_backup() {
  local backup_name=$1

  echo "🔄 开始回滚"
  echo "=========="

  # 检查备份是否存在
  local backup_path="/var/www/$backup_name"
  if [[ ! -d "$backup_path" ]]; then
    error "备份不存在: $backup_path"
  fi

  log "回滚到备份: $backup_name"

  # 停止服务
  log "停止服务..."
  pm2 stop stock-info-collector-api 2>/dev/null || true
  pm2 delete stock-info-collector-api 2>/dev/null || true

  # 备份当前部署（如果存在）
  if [[ -d "$APP_DIR" && "$(ls -A $APP_DIR 2>/dev/null)" ]]; then
    log "备份当前部署..."
    CURRENT_BACKUP="$APP_DIR.current.$(date +%Y%m%d_%H%M%S)"
    sudo cp -r "$APP_DIR" "$CURRENT_BACKUP"
    info "当前部署已备份到: $CURRENT_BACKUP"
  fi

  # 清理应用目录
  log "清理应用目录..."
  sudo rm -rf "$APP_DIR"/*

  # 恢复备份
  log "恢复备份..."
  sudo cp -r "$backup_path"/* "$APP_DIR/"
  sudo chown -R $USER:$USER "$APP_DIR"

  # 重新安装依赖
  log "重新安装后端依赖..."
  cd "$APP_DIR/backend"
  npm install --production

  # 重新生成 Prisma 客户端
  log "重新生成 Prisma 客户端..."
  npx prisma generate

  # 重启服务
  log "重启服务..."
  cd "$APP_DIR"
  pm2 start ecosystem.config.js
  pm2 save

  # 重启 Nginx
  log "重启 Nginx..."
  sudo systemctl restart nginx

  log "回滚完成！"
  info "应用已回滚到: $backup_name"
}

# 回滚到最新备份
rollback_to_latest() {
  echo "🔄 回滚到最新备份"
  echo "================"

  # 查找最新备份
  LATEST_BACKUP=$(find /var/www -name "stock-info-collector.backup.*" -type d 2>/dev/null | sort -r | head -1)

  if [[ -z "$LATEST_BACKUP" ]]; then
    error "没有找到任何备份"
  fi

  LATEST_BACKUP_NAME=$(basename "$LATEST_BACKUP")
  log "找到最新备份: $LATEST_BACKUP_NAME"

  rollback_to_backup "$LATEST_BACKUP_NAME"
}

# 主函数
main() {
  echo "🔄 股票信息收集器 - 回滚脚本"
  echo "=========================="

  # 检查是否为 root 用户
  if [[ $EUID -eq 0 ]]; then
    error "请不要使用 root 用户运行此脚本"
  fi

  # 解析命令行参数
  case "${1:-}" in
  --list | -l)
    list_backups
    ;;
  --latest)
    rollback_to_latest
    ;;
  --backup)
    if [[ -z "$2" ]]; then
      error "请指定备份名称"
    fi
    rollback_to_backup "$2"
    ;;
  --help | -h | "")
    show_help
    ;;
  *)
    error "未知选项: $1"
    ;;
  esac
}

# 运行主函数
main "$@"
