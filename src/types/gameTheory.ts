export enum GameType {
  COMPLETE_STATIC = "完全信息静态博弈",
  COMPLETE_DYNAMIC = "完全信息动态博弈",
  INCOMPLETE_STATIC = "不完全信息静态博弈",
  INCOMPLETE_DYNAMIC = "不完全信息动态博弈",
  STACKELBERG = "斯塔克伯格模型",
  ENTRY_DETERRENCE = "市场进入阻挠博弈",
  SIGNALING_GAME = "信号传递博弈"
}

// 确保Player类型定义中id是string
export type Player = {
  id: string;  // 这里应该是string而不是number
  name: string;
  strategies: string[];
};

export interface GameModel {
  id: string;
  name: string;
  type: GameType;
  description: string;
  players: Player[];
  payoffMatrix: {
    [key: string]: number[];
  };
  isClassic: boolean;
  recommendedRounds?: {
    min: number;
    max: number;
  };
}

export interface SimulationResult {
  step: number;
  playerChoices: { [playerId: string]: string };
  payoffs: { [playerId: string]: number };
  beliefs?: { [playerId: string]: { [strategy: string]: number } };
  signals?: {
    senderType?: string;
    analysis?: string;
    [key: string]: any;
  };
  convergence?: boolean;
  equilibriumType?: string;
  stabilityAnalysis?: {
    isStable: boolean;
    deviationGains: { [playerId: string]: number };
  };
}

