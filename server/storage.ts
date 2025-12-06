import type { FlowData, DecisionResult, SessionStats } from "@shared/schema";

export interface IStorage {
  getNextFlow(): Promise<FlowData>;
  submitDecision(flowId: number, userAction: number, trueLabel: number): Promise<DecisionResult>;
  getSessionStats(): Promise<SessionStats>;
  resetSession(): Promise<void>;
}

function generateSimulatedFlow(): FlowData {
  const flowId = Math.floor(Math.random() * 100000);
  const trueLabel = Math.random() < 0.4 ? 1 : 0;
  
  let riskScore: number;
  if (trueLabel === 1) {
    riskScore = 0.5 + Math.random() * 0.45;
  } else {
    riskScore = Math.random() * 0.5;
  }
  riskScore = Math.round(riskScore * 100) / 100;
  
  const xgbLabelRaw = riskScore > 0.5 ? 1 : 0;
  const xgbLabel = xgbLabelRaw === 1 ? "ATTACK" as const : "NORMAL" as const;
  
  let rlAction: number;
  if (riskScore > 0.7) {
    rlAction = 1;
  } else if (riskScore < 0.3) {
    rlAction = 0;
  } else {
    rlAction = Math.random() < 0.6 ? 1 : 0;
  }
  
  return {
    flow_id: flowId,
    risk_score: riskScore,
    xgb_label: xgbLabel,
    xgb_label_raw: xgbLabelRaw,
    rl_action: rlAction,
    true_label: trueLabel,
  };
}

function calculateReward(userAction: number, trueLabel: number): number {
  if (userAction === 0) {
    if (trueLabel === 0) {
      return 10;
    } else {
      return -10;
    }
  } else {
    if (trueLabel === 1) {
      return 8;
    } else {
      return -5;
    }
  }
}

export class MemStorage implements IStorage {
  private sessionStats: SessionStats;
  private currentFlow: FlowData | null;

  constructor() {
    this.sessionStats = {
      total_score: 0,
      total_flows: 0,
      correct: 0,
      accuracy: 0,
    };
    this.currentFlow = null;
  }

  async getNextFlow(): Promise<FlowData> {
    this.currentFlow = generateSimulatedFlow();
    return this.currentFlow;
  }

  async submitDecision(flowId: number, userAction: number, trueLabel: number): Promise<DecisionResult> {
    const reward = calculateReward(userAction, trueLabel);
    const isCorrect = reward > 0;
    
    this.sessionStats.total_score += reward;
    this.sessionStats.total_flows += 1;
    if (isCorrect) {
      this.sessionStats.correct += 1;
    }
    this.sessionStats.accuracy = this.sessionStats.total_flows > 0 
      ? this.sessionStats.correct / this.sessionStats.total_flows 
      : 0;

    return {
      reward,
      total_score: this.sessionStats.total_score,
      total_flows: this.sessionStats.total_flows,
      correct: this.sessionStats.correct,
      accuracy: this.sessionStats.accuracy,
    };
  }

  async getSessionStats(): Promise<SessionStats> {
    return { ...this.sessionStats };
  }

  async resetSession(): Promise<void> {
    this.sessionStats = {
      total_score: 0,
      total_flows: 0,
      correct: 0,
      accuracy: 0,
    };
    this.currentFlow = null;
  }
}

export const storage = new MemStorage();
