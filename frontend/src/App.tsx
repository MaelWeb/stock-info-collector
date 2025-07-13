import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Layout, App as AntApp } from 'antd';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import StockList from './pages/StockList';
import Watchlist from './pages/Watchlist';
import Recommendations from './pages/Recommendations';
import Analysis from './pages/Analysis';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import { ProtectedRoute } from './components/features/Auth/ProtectedRoute';
import { AuthInitializer } from './components/features/Auth/AuthInitializer';
import './App.css';

const { Content } = Layout;

// 创建 React Query 客户端
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5分钟
    },
  },
});

/**
 * @description 主应用组件，提供路由和全局状态管理
 */
const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AntApp>
        <AuthInitializer>
          <Router>
            <Routes>
              {/* 认证相关路由 - 不使用主布局 */}
              <Route
                path='/login'
                element={<Login />}
              />
              <Route
                path='/register'
                element={<Register />}
              />

              {/* 受保护的路由 - 使用主布局 */}
              <Route
                path='/'
                element={
                  <ProtectedRoute>
                    <Layout className='app-layout'>
                      <MainLayout>
                        <Content className='app-content'>
                          <Dashboard />
                        </Content>
                      </MainLayout>
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path='/stocks'
                element={
                  <ProtectedRoute>
                    <Layout className='app-layout'>
                      <MainLayout>
                        <Content className='app-content'>
                          <StockList />
                        </Content>
                      </MainLayout>
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path='/watchlist'
                element={
                  <ProtectedRoute>
                    <Layout className='app-layout'>
                      <MainLayout>
                        <Content className='app-content'>
                          <Watchlist />
                        </Content>
                      </MainLayout>
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path='/recommendations'
                element={
                  <ProtectedRoute>
                    <Layout className='app-layout'>
                      <MainLayout>
                        <Content className='app-content'>
                          <Recommendations />
                        </Content>
                      </MainLayout>
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path='/analysis'
                element={
                  <ProtectedRoute>
                    <Layout className='app-layout'>
                      <MainLayout>
                        <Content className='app-content'>
                          <Analysis />
                        </Content>
                      </MainLayout>
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path='/profile'
                element={
                  <ProtectedRoute>
                    <Layout className='app-layout'>
                      <MainLayout>
                        <Content className='app-content'>
                          <Profile />
                        </Content>
                      </MainLayout>
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path='/admin'
                element={
                  <ProtectedRoute>
                    <Layout className='app-layout'>
                      <MainLayout>
                        <Content className='app-content'>
                          <Admin />
                        </Content>
                      </MainLayout>
                    </Layout>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Router>
        </AuthInitializer>
      </AntApp>
    </QueryClientProvider>
  );
};

export default App;
