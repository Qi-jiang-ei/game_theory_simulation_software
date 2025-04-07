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
CREATE POLICY "Super admins can manage all admin users"
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

-- 创建检查用户是否是超级管理员的函数
CREATE OR REPLACE FUNCTION public.is_super_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = $1 AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
