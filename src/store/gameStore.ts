import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';
import { GameModel, GameType, SimulationState, SimulationResult } from '../types/gameTheory';

interface GameStore {
  selectedModel: GameModel | null;
  simulationState: SimulationState;
  setSelectedModel: (model: GameModel) => void;
  startSimulation: () => void;
  pauseSimulation: () => void;
  resetSimulation: () => void;
  updateSimulationStep: () => void;
  saveSimulationResults: () => Promise<void>;
}

const defaultSimulationState: SimulationState = {
  currentStep: 0,
  isRunning: false,
  results: [],
};

export const useGameStore = create<GameStore>((set, get) => ({
  selectedModel: null,
  simulationState: defaultSimulationState,
  
  setSelectedModel: (model) => {
    set({ 
      selectedModel: model,
      simulationState: defaultSimulationState
    });
  },
  
  startSimulation: () => {
    set((state) => ({
      simulationState: {
        ...state.simulationState,
        isRunning: true
      }
    }));
    
    const interval = setInterval(() => {
      const { simulationState } = get();
      if (simulationState.isRunning) {
        get().updateSimulationStep();
      }
    }, 1000);

    return () => clearInterval(interval);
  },
  
  pauseSimulation: () => set((state) => ({
    simulationState: {
      ...state.simulationState,
      isRunning: false
    }
  })),
  
  resetSimulation: () => set({
    simulationState: defaultSimulationState
  }),
  
  updateSimulationStep: () => {
    const store = get();
    const { selectedModel, simulationState } = store;
    if (!selectedModel || !simulationState.isRunning) return;

    const result = simulateStep(selectedModel, simulationState.currentStep, store);

    set((state) => ({
      simulationState: {
        ...state.simulationState,
        currentStep: state.simulationState.currentStep + 1,
        results: [...state.simulationState.results, result]
      }
    }));
  },

  saveSimulationResults: async () => {
    const { selectedModel, simulationState } = get();
    if (!selectedModel || simulationState.results.length === 0) return;

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      throw new Error('用户未登录');
    }

    // 首先保存模型
    const { data: modelData, error: modelError } = await supabase
      .from('game_models')
      .insert({
        name: selectedModel.name,
        type: selectedModel.type,
        description: selectedModel.description,
        config: {
          players: selectedModel.players,
          payoffMatrix: selectedModel.payoffMatrix
        },
        user_id: userData.user.id
      })
      .select()
      .single();

    if (modelError) {
      console.error('保存模型失败:', modelError);
      throw modelError;
    }

    // 然后保存仿真结果
    const { error: resultError } = await supabase
      .from('simulation_results')
      .insert({
        model_id: modelData.id,
        user_id: userData.user.id,
        results: simulationState.results
      });

    if (resultError) {
      console.error('保存仿真结果失败:', resultError);
      throw resultError;
    }
  }
}));

