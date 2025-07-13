#!/bin/bash

# 股票信息收集器 - 服务器端部署脚本
# 用于在服务器上部署已构建的应用

set -e

# 配置变量
APP_DIR="/var/www/stock-info-collector"
DEPLOY_PACKAGE_PATH=""
DOMAIN=""

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

# 交互式获取域名配置
get_domain_interactive() {
  echo ""
  echo "🌐 域名配置"
  echo "=========="
  echo ""

  # 获取服务器IP作为默认域名
  SERVER_IP=$(hostname -I | awk '{print $1}')

  while [[ -z "$DOMAIN" ]]; do
    echo "域名配置选项:"
    echo "1. 使用服务器IP作为域名 ($SERVER_IP)"
    echo "2. 输入自定义域名"
    echo "3. 稍后配置域名"
    echo ""
    echo -n "请选择 (1-3): "
    read -r domain_choice

    case $domain_choice in
    1)
      DOMAIN="$SERVER_IP"
      echo "✅ 使用服务器IP作为域名: $DOMAIN"
      ;;
    2)
      echo -n "请输入域名 (例如: example.com): "
      read -r input_domain
      if [[ -n "$input_domain" ]]; then
        DOMAIN="$input_domain"
        echo "✅ 域名: $DOMAIN"
      else
        echo "❌ 域名不能为空"
      fi
      ;;
    3)
      DOMAIN="$SERVER_IP"
      echo "✅ 暂时使用服务器IP作为域名: $DOMAIN"
      echo "⚠️  请稍后在配置文件中修改域名"
      ;;
    *)
      echo "❌ 无效选择，请重新输入"
      ;;
    esac
  done

  echo ""
  echo "📋 域名配置确认:"
  echo "  域名: $DOMAIN"
  echo ""

  echo -n "确认域名配置是否正确? (y/N): "
  read -r confirm
  if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "重新配置域名..."
    DOMAIN=""
    get_domain_interactive
  fi
}

# 显示帮助信息
show_help() {
  echo "🚀 股票信息收集器 - 服务器端部署脚本"
  echo "=================================="
  echo ""
  echo "使用方法: $0 [选项] [部署包路径] [域名]"
  echo ""
  echo "选项:"
  echo "  --help, -h       显示帮助信息"
  echo ""
  echo "参数:"
  echo "  部署包路径        部署包的完整路径（可选，默认为 /tmp/stock-info-collector-deployment.tar.gz）"
  echo "  域名             应用域名（可选，脚本会交互式获取）"
  echo ""
  echo "示例:"
  echo "  $0                                    # 使用默认部署包路径，交互式获取域名"
  echo "  $0 /tmp/deploy-20231201_143022.tar.gz # 使用指定部署包路径，交互式获取域名"
  echo "  $0 /tmp/deploy.tar.gz example.com     # 使用指定部署包路径和域名"
  echo ""
  echo "此脚本用于在服务器上部署已构建的应用"
}

# 检查系统要求
check_system() {
  log "检查系统要求..."

  # 检查 Node.js
  if ! command -v node &>/dev/null; then
    error "Node.js 未安装，请先安装 Node.js 18+"
  fi

  # 检查 npm
  if ! command -v npm &>/dev/null; then
    error "npm 未安装"
  fi

  # 检查 PM2
  if ! command -v pm2 &>/dev/null; then
    warn "PM2 未安装，正在安装..."
    sudo npm install -g pm2
  fi

  # 检查 Nginx
  if ! command -v nginx &>/dev/null; then
    error "Nginx 未安装，请先安装 Nginx"
  fi

  log "系统要求检查完成"
}

# 停止现有服务
stop_services() {
  log "停止现有服务..."

  # 停止 PM2 进程
  pm2 stop stock-info-collector-api 2>/dev/null || true
  pm2 delete stock-info-collector-api 2>/dev/null || true

  # 停止 Nginx
  sudo systemctl stop nginx 2>/dev/null || true

  log "服务已停止"
}

