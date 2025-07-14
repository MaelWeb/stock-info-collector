# 股票信息收集器 - 部署指南

## 概述

本项目提供了两个主要的部署脚本：

1. **`scripts/quick-deploy.sh`** - 完整部署脚本（首次部署或重新部署）
2. **`scripts/update-deploy.sh`** - 更新部署脚本（保护现有配置的更新）

## 部署模式

### 1. 本地编译上传模式

适用于在本地机器上编译，然后上传到服务器部署。

```bash
# 在本地机器上运行
./scripts/quick-deploy.sh --local-build
```

**特点：**

- 在本地编译前端，减少服务器负载
- 需要配置 SSH 密钥访问服务器
- 适合内存较小的服务器

### 2. 服务器编译模式

适用于直接在服务器上编译和部署。

```bash
# 在服务器上运行
./scripts/quick-deploy.sh --server-build
# 或者直接运行（默认服务器模式）
./scripts/quick-deploy.sh
```

**特点：**

- 在服务器上直接编译
- 需要服务器有足够的内存（建议 2GB+）
- 适合高配置服务器

## 部署脚本详解

### 完整部署脚本 (`quick-deploy.sh`)

#### 功能特性

✅ **智能配置保护**

- 检测现有 `.env` 文件，避免覆盖
- 只更新必要的配置项（如域名）
- 保护现有数据库和用户数据

✅ **数据库安全**

- 检测现有数据库，避免重新初始化
- 只在首次部署时创建超级管理员
- 使用备份标记避免重复创建

✅ **Nginx 配置保护**

- 检测现有 Nginx 配置
- 只更新域名和路径配置
- 自动备份现有配置

✅ **PM2 路径修复**

- 修复了 PM2 启动路径错误
- 正确的脚本路径：`./src/index.ts`

#### 使用场景

- **首次部署**：全新服务器环境
- **重新部署**：需要完全重置环境
- **配置更新**：更新域名等配置

#### 执行流程

1. 交互式配置获取
2. 系统要求检查
3. 目录创建
4. 环境变量配置（保护现有配置）
5. 代码部署
6. 数据库初始化（保护现有数据）
7. PM2 配置
8. Nginx 配置（保护现有配置）
9. 管理脚本创建
10. 部署验证

### 更新部署脚本 (`update-deploy.sh`)

#### 功能特性

✅ **配置文件保护**

- 自动备份现有配置文件
- 更新后恢复所有配置
- 保护数据库和用户数据

✅ **增量更新**

- 只更新代码，不重新初始化
- 保留所有现有配置
- 自动备份便于回滚

✅ **安全验证**

- 部署前检查现有环境
- 部署后验证服务状态
- 详细的错误处理

#### 使用场景

- **代码更新**：获取最新功能
- **安全补丁**：应用安全更新
- **性能优化**：部署性能改进

#### 执行流程

1. 检查现有部署
2. 备份现有部署
3. 保护配置文件
4. 更新代码
5. 更新后端依赖
6. 更新前端构建
7. 恢复配置文件
8. 重启服务
9. 验证部署

## 部署前准备

### 服务器要求

- **操作系统**：Ubuntu 20.04+ 或 CentOS 7+
- **内存**：最低 1GB，推荐 2GB+
- **存储**：至少 5GB 可用空间
- **网络**：开放 80 和 443 端口

### 必要软件

```bash
# 安装 Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 Nginx
sudo apt-get install -y nginx

# 安装 PM2
sudo npm install -g pm2

# 安装 Git
sudo apt-get install -y git
```

### SSH 配置（本地编译模式）

```bash
# 生成 SSH 密钥
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"

# 复制公钥到服务器
ssh-copy-id ubuntu@your-server-ip
```

## 部署步骤

### 首次部署

1. **克隆项目**

```bash
git clone https://github.com/MaelWeb/stock-info-collector.git
cd stock-info-collector
```

2. **选择部署模式**

   **本地编译模式：**

   ```bash
   ./scripts/quick-deploy.sh --local-build
   ```

   **服务器编译模式：**

   ```bash
   ./scripts/quick-deploy.sh --server-build
   ```

3. **按提示配置**

   - 输入服务器 IP 地址
   - 选择域名配置方式
   - 确认配置信息

4. **等待部署完成**
   - 脚本会自动执行所有部署步骤
   - 完成后显示访问信息

### 后续更新

```bash
# 使用更新脚本（推荐）
./scripts/update-deploy.sh

# 或者使用完整部署脚本（会保护配置）
./scripts/quick-deploy.sh --server-build
```

## 配置管理

### 环境变量

配置文件位置：`/var/www/stock-info-collector/.env`

**重要配置项：**

