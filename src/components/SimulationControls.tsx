import React from 'react';
import { Play, Pause, RotateCcw, Save, Upload, ChevronRight, Info } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, ReferenceLine } from 'recharts';
import { GameModel, GameType, CLASSIC_MODELS } from '../types/gameTheory';
import { findDominantStrategy, calculateBestResponse, calculateStrategyChoice as calcStrategyChoice } from '../utils/gameTheory';
import { GameStore } from '../store/gameStore';
import { useToastStore } from './Toast';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042'];

// 自定义 Tooltip 组件
const CustomTooltip: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="group relative inline-block">
    {children}
    <div className="invisible group-hover:visible absolute z-10 px-3 py-2 text-sm text-white bg-gray-900 rounded-md -top-2 left-full ml-2 w-64">
      {title}
    </div>
  </div>
);

// 渲染均衡分析组件
const EquilibriumAnalysis: React.FC<{ model: GameModel; results: any[] }> = ({ model, results }) => {
  if (!results[0]?.signals?.analysis) {
    return null;
  }

  const analysis = JSON.parse(results[0].signals.analysis);
  
  return (
    <div className="border rounded-lg p-4 mt-4">
      <h4 className="text-lg font-semibold mb-2">均衡分析</h4>
      {analysis.dominantStrategies.some((s: number | undefined) => s !== undefined) && (
        <div className="mb-2">
          <p className="font-medium">占优策略：</p>
          {model.players.map((player, index) => (
            analysis.dominantStrategies[index] !== undefined && (
              <p key={player.id}>
                {player.name}: {player.strategies[analysis.dominantStrategies[index]]}
              </p>
            )
          ))}
        </div>
      )}
      
      {analysis.mixedEquilibrium && (
        <div>
          <p className="font-medium">混合策略均衡：</p>
          {model.players.map((player, index) => (
            <p key={player.id}>
              {player.name}: {(index === 0 ? analysis.mixedEquilibrium.p1 : analysis.mixedEquilibrium.p2).toFixed(2)}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};

interface PieChartData {
  name: string;
  value: number;
}

interface BarChartData {
  name: string;
  value: number;
}

interface StrategyData {
  name: string;
  [key: string]: string | number;
}

export const SimulationControls: React.FC = () => {
  const { selectedModelId, simulationState, startSimulation, stopSimulation, resetSimulation, saveSimulationResults } = useGameStore();
  const { addToast } = useToastStore();
  
  // 根据 selectedModelId 获取当前选中的模型
  const selectedModel = selectedModelId ? CLASSIC_MODELS.find(m => m.id === selectedModelId) : null;

  if (!selectedModel) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <p className="text-gray-500 text-center">请先选择一个博弈模型</p>
      </div>
    );
  }

  const handleSave = async () => {
    try {
      await saveSimulationResults();
      addToast({
        type: 'success',
        message: '仿真结果保存成功',
        duration: 3000
      });
    } catch (error) {
      console.error('保存仿真结果失败:', error);
      addToast({
        type: 'error',
        message: '保存仿真结果失败',
        duration: 3000
      });
    }
  };

  const renderModelSpecificVisualizations = () => {
    if (!selectedModel || simulationState.results.length === 0) {
      return <p className="text-gray-500 text-center">暂无仿真数据</p>;
    }

    // 获取均衡分析数据
    const analysis = simulationState.results[0]?.signals?.analysis 
      ? JSON.parse(simulationState.results[0].signals.analysis)
      : null;

    return (
      <div className="space-y-6">
        {/* 均衡分析 */}
        {analysis && (
          <div className="border rounded-lg p-4">
            <h4 className="text-lg font-semibold mb-4">均衡分析</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-medium">均衡类型：{analysis.equilibriumType}</p>
                <p className="font-medium">收敛状态：{analysis.convergence ? '已收敛' : '未收敛'}</p>
              </div>
              <div>
                <p className="font-medium">稳定性分析：</p>
                <ul className="list-disc list-inside">
                  {Object.entries(analysis.stabilityAnalysis?.deviationGains || {}).map(([playerId, gain]) => (
                    <li key={playerId}>
                      玩家{playerId}偏离收益: {(gain as number).toFixed(2)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* 策略选择分布 */}
        <div className="border rounded-lg p-4">
          <h4 className="text-lg font-semibold mb-4">策略选择分布</h4>
          <div className="grid grid-cols-2 gap-4">
            {selectedModel.players.map((player, index) => {
              const strategyData = player.strategies.map(strategy => ({
                name: strategy,
                value: simulationState.results.filter(r => r.playerChoices[player.id] === strategy).length
              }));

              return (
                <div key={player.id} className="text-center">
                  <h5 className="text-sm font-medium mb-2">{player.name}</h5>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={strategyData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        fill="#8884d8"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {strategyData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              );
            })}
          </div>
        </div>

        {/* 收益趋势 */}
        <div className="border rounded-lg p-4">
          <h4 className="text-lg font-semibold mb-4">收益趋势</h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={simulationState.results}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="step" 
                tickFormatter={v => v + 1}
                label={{
                  value: '仿真回合',
                  position: 'insideRight',
                  dy:20,
                  offset: 10,
                  style: { fontWeight: 'bold' }
                }}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              {selectedModel.players.map((player, index) => (
                <Line
                  key={player.id}
                  type="monotone"
                  dataKey={(d) => d.payoffs[player.id]}
                  name={`${player.name}收益`}
                  stroke={COLORS[index % COLORS.length]}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 信念更新（仅不完全信息博弈） */}
        {(selectedModel.type === GameType.INCOMPLETE_STATIC || 
          selectedModel.type === GameType.INCOMPLETE_DYNAMIC) && (
          <div className="border rounded-lg p-4">
            <h4 className="text-lg font-semibold mb-4">信念更新</h4>
            <div className="grid grid-cols-2 gap-4">
              {selectedModel.players.map((player, index) => {
                const beliefData = simulationState.results
                  .filter(r => r.beliefs?.[player.id])
                  .map(r => ({
                    step: r.step,
                    ...r.beliefs![player.id]
                  }));

                return (
                  <div key={player.id}>
                    <h5 className="text-sm font-medium mb-2">{player.name}的信念</h5>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={beliefData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="step" />
                        <YAxis domain={[0, 1]} />
                        <Tooltip />
                        <Legend />
                        {player.strategies.map((strategy, i) => (
                          <Line
                            key={strategy}
                            type="monotone"
                            dataKey={strategy}
                            name={strategy}
                            stroke={COLORS[i % COLORS.length]}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg space-y-6">
      {selectedModel && (
        <div className="text-lg font-semibold text-gray-800">
          当前选择的模型：{selectedModel.name}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="space-x-2">
          {!simulationState.isRunning ? (
            <button
              onClick={startSimulation}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              开始仿真
            </button>
          ) : (
            <button
              onClick={stopSimulation}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors flex items-center gap-2"
            >
              <Pause className="w-4 h-4" />
              暂停
            </button>
          )}
          <button
            onClick={resetSimulation}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            重置
          </button>
        </div>

        <div className="space-x-2">
          <button 
            onClick={handleSave}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            保存结果
          </button>
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <ChevronRight className="w-5 h-5 text-blue-600" />
          仿真结果可视化
        </h3>
        
        {renderModelSpecificVisualizations()}
      </div>
    </div>
  );
};

function verifyMixedEquilibrium(model: GameModel, p1: number, p2: number): boolean {
  const player1 = model.players[0];
  const player2 = model.players[1];
  
  // 计算玩家1的期望收益
  const p1Strategy1Payoff = p2 * model.payoffMatrix[`${player1.strategies[0]},${player2.strategies[0]}`][0] +
                           (1 - p2) * model.payoffMatrix[`${player1.strategies[0]},${player2.strategies[1]}`][0];
  const p1Strategy2Payoff = p2 * model.payoffMatrix[`${player1.strategies[1]},${player2.strategies[0]}`][0] +
                           (1 - p2) * model.payoffMatrix[`${player1.strategies[1]},${player2.strategies[1]}`][0];
  
  // 计算玩家2的期望收益
  const p2Strategy1Payoff = p1 * model.payoffMatrix[`${player1.strategies[0]},${player2.strategies[0]}`][1] +
                           (1 - p1) * model.payoffMatrix[`${player1.strategies[1]},${player2.strategies[0]}`][1];
  const p2Strategy2Payoff = p1 * model.payoffMatrix[`${player1.strategies[0]},${player2.strategies[1]}`][1] +
                           (1 - p1) * model.payoffMatrix[`${player1.strategies[1]},${player2.strategies[1]}`][1];
  
  // 计算玩家1的期望收益
  const p1ExpectedPayoff = p1 * p1Strategy1Payoff + (1 - p1) * p1Strategy2Payoff;
  
  // 计算玩家2的期望收益
  const p2ExpectedPayoff = p2 * p2Strategy1Payoff + (1 - p2) * p2Strategy2Payoff;
  
  // 检查是否达到混合策略均衡
  const isMixedEquilibrium = Math.abs(p1ExpectedPayoff - p1) < 1e-6 && Math.abs(p2ExpectedPayoff - p2) < 1e-6;
  
  return isMixedEquilibrium;
}