import React, { useState } from 'react';
import { GameType, CLASSIC_MODELS, GameModel } from '../types/gameTheory';
import { useGameStore } from '../store/gameStore';
import { BookOpen, Plus, X, Info, Settings } from 'lucide-react';
import { ModelEditor } from './ModelEditor';

export const ModelSelector: React.FC = () => {
  const [selectedType, setSelectedType] = useState<GameType | null>(null);
  const [detailModel, setDetailModel] = useState<GameModel | null>(null);
  const [editingModel, setEditingModel] = useState<GameModel | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { setSelectedModel } = useGameStore();

  const filteredModels = selectedType
    ? CLASSIC_MODELS.filter(model => model.type === selectedType)
    : CLASSIC_MODELS;

  const handleCreateCustom = () => {
    setIsCreating(true);
  };

  const handleEditModel = (model: GameModel) => {
    setEditingModel({
      ...model,
      id: crypto.randomUUID(), // 创建副本以保留原始模型
      isClassic: false
    });
  };

  const handleSaveModel = (model: GameModel) => {
    setSelectedModel(model);
    setEditingModel(null);
    setIsCreating(false);
  };

  return (
    <>
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <div className="flex items-center gap-2 mb-6">
          <BookOpen className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-800">博弈模型选择</h2>
        </div>

        <div className="mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedType(null)}
              className={`px-4 py-2 rounded-full whitespace-nowrap ${
                selectedType === null
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              全部
            </button>
            {Object.values(GameType).map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-4 py-2 rounded-full whitespace-nowrap ${
                  selectedType === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredModels.map((model) => (
            <div
              key={model.id}
              className="border rounded-lg p-4 hover:border-blue-500 transition-colors"
            >
              <h3 className="text-lg font-semibold text-gray-800">{model.name}</h3>
              <p className="text-sm text-gray-500 mb-2">{model.type}</p>
              <p className="text-sm text-gray-600 line-clamp-2">{model.description}</p>
              <div className="mt-4 flex justify-between items-center">
                <div className="flex gap-2">
                  <button
                    onClick={() => setDetailModel(model)}
                    className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm"
                  >
                    <Info className="w-4 h-4" />
                    查看详情
                  </button>
                </div>
                <button
                  onClick={() => setSelectedModel(model)}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                >
                  选择模型
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={handleCreateCustom}
            className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-500 hover:bg-blue-50 transition-colors flex flex-col items-center justify-center gap-2 text-gray-600 hover:text-blue-600"
          >
            <Plus className="w-8 h-8" />
            <span>创建自定义模型</span>
            <p className="text-xs text-center text-gray-500">
              设计您自己的博弈模型，<br />定制参与者、策略和收益
            </p>
          </button>
        </div>
      </div>

      {/* 模型详情对话框 */}
      {detailModel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-2xl font-bold text-gray-800">{detailModel.name}</h3>
                <button
                  onClick={() => setDetailModel(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-semibold text-gray-700 mb-2">博弈类型</h4>
                  <p className="text-gray-600">{detailModel.type}</p>
                </div>
                
                <div>
                  <h4 className="text-lg font-semibold text-gray-700 mb-2">模型描述</h4>
                  <p className="text-gray-600">{detailModel.description}</p>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-gray-700 mb-2">参与者</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {detailModel.players.map(player => (
                      <div key={player.id} className="border rounded-lg p-4">
                        <h5 className="font-semibold mb-2">{player.name}</h5>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">可选策略：</p>
                          <ul className="list-disc list-inside text-sm text-gray-600">
                            {player.strategies.map(strategy => (
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
                          {detailModel.players.map(player => (
                            <th key={player.id} className="border border-gray-200 px-4 py-2 bg-gray-50">
                              {player.name}收益
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(detailModel.payoffMatrix).map(([strategies, payoffs]) => (
                          <tr key={strategies}>
                            <td className="border border-gray-200 px-4 py-2">{strategies}</td>
                            {payoffs.map((payoff, index) => (
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
                  onClick={() => setDetailModel(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  关闭
                </button>
                <button
                  onClick={() => {
                    handleEditModel(detailModel);
                    setDetailModel(null);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  参数设置
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 模型编辑器 */}
      {(editingModel || isCreating) && (
        <ModelEditor
          model={editingModel}
          onSave={handleSaveModel}
          onCancel={() => {
            setEditingModel(null);
            setIsCreating(false);
          }}
          isCustom={isCreating}
        />
      )}
    </>
  );
};
