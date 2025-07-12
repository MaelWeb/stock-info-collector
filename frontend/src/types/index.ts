/**
 * @description 股票基本信息
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
 * @description 股票价格数据
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
  adjustedClose: number;
  createdAt: string;
}

/**
 * @description 技术指标数据
 */
export interface TechnicalIndicator {
  id: string;
  stockId: string;
  date: string;
  rsi?: number;
  macd?: number;
  macdSignal?: number;
  macdHistogram?: number;
  sma20?: number;
  sma50?: number;
  sma200?: number;
  ema12?: number;
  ema26?: number;
  bollingerUpper?: number;
  bollingerMiddle?: number;
  bollingerLower?: number;
  createdAt: string;
}

/**
 * @description 投资建议
 */
export interface Recommendation {
  id: string;
  stockId: string;
  stock: Stock;
  date: string;
  type: 'DAILY_OPPORTUNITY' | 'CUSTOM_ANALYSIS';
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  reasoning: string;
  priceTarget?: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  timeHorizon: 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM';
  createdAt: string;
}

/**
 * @description 用户自选股
 */
export interface WatchlistItem {
  id: string;
  userId: string;
  stockId: string;
  stock: Stock;
  addedAt: string;
  notes?: string;
  targetPrice?: number;
  stopLoss?: number;
}

/**
 * @description 系统配置
 */
export interface SystemConfig {
  id: string;
  key: string;
  value: string;
  description?: string;
  updatedAt: string;
}

/**
 * @description API 响应格式
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

/**
 * @description 分页参数
 */
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * @description 分页响应
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
 * @description 股票搜索参数
 */
export interface StockSearchParams {
  symbol?: string;
  name?: string;
  exchange?: string;
  sector?: string;
}

/**
 * @description AI提供商信息
 */
export interface AIProvider {
  provider: string;
  name: string;
  model: string;
}

/**
 * @description 分析请求参数
 */
export interface AnalysisRequest {
  stockSymbol: string;
  aiProvider?: 'openai' | 'anthropic' | 'gemini' | 'ollama' | 'huggingface';
  analysisType?: 'TECHNICAL' | 'FUNDAMENTAL' | 'HYBRID';
  timeHorizon?: 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM';
  customPrompt?: string;
}

/**
 * @description 图表数据点
 */
export interface ChartDataPoint {
  date: string;
  value: number;
  [key: string]: any;
}

/**
 * @description 股票概览数据
 */
export interface StockOverview {
  stock: Stock;
  latestPrice: StockPrice;
  technicalIndicators: TechnicalIndicator;
  latestRecommendation?: Recommendation;
  priceChange: {
    change: number;
    changePercent: number;
    isPositive: boolean;
  };
}