// 经典博弈模型
export const CLASSIC_MODELS: GameModel[] = [
  {
    id: "prisoners-dilemma",
    name: "囚徒困境",
    type: GameType.COMPLETE_STATIC,
    description: "两个囚徒面临是否合作的选择。如果双方都合作，各判1年；如果双方都背叛，各判2年；如果一方合作一方背叛，合作方判3年，背叛方释放。这是一个经典的非合作博弈模型，展示了个体理性与集体理性的冲突。在这个博弈中，背叛是占优策略，但如果双方都选择背叛，结果反而比双方都合作更差。",
    players: [
      { id: "1", name: "囚徒A", strategies: ["合作", "背叛"] },
      { id: "2", name: "囚徒B", strategies: ["合作", "背叛"] }
    ],
    payoffMatrix: {
      "合作,合作": [-1, -1],
      "合作,背叛": [-3, 0],
      "背叛,合作": [0, -3],
      "背叛,背叛": [-2, -2]
    },
    isClassic: true,
    recommendedRounds: {
      min: 10,
      max: 20
    }
  },
  {
    id: "smart-pig",
    name: "智猪博弈",
    type: GameType.COMPLETE_STATIC,
    description: "两头猪面对一个按钮和食物。按按钮可以获得食物，但需要走到按钮位置。如果一头猪按按钮，另一头猪可以更快地吃到食物。这个博弈模型展示了搭便车行为，当一方付出成本产生公共利益时，另一方可以不付出成本就获得收益。在现实中，这种情况常见于公共资源的使用和团队协作中。",
    players: [
      { id: "1", name: "猪A", strategies: ["按按钮", "等待"] },
      { id: "2", name: "猪B", strategies: ["按按钮", "等待"] }
    ],
    payoffMatrix: {
      "按按钮,按按钮": [2, 2],
      "按按钮,等待": [1, 4],
      "等待,按按钮": [4, 1],
      "等待,等待": [0, 0]
    },
    isClassic: true,
    recommendedRounds: {
      min: 15,
      max: 25
    }
  },
  {
    id: "stackelberg",
    name: "斯塔克伯格模型",
    type: GameType.COMPLETE_DYNAMIC,
    description: "一个市场中的两个企业，领导者先决定产量，跟随者观察后决定自己的产量。这是一个经典的产业组织理论模型，展示了市场中先行者优势。领导者通过先决策来影响跟随者的选择，从而获得更大的市场份额和利润。这个模型在寡头竞争分析中有重要应用。",
    players: [
      { id: "1", name: "领导者", strategies: ["高产量", "低产量"] },
      { id: "2", name: "跟随者", strategies: ["高产量", "低产量"] }
    ],
    payoffMatrix: {
      "高产量,高产量": [3, 1],
      "高产量,低产量": [5, 2],
      "低产量,高产量": [2, 3],
      "低产量,低产量": [4, 4]
    },
    isClassic: true,
    recommendedRounds: {
      min: 8,
      max: 15
    }
  },
  {
    id: "entry-deterrence-complete",
    name: "市场进入阻挠博弈(完全信息)",
    type: GameType.COMPLETE_DYNAMIC,
    description: "一个在位企业面对潜在进入者的威胁。在位者可以选择是否进行市场投资以阻止进入，潜在进入者观察在位者的行动后决定是否进入市场。这个完全信息版本中，各方了解对方的所有信息和可能的策略选择。",
    players: [
      { id: "1", name: "在位者", strategies: ["投资", "不投资"] },
      { id: "2", name: "进入者", strategies: ["进入", "不进入"] }
    ],
    payoffMatrix: {
      "投资,进入": [-1, -1],
      "投资,不进入": [1, 0],
      "不投资,进入": [0, 2],
      "不投资,不进入": [2, 0]
    },
    isClassic: true,
    recommendedRounds: {
      min: 5,
      max: 10
    }
  },
  {
    id: "entry-deterrence-incomplete",
    name: "市场进入阻挠博弈(不完全信息)",
    type: GameType.INCOMPLETE_STATIC,
    description: "与完全信息版本类似，但进入者不确定在位者的成本类型（高成本或低成本）。这种信息不对称性使得进入者需要根据在位者的行为推测其类型，从而做出进入决策。",
    players: [
      { id: "1", name: "在位者", strategies: ["投资", "不投资"] },
      { id: "2", name: "进入者", strategies: ["进入", "不进入"] }
    ],
    payoffMatrix: {
      "投资,进入": [-1, -1],
      "投资,不进入": [1, 0],
      "不投资,进入": [0, 2],
      "不投资,不进入": [2, 0]
    },
    isClassic: true,
    recommendedRounds: {
      min: 12,
      max: 20
    }
  },
  {
    id: "insurance-market",
    name: "保险市场逆向选择模型",
    type: GameType.INCOMPLETE_STATIC,
    description: "保险公司面对高风险和低风险两类客户，但无法区分客户类型。保险公司提供不同的保险合约，客户根据自身风险类型选择是否购买保险。这个模型展示了信息不对称如何影响市场效率。",
    players: [
      { id: "1", name: "保险公司", strategies: ["高保费", "低保费"] },
      { id: "2", name: "客户", strategies: ["购买", "不购买"] }
    ],
    payoffMatrix: {
      "高保费,购买": [2, 1],
      "高保费,不购买": [0, 2],
      "低保费,购买": [1, 2],
      "低保费,不购买": [0, 1]
    },
    isClassic: true,
    recommendedRounds: {
      min: 15,
      max: 25
    }
  },
  {
    id: "signaling-game",
    name: "信号传递博弈",
    type: GameType.INCOMPLETE_DYNAMIC,
    description: "一个求职者（发送者）了解自己的能力类型，而雇主（接收者）不了解。求职者可以通过教育投资作为信号传递自己的能力。这个模型展示了如何通过可观察的行动来传递私人信息。",
    players: [
      { id: "1", name: "求职者", strategies: ["高教育投资", "低教育投资"] },
      { id: "2", name: "雇主", strategies: ["高薪聘用", "低薪聘用"] }
    ],
    payoffMatrix: {
      "高教育投资,高薪聘用": [3, 2],
      "高教育投资,低薪聘用": [0, 1],
      "低教育投资,高薪聘用": [4, -1],
      "低教育投资,低薪聘用": [2, 1]
    },
    isClassic: true,
    recommendedRounds: {
      min: 15,
      max: 20
    }
  }
];
