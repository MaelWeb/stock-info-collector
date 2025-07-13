import React from 'react';
import { Form, Input, Button } from 'antd';
import { useAuthStore } from '../../../store/authStore';

interface RegisterFormProps {
  onSuccess?: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess }) => {
  const register = useAuthStore((s) => s.register);
  const loading = useAuthStore((s) => s.loading);
  const error = useAuthStore((s) => s.error);
  const [form] = Form.useForm();

  const handleSubmit = async (values: { email: string; password: string; name: string; inviteCode: string }) => {
    try {
      await register(values.email, values.password, values.name, values.inviteCode);
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
        label='昵称'
        name='name'
        rules={[{ required: true, message: '请输入昵称' }]}>
        <Input autoComplete='nickname' />
      </Form.Item>
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
        <Input.Password autoComplete='new-password' />
      </Form.Item>
      <Form.Item
        label='邀请码'
        name='inviteCode'
        rules={[{ required: true, message: '请输入邀请码' }]}>
        <Input autoComplete='off' />
      </Form.Item>
      {error && <div style={{ color: '#ff4d4f', marginBottom: 16 }}>{error}</div>}
      <Form.Item>
        <Button
          type='primary'
          htmlType='submit'
          loading={loading}
          block>
          注册
        </Button>
      </Form.Item>
    </Form>
  );
};
