import React from 'react';
import { Form, Input, Button } from 'antd';
import { useAuthStore } from '../../../store/authStore';

interface LoginFormProps {
  onSuccess?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const login = useAuthStore((s) => s.login);
  const loading = useAuthStore((s) => s.loading);
  const error = useAuthStore((s) => s.error);
  const [form] = Form.useForm();

  const handleSubmit = async (values: { email: string; password: string }) => {
    try {
      await login(values.email, values.password);
      onSuccess?.();
    } catch {
      // 错误已由store处理
    }
  };

  return (
    <Form
      form={form}
      layout='vertical'
      onFinish={handleSubmit}
      style={{ maxWidth: 400, margin: '0 auto' }}>
      <Form.Item
        label='邮箱'
        name='email'
        rules={[{ required: true, type: 'email', message: '请输入有效邮箱' }]}>
        <Input autoComplete='email' />
      </Form.Item>
      <Form.Item
        label='密码'
        name='password'
        rules={[{ required: true, min: 8, message: '密码至少8位' }]}>
        <Input.Password autoComplete='current-password' />
      </Form.Item>
      {error && <div style={{ color: '#ff4d4f', marginBottom: 16 }}>{error}</div>}
      <Form.Item>
        <Button
          type='primary'
          htmlType='submit'
          loading={loading}
          block>
          登录
        </Button>
      </Form.Item>
    </Form>
  );
};
