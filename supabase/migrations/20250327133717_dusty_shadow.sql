/*
  # 添加管理员角色和权限

  1. 新建表
    - `admin_users`: 管理员用户表
      - `id`: UUID 主键
      - `user_id`: 关联用户ID
      - `created_at`: 创建时间

  2. 安全设置
    - 启用行级安全
    - 添加管理员访问策略
*/

-- 创建管理员用户表
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- 启用行级安全
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- 添加管理员访问策略
CREATE POLICY "Only admins can view admin_users"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  ));

-- 创建检查用户是否是管理员的函数
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = $1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
