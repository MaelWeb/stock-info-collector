#!/bin/bash

# 股票信息收集器 - 低内存构建脚本
# 适用于内存较小的服务器

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

# 检查内存
check_memory() {
  log "检查系统内存..."

  # 获取可用内存 (MB)
  AVAILABLE_MEM=$(free -m | awk 'NR==2{printf "%.0f", $7}')
  TOTAL_MEM=$(free -m | awk 'NR==2{printf "%.0f", $2}')

  info "总内存: ${TOTAL_MEM}MB"
  info "可用内存: ${AVAILABLE_MEM}MB"

  if [[ $AVAILABLE_MEM -lt 512 ]]; then
    warn "可用内存不足 512MB，建议增加 swap 空间"
    create_swap
  fi

  if [[ $TOTAL_MEM -lt 1024 ]]; then
    warn "总内存小于 1GB，将使用最小内存配置"
    export NODE_OPTIONS="--max-old-space-size=512"
  elif [[ $TOTAL_MEM -lt 2048 ]]; then
    warn "总内存小于 2GB，将使用中等内存配置"
    export NODE_OPTIONS="--max-old-space-size=1024"
  else
    info "内存充足，使用标准配置"
    export NODE_OPTIONS="--max-old-space-size=2048"
  fi
}

# 创建 swap 空间
create_swap() {
  log "创建 swap 空间..."

  # 检查是否已有 swap
  if swapon --show | grep -q "/swapfile"; then
    info "Swap 文件已存在"
    return
  fi

  # 创建 2GB swap 文件
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile

  # 添加到 fstab
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

  info "Swap 空间创建完成"
}

# 清理 npm 缓存
clean_npm_cache() {
  log "清理 npm 缓存..."

  npm cache clean --force
  rm -rf ~/.npm 2>/dev/null || true

  info "npm 缓存清理完成"
}

# 优化构建配置
optimize_build_config() {
  log "优化构建配置..."

  # 创建 .npmrc 文件
  cat >.npmrc <<EOF
# 减少网络请求
registry=https://registry.npmjs.org/
fetch-retries=3
fetch-retry-mintimeout=5000
fetch-retry-maxtimeout=60000

# 减少内存使用
cache-min=3600
prefer-offline=true

# 并行安装
maxsockets=1
progress=false
EOF

  info "构建配置优化完成"
}

# 分步构建
step_build() {
  log "开始分步构建..."

  # 步骤 1: 安装依赖
  log "步骤 1: 安装依赖..."
  npm ci --only=production --no-audit --no-fund --no-optional

  # 步骤 2: 清理并重新安装
  log "步骤 2: 清理并重新安装..."
  rm -rf node_modules/.cache 2>/dev/null || true
  npm ci --only=production --no-audit --no-fund --no-optional

  # 步骤 3: 构建
  log "步骤 3: 开始构建..."
  export NODE_OPTIONS="$NODE_OPTIONS --gc-interval=100"
  npm run build

  info "分步构建完成"
}

# 验证构建结果
verify_build() {
  log "验证构建结果..."

  if [[ ! -d "dist" ]]; then
    error "构建失败：dist 目录不存在"
  fi

  if [[ ! -f "dist/index.html" ]]; then
    error "构建失败：index.html 不存在"
  fi

  # 检查构建文件大小
  BUILD_SIZE=$(du -sh dist | cut -f1)
  info "构建大小: $BUILD_SIZE"

  if [[ -d "dist" && -f "dist/index.html" ]]; then
    log "✅ 构建验证成功"
  else
    error "构建验证失败"
  fi
}

# 主函数
main() {
  echo "🔧 股票信息收集器 - 低内存构建"
  echo "================================"

  # 检查参数
  if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    echo "使用方法: $0 [--help]"
    echo ""
    echo "选项:"
    echo "  --help, -h    显示帮助信息"
    echo ""
    echo "此脚本适用于内存较小的服务器环境"
    exit 0
  fi

  # 检查是否在正确的目录
  if [[ ! -f "package.json" ]]; then
    error "请在项目根目录运行此脚本"
  fi

  # 执行构建步骤
  check_memory
  clean_npm_cache
  optimize_build_config
  step_build
  verify_build

  echo ""
  echo "🎉 低内存构建完成！"
  echo ""
  echo "📋 构建信息:"
  echo "  构建目录: dist/"
  echo "  内存配置: $NODE_OPTIONS"
  echo ""
  echo "📝 下一步:"
  echo "  1. 检查构建结果"
  echo "  2. 部署到服务器"
  echo "  3. 配置 Nginx"
  echo ""
}

# 运行主函数
main "$@"