function simulateStep(model: GameModel, step: number, store: GameStore): SimulationResult {
  const result: SimulationResult = {
    step,
    playerChoices: {},
    payoffs: {},
    beliefs: {},
    signals: {}
  };

  switch (model.type) {
    case GameType.COMPLETE_STATIC:
      model.players.forEach(player => {
        const strategyIndex = calculateStrategyChoice(model, player.id, step, store);
        result.playerChoices[player.id] = player.strategies[strategyIndex];
      });

      const choices = model.players.map(p => result.playerChoices[p.id]).join(',');
      const payoffs = model.payoffMatrix[choices];
      model.players.forEach((player, index) => {
        result.payoffs[player.id] = payoffs[index];
      });
      break;

    case GameType.COMPLETE_DYNAMIC:
      if (step % 2 === 0) {
        // 领导者回合
        const leaderStrategy = calculateDynamicStrategy(model, 1, step, store);
        result.playerChoices[1] = model.players[0].strategies[leaderStrategy];
        
        // 跟随者根据领导者的选择做出最优响应
        const followerStrategy = calculateFollowerResponse(model, result.playerChoices[1]);
        result.playerChoices[2] = model.players[1].strategies[followerStrategy];
        
        // 记录决策路径
        if (result.signals) {
          result.signals['path'] = `${result.playerChoices[1]} → ${result.playerChoices[2]}`;
        }
      } else {
        // 使用上一回合的结果
        const prevResults = store.simulationState.results;
        if (prevResults.length > 0) {
          const prevResult = prevResults[prevResults.length - 1];
          result.playerChoices = { ...prevResult.playerChoices };
          result.signals = prevResult.signals ? { ...prevResult.signals } : {};
        }
      }

      const dynamicChoices = model.players.map(p => result.playerChoices[p.id]).join(',');
      const dynamicPayoffs = model.payoffMatrix[dynamicChoices];
      model.players.forEach((player, index) => {
        result.payoffs[player.id] = dynamicPayoffs[index];
      });
      break;

    case GameType.INCOMPLETE_STATIC:
      // 初始化信念
      if (step === 0) {
        result.beliefs = {};
        model.players.forEach(player => {
          result.beliefs![player.id] = {};
          player.strategies.forEach(strategy => {
            result.beliefs![player.id][strategy] = 1 / player.strategies.length;
          });
        });
      } else {
        // 更新信念
        const prevResults = store.simulationState.results;
        if (prevResults.length > 0) {
          const prevResult = prevResults[prevResults.length - 1];
          result.beliefs = updateBeliefs(model, prevResult.beliefs);
        } else {
          result.beliefs = {}; // 如果没有历史结果，初始化 beliefs 为 {}
          model.players.forEach(player => {
            result.beliefs![player.id] = {};
            player.strategies.forEach(strategy => {
              result.beliefs![player.id][strategy] = 1 / player.strategies.length;
            });
          });
        }
      }

      // 基于信念选择策略
      if (result.beliefs) {
        model.players.forEach(player => {
          const strategyIndex = calculateIncompleteInfoStrategy(model, player.id, result.beliefs!, step);
          result.playerChoices[player.id] = player.strategies[strategyIndex];
        });
      }

      const incompleteChoices = model.players.map(p => result.playerChoices[p.id]).join(',');
      const incompletePayoffs = model.payoffMatrix[incompleteChoices];
      model.players.forEach((player, index) => {
        result.payoffs[player.id] = incompletePayoffs[index];
      });
      break;

    case GameType.INCOMPLETE_DYNAMIC:
      if (step === 0) {
        // 初始化信号发送者的类型
        result.signals = result.signals || {};
        result.signals['senderType'] = Math.random() < 0.5 ? 'high' : 'low';
      } else {
        // 继承上一回合的发送者类型
        const prevResults = store.simulationState.results;
        if (prevResults.length > 0) {
          const prevResult = prevResults[prevResults.length - 1];
          result.signals = prevResult.signals ? { ...prevResult.signals } : {};
        } else {
          result.signals = {}; // 如果没有历史结果，初始化 signals 为 {}
        }
      }

      // 发送者选择信号
      if (result.signals) {
        const signalStrategy = calculateSignalingStrategy(model, result.signals['senderType'], step);
        result.playerChoices[1] = model.players[0].strategies[signalStrategy];
        
        // 接收者根据观察到的信号更新信念并做出响应
        const responseStrategy = calculateReceiverResponse(model, result.playerChoices[1], step);
        result.playerChoices[2] = model.players[1].strategies[responseStrategy];

        // 计算实际收益（考虑发送者类型）
        const signalChoices = model.players.map(p => result.playerChoices[p.id]).join(',');
        const signalPayoffs = model.payoffMatrix[signalChoices];
        model.players.forEach((player, index) => {
          result.payoffs[player.id] = signalPayoffs[index] * (result.signals!['senderType'] === 'high' ? 1.2 : 0.8);
        });
      }
      break;
  }

  return result;
}

function calculateStrategyChoice(model: GameModel, playerId: number, step: number, store: GameStore): number {
  const history = store.simulationState.results;
  
  if (step < 5) {
    return Math.floor(Math.random() * model.players[playerId - 1].strategies.length);
  }

  const strategyPayoffs = new Map<number, number>();
  model.players[playerId - 1].strategies.forEach((_, index) => {
    let totalPayoff = 0;
    let count = 0;
    
    history.forEach(result => {
      if (result.playerChoices[playerId] === model.players[playerId - 1].strategies[index]) {
        totalPayoff += result.payoffs[playerId];
        count++;
      }
    });

    strategyPayoffs.set(index, count > 0 ? totalPayoff / count : 0);
  });

  const temperature = 0.5;
  const probabilities = Array.from(strategyPayoffs.values()).map(payoff => 
    Math.exp(payoff / temperature)
  );
  const sum = probabilities.reduce((a, b) => a + b, 0);
  const normalizedProbs = probabilities.map(p => p / sum);

  const random = Math.random();
  let cumulative = 0;
  for (let i = 0; i < normalizedProbs.length; i++) {
    cumulative += normalizedProbs[i];
    if (random <= cumulative) {
      return i;
    }
  }

  return 0;
}

