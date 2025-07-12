# 股票信息收集器 - 前端

这是股票信息收集器项目的前端部分，使用 React + TypeScript + Ant Design 构建的现代化 Web 应用。

## 🚀 技术栈

- **React 18** - 现代化的 React 框架
- **TypeScript** - 类型安全的 JavaScript
- **Ant Design 5** - 企业级 UI 组件库
- **React Query** - 数据获取和缓存
- **React Router** - 客户端路由
- **Vite** - 快速的构建工具
- **Ant Design Charts** - 数据可视化图表
- **Axios** - HTTP 客户端
- **Zustand** - 轻量级状态管理

## 📁 项目结构

```
src/
├── api/                 # API 服务层
│   ├── index.ts        # API 客户端配置
│   ├── stocks.ts       # 股票相关 API
│   ├── recommendations.ts # 投资建议 API
│   └── watchlist.ts    # 自选股 API
├── components/         # 可复用组件
│   └── layout/         # 布局组件
│       └── MainLayout.tsx
├── pages/             # 页面组件
│   ├── Dashboard.tsx   # 仪表盘
│   ├── StockList.tsx   # 股票列表
│   ├── Watchlist.tsx   # 自选股
│   ├── Recommendations.tsx # 投资建议
│   └── Analysis.tsx    # 技术分析
├── types/             # TypeScript 类型定义
│   └── index.ts
├── App.tsx            # 主应用组件
├── main.tsx           # 应用入口
├── index.css          # 全局样式
└── App.css            # 应用样式
```

## 🛠️ 开发环境设置

### 前置要求

- Node.js 18+
- npm 或 yarn

### 安装依赖

```bash
cd frontend
npm install
```

### 启动开发服务器

```bash
npm run dev
```

应用将在 `http://localhost:3000` 启动。

### 构建生产版本

```bash
npm run build
```

### 预览生产版本

```bash
npm run preview
```

## 📱 功能特性

### 🏠 仪表盘

- 关键统计数据展示
- 最新投资建议概览
- 自选股快速访问
- 实时数据图表

### 📊 股票列表

- 完整的股票信息管理
- 搜索和筛选功能
- 添加、编辑、删除股票
- 分页显示

### ❤️ 自选股

- 个人股票关注列表
- 目标价格和止损设置
- 备注功能
- 快速管理

### 🤖 投资建议

- AI 驱动的投资分析
- 多 AI 提供商支持
- 详细的分析报告
- 置信度和风险评级

### 📈 技术分析

- 实时价格图表
- 技术指标展示（RSI、MACD、移动平均线等）
- 布林带分析
- 交互式图表

## 🎨 设计特色

- **现代化 UI** - 基于 Ant Design 5 的优雅设计
- **响应式布局** - 完美适配桌面和移动设备
- **深色主题支持** - 可切换的主题模式
- **无障碍设计** - 符合 WCAG 标准的可访问性
- **性能优化** - 代码分割和懒加载

## 🔧 开发指南

### 代码规范

项目使用 ESLint 和 Prettier 进行代码格式化：

```bash
# 检查代码
npm run lint

# 自动修复
npm run lint:fix

# 类型检查
npm run type-check
```

### 组件开发

遵循以下原则：

- 使用 TypeScript 进行类型定义
- 组件采用函数式编程
- 使用 React Hooks 管理状态
- 遵循单一职责原则

### API 集成

- 使用 React Query 进行数据获取和缓存
- 统一的错误处理机制
- 自动重试和乐观更新
- 类型安全的 API 调用

## 🧪 测试

```bash
# 运行测试
npm run test

# 测试覆盖率
npm run test:coverage

# UI 测试
npm run test:ui
```

## 📦 部署

### 构建

```bash
npm run build
```

### 部署到静态服务器

构建完成后，`dist` 目录包含所有静态文件，可以部署到任何静态文件服务器。

### Docker 部署

```dockerfile
FROM nginx:alpine
COPY dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 🔗 相关链接

- [后端 API 文档](../backend/README.md)
- [项目总览](../../README.md)
- [Ant Design 文档](https://ant.design/)
- [React Query 文档](https://react-query.tanstack.com/)

## 🤝 贡献

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](../../LICENSE) 文件了解详情。
