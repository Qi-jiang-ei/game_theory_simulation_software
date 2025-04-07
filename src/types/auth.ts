export type User = {
  id: string;
  email: string;
  created_at: string;
  role?: 'super_admin' | 'admin'; // 添加可选的角色属性
};

export type AuthState = {
  user: User | null;
  loading: boolean;
};
