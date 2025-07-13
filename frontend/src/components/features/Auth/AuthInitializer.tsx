import React, { useEffect } from 'react';
import { useAuthStore } from '../../../store/authStore';

/**
 * @description 认证初始化组件，在应用启动时检查token并获取用户信息
 */
export const AuthInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, isAuthenticated, user, fetchUser } = useAuthStore((s) => ({
    token: s.token,
    isAuthenticated: s.isAuthenticated,
    user: s.user,
    fetchUser: s.fetchUser,
  }));

  useEffect(() => {
    // 如果有token但没有用户信息，获取用户信息
    if (token && isAuthenticated && !user) {
      fetchUser();
    }
  }, [token, isAuthenticated, user, fetchUser]);

  return <>{children}</>;
};
