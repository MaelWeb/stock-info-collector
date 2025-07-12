import { apiRequest } from './index';
import type { WatchlistItem, PaginatedResponse, PaginationParams } from '@/types';

/**
 * @description 自选股API服务
 */
export const watchlistAPI = {
  /**
   * @description 获取用户自选股列表
   */
  getWatchlist: (params: PaginationParams) => {
    return apiRequest.get<PaginatedResponse<WatchlistItem>>('/watchlist', params);
  },

  /**
   * @description 添加股票到自选股
   */
  addToWatchlist: (stockId: string, data?: { notes?: string; targetPrice?: number; stopLoss?: number }) => {
    return apiRequest.post<WatchlistItem>('/watchlist', { stockId, ...data });
  },

  /**
   * @description 从自选股中移除股票
   */
  removeFromWatchlist: (id: string) => {
    return apiRequest.delete<void>(`/watchlist/${id}`);
  },

  /**
   * @description 更新自选股项目
   */
  updateWatchlistItem: (id: string, data: { notes?: string; targetPrice?: number; stopLoss?: number }) => {
    return apiRequest.put<WatchlistItem>(`/watchlist/${id}`, data);
  },

  /**
   * @description 检查股票是否在自选股中
   */
  checkInWatchlist: (stockId: string) => {
    return apiRequest.get<{ inWatchlist: boolean; item?: WatchlistItem }>(`/watchlist/check/${stockId}`);
  },
};
