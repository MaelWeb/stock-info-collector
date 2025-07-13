import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { LoginForm } from '../components/features/Auth/LoginForm';
import { Button } from 'antd';

const LoginPage: React.FC = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/'); // 登录后跳转首页
    }
  }, [isAuthenticated, navigate]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#f5f5f5',
      }}>
      <div
        style={{
          background: 'white',
          padding: '48px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          width: '100%',
          maxWidth: '400px',
        }}>
        <h2 style={{ textAlign: 'center', marginBottom: 32 }}>登录</h2>
        <LoginForm onSuccess={() => navigate('/')} />
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <span>还没有账号？</span>
          <Link to='/register'>
            <Button
              type='link'
              style={{ padding: 0, marginLeft: 8 }}>
              立即注册
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
