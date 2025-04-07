import React from 'react';
import { Play, Pause, RotateCcw, Save, Upload, ChevronRight } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
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
          <div className="space-y-8">
            <div className="border rounded-lg p-6">
              <h4 className="text-lg font-semibold mb-4">收益变化趋势</h4>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart
                  data={simulationState.results}
                  margin={{ top: 5, right: 30, left: 20, bottom: 30 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="step" 
                    label={{ value: '仿真回合', position: 'bottom', offset: 10,style: { fontWeight: 'bold' } }}
                  />
                  <YAxis 
                    label={{ value: '收益值', angle: 0, position: 'top', offset: 10,style: { fontWeight: 'bold' } }}
                  />
                  <Tooltip />
                  <Legend verticalAlign="top" height={36} />
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
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {selectedModel.players.map((player, index) => (
                <div key={player.id} className="border rounded-lg p-6">
                  <h4 className="text-lg font-semibold mb-4">{player.name}策略选择分布</h4>
                  <div className="flex justify-center">
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={player.strategies.map(strategy => ({
                            name: strategy,
                            value: simulationState.results.filter(r => 
                              r.playerChoices[player.id] === strategy
                            ).length
                          }))}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {player.strategies.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case GameType.COMPLETE_DYNAMIC:
        return (
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-6">
              <div className="border rounded-lg p-6">
                <h4 className="text-lg font-semibold mb-4">累计收益对比</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={selectedModel.players.map(player => ({
                      name: player.name,
                      value: simulationState.results.reduce((sum, r) => 
                        sum + r.payoffs[player.id], 0
                      )
                    }))}
                    margin={{ top: 5, right: 40, left: 40, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis label={{ value: '累计收益', angle: 0, position: 'insideLeft' ,offset:-40}} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8884d8">
                      {selectedModel.players.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="border rounded-lg p-6">
                <h4 className="text-lg font-semibold mb-4">决策路径追踪</h4>
                <div className="h-[300px] overflow-auto">
                  {simulationState.results.map((result, index) => (
                    <div key={index} className="mb-2">
                      <div className="text-sm text-gray-500">回合 {result.step + 1}</div>
                      <div className="flex items-center gap-2 mt-1">
                        {selectedModel.players.map((player, pIndex) => (
                          <React.Fragment key={player.id}>
                            <span className="px-2 py-1 rounded bg-gray-100 text-sm">
                              {player.name}: {result.playerChoices[player.id]}
                            </span>
                            {pIndex < selectedModel.players.length - 1 && (
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="border rounded-lg p-6">
              <h4 className="text-lg font-semibold mb-4">收益变化趋势</h4>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart
                  data={simulationState.results}
                  margin={{ top: 5, right: 30, left: 20, bottom: 30 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="step" 
                    label={{ value: '仿真回合', position: 'bottom', offset: 10, style: { fontWeight: 'bold' } }}
                  />
                  <YAxis 
                    label={{ value: '收益值', angle: 0, position: 'top', offset: 10, style: { fontWeight: 'bold' } }}
                  />
                  <Tooltip />
                  <Legend verticalAlign="top" height={36} />
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
              </ResponsiveContainer>
            </div>
          </div>
        );

      case GameType.INCOMPLETE_STATIC:
        return (
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-6">
              <div className="border rounded-lg p-6">
                <h4 className="text-lg font-semibold mb-4">策略选择频率分析</h4>
                <ResponsiveContainer width="100%" height={360}>
                  <BarChart
                    data={selectedModel.players.flatMap(player =>
                      player.strategies.map(strategy => ({
                        name: `${player.name}-${strategy}`,
                        count: simulationState.results.filter(r =>
                          r.playerChoices[player.id] === strategy
                        ).length
                      }))
                    )}
                    margin={{ top: 5, right: 30, left: 30, bottom: 50 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis label={{ value: '选择次数', angle: 0, position: 'insideLeft',offset: -30 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8">
                      {selectedModel.players.flatMap(player =>
                        player.strategies.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))
                      )}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="border rounded-lg p-6">
                <h4 className="text-lg font-semibold mb-4">平均收益分析</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={selectedModel.players.map(player => ({
                      name: player.name,
                      value: simulationState.results.reduce((sum, r) =>
                        sum + r.payoffs[player.id], 0
                      ) / simulationState.results.length
                    }))}
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis label={{ value: '平均收益', angle: 0, position: 'insideLeft',offset: -40 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8884d8">
                      {selectedModel.players.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        );

      case GameType.INCOMPLETE_DYNAMIC:
        return (
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-6">
              <div className="border rounded-lg p-6">
                <h4 className="text-lg font-semibold mb-4">信号传递效果分析</h4>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart
                    data={simulationState.results}
                    margin={{ top: 5, right: 30, left: 20, bottom: 30 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="step" 
                      label={{ value: '仿真回合', position: 'bottom', offset: 10 }}
                    />
                    <YAxis 
                      label={{ value: '收益值', angle: 0, position: 'insideLeft', offset: -20 }}
                    />
                    <Tooltip />
                    <Legend verticalAlign="top" height={36} />
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
                </ResponsiveContainer>
              </div>
              <div className="border rounded-lg p-6">
                <h4 className="text-lg font-semibold mb-4">策略匹配分析</h4>
                <div className="h-[300px] overflow-auto space-y-4">
                  {simulationState.results.map((result, index) => (
                    <div key={index} className="border rounded p-3">
                      <div className="text-sm font-medium mb-2">回合 {result.step + 1}</div>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedModel.players.map(player => (
                          <div
                            key={player.id}
                            className="bg-gray-50 p-2 rounded"
                          >
                            <div className="font-medium">{player.name}</div>
                            <div className="text-sm text-gray-600">
                              策略: {result.playerChoices[player.id]}
                            </div>
                            <div className="text-sm text-gray-600">
                              收益: {result.payoffs[player.id]}
                            </div>
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
          仿真结果可视化
        </h3>
        
        {renderVisualization()}
      </div>
    </div>
  );
};