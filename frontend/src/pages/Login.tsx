import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { LoginForm } from '../components/features/Auth/LoginForm';
import { Button, Typography, Divider } from 'antd';
import { UserOutlined, LockOutlined, GlobalOutlined } from '@ant-design/icons';
import './Login.less';

const LoginPage: React.FC = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/'); // 登录后跳转首页
    }
  }, [isAuthenticated, navigate]);

  const { Title, Text } = Typography;

  return (
    <div className='login-page'>
      <div className='login-container'>
        <div className='login-left'>
          <div className='login-content'>
            <div className='logo-section'>
              <div className='logo-icon'>
                <GlobalOutlined />
              </div>
              <Title
                level={2}
                className='app-title'>
                股票信息收集器
              </Title>
              <Text className='app-subtitle'>AI驱动的智能投资分析平台</Text>
            </div>
            <div className='features-section'>
              <div className='feature-item'>
                <UserOutlined className='feature-icon' />
                <div className='feature-content'>
                  <Text strong>智能分析</Text>
                  <Text type='secondary'>基于AI的股票分析和投资建议</Text>
                </div>
              </div>
              <div className='feature-item'>
                <LockOutlined className='feature-icon' />
                <div className='feature-content'>
                  <Text strong>安全可靠</Text>
                  <Text type='secondary'>企业级安全保障，数据加密传输</Text>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className='login-right'>
          <div className='login-form-container'>
            <div className='form-header'>
              <Title
                level={3}
                className='form-title'>
                欢迎回来
              </Title>
              <Text className='form-subtitle'>请登录您的账户以继续使用</Text>
            </div>
            <LoginForm onSuccess={() => navigate('/')} />
            <Divider plain>或者</Divider>
            <div className='register-link'>
              <Text>还没有账号？</Text>
              <Link to='/register'>
                <Button
                  type='link'
                  className='link-button'>
                  立即注册
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