```bash
# 数据库配置
DATABASE_URL="file:./dev.db"

# JWT 配置
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"

# 服务器配置
PORT=3000
NODE_ENV=production

# 跨域配置
CORS_ORIGIN="https://your-domain.com"
```

### Nginx 配置

配置文件位置：`/etc/nginx/sites-available/stock-info-collector`

**自动配置项：**

- 域名设置
- 静态文件路径
- API 代理配置
- 缓存策略

### 数据库管理

**位置：** `/var/www/stock-info-collector/backend/prisma/dev.db`

**备份命令：**

```bash
# 手动备份
cp /var/www/stock-info-collector/backend/prisma/dev.db /backup/db_$(date +%Y%m%d_%H%M%S).db

# 使用内置备份脚本
/var/www/stock-info-collector/backup.sh
```

## 服务管理

### PM2 管理

```bash
# 查看应用状态
pm2 status

# 查看日志
pm2 logs stock-info-collector-api

# 重启应用
pm2 restart stock-info-collector-api

# 停止应用
pm2 stop stock-info-collector-api

# 删除应用
pm2 delete stock-info-collector-api
```

### Nginx 管理

```bash
# 检查配置
sudo nginx -t

# 重启服务
sudo systemctl restart nginx

# 查看状态
sudo systemctl status nginx

# 查看日志
sudo tail -f /var/log/nginx/error.log
```

## 故障排除

### 常见问题

#### 1. PM2 启动失败

**错误：** `Script not found: /var/www/stock-info-collector/backend/backend/src/index.ts`

**解决方案：**

- 检查脚本路径是否正确
- 确认 `backend/src/index.ts` 文件存在
- 重新运行部署脚本

#### 2. 数据库连接失败

**错误：** `Database connection failed`

**解决方案：**

- 检查 `.env` 文件中的 `DATABASE_URL`
- 确认数据库文件权限
- 运行 `npx prisma db push` 重新初始化

#### 3. 前端构建失败

**错误：** `JavaScript heap out of memory`

**解决方案：**

- 增加 Node.js 内存限制：`export NODE_OPTIONS="--max-old-space-size=4096"`
- 使用低内存构建脚本
- 检查服务器内存使用情况

#### 4. Nginx 配置错误

**错误：** `nginx: configuration file test failed`

**解决方案：**

- 检查 Nginx 配置文件语法
- 确认域名配置正确
- 检查文件路径是否存在

### 日志查看

```bash
# PM2 日志
pm2 logs stock-info-collector-api --lines 100

# Nginx 访问日志
sudo tail -f /var/log/nginx/access.log

# Nginx 错误日志
sudo tail -f /var/log/nginx/error.log

# 系统日志
sudo journalctl -u nginx -f
```

### 回滚操作

```bash
# 1. 停止当前服务
pm2 stop stock-info-collector-api

# 2. 恢复备份
sudo cp -r /var/www/stock-info-collector.backup.YYYYMMDD_HHMMSS/* /var/www/stock-info-collector/

# 3. 重启服务
pm2 start stock-info-collector-api
sudo systemctl restart nginx
```

## 安全建议

### SSL 证书

```bash
# 安装 Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# 获取 SSL 证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo crontab -e
# 添加：0 12 * * * /usr/bin/certbot renew --quiet
```

### 防火墙配置

```bash
# 安装 UFW
sudo apt-get install -y ufw

# 配置防火墙规则
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 定期备份

```bash
# 设置自动备份
sudo crontab -e
# 添加：0 2 * * * /var/www/stock-info-collector/backup.sh
```

## 性能优化

### 前端优化

- 启用 Gzip 压缩
- 配置静态资源缓存
- 使用 CDN 加速

### 后端优化

- 配置 PM2 集群模式
- 启用数据库索引
- 优化 API 响应时间

### 服务器优化

- 调整 Nginx 工作进程数
- 配置系统内存限制
- 监控资源使用情况

## 监控和维护

### 健康检查

```bash
# API 健康检查
curl http://your-domain.com/api/health

# 前端访问测试
curl -I http://your-domain.com
```

### 性能监控

```bash
# 查看系统资源
htop
df -h
free -h

# 查看网络连接
netstat -tlnp
ss -tlnp
```

### 定期维护

- 每周检查日志文件
- 每月更新系统包
- 每季度备份数据
- 每年更新 SSL 证书

## 联系支持

如果遇到部署问题，请：

1. 查看相关日志文件
2. 检查系统资源使用情况
3. 确认配置文件正确性
4. 参考故障排除章节
5. 提交 Issue 到 GitHub 仓库

---

**注意：** 本指南基于最新的部署脚本编写，请确保使用最新版本的脚本进行部署。
