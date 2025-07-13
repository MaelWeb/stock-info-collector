#!/bin/bash

# 股票信息收集器 - 一键部署脚本
# 使用方法: ./deploy.sh [install|update|backup|restart|status]

set -e

# 配置变量
APP_NAME="stock-info-collector"
APP_DIR="/var/www/stock-info-collector"
BACKUP_DIR="/var/backups/stock-info-collector"
LOG_FILE="/var/log/deploy.log"
DOMAIN="your-domain.com" # 请修改为你的域名

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log() {
  echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a $LOG_FILE
}

error() {
  echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a $LOG_FILE
}

warn() {
  echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a $LOG_FILE
}

info() {
  echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}" | tee -a $LOG_FILE
}

# 检查是否为root用户
check_root() {
  if [[ $EUID -eq 0 ]]; then
    error "请不要使用root用户运行此脚本"
    exit 1
  fi
}

# 检查系统要求
check_system() {
  log "检查系统要求..."

  # 检查操作系统
  if [[ -f /etc/os-release ]]; then
    . /etc/os-release
    if [[ "$ID" != "ubuntu" && "$ID" != "debian" && "$ID" != "centos" && "$ID" != "rhel" ]]; then
      error "不支持的操作系统: $ID"
      exit 1
    fi
    info "操作系统: $ID $VERSION_ID"
  else
    error "无法检测操作系统"
    exit 1
  fi

  # 检查内存
  MEMORY=$(free -m | awk 'NR==2{printf "%.0f", $2/1024}')
  if [[ $MEMORY -lt 2 ]]; then
    error "内存不足，需要至少2GB RAM"
    exit 1
  fi
  info "内存: ${MEMORY}GB"

  # 检查磁盘空间
  DISK_SPACE=$(df -BG / | awk 'NR==2{print $4}' | sed 's/G//')
  if [[ $DISK_SPACE -lt 10 ]]; then
    error "磁盘空间不足，需要至少10GB可用空间"
    exit 1
  fi
  info "可用磁盘空间: ${DISK_SPACE}GB"
}

# 安装系统依赖
install_dependencies() {
  log "安装系统依赖..."

  if [[ -f /etc/debian_version ]]; then
    # Ubuntu/Debian
    sudo apt update
    sudo apt install -y curl wget git vim htop nginx software-properties-common

    # 安装 Node.js
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs

    # 安装 PM2
    sudo npm install -g pm2

    # 安装 Certbot
    sudo apt install -y certbot python3-certbot-nginx

  elif [[ -f /etc/redhat-release ]]; then
    # CentOS/RHEL
    sudo yum update -y
    sudo yum install -y curl wget git vim htop nginx

    # 安装 Node.js
    curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
    sudo yum install -y nodejs

    # 安装 PM2
    sudo npm install -g pm2

    # 安装 Certbot
    sudo yum install -y certbot python3-certbot-nginx
  fi

  # 验证安装
  node --version
  npm --version
  pm2 --version
}

# 配置防火墙
setup_firewall() {
  log "配置防火墙..."

  if command -v ufw &>/dev/null; then
    # Ubuntu/Debian UFW
    sudo ufw allow 22
    sudo ufw allow 80
    sudo ufw allow 443
    sudo ufw --force enable
  elif command -v firewall-cmd &>/dev/null; then
    # CentOS/RHEL firewalld
    sudo firewall-cmd --permanent --add-service=ssh
    sudo firewall-cmd --permanent --add-service=http
    sudo firewall-cmd --permanent --add-service=https
    sudo firewall-cmd --reload
  fi
}

# 创建应用目录
create_app_directory() {
  log "创建应用目录..."

  sudo mkdir -p $APP_DIR
  sudo chown $USER:$USER $APP_DIR

  sudo mkdir -p $BACKUP_DIR
  sudo chown $USER:$USER $BACKUP_DIR

  sudo mkdir -p /var/log/pm2
  sudo chown $USER:$USER /var/log/pm2
}

