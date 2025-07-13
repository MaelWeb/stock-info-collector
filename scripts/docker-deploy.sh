#!/bin/bash

# 股票信息收集器 - Docker 部署脚本

set -e

# 配置变量
APP_NAME="stock-info-collector"
DOMAIN="your-domain.com" # 请修改为你的域名

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

# 检查 Docker 和 Docker Compose
check_docker() {
  log "检查 Docker 环境..."

  if ! command -v docker &>/dev/null; then
    error "Docker 未安装，请先安装 Docker"
  fi

  if ! command -v docker-compose &>/dev/null; then
    error "Docker Compose 未安装，请先安装 Docker Compose"
  fi

  # 检查 Docker 服务状态
  if ! docker info &>/dev/null; then
    error "Docker 服务未运行，请启动 Docker 服务"
  fi

  log "Docker 环境检查完成"
}

# 创建环境变量文件
create_env_file() {
  log "创建环境变量文件..."

  cat >.env <<EOF
# 应用配置
NODE_ENV=production
DOMAIN=$DOMAIN

# JWT 配置
JWT_SECRET=$(openssl rand -base64 32)

# 跨域配置
CORS_ORIGIN=https://$DOMAIN

# 数据库配置
DATABASE_URL=file:./dev.db

# Redis 配置 (可选)
REDIS_URL=redis://redis:6379

# 监控配置 (可选)
PROMETHEUS_PORT=9090
EOF

  info "环境变量文件已创建: .env"
}

