/*
 * @Author: Mael mael.liang@live.com
 * @Date: 2025-07-12 19:28:38
 * @LastEditors: Mael mael.liang@live.com
 * @LastEditTime: 2025-07-12 19:29:43
 * @FilePath: /stock-info-collector/frontend/src/api/authAPI.ts
 */
import axios from 'axios';
import { User, InviteCode } from '../types/user';

const BASE_URL = '/api/auth';

export async function login(email: string, password: string) {
  const res = await axios.post(`${BASE_URL}/login`, { email, password });
  return res.data.data as { user: User; token: string };
}

export async function register(email: string, password: string, name: string, inviteCode: string) {
  const res = await axios.post(`${BASE_URL}/register`, { email, password, name, inviteCode });
  return res.data.data as User;
}

export async function getMe(token: string) {
  const res = await axios.get(`${BASE_URL}/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data.data as User;
}

export async function updateProfile(token: string, data: { name?: string; email?: string }) {
  const res = await axios.put(`${BASE_URL}/profile`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data.data as User;
}

export async function changePassword(token: string, currentPassword: string, newPassword: string) {
  const res = await axios.put(
    `${BASE_URL}/password`,
    { currentPassword, newPassword },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return res.data;
}

// 管理员功能
export async function fetchInviteCodes(adminSecret: string) {
  const res = await axios.get(`${BASE_URL}/invite`, {
    headers: { 'x-admin-secret': adminSecret },
  });
  return res.data.codes as InviteCode[];
}

export async function generateInviteCodes(adminSecret: string, count: number = 1) {
  const res = await axios.post(
    `${BASE_URL}/invite`,
    { count },
    {
      headers: { 'x-admin-secret': adminSecret },
    }
  );
  return res.data.codes as string[];
}
