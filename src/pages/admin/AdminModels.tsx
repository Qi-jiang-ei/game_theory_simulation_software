import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Trash2, Edit, Plus, Eye, X, Check, AlertCircle } from 'lucide-react';
import { ModelEditor } from '../../components/ModelEditor';
import { GameModel } from '../../types/gameTheory';
import { useToastStore } from '../../components/Toast';

interface GameModelRecord {
  id: string;
  name: string;
  type: string;
  description: string;
  config: any;
  created_at: string;
}

const AdminModels: React.FC = () => {
  const [models, setModels] = useState<GameModelRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingModel, setEditingModel] = useState<GameModel | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [viewModel, setViewModel] = useState<GameModelRecord | null>(null);
  const { addToast } = useToastStore();

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const { data, error } = await supabase
        .from('game_models')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setModels(data || []);
    } catch (error) {
      console.error('获取模型列表失败:', error);
      addToast({
        type: 'error',
        message: '获取模型列表失败',
        duration: 3000
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个模型吗？删除后无法恢复。')) return;

    try {
      const { error } = await supabase
        .from('game_models')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setModels(models.filter(model => model.id !== id));
      addToast({
        type: 'success',
        message: '模型删除成功',
        duration: 3000
      });
    } catch (error) {
      console.error('删除模型失败:', error);
      addToast({
        type: 'error',
        message: '删除模型失败',
        duration: 3000
      });
    }
  };

  const handleEdit = (model: GameModelRecord) => {
    const gameModel: GameModel = {
      id: model.id,
      name: model.name,
      type: model.type as any,
      description: model.description,
      players: model.config.players,
      payoffMatrix: model.config.payoffMatrix,
      isClassic: false
    };
    setEditingModel(gameModel);
  };

  const handleSave = async (model: GameModel) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error('用户未登录');
      }

      const modelData = {
        name: model.name,
        type: model.type,
        description: model.description,
        config: {
          players: model.players,
          payoffMatrix: model.payoffMatrix
        },
        user_id: userData.user.id
      };

      let error;
      if (model.id && !model.isClassic) {
        // 更新现有模型
        ({ error } = await supabase
          .from('game_models')
          .update(modelData)
          .eq('id', model.id));

        if (!error) {
          addToast({
            type: 'success',
            message: '模型更新成功',
            duration: 3000
          });
        }
      } else {
        // 创建新模型
        ({ error } = await supabase
          .from('game_models')
          .insert(modelData));

        if (!error) {
          addToast({
            type: 'success',
            message: '模型创建成功',
            duration: 3000
          });
        }
      }

      if (error) throw error;
      
      await fetchModels();
      setEditingModel(null);
      setIsCreating(false);
    } catch (error) {
      console.error('保存模型失败:', error);
      addToast({
        type: 'error',
        message: '保存模型失败',
        duration: 3000
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">加载中...</span>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">博弈模型管理</h2>
            <p className="text-sm text-gray-500 mt-1">
              在这里管理您的自定义博弈模型，包括创建、编辑和删除操作
            </p>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            新建模型
          </button>
        </div>

        {models.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <div className="flex justify-center mb-4">
              <AlertCircle className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-600 mb-2">暂无自定义模型</h3>
            <p className="text-sm text-gray-500 mb-4">
              点击"新建模型"按钮开始创建您的第一个自定义博弈模型
            </p>
            <button
              onClick={() => setIsCreating(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              新建模型
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {models.map((model) => (
              <div
                key={model.id}
                className="border rounded-lg p-4 hover:border-blue-500 transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-800">{model.name}</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewModel(model)}
                      className="text-blue-600 hover:text-blue-900 transition-colors"
                      title="查看详情"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(model)}
                      className="text-blue-600 hover:text-blue-900 transition-colors"
                      title="编辑模型"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(model.id)}
                      className="text-red-600 hover:text-red-900 transition-colors"
                      title="删除模型"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 mb-2">
                  {model.type}
                </span>
                <p className="text-sm text-gray-600 line-clamp-2">{model.description}</p>
                <p className="text-xs text-gray-500 mt-2">
                  创建时间：{new Date(model.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {(editingModel || isCreating) && (
        <ModelEditor
          model={editingModel || undefined}
          onSave={handleSave}
          onCancel={() => {
            setEditingModel(null);
            setIsCreating(false);
          }}
          isCustom={isCreating}
        />
      )}

      {viewModel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-2xl font-bold text-gray-800">{viewModel.name}</h3>
                <button
                  onClick={() => setViewModel(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-semibold text-gray-700 mb-2">博弈类型</h4>
                  <p className="text-gray-600">{viewModel.type}</p>
                </div>
                
                <div>
                  <h4 className="text-lg font-semibold text-gray-700 mb-2">模型描述</h4>
                  <p className="text-gray-600">{viewModel.description}</p>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-gray-700 mb-2">参与者</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {viewModel.config.players.map((player: any) => (
                      <div key={player.id} className="border rounded-lg p-4">
                        <h5 className="font-semibold mb-2">{player.name}</h5>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">可选策略：</p>
                          <ul className="list-disc list-inside text-sm text-gray-600">
                            {player.strategies.map((strategy: string) => (
                              <li key={strategy}>{strategy}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-gray-700 mb-2">收益矩阵</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse border border-gray-200">
                      <thead>
                        <tr>
                          <th className="border border-gray-200 px-4 py-2 bg-gray-50">策略组合</th>
                          {viewModel.config.players.map((player: any) => (
                            <th key={player.id} className="border border-gray-200 px-4 py-2 bg-gray-50">
                              {player.name}收益
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(viewModel.config.payoffMatrix).map(([strategies, payoffs]: [string, any]) => (
                          <tr key={strategies}>
                            <td className="border border-gray-200 px-4 py-2">{strategies}</td>
                            {payoffs.map((payoff: number, index: number) => (
                              <td key={index} className="border border-gray-200 px-4 py-2 text-center">
                                {payoff}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-4">
                <button
                  onClick={() => setViewModel(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  关闭
                </button>
                <button
                  onClick={() => {
                    handleEdit(viewModel);
                    setViewModel(null);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  编辑模型
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminModels;