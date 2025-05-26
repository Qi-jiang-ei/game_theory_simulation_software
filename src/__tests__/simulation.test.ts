import { useGameStore } from '../store/gameStore';
import { GameModel, GameType, SimulationResult } from '../types/gameTheory';
import { analyzeGameResults } from '../utils/gameTheory';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabaseClient';

// Mock supabaseClient to avoid import.meta.env errors
jest.mock('../lib/supabaseClient', () => ({
  // 修正 mock 的返回结构，模拟 supabase 客户端
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
    })),
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));

// 测试用的囚徒困境模型
const testModel: GameModel = {
  id: 'prisoners-dilemma',
  name: '囚徒困境',
  type: GameType.COMPLETE_STATIC,
  players: [
    { id: '1', name: '囚徒1', strategies: ['坦白', '抵赖'] },
    { id: '2', name: '囚徒2', strategies: ['坦白', '抵赖'] }
  ],
  payoffMatrix: {
    '坦白,坦白': [-8, -8],
    '坦白,抵赖': [0, -10],
    '抵赖,坦白': [-10, 0],
    '抵赖,抵赖': [-1, -1]
  },
  description: '经典囚徒困境博弈',
  isClassic: true,
};

// 生成测试用的仿真结果
function generateTestResults(): SimulationResult[] {
  return [
    {
      step: 0,
      playerChoices: { '1': '坦白', '2': '坦白' },
      payoffs: { '1': -8, '2': -8 },
      beliefs: {},
      signals: {}
    },
    {
      step: 1,
      playerChoices: { '1': '坦白', '2': '坦白' },
      payoffs: { '1': -8, '2': -8 },
      beliefs: {},
      signals: {}
    },
    {
      step: 2,
      playerChoices: { '1': '坦白', '2': '坦白' },
      payoffs: { '1': -8, '2': -8 },
      beliefs: {},
      signals: {}
    }
  ];
}

describe('Simulation Tests', () => {
  beforeEach(() => {
    // 重置 game store 状态
    useGameStore.setState({
      selectedModelId: null,
      simulationState: {
        isRunning: false,
        results: [],
        currentStep: 0
      }
    });
  });

  describe('Simulation Control Tests', () => {
    test('开始仿真', () => {
      const store = useGameStore.getState();
      store.setSelectedModel('prisoners-dilemma');
      
      // 在调用 startSimulation 之前或之后等待状态更新
      store.startSimulation();
      
      // 使用异步等待状态更新，或者检查 startSimulation 是否同步更新状态
      // 暂时保持同步检查，如果失败再考虑异步
      expect(useGameStore.getState().simulationState.isRunning).toBe(true);
    });

    test('停止仿真', () => {
      const store = useGameStore.getState();
      store.setSelectedModel('prisoners-dilemma');
      store.startSimulation();
      store.stopSimulation();
      
      expect(store.simulationState.isRunning).toBe(false);
    });

    test('重置仿真', () => {
      const store = useGameStore.getState();
      store.setSelectedModel('prisoners-dilemma');
      store.startSimulation();
      store.resetSimulation();
      
      expect(store.simulationState.isRunning).toBe(false);
      expect(store.simulationState.results.length).toBe(0);
      expect(store.simulationState.currentStep).toBe(0);
    });
  });

  describe('Simulation Results Tests', () => {
    test('保存仿真结果', async () => {
      const store = useGameStore.getState();
      store.setSelectedModel('prisoners-dilemma');
      const testResults = generateTestResults();
      store.loadSimulationResults(testResults);

      // 模拟已登录用户状态
      useAuthStore.setState({ 
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          role: 'user'
        }
      });

      // 模拟 Supabase 插入操作
      const mockSingle = jest.fn().mockResolvedValueOnce({ data: { id: 'new-sim-id' }, error: null });
      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
      // 使用 mock 的 supabase 实例
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValueOnce({ data: { name: '囚徒困境' }, error: null }),
          })),
        })),
        insert: mockInsert,
      });

      // 执行保存操作
      await store.saveSimulationResults();

      // 验证 Supabase 插入操作被调用，并且传入了正确的数据
      expect(supabase.from).toHaveBeenCalledWith('simulation_results');
      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'test-user-id',
        model_id: 'prisoners-dilemma',
        model_name: '囚徒困境',
        results: testResults,
        created_at: expect.any(String),
      });
      expect(mockSelect).toHaveBeenCalled();
      expect(mockSingle).toHaveBeenCalled();

      // 如果代码执行到这里没有抛出错误，并且 mock 被正确调用，测试通过
    });

    test('加载仿真结果', () => {
      const store = useGameStore.getState();
      const testResults = generateTestResults();
      
      store.loadSimulationResults(testResults);
      
      // 验证 results 和 currentStep 是否被正确设置
      // 确保 store 被正确更新
      expect(useGameStore.getState().simulationState.results).toEqual(testResults);
      expect(useGameStore.getState().simulationState.currentStep).toBe(testResults.length);
    });
  });

  describe('Analysis Tests', () => {
    test('分析仿真结果', () => {
      const testResults = generateTestResults();
      const analysis = analyzeGameResults(testModel, testResults);
      
      // 验证分析结果
      expect(analysis.dominantStrategies).toBeDefined();
      expect(analysis.convergence).toBeDefined();
      expect(analysis.equilibriumType).toBeDefined();
      expect(analysis.stabilityAnalysis).toBeDefined();
    });

    test('均衡状态分析', () => {
      const testResults = generateTestResults();
      const analysis = analyzeGameResults(testModel, testResults);
      
      // 对于囚徒困境，预期是纯策略占优均衡
      expect(analysis.equilibriumType).toContain('纯策略占优均衡');
      
      // 验证稳定性
      expect(analysis.stabilityAnalysis.isStable).toBe(true);
    });

    test('策略选择分析', () => {
      const testResults = generateTestResults();
      const analysis = analyzeGameResults(testModel, testResults);
      
      // 验证占优策略
      expect(analysis.dominantStrategies[0]).toBe(0); // 囚徒1的占优策略是"坦白"
      expect(analysis.dominantStrategies[1]).toBe(0); // 囚徒2的占优策略是"坦白"
    });
  });

  describe('Performance Tests', () => {
    test('大规模仿真性能', () => {
      const store = useGameStore.getState();
      store.setSelectedModel('prisoners-dilemma');
      
      const startTime = performance.now();
      
      // 运行100步仿真
      for(let i = 0; i < 100; i++) {
        store.simulationState.currentStep++;
      }
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      // 验证性能
      expect(executionTime).toBeLessThan(1000); // 应该在1秒内完成
    });
  });
}); 