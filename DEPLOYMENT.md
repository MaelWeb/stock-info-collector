# 股票信息收集器 - 生产环境部署文档

## 📋 目录

- [系统要求](#系统要求)
- [服务器准备](#服务器准备)
- [环境配置](#环境配置)
- [应用部署](#应用部署)
- [服务配置](#服务配置)
- [SSL 证书配置](#ssl证书配置)
- [监控和维护](#监控和维护)
- [更新部署](#更新部署)
- [故障排除](#故障排除)

## 🖥️ 系统要求

### 最低配置

- **CPU**: 1 核
- **内存**: 2GB RAM
- **存储**: 50GB SSD
- **操作系统**: Ubuntu 20.04 LTS 或 CentOS 8
- **网络**: 公网 IP，开放 80/443 端口

### 推荐配置

- **CPU**: 2 核
- **内存**: 4GB RAM
- **存储**: 100GB SSD
- **操作系统**: Ubuntu 22.04 LTS
- **网络**: 公网 IP，开放 80/443 端口

## 🚀 服务器准备

### 1. 系统更新

```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

### 2. 安装基础软件

```bash
# Ubuntu/Debian
sudo apt install -y curl wget git vim htop nginx

# CentOS/RHEL
sudo yum install -y curl wget git vim htop nginx
```

### 3. 安装 Node.js

```bash
# 使用 NodeSource 仓库安装 Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version
npm --version
```

### 4. 安装 PM2

```bash
sudo npm install -g pm2
```

## ⚙️ 环境配置

### 1. 创建应用目录

```bash
sudo mkdir -p /var/www/stock-info-collector
sudo chown $USER:$USER /var/www/stock-info-collector
```

### 2. 配置环境变量

```bash
# 创建环境变量文件
cat > /var/www/stock-info-collector/.env << EOF
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
EOF
```

### 3. 配置防火墙

```bash
# Ubuntu/Debian
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# CentOS/RHEL
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

## 📦 应用部署

### 1. 克隆代码

```bash
cd /var/www/stock-info-collector
git clone https://github.com/your-username/stock-info-collector.git .
```

### 2. 安装依赖

```bash
# 安装后端依赖
cd backend
npm install --production

# 安装前端依赖
cd ../frontend
npm install --production
```

### 3. 构建前端

```bash
cd /var/www/stock-info-collector/frontend
npm run build
```

### 4. 数据库初始化

```bash
cd /var/www/stock-info-collector/backend
npx prisma generate
npx prisma db push
```

### 5. 创建超级管理员

```bash
cd /var/www/stock-info-collector/backend
node create-super-admin-config.js
```

## 🔧 服务配置

### 1. PM2 配置

```bash
# 创建 PM2 配置文件
cat > /var/www/stock-info-collector/ecosystem.config.js << EOF
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
EOF

# 创建日志目录
sudo mkdir -p /var/log/pm2
sudo chown $USER:$USER /var/log/pm2
```

### 2. Nginx 配置

```bash
# 创建 Nginx 配置文件
sudo tee /etc/nginx/sites-available/stock-info-collector << EOF
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # 重定向到 HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL 配置 (稍后配置)
    # ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # 前端静态文件
    location / {
        root /var/www/stock-info-collector/frontend/dist;
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
sudo ln -s /etc/nginx/sites-available/stock-info-collector /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 3. 启动应用

```bash
cd /var/www/stock-info-collector
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 🔒 SSL 证书配置

### 1. 安装 Certbot

```bash
# Ubuntu/Debian
sudo apt install -y certbot python3-certbot-nginx

# CentOS/RHEL
sudo yum install -y certbot python3-certbot-nginx
```

### 2. 获取 SSL 证书

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### 3. 自动续期

```bash
# 测试自动续期
sudo certbot renew --dry-run

# 添加到 crontab
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

## 📊 监控和维护

### 1. 系统监控

```bash
# 安装监控工具
sudo apt install -y htop iotop nethogs

# 查看系统状态
htop
df -h
free -h
```

### 2. 应用监控

```bash
# PM2 监控
pm2 monit
pm2 logs
pm2 status

# 查看应用状态
pm2 show stock-info-collector-api
```

### 3. 日志管理

```bash
# 查看 Nginx 日志
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# 查看应用日志
pm2 logs stock-info-collector-api
```

### 4. 备份策略

```bash
# 创建备份脚本
cat > /var/www/stock-info-collector/backup.sh << 'EOF'
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

chmod +x /var/www/stock-info-collector/backup.sh

# 添加到 crontab (每天凌晨2点备份)
echo "0 2 * * * /var/www/stock-info-collector/backup.sh" | crontab -
```

## 🔄 更新部署

### 1. 自动更新脚本

```bash
cat > /var/www/stock-info-collector/deploy.sh << 'EOF'
#!/bin/bash
set -e

APP_DIR="/var/www/stock-info-collector"
LOG_FILE="/var/log/deploy.log"

echo "$(date): Starting deployment..." >> $LOG_FILE

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
    echo "$(date): Deployment successful" >> $LOG_FILE
    echo "Deployment completed successfully!"
else
    echo "$(date): Deployment failed" >> $LOG_FILE
    echo "Deployment failed! Rolling back..."

    # 回滚
    pm2 restart stock-info-collector-api
    exit 1
fi
EOF

chmod +x /var/www/stock-info-collector/deploy.sh
```

### 2. 手动更新步骤

```bash
# 1. 进入应用目录
cd /var/www/stock-info-collector

# 2. 拉取最新代码
git pull origin main

# 3. 安装依赖
cd backend && npm install --production
cd ../frontend && npm install --production

# 4. 构建前端
npm run build

# 5. 数据库迁移
cd ../backend
npx prisma generate
npx prisma db push

# 6. 重启应用
cd ..
pm2 restart stock-info-collector-api

# 7. 检查状态
pm2 status
```

## 🛠️ 故障排除

### 1. 常见问题

#### 应用无法启动

```bash
# 检查日志
pm2 logs stock-info-collector-api

# 检查端口占用
sudo netstat -tlnp | grep :3000

# 检查环境变量
cat /var/www/stock-info-collector/.env
```

#### 数据库连接问题

```bash
# 检查数据库文件权限
ls -la /var/www/stock-info-collector/backend/prisma/

# 重新生成数据库
cd /var/www/stock-info-collector/backend
npx prisma db push --force-reset
```

#### Nginx 配置问题

```bash
# 检查配置语法
sudo nginx -t

# 查看错误日志
sudo tail -f /var/log/nginx/error.log

# 重启 Nginx
sudo systemctl restart nginx
```

### 2. 性能优化

#### 启用 Gzip 压缩

```bash
# 在 Nginx 配置中添加
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
```

#### 启用缓存

```bash
# 在 Nginx 配置中添加
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 3. 安全加固

#### 防火墙配置

```bash
# 只开放必要端口
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

#### 定期安全更新

```bash
# 添加到 crontab
echo "0 3 * * 0 /usr/bin/apt update && /usr/bin/apt upgrade -y" | sudo crontab -
```

## 📞 技术支持

### 联系信息

- **项目维护者**: [Your Name]
- **邮箱**: [your-email@example.com]
- **GitHub**: [https://github.com/your-username/stock-info-collector]

### 日志文件位置

- **应用日志**: `/var/log/pm2/`
- **Nginx 日志**: `/var/log/nginx/`
- **系统日志**: `/var/log/syslog`

### 重要文件位置

- **应用目录**: `/var/www/stock-info-collector/`
- **配置文件**: `/var/www/stock-info-collector/.env`
- **Nginx 配置**: `/etc/nginx/sites-available/stock-info-collector`
- **PM2 配置**: `/var/www/stock-info-collector/ecosystem.config.js`

---

**注意**: 请根据实际情况修改域名、邮箱等配置信息。
