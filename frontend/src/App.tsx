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
        <Router>
          <Layout className='app-layout'>
            <MainLayout>
              <Content className='app-content'>
                <Routes>
                  <Route
                    path='/'
                    element={<Dashboard />}
                  />
                  <Route
                    path='/stocks'
                    element={<StockList />}
                  />
                  <Route
                    path='/watchlist'
                    element={<Watchlist />}
                  />
                  <Route
                    path='/recommendations'
                    element={<Recommendations />}
                  />
                  <Route
                    path='/analysis'
                    element={<Analysis />}
                  />
                </Routes>
              </Content>
            </MainLayout>
          </Layout>
        </Router>
      </AntApp>
    </QueryClientProvider>
  );
};

export default App;