function calculateDynamicStrategy(model: GameModel, playerId: number, step: number, store: GameStore): number {
  const history = store.simulationState.results;
  
  if (step < 5) {
    return Math.floor(Math.random() * model.players[playerId - 1].strategies.length);
  }

  const opponentResponses = new Map<string, number[]>();
  for (let i = 1; i < history.length; i++) {
    const prevChoice = history[i - 1].playerChoices[playerId];
    const response = history[i].playerChoices[3 - playerId];
    
    if (!opponentResponses.has(prevChoice)) {
      opponentResponses.set(prevChoice, []);
    }
    opponentResponses.get(prevChoice)?.push(
      model.players[1].strategies.indexOf(response)
    );
  }

  const expectedPayoffs = model.players[0].strategies.map((strategy) => {
    const responses = opponentResponses.get(strategy) || [];
    if (responses.length === 0) return 0;

    const avgResponse = responses.reduce((a, b) => a + b, 0) / responses.length;
    const predictedChoice = model.players[1].strategies[Math.round(avgResponse)];
    const payoff = model.payoffMatrix[`${strategy},${predictedChoice}`][playerId - 1];
    
    return payoff;
  });

  return expectedPayoffs.indexOf(Math.max(...expectedPayoffs));
}

function calculateFollowerResponse(model: GameModel, leaderChoice: string): number {
  const followerPayoffs = model.players[1].strategies.map((strategy) => {
    const choices = `${leaderChoice},${strategy}`;
    return model.payoffMatrix[choices][1];
  });

  return followerPayoffs.indexOf(Math.max(...followerPayoffs));
}

function updateBeliefs(model: GameModel, prevBeliefs: { [key: number]: { [key: string]: number } } | undefined): { [key: number]: { [key: string]: number } } {
  const beliefs: { [key: number]: { [key: string]: number } } = {};
  
  model.players.forEach(player => {
    beliefs[player.id] = {};
    
    if (!prevBeliefs || !prevBeliefs[player.id]) {
      // 如果 prevBeliefs 或 prevBeliefs[player.id] 未定义，则初始化为平均分布
      player.strategies.forEach(strategy => {
        beliefs[player.id][strategy] = 1 / player.strategies.length;
      });
    } else {
      const prevPlayerBeliefs = prevBeliefs[player.id];
      const prevPayoff = 0; // 这里需要根据实际情况获取 prevPayoff
      
      let totalWeight = 0;
      player.strategies.forEach(strategy => {
        const weight = prevPlayerBeliefs[strategy] * Math.exp(prevPayoff / 10);
        beliefs[player.id][strategy] = weight;
        totalWeight += weight;
      });
      
      // 归一化
      Object.keys(beliefs[player.id]).forEach(strategy => {
        beliefs[player.id][strategy] /= totalWeight;
      });
    }
  });
  
  return beliefs;
}

function calculateIncompleteInfoStrategy(
  model: GameModel,
  playerId: number,
  beliefs: { [key: number]: { [key: string]: number } },
  step: number
): number {
  if (step < 5) {
    return Math.floor(Math.random() * model.players[playerId - 1].strategies.length);
  }

  const expectedPayoffs = model.players[playerId - 1].strategies.map((strategy) => {
    let expectedPayoff = 0;
    
    // 考虑对手所有可能的策略
    model.players[2 - playerId].strategies.forEach(opponentStrategy => {
      const probability = beliefs[3 - playerId][opponentStrategy];
      const choices = playerId === 1 
        ? `${strategy},${opponentStrategy}`
        : `${opponentStrategy},${strategy}`;
      const payoff = model.payoffMatrix[choices][playerId - 1];
      expectedPayoff += probability * payoff;
    });
    
    return expectedPayoff;
  });

  return expectedPayoffs.indexOf(Math.max(...expectedPayoffs));
}

function calculateSignalingStrategy(model: GameModel, senderType: string, step: number): number {
  if (step < 5) {
    return Math.floor(Math.random() * model.players[0].strategies.length);
  }

  // 高类型倾向于选择高成本信号，低类型倾向于选择低成本信号
  const costFactor = senderType === 'high' ? 0.8 : 0.2;
  const strategies = model.players[0].strategies;
  const probabilities = strategies.map((_, index) => {
    const normalizedIndex = index / (strategies.length - 1);
    return Math.abs(normalizedIndex - costFactor);
  });

  const random = Math.random();
  let cumulative = 0;
  for (let i = 0; i < probabilities.length; i++) {
    cumulative += probabilities[i];
    if (random <= cumulative) {
      return i;
    }
  }

  return 0;
}

function calculateReceiverResponse(model: GameModel, signal: string, step: number): number {
  if (step < 5) {
    return Math.floor(Math.random() * model.players[1].strategies.length);
  }

  // 接收者根据观察到的信号强度做出响应
  const signalIndex = model.players[0].strategies.indexOf(signal);
  const signalStrength = signalIndex / (model.players[0].strategies.length - 1);
  
   // 信号越强，越倾向于选择高回报策略
   const strategies = model.players[1].strategies;
   const probabilities = strategies.map((_, index) => {
     const normalizedIndex = index / (strategies.length - 1);
     return Math.abs(normalizedIndex - signalStrength);
   });
 
   const random = Math.random();
   let cumulative = 0;
   for (let i = 0; i < probabilities.length; i++) {
     cumulative += probabilities[i];
     if (random <= cumulative) {
       return i;
     }
   }
 
   return 0;
 }
