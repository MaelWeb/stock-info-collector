import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { RegisterForm } from '../components/features/Auth/RegisterForm';
import { Button } from 'antd';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();

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
        <h2 style={{ textAlign: 'center', marginBottom: 32 }}>注册</h2>
        <RegisterForm onSuccess={() => navigate('/login')} />
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <span>已有账号？</span>
          <Link to='/login'>
            <Button
              type='link'
              style={{ padding: 0, marginLeft: 8 }}>
              立即登录
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
