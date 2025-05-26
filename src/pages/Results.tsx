import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Eye, Download, Play, Pause, RotateCcw, FileText, Trash2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, Cell, ResponsiveContainer } from 'recharts';
import { useToastStore } from '../components/Toast';

interface SimulationResultRecord {
  id: string;
  model_id: string;
  results: any[];
  created_at: string;
  game_models: {
    name: string;
    type: string;
    config: {
      players: Array<{
        id: number;
        name: string;
      }>;
    };
  };
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042'];

export const Results: React.FC = () => {
  const [results, setResults] = useState<SimulationResultRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState<SimulationResultRecord | null>(null);
  const [replayState, setReplayState] = useState({
    isPlaying: false,
    currentStep: 0,
    speed: 1000, // 毫秒
    isDragging: false, // 新增：是否正在拖动时间轴
  });
  const [showAnalysis, setShowAnalysis] = useState(false);
  const { addToast } = useToastStore();

  useEffect(() => {
    fetchResults();
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (replayState.isPlaying && selectedResult) {
      timer = setInterval(() => {
        setReplayState(prev => {
          if (prev.currentStep >= selectedResult.results.length - 1) {
            return { ...prev, isPlaying: false };
          }
          return { ...prev, currentStep: prev.currentStep + 1 };
        });
      }, replayState.speed);
    }
    return () => clearInterval(timer);
  }, [replayState.isPlaying, selectedResult]);

  const fetchResults = async () => {
    try {
      const { data, error } = await supabase
        .from('simulation_results')
        .select(`
          *,
          game_models (
            name,
            type,
            config
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResults(data || []);
    } catch (error) {
      console.error('获取仿真结果失败:', error);
      addToast({
        type: 'error',
        message: '获取仿真结果失败',
        duration: 3000
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).replace(/[/]/g, '');
  };

  const convertToCSV = (result: SimulationResultRecord) => {
    const players = result.game_models.config.players;
    
    let csv = '回合,';
    players.forEach(player => {
      csv += `${player.name}策略,${player.name}收益,`;
    });
    csv = csv.slice(0, -1) + '\n';

    result.results.forEach(round => {
      csv += `${round.step + 1},`;
      players.forEach(player => {
        csv += `${round.playerChoices[player.id]},${round.payoffs[player.id]},`;
      });
      csv = csv.slice(0, -1) + '\n';
    });

    return csv;
  };

  const handleExport = (result: SimulationResultRecord) => {
    try {
      const timestamp = formatDate(result.created_at);
      const filename = `${result.game_models.name}_${timestamp}`;
      const csvContent = convertToCSV(result);
      const csvBlob = new Blob(['\ufeff' + csvContent], {
        type: 'text/csv;charset=utf-8'
      });
      const csvUrl = URL.createObjectURL(csvBlob);
      const link = document.createElement('a');
      link.href = csvUrl;
      link.download = `${filename}.csv`;
      if (document.body) {
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(csvUrl);
      addToast({
        type: 'success',
        message: '导出成功',
        duration: 3000
      });
    } catch (error) {
      console.error('导出失败:', error);
      addToast({
        type: 'error',
        message: '导出失败',
        duration: 3000
      });
    }
  };

  const handleReplayControl = () => {
    if (!selectedResult) return;
    if (replayState.isPlaying) {
      setReplayState(prev => ({ ...prev, isPlaying: false }));
    } else {
      if (replayState.currentStep >= (selectedResult?.results.length || 0) - 1) {
        setReplayState({ ...replayState, currentStep: 0, isPlaying: true });
      } else {
        setReplayState(prev => ({ ...prev, isPlaying: true }));
      }
    }
  };

  const handleReplayReset = () => {
    setReplayState({ ...replayState, currentStep: 0, isPlaying: false });
  };

  // 在 handleReplayControl 函数后添加新的处理函数
  const handleTimelineChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newStep = parseInt(event.target.value);
    setReplayState(prev => ({
      ...prev,
      currentStep: newStep,
      isPlaying: false // 拖动时暂停播放
    }));
  };

  const handleTimelineMouseDown = () => {
    setReplayState(prev => ({ ...prev, isDragging: true }));
  };

  const handleTimelineMouseUp = () => {
    setReplayState(prev => ({ ...prev, isDragging: false }));
  };

  // 分析模式内容
  const generateAnalysisReport = (result: SimulationResultRecord) => {
    const players = result.game_models.config.players;
    const totalRounds = result.results.length;
    const playerStats = players.map(player => {
      const strategies = new Map<string, number>();
      let totalPayoff = 0;
      let maxPayoff = -Infinity;
      let minPayoff = Infinity;
      result.results.forEach(round => {
        const strategy = round.playerChoices[player.id];
        strategies.set(strategy, (strategies.get(strategy) || 0) + 1);
        const payoff = round.payoffs[player.id];
        totalPayoff += payoff;
        maxPayoff = Math.max(maxPayoff, payoff);
        minPayoff = Math.min(minPayoff, payoff);
      });
      return {
        player,
        avgPayoff: totalPayoff / totalRounds,
        maxPayoff,
        minPayoff,
        strategies: Object.fromEntries(strategies),
      };
    });
    return (
      <div className="space-y-6">
        <h3 className="text-xl font-semibold">数据分析报告</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="border rounded-lg p-4">
            <h4 className="text-lg font-medium mb-4">基本信息</h4>
            <ul className="space-y-2">
              <li>模型名称：{result.game_models.name}</li>
              <li>博弈类型：{result.game_models.type}</li>
              <li>仿真轮次：{totalRounds}</li>
              <li>创建时间：{formatDate(result.created_at)}</li>
            </ul>
          </div>
          <div className="border rounded-lg p-4">
            <h4 className="text-lg font-medium mb-4">整体表现</h4>
            <BarChart width={300} height={200} data={playerStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="player.name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="avgPayoff" name="平均收益">
                {playerStats.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </div>
        </div>
        <div className="space-y-4">
          <h4 className="text-lg font-medium">玩家详细分析</h4>
          {playerStats.map((stat) => (
            <div key={stat.player.id} className="border rounded-lg p-4">
              <h5 className="font-medium mb-2">{stat.player.name}</h5>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p>平均收益：{stat.avgPayoff.toFixed(2)}</p>
                  <p>最高收益：{stat.maxPayoff}</p>
                  <p>最低收益：{stat.minPayoff}</p>
                </div>
                <div>
                  <p className="mb-2">策略使用频率：</p>
                  <ul className="space-y-1">
                    {Object.entries(stat.strategies).map(([strategy, count]) => (
                      <li key={strategy}>
                        {strategy}: {((count / totalRounds) * 100).toFixed(1)}%
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="border rounded-lg p-4">
          <h4 className="text-lg font-medium mb-4">结论与建议</h4>
          <ul className="space-y-2">
            <li>• 主导策略：{playerStats.map(stat => {
              const dominantStrategy = Object.entries(stat.strategies)
                .reduce((a, b) => a[1] > b[1] ? a : b)[0];
              return `${stat.player.name}倾向于选择"${dominantStrategy}"`
            }).join('；')}</li>
            <li>• 收益分布：{playerStats.map(stat => 
              `${stat.player.name}的收益范围在${stat.minPayoff}到${stat.maxPayoff}之间`
            ).join('；')}</li>
            <li>• 均衡分析：根据收益矩阵和策略选择频率，可能存在纳什均衡</li>
          </ul>
        </div>
      </div>
    );
  };

  // 删除仿真结果
  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除这个仿真结果吗？')) return;
    try {
      const { error } = await supabase
        .from('simulation_results')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setResults(results.filter(result => result.id !== id));
      if (selectedResult?.id === id) {
        setSelectedResult(null);
      }
      addToast({
        type: 'success',
        message: '删除成功',
        duration: 3000
      });
    } catch (error) {
      console.error('删除仿真结果失败:', error);
      addToast({
        type: 'error',
        message: '删除失败',
        duration: 3000
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">仿真结果</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  模型
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  类型
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  仿真时间
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {results.map((result) => (
                <tr key={result.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {result.game_models.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {result.game_models.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(result.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      className="text-blue-600 hover:text-blue-900 mr-4"
                      onClick={() => {
                        setSelectedResult(result);
                        setReplayState({ isPlaying: false, currentStep: 0, speed: 1000 });
                        setShowAnalysis(false);
                      }}
                      title="查看详情"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      className="text-green-600 hover:text-green-900 mr-4"
                      onClick={() => handleExport(result)}
                      title="导出数据"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      className="text-red-600 hover:text-red-900"
                      onClick={() => handleDelete(result.id)}
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {selectedResult && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-800">
              {selectedResult.game_models.name} - 仿真结果详情
            </h3>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowAnalysis(!showAnalysis)}
                className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                {showAnalysis ? '查看回放' : '查看分析'}
              </button>
              <button
                onClick={() => setSelectedResult(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                关闭
              </button>
            </div>
          </div>
          {showAnalysis ? (
            generateAnalysisReport(selectedResult)
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-center gap-4 mb-4">
                <button
                  onClick={handleReplayControl}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                >
                  {replayState.isPlaying ? (
                    <>
                      <Pause className="w-4 h-4" />
                      暂停回放
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      开始回放
                    </>
                  )}
                </button>
                <button
                  onClick={handleReplayReset}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  重置
                </button>
                <select
                  value={replayState.speed}
                  onChange={(e) => setReplayState(prev => ({ ...prev, speed: Number(e.target.value) }))}
                  className="px-4 py-2 border rounded-md"
                >
                  <option value={2000}>0.5x 速度</option>
                  <option value={1000}>1x 速度</option>
                  <option value={500}>2x 速度</option>
                  <option value={250}>4x 速度</option>
                </select>
                <span className="text-gray-600">
                  回合: {replayState.currentStep + 1} / {selectedResult.results.length}
                </span>
              </div>
              <div className="w-full px-4 mb-4">
                <input
                  type="range"
                  min="0"
                  max={selectedResult.results.length - 1}
                  value={replayState.currentStep}
                  onChange={handleTimelineChange}
                  onMouseDown={handleTimelineMouseDown}
                  onMouseUp={handleTimelineMouseUp}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(replayState.currentStep / (selectedResult.results.length - 1)) * 100}%, #e5e7eb ${(replayState.currentStep / (selectedResult.results.length - 1)) * 100}%, #e5e7eb 100%)`
                  }}
                />
              </div>
              <div className="flex justify-center my-4">
                <LineChart
                  width={800}
                  height={400}
                  data={selectedResult.results.slice(0, replayState.currentStep + 1)}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="step" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {selectedResult.game_models.config.players.map((player, index) => (
                    <Line
                      key={player.id}
                      type="monotone"
                      dataKey={`payoffs.${player.id}`}
                      name={`${player.name}收益`}
                      stroke={COLORS[index % COLORS.length]}
                    />
                  ))}
                </LineChart>
              </div>
              <div className="mt-6">
                <h4 className="text-lg font-semibold text-gray-800 mb-4">当前回合数据</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">回合</th>
                        {selectedResult.game_models.config.players.map(player => (
                          <React.Fragment key={player.id}>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                              {player.name}策略
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                              {player.name}收益
                            </th>
                          </React.Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedResult.results.slice(0, replayState.currentStep + 1).map((round, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-2 text-sm text-gray-900">{round.step + 1}</td>
                          {selectedResult.game_models.config.players.map(player => (
                            <React.Fragment key={player.id}>
                              <td className="px-4 py-2 text-sm text-gray-900">
                                {round.playerChoices[player.id]}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900">
                                {round.payoffs[player.id]}
                              </td>
                            </React.Fragment>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Results; 