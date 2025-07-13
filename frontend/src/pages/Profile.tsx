import React from 'react';
import { useAuthStore } from '../store/authStore';
import { Button, Card } from 'antd';

const ProfilePage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  if (!user) {
    return <div style={{ color: '#ff4d4f', textAlign: 'center', padding: '48px' }}>未登录</div>;
  }

  return (
    <Card style={{ maxWidth: 400, margin: '48px auto' }}>
      <h2>个人中心</h2>
      <div>昵称：{user.name}</div>
      <div>邮箱：{user.email}</div>
      <div>注册时间：{new Date(user.createdAt).toLocaleString()}</div>
      <Button
        style={{ marginTop: 24 }}
        onClick={logout}
        block>
        退出登录
      </Button>
    </Card>
  );
};

export default ProfilePage;
