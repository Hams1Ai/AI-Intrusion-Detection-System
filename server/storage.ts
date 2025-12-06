import { db } from "./db";
import { gameSessions, decisions, leaderboard, difficultyMultipliers } from "@shared/schema";
import type { FlowData, DecisionResult, SessionStats, Difficulty, Decision, LeaderboardEntry } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getNextFlow(): Promise<FlowData>;
  submitDecision(flowId: number, userAction: number): Promise<DecisionResult>;
  getSessionStats(): Promise<SessionStats>;
  resetSession(): Promise<void>;
  getDecisionHistory(): Promise<Decision[]>;
  setDifficulty(difficulty: Difficulty): Promise<void>;
  getDifficulty(): Promise<Difficulty>;
  getLeaderboard(): Promise<LeaderboardEntry[]>;
  submitScore(playerName: string): Promise<LeaderboardEntry>;
}

function generateRandomIp(): string {
  return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
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
  const xgbLabel = xgbLabelRaw === 1 ? ("ATTACK" as const) : ("NORMAL" as const);

  let rlAction: number;
  if (riskScore > 0.7) {
    rlAction = 1;
  } else if (riskScore < 0.3) {
    rlAction = 0;
  } else {
    rlAction = Math.random() < 0.6 ? 1 : 0;
  }

  const protocols = ["TCP", "UDP", "ICMP", "HTTP", "HTTPS", "SSH", "DNS"];
  const protocol = protocols[Math.floor(Math.random() * protocols.length)];

  const commonPorts = [22, 80, 443, 8080, 3306, 5432, 6379, 27017];
  const suspiciousPorts = [4444, 5555, 6666, 31337, 12345];

  let dstPort: number;
  if (trueLabel === 1 && Math.random() < 0.3) {
    dstPort = suspiciousPorts[Math.floor(Math.random() * suspiciousPorts.length)];
  } else {
    dstPort = commonPorts[Math.floor(Math.random() * commonPorts.length)];
  }

  return {
    flow_id: flowId,
    risk_score: riskScore,
    xgb_label: xgbLabel,
    xgb_label_raw: xgbLabelRaw,
    rl_action: rlAction,
    true_label: trueLabel,
    src_ip: generateRandomIp(),
    dst_ip: generateRandomIp(),
    src_port: Math.floor(Math.random() * 60000) + 1024,
    dst_port: dstPort,
    protocol: protocol,
    packet_size: Math.floor(Math.random() * 1500) + 64,
    duration: Math.round((Math.random() * 120) * 100) / 100,
  };
}

function calculateReward(userAction: number, trueLabel: number, difficulty: Difficulty): number {
  const multipliers = difficultyMultipliers[difficulty];
  let baseReward: number;

  if (userAction === 0) {
    if (trueLabel === 0) {
      baseReward = 10;
    } else {
      baseReward = -10;
    }
  } else {
    if (trueLabel === 1) {
      baseReward = 8;
    } else {
      baseReward = -5;
    }
  }

  if (baseReward > 0) {
    return Math.round(baseReward * multipliers.reward);
  } else {
    return Math.round(baseReward * multipliers.penalty);
  }
}

export class DatabaseStorage implements IStorage {
  private currentSessionId: number | null = null;
  private currentDifficulty: Difficulty = "normal";
  private currentFlow: FlowData | null = null;

  private async ensureSession(): Promise<number> {
    if (this.currentSessionId === null) {
      const [session] = await db
        .insert(gameSessions)
        .values({ difficulty: this.currentDifficulty })
        .returning();
      this.currentSessionId = session.id;
    }
    return this.currentSessionId;
  }

  async getNextFlow(): Promise<FlowData> {
    this.currentFlow = generateSimulatedFlow();
    return this.currentFlow;
  }

