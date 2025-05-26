/*
  # 添加管理员角色字段

  1. 更新表结构
    - 在 admin_users 表中添加 role 字段
    - 添加角色枚举类型
    - 设置默认角色为 admin

  2. 安全设置
    - 更新访问策略以支持角色
*/

-- 创建角色枚举类型
CREATE TYPE admin_role AS ENUM ('super_admin', 'admin');

-- 添加角色字段
ALTER TABLE admin_users
ADD COLUMN role admin_role NOT NULL DEFAULT 'admin';

-- 更新访问策略
DROP POLICY IF EXISTS "Admins can view admin users" ON admin_users;
DROP POLICY IF EXISTS "Users can view their own admin status" ON admin_users;

-- 允许用户查看自己的管理员状态
CREATE POLICY "Users can view their own admin status"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 允许管理员查看所有管理员用户
CREATE POLICY "Admins can view all admin users"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
    )
  );

-- 只允许超级管理员管理管理员用户
CREATE POLICY "Super admins can manage admin users"
  ON admin_users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- 更新检查用户角色的函数
CREATE OR REPLACE FUNCTION public.is_super_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = $1 AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = $1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建第一个超级管理员
INSERT INTO admin_users (user_id, role)
SELECT id, 'super_admin'::admin_role
FROM auth.users
WHERE email = '3214718088@qq.com'
ON CONFLICT (user_id) DO UPDATE
SET role = 'super_admin'::admin_role;
