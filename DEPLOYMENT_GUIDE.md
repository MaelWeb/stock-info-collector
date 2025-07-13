# 🚀 股票信息收集器 - 部署指南快速参考

## 📋 部署方式选择

### 1. 传统部署 (推荐新手)

- **适用场景**: 单服务器部署，简单维护
- **优势**: 配置简单，资源占用少，易于调试
- **文件**: `scripts/deploy.sh`, `scripts/quick-deploy.sh`

### 2. Docker 部署 (推荐生产)

- **适用场景**: 生产环境，多服务器部署
- **优势**: 环境隔离，易于扩展，版本控制
- **文件**: `docker-compose.yml`, `scripts/docker-deploy.sh`

## 🛠️ 快速开始

### 方式一：一键部署 (推荐)

```bash
# 1. 下载脚本
wget https://raw.githubusercontent.com/MaelWeb/stock-info-collector/main/scripts/quick-deploy.sh

# 2. 修改域名配置
sed -i 's/your-domain.com/your-actual-domain.com/g' quick-deploy.sh

# 3. 运行部署
chmod +x quick-deploy.sh
./quick-deploy.sh
```

### 方式二：Docker 部署

```bash
# 1. 克隆项目
git clone https://github.com/MaelWeb/stock-info-collector.git
cd stock-info-collector

# 2. 修改域名配置
sed -i 's/your-domain.com/your-actual-domain.com/g' scripts/docker-deploy.sh

# 3. 运行部署
chmod +x scripts/docker-deploy.sh
./scripts/docker-deploy.sh deploy
```

## 📝 部署前准备

### 服务器要求

- **CPU**: 1-2 核
- **内存**: 2-4GB RAM
- **存储**: 50-100GB SSD
- **系统**: Ubuntu 20.04+ / CentOS 8+
- **网络**: 公网 IP，开放 80/443 端口

### 域名准备

1. 购买域名 (推荐: 阿里云、腾讯云、Cloudflare)
2. 配置 DNS 解析到服务器 IP
3. 等待 DNS 生效 (通常 5-30 分钟)

### 服务器准备

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装基础工具
sudo apt install -y curl wget git vim htop

# 配置防火墙
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## 🔧 部署步骤

### 传统部署流程

```bash
# 1. 系统检查
./scripts/deploy.sh status

# 2. 完整安装
./scripts/deploy.sh install

# 3. 配置SSL (需要域名)
./scripts/deploy.sh ssl

# 4. 检查状态
./scripts/deploy.sh status
```

### Docker 部署流程

```bash
# 1. 检查Docker环境
./scripts/docker-deploy.sh

# 2. 部署应用
./scripts/docker-deploy.sh deploy

# 3. 配置SSL (需要域名)
./scripts/docker-deploy.sh ssl

# 4. 检查状态
./scripts/docker-deploy.sh status
```

## 🔄 日常维护

### 更新应用

```bash
# 传统部署
./scripts/deploy.sh update

# Docker 部署
./scripts/docker-deploy.sh update
```

### 备份数据

```bash
# 传统部署
./scripts/deploy.sh backup

# Docker 部署
./backup.sh
```

### 查看日志

```bash
# 传统部署
pm2 logs stock-info-collector-api
sudo tail -f /var/log/nginx/access.log

# Docker 部署
./logs.sh api
./logs.sh nginx
```

### 重启服务

```bash
# 传统部署
./scripts/deploy.sh restart

# Docker 部署
./scripts/docker-deploy.sh restart
```

## 🛡️ 安全配置

### SSL 证书配置

```bash
# 自动配置 (推荐)
./scripts/deploy.sh ssl

# 手动配置
sudo certbot --nginx -d your-domain.com
```

### 防火墙配置

```bash
# 只开放必要端口
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### 定期更新

```bash
# 添加到 crontab
echo "0 3 * * 0 /usr/bin/apt update && /usr/bin/apt upgrade -y" | sudo crontab -
```

## 📊 监控和维护

### 系统监控

```bash
# 查看系统状态
htop
df -h
free -h

# 查看应用状态
pm2 status
docker-compose ps
```

### 性能优化

```bash
# 启用 Gzip 压缩 (已在配置中)
# 启用缓存 (已在配置中)
# 配置 CDN (可选)
```

### 日志管理

```bash
# 日志轮转
sudo logrotate -f /etc/logrotate.conf

# 清理旧日志
sudo find /var/log -name "*.log" -mtime +30 -delete
```

## 🚨 故障排除

### 常见问题

#### 1. 应用无法启动

```bash
# 检查日志
pm2 logs stock-info-collector-api
docker-compose logs api

# 检查端口占用
sudo netstat -tlnp | grep :3000

# 检查环境变量
cat /var/www/stock-info-collector/.env
```

#### 2. 数据库连接问题

```bash
# 检查数据库文件
ls -la /var/www/stock-info-collector/backend/prisma/

# 重新初始化数据库
cd /var/www/stock-info-collector/backend
npx prisma db push --force-reset
```

#### 3. Nginx 配置问题

```bash
# 检查配置语法
sudo nginx -t

# 查看错误日志
sudo tail -f /var/log/nginx/error.log

# 重启 Nginx
sudo systemctl restart nginx
```

#### 4. SSL 证书问题

```bash
# 检查证书状态
sudo certbot certificates

# 手动续期
sudo certbot renew

# 重新获取证书
sudo certbot --nginx -d your-domain.com --force-renewal
```

### 性能问题

#### 1. 内存不足

```bash
# 增加 swap 空间
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

#### 2. 磁盘空间不足

```bash
# 清理日志
sudo find /var/log -name "*.log" -mtime +7 -delete

# 清理 Docker (如果使用)
docker system prune -a

# 清理 npm 缓存
npm cache clean --force
```

## 📞 技术支持

### 联系信息

- **项目地址**: https://github.com/MaelWeb/stock-info-collector
- **问题反馈**: 提交 GitHub Issue
- **文档地址**: https://github.com/MaelWeb/stock-info-collector/wiki

### 重要文件位置

#### 传统部署

- **应用目录**: `/var/www/stock-info-collector/`
- **配置文件**: `/var/www/stock-info-collector/.env`
- **Nginx 配置**: `/etc/nginx/sites-available/stock-info-collector`
- **PM2 配置**: `/var/www/stock-info-collector/ecosystem.config.js`
- **日志文件**: `/var/log/pm2/`, `/var/log/nginx/`

#### Docker 部署

- **应用目录**: 项目根目录
- **配置文件**: `.env`
- **Docker 配置**: `docker-compose.yml`
- **Nginx 配置**: `nginx/conf.d/`
- **日志文件**: `docker-compose logs`

### 紧急恢复

```bash
# 1. 停止服务
./scripts/deploy.sh stop
# 或
docker-compose down

# 2. 恢复备份
cp /var/backups/stock-info-collector/db_YYYYMMDD_HHMMSS.db /var/www/stock-info-collector/backend/prisma/dev.db

# 3. 重启服务
./scripts/deploy.sh start
# 或
docker-compose up -d
```

---

**注意**: 请根据实际情况修改域名、邮箱等配置信息。如有问题，请查看详细文档 `DEPLOYMENT.md`。