  async submitDecision(flowId: number, userAction: number): Promise<DecisionResult> {
    if (!this.currentFlow) {
      throw new Error("No flow loaded - call getNextFlow first");
    }

    if (this.currentFlow.flow_id !== flowId) {
      throw new Error("Flow ID mismatch - the submitted flow does not match the current flow");
    }

    const sessionId = await this.ensureSession();
    const trueLabel = this.currentFlow.true_label;
    const reward = calculateReward(userAction, trueLabel, this.currentDifficulty);
    const isCorrect = reward > 0 ? 1 : 0;

    await db.insert(decisions).values({
      sessionId,
      flowId: this.currentFlow.flow_id,
      riskScore: this.currentFlow.risk_score,
      xgbLabel: this.currentFlow.xgb_label,
      rlAction: this.currentFlow.rl_action,
      trueLabel: this.currentFlow.true_label,
      userAction,
      reward,
      isCorrect,
      srcIp: this.currentFlow.src_ip,
      dstIp: this.currentFlow.dst_ip,
      srcPort: this.currentFlow.src_port,
      dstPort: this.currentFlow.dst_port,
      protocol: this.currentFlow.protocol,
      packetSize: this.currentFlow.packet_size,
      duration: this.currentFlow.duration,
    });

    const [session] = await db
      .select()
      .from(gameSessions)
      .where(eq(gameSessions.id, sessionId));

    const newTotalScore = session.totalScore + reward;
    const newTotalFlows = session.totalFlows + 1;
    const newCorrect = session.correct + isCorrect;
    const newAccuracy = newTotalFlows > 0 ? newCorrect / newTotalFlows : 0;

    await db
      .update(gameSessions)
      .set({
        totalScore: newTotalScore,
        totalFlows: newTotalFlows,
        correct: newCorrect,
        accuracy: newAccuracy,
        updatedAt: new Date(),
      })
      .where(eq(gameSessions.id, sessionId));

    this.currentFlow = null;

    return {
      reward,
      total_score: newTotalScore,
      total_flows: newTotalFlows,
      correct: newCorrect,
      accuracy: newAccuracy,
    };
  }

  async getSessionStats(): Promise<SessionStats> {
    if (this.currentSessionId === null) {
      return {
        total_score: 0,
        total_flows: 0,
        correct: 0,
        accuracy: 0,
      };
    }

    const [session] = await db
      .select()
      .from(gameSessions)
      .where(eq(gameSessions.id, this.currentSessionId));

    if (!session) {
      return {
        total_score: 0,
        total_flows: 0,
        correct: 0,
        accuracy: 0,
      };
    }

    return {
      total_score: session.totalScore,
      total_flows: session.totalFlows,
      correct: session.correct,
      accuracy: session.accuracy,
    };
  }

  async resetSession(): Promise<void> {
    this.currentSessionId = null;
    this.currentFlow = null;
    this.currentDifficulty = "normal";
  }

  async getDecisionHistory(): Promise<Decision[]> {
    if (this.currentSessionId === null) {
      return [];
    }

    const history = await db
      .select()
      .from(decisions)
      .where(eq(decisions.sessionId, this.currentSessionId))
      .orderBy(desc(decisions.createdAt));

    return history;
  }

  async setDifficulty(difficulty: Difficulty): Promise<void> {
    this.currentDifficulty = difficulty;
    if (this.currentSessionId !== null) {
      await db
        .update(gameSessions)
        .set({ difficulty })
        .where(eq(gameSessions.id, this.currentSessionId));
    }
  }

  async getDifficulty(): Promise<Difficulty> {
    return this.currentDifficulty;
  }

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    const entries = await db
      .select()
      .from(leaderboard)
      .orderBy(desc(leaderboard.score))
      .limit(10);

    return entries;
  }

  async submitScore(playerName: string): Promise<LeaderboardEntry> {
    const stats = await this.getSessionStats();

    const [entry] = await db
      .insert(leaderboard)
      .values({
        playerName,
        score: stats.total_score,
        accuracy: stats.accuracy,
        totalFlows: stats.total_flows,
        difficulty: this.currentDifficulty,
      })
      .returning();

    return entry;
  }
}

export const storage = new DatabaseStorage();
