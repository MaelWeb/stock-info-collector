#!/bin/bash

# 股票信息收集器 - 紧急构建脚本
# 适用于极低内存环境

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

# 强制创建 swap 空间
force_create_swap() {
  log "强制创建 swap 空间..."

  # 停止现有 swap
  sudo swapoff -a 2>/dev/null || true

  # 删除现有 swap 文件
  sudo rm -f /swapfile

  # 创建 4GB swap 文件
  sudo fallocate -l 4G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile

  # 设置 swappiness
  echo 10 | sudo tee /proc/sys/vm/swappiness

  # 添加到 fstab
  if ! grep -q "/swapfile" /etc/fstab; then
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  fi

  info "Swap 空间创建完成: $(free -h | grep Swap)"
}

# 清理系统内存
clean_system_memory() {
  log "清理系统内存..."

  # 清理缓存
  sudo sync
  echo 3 | sudo tee /proc/sys/vm/drop_caches

  # 清理 npm 缓存
  npm cache clean --force
  rm -rf ~/.npm 2>/dev/null || true
  rm -rf node_modules/.cache 2>/dev/null || true

  # 清理其他缓存
  sudo rm -rf /tmp/* 2>/dev/null || true
  sudo rm -rf /var/tmp/* 2>/dev/null || true

  info "系统内存清理完成"
}

# 分步构建 TypeScript
step_build_typescript() {
  log "分步构建 TypeScript..."

  # 设置最小内存限制
  export NODE_OPTIONS="--max-old-space-size=128 --gc-interval=50"

  # 分步编译
  log "步骤 1: 类型检查..."
  npx tsc --noEmit --skipLibCheck

  log "步骤 2: 编译 TypeScript..."
  npx tsc --skipLibCheck --incremental false

  info "TypeScript 编译完成"
}

# 分步构建 Vite
step_build_vite() {
  log "分步构建 Vite..."

  # 设置最小内存限制
  export NODE_OPTIONS="--max-old-space-size=128 --gc-interval=50"

  # 创建最小化 vite 配置
  cat >vite.config.minimal.js <<'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    minify: 'esbuild',
    target: 'es2015',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          antd: ['antd'],
          charts: ['@ant-design/charts', 'recharts']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  esbuild: {
    drop: ['console', 'debugger']
  }
})
EOF

  # 使用最小化配置构建
  npx vite build --config vite.config.minimal.js

  # 清理临时配置
  rm -f vite.config.minimal.js

  info "Vite 构建完成"
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

  # 检查关键文件
  if [[ -f "dist/assets/index-"*".js" ]]; then
    JS_SIZE=$(du -sh dist/assets/index-*.js | head -1 | cut -f1)
    info "JS 文件大小: $JS_SIZE"
  fi

  if [[ -f "dist/assets/index-"*".css" ]]; then
    CSS_SIZE=$(du -sh dist/assets/index-*.css | head -1 | cut -f1)
    info "CSS 文件大小: $CSS_SIZE"
  fi

  log "✅ 构建验证成功"
}

# 主函数
main() {
  echo "🚨 股票信息收集器 - 紧急构建"
  echo "================================"

  # 检查是否在正确的目录
  if [[ ! -f "package.json" ]]; then
    error "请在项目根目录运行此脚本"
  fi

  # 显示当前内存状态
  echo "当前内存状态:"
  free -h
  echo ""

  # 执行紧急构建步骤
  force_create_swap
  clean_system_memory
  step_build_typescript
  step_build_vite
  verify_build

  echo ""
  echo "🎉 紧急构建完成！"
  echo ""
  echo "📋 构建信息:"
  echo "  构建目录: dist/"
  echo "  内存配置: --max-old-space-size=128"
  echo "  Swap 大小: $(free -h | grep Swap | awk '{print $2}')"
  echo ""
  echo "📝 下一步:"
  echo "  1. 检查构建结果"
  echo "  2. 部署到服务器"
  echo "  3. 考虑升级服务器内存"
  echo ""
}

# 运行主函数
main "$@"
