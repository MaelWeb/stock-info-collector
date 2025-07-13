#!/bin/bash

# 生产环境配置模板生成脚本

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

# 生成生产环境配置
generate_production_env() {
  local domain=$1
  local app_dir=${2:-"/var/www/stock-info-collector"}

  echo "🔧 生成生产环境配置"
  echo "=================="

  # 获取服务器IP
  local server_ip=$(hostname -I | awk '{print $1}')

  # 生成强密码
  local jwt_secret=$(openssl rand -base64 64)
  local admin_password=$(openssl rand -base64 12)

  cat >production.env <<EOF
# ========================================
# 股票信息收集器 - 生产环境配置
# ========================================

# 数据库配置
DATABASE_URL="file:$app_dir/backend/dev.db"

# JWT配置
JWT_SECRET="$jwt_secret"
JWT_EXPIRES_IN="7d"

# 服务器配置
PORT=3000
NODE_ENV=production

# 跨域配置
CORS_ORIGIN="https://$domain"

# 日志配置
LOG_LEVEL="info"

# 超级管理员配置
SUPER_ADMIN_EMAIL="admin@$domain"
SUPER_ADMIN_PASSWORD="$admin_password"
SUPER_ADMIN_NAME="Super Administrator"

# 股票数据API配置（可选）
# ALPHA_VANTAGE_API_KEY="your_alpha_vantage_api_key"
# YAHOO_FINANCE_API_KEY="your_yahoo_finance_api_key"

# AI模型配置（可选）
# OPENAI_API_KEY="your_openai_api_key"
# ANTHROPIC_API_KEY="your_anthropic_api_key"
# GEMINI_API_KEY="your_gemini_api_key"
# OLLAMA_BASE_URL="http://localhost:11434"
# HUGGINGFACE_API_KEY="your_huggingface_api_key"

# 定时任务配置
DAILY_ANALYSIS_TIME="0 9 * * *"
MARKET_HOURS_START="09:30"
MARKET_HOURS_END="16:00"

# 限流配置
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=900000

# 应用目录配置
APP_DIR="$app_dir"
SERVER_IP="$server_ip"
DOMAIN="$domain"
EOF

  log "生产环境配置已生成: production.env"

  echo ""
  echo "📋 配置信息:"
  echo "  域名: $domain"
  echo "  应用目录: $app_dir"
  echo "  服务器IP: $server_ip"
  echo "  管理员邮箱: admin@$domain"
  echo "  管理员密码: $admin_password"
  echo ""

  warn "⚠️  重要提醒:"
  echo "  1. 请妥善保管管理员密码"
  echo "  2. 根据需要配置股票数据API密钥"
  echo "  3. 根据需要配置AI模型API密钥"
  echo "  4. 将此文件重命名为 .env 并放置在应用根目录"
  echo ""

  info "使用方法:"
  echo "  cp production.env /var/www/stock-info-collector/.env"
}

# 显示帮助信息
show_help() {
  echo "🔧 生产环境配置生成器"
  echo "===================="
  echo ""
  echo "使用方法: $0 <域名> [应用目录]"
  echo ""
  echo "参数:"
  echo "  域名        应用域名（必需）"
  echo "  应用目录    应用安装目录（可选，默认: /var/www/stock-info-collector）"
  echo ""
  echo "示例:"
  echo "  $0 example.com"
  echo "  $0 example.com /opt/stock-app"
  echo ""
}

# 主函数
main() {
  if [[ $# -eq 0 ]]; then
    show_help
    exit 1
  fi

  local domain=$1
  local app_dir=${2:-"/var/www/stock-info-collector"}

  # 验证域名格式
  if [[ ! "$domain" =~ ^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$ ]]; then
    error "无效的域名格式: $domain"
  fi

  generate_production_env "$domain" "$app_dir"
}

# 运行主函数
main "$@"
