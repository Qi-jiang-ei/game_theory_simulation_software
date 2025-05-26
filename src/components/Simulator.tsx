import { Button } from "../components/ui/button";
import { useGameStore } from "../store/gameStore";
import { GameModel, SimulationResult } from "../types/gameTheory";

interface SimulatorProps {
  model: GameModel;
}

export function Simulator({ model }: SimulatorProps) {
  const { results, isRunning, startSimulation, stopSimulation, resetSimulation, saveSimulationResults } = useGameStore();

  const handleStartStop = () => {
    if (isRunning) {
      stopSimulation();
    } else {
      startSimulation();
    }
  };

  const handleReset = () => {
    resetSimulation();
  };

  const handleSave = async () => {
    try {
      await saveSimulationResults();
    } catch (error) {
      console.error('保存失败:', error);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">仿真控制</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={!results.length}
          >
            重置
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={!results.length}
          >
            保存结果
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button
          onClick={handleStartStop}
          disabled={!model}
          className="w-24"
        >
          {isRunning ? '停止' : '开始'}
        </Button>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">仿真回合</h2>
        <div className="space-y-4">
          {results.map((result: SimulationResult, index: number) => (
            <div
              key={index}
              className="p-4 bg-white rounded-lg shadow-sm border"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">回合 {result.step + 1}</span>
                {result.signals && (
                  <div className="text-sm text-gray-500">
                    信号: {Object.entries(result.signals).map(([key, value]) => (
                      <span key={key} className="ml-2">
                        {key}: {String(value)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                {model.players.map((player) => (
                  <div key={player.id} className="space-y-2">
                    <div className="text-sm font-medium">{player.name}</div>
                    <div className="text-sm text-gray-600">
                      策略: {result.playerChoices[player.id]}
                    </div>
                    <div className="text-sm text-gray-600">
                      收益: {result.payoffs[player.id]}
                    </div>
                    {result.beliefs && result.beliefs[player.id] && (
                      <div className="text-sm text-gray-600">
                        信念: {Object.entries(result.beliefs[player.id])
                          .map(([strategy, probability]) => (
                            <span key={strategy} className="mr-2">
                              {strategy}: {(Number(probability) * 100).toFixed(1)}%
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 