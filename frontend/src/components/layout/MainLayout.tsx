import React, { useState } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown, Space, Typography } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  StockOutlined,
  HeartOutlined,
  BulbOutlined,
  BarChartOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import type { MenuProps } from 'antd';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

/**
 * @description 主布局组件，提供侧边栏导航和顶部栏
 */
interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  /**
   * @description 导航菜单项配置
   */
  const menuItems: MenuProps['items'] = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: '仪表盘',
    },
    {
      key: '/stocks',
      icon: <StockOutlined />,
      label: '股票列表',
    },
    {
      key: '/watchlist',
      icon: <HeartOutlined />,
      label: '自选股',
    },
    {
      key: '/recommendations',
      icon: <BulbOutlined />,
      label: '投资建议',
    },
    {
      key: '/analysis',
      icon: <BarChartOutlined />,
      label: '技术分析',
    },
  ];

  /**
   * @description 用户菜单项
   */
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人资料',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '设置',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
    },
  ];

  /**
   * @description 处理菜单点击
   */
  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  /**
   * @description 处理用户菜单点击
   */
  const handleUserMenuClick = ({ key }: { key: string }) => {
    switch (key) {
      case 'logout':
        // 处理退出登录
        localStorage.removeItem('auth_token');
        navigate('/login');
        break;
      case 'profile':
        // 处理个人资料
        break;
      case 'settings':
        // 处理设置
        break;
      default:
        break;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        style={{
          background: '#fff',
          boxShadow: '2px 0 8px 0 rgba(29,35,41,.05)',
        }}>
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <Title
            level={4}
            style={{ margin: 0, color: '#1890ff' }}>
            {collapsed ? 'SIC' : '股票信息收集器'}
          </Title>
        </div>
        <Menu
          mode='inline'
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: '0 24px',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0,21,41,.08)',
          }}>
          <Button
            type='text'
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              fontSize: '16px',
              width: 64,
              height: 64,
            }}
          />
          <Space>
            <Dropdown
              menu={{ items: userMenuItems, onClick: handleUserMenuClick }}
              placement='bottomRight'>
              <Space style={{ cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} />
                <span>用户</span>
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content
          style={{
            margin: 0,
            minHeight: 280,
            background: '#f5f5f5',
          }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