# 创建 Nginx 配置目录
setup_nginx_config() {
  log "设置 Nginx 配置..."

  mkdir -p nginx/conf.d

  # 创建 Nginx 配置文件
  cat >nginx/nginx.conf <<EOF
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    # 日志格式
    log_format main '\$remote_addr - \$remote_user [\$time_local] "\$request" '
                    '\$status \$body_bytes_sent "\$http_referer" '
                    '"\$http_user_agent" "\$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;

    # 基本设置
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # 包含站点配置
    include /etc/nginx/conf.d/*.conf;
}
EOF

  # 创建站点配置
  cat >nginx/conf.d/default.conf <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    # 重定向到 HTTPS (SSL配置后启用)
    # return 301 https://\$server_name\$request_uri;
    
    # 前端静态文件
    location / {
        proxy_pass http://frontend:80;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # API 代理
    location /api/ {
        proxy_pass http://api:3000/;
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
        proxy_pass http://api:3000/health;
        access_log off;
    }
}
EOF

  log "Nginx 配置设置完成"
}

# 创建监控配置
setup_monitoring() {
  log "设置监控配置..."

  mkdir -p monitoring

  # 创建 Prometheus 配置
  cat >monitoring/prometheus.yml <<EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  # - "first_rules.yml"
  # - "second_rules.yml"

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'stock-info-collector-api'
    static_configs:
      - targets: ['api:3000']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx:80']
    metrics_path: '/nginx_status'
    scrape_interval: 30s
EOF

  log "监控配置设置完成"
}

# 构建和启动服务
deploy_services() {
  log "构建和启动服务..."

  # 拉取最新代码
  if [[ -d ".git" ]]; then
    log "拉取最新代码..."
    git pull origin main
  fi

  # 构建镜像
  log "构建 Docker 镜像..."
  docker-compose build --no-cache

  # 启动服务
  log "启动服务..."
  docker-compose up -d

  # 等待服务启动
  log "等待服务启动..."
  sleep 30

  # 检查服务状态
  log "检查服务状态..."
  docker-compose ps

  # 检查健康状态
  log "检查健康状态..."
  docker-compose exec -T api curl -f http://localhost:3000/health || warn "API 健康检查失败"
  docker-compose exec -T nginx nginx -t || warn "Nginx 配置检查失败"

  log "服务部署完成"
}

# 配置 SSL 证书
setup_ssl() {
  log "配置 SSL 证书..."

  # 检查域名解析
  SERVER_IP=$(curl -s ifconfig.me)
  DOMAIN_IP=$(dig +short $DOMAIN)

  if [[ "$SERVER_IP" != "$DOMAIN_IP" ]]; then
    warn "域名 $DOMAIN 未指向当前服务器 IP: $SERVER_IP"
    warn "请先配置域名解析，然后重新运行 SSL 配置"
    return
  fi

  # 创建 SSL 目录
  mkdir -p ssl

  # 使用 Certbot 获取证书
  docker run --rm -it \
    -v "$(pwd)/ssl:/etc/letsencrypt" \
    -v "$(pwd)/nginx/conf.d:/etc/nginx/conf.d" \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/etc/nginx/conf.d \
    -d $DOMAIN \
    -d www.$DOMAIN \
    --email admin@$DOMAIN \
    --agree-tos \
    --non-interactive

  # 更新 Nginx 配置以支持 SSL
  cat >nginx/conf.d/default.conf <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;
    
    # SSL 配置
    ssl_certificate /etc/nginx/ssl/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/live/$DOMAIN/privkey.pem;
    
    # SSL 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # 安全头
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
    # 前端静态文件
    location / {
        proxy_pass http://frontend:80;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # API 代理
    location /api/ {
        proxy_pass http://api:3000/;
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
        proxy_pass http://api:3000/health;
        access_log off;
    }
}
EOF

  # 重启 Nginx 容器
  docker-compose restart nginx

  log "SSL 证书配置完成"
}

# 创建管理脚本
create_management_scripts() {
  log "创建管理脚本..."

  # 更新脚本
  cat >update.sh <<'EOF'
#!/bin/bash
set -e

echo "开始更新应用..."

# 拉取最新代码
git pull origin main

# 重新构建并启动服务
docker-compose build --no-cache
docker-compose up -d

echo "更新完成！"
EOF

  chmod +x update.sh

  # 备份脚本
  cat >backup.sh <<'EOF'
#!/bin/bash
BACKUP_DIR="backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# 备份数据库
docker-compose exec -T api cp /app/prisma/dev.db /app/data/backup.db
docker cp stock-info-collector-api:/app/data/backup.db $BACKUP_DIR/db_$DATE.db

# 备份配置文件
tar -czf $BACKUP_DIR/config_$DATE.tar.gz .env nginx/ monitoring/

# 删除7天前的备份
find $BACKUP_DIR -name "*.db" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "备份完成: $BACKUP_DIR"
EOF

  chmod +x backup.sh

  # 日志查看脚本
  cat >logs.sh <<'EOF'
#!/bin/bash
case "${1:-}" in
    "api")
        docker-compose logs -f api
        ;;
    "frontend")
        docker-compose logs -f frontend
        ;;
    "nginx")
        docker-compose logs -f nginx
        ;;
    "all")
        docker-compose logs -f
        ;;
    *)
        echo "使用方法: $0 {api|frontend|nginx|all}"
        exit 1
        ;;
esac
EOF

  chmod +x logs.sh

  log "管理脚本创建完成"
}

# 显示部署信息
show_deployment_info() {
  echo ""
  echo "🎉 Docker 部署完成！"
  echo ""
  echo "📋 部署信息:"
  echo "  应用名称: $APP_NAME"
  echo "  访问地址: http://$DOMAIN"
  echo "  API 地址: http://$DOMAIN/api"
  echo "  监控地址: http://$DOMAIN:9090"
  echo ""
  echo "🔧 管理命令:"
  echo "  查看状态: docker-compose ps"
  echo "  查看日志: ./logs.sh [api|frontend|nginx|all]"
  echo "  重启服务: docker-compose restart"
  echo "  停止服务: docker-compose down"
  echo "  更新应用: ./update.sh"
  echo "  备份应用: ./backup.sh"
  echo ""
  echo "📝 下一步:"
  echo "  1. 配置域名解析到服务器 IP"
  echo "  2. 运行 SSL 证书配置: ./docker-deploy.sh ssl"
  echo "  3. 访问应用并创建管理员账户"
  echo ""
}

# 主函数
main() {
  case "${1:-}" in
  "deploy")
    echo "🚀 股票信息收集器 - Docker 部署"
    echo "=================================="
    check_docker
    create_env_file
    setup_nginx_config
    setup_monitoring
    deploy_services
    create_management_scripts
    show_deployment_info
    ;;
  "ssl")
    setup_ssl
    ;;
  "update")
    deploy_services
    ;;
  "logs")
    docker-compose logs -f
    ;;
  "status")
    docker-compose ps
    ;;
  "stop")
    docker-compose down
    ;;
  "start")
    docker-compose up -d
    ;;
  "restart")
    docker-compose restart
    ;;
  *)
    echo "使用方法: $0 {deploy|ssl|update|logs|status|stop|start|restart}"
    echo ""
    echo "命令说明:"
    echo "  deploy   - 完整部署应用"
    echo "  ssl      - 配置SSL证书"
    echo "  update   - 更新应用"
    echo "  logs     - 查看日志"
    echo "  status   - 查看状态"
    echo "  stop     - 停止服务"
    echo "  start    - 启动服务"
    echo "  restart  - 重启服务"
    echo ""
    echo "注意事项:"
    echo "  1. 请先修改脚本中的域名配置"
    echo "  2. 确保域名已正确解析到服务器"
    echo "  3. 确保 Docker 和 Docker Compose 已安装"
    exit 1
    ;;
  esac
}

# 运行主函数
main "$@"