# 备份现有部署
backup_existing() {
  log "备份现有部署..."

  if [[ -d "$APP_DIR" ]]; then
    BACKUP_PATH="$APP_DIR.backup.$(date +%Y%m%d_%H%M%S)"
    sudo cp -r $APP_DIR $BACKUP_PATH
    info "现有部署已备份到: $BACKUP_PATH"
  fi
}

# 清理现有目录
clean_directory() {
  log "清理现有目录..."

  sudo rm -rf $APP_DIR
  sudo mkdir -p $APP_DIR
  sudo chown $USER:$USER $APP_DIR

  log "目录清理完成"
}

# 解压部署包
extract_deployment() {
  log "解压部署包..."

  # 检查部署包是否存在
  if [[ ! -f "$DEPLOY_PACKAGE_PATH" ]]; then
    error "部署包不存在: $DEPLOY_PACKAGE_PATH"
  fi

  # 检查文件类型
  if [[ ! "$DEPLOY_PACKAGE_PATH" =~ \.tar\.gz$ ]]; then
    error "部署包必须是 .tar.gz 格式: $DEPLOY_PACKAGE_PATH"
  fi

  # 创建临时解压目录
  TEMP_EXTRACT_DIR="/tmp/extract-$(date +%s)"
  mkdir -p "$TEMP_EXTRACT_DIR"

  # 解压部署包到临时目录
  log "正在解压到临时目录: $TEMP_EXTRACT_DIR"
  tar -xzf "$DEPLOY_PACKAGE_PATH" -C "$TEMP_EXTRACT_DIR"

  # 检查解压后的目录结构
  if [[ -d "$TEMP_EXTRACT_DIR/deployment-package" ]]; then
    # 如果解压后是 deployment-package 目录，移动内容到根目录
    mv "$TEMP_EXTRACT_DIR/deployment-package"/* "$TEMP_EXTRACT_DIR/"
    mv "$TEMP_EXTRACT_DIR/deployment-package"/.* "$TEMP_EXTRACT_DIR/" 2>/dev/null || true
    rmdir "$TEMP_EXTRACT_DIR/deployment-package"
  fi

  # 验证关键文件
  if [[ ! -f "$TEMP_EXTRACT_DIR/scripts/deploy-server.sh" ]]; then
    error "部署脚本不存在: $TEMP_EXTRACT_DIR/scripts/deploy-server.sh"
  fi

  if [[ ! -d "$TEMP_EXTRACT_DIR/frontend/dist" ]]; then
    error "前端构建文件不存在: $TEMP_EXTRACT_DIR/frontend/dist"
  fi

  if [[ ! -f "$TEMP_EXTRACT_DIR/frontend/dist/index.html" ]]; then
    error "前端入口文件不存在: $TEMP_EXTRACT_DIR/frontend/dist/index.html"
  fi

  if [[ ! -f "$TEMP_EXTRACT_DIR/backend/package.json" ]]; then
    error "后端package.json不存在: $TEMP_EXTRACT_DIR/backend/package.json"
  fi

  log "部署包验证通过"

  # 备份现有部署（如果存在且不为空）
  if [[ -d "$APP_DIR" && "$(ls -A $APP_DIR 2>/dev/null)" ]]; then
    log "备份现有部署..."
    BACKUP_PATH="$APP_DIR.backup.$(date +%Y%m%d_%H%M%S)"
    sudo cp -r "$APP_DIR" "$BACKUP_PATH"
    info "现有部署已备份到: $BACKUP_PATH"

    # 保留重要的配置文件
    if [[ -f "$APP_DIR/.env" ]]; then
      log "保留现有环境变量配置..."
      cp "$APP_DIR/.env" "$TEMP_EXTRACT_DIR/.env"
    fi

    if [[ -f "$APP_DIR/backend/dev.db" ]]; then
      log "保留现有数据库..."
      cp "$APP_DIR/backend/dev.db" "$TEMP_EXTRACT_DIR/backend/dev.db"
    fi
  fi

  # 清理应用目录
  log "清理应用目录..."
  sudo rm -rf "$APP_DIR"/*

  # 移动文件到应用目录
  log "移动文件到应用目录..."
  sudo cp -r "$TEMP_EXTRACT_DIR"/* "$APP_DIR/"
  sudo chown -R $USER:$USER "$APP_DIR"

  # 清理临时目录
  rm -rf "$TEMP_EXTRACT_DIR"

  log "部署包解压完成"
}

# 安装后端依赖
install_backend() {
  log "安装后端依赖..."

  cd $APP_DIR/backend

  # 检查 package.json 是否存在
  if [[ ! -f "package.json" ]]; then
    error "backend/package.json 不存在"
  fi

  npm install --production

  log "后端依赖安装完成"
}

# 初始化数据库
init_database() {
  log "初始化数据库..."

  cd $APP_DIR/backend

  # 确保环境变量可用
  if [[ -f "../.env" ]]; then
    export $(grep -v '^#' ../.env | xargs)
    log "已加载环境变量"
  else
    warn "未找到 .env 文件，使用默认配置"
  fi

  # 生成 Prisma 客户端
  npx prisma generate

  # 检查数据库是否存在
  if [[ -f "dev.db" ]]; then
    log "检测到现有数据库，进行架构迁移..."
    # 推送数据库架构（会保留现有数据）
    npx prisma db push
  else
    log "创建新数据库..."
    # 推送数据库架构
    npx prisma db push

    # 创建超级管理员（仅在新数据库时）
    if [[ -f "create-super-admin-config.js" ]]; then
      log "创建超级管理员..."
      node create-super-admin-config.js
    fi
  fi

  log "数据库初始化完成"
}

# 配置环境变量
setup_environment() {
  log "配置环境变量..."

  cd $APP_DIR

  if [[ ! -f ".env" ]]; then
    if [[ -f ".env.template" ]]; then
      cp .env.template .env
      warn "请编辑 .env 文件配置环境变量"
    else
      # 创建基本环境变量
      cat >.env <<EOF
# 数据库配置
DATABASE_URL="file:$APP_DIR/backend/dev.db"

# JWT配置
JWT_SECRET="$(openssl rand -base64 32)"
JWT_EXPIRES_IN="7d"

# 服务器配置
PORT=3000
NODE_ENV=production

# 跨域配置
CORS_ORIGIN="https://$DOMAIN"

# 日志配置
LOG_LEVEL="info"

# 超级管理员配置
SUPER_ADMIN_EMAIL="admin@example.com"
SUPER_ADMIN_PASSWORD="admin123"
SUPER_ADMIN_NAME="Super Administrator"
EOF
      log "已创建新的环境变量文件"
    fi
  else
    log "使用现有的环境变量文件"

    # 更新域名配置（如果需要）
    if grep -q "CORS_ORIGIN" .env; then
      sed -i "s|CORS_ORIGIN=.*|CORS_ORIGIN=\"http://$DOMAIN\"|" .env
      log "已更新CORS_ORIGIN为: http://$DOMAIN"
    fi
  fi

  log "环境变量配置完成"
}

# 配置 PM2
setup_pm2() {
  log "配置 PM2..."

  cd $APP_DIR

  cat >ecosystem.config.js <<EOF
module.exports = {
  apps: [{
    name: 'stock-info-collector-api',
    script: './backend/src/index.ts',
    cwd: '$APP_DIR/backend',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      DATABASE_URL: 'file:$APP_DIR/backend/dev.db'
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
  pm2 start ecosystem.config.js
  pm2 save
  pm2 startup

  log "PM2 配置完成"
}

# 配置 Nginx
setup_nginx() {
  log "配置 Nginx..."

  sudo tee /etc/nginx/sites-available/stock-info-collector <<EOF
server {
    listen 80;
    server_name $DOMAIN;
    
    # 前端静态文件
    location / {
        root $APP_DIR/frontend/dist;
        try_files \$uri \$uri/ /index.html;
        
        # 缓存配置
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # API 代理
    location /api/ {
        proxy_pass http://localhost:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }
    
    # 健康检查
    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }
}
EOF

  # 启用站点
  sudo ln -sf /etc/nginx/sites-available/stock-info-collector /etc/nginx/sites-enabled/

  # 测试配置
  sudo nginx -t

  # 重启 Nginx
  sudo systemctl restart nginx
  sudo systemctl enable nginx

  log "Nginx 配置完成"
}

# 清理临时文件
cleanup() {
  log "清理临时文件..."

  # 清理部署包
  if [[ -f "$DEPLOY_PACKAGE_PATH" ]]; then
    rm -f "$DEPLOY_PACKAGE_PATH"
    log "已清理部署包: $DEPLOY_PACKAGE_PATH"
  fi

  log "清理完成"
}

# 验证部署
verify_deployment() {
  log "验证部署..."

  # 检查 PM2 状态
  if pm2 show stock-info-collector-api | grep -q "online"; then
    log "✅ PM2 应用运行正常"
  else
    error "❌ PM2 应用未正常运行"
  fi

  # 检查 Nginx 状态
  if systemctl is-active nginx | grep -q "active"; then
    log "✅ Nginx 运行正常"
  else
    error "❌ Nginx 未正常运行"
  fi

  # 检查端口
  if netstat -tlnp | grep -q ":3000"; then
    log "✅ API 端口 3000 正常监听"
  else
    error "❌ API 端口 3000 未监听"
  fi

  if netstat -tlnp | grep -q ":80"; then
    log "✅ HTTP 端口 80 正常监听"
  else
    error "❌ HTTP 端口 80 未监听"
  fi

  log "部署验证完成"
}

# 显示部署信息
show_deployment_info() {
  echo ""
  echo "🎉 服务器端部署完成！"
  echo ""
  echo "📋 部署信息:"
  echo "  应用目录: $APP_DIR"
  echo "  访问地址: http://$DOMAIN"
  echo "  API 地址: http://$DOMAIN/api"
  echo "  部署包: $DEPLOY_PACKAGE_PATH"
  echo ""
  echo "🔧 管理命令:"
  echo "  查看状态: pm2 status"
  echo "  查看日志: pm2 logs stock-info-collector-api"
  echo "  重启应用: pm2 restart stock-info-collector-api"
  echo "  重启 Nginx: sudo systemctl restart nginx"
  echo ""
  echo "📝 下一步:"
  echo "  1. 访问应用检查是否正常运行"
  echo "  2. 配置域名和SSL证书"
  echo "  3. 修改环境变量配置"
  echo "  4. 创建管理员账户"
  echo ""
}

# 主函数
main() {
  echo "🚀 股票信息收集器 - 服务器端部署"
  echo "=================================="

  # 解析命令行参数
  while [[ $# -gt 0 ]]; do
    case $1 in
    --help | -h)
      show_help
      exit 0
      ;;
    -*)
      error "未知选项: $1"
      ;;
    *)
      if [[ -z "$DEPLOY_PACKAGE_PATH" ]]; then
        DEPLOY_PACKAGE_PATH="$1"
      elif [[ -z "$DOMAIN" ]]; then
        DOMAIN="$1"
      else
        error "参数过多，只能指定部署包路径和域名"
      fi
      shift
      ;;
    esac
  done

  # 设置默认部署包路径
  if [[ -z "$DEPLOY_PACKAGE_PATH" ]]; then
    DEPLOY_PACKAGE_PATH="/tmp/stock-info-collector-deployment.tar.gz"
  fi

  # 如果没有提供域名，交互式获取
  if [[ -z "$DOMAIN" ]]; then
    get_domain_interactive
  fi

  # 检查是否为 root 用户
  if [[ $EUID -eq 0 ]]; then
    error "请不要使用 root 用户运行此脚本"
  fi

  # 执行部署步骤
  check_system
  stop_services
  backup_existing
  clean_directory
  extract_deployment
  install_backend
  setup_environment
  init_database
  setup_pm2
  setup_nginx
  cleanup
  verify_deployment
  show_deployment_info
}

# 运行主函数
main "$@"
