import { create } from 'zustand';
import { User } from '../types/user';
import * as authAPI from '../api/authAPI';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, inviteCode: string) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  loading: false,
  error: null,
  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const { user, token } = await authAPI.login(email, password);
      localStorage.setItem('token', token);
      set({ user, token, isAuthenticated: true, loading: false });
    } catch (e: any) {
      set({ error: e.response?.data?.error || e.message, loading: false });
      throw e;
    }
  },
  register: async (email, password, name, inviteCode) => {
    set({ loading: true, error: null });
    try {
      await authAPI.register(email, password, name, inviteCode);
      // 注册成功后可自动登录或跳转登录页
      set({ loading: false });
    } catch (e: any) {
      set({ error: e.response?.data?.error || e.message, loading: false });
      throw e;
    }
  },
  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null, isAuthenticated: false });
  },
  fetchUser: async () => {
    const token = get().token;
    if (!token) return;

    // 避免重复请求
    if (get().loading) return;

    set({ loading: true });
    try {
      const user = await authAPI.getMe(token);
      set({ user, isAuthenticated: true, loading: false });
    } catch (e) {
      set({ user: null, isAuthenticated: false, loading: false });
      localStorage.removeItem('token');
    }
  },
}));
