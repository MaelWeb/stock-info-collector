#!/bin/bash

# 本地开发环境配置生成脚本

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

# 生成本地开发环境配置
generate_local_env() {
  echo "🔧 生成本地开发环境配置"
  echo "======================"

  # 检查是否在项目根目录
  if [[ ! -d "backend" || ! -d "frontend" ]]; then
    error "请在项目根目录运行此脚本"
  fi

  # 生成 JWT 密钥
  local jwt_secret=$(openssl rand -base64 32)

  cat >.env <<EOF
# ========================================
# 股票信息收集器 - 本地开发环境配置
# ========================================

# 数据库配置
DATABASE_URL="file:./backend/dev.db"

# JWT配置
JWT_SECRET="$jwt_secret"
JWT_EXPIRES_IN="7d"

# 服务器配置
PORT=3000
NODE_ENV=development

# 跨域配置
CORS_ORIGIN="http://localhost:5173"

# 日志配置
LOG_LEVEL="debug"

# 超级管理员配置
SUPER_ADMIN_EMAIL="admin@example.com"
SUPER_ADMIN_PASSWORD="admin123"
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
EOF

  log "本地开发环境配置已生成: .env"

  echo ""
  echo "📋 配置信息:"
  echo "  数据库路径: ./backend/dev.db"
  echo "  后端端口: 3000"
  echo "  前端地址: http://localhost:5173"
  echo "  管理员邮箱: admin@example.com"
  echo "  管理员密码: admin123"
  echo ""

  info "下一步:"
  echo "  1. 启动后端: cd backend && npm run dev"
  echo "  2. 启动前端: cd frontend && npm run dev"
  echo "  3. 访问应用: http://localhost:5173"
  echo ""
}

# 显示帮助信息
show_help() {
  echo "🔧 本地开发环境配置生成器"
  echo "========================"
  echo ""
  echo "使用方法: $0"
  echo ""
  echo "此脚本会在项目根目录生成 .env 文件"
  echo "用于本地开发环境配置"
  echo ""
}

# 主函数
main() {
  if [[ $# -gt 0 ]]; then
    show_help
    exit 1
  fi

  generate_local_env
}

# 运行主函数
main "$@"
