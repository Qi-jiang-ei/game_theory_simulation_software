import React, { useState, useEffect } from 'react';
import { GameModel, GameType, Player } from '../types/gameTheory';
import { Plus, Minus, Save, X, HelpCircle, AlertCircle } from 'lucide-react';
import { useToastStore } from './Toast';

interface ModelEditorProps {
  model?: GameModel;
  onSave: (model: GameModel) => void;
  onCancel: () => void;
  isCustom?: boolean;
}

export const ModelEditor: React.FC<ModelEditorProps> = ({ model, onSave, onCancel, isCustom = false }) => {
  const [name, setName] = useState(model?.name || '');
  const [type, setType] = useState<GameType>(model?.type || GameType.COMPLETE_STATIC);
  const [description, setDescription] = useState(model?.description || '');
  const [players, setPlayers] = useState<Player[]>(
    model?.players || [
      { id: 1, name: '玩家1', strategies: ['策略A'] },
      { id: 2, name: '玩家2', strategies: ['策略A'] }
    ]
  );
  const [payoffMatrix, setPayoffMatrix] = useState<{ [key: string]: number[] }>(
    model?.payoffMatrix || {}
  );
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const { addToast } = useToastStore();

  useEffect(() => {
    updatePayoffMatrix();
  }, [players]);

  const updatePayoffMatrix = () => {
    const newMatrix: { [key: string]: number[] } = {};
    const generateCombinations = (current: string[], playerIndex: number): void => {
      if (playerIndex === players.length) {
        const key = current.join(',');
        newMatrix[key] = payoffMatrix[key] || Array(players.length).fill(0);
        return;
      }
      players[playerIndex].strategies.forEach(strategy => {
        generateCombinations([...current, strategy], playerIndex + 1);
      });
    };
    generateCombinations([], 0);
    setPayoffMatrix(newMatrix);
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!name.trim()) {
      newErrors.name = '请输入模型名称';
    }

    if (!description.trim()) {
      newErrors.description = '请输入模型描述';
    }

    players.forEach((player, index) => {
      if (!player.name.trim()) {
        newErrors[`player_${index}_name`] = '请输入参与者名称';
      }
      player.strategies.forEach((strategy, sIndex) => {
        if (!strategy.trim()) {
          newErrors[`player_${index}_strategy_${sIndex}`] = '请输入策略名称';
        }
      });
    });

    Object.entries(payoffMatrix).forEach(([combination, payoffs]) => {
      payoffs.forEach((payoff, index) => {
        if (isNaN(payoff)) {
          newErrors[`payoff_${combination}_${index}`] = '收益值必须是数字';
        }
      });
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const addPlayer = () => {
    if (players.length < 4) {
      const newId = Math.max(...players.map(p => p.id)) + 1;
      setPlayers([
        ...players,
        { id: newId, name: `玩家${newId}`, strategies: ['策略A'] }
      ]);
      addToast({
        type: 'success',
        message: '成功添加新参与者',
        duration: 2000
      });
    }
  };

  const removePlayer = (playerId: number) => {
    if (players.length > 2) {
      setPlayers(players.filter(p => p.id !== playerId));
      addToast({
        type: 'info',
        message: '已移除参与者',
        duration: 2000
      });
    }
  };

  const addStrategy = (playerId: number) => {
    setPlayers(players.map(player => {
      if (player.id === playerId) {
        return {
          ...player,
          strategies: [...player.strategies, `策略${String.fromCharCode(65 + player.strategies.length)}`]
        };
      }
      return player;
    }));
  };

  const removeStrategy = (playerId: number, strategyIndex: number) => {
    setPlayers(players.map(player => {
      if (player.id === playerId && player.strategies.length > 1) {
        const newStrategies = [...player.strategies];
        newStrategies.splice(strategyIndex, 1);
        return { ...player, strategies: newStrategies };
      }
      return player;
    }));
  };

  const updateStrategyName = (playerId: number, index: number, value: string) => {
    setPlayers(players.map(player => {
      if (player.id === playerId) {
        const newStrategies = [...player.strategies];
        newStrategies[index] = value;
        return { ...player, strategies: newStrategies };
      }
      return player;
    }));
  };

  const updatePlayerName = (playerId: number, value: string) => {
    setPlayers(players.map(player => {
      if (player.id === playerId) {
        return { ...player, name: value };
      }
      return player;
    }));
  };

  const updatePayoff = (combination: string, playerIndex: number, value: string) => {
    const newPayoffs = [...payoffMatrix[combination]];
    newPayoffs[playerIndex] = Number(value);
    setPayoffMatrix({ ...payoffMatrix, [combination]: newPayoffs });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      addToast({
        type: 'error',
        message: '请检查并填写所有必填项',
        duration: 3000
      });
      return;
    }

    const newModel: GameModel = {
      id: model?.id || crypto.randomUUID(),
      name,
      type,
      description,
      players,
      payoffMatrix,
      isClassic: false
    };

    onSave(newModel);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">
              {isCustom ? '创建自定义模型' : '编辑模型参数'}
            </h2>
            <button
              type="button"
              onClick={onCancel}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                模型名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`mt-1 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                required
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">博弈类型</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as GameType)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                disabled={!isCustom}
              >
                {Object.values(GameType).map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                模型描述 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className={`mt-1 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                  errors.description ? 'border-red-300' : 'border-gray-300'
                }`}
                required
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description}</p>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">参与者设置</h3>
                {isCustom && (
                  <button
                    type="button"
                    onClick={addPlayer}
                    disabled={players.length >= 4}
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700 disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    添加参与者
                  </button>
                )}
              </div>
              <div className="space-y-4">
                {players.map((player, playerIndex) => (
                  <div key={player.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700">
                          参与者名称 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={player.name}
                          onChange={(e) => updatePlayerName(player.id, e.target.value)}
                          className={`mt-1 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                            errors[`player_${playerIndex}_name`] ? 'border-red-300' : 'border-gray-300'
                          }`}
                        />
                        {errors[`player_${playerIndex}_name`] && (
                          <p className="mt-1 text-sm text-red-600">{errors[`player_${playerIndex}_name`]}</p>
                        )}
                      </div>
                      {isCustom && players.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removePlayer(player.id)}
                          className="ml-4 text-red-600 hover:text-red-700"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        可选策略 <span className="text-red-500">*</span>
                      </label>
                      <div className="space-y-2 mt-2">
                        {player.strategies.map((strategy, strategyIndex) => (
                          <div key={strategyIndex} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={strategy}
                              onChange={(e) => updateStrategyName(player.id, strategyIndex, e.target.value)}
                              className={`block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                                errors[`player_${playerIndex}_strategy_${strategyIndex}`] ? 'border-red-300' : 'border-gray-300'
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => removeStrategy(player.id, strategyIndex)}
                              className="text-red-600 hover:text-red-700"
                              disabled={player.strategies.length === 1}
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => addStrategy(player.id)}
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                        >
                          <Plus className="w-4 h-4" />
                          添加策略
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-lg font-medium text-gray-900">收益矩阵</h3>
                <button
                  type="button"
                  className="text-gray-500 hover:text-gray-700"
                  title="每个单元格表示在特定策略组合下各参与者获得的收益值"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border border-gray-200">
                  <thead>
                    <tr>
                      <th className="border border-gray-200 px-4 py-2 bg-gray-50">
                        策略组合
                      </th>
                      {players.map(player => (
                        <th key={player.id} className="border border-gray-200 px-4 py-2 bg-gray-50">
                          {player.name}收益
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(payoffMatrix).map(([combination, payoffs]) => (
                      <tr key={combination}>
                        <td className="border border-gray-200 px-4 py-2 font-medium">
                          {combination}
                        </td>
                        {payoffs.map((payoff, index) => (
                          <td key={index} className="border border-gray-200 px-4 py-2">
                            <input
                              type="number"
                              value={payoff}
                              onChange={(e) => updatePayoff(combination, index, e.target.value)}
                              className={`w-full border-0 focus:ring-0 ${
                                errors[`payoff_${combination}_${index}`] ? 'bg-red-50' : ''
                              }`}
                              step="0.1"
                            />
                            {errors[`payoff_${combination}_${index}`] && (
                              <p className="mt-1 text-sm text-red-600">
                                {errors[`payoff_${combination}_${index}`]}
                              </p>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isCustom ? '创建模型' : '保存修改'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};