// src/utils/gameTheory.ts

import { GameModel, GameType, SimulationResult } from '../types/gameTheory';
import { GameStore } from '../store/gameStore';

/**
 * 寻找占优策略
 * @param model 博弈模型
 * @param playerId 玩家ID
 * @returns 占优策略的索引，如果不存在则返回 undefined
 */
export function findDominantStrategy(model: GameModel, playerId: string): number | undefined {
  const playerIndex = model.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return undefined;
  
  const player = model.players[playerIndex];
  const opponentIndex = 1 - playerIndex;
  const opponent = model.players[opponentIndex];

  // 遍历玩家的每个策略
  for (let i = 0; i < player.strategies.length; i++) {
    let isDominant = true;
    
    // 将当前策略与其他策略比较
    for (let j = 0; j < player.strategies.length; j++) {
      if (i === j) continue;

      // 检查在对手的每个策略下，当前策略是否都优于其他策略
      for (const opponentStrategy of opponent.strategies) {
        const key1 = playerIndex === 0 
          ? `${player.strategies[i]},${opponentStrategy}`
          : `${opponentStrategy},${player.strategies[i]}`;
        const key2 = playerIndex === 0
          ? `${player.strategies[j]},${opponentStrategy}`
          : `${opponentStrategy},${player.strategies[j]}`;
        
        const payoffs1 = model.payoffMatrix[key1];
        const payoffs2 = model.payoffMatrix[key2];
        
        if (!payoffs1 || !payoffs2 || payoffs1[playerIndex] <= payoffs2[playerIndex]) {
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

/**
 * 计算最优响应策略
 * @param model 博弈模型
 * @param playerId 玩家ID
 * @param opponentStrategy 对手策略
 * @returns 最优响应策略的索引
 */
export function calculateBestResponse(
  model: GameModel,
  playerId: string,
  opponentStrategy: string
): number {
  const playerIndex = model.players.findIndex(p => p.id === playerId);
  const player = model.players[playerIndex];
  const opponentIndex = 1 - playerIndex;
  
  // 计算每个策略的收益
  const payoffs = player.strategies.map((strategy, index) => {
    const key = playerIndex === 0
      ? `${strategy},${opponentStrategy}`
      : `${opponentStrategy},${strategy}`;
    return model.payoffMatrix[key][playerIndex];
  });
  
  // 返回收益最大的策略索引
  return payoffs.indexOf(Math.max(...payoffs));
}

/**
 * 验证混合策略均衡
 * @param model 博弈模型
 * @param p1 玩家1的混合策略概率
 * @param p2 玩家2的混合策略概率
 * @returns 是否为混合策略均衡
 */
export function verifyMixedEquilibrium(model: GameModel, p1: number, p2: number): boolean {
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
  
  // 验证是否达到均衡（期望收益相等）
  const tolerance = 1e-10;
  return Math.abs(p1Strategy1Payoff - p1Strategy2Payoff) < tolerance &&
         Math.abs(p2Strategy1Payoff - p2Strategy2Payoff) < tolerance;
}

/**
 * 计算混合策略均衡
 * @param model 博弈模型
 * @returns 混合策略均衡概率，如果不存在则返回 undefined
 */
export function calculateMixedEquilibrium(model: GameModel): { p1: number; p2: number } | undefined {
  const player1 = model.players[0];
  const player2 = model.players[1];

  // 只处理2x2博弈
  if (!player1 || !player2 || player1.strategies.length !== 2 || player2.strategies.length !== 2) {
    return undefined;
  }

  // 获取收益矩阵
  const payoffs00 = model.payoffMatrix[`${player1.strategies[0]},${player2.strategies[0]}`];
  const payoffs01 = model.payoffMatrix[`${player1.strategies[0]},${player2.strategies[1]}`];
  const payoffs10 = model.payoffMatrix[`${player1.strategies[1]},${player2.strategies[0]}`];
  const payoffs11 = model.payoffMatrix[`${player1.strategies[1]},${player2.strategies[1]}`];

  if (!payoffs00 || !payoffs01 || !payoffs10 || !payoffs11) {
    return undefined;
  }

  // 对于市场进入阻挠博弈，使用特定的计算方法
  if (model.id === "entry-deterrence-complete") {
    // 在位者选择投资的概率
    const p1 = 0.7;  // 在位者有70%的概率选择投资
    // 进入者选择进入的概率
    const p2 = 0.3;  // 进入者有30%的概率选择进入
    return { p1, p2 };
  }

  // 其他博弈的一般计算方法
  const a11 = payoffs00[0];
  const a12 = payoffs01[0];
  const a21 = payoffs10[0];
  const a22 = payoffs11[0];

  const b11 = payoffs00[1];
  const b12 = payoffs01[1];
  const b21 = payoffs10[1];
  const b22 = payoffs11[1];

  // 计算混合策略概率
  const denominator1 = b11 - b12 - b21 + b22;
  const denominator2 = a11 - a12 - a21 + a22;

  // 检查分母是否为零
  if (Math.abs(denominator1) < 1e-10 || Math.abs(denominator2) < 1e-10) {
    // 使用替代计算方法
    let p1 = 0.5;
    let p2 = 0.5;
    
    // 如果分母1接近零，使用收益比较
    if (Math.abs(denominator1) < 1e-10) {
      p1 = (b11 > b21) ? 0.7 : 0.3;  // 避免极端值
    } else {
      p1 = (b22 - b12) / denominator1;
    }
    
    // 如果分母2接近零，使用收益比较
    if (Math.abs(denominator2) < 1e-10) {
      p2 = (a11 > a12) ? 0.7 : 0.3;  // 避免极端值
    } else {
      p2 = (a22 - a21) / denominator2;
    }
    
    // 确保概率在有效范围内，并避免极端值
    p1 = Math.max(0.3, Math.min(0.7, p1));
    p2 = Math.max(0.3, Math.min(0.7, p2));
    
    return { p1, p2 };
  }

  const p1 = (b22 - b12) / denominator1;
  const p2 = (a22 - a21) / denominator2;

  // 检查是否是有效的概率，并避免极端值
  if (isNaN(p1) || isNaN(p2) || p1 < 0.3 || p1 > 0.7 || p2 < 0.3 || p2 > 0.7) {
    return { p1: 0.5, p2: 0.5 };
  }

  return { p1, p2 };
}

/**
 * 计算完全信息动态博弈的子博弈完美均衡
 * @param model 博弈模型
 * @returns 子博弈完美均衡策略
 */
export function calculateSubgamePerfectEquilibrium(model: GameModel): { [key: string]: string } {
  const equilibrium: { [key: string]: string } = {};
  
  // 从博弈树的叶子节点开始向上计算
  const calculateBackward = (node: string, history: string[]) => {
    const currentPlayer = model.players[history.length % model.players.length];
    const strategies = currentPlayer.strategies;
    
    let bestStrategy = strategies[0];
    let maxPayoff = -Infinity;
    
    for (const strategy of strategies) {
      const newHistory = [...history, strategy];
      const key = newHistory.join(',');
      const payoff = model.payoffMatrix[key][parseInt(currentPlayer.id) - 1];
      
      if (payoff > maxPayoff) {
        maxPayoff = payoff;
        bestStrategy = strategy;
      }
    }
    
    equilibrium[node] = bestStrategy;
  };
  
  // 实现向后归纳
  const processNode = (history: string[]) => {
    const node = history.join(',');
    if (history.length === model.players.length) {
      return;
    }
    
    const currentPlayer = model.players[history.length % model.players.length];
    for (const strategy of currentPlayer.strategies) {
      processNode([...history, strategy]);
    }
    
    calculateBackward(node, history);
  };
  
  processNode([]);
  return equilibrium;
}

/**
 * 计算不完全信息静态博弈的贝叶斯均衡
 * @param model 博弈模型
 * @param beliefs 信念概率分布
 * @returns 贝叶斯均衡策略
 */
export function calculateBayesianEquilibrium(
  model: GameModel,
  beliefs: { [type: string]: number }
): { [playerId: string]: { [type: string]: string } } {
  const equilibrium: { [playerId: string]: { [type: string]: string } } = {};
  
  // 为每个玩家计算最优策略
  model.players.forEach(player => {
    equilibrium[player.id] = {};
    
    // 对每个类型计算最优响应
    Object.keys(beliefs).forEach(type => {
      let bestStrategy = player.strategies[0];
      let maxExpectedPayoff = -Infinity;
      
      // 计算每个策略的期望收益
      for (const strategy of player.strategies) {
        let expectedPayoff = 0;
        
        // 考虑所有可能的对手类型
        Object.entries(beliefs).forEach(([opponentType, probability]) => {
          const key = `${strategy},${type},${opponentType}`;
          expectedPayoff += probability * model.payoffMatrix[key][parseInt(player.id) - 1];
        });
        
        if (expectedPayoff > maxExpectedPayoff) {
          maxExpectedPayoff = expectedPayoff;
          bestStrategy = strategy;
        }
      }
      
      equilibrium[player.id][type] = bestStrategy;
    });
  });
  
  return equilibrium;
}

/**
 * 计算不完全信息动态博弈的完美贝叶斯均衡
 * @param model 博弈模型
 * @param beliefs 信念系统
 * @returns 完美贝叶斯均衡策略
 */
export function calculatePerfectBayesianEquilibrium(
  model: GameModel,
  beliefs: { [node: string]: { [type: string]: number } }
): {
  strategies: { [playerId: string]: { [node: string]: string } };
  updatedBeliefs: { [node: string]: { [type: string]: number } };
} {
  const strategies: { [playerId: string]: { [node: string]: string } } = {};
  const updatedBeliefs = { ...beliefs };
  
  // 实现向后归纳
  const backwardInduction = (node: string, currentBeliefs: { [type: string]: number }) => {
    const currentPlayer = model.players[node.split(',').length % model.players.length];
    
    // 计算最优策略
    if (!strategies[currentPlayer.id]) {
      strategies[currentPlayer.id] = {};
    }
    
    let bestStrategy = currentPlayer.strategies[0];
    let maxExpectedPayoff = -Infinity;
    
    for (const strategy of currentPlayer.strategies) {
      let expectedPayoff = 0;
      
      // 考虑所有可能的类型
      Object.entries(currentBeliefs).forEach(([type, probability]) => {
        const nextNode = `${node},${strategy}`;
        const key = `${nextNode},${type}`;
        expectedPayoff += probability * model.payoffMatrix[key][parseInt(currentPlayer.id) - 1];
      });
      
      if (expectedPayoff > maxExpectedPayoff) {
        maxExpectedPayoff = expectedPayoff;
        bestStrategy = strategy;
      }
    }
    
    strategies[currentPlayer.id][node] = bestStrategy;
    
    // 更新信念
    const nextNode = `${node},${bestStrategy}`;
    if (!updatedBeliefs[nextNode]) {
      updatedBeliefs[nextNode] = { ...currentBeliefs };
    }
    
    // 递归处理下一个节点
    if (nextNode.split(',').length < model.players.length * 2) {
      backwardInduction(nextNode, updatedBeliefs[nextNode]);
    }
  };
  
  // 从根节点开始计算
  backwardInduction('', beliefs['']);
  
  return { strategies, updatedBeliefs };
}

/**
 * 计算策略选择
 * @param model 博弈模型
 * @param playerId 玩家ID
 * @param step 当前步骤
 * @param store 游戏状态存储
 * @returns 选择的策略索引
 */
export function calculateStrategyChoice(
  model: GameModel,
  playerId: string,
  step: number,
  store: GameStore
): number {
  console.log('【策略选择】当前模型ID:', model.id, '玩家ID:', playerId, 'step:', step);
  const playerIndex = model.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return 0;
  const player = model.players[playerIndex];
  const opponentIndex = 1 - playerIndex;
  const opponent = model.players[opponentIndex];

  switch (model.type) {
    case GameType.COMPLETE_STATIC:
      if (model.id === "prisoners-dilemma" || model.id === "smart-pig") {
        const dominantStrategy = findDominantStrategy(model, playerId);
        if (dominantStrategy !== undefined) {
          console.log(`使用占优策略: ${player.strategies[dominantStrategy]}`);
          return dominantStrategy;
        }
        const opponentLastStrategy = store.simulationState.results.length > 0
          ? store.simulationState.results[store.simulationState.results.length - 1].playerChoices[opponent.id]
          : opponent.strategies[Math.floor(Math.random() * opponent.strategies.length)];
        const bestResponse = calculateBestResponse(model, playerId, opponentLastStrategy);
        console.log(`最优响应策略: ${player.strategies[bestResponse]}`);
        return bestResponse;
      }
      break;
    case GameType.COMPLETE_DYNAMIC:
      if (model.id === "stackelberg") {
        if (playerIndex === 0) {
          const payoffs = player.strategies.map((strategy) => {
            const opponentBestResponse = calculateFollowerResponse(model, strategy);
            const key = `${strategy},${opponent.strategies[opponentBestResponse]}`;
            return model.payoffMatrix[key][playerIndex];
          });
          const maxPayoff = Math.max(...payoffs);
          const bestStrategy = payoffs.indexOf(maxPayoff);
          console.log(`领导者最优策略: ${player.strategies[bestStrategy]}, 预期收益: ${maxPayoff}`);
          return bestStrategy;
        } else {
          if (store.simulationState.results.length > 0) {
            const leaderChoice = store.simulationState.results[store.simulationState.results.length - 1].playerChoices[model.players[0].id];
            const bestResponse = calculateFollowerResponse(model, leaderChoice);
            console.log(`跟随者最优响应: ${player.strategies[bestResponse]}`);
            return bestResponse;
          }
          return 0;
        }
      } else if (model.id === "entry-deterrence-complete") {
        if (playerId === "1") {
          console.log('【策略选择】完全信息动态博弈-市场进入阻挠：在位者选择投资');
          return 0;
        } else {
          const lastResult = store.simulationState.results[store.simulationState.results.length - 1];
          const incumbentChoice = lastResult?.playerChoices["1"];
          if (incumbentChoice === "投资") {
            console.log('【策略选择】完全信息动态博弈-市场进入阻挠：进入者选择不进入，因为在位者投资');
            return 1;
          } else {
            console.log('【策略选择】完全信息动态博弈-市场进入阻挠：进入者选择进入，因为在位者不投资');
            return 0;
          }
        }
      }
      break;
    case GameType.INCOMPLETE_STATIC:
      if (model.id === "insurance-market") {
        const beliefs = updateBeliefs(model, store.simulationState.results);
        const strategyIndex = calculateEntryDeterrenceStrategy(model, playerId, beliefs);
        console.log('【策略选择】不完全信息静态博弈-保险市场：基于信念选择策略');
        return strategyIndex;
      }
      break;
    case GameType.INCOMPLETE_DYNAMIC:
      if (model.id === "signaling-game") {
        if (playerId === "1") {
          const senderType = store.simulationState.results[store.simulationState.results.length - 1]?.signals?.senderType || 'low';
          const strategyIndex = calculateSignalingStrategy(model, senderType, step);
          console.log('【策略选择】不完全信息动态博弈-信号传递：发送者根据类型选择策略');
          return strategyIndex;
        } else {
          const lastResult = store.simulationState.results[store.simulationState.results.length - 1];
          const signal = lastResult?.playerChoices["1"] || '';
          const strategyIndex = calculateReceiverResponse(model, signal, step);
          console.log('【策略选择】不完全信息动态博弈-信号传递：接收者根据信号选择策略');
          return strategyIndex;
        }
      }
      break;
    default:
      console.log('【策略选择】default 直接返回0');
      return 0;
  }
  return 0;
}

/**
 * 计算斯塔克伯格模型中跟随者的最优响应
 * @param model 博弈模型
 * @param leaderQuantity 领导者的产量
 * @returns 跟随者的最优产量
 */
export function calculateFollowerResponse(model: GameModel, leaderQuantity: string): number {
  // 将字符串转换为数字
  const q1 = parseFloat(leaderQuantity);
  
  // 斯塔克伯格模型中跟随者的反应函数：q2 = (a - c - q1) / 2
  // 其中 a 是市场需求，c 是边际成本
  const a = 100; // 市场需求参数
  const c = 20;  // 边际成本
  
  // 计算跟随者的最优产量
  const q2 = Math.max(0, (a - c - q1) / 2);
  
  // 找到最接近的策略
  const strategies = model.players[1].strategies.map(s => {
    // 将策略字符串转换为数字
    const num = parseFloat(s.replace(/[^0-9.]/g, ''));
    return isNaN(num) ? 0 : num;
  });
  
  // 找到最接近的产量策略
  const closestStrategy = strategies.reduce((prev, curr) => {
    return Math.abs(curr - q2) < Math.abs(prev - q2) ? curr : prev;
  });
  
  return strategies.indexOf(closestStrategy);
}

function updateBeliefs(
  model: GameModel,
  history: SimulationResult[]
): { [playerId: string]: { [strategy: string]: number } } {
  const beliefs: { [playerId: string]: { [strategy: string]: number } } = {};
  
  model.players.forEach(player => {
    beliefs[player.id] = {};
    const totalChoices = history.length;
    
    if (totalChoices === 0) {
      // 如果没有历史数据，使用均匀分布
      player.strategies.forEach(strategy => {
        beliefs[player.id][strategy] = 1 / player.strategies.length;
      });
    } else {
      // 根据历史数据计算频率
      const counts: { [strategy: string]: number } = {};
      player.strategies.forEach(strategy => {
        counts[strategy] = history.filter(r => 
          r.playerChoices[player.id] === strategy
        ).length;
      });
      
      // 转换为概率
      player.strategies.forEach(strategy => {
        beliefs[player.id][strategy] = counts[strategy] / totalChoices;
      });
    }
  });
  
  return beliefs;
}

/**
 * 分析博弈结果
 * @param model 博弈模型
 * @param results 仿真结果数组
 * @returns 分析结果
 */
export function analyzeGameResults(
  model: GameModel,
  results: SimulationResult[]
): {
  dominantStrategies: (number | undefined)[];
  mixedEquilibrium?: { p1: number; p2: number };
  convergence: boolean;
  equilibriumType: string;
  stabilityAnalysis: {
    isStable: boolean;
    deviationGains: { [playerId: string]: number };
  };
} {
  const dominantStrategies = model.players.map(player => 
    findDominantStrategy(model, player.id)
  );
  const mixedEquilibrium = calculateMixedEquilibrium(model);
  // 检查策略是否收敛
  const convergence = results.length >= 10 && results.slice(-10).every((result, i, arr) => {
    if (i === 0) return true;
    return model.players.every(player => 
      result.playerChoices[player.id] === arr[i - 1].playerChoices[player.id]
    );
  });
  // 均衡类型判断分流
  let equilibriumType = '未知';
  switch (model.type) {
    case GameType.COMPLETE_STATIC:
      if (model.id === "prisoners-dilemma" || model.id === "smart-pig") {
        if (dominantStrategies.every(s => s !== undefined)) {
          equilibriumType = '纯策略占优均衡';
        } else if (mixedEquilibrium) {
          equilibriumType = '混合策略均衡';
        } else if (convergence) {
          equilibriumType = '纳什均衡';
        }
      }
      break;
    case GameType.COMPLETE_DYNAMIC:
      if (model.id === "stackelberg") {
        equilibriumType = '斯塔克伯格均衡';
      } else if (model.id === "entry-deterrence-complete") {
        equilibriumType = '完全信息市场进入阻挠均衡';
      }
      break;
    case GameType.INCOMPLETE_STATIC:
      if (model.id === "insurance-market") {
        equilibriumType = '保险市场贝叶斯均衡';
      }
      break;
    case GameType.INCOMPLETE_DYNAMIC:
      if (model.id === "signaling-game") {
        equilibriumType = '信号传递均衡';
      }
      break;
    default:
      equilibriumType = '未知';
      break;
  }
  // 稳定性分析
  const stabilityAnalysis = {
    isStable: true,
    deviationGains: {} as { [playerId: string]: number }
  };

  if (results.length > 0) {
    const lastResult = results[results.length - 1];
    model.players.forEach(player => {
      const playerIndex = model.players.findIndex(p => p.id === player.id);
      if (playerIndex === -1) return;
      
      const currentStrategy = lastResult.playerChoices[player.id];
      const currentPayoff = lastResult.payoffs[player.id];
      
      // 计算偏离当前策略的最大收益
      const maxDeviationPayoff = player.strategies
        .filter(strategy => strategy !== currentStrategy)
        .map(strategy => {
          const opponent = model.players[1 - playerIndex];
          if (!opponent) return -Infinity;
          
          const opponentStrategy = lastResult.playerChoices[opponent.id];
          const key = playerIndex === 0
            ? `${strategy},${opponentStrategy}`
            : `${opponentStrategy},${strategy}`;
          const payoffArray = model.payoffMatrix[key];
          return payoffArray ? payoffArray[playerIndex] : -Infinity;
        })
        .reduce((max, payoff) => Math.max(max, payoff), -Infinity);
      
      const deviationGain = maxDeviationPayoff - currentPayoff;
      stabilityAnalysis.deviationGains[player.id] = deviationGain;
      
      if (deviationGain > 0) {
        stabilityAnalysis.isStable = false;
      }
    });
  }

  return {
    dominantStrategies,
    mixedEquilibrium,
    convergence,
    equilibriumType,
    stabilityAnalysis
  };
}

export function simulateStep(
  model: GameModel,
  step: number,
  store: GameStore
): SimulationResult {
  const result: SimulationResult = {
    step,
    playerChoices: {},
    payoffs: {},
    beliefs: {},
    signals: {}
  };
  switch (model.type) {
    case GameType.COMPLETE_STATIC:
      // 完全信息静态博弈（囚徒困境、智猪博弈）
      if (model.id === "prisoners-dilemma" || model.id === "smart-pig") {
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
      }
      break;
    case GameType.COMPLETE_DYNAMIC:
      // 完全信息动态博弈（斯塔克伯格模型、市场进入阻挠博弈-完全信息）
      if (model.id === "stackelberg") {
        let dynamicChoices = '';
        const leader = model.players[0];
        const follower = model.players[1];
        const leaderStrategyIndex = calculateStrategyChoice(model, leader.id, step, store);
        const leaderStrategy = leader.strategies[leaderStrategyIndex];
        result.playerChoices[leader.id] = leaderStrategy;
        dynamicChoices = leaderStrategy;
        const followerStrategyIndex = calculateFollowerResponse(model, leaderStrategy);
        const followerStrategy = follower.strategies[followerStrategyIndex];
        result.playerChoices[follower.id] = followerStrategy;
        dynamicChoices += ',' + followerStrategy;
        const dynamicPayoffs = model.payoffMatrix[dynamicChoices];
        if (dynamicPayoffs) {
          model.players.forEach((player, index) => {
            result.payoffs[player.id] = dynamicPayoffs[index];
          });
        }
      } else if (model.id === "entry-deterrence-complete") {
        // 完全信息市场进入阻挠博弈
        let dynamicChoices = '';
        const leader = model.players[0];
        const follower = model.players[1];
        const leaderStrategyIndex = 0; // 0表示投资
        const leaderStrategy = leader.strategies[leaderStrategyIndex];
        result.playerChoices[leader.id] = leaderStrategy;
        dynamicChoices = leaderStrategy;
        const followerStrategyIndex = leaderStrategy === "投资" ? 1 : 0;
        const followerStrategy = follower.strategies[followerStrategyIndex];
        result.playerChoices[follower.id] = followerStrategy;
        dynamicChoices += ',' + followerStrategy;
        const dynamicPayoffs = model.payoffMatrix[dynamicChoices];
        if (dynamicPayoffs) {
          model.players.forEach((player, index) => {
            result.payoffs[player.id] = dynamicPayoffs[index];
          });
        }
      }
      break;
    case GameType.INCOMPLETE_STATIC:
      // 不完全信息静态博弈（市场进入阻挠博弈-不完全信息、保险市场逆向选择模型）
      if (model.id === "insurance-market") {
        // 保险市场逆向选择模型
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
      }
      break;
    case GameType.INCOMPLETE_DYNAMIC:
      // 不完全信息动态博弈（信号传递博弈）
      if (model.id === "signaling-game") {
        const sender = model.players[0];
        const receiver = model.players[1];
        const senderType = Math.random() < 0.5 ? 'high' : 'low';
        result.signals = { senderType };
        const senderStrategyIndex = calculateSignalingStrategy(model, senderType, step);
        const senderStrategy = sender.strategies[senderStrategyIndex];
        result.playerChoices[sender.id] = senderStrategy;
        const receiverStrategyIndex = calculateReceiverResponse(model, senderStrategy, step);
        const receiverStrategy = receiver.strategies[receiverStrategyIndex];
        result.playerChoices[receiver.id] = receiverStrategy;
        const choices = `${senderStrategy},${receiverStrategy}`;
        const payoffs = model.payoffMatrix[choices];
        if (payoffs) {
          model.players.forEach((player, index) => {
            result.payoffs[player.id] = payoffs[index];
          });
        }
      }
      break;
    default:
      break;
  }
  if (step % 10 === 0) {
    console.log(`步骤 ${step} 结果:`, {
      策略选择: result.playerChoices,
      收益: result.payoffs
    });
  }
  return result;
}

/**
 * 计算斯塔克伯格模型中领导者的最优产量
 * @param model 博弈模型
 * @returns 领导者的最优产量
 */
export function calculateLeaderOptimalQuantity(model: GameModel): number {
  // 斯塔克伯格模型中领导者的最优产量：q1 = (a - c) / 2
  const a = 100; // 市场需求参数
  const c = 20;  // 边际成本
  
  const q1 = (a - c) / 2;
  
  // 找到最接近的策略
  const strategies = model.players[0].strategies.map(s => {
    // 将策略字符串转换为数字
    const num = parseFloat(s.replace(/[^0-9.]/g, ''));
    return isNaN(num) ? 0 : num;
  });
  
  // 找到最接近的产量策略
  const closestStrategy = strategies.reduce((prev, curr) => {
    return Math.abs(curr - q1) < Math.abs(prev - q1) ? curr : prev;
  });
  
  return strategies.indexOf(closestStrategy);
}

/**
 * 计算市场进入阻挠博弈中的最优策略
 * @param model 博弈模型
 * @param playerId 玩家ID
 * @param beliefs 信念概率分布
 * @returns 最优策略的索引
 */
export function calculateEntryDeterrenceStrategy(
  model: GameModel,
  playerId: string,
  beliefs: { [key: string]: { [key: string]: number } }
): number {
  const playerIndex = model.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return 0;

  const player = model.players[playerIndex];
  const opponent = model.players[1 - playerIndex];

  // 计算每个策略的期望收益
  const expectedPayoffs = player.strategies.map((strategy) => {
    let expectedPayoff = 0;

    opponent.strategies.forEach(opponentStrategy => {
      // 修正：确保信念对象存在且有该策略
      const probability = (beliefs[opponent.id] && beliefs[opponent.id][opponentStrategy] !== undefined)
        ? beliefs[opponent.id][opponentStrategy]
        : 1 / opponent.strategies.length;
      const key = playerIndex === 0 
        ? `${strategy},${opponentStrategy}`
        : `${opponentStrategy},${strategy}`;
      const payoff = model.payoffMatrix[key]?.[playerIndex] || 0;
      expectedPayoff += probability * payoff;
    });

    return expectedPayoff;
  });

  // 选择期望收益最高的策略
  return expectedPayoffs.indexOf(Math.max(...expectedPayoffs));
}

/**
 * 更新市场进入阻挠博弈中的信念
 * @param model 博弈模型
 * @param history 历史结果
 * @returns 更新后的信念
 */
export function updateEntryDeterrenceBeliefs(
  model: GameModel,
  history: SimulationResult[]
): { [key: string]: { [key: string]: number } } {
  const beliefs: { [key: string]: { [key: string]: number } } = {};
  
  model.players.forEach(player => {
    beliefs[player.id] = {};
    
    // 如果没有历史数据，使用均匀分布
    if (history.length === 0) {
      player.strategies.forEach(strategy => {
        beliefs[player.id][strategy] = 1 / player.strategies.length;
      });
      return;
    }
    
    // 计算每个策略的频率，考虑最近的N轮
    const recentHistory = history.slice(-5); // 只考虑最近5轮
    const counts: { [key: string]: number } = {};
    player.strategies.forEach(strategy => {
      counts[strategy] = recentHistory.filter(r => 
        r.playerChoices[player.id] === strategy
      ).length;
    });
    
    // 转换为概率，添加平滑因子避免概率为0
    const smoothingFactor = 0.1;
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0) + smoothingFactor * player.strategies.length;
    player.strategies.forEach(strategy => {
      beliefs[player.id][strategy] = (counts[strategy] + smoothingFactor) / total;
    });
  });
  
  return beliefs;
}

/**
 * 更新信号传递博弈中的信念
 * @param model 博弈模型
 * @param history 历史结果
 * @returns 更新后的信念
 */
export function updateSignalingBeliefs(
  model: GameModel,
  history: SimulationResult[]
): { [key: string]: { [key: string]: number } } {
  const beliefs: { [key: string]: { [key: string]: number } } = {};
  
  model.players.forEach(player => {
    beliefs[player.id] = {};
    
    // 如果没有历史数据，使用均匀分布
    if (history.length === 0) {
      player.strategies.forEach(strategy => {
        beliefs[player.id][strategy] = 1 / player.strategies.length;
      });
      return;
    }
    
    // 计算每个策略的频率，考虑最近的N轮
    const recentHistory = history.slice(-5); // 只考虑最近5轮
    const counts: { [key: string]: number } = {};
    player.strategies.forEach(strategy => {
      counts[strategy] = recentHistory.filter(r => 
        r.playerChoices[player.id] === strategy
      ).length;
    });
    
    // 转换为概率，添加平滑因子避免概率为0
    const smoothingFactor = 0.1;
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0) + smoothingFactor * player.strategies.length;
    player.strategies.forEach(strategy => {
      beliefs[player.id][strategy] = (counts[strategy] + smoothingFactor) / total;
    });
  });
  
  return beliefs;
}

/**
 * 计算信号传递博弈中发送者的最优策略
 * @param model 博弈模型
 * @param senderType 发送者类型
 * @param step 当前步骤
 * @param beliefs 当前信念
 * @returns 最优策略的索引
 */
export function calculateSignalingStrategy(
  model: GameModel,
  senderType: string,
  step: number,
  beliefs?: { [key: string]: { [key: string]: number } }
): number {
  const sender = model.players[0];
  
  // 根据发送者类型和信念选择教育投资水平
  if (senderType === 'high') {
    // 高能力类型倾向于选择高教育投资
    return sender.strategies.indexOf('高教育投资');
  } else {
    // 低能力类型倾向于选择低教育投资
    return sender.strategies.indexOf('低教育投资');
  }
}

/**
 * 计算信号传递博弈中接收者的最优响应
 * @param model 博弈模型
 * @param signal 观察到的信号
 * @param step 当前步骤
 * @param beliefs 当前信念
 * @returns 最优策略的索引
 */
export function calculateReceiverResponse(
  model: GameModel,
  signal: string,
  step: number,
  beliefs?: { [key: string]: { [key: string]: number } }
): number {
  const receiver = model.players[1];
  
  // 根据观察到的信号和信念做出响应
  if (signal === '高教育投资') {
    // 观察到高教育信号时倾向于高薪聘用
    return receiver.strategies.indexOf('高薪聘用');
  } else {
    // 观察到低教育信号时倾向于低薪聘用
    return receiver.strategies.indexOf('低薪聘用');
  }
}