#!/bin/bash

# 股票信息收集器 - 本地构建部署脚本
# 在本地构建前后端，然后上传到服务器

set -e

# 配置变量
SERVER_INFO="ubuntu@43.160.206.2" # 请修改为你的服务器信息
APP_DIR="/var/www/stock-info-collector"

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

# 检查本地环境
check_local_env() {
  log "检查本地环境..."

  # 检查 Node.js
  if ! command -v node &>/dev/null; then
    error "Node.js 未安装"
  fi

  # 检查 npm
  if ! command -v npm &>/dev/null; then
    error "npm 未安装"
  fi

  # 检查 git
  if ! command -v git &>/dev/null; then
    error "git 未安装"
  fi

  # 检查 ssh
  if ! command -v ssh &>/dev/null; then
    error "ssh 未安装"
  fi

  # 检查 scp
  if ! command -v scp &>/dev/null; then
    error "scp 未安装"
  fi

  info "本地环境检查完成"
}

# 构建前端
build_frontend() {
  log "构建前端..."

  cd frontend

  # 安装依赖
  log "安装前端依赖..."
  npm install

  # 构建
  log "构建前端应用..."
  npm run build

  # 检查构建结果
  if [[ ! -d "dist" ]]; then
    error "前端构建失败：dist 目录不存在"
  fi

  # 创建压缩包
  log "创建前端压缩包..."
  tar -czf ../frontend-dist.tar.gz dist/

  cd ..

  info "前端构建完成"
}

# 构建后端
build_backend() {
  log "构建后端..."

  cd backend

  # 安装依赖
  log "安装后端依赖..."
  npm install

  # 生成 Prisma 客户端
  log "生成 Prisma 客户端..."
  npx prisma generate

  # 创建压缩包（排除 node_modules 和 dev.db）
  log "创建后端压缩包..."
  tar -czf ../backend-dist.tar.gz \
    --exclude='node_modules' \
    --exclude='prisma/dev.db' \
    --exclude='*.log' \
    .

  cd ..

  info "后端构建完成"
}

# 创建部署包
create_deployment_package() {
  log "创建部署包..."

  # 创建部署目录
  mkdir -p deployment-package

  # 复制前端文件
  tar -xzf frontend-dist.tar.gz -C deployment-package/

  # 复制后端文件
  mkdir -p deployment-package/backend
  tar -xzf backend-dist.tar.gz -C deployment-package/backend/

  # 复制配置文件
  cp scripts/deploy-server.sh deployment-package/
  cp scripts/quick-deploy.sh deployment-package/
  cp scripts/emergency-build.sh deployment-package/
  cp scripts/low-memory-build.sh deployment-package/
  cp scripts/clean-deploy.sh deployment-package/
  cp docker-compose.yml deployment-package/
  cp DEPLOYMENT.md deployment-package/
  cp DEPLOYMENT_GUIDE.md deployment-package/
  cp README.md deployment-package/

  # 创建环境变量模板
  cat >deployment-package/.env.template <<EOF
# 数据库配置
DATABASE_URL="file:./dev.db"

# JWT配置
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="7d"

# 服务器配置
PORT=3000
NODE_ENV=production

# 跨域配置
CORS_ORIGIN="https://your-domain.com"

# 日志配置
LOG_LEVEL="info"

# 超级管理员配置
SUPER_ADMIN_EMAIL="admin@example.com"
SUPER_ADMIN_PASSWORD="admin123"
SUPER_ADMIN_NAME="Super Administrator"
EOF

  # 创建部署包
  tar -czf stock-info-collector-deployment.tar.gz deployment-package/

  # 清理临时文件
  rm -rf deployment-package/
  rm -f frontend-dist.tar.gz backend-dist.tar.gz

  info "部署包创建完成: stock-info-collector-deployment.tar.gz"
}

