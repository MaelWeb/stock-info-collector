import { apiRequest } from './index';
import type { Recommendation, PaginatedResponse, PaginationParams, AnalysisRequest, AIProvider } from '@/types';

/**
 * @description 投资建议API服务
 */
export const recommendationAPI = {
  /**
   * @description 获取投资建议列表
   */
  getRecommendations: (params: PaginationParams & { stockId?: string; aiProvider?: string }) => {
    return apiRequest.get<PaginatedResponse<Recommendation>>('/recommendations', params);
  },

  /**
   * @description 根据ID获取投资建议详情
   */
  getRecommendationById: (id: string) => {
    return apiRequest.get<Recommendation>(`/recommendations/${id}`);
  },

  /**
   * @description 获取股票的最新投资建议
   */
  getLatestRecommendation: (stockId: string) => {
    return apiRequest.get<Recommendation>(`/recommendations/stock/${stockId}/latest`);
  },

  /**
   * @description 获取股票的投资建议历史
   */
  getRecommendationHistory: (stockId: string, params: PaginationParams) => {
    return apiRequest.get<PaginatedResponse<Recommendation>>(`/recommendations/stock/${stockId}`, params);
  },

  /**
   * @description 创建新的投资建议分析
   */
  createAnalysis: (request: AnalysisRequest) => {
    return apiRequest.post<Recommendation>('/recommendations/analyze', request);
  },

  /**
   * @description 删除投资建议
   */
  deleteRecommendation: (id: string) => {
    return apiRequest.delete<void>(`/recommendations/${id}`);
  },

  /**
   * @description 获取AI提供商列表
   */
  getAIProviders: () => {
    return apiRequest.get<AIProvider[]>('/recommendations/providers');
  },
};
