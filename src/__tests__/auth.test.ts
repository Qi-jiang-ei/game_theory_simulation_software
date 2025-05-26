import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabaseClient';

// Mock Supabase client
jest.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
      getUser: jest.fn(), // 确保 getUser 被 mock
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    })),
    // 添加 rest 属性以匹配类型定义
    rest: {},
  },
}));

describe('Authentication Tests', () => {
  beforeEach(() => {
    // 清除所有模拟函数的调用记录
    jest.clearAllMocks();
    // 重置 auth store 状态
    useAuthStore.setState({
      user: null,
      loading: false,
    });
  });

  describe('Sign In Tests', () => {
    test('成功登录', async () => {
      // 模拟成功的登录响应
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValueOnce({
        data: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
          },
          session: {
            access_token: 'test-token',
          },
        },
        error: null,
      });

      // 模拟获取用户角色
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: 'user' },
          error: null,
        }),
      });

      await useAuthStore.getState().signIn('test@example.com', 'password123');

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(useAuthStore.getState().user).toBeDefined();
    });

    test('登录失败 - 密码错误', async () => {
      // 模拟密码错误的响应
      const authError = new Error('auth/wrong-password');
      (supabase.auth.signInWithPassword as jest.Mock).mockRejectedValueOnce(authError);

      await expect(useAuthStore.getState().signIn('test@example.com', 'wrongpassword')).rejects.toThrow(authError);

      expect(useAuthStore.getState().user).toBeNull();
    });
  });

  describe('Sign Up Tests', () => {
    test('成功注册', async () => {
      // 模拟成功的注册响应
      (supabase.auth.signUp as jest.Mock).mockResolvedValueOnce({
        data: {
          user: {
            id: 'new-user-id',
            email: 'new@example.com',
          },
          session: {
            access_token: 'test-token',
          },
        },
        error: null,
      });

      // 模拟获取用户角色 (注册成功后也会尝试获取角色)
       (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: 'user' },
          error: null,
        }),
      });

      await useAuthStore.getState().signUp('new@example.com', 'password123');

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password123',
      });

      expect(useAuthStore.getState().user).toBeDefined();
    });

    test('注册失败 - 密码太短', async () => {
      // 模拟密码太短的响应
       const authError = new Error('Password should be at least 6 characters.');
      (supabase.auth.signUp as jest.Mock).mockRejectedValueOnce(authError);

      await expect(useAuthStore.getState().signUp('new@example.com', 'short')).rejects.toThrow(authError);

      expect(useAuthStore.getState().user).toBeNull();
    });
  });

  describe('Sign Out Tests', () => {
    test('成功登出', async () => {
      // 模拟成功的登出响应
      (supabase.auth.signOut as jest.Mock).mockResolvedValueOnce({
        error: null,
      });

      await useAuthStore.getState().signOut();

      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect(useAuthStore.getState().user).toBeNull();
    });
  });

  describe('Session Management Tests', () => {
    test('检查会话状态 - 有效会话', async () => {
      // 模拟有效的会话
      (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
        data: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
          },
        },
        error: null,
      });

       // 模拟获取用户角色
       (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: 'user' },
          error: null,
        }),
      });

      await useAuthStore.getState().checkAuth();

      expect(useAuthStore.getState().user).toBeDefined();
      expect(useAuthStore.getState().loading).toBe(false);
    });

     test('检查会话状态 - 无效会话', async () => {
      // 模拟无效的会话
      (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      await useAuthStore.getState().checkAuth();

      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().loading).toBe(false);
    });

     test('检查会话状态 - 获取会话错误', async () => {
        const authError = new Error('Failed to get session');
        (supabase.auth.getUser as jest.Mock).mockRejectedValueOnce(authError);

        await expect(useAuthStore.getState().checkAuth()).rejects.toThrow(authError);

        expect(useAuthStore.getState().user).toBeNull();
        expect(useAuthStore.getState().loading).toBe(false);
    });
  });
}); 