import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';
import { GameModel, GameType, SimulationResult, CLASSIC_MODELS } from '../types/gameTheory';
import { analyzeGameResults } from '../utils/gameTheory';
import { useAuthStore } from './authStore';


export interface GameStore {
  selectedModelId: string | null;
  simulationState: {
    isRunning: boolean;
    results: SimulationResult[];
    currentStep: number;
  };
  setSelectedModel: (modelId: string | null) => void;
  startSimulation: () => void;
  stopSimulation: () => void;
  resetSimulation: () => void;
  saveSimulationResults: () => Promise<void>;
  loadSimulationResults: (results: SimulationResult[]) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  selectedModelId: null,
  simulationState: {
    isRunning: false,
    results: [],
    currentStep: 0
  },

  setSelectedModel: (modelId) => {
    set({ selectedModelId: modelId });
    get().resetSimulation();
  },

  startSimulation: () => {
    const store = get();
    const model = CLASSIC_MODELS.find((m: GameModel) => m.id === store.selectedModelId);
    
    if (!model) return;
    
    // 检查是否达到建议的最大回合数
    if (model.recommendedRounds && store.simulationState.currentStep >= model.recommendedRounds.max) {
      set(state => ({
        simulationState: {
          ...state.simulationState,
          isRunning: false
        }
      }));
      return;
    }

    set(state => ({
      simulationState: {
        ...state.simulationState,
        isRunning: true
      }
    }));

    // 开始仿真循环
    const simulationInterval = setInterval(() => {
      const currentStore = get();
      const currentModel = CLASSIC_MODELS.find((m: GameModel) => m.id === currentStore.selectedModelId);
      
      if (!currentModel || !currentStore.simulationState.isRunning) {
        clearInterval(simulationInterval);
        return;
      }

      // 检查是否达到建议的最大回合数
      if (currentModel.recommendedRounds && 
          currentStore.simulationState.currentStep >= currentModel.recommendedRounds.max) {
        clearInterval(simulationInterval);
        set(state => ({
          simulationState: {
            ...state.simulationState,
            isRunning: false
          }
        }));
        return;
      }

      // 检查是否达到纳什均衡并保持稳定
      if (currentStore.simulationState.results.length >= 5) {
        const recentResults = currentStore.simulationState.results.slice(-5);
        const isStable = recentResults.every((result, index) => {
          if (index === 0) return true;
          const prevResult = recentResults[index - 1];
          
          // 添加空值检查
          if (!result || !prevResult || !result.playerChoices || !prevResult.playerChoices) {
            return false;
          }
          
          // 检查策略选择是否相同
          return currentModel.players.every(player => {
            const currentChoice = result.playerChoices[player.id];
            const prevChoice = prevResult.playerChoices[player.id];
            return currentChoice && prevChoice && currentChoice === prevChoice;
          });
        });

        // 检查是否为纳什均衡
        const lastResult = recentResults[recentResults.length - 1];
        if (lastResult && lastResult.playerChoices) {
          const isNashEquilibrium = currentModel.players.every(player => {
            const currentStrategy = lastResult.playerChoices[player.id];
            const currentPayoff = lastResult.payoffs[player.id];
            
            if (!currentStrategy || currentPayoff === undefined) {
              return false;
            }
            
            // 检查是否有更好的策略选择
            return player.strategies.every(alternativeStrategy => {
              if (alternativeStrategy === currentStrategy) return true;
              
              // 构造假设的策略组合
              const hypotheticalChoices = { ...lastResult.playerChoices };
              hypotheticalChoices[player.id] = alternativeStrategy;
              const choicesKey = currentModel.players.map(p => hypotheticalChoices[p.id]).join(',');
              const alternativePayoff = currentModel.payoffMatrix[choicesKey]?.[
                currentModel.players.indexOf(player)
              ];
              
              return alternativePayoff === undefined || currentPayoff >= alternativePayoff;
            });
          });

          if (isStable && isNashEquilibrium) {
            clearInterval(simulationInterval);
            set(state => ({
              simulationState: {
                ...state.simulationState,
                isRunning: false
              }
            }));
            return;
          }
        }
      }

      // 执行一步仿真
      const result = simulateStep(currentModel, currentStore.simulationState.currentStep, currentStore);
      
      set(state => ({
        simulationState: {
          ...state.simulationState,
          results: [...state.simulationState.results, result],
          currentStep: state.simulationState.currentStep + 1
        }
      }));
    }, 1000); // 每秒执行一步
  },

  stopSimulation: () => {
    set(state => ({
      simulationState: {
        ...state.simulationState,
        isRunning: false
      }
    }));
  },

  resetSimulation: () => {
    set(state => ({
      simulationState: {
        isRunning: false,
        results: [],
        currentStep: 0
      }
    }));
  },

  saveSimulationResults: async () => {
    const { selectedModelId, simulationState } = get();
    const { user } = useAuthStore.getState();
    
    if (!selectedModelId || !user) {
      throw new Error('未选择模型或用户未登录');
    }

    const userId = user.id;
    const results = simulationState.results;

    // 获取当前选中的模型配置
    const selectedModel = CLASSIC_MODELS.find((m: GameModel) => m.id === selectedModelId);
    if (!selectedModel) {
      throw new Error('未找到选中的模型配置');
    }

    // 1. 先插入模型快照
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
        user_id: userId
      })
      .select()
      .single();

    if (modelError) {
      throw modelError;
    }

    // 2. 再插入仿真结果
    const { data: resultData, error: resultError } = await supabase
      .from('simulation_results')
      .insert({
        user_id: userId,
        model_id: modelData.id, // 这里是新插入模型的uuid
        results: results,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (resultError) {
      throw resultError;
    }

    // 检查 window 对象是否存在，如果存在则显示提示
    if (typeof window !== 'undefined') {
      window.alert('仿真结果已成功保存到管理系统！');
    } else {
      console.log('仿真结果已成功保存到管理系统！');
    }
  },

  loadSimulationResults: (results: SimulationResult[]) => {
    set((state) => ({
      simulationState: {
        ...state.simulationState,
        results,
        currentStep: results.length
      }
    }));
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

  // 调试：输出当前模型ID和类型
  console.log('【simulateStep】step:', step, '模型ID:', model.id, '类型:', model.type);

  // 根据博弈类型选择不同的处理方式
  switch (model.type) {
    case GameType.COMPLETE_STATIC:
      // 完全信息静态博弈（囚徒困境、智猪博弈）
      const strategies = model.players.map(player => {
        const strategyIndex = calculateStrategyChoice(model, player.id, step, store);
        return player.strategies[strategyIndex];
      });
      
      model.players.forEach((player, index) => {
        result.playerChoices[player.id] = strategies[index];
      });
      
      const staticChoices = strategies.join(',');
      const payoffs = model.payoffMatrix[staticChoices];
      if (payoffs) {
        model.players.forEach((player, index) => {
          result.payoffs[player.id] = payoffs[index];
        });
      }
      break;

    case GameType.COMPLETE_DYNAMIC:
      // 完全信息动态博弈（斯塔克伯格模型、市场进入阻挠博弈）
      let dynamicChoices = '';
      
      // 领导者（在位者）先行动
      const leader = model.players[0];
      const follower = model.players[1];
      
      // 对于市场进入阻挠博弈，在位者直接选择投资
      let leaderStrategyIndex: number;
      if (model.id === "entry-deterrence-complete") {
        leaderStrategyIndex = 0;  // 0表示投资
      } else {
        leaderStrategyIndex = calculateStrategyChoice(model, leader.id, step, store);
      }
      
      const leaderStrategy = leader.strategies[leaderStrategyIndex];
      result.playerChoices[leader.id] = leaderStrategy;
      dynamicChoices = leaderStrategy;
      
      // 跟随者观察领导者行动后做出选择
      let followerStrategyIndex: number;
      if (model.id === "entry-deterrence-complete") {
        // 如果在位者投资，进入者选择不进入；否则选择进入
        followerStrategyIndex = leaderStrategy === "投资" ? 1 : 0;
      } else {
        followerStrategyIndex = calculateFollowerResponse(model, leaderStrategy);
      }
      
      const followerStrategy = follower.strategies[followerStrategyIndex];
      result.playerChoices[follower.id] = followerStrategy;
      dynamicChoices += ',' + followerStrategy;
      
      // 计算收益
      const dynamicPayoffs = model.payoffMatrix[dynamicChoices];
      if (dynamicPayoffs) {
        model.players.forEach((player, index) => {
          result.payoffs[player.id] = dynamicPayoffs[index];
        });
      }
      break;

    case GameType.INCOMPLETE_STATIC:
      if (model.id === "entry-deterrence-incomplete") {
        console.log('【simulateStep】命中 entry-deterrence-incomplete 分支');
        // 1. 随机确定在位者类型
        const incumbentType = Math.random() < 0.5 ? 'strong' : 'weak';
        result.signals = { incumbentType };
        const incumbent = model.players[0];
        const entrant = model.players[1];
        // 2. 在位者根据类型选择策略
        const incumbentStrategyIndex = incumbentType === 'strong'
          ? incumbent.strategies.indexOf('投资')
          : incumbent.strategies.indexOf('不投资');
        const incumbentStrategy = incumbent.strategies[incumbentStrategyIndex];
        result.playerChoices[incumbent.id] = incumbentStrategy;
        // 3. 进入者基于信念选择策略
        let entrantStrategyIndex = 0;
        try {
          const beliefs = step === 0
            ? { [incumbent.id]: { '投资': 0.5, '不投资': 0.5 }, [entrant.id]: { '进入': 0.5, '不进入': 0.5 } }
            : updateEntryDeterrenceBeliefs(model, store.simulationState.results);
          entrantStrategyIndex = calculateIncompleteInfoStrategy(model, entrant.id, beliefs, step);
          if (isNaN(entrantStrategyIndex) || entrantStrategyIndex < 0 || entrantStrategyIndex >= entrant.strategies.length) {
            entrantStrategyIndex = 0;
          }
        } catch (e) {
          entrantStrategyIndex = 0;
        }
        const entrantStrategy = entrant.strategies[entrantStrategyIndex];
        result.playerChoices[entrant.id] = entrantStrategy;
        // 4. 计算收益
        const choices = `${incumbentStrategy},${entrantStrategy}`;
        const payoffs = model.payoffMatrix[choices];
        if (payoffs) {
          model.players.forEach((player, index) => {
            result.payoffs[player.id] = payoffs[index];
          });
        }
        // 5. 信念更新
        result.beliefs = updateEntryDeterrenceBeliefs(model, store.simulationState.results);
        // 调试：输出本步策略和收益
        console.log('【simulateStep】step:', step, 'playerChoices:', result.playerChoices, 'payoffs:', result.payoffs, 'beliefs:', result.beliefs);
        break;
      }
      if (model.id === "insurance-market") {
        // 保险市场逆向选择模型分支
        const insurer = model.players[0];
        const customer = model.players[1];
        // 保险公司和客户都基于信念选择策略
        const beliefs = updateEntryDeterrenceBeliefs(model, store.simulationState.results);
        const insurerStrategyIndex = calculateIncompleteInfoStrategy(model, insurer.id, beliefs, step);
        const customerStrategyIndex = calculateIncompleteInfoStrategy(model, customer.id, beliefs, step);
        const insurerStrategy = insurer.strategies[insurerStrategyIndex];
        const customerStrategy = customer.strategies[customerStrategyIndex];
        result.playerChoices[insurer.id] = insurerStrategy;
        result.playerChoices[customer.id] = customerStrategy;
        // 计算收益
        const choices = `${insurerStrategy},${customerStrategy}`;
        const payoffs = model.payoffMatrix[choices];
        if (payoffs) {
          model.players.forEach((player, index) => {
            result.payoffs[player.id] = payoffs[index];
          });
        }
        // 信念更新
        result.beliefs = updateEntryDeterrenceBeliefs(model, store.simulationState.results);
        // 调试日志
        console.log('【simulateStep】保险市场 step:', step, 'playerChoices:', result.playerChoices, 'payoffs:', result.payoffs, 'beliefs:', result.beliefs);
        break;
      }
      break;

    case GameType.INCOMPLETE_DYNAMIC:
      // 不完全信息动态博弈（信号传递博弈）
      if (model.id === "signaling-game") {
        const sender = model.players[0];
        const receiver = model.players[1];
        
        // 随机确定发送者类型
        const senderType = Math.random() < 0.5 ? 'high' : 'low';
        result.signals = { senderType };
        
        // 更新信念
        const beliefs = updateSignalingBeliefs(model, store.simulationState.results);
        result.beliefs = beliefs;
        
        // 发送者根据类型选择策略
        const senderStrategyIndex = calculateSignalingStrategy(model, senderType, step, beliefs);
        const senderStrategy = sender.strategies[senderStrategyIndex];
        result.playerChoices[sender.id] = senderStrategy;
        
        // 接收者根据信号和信念做出响应
        const receiverStrategyIndex = calculateReceiverResponse(model, senderStrategy, step, beliefs);
        const receiverStrategy = receiver.strategies[receiverStrategyIndex];
        result.playerChoices[receiver.id] = receiverStrategy;
        
        // 计算收益
        const choices = `${senderStrategy},${receiverStrategy}`;
        const payoffs = model.payoffMatrix[choices];
        if (payoffs) {
          model.players.forEach((player, index) => {
            result.payoffs[player.id] = payoffs[index];
          });
        }
      }
      break;
  }

  // 只在每10步输出一次结果
  if (step % 10 === 0) {
    console.log(`步骤 ${step} 结果:`, {
      策略选择: result.playerChoices,
      收益: result.payoffs
    });
  }

  return result;
}

// 定义策略分析结果的类型
type StrategyAnalysis = {
  dominantStrategy?: number;  // 占优策略的索引
  nashEquilibria: number[];   // 纳什均衡策略的索引
  mixedEquilibrium?: {        // 混合策略均衡的概率分布
    probabilities: number[];
  };
};

// 判断是否为占优策略
function findDominantStrategy(model: GameModel, playerId: string): number | undefined {
  const playerIndex = model.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return undefined;
  
  const player = model.players[playerIndex];
  const opponentIndex = 1 - playerIndex;
  const opponent = model.players[opponentIndex];
  
  for (let i = 0; i < player.strategies.length; i++) {
    let isDominant = true;
    
    for (let j = 0; j < player.strategies.length; j++) {
      if (i === j) continue;
      
      // 检查策略i是否严格优于策略j
      for (let k = 0; k < opponent.strategies.length; k++) {
        const combination1 = playerIndex === 0
          ? `${player.strategies[i]},${opponent.strategies[k]}`
          : `${opponent.strategies[k]},${player.strategies[i]}`;
        
        const combination2 = playerIndex === 0
          ? `${player.strategies[j]},${opponent.strategies[k]}`
          : `${opponent.strategies[k]},${player.strategies[j]}`;
        
        if (model.payoffMatrix[combination1][playerIndex] <= 
            model.payoffMatrix[combination2][playerIndex]) {
          isDominant = false;
          break;
        }
      }
      
      if (!isDominant) break;
    }
    
    if (isDominant) return i;
  }
  
  return undefined;
}

// 计算最优响应策略
function calculateBestResponse(
  model: GameModel,
  playerId: string,
  opponentStrategy: string
): number {
  const playerIndex = model.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) {
    console.error('找不到玩家:', playerId);
    return 0;
  }
  
  const player = model.players[playerIndex];
  if (!player || !player.strategies || player.strategies.length === 0) {
    console.error('玩家策略无效:', player);
    return 0;
  }

  // 打印调试信息
  console.log('计算最优响应:', {
    playerId,
    playerIndex,
    opponentStrategy,
    availableStrategies: player.strategies
  });

  const payoffs = player.strategies.map((strategy, index) => {
    const combination = playerIndex === 0
      ? `${strategy},${opponentStrategy}`
      : `${opponentStrategy},${strategy}`;
    
    // 检查收益矩阵中是否存在该组合
    if (!model.payoffMatrix[combination]) {
      console.error('收益矩阵中不存在组合:', combination);
      return { index, payoff: -Infinity };
    }

    const payoff = model.payoffMatrix[combination][playerIndex];
    if (payoff === undefined) {
      console.error('收益值未定义:', {
        combination,
        playerIndex,
        payoffMatrix: model.payoffMatrix[combination]
      });
      return { index, payoff: -Infinity };
    }

    return { index, payoff };
  });
  
  // 检查是否所有收益都是无效的
  if (payoffs.every(p => p.payoff === -Infinity)) {
    console.error('所有策略的收益都无效，使用默认策略');
    return 0;
  }

  const maxPayoff = Math.max(...payoffs.map(p => p.payoff));
  const bestResponses = payoffs.filter(p => Math.abs(p.payoff - maxPayoff) < 1e-10);
  
  // 打印最优响应信息
  console.log('最优响应结果:', {
    maxPayoff,
    bestResponses,
    selectedIndex: bestResponses[Math.floor(Math.random() * bestResponses.length)].index
  });

  return bestResponses[Math.floor(Math.random() * bestResponses.length)].index;
}

// 计算混合策略均衡（仅适用于2x2博弈）
function calculateMixedEquilibrium(model: GameModel): { p1: number, p2: number } | undefined {
  // 检查模型和玩家是否存在
  if (!model || !model.players || model.players.length < 2) {
    return undefined;
  }

  const player1 = model.players[0];
  const player2 = model.players[1];

  // 检查玩家策略数量
  if (!player1.strategies || !player2.strategies || 
      player1.strategies.length !== 2 || player2.strategies.length !== 2) {
    return undefined;
  }

  // 检查收益矩阵是否存在
  if (!model.payoffMatrix) {
    return undefined;
  }

  // 构建策略组合键
  const strategyKeys = [
    `${player1.strategies[0]},${player2.strategies[0]}`,
    `${player1.strategies[0]},${player2.strategies[1]}`,
    `${player1.strategies[1]},${player2.strategies[0]}`,
    `${player1.strategies[1]},${player2.strategies[1]}`
  ];

  // 检查所有策略组合是否存在于收益矩阵中
  const missingKeys = strategyKeys.filter(key => !model.payoffMatrix[key]);
  if (missingKeys.length > 0) {
    return undefined;
  }

  // 获取收益矩阵
  const payoffs00 = model.payoffMatrix[strategyKeys[0]];
  const payoffs01 = model.payoffMatrix[strategyKeys[1]];
  const payoffs10 = model.payoffMatrix[strategyKeys[2]];
  const payoffs11 = model.payoffMatrix[strategyKeys[3]];

  // 计算混合策略概率
  const denominator1 = payoffs00[1] - payoffs01[1] - payoffs10[1] + payoffs11[1];
  const denominator2 = payoffs00[0] - payoffs01[0] - payoffs10[0] + payoffs11[0];

  // 检查分母是否为零
  if (Math.abs(denominator1) < 1e-10 || Math.abs(denominator2) < 1e-10) {
    // 使用替代计算方法
    let p1 = 0.5;
    let p2 = 0.5;
    
    // 如果分母1接近零，使用收益比较
    if (Math.abs(denominator1) < 1e-10) {
      p1 = (payoffs00[1] > payoffs10[1]) ? 0.7 : 0.3;
    } else {
      p1 = (payoffs11[1] - payoffs01[1]) / denominator1;
    }
    
    // 如果分母2接近零，使用收益比较
    if (Math.abs(denominator2) < 1e-10) {
      p2 = (payoffs00[0] > payoffs01[0]) ? 0.7 : 0.3;
    } else {
      p2 = (payoffs11[0] - payoffs10[0]) / denominator2;
    }
    
    // 确保概率在有效范围内
    p1 = Math.max(0.3, Math.min(0.7, p1));
    p2 = Math.max(0.3, Math.min(0.7, p2));
    
    return { p1, p2 };
  }

  const p1 = (payoffs11[1] - payoffs01[1]) / denominator1;
  const p2 = (payoffs11[0] - payoffs10[0]) / denominator2;

  // 检查是否是有效的概率
  if (isNaN(p1) || isNaN(p2) || p1 < 0.3 || p1 > 0.7 || p2 < 0.3 || p2 > 0.7) {
    return { p1: 0.5, p2: 0.5 };
  }

  return { p1, p2 };
}

// 修改后的策略选择函数
function calculateStrategyChoice(
  model: GameModel,
  playerId: string,
  step: number,
  store: GameStore
): number {
  // 市场进入阻挠博弈的特殊处理
  if (model.id === "entry-deterrence-complete") {
    if (playerId === "1") {
      // 在位者（领导者）总是选择投资，因为这是占优策略
      return 0;  // 0表示投资
    } else {
      // 进入者（跟随者）根据在位者的选择做出最优响应
      const lastResult = store.simulationState.results[store.simulationState.results.length - 1];
      const incumbentChoice = lastResult?.playerChoices["1"];
      
      if (incumbentChoice === "投资") {
        return 1;  // 1表示不进入
      } else {
        return 0;  // 0表示进入
      }
    }
  }
  
  // 特殊处理智猪博弈
  if (model.id === "smart-pig") {
    const mixedEq = calculateMixedEquilibrium(model);
    if (mixedEq) {
      const probability = playerId === "1" ? mixedEq.p1 : mixedEq.p2;
      // 根据混合策略均衡概率做出选择
      return Math.random() < probability ? 0 : 1;
    }
  }
  
  // 其他博弈的处理保持不变...
  const dominantStrategy = findDominantStrategy(model, playerId);
  if (dominantStrategy !== undefined) {
    // 即使是占优策略，也保留一定的探索概率
    return Math.random() < 0.9 ? dominantStrategy : 
      Math.floor(Math.random() * model.players[playerId === "1" ? 0 : 1].strategies.length);
  }
  
  // 使用最优响应策略
  const opponent = model.players[playerId === "1" ? 1 : 0];
  if (!opponent) {
    console.error('找不到对手玩家');
    return 0;
  }

  const opponentLastStrategy = store.simulationState.results.length > 0
    ? store.simulationState.results[store.simulationState.results.length - 1]
        .playerChoices[opponent.id]
    : opponent.strategies[Math.floor(Math.random() * opponent.strategies.length)];

  if (!opponentLastStrategy) {
    console.error('无法获取对手上一轮策略，使用随机策略');
    return Math.floor(Math.random() * opponent.strategies.length);
  }

  return calculateBestResponse(model, playerId, opponentLastStrategy);
}

