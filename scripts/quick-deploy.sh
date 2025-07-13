#!/bin/bash

# 股票信息收集器 - 快速部署脚本
# 适用于已有服务器环境的快速部署

set -e

# 配置变量
APP_NAME="stock-info-collector"
APP_DIR="/var/www/stock-info-collector"
LOCAL_BUILD_MODE=false
SERVER_IP=""
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

# 交互式获取配置信息（本地模式）
get_config_interactive_local() {
  echo ""
  echo "🚀 股票信息收集器 - 本地编译配置向导"
  echo "====================================="
  echo ""

  # 获取服务器IP
  while [[ -z "$SERVER_IP" ]]; do
    echo -n "请输入服务器IP地址: "
    read -r input_ip

    if [[ -n "$input_ip" ]]; then
      # 简单的IP格式验证
      if [[ $input_ip =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        SERVER_IP="$input_ip"
        echo "✅ 服务器IP: $SERVER_IP"
      else
        echo "❌ IP地址格式不正确，请重新输入"
      fi
    else
      echo "❌ IP地址不能为空"
    fi
  done

  # 获取域名
  while [[ -z "$DOMAIN" ]]; do
    echo ""
    echo "域名配置选项:"
    echo "1. 使用IP地址作为域名"
    echo "2. 输入自定义域名"
    echo "3. 稍后配置域名"
    echo ""
    echo -n "请选择 (1-3): "
    read -r domain_choice

    case $domain_choice in
    1)
      DOMAIN="$SERVER_IP"
      echo "✅ 使用IP地址作为域名: $DOMAIN"
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
      echo "✅ 暂时使用IP地址作为域名: $DOMAIN"
      echo "⚠️  请稍后在配置文件中修改域名"
      ;;
    *)
      echo "❌ 无效选择，请重新输入"
      ;;
    esac
  done

  echo ""
  echo "📋 配置确认:"
  echo "  服务器IP: $SERVER_IP"
  echo "  域名: $DOMAIN"
  echo ""

  echo -n "确认配置是否正确? (y/N): "
  read -r confirm
  if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "重新配置..."
    SERVER_IP=""
    DOMAIN=""
    get_config_interactive_local
  fi
}

# 交互式获取配置信息（服务器模式）
get_config_interactive_server() {
  echo ""
  echo "🚀 股票信息收集器 - 服务器编译配置向导"
  echo "======================================"
  echo ""

  # 获取域名
  while [[ -z "$DOMAIN" ]]; do
    # 获取服务器IP作为默认域名
    SERVER_IP=$(hostname -I | awk '{print $1}')

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
  echo "📋 配置确认:"
  echo "  域名: $DOMAIN"
  echo ""

  echo -n "确认配置是否正确? (y/N): "
  read -r confirm
  if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "重新配置..."
    DOMAIN=""
    get_config_interactive_server
  fi
}

# 显示帮助信息
show_help() {
  echo "🚀 股票信息收集器 - 快速部署脚本"
  echo "================================"
  echo ""
  echo "使用方法: $0 [选项]"
  echo ""
  echo "选项:"
  echo "  --local-build    本地编译上传模式（在本地机器上运行）"
  echo "  --server-build   服务器编译模式（在服务器上运行）"
  echo "  --help, -h       显示帮助信息"
  echo ""
  echo "部署模式说明:"
  echo "  --local-build:   在本地编译前端，然后上传到服务器部署"
  echo "  --server-build:  在服务器上直接编译和部署（需要足够内存）"
  echo ""
  echo "示例:"
  echo "  $0 --local-build    # 在本地机器上运行"
  echo "  $0 --server-build   # 在服务器上运行"
  echo "  $0                  # 默认服务器编译模式（在服务器上运行）"
  echo ""
  echo "注意: 脚本会交互式获取配置信息"
}

# 本地编译上传模式
local_build_deploy() {
  log "使用本地编译上传模式..."

  # 检查本地环境
  if [[ ! -d "frontend" || ! -d "backend" ]]; then
    error "请在项目根目录运行此脚本"
  fi

  # 本地构建前端
  log "在本地构建前端..."
  cd frontend

  # 检查内存并选择构建方式
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    TOTAL_MEM=$(sysctl -n hw.memsize | awk '{print int($1/1024/1024)}')
  else
    # Linux
    TOTAL_MEM=$(free -m | awk 'NR==2{printf "%.0f", $2}')
  fi

  if [[ $TOTAL_MEM -lt 2048 ]]; then
    warn "检测到低内存环境，使用低内存构建..."
    export NODE_OPTIONS="--max-old-space-size=1024"
    npm run build
  else
    log "使用标准构建..."
    export NODE_OPTIONS="--max-old-space-size=4096"
    npm run build
  fi

  cd ..

  # 本地构建后端
  log "在本地构建后端..."
  cd backend
  npm install
  npx prisma generate
  cd ..

  # 创建部署包
  log "创建部署包..."
  DEPLOY_PACKAGE="deploy-$(date +%Y%m%d_%H%M%S).tar.gz"

  tar -czf $DEPLOY_PACKAGE \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='*.log' \
    --exclude='backend/dist' \
    --exclude='build' \
    --exclude='.env' \
    --exclude='.env.local' \
    --exclude='.env.production' \
    backend/ \
    frontend/dist/ \
    scripts/ \
    package.json \
    README.md

  # 上传到服务器
  log "上传部署包到服务器..."
  scp $DEPLOY_PACKAGE ubuntu@$SERVER_IP:/tmp/

  # 在服务器上执行部署
  log "在服务器上执行部署..."
  ssh ubuntu@$SERVER_IP "
    # 确保应用目录存在
    sudo mkdir -p /var/www/stock-info-collector
    sudo chown ubuntu:ubuntu /var/www/stock-info-collector
    
    # 进入应用目录
    cd /var/www/stock-info-collector
    
    # 检查部署包是否存在
    if [[ ! -f /tmp/$DEPLOY_PACKAGE ]]; then
      echo 'ERROR: 部署包不存在: /tmp/$DEPLOY_PACKAGE'
      exit 1
    fi
    
    # 创建临时解压目录
    TEMP_DIR=\"/tmp/deploy-temp-\$(date +%s)\"
    mkdir -p \$TEMP_DIR
    cd \$TEMP_DIR
    
    # 解压部署包到临时目录
    echo '解压部署包到临时目录...'
    tar -xzf /tmp/$DEPLOY_PACKAGE
    
    # 检查关键文件是否存在
    if [[ ! -f scripts/deploy-server.sh ]]; then
      echo 'ERROR: scripts/deploy-server.sh不存在'
      echo '部署包内容:'
      ls -la
      echo 'scripts目录内容:'
      ls -la scripts/ 2>/dev/null || echo 'scripts目录不存在'
      exit 1
    fi
    
    # 设置执行权限并运行部署脚本
    chmod +x scripts/deploy-server.sh
    ./scripts/deploy-server.sh /tmp/$DEPLOY_PACKAGE $DOMAIN
    
    # 清理临时目录
    cd /
    rm -rf \$TEMP_DIR
  "

  # 清理本地文件
  rm -f $DEPLOY_PACKAGE

  log "本地编译上传部署完成！"
}

# 检查必要工具
check_requirements() {
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

# 创建应用目录
setup_directories() {
  log "创建应用目录..."

  sudo mkdir -p $APP_DIR
  sudo chown $USER:$USER $APP_DIR

  sudo mkdir -p /var/log/pm2
  sudo chown $USER:$USER /var/log/pm2

  log "目录创建完成"
}

# 配置环境变量
setup_env() {
  log "配置环境变量..."

  cat >$APP_DIR/.env <<EOF
# 数据库配置
DATABASE_URL="file:./dev.db"

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
EOF

  log "环境变量配置完成"
}

# 部署应用（服务器编译模式）
deploy_app() {
  log "开始部署应用..."

  # 进入应用目录
  cd $APP_DIR

  # 如果目录为空，克隆代码
  if [[ ! -d ".git" ]]; then
    log "克隆代码..."
    # 如果目录不为空，先备份现有文件
    if [[ "$(ls -A)" ]]; then
      warn "目录不为空，备份现有文件..."
      mkdir -p ../backup_$(date +%Y%m%d_%H%M%S)
      mv * ../backup_$(date +%Y%m%d_%H%M%S)/ 2>/dev/null || true
    fi
    git clone https://github.com/MaelWeb/stock-info-collector.git .
  else
    log "更新代码..."
    git pull origin main
  fi

  # 安装后端依赖
  log "安装后端依赖..."
  cd backend
  npm install

  # 初始化数据库
  log "初始化数据库..."
  npx prisma generate
  npx prisma db push

  # 创建超级管理员（如果脚本存在）
  if [[ -f "create-super-admin-config.js" ]]; then
    log "创建超级管理员..."
    node create-super-admin-config.js
  fi

  # 安装前端依赖并构建
  log "构建前端..."
  cd ../frontend
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

  log "应用部署完成"
}

# 从部署包部署应用
deploy_from_package() {
  local package_path=$1

  log "从部署包部署应用: $package_path"

  # 停止现有服务
  pm2 stop stock-info-collector-api 2>/dev/null || true
  pm2 delete stock-info-collector-api 2>/dev/null || true

  # 备份现有部署
  if [[ -d "$APP_DIR" && "$(ls -A $APP_DIR)" ]]; then
    log "备份现有部署..."
    sudo cp -r $APP_DIR ${APP_DIR}.backup.$(date +%Y%m%d_%H%M%S)
  fi

  # 清理应用目录
  sudo rm -rf $APP_DIR/*

  # 解压部署包
  log "解压部署包..."
  cd /tmp
  tar -xzf $package_path -C $APP_DIR

  # 安装后端依赖
  log "安装后端依赖..."
  cd $APP_DIR/backend
  npm install

  # 初始化数据库
  log "初始化数据库..."
  npx prisma generate
  npx prisma db push

  # 创建超级管理员（如果脚本存在）
  if [[ -f "create-super-admin-config.js" ]]; then
    log "创建超级管理员..."
    node create-super-admin-config.js
  fi

  # 清理部署包
  rm -f $package_path

  log "从部署包部署完成"
}

# 配置 PM2
setup_pm2() {
  log "配置 PM2..."

  cat >$APP_DIR/ecosystem.config.js <<EOF
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
      PORT: 3000
    },
    error_file: '/var/log/pm2/stock-api-error.log',
    out_file: '/var/log/pm2/stock-api-out.log',
    log_file: '/var/log/pm2/stock-api-combined.log',
    time: true
  }]
};
EOF

  # 启动应用
  cd $APP_DIR
  pm2 start ecosystem.config.js
  pm2 save
  pm2 startup

  log "PM2 配置完成"
}

# 配置 Nginx
setup_nginx() {
  log "配置 Nginx..."

  # 创建 Nginx 配置文件
  sudo tee /etc/nginx/sites-available/$APP_NAME <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
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
  sudo ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/

  # 测试配置
  sudo nginx -t

  # 重启 Nginx
  sudo systemctl restart nginx

  log "Nginx 配置完成"
}

# 创建管理脚本
create_management_scripts() {
  log "创建管理脚本..."

  # 更新脚本
  cat >$APP_DIR/update.sh <<'EOF'
#!/bin/bash
set -e

APP_DIR="/var/www/stock-info-collector"

echo "开始更新应用..."

cd $APP_DIR

# 备份当前版本
cp -r backend backend.backup.$(date +%Y%m%d_%H%M%S)
cp -r frontend frontend.backup.$(date +%Y%m%d_%H%M%S)

# 拉取最新代码
git pull origin main

# 安装后端依赖
cd backend
npm install

# 数据库迁移
npx prisma generate
npx prisma db push

# 安装前端依赖并构建
cd ../frontend
npm install
npm run build

# 重启应用
cd ..
pm2 restart stock-info-collector-api

echo "更新完成！"
EOF

  chmod +x $APP_DIR/update.sh

  # 备份脚本
  cat >$APP_DIR/backup.sh <<'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/stock-info-collector"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# 备份数据库
cp /var/www/stock-info-collector/backend/prisma/dev.db $BACKUP_DIR/db_$DATE.db

# 备份配置文件
tar -czf $BACKUP_DIR/config_$DATE.tar.gz /var/www/stock-info-collector/.env /etc/nginx/sites-available/stock-info-collector

# 删除7天前的备份
find $BACKUP_DIR -name "*.db" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "备份完成: $BACKUP_DIR"
EOF

  chmod +x $APP_DIR/backup.sh

  log "管理脚本创建完成"
}

# 显示部署信息
show_deployment_info() {
  echo ""
  echo "🎉 部署完成！"
  echo ""
  echo "📋 部署信息:"
  echo "  应用目录: $APP_DIR"
  echo "  访问地址: http://$DOMAIN"
  echo "  API 地址: http://$DOMAIN/api"
  echo ""
  echo "🔧 管理命令:"
  echo "  查看状态: pm2 status"
  echo "  查看日志: pm2 logs stock-info-collector-api"
  echo "  重启应用: pm2 restart stock-info-collector-api"
  echo "  更新应用: $APP_DIR/update.sh"
  echo "  备份应用: $APP_DIR/backup.sh"
  echo ""
  echo "📝 下一步:"
  echo "  1. 配置域名解析到服务器 IP"
  echo "  2. 运行 SSL 证书配置: sudo certbot --nginx -d $DOMAIN"
  echo "  3. 访问应用并创建管理员账户"
  echo ""
}

# 主函数
main() {
  echo "🚀 股票信息收集器 - 快速部署"
  echo "================================"

  # 解析命令行参数
  while [[ $# -gt 0 ]]; do
    case $1 in
    --local-build)
      LOCAL_BUILD_MODE=true
      shift
      ;;
    --server-build)
      LOCAL_BUILD_MODE=false
      shift
      ;;
    --help | -h)
      show_help
      exit 0
      ;;
    *)
      error "未知参数: $1"
      ;;
    esac
  done

  # 本地编译上传模式
  if [[ "$LOCAL_BUILD_MODE" == "true" ]]; then
    # 检查是否在服务器上运行
    if [[ -f "/etc/os-release" ]]; then
      error "本地编译模式只能在本地机器上运行，不能在服务器上运行"
    fi

    # 获取配置信息（本地模式）
    get_config_interactive_local

    local_build_deploy
    exit 0
  fi

  # 服务器编译模式
  # 检查是否为 root 用户
  # if [[ $EUID -eq 0 ]]; then
  #   error "请不要使用 root 用户运行此脚本"
  # fi

  # 获取配置信息（服务器模式）
  get_config_interactive_server

  # 执行部署步骤
  check_requirements
  setup_directories
  setup_env
  deploy_app
  setup_pm2
  setup_nginx
  create_management_scripts
  show_deployment_info
}

# 运行主函数
main "$@"