# 上传到服务器
upload_to_server() {
  log "上传到服务器..."

  # 上传部署包
  log "上传部署包..."
  scp stock-info-collector-deployment.tar.gz $SERVER_INFO:/tmp/

  # 在服务器上部署
  log "在服务器上部署..."
  ssh $SERVER_INFO <<'EOF'
        # 停止现有服务
        pm2 stop stock-info-collector-api 2>/dev/null || true
        pm2 delete stock-info-collector-api 2>/dev/null || true
        
        # 备份现有部署
        if [[ -d "/var/www/stock-info-collector" ]]; then
            echo "备份现有部署..."
            sudo cp -r /var/www/stock-info-collector /var/www/stock-info-collector.backup.$(date +%Y%m%d_%H%M%S)
        fi
        
        # 清理现有目录
        sudo rm -rf /var/www/stock-info-collector
        
        # 创建新目录
        sudo mkdir -p /var/www/stock-info-collector
        sudo chown ubuntu:ubuntu /var/www/stock-info-collector
        
        # 解压部署包
        cd /var/www/stock-info-collector
        tar -xzf /tmp/stock-info-collector-deployment.tar.gz
        mv deployment-package/* .
        mv deployment-package/.* . 2>/dev/null || true
        rmdir deployment-package
        
        # 设置权限
        sudo chown -R ubuntu:ubuntu /var/www/stock-info-collector
        
        # 安装后端依赖
        cd backend
        npm install --production
        
        # 初始化数据库
        npx prisma generate
        npx prisma db push
        
        # 创建超级管理员
        if [[ -f "create-super-admin-config.js" ]]; then
            node create-super-admin-config.js
        fi
        
        # 配置环境变量
        if [[ ! -f "../.env" ]]; then
            cp ../.env.template ../.env
            echo "请编辑 .env 文件配置环境变量"
        fi
        
        # 配置 PM2
        cd ..
        cat > ecosystem.config.js << 'PM2CONFIG'
module.exports = {
  apps: [{
    name: 'stock-info-collector-api',
    script: './backend/src/index.ts',
    cwd: '/var/www/stock-info-collector/backend',
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
PM2CONFIG
        
        # 创建日志目录
        sudo mkdir -p /var/log/pm2
        sudo chown ubuntu:ubuntu /var/log/pm2
        
        # 启动应用
        pm2 start ecosystem.config.js
        pm2 save
        pm2 startup
        
        # 配置 Nginx
        sudo tee /etc/nginx/sites-available/stock-info-collector << 'NGINXCONFIG'
server {
    listen 80;
    server_name 43.160.206.2;
    
    # 前端静态文件
    location / {
        root /var/www/stock-info-collector/frontend/dist;
        try_files $uri $uri/ /index.html;
        
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
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
    
    # 健康检查
    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }
}
NGINXCONFIG
        
        # 启用站点
        sudo ln -sf /etc/nginx/sites-available/stock-info-collector /etc/nginx/sites-enabled/
        sudo nginx -t
        sudo systemctl restart nginx
        
        # 清理临时文件
        rm -f /tmp/stock-info-collector-deployment.tar.gz
        
        echo "部署完成！"
        echo "访问地址: http://43.160.206.2"
        echo "API 地址: http://43.160.206.2/api"
EOF

  info "部署完成"
}

# 显示部署信息
show_deployment_info() {
  echo ""
  echo "🎉 本地构建部署完成！"
  echo ""
  echo "📋 部署信息:"
  echo "  服务器: $SERVER_INFO"
  echo "  应用目录: $APP_DIR"
  echo "  访问地址: http://43.160.206.2"
  echo "  API 地址: http://43.160.206.2/api"
  echo ""
  echo "🔧 管理命令:"
  echo "  查看状态: ssh $SERVER_INFO 'pm2 status'"
  echo "  查看日志: ssh $SERVER_INFO 'pm2 logs stock-info-collector-api'"
  echo "  重启应用: ssh $SERVER_INFO 'pm2 restart stock-info-collector-api'"
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
  echo "🚀 股票信息收集器 - 本地构建部署"
  echo "=================================="

  # 检查参数
  if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    echo "使用方法: $0 [--help]"
    echo ""
    echo "选项:"
    echo "  --help, -h    显示帮助信息"
    echo ""
    echo "此脚本将在本地构建前后端，然后上传到服务器"
    exit 0
  fi

  # 检查是否在正确的目录
  if [[ ! -f "package.json" ]]; then
    error "请在项目根目录运行此脚本"
  fi

  # 执行部署步骤
  check_local_env
  build_frontend
  build_backend
  create_deployment_package
  upload_to_server
  show_deployment_info
}

# 运行主函数
main "$@"
