#!/bin/bash

# 调试部署包脚本

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

# 检查部署包
check_package() {
  local package_path=$1

  echo "🔍 部署包调试"
  echo "============"

  if [[ ! -f "$package_path" ]]; then
    error "部署包不存在: $package_path"
  fi

  echo "📦 部署包信息:"
  echo "  路径: $package_path"
  echo "  大小: $(du -h "$package_path" | cut -f1)"
  echo "  修改时间: $(stat -c %y "$package_path" 2>/dev/null || stat -f %Sm "$package_path")"

  echo ""
  echo "📋 部署包内容:"
  tar -tzf "$package_path" | head -20

  echo ""
  echo "📊 文件统计:"
  TOTAL_FILES=$(tar -tzf "$package_path" | wc -l)
  echo "  总文件数: $TOTAL_FILES"

  SCRIPTS_FILES=$(tar -tzf "$package_path" | grep "^scripts/" | wc -l)
  echo "  scripts目录文件数: $SCRIPTS_FILES"

  FRONTEND_FILES=$(tar -tzf "$package_path" | grep "^frontend/dist/" | wc -l)
  echo "  frontend/dist目录文件数: $FRONTEND_FILES"

  BACKEND_FILES=$(tar -tzf "$package_path" | grep "^backend/" | wc -l)
  echo "  backend目录文件数: $BACKEND_FILES"

  echo ""
  echo "🔍 关键文件检查:"

  if tar -tzf "$package_path" | grep -q "^scripts/deploy-server.sh$"; then
    echo "✅ scripts/deploy-server.sh 存在"
  else
    echo "❌ scripts/deploy-server.sh 不存在"
  fi

  if tar -tzf "$package_path" | grep -q "^frontend/dist/index.html$"; then
    echo "✅ frontend/dist/index.html 存在"
  else
    echo "❌ frontend/dist/index.html 不存在"
  fi

  if tar -tzf "$package_path" | grep -q "^backend/package.json$"; then
    echo "✅ backend/package.json 存在"
  else
    echo "❌ backend/package.json 不存在"
  fi

  echo ""
  echo "📁 scripts目录详细内容:"
  tar -tzf "$package_path" | grep "^scripts/" | sort

  echo ""
  echo "📁 frontend/dist目录详细内容:"
  tar -tzf "$package_path" | grep "^frontend/dist/" | head -10
  if [[ $(tar -tzf "$package_path" | grep "^frontend/dist/" | wc -l) -gt 10 ]]; then
    echo "  ... (还有更多文件)"
  fi
}

# 测试解压
test_extract() {
  local package_path=$1
  local test_dir="/tmp/debug-extract-$(date +%s)"

  echo ""
  echo "🧪 测试解压"
  echo "=========="

  mkdir -p "$test_dir"
  cd "$test_dir"

  echo "解压到: $test_dir"
  tar -xzf "$package_path"

  echo ""
  echo "📁 解压后的目录结构:"
  find . -type f -name "*.sh" | head -10

  echo ""
  echo "🔍 检查关键文件:"

  if [[ -f "scripts/deploy-server.sh" ]]; then
    echo "✅ scripts/deploy-server.sh 存在"
    echo "   权限: $(ls -la scripts/deploy-server.sh | awk '{print $1}')"
  else
    echo "❌ scripts/deploy-server.sh 不存在"
  fi

  if [[ -f "frontend/dist/index.html" ]]; then
    echo "✅ frontend/dist/index.html 存在"
  else
    echo "❌ frontend/dist/index.html 不存在"
  fi

  if [[ -f "backend/package.json" ]]; then
    echo "✅ backend/package.json 存在"
  else
    echo "❌ backend/package.json 不存在"
  fi

  echo ""
  echo "🧹 清理测试目录..."
  cd /
  rm -rf "$test_dir"
}

# 主函数
main() {
  if [[ $# -eq 0 ]]; then
    echo "使用方法: $0 <部署包路径>"
    echo "示例: $0 deploy-20231201_143022.tar.gz"
    exit 1
  fi

  local package_path="$1"

  check_package "$package_path"
  test_extract "$package_path"

  echo ""
  echo "✅ 调试完成！"
}

# 运行主函数
main "$@"