// 动态博弈策略计算
function calculateDynamicStrategy(model: GameModel, playerId: string, step: number, store: GameStore): number {
// 简单实现：根据历史结果选择最优策略
const history = store.simulationState.results;
if (history.length === 0) return 0;

const lastResult = history[history.length - 1];
const myLastPayoff = lastResult.payoffs[playerId];

// 如果上次收益小于平均值，则切换策略
const avgPayoff = history.reduce((sum, r) => sum + r.payoffs[playerId], 0) / history.length;
return myLastPayoff < avgPayoff ? 1 : 0;
}

// 跟随者响应函数
function calculateFollowerResponse(model: GameModel, leaderChoice: string): number {
  const follower = model.players[1];
  
  // 对于市场进入阻挠博弈，根据领导者的选择做出最优响应
  if (model.id === "entry-deterrence-complete") {
    return leaderChoice === "投资" ? 1 : 0;  // 1表示不进入，0表示进入
  }
  
  // 其他博弈的处理
  let bestStrategyIndex = 0;
  let bestPayoff = -Infinity;

  follower.strategies.forEach((strategy, index) => {
    const key = `${leaderChoice},${strategy}`;
    const payoff = model.payoffMatrix[key][1];
    if (payoff > bestPayoff) {
      bestPayoff = payoff;
      bestStrategyIndex = index;
    }
  });

  return bestStrategyIndex;
}

function updateBeliefs(model: GameModel, prevBeliefs: { [key: string]: { [key: string]: number } } | undefined): { [key: string]: { [key: string]: number } } {
  const beliefs: { [key: string]: { [key: string]: number } } = {};
  
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
  playerId: string,
  beliefs: { [key: string]: { [key: string]: number } },
  step: number
): number {
  const playerIndex = model.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return 0;
  
  if (step < 5) {
    return Math.floor(Math.random() * model.players[playerIndex].strategies.length);
  }

  const expectedPayoffs = model.players[playerIndex].strategies.map((strategy) => {
    let expectedPayoff = 0;
    
    const opponentIndex = 1 - playerIndex;
    const opponent = model.players[opponentIndex];
    if (!opponent) return 0;
    
    opponent.strategies.forEach(opponentStrategy => {
      const probability = beliefs[opponent.id][opponentStrategy];
      const choices = playerIndex === 0 
        ? `${strategy},${opponentStrategy}`
        : `${opponentStrategy},${strategy}`;
      const payoff = model.payoffMatrix[choices][playerIndex];
      expectedPayoff += probability * payoff;
    });
    
    return expectedPayoff;
  });

  return expectedPayoffs.indexOf(Math.max(...expectedPayoffs));
}

function calculateSignalingStrategy(model: GameModel, senderType: string, step: number, beliefs: { [key: string]: { [key: string]: number } }): number {
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

function calculateReceiverResponse(model: GameModel, signal: string, step: number, beliefs: { [key: string]: { [key: string]: number } }): number {
  if (step < 5) {
    return Math.floor(Math.random() * model.players[1].strategies.length);
  }

  // 接收者根据观察到的信号强度做出响应
  const signalIndex = model.players[0].strategies.indexOf(signal);
  const signalStrength = signalIndex / (model.players[0].strategies.length - 1);
  
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

function updateEntryDeterrenceBeliefs(model: GameModel, results: SimulationResult[]): { [key: string]: { [key: string]: number } } {
  const beliefs: { [key: string]: { [key: string]: number } } = {};
  model.players.forEach(player => {
    beliefs[player.id] = {};
    if (!results || results.length === 0) {
      player.strategies.forEach(strategy => {
        beliefs[player.id][strategy] = 1 / player.strategies.length;
      });
    } else {
      // 统计历史中每个策略的出现次数
      const counts: { [key: string]: number } = {};
      player.strategies.forEach(strategy => {
        counts[strategy] = results.filter(r => r.playerChoices[player.id] === strategy).length;
      });
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      player.strategies.forEach(strategy => {
        beliefs[player.id][strategy] = total > 0 ? counts[strategy] / total : 1 / player.strategies.length;
      });
    }
  });
  return beliefs;
}

function updateSignalingBeliefs(model: GameModel, results: SimulationResult[]): { [key: string]: { [key: string]: number } } {
  const beliefs: { [key: string]: { [key: string]: number } } = {};
  model.players.forEach(player => {
    beliefs[player.id] = {};
    if (!results || results.length === 0) {
      player.strategies.forEach(strategy => {
        beliefs[player.id][strategy] = 1 / player.strategies.length;
      });
    } else {
      // 统计历史中每个策略的出现次数
      const counts: { [key: string]: number } = {};
      player.strategies.forEach(strategy => {
        counts[strategy] = results.filter(r => r.playerChoices[player.id] === strategy).length;
      });
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      player.strategies.forEach(strategy => {
        beliefs[player.id][strategy] = total > 0 ? counts[strategy] / total : 1 / player.strategies.length;
      });
    }
  });
  return beliefs;
}

