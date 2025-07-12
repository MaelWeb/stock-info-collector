import { apiRequest } from './index';
import type {
  Stock,
  StockPrice,
  TechnicalIndicator,
  PaginatedResponse,
  StockSearchParams,
  PaginationParams,
} from '@/types';

/**
 * @description 股票API服务
 */
export const stockAPI = {
  /**
   * @description 获取股票列表
   */
  getStocks: (params: PaginationParams & StockSearchParams) => {
    return apiRequest.get<PaginatedResponse<Stock>>('/stocks', params);
  },

  /**
   * @description 根据ID获取股票详情
   */
  getStockById: (id: string) => {
    return apiRequest.get<Stock>(`/stocks/${id}`);
  },

  /**
   * @description 根据股票代码获取股票详情
   */
  getStockBySymbol: (symbol: string) => {
    return apiRequest.get<Stock>(`/stocks/symbol/${symbol}`);
  },

  /**
   * @description 搜索股票
   */
  searchStocks: (query: string) => {
    return apiRequest.get<Stock[]>('/stocks/search', { q: query });
  },

  /**
   * @description 获取股票价格历史
   */
  getStockPrices: (symbol: string, params: { startDate?: string; endDate?: string; limit?: number; days?: number }) => {
    return apiRequest.get<StockPrice[]>(`/stocks/${symbol}/prices`, params);
  },

  /**
   * @description 获取股票技术指标
   */
  getTechnicalIndicators: (symbol: string, params: { startDate?: string; endDate?: string; limit?: number }) => {
    return apiRequest.get<TechnicalIndicator[]>(`/stocks/${symbol}/indicators`, params);
  },

  /**
   * @description 获取股票概览数据（包含最新价格、技术指标等）
   */
  getStockOverview: (stockId: string) => {
    return apiRequest.get<any>(`/stocks/${stockId}/overview`);
  },

  /**
   * @description 添加新股票到数据库
   */
  addStock: (stockData: { symbol: string; name: string; exchange: string }) => {
    return apiRequest.post<Stock>('/stocks', stockData);
  },

  /**
   * @description 更新股票信息
   */
  updateStock: (id: string, stockData: Partial<Stock>) => {
    return apiRequest.put<Stock>(`/stocks/${id}`, stockData);
  },

  /**
   * @description 删除股票
   */
  deleteStock: (id: string) => {
    return apiRequest.delete<void>(`/stocks/${id}`);
  },
};