# 配置环境变量
setup_environment() {
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

  info "环境变量文件已创建: $APP_DIR/.env"
}

# 克隆代码
clone_code() {
  log "克隆应用代码..."

  if [[ -d "$APP_DIR/.git" ]]; then
    warn "代码目录已存在，跳过克隆"
    return
  fi

  cd $APP_DIR

  # 如果目录不为空，先备份现有文件
  if [[ "$(ls -A)" ]]; then
    warn "目录不为空，备份现有文件..."
    mkdir -p ../backup_$(date +%Y%m%d_%H%M%S)
    mv * ../backup_$(date +%Y%m%d_%H%M%S)/ 2>/dev/null || true
  fi

  git clone https://github.com/MaelWeb/stock-info-collector.git .
}

# 安装应用依赖
install_app_dependencies() {
  log "安装应用依赖..."

  # 安装后端依赖
  cd $APP_DIR/backend
  npm install --production

  # 安装前端依赖
  cd $APP_DIR/frontend
  npm install --production
}

# 构建前端
build_frontend() {
  log "构建前端应用..."

  cd $APP_DIR/frontend

  # 检查内存并选择构建方式
  TOTAL_MEM=$(free -m | awk 'NR==2{printf "%.0f", $2}')
  if [[ $TOTAL_MEM -lt 1024 ]]; then
    log "检测到低内存环境，使用低内存构建..."
    npm run build:low-memory
  else
    log "使用标准构建..."
    export NODE_OPTIONS="--max-old-space-size=2048"
    npm run build
  fi

  if [[ ! -d "dist" ]]; then
    error "前端构建失败"
    exit 1
  fi

  info "前端构建完成"
}

# 初始化数据库
init_database() {
  log "初始化数据库..."

  cd $APP_DIR/backend

  # 生成 Prisma 客户端
  npx prisma generate

  # 推送数据库架构
  npx prisma db push

  # 创建超级管理员
  if [[ -f "create-super-admin-config.js" ]]; then
    node create-super-admin-config.js
  fi

  info "数据库初始化完成"
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

  info "PM2 配置完成"
}

# 配置 Nginx
setup_nginx() {
  log "配置 Nginx..."

  # 创建 Nginx 配置文件
  sudo tee /etc/nginx/sites-available/$APP_NAME <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    # 重定向到 HTTPS (SSL配置后启用)
    # return 301 https://\$server_name\$request_uri;
    
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
  sudo systemctl enable nginx

  info "Nginx 配置完成"
}

# 配置 SSL 证书
setup_ssl() {
  log "配置 SSL 证书..."

  # 检查域名是否指向当前服务器
  SERVER_IP=$(curl -s ifconfig.me)
  DOMAIN_IP=$(dig +short $DOMAIN)

  if [[ "$SERVER_IP" != "$DOMAIN_IP" ]]; then
    warn "域名 $DOMAIN 未指向当前服务器 IP: $SERVER_IP"
    warn "请先配置域名解析，然后重新运行 SSL 配置"
    return
  fi

  # 获取 SSL 证书
  sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN

  # 配置自动续期
  echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -

  info "SSL 证书配置完成"
}

# 创建备份脚本
create_backup_script() {
  log "创建备份脚本..."

  cat >$APP_DIR/backup.sh <<'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/stock-info-collector"
DATE=$(date +%Y%m%d_%H%M%S)

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份数据库
cp /var/www/stock-info-collector/backend/prisma/dev.db $BACKUP_DIR/db_$DATE.db

# 备份配置文件
tar -czf $BACKUP_DIR/config_$DATE.tar.gz /var/www/stock-info-collector/.env /etc/nginx/sites-available/stock-info-collector

# 删除7天前的备份
find $BACKUP_DIR -name "*.db" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

  chmod +x $APP_DIR/backup.sh

  # 添加到 crontab
  (
    crontab -l 2>/dev/null
    echo "0 2 * * * $APP_DIR/backup.sh"
  ) | crontab -

  info "备份脚本已创建"
}

