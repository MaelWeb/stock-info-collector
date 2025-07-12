# Stock Info Collector - AI 驱动的股票投资分析系统

一个基于大模型 API 的智能股票分析系统，每天自动收集和分析股票数据，提供 AI 驱动的投资建议。

## 🚀 功能特性

### 核心功能

- **自动数据收集**: 每天上午 9 点自动收集股票数据
- **AI 智能分析**: 集成多种大模型 API（OpenAI、Anthropic、Gemini、Ollama 等）
- **技术指标计算**: 自动计算 RSI、MACD、移动平均线等技术指标
- **投资建议生成**: 基于 AI 分析生成买入/卖出/持有建议
- **自定义关注列表**: 支持用户添加和管理关注的股票
- **实时价格监控**: 获取实时股票价格和历史数据

### 支持的 AI 模型

- **OpenAI GPT**: GPT-3.5-turbo, GPT-4
- **Anthropic Claude**: Claude-3 系列模型
- **Google Gemini**: Gemini Pro
- **Ollama**: 本地部署的开源模型
- **Hugging Face**: 开源模型 API

### 数据源

- **Alpha Vantage**: 免费股票数据 API
- **Yahoo Finance**: 实时股票数据
- **本地缓存**: 自动缓存数据减少 API 调用

## 🏗️ 技术架构

### 后端技术栈

- **Node.js + TypeScript**: 类型安全的服务器端开发
- **Fastify**: 高性能 Web 框架
- **Prisma**: 现代化 ORM，支持 SQLite/PostgreSQL
- **node-cron**: 定时任务调度
- **Zod**: 运行时类型验证
- **Axios**: HTTP 客户端

### 前端技术栈

- **React 18 + TypeScript**: 现代化的前端框架
- **Ant Design 5**: 企业级 UI 组件库
- **React Query**: 数据获取和缓存
- **React Router**: 客户端路由
- **Vite**: 快速的构建工具
- **Ant Design Charts**: 数据可视化图表

### 数据库设计

- **Stock**: 股票基本信息
- **StockPrice**: 历史价格数据
- **TechnicalIndicator**: 技术指标数据
- **Recommendation**: AI 投资建议
- **WatchlistItem**: 用户关注列表
- **User**: 用户管理（预留）

## 📦 安装和配置

### 1. 克隆项目

```bash
git clone <repository-url>
cd stock-info-collector
```

### 2. 安装依赖

```bash
# 安装所有依赖（推荐）
npm run install:all

# 或者分别安装
npm run install:backend
npm run install:frontend
```

### 3. 环境配置

复制环境变量模板并配置：

```bash
cd backend
cp env.example .env
```

编辑 `.env` 文件，配置必要的 API 密钥：

```env
# 数据库配置
DATABASE_URL="file:./dev.db"

# 服务器配置
PORT=3001
NODE_ENV=development

# 股票数据API（至少配置一个）
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_api_key
YAHOO_FINANCE_API_KEY=your_yahoo_finance_api_key

# AI模型配置（至少配置一个）
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
GEMINI_API_KEY=your_gemini_api_key
OLLAMA_BASE_URL=http://localhost:11434
HUGGINGFACE_API_KEY=your_huggingface_api_key

# 定时任务配置
DAILY_ANALYSIS_TIME="0 9 * * *"  # 每天上午9点
```

### 4. 数据库初始化

```bash
# 一键设置（推荐）
npm run setup

# 或者手动设置
npm run setup:db
```

### 5. 启动服务

```bash
# 同时启动前后端（推荐）
npm run dev

# 或者分别启动
npm run dev:backend  # 后端服务
npm run dev:frontend # 前端服务
```

前端应用将在 `http://localhost:3000` 启动，后端 API 在 `http://localhost:3001`。

## 🔧 API 文档

启动服务后，访问 `http://localhost:3001/docs` 查看完整的 API 文档。

### 主要 API 端点

#### 股票相关

- `GET /api/stocks/search?query=AAPL` - 搜索股票
- `GET /api/stocks/:symbol` - 获取股票详情
- `GET /api/stocks/:symbol/prices?days=30` - 获取价格历史
- `GET /api/stocks/:symbol/price` - 获取当前价格
- `GET /api/stocks/popular` - 获取热门股票

#### 投资建议

- `GET /api/recommendations` - 获取投资建议列表
- `GET /api/recommendations/today` - 获取今日推荐
- `GET /api/recommendations/stats` - 获取推荐统计
- `GET /api/recommendations/:id` - 获取推荐详情

#### 关注列表

