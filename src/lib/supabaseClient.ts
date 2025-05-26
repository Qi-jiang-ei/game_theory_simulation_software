import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase environment variables. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file.'
  );
}

// 创建单个 Supabase 客户端实例
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'game-theory-auth'
  },
  global: {
    headers: {
      'x-application-name': 'game-theory-simulator',
      'Content-Type': 'application/json'
    }
  },
  db: {
    schema: 'public'
  }
});

// Admin client - only for server-side operations
export const supabaseAdmin = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      supabaseUrl,
      import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false
        },
        db: {
          schema: 'public'
        }
      }
    )
  : null;

// 添加错误处理和日志记录
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    console.log('用户已登出 - 清除会话');
  } else if (event === 'SIGNED_IN') {
    console.log('用户已登录 - 会话已建立');
  } else if (event === 'USER_UPDATED') {
    console.log('用户信息已更新');
  } else if (event === 'PASSWORD_RECOVERY') {
    console.log('密码恢复流程已启动');
  }
});

// 添加请求拦截器
if (supabase.rest && supabase.rest.interceptors) {
  supabase.rest.interceptors.response.use(
    (response) => response,
    (error) => {
      console.error('Supabase 请求错误:', error);
      return Promise.reject(error);
    }
  );
}

export default supabase;