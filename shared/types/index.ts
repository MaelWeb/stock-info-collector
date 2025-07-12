/**
 * 股票基本信息类型
 */
export interface Stock {
  id: string;
  symbol: string;
  name: string;
  exchange: string;
  sector?: string;
  industry?: string;
  marketCap?: number;
  peRatio?: number;
  dividendYield?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * 股票价格数据类型
 */
export interface StockPrice {
  id: string;
  stockId: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  createdAt: string;
}

/**
 * 技术指标类型
 */
export interface TechnicalIndicator {
  id: string;
  stockId: string;
  date: string;
  indicator: string;
  value: number;
  signal?: 'BUY' | 'SELL' | 'HOLD';
  createdAt: string;
}

/**
 * 投资建议类型
 */
export interface Recommendation {
  id: string;
  stockId: string;
  userId?: string;
  date: string;
  type: 'DAILY_OPPORTUNITY' | 'CUSTOM_ANALYSIS';
  confidence: number;
  action: 'BUY' | 'SELL' | 'HOLD';
  priceTarget?: number;
  reasoning: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  timeHorizon: 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM';
  createdAt: string;
  stock?: Stock;
}

/**
 * 用户类型
 */
export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 关注列表项类型
 */
export interface WatchlistItem {
  id: string;
  userId: string;
  stockId: string;
  addedAt: string;
  notes?: string;
  stock?: Stock;
}

/**
 * API响应通用类型
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * 分页参数类型
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 分页响应类型
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * 股票搜索参数类型
 */
export interface StockSearchParams extends PaginationParams {
  symbol?: string;
  name?: string;
  sector?: string;
  exchange?: string;
}

/**
 * 投资建议搜索参数类型
 */
export interface RecommendationSearchParams extends PaginationParams {
  stockId?: string;
  userId?: string;
  type?: string;
  action?: string;
  riskLevel?: string;
  timeHorizon?: string;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * 股票分析结果类型
 */
export interface StockAnalysis {
  stock: Stock;
  currentPrice: StockPrice;
  technicalIndicators: TechnicalIndicator[];
  recommendation?: Recommendation;
  priceHistory: StockPrice[];
}

/**
 * 市场概览类型
 */
export interface MarketOverview {
  totalStocks: number;
  totalRecommendations: number;
  topGainers: Stock[];
  topLosers: Stock[];
  marketTrend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  lastUpdated: string;
}

/**
 * AI模型配置类型
 */
export interface AIModelConfig {
  provider: 'openai' | 'anthropic' | 'gemini' | 'ollama' | 'huggingface';
  apiKey?: string;
  baseUrl?: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

/**
 * 系统配置类型
 */
export interface SystemConfig {
  id: string;
  key: string;
  value: string;
  description?: string;
  updatedAt: string;
}
