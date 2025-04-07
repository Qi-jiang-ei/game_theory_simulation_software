import React from 'react';
import { Play, Pause, RotateCcw, Save, Upload, ChevronRight } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { GameType } from '../types/gameTheory';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042'];

export const SimulationControls: React.FC = () => {
  const { 
    selectedModel,
    simulationState,
    startSimulation,
    pauseSimulation,
    resetSimulation,
    saveSimulationResults
  } = useGameStore();

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
      alert('仿真结果保存成功！');
    } catch (error) {
      alert('保存失败，请重试');
    }
  };

  const renderVisualization = () => {
    if (simulationState.results.length === 0) {
      return <p className="text-gray-500 text-center">暂无仿真数据</p>;
    }

    switch (selectedModel.type) {
      case GameType.COMPLETE_STATIC:
        return (
          <div className="space-y-6">
            <LineChart
              width={800}
              height={300}
              data={simulationState.results}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="step" />
              <YAxis />
              <Tooltip />
              <Legend />
              {selectedModel.players.map((player, index) => (
                <Line
                  key={player.id}
                  type="monotone"
                  dataKey={(d) => d.payoffs[player.id]}
                  name={`${player.name}收益`}
                  stroke={COLORS[index]}
                />
              ))}
            </LineChart>
            <div className="grid grid-cols-2 gap-4">
              {selectedModel.players.map((player, index) => (
                <div key={player.id} className="border rounded-lg p-4">
                  <h4 className="text-lg font-semibold mb-2">{player.name}策略分布</h4>
                  <PieChart width={300} height={200}>
                    <Pie
                      data={player.strategies.map(strategy => ({
                        name: strategy,
                        value: simulationState.results.filter(r => 
                          r.playerChoices[player.id] === strategy
                        ).length
                      }))}
                      cx={150}
                      cy={100}
                      innerRadius={40}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label
                    >
                      {player.strategies.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </div>
              ))}
            </div>
          </div>
        );

      case GameType.COMPLETE_DYNAMIC:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-lg font-semibold mb-2">累计收益</h4>
                <BarChart
                  width={400}
                  height={300}
                  data={selectedModel.players.map(player => ({
                    name: player.name,
                    value: simulationState.results.reduce((sum, r) => 
                      sum + r.payoffs[player.id], 0
                    )
                  }))}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8">
                    {selectedModel.players.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </div>
              <div>
                <h4 className="text-lg font-semibold mb-2">决策树路径</h4>
                <div className="border rounded-lg p-4 h-[300px] overflow-auto">
                  {simulationState.results.map((result, index) => (
                    <div key={index} className="mb-2 flex items-center">
                      <span className="text-sm text-gray-500">步骤 {result.step}:</span>
                      <div className="ml-2 flex items-center">
                        {selectedModel.players.map((player, pIndex) => (
                          <React.Fragment key={player.id}>
                            <span className="px-2 py-1 rounded bg-gray-100 text-sm">
                              {player.name}: {result.playerChoices[player.id]}
                            </span>
                            {pIndex < selectedModel.players.length - 1 && (
                              <ChevronRight className="w-4 h-4 mx-1 text-gray-400" />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <LineChart
              width={800}
              height={200}
              data={simulationState.results}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="step" />
              <YAxis />
              <Tooltip />
              <Legend />
              {selectedModel.players.map((player, index) => (
                <Line
                  key={player.id}
                  type="monotone"
                  dataKey={(d) => d.payoffs[player.id]}
                  name={`${player.name}收益`}
                  stroke={COLORS[index]}
                />
              ))}
            </LineChart>
          </div>
        );

      case GameType.INCOMPLETE_STATIC:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-lg font-semibold mb-2">策略选择频率</h4>
                <BarChart
                  width={400}
                  height={300}
                  data={selectedModel.players.flatMap(player =>
                    player.strategies.map(strategy => ({
                      name: `${player.name}-${strategy}`,
                      count: simulationState.results.filter(r =>
                        r.playerChoices[player.id] === strategy
                      ).length
                    }))
                  )}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8">
                    {selectedModel.players.flatMap(player =>
                      player.strategies.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))
                    )}
                  </Bar>
                </BarChart>
              </div>
              <div>
                <h4 className="text-lg font-semibold mb-2">平均收益</h4>
                <BarChart
                  width={400}
                  height={300}
                  data={selectedModel.players.map(player => ({
                    name: player.name,
                    value: simulationState.results.reduce((sum, r) =>
                      sum + r.payoffs[player.id], 0
                    ) / simulationState.results.length
                  }))}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8">
                    {selectedModel.players.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </div>
            </div>
          </div>
        );

      case GameType.INCOMPLETE_DYNAMIC:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-lg font-semibold mb-2">信号传递效果</h4>
                <LineChart
                  width={400}
                  height={300}
                  data={simulationState.results}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="step" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {selectedModel.players.map((player, index) => (
                    <Line
                      key={player.id}
                      type="monotone"
                      dataKey={(d) => d.payoffs[player.id]}
                      name={`${player.name}收益`}
                      stroke={COLORS[index]}
                    />
                  ))}
                </LineChart>
              </div>
              <div>
                <h4 className="text-lg font-semibold mb-2">策略匹配分析</h4>
                <div className="border rounded-lg p-4 h-[300px] overflow-auto">
                  {simulationState.results.map((result, index) => (
                    <div key={index} className="mb-2">
                      <div className="text-sm text-gray-500">回合 {result.step + 1}</div>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        {selectedModel.players.map(player => (
                          <div
                            key={player.id}
                            className="px-2 py-1 rounded bg-gray-100 text-sm"
                          >
                            <span className="font-medium">{player.name}:</span>{' '}
                            {result.playerChoices[player.id]}
                            <span className="ml-2 text-gray-600">
                              (收益: {result.payoffs[player.id]})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return <p className="text-gray-500 text-center">暂不支持该类型博弈的可视化</p>;
    }
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
              onClick={pauseSimulation}
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
          <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-2">
            <Upload className="w-4 h-4" />
            导入数据
          </button>
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <ChevronRight className="w-5 h-5 text-blue-600" />
          仿真结果
        </h3>
        
        {renderVisualization()}
      </div>
    </div>
  );
};
