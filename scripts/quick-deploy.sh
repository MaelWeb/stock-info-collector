#!/bin/bash

# 股票信息收集器 - 快速部署脚本
# 适用于已有服务器环境的快速部署

set -e

# 配置变量
APP_NAME="stock-info-collector"
APP_DIR="/var/www/stock-info-collector"
DOMAIN="your-domain.com" # 请修改为你的域名

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
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

# 部署应用
deploy_app() {
  log "开始部署应用..."

  # 进入应用目录
  cd $APP_DIR

  # 如果目录为空，克隆代码
  if [[ ! -d ".git" ]]; then
    log "克隆代码..."
    git clone https://github.com/your-username/stock-info-collector.git .
  else
    log "更新代码..."
    git pull origin main
  fi

  # 安装后端依赖
  log "安装后端依赖..."
  cd backend
  npm install --production

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
  npm install --production
  npm run build

  log "应用部署完成"
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
npm install --production

# 数据库迁移
npx prisma generate
npx prisma db push

# 安装前端依赖并构建
cd ../frontend
npm install --production
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

  # 检查参数
  if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    echo "使用方法: $0 [--help]"
    echo ""
    echo "选项:"
    echo "  --help, -h    显示帮助信息"
    echo ""
    echo "注意: 请先修改脚本中的域名配置"
    exit 0
  fi

  # 检查是否为 root 用户
  if [[ $EUID -eq 0 ]]; then
    error "请不要使用 root 用户运行此脚本"
  fi

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
