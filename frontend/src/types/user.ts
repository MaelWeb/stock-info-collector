export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InviteCode {
  id: string;
  code: string;
  used: boolean;
  usedBy?: string;
  usedAt?: string;
  createdAt: string;
}
