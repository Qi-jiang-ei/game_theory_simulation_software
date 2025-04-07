/*
  # 创建博弈模型和仿真结果表

  1. 新建表
    - `game_models`: 存储博弈模型
      - `id`: UUID 主键
      - `user_id`: 关联用户ID
      - `name`: 模型名称
      - `type`: 博弈类型
      - `description`: 模型描述
      - `config`: 模型配置（JSON）
      - `created_at`: 创建时间
    
    - `simulation_results`: 存储仿真结果
      - `id`: UUID 主键
      - `model_id`: 关联模型ID
      - `user_id`: 关联用户ID
      - `results`: 仿真结果（JSON）
      - `created_at`: 创建时间

  2. 安全设置
    - 启用行级安全
    - 添加用户访问策略
*/

-- 创建博弈模型表
CREATE TABLE IF NOT EXISTS game_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL,
  description text,
  config jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- 创建仿真结果表
CREATE TABLE IF NOT EXISTS simulation_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid REFERENCES game_models(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  results jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- 启用行级安全
ALTER TABLE game_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_results ENABLE ROW LEVEL SECURITY;

-- 添加访问策略
CREATE POLICY "Users can manage their own game models"
  ON game_models
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own simulation results"
  ON simulation_results
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);
