import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { message } from 'antd';
import type { ApiResponse } from '@/types';

/**
 * @description 创建 axios 实例，配置基础URL和拦截器
 */
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: '/api',
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // 请求拦截器
  client.interceptors.request.use(
    (config) => {
      // 可以在这里添加认证token
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // 响应拦截器
  client.interceptors.response.use(
    (response: AxiosResponse<ApiResponse<any>>) => {
      // 如果响应成功但业务逻辑失败
      if (response.data && !response.data.success) {
        message.error(response.data.error || '请求失败');
        return Promise.reject(new Error(response.data.error || '请求失败'));
      }
      return response;
    },
    (error) => {
      // 处理网络错误
      if (error.response) {
        const { status, data } = error.response;
        switch (status) {
          case 401:
            message.error('未授权，请重新登录');
            // 可以在这里处理登录跳转
            break;
          case 403:
            message.error('权限不足');
            break;
          case 404:
            message.error('请求的资源不存在');
            break;
          case 500:
            message.error('服务器内部错误');
            break;
          default:
            message.error(data?.error || `请求失败 (${status})`);
        }
      } else if (error.request) {
        message.error('网络连接失败，请检查网络设置');
      } else {
        message.error('请求配置错误');
      }
      return Promise.reject(error);
    }
  );

  return client;
};

/**
 * @description API 客户端实例
 */
export const apiClient = createApiClient();

/**
 * @description 通用API请求方法
 */
export const apiRequest = {
  /**
   * @description GET 请求
   */
  get: <T>(url: string, params?: any): Promise<ApiResponse<T>> => {
    return apiClient.get(url, { params }).then((response) => response.data);
  },

  /**
   * @description POST 请求
   */
  post: <T>(url: string, data?: any): Promise<ApiResponse<T>> => {
    return apiClient.post(url, data).then((response) => response.data);
  },

  /**
   * @description PUT 请求
   */
  put: <T>(url: string, data?: any): Promise<ApiResponse<T>> => {
    return apiClient.put(url, data).then((response) => response.data);
  },

  /**
   * @description DELETE 请求
   */
  delete: <T>(url: string): Promise<ApiResponse<T>> => {
    return apiClient.delete(url).then((response) => response.data);
  },
};
