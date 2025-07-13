import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown, Space, Typography, Badge, Tooltip } from 'antd';
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
  BellOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import type { MenuProps } from 'antd';
import { useAuthStore } from '../../store/authStore';
import './MainLayout.less';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

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
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);
  const fetchUser = useAuthStore((s) => s.fetchUser);

  // 检查是否为管理员
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  // 初始化时获取用户信息
  useEffect(() => {
    if (isAuthenticated && !user) {
      fetchUser();
    }
  }, [isAuthenticated, user]);

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
    // 管理员菜单
    ...(isAdmin
      ? [
          {
            key: '/admin',
            icon: <UserOutlined />,
            label: '管理后台',
          },
        ]
      : []),
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
        logout();
        navigate('/login');
        break;
      case 'profile':
        navigate('/profile');
        break;
      case 'settings':
        // 处理设置
        break;
      default:
        break;
    }
  };

  return (
    <Layout
      className='main-layout'
      hasSider>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        className='main-sider'
        width={280}>
        <div className='sider-header'>
          <div className='logo-container'>
            <div className='logo-icon'>
              <GlobalOutlined />
            </div>
            {!collapsed && (
              <Title
                level={4}
                className='logo-text'>
                股票信息收集器
              </Title>
            )}
          </div>
        </div>
        <Menu
          mode='inline'
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          className='main-menu'
        />
      </Sider>
      <Layout className={`main-content-layout ${collapsed ? 'sider-collapsed' : ''}`}>
        <Header className='main-header'>
          <div className='header-left'>
            <Button
              type='text'
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              className='menu-trigger'
            />
            <div className='breadcrumb'>
              <Text className='current-page'>
                {(menuItems.find((item) => item?.key === location.pathname) as any)?.label || '首页'}
              </Text>
            </div>
          </div>
          <div className='header-right'>
            {isAuthenticated ? (
              <Space size='large'>
                <Tooltip title='通知'>
                  <Badge
                    count={3}
                    size='small'>
                    <Button
                      type='text'
                      icon={<BellOutlined />}
                      className='header-action-btn'
                    />
                  </Badge>
                </Tooltip>
                <Dropdown
                  menu={{ items: userMenuItems, onClick: handleUserMenuClick }}
                  placement='bottomRight'
                  trigger={['click']}>
                  <div className='user-profile'>
                    <Avatar
                      size={36}
                      icon={<UserOutlined />}
                      className='user-avatar'
                    />
                    {!collapsed && (
                      <div className='user-info'>
                        <Text strong>{user?.name || '用户'}</Text>
                        <Text
                          type='secondary'
                          className='user-role'>
                          {user?.role === 'admin' ? '管理员' : user?.role === 'super_admin' ? '超级管理员' : '普通用户'}
                        </Text>
                      </div>
                    )}
                  </div>
                </Dropdown>
              </Space>
            ) : (
              <Space>
                <Button
                  type='link'
                  onClick={() => navigate('/login')}
                  className='auth-btn'>
                  登录
                </Button>
                <Button
                  type='primary'
                  onClick={() => navigate('/register')}
                  className='auth-btn'>
                  注册
                </Button>
              </Space>
            )}
          </div>
        </Header>
        <Content className='main-content'>
          <div className='content-wrapper'>{children}</div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