- `GET /api/watchlist` - 获取关注列表
- `POST /api/watchlist` - 添加股票到关注列表
- `DELETE /api/watchlist/:id` - 从关注列表删除
- `GET /api/watchlist/check/:symbol` - 检查是否已关注

#### 分析功能

- `GET /api/analysis/status` - 获取分析服务状态
- `POST /api/analysis/trigger` - 手动触发分析
- `POST /api/analysis/stock/:symbol` - 分析单个股票
- `GET /api/analysis/history` - 获取分析历史

## 🎯 使用示例

### 1. 搜索股票

```bash
curl "http://localhost:3001/api/stocks/search?query=AAPL"
```

### 2. 获取股票详情

```bash
curl "http://localhost:3001/api/stocks/AAPL"
```

### 3. 添加股票到关注列表

```bash
curl -X POST "http://localhost:3001/api/watchlist" \
  -H "Content-Type: application/json" \
  -d '{"symbol": "AAPL", "notes": "Apple Inc."}'
```

### 4. 手动分析股票

```bash
curl -X POST "http://localhost:3001/api/analysis/stock/AAPL"
```

### 5. 获取今日推荐

```bash
curl "http://localhost:3001/api/recommendations/today"
```

## 🔄 定时任务

系统配置了以下定时任务：

- **每日分析**: 每天上午 9 点自动分析股票并生成投资建议
- **数据更新**: 自动更新股票价格和技术指标
- **缓存清理**: 定期清理过期数据

可以通过环境变量 `DAILY_ANALYSIS_TIME` 自定义定时任务执行时间。

## 🛠️ 开发指南

### 项目结构

```
stock-info-collector/
├── backend/                 # 后端服务
│   ├── src/
│   │   ├── config/         # 配置管理
│   │   ├── lib/           # 工具库
│   │   ├── routes/        # API路由
│   │   ├── services/      # 业务服务
│   │   └── index.ts       # 服务入口
│   ├── prisma/            # 数据库模型
│   └── package.json
├── frontend/              # 前端应用
├── shared/               # 共享类型定义
└── README.md
```

### 开发命令

```bash
# 后端开发
cd backend
npm run dev          # 开发模式
npm run build        # 构建
npm run test         # 运行测试
npm run lint         # 代码检查
npm run format       # 代码格式化

# 前端开发
cd frontend
npm run dev          # 开发模式
npm run build        # 构建
npm run test         # 运行测试
npm run lint         # 代码检查
npm run type-check   # 类型检查

# 数据库管理
npx prisma studio    # 数据库管理界面
npx prisma generate  # 生成Prisma客户端
npx prisma db push   # 推送数据库变更
```

### 添加新的 AI 模型

1. 在 `src/config/index.ts` 中添加新模型配置
2. 在 `src/services/aiAnalysisService.ts` 中实现新模型的调用逻辑
3. 更新 `getAvailableAIModels()` 函数

### 添加新的技术指标

1. 在 `src/services/schedulerService.ts` 中实现指标计算逻辑
2. 更新数据库模型（如需要）
3. 在定时任务中调用新的指标计算

## 🔒 安全考虑

- **API 密钥管理**: 使用环境变量管理敏感信息
- **请求限流**: 实现了基于 IP 的请求限流
- **输入验证**: 使用 Zod 进行严格的输入验证
- **错误处理**: 避免在响应中泄露敏感信息
- **CORS 配置**: 可配置的跨域访问控制

## 📊 性能优化

- **数据库索引**: 为常用查询字段添加索引
- **数据缓存**: 缓存股票数据减少 API 调用
- **批量操作**: 支持批量获取和分析股票
- **连接池**: 数据库连接池优化
- **异步处理**: 使用异步操作提高响应速度

## 🚀 部署

### Docker 部署

```bash
# 构建镜像
docker build -t stock-info-collector .

# 运行容器
docker run -p 3001:3001 --env-file .env stock-info-collector
```

### 生产环境配置

1. 设置 `NODE_ENV=production`
2. 配置生产数据库（PostgreSQL 推荐）
3. 设置适当的限流参数
4. 配置日志收集
5. 设置监控和告警

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📝 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🆘 支持

如果您遇到问题或有建议，请：

1. 查看 [Issues](../../issues) 页面
2. 创建新的 Issue 描述问题
3. 联系项目维护者

## 🔮 未来计划

- [x] 前端 Web 界面开发
- [ ] 移动端应用
- [ ] 更多技术指标支持
- [ ] 机器学习模型集成
- [ ] 实时数据推送
- [ ] 用户认证和权限管理
- [ ] 投资组合管理
- [ ] 回测功能
- [ ] 多语言支持

---

**免责声明**: 本系统提供的投资建议仅供参考，不构成投资建议。投资有风险，请谨慎决策。
