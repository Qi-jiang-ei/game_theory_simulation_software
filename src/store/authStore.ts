import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';

type User = {
  id: string;
  email: string;
  role: 'super_admin' | 'admin' | 'user';
};

interface AuthStore {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  loading: true,

  signIn: async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      if (!data.user) throw new Error('用户数据不存在');
      
      // 获取用户角色
      try {
        const { data: adminData, error: adminError } = await supabase
          .from('admin_users')
          .select('role')
          .eq('user_id', data.user.id)
          .single();
        
        if (adminError) {
          console.warn('获取用户角色失败，使用默认角色:', adminError);
        }
        
        set({ 
          user: {
            id: data.user.id,
            email: data.user.email || '',
            role: adminData?.role || 'user'
          }
        });
      } catch (roleError) {
        console.warn('获取用户角色时出错，使用默认角色:', roleError);
        set({ 
          user: {
            id: data.user.id,
            email: data.user.email || '',
            role: 'user'
          }
        });
      }
    } catch (error) {
      console.error('登录失败:', error);
      return Promise.reject(error);
    }
  },

  signUp: async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) throw error;
      if (!data.user) throw new Error('用户数据不存在');
      
      // 获取用户角色
      try {
        const { data: adminData, error: adminError } = await supabase
          .from('admin_users')
          .select('role')
          .eq('user_id', data.user.id)
          .single();
        
        if (adminError) {
          console.warn('获取用户角色失败，使用默认角色:', adminError);
        }
        
        set({ 
          user: {
            id: data.user.id,
            email: data.user.email || '',
            role: adminData?.role || 'user'
          }
        });
      } catch (roleError) {
        console.warn('获取用户角色时出错，使用默认角色:', roleError);
        set({ 
          user: {
            id: data.user.id,
            email: data.user.email || '',
            role: 'user'
          }
        });
      }
    } catch (error) {
      console.error('注册失败:', error);
      return Promise.reject(error);
    }
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
      set({ user: null });
    } catch (error) {
      console.error('登出失败:', error);
      return Promise.reject(error);
    }
  },

  checkAuth: async () => {
    try {
      set({ loading: true });
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) throw error;
      
      if (user) {
        // 检查是否是管理员
        try {
          const { data: adminData, error: adminError } = await supabase
            .from('admin_users')
            .select('role')
            .eq('user_id', user.id)
            .single();
          
          if (adminError) {
            console.warn('获取用户角色失败，使用默认角色:', adminError);
          }
          
          set({ 
            user: {
              id: user.id,
              email: user.email || '',
              role: adminData?.role || 'user'
            },
            loading: false
          });
        } catch (roleError) {
          console.warn('获取用户角色时出错，使用默认角色:', roleError);
          set({ 
            user: {
              id: user.id,
              email: user.email || '',
              role: 'user'
            },
            loading: false
          });
        }
      } else {
        set({ user: null, loading: false });
      }
    } catch (error) {
      console.error('检查认证状态失败:', error);
      set({ user: null, loading: false });
      return Promise.reject(error);
    }
  },
}));
