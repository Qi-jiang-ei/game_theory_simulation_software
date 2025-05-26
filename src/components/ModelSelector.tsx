import React, { useState } from 'react';
import { GameType, CLASSIC_MODELS, GameModel } from '../types/gameTheory';
import { useGameStore } from '../store/gameStore';
import { BookOpen, Plus, X, Info, Settings } from 'lucide-react';

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
    setSelectedModel(model.id);
    setEditingModel(null);
    setIsCreating(false);
  };

  const MAIN_TYPES = [
    GameType.COMPLETE_STATIC,
    GameType.COMPLETE_DYNAMIC,
    GameType.INCOMPLETE_STATIC,
    GameType.INCOMPLETE_DYNAMIC
  ];

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
            {MAIN_TYPES.map((type) => (
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
                  onClick={() => setSelectedModel(model.id)}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                >
                  选择模型
                </button>
              </div>
            </div>
          ))}
          {/* 注释掉创建自定义模型按钮 */}
          {/* <button
            onClick={handleCreateCustom}
            className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-500 hover:bg-blue-50 transition-colors flex flex-col items-center justify-center gap-2 text-gray-600 hover:text-blue-600"
          >
            <Plus className="w-8 h-8" />
            <span>创建自定义模型</span>
            <p className="text-xs text-center text-gray-500">
              设计您自己的博弈模型，<br />定制参与者、策略和收益
            </p>
          </button> */}
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
      {editingModel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-xl font-bold mb-4">参数设置</h3>
            {/* 模型名称 */}
            <div className="mb-4">
              <label className="block mb-1">模型名称</label>
              <input
                className="border px-2 py-1 rounded w-full"
                value={editingModel.name}
                onChange={e => setEditingModel({ ...editingModel, name: e.target.value })}
              />
            </div>
            {/* 模型描述 */}
            <div className="mb-4">
              <label className="block mb-1">模型描述</label>
              <textarea
                className="border px-2 py-1 rounded w-full"
                value={editingModel.description}
                onChange={e => setEditingModel({ ...editingModel, description: e.target.value })}
              />
            </div>
            {/* 参与者与策略 */}
            <div className="mb-4">
              <label className="block mb-1">参与者与策略</label>
              {editingModel.players.map((player, pIdx) => (
                <div key={player.id} className="mb-2 border rounded p-2">
                  <input
                    className="border px-2 py-1 rounded mb-1 w-1/2"
                    value={player.name}
                    onChange={e => {
                      const newPlayers = [...editingModel.players];
                      newPlayers[pIdx].name = e.target.value;
                      setEditingModel({ ...editingModel, players: newPlayers });
                    }}
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {player.strategies.map((strategy, sIdx) => (
                      <input
                        key={sIdx}
                        className="border px-2 py-1 rounded"
                        value={strategy}
                        onChange={e => {
                          const newPlayers = [...editingModel.players];
                          newPlayers[pIdx].strategies[sIdx] = e.target.value;
                          setEditingModel({ ...editingModel, players: newPlayers });
                        }}
                      />
                    ))}
                    <button
                      className="ml-2 px-2 py-1 bg-blue-100 text-blue-600 rounded"
                      onClick={() => {
                        const newPlayers = [...editingModel.players];
                        newPlayers[pIdx].strategies.push('新策略');
                        setEditingModel({ ...editingModel, players: newPlayers });
                      }}
                      type="button"
                    >+策略</button>
                  </div>
                </div>
              ))}
            </div>
            {/* 收益矩阵 */}
            <div className="mb-4">
              <label className="block mb-1">收益矩阵</label>
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border border-gray-200">
                  <thead>
                    <tr>
                      <th className="border border-gray-200 px-2 py-1 bg-gray-50">策略组合</th>
                      {editingModel.players.map(player => (
                        <th key={player.id} className="border border-gray-200 px-2 py-1 bg-gray-50">{player.name}收益</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(editingModel.payoffMatrix).map(([strategies, payoffs], rowIdx) => (
                      <tr key={strategies}>
                        <td className="border border-gray-200 px-2 py-1">{strategies}</td>
                        {payoffs.map((payoff, idx) => (
                          <td key={idx} className="border border-gray-200 px-2 py-1 text-center">
                            <input
                              className="border px-1 py-0.5 rounded w-16 text-center"
                              value={payoff}
                              type="number"
                              onChange={e => {
                                const newMatrix = { ...editingModel.payoffMatrix };
                                newMatrix[strategies][idx] = Number(e.target.value);
                                setEditingModel({ ...editingModel, payoffMatrix: newMatrix });
                              }}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => setEditingModel(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={() => {
                  handleSaveModel(editingModel);
                  setEditingModel(null);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