# 创建更新脚本
create_update_script() {
  log "创建更新脚本..."

  cat >$APP_DIR/update.sh <<'EOF'
#!/bin/bash
set -e

APP_DIR="/var/www/stock-info-collector"
LOG_FILE="/var/log/deploy.log"

echo "$(date): Starting update..." >> $LOG_FILE

# 进入应用目录
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

# 检查应用状态
if pm2 show stock-info-collector-api | grep -q "online"; then
    echo "$(date): Update successful" >> $LOG_FILE
    echo "Update completed successfully!"
else
    echo "$(date): Update failed" >> $LOG_FILE
    echo "Update failed! Rolling back..."
    
    # 回滚
    pm2 restart stock-info-collector-api
    exit 1
fi
EOF

  chmod +x $APP_DIR/update.sh

  info "更新脚本已创建"
}

# 显示状态
show_status() {
  log "显示应用状态..."

  echo "=== 系统状态 ==="
  echo "CPU 使用率: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"
  echo "内存使用率: $(free | grep Mem | awk '{printf("%.1f%%", $3/$2 * 100.0)}')"
  echo "磁盘使用率: $(df -h / | awk 'NR==2 {print $5}')"

  echo -e "\n=== 应用状态 ==="
  pm2 status

  echo -e "\n=== 服务状态 ==="
  systemctl is-active nginx
  systemctl is-active pm2-$USER

  echo -e "\n=== 端口状态 ==="
  netstat -tlnp | grep -E ':(80|443|3000)'

  echo -e "\n=== 日志文件 ==="
  echo "应用日志: /var/log/pm2/"
  echo "Nginx 日志: /var/log/nginx/"
  echo "部署日志: $LOG_FILE"
}

# 备份应用
backup_app() {
  log "备份应用..."

  DATE=$(date +%Y%m%d_%H%M%S)

  # 创建备份目录
  mkdir -p $BACKUP_DIR

  # 备份数据库
  cp $APP_DIR/backend/prisma/dev.db $BACKUP_DIR/db_$DATE.db

  # 备份配置文件
  tar -czf $BACKUP_DIR/config_$DATE.tar.gz $APP_DIR/.env /etc/nginx/sites-available/$APP_NAME

  # 删除7天前的备份
  find $BACKUP_DIR -name "*.db" -mtime +7 -delete
  find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

  info "备份完成: $BACKUP_DIR"
}

# 重启应用
restart_app() {
  log "重启应用..."

  pm2 restart stock-info-collector-api
  sudo systemctl restart nginx

  info "应用重启完成"
}

# 完整安装
install() {
  log "开始完整安装..."

  check_root
  check_system
  install_dependencies
  setup_firewall
  create_app_directory
  setup_environment
  clone_code
  install_app_dependencies
  build_frontend
  init_database
  setup_pm2
  setup_nginx
  create_backup_script
  create_update_script

  log "安装完成！"
  info "请配置域名解析后运行: ./deploy.sh ssl"
  info "访问地址: http://$DOMAIN"
}

# 更新应用
update() {
  log "开始更新应用..."

  cd $APP_DIR
  ./update.sh

  log "更新完成！"
}

# 主函数
main() {
  case "${1:-}" in
  "install")
    install
    ;;
  "update")
    update
    ;;
  "backup")
    backup_app
    ;;
  "restart")
    restart_app
    ;;
  "status")
    show_status
    ;;
  "ssl")
    setup_ssl
    ;;
  *)
    echo "使用方法: $0 {install|update|backup|restart|status|ssl}"
    echo ""
    echo "命令说明:"
    echo "  install  - 完整安装应用"
    echo "  update   - 更新应用"
    echo "  backup   - 备份应用"
    echo "  restart  - 重启应用"
    echo "  status   - 显示状态"
    echo "  ssl      - 配置SSL证书"
    echo ""
    echo "注意事项:"
    echo "  1. 请先修改脚本中的域名配置"
    echo "  2. 确保域名已正确解析到服务器"
    echo "  3. 建议在安装前备份重要数据"
    exit 1
    ;;
  esac
}

# 运行主函数
main "$@"
