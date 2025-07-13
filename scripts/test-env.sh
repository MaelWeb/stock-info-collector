#!/bin/bash

# 环境变量测试脚本

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

# 测试环境变量
test_environment() {
  echo "🧪 环境变量测试"
  echo "=============="

  # 检查是否在正确的目录
  if [[ ! -d "backend" ]]; then
    error "请在项目根目录运行此脚本"
  fi

  # 检查 .env 文件
  if [[ -f ".env" ]]; then
    echo "✅ .env 文件存在"

    # 显示环境变量（隐藏敏感信息）
    echo ""
    echo "📋 环境变量内容:"
    while IFS= read -r line; do
      if [[ ! "$line" =~ ^# ]] && [[ -n "$line" ]]; then
        if [[ "$line" =~ JWT_SECRET|PASSWORD ]]; then
          # 隐藏敏感信息
          key=$(echo "$line" | cut -d'=' -f1)
          echo "  $key=***"
        else
          echo "  $line"
        fi
      fi
    done <.env
  else
    warn "⚠️  .env 文件不存在"
  fi

  # 测试环境变量加载
  echo ""
  echo "🔍 测试环境变量加载..."

  if [[ -f ".env" ]]; then
    # 加载环境变量
    export $(grep -v '^#' .env | xargs)

    # 检查关键环境变量
    if [[ -n "$DATABASE_URL" ]]; then
      echo "✅ DATABASE_URL 已设置"
    else
      echo "❌ DATABASE_URL 未设置"
    fi

    if [[ -n "$JWT_SECRET" ]]; then
      echo "✅ JWT_SECRET 已设置"
    else
      echo "❌ JWT_SECRET 未设置"
    fi

    if [[ -n "$PORT" ]]; then
      echo "✅ PORT 已设置: $PORT"
    else
      echo "❌ PORT 未设置"
    fi

    if [[ -n "$NODE_ENV" ]]; then
      echo "✅ NODE_ENV 已设置: $NODE_ENV"
    else
      echo "❌ NODE_ENV 未设置"
    fi
  fi

  # 测试 Prisma 配置
  echo ""
  echo "🔍 测试 Prisma 配置..."

  if [[ -f "backend/prisma/schema.prisma" ]]; then
    echo "✅ Prisma schema 文件存在"

    # 检查 DATABASE_URL 在 schema 中的引用
    if grep -q "env(\"DATABASE_URL\")" backend/prisma/schema.prisma; then
      echo "✅ schema.prisma 正确引用 DATABASE_URL"
    else
      echo "❌ schema.prisma 未正确引用 DATABASE_URL"
    fi
  else
    echo "❌ Prisma schema 文件不存在"
  fi

  # 测试数据库连接
  echo ""
  echo "🔍 测试数据库连接..."

  cd backend

  if [[ -f "package.json" ]]; then
    echo "✅ backend/package.json 存在"

    # 检查 Prisma 是否安装
    if grep -q "prisma" package.json; then
      echo "✅ Prisma 依赖已安装"

      # 尝试生成 Prisma 客户端
      if [[ -f "../.env" ]]; then
        export $(grep -v '^#' ../.env | xargs)
        echo "尝试生成 Prisma 客户端..."
        npx prisma generate
        if [[ $? -eq 0 ]]; then
          echo "✅ Prisma 客户端生成成功"
        else
          echo "❌ Prisma 客户端生成失败"
        fi
      else
        echo "⚠️  无法测试 Prisma 生成（缺少 .env 文件）"
      fi
    else
      echo "❌ Prisma 依赖未安装"
    fi
  else
    echo "❌ backend/package.json 不存在"
  fi

  cd ..

  echo ""
  echo "✅ 环境变量测试完成！"
}

# 主函数
main() {
  test_environment
}

# 运行主函数
main "$@"
