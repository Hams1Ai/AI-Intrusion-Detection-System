import { db } from "./db";
import { gameSessions, decisions, difficultyMultipliers } from "@shared/schema";
import type { FlowData, DecisionResult, SessionStats, Difficulty } from "@shared/schema";
import { eq } from "drizzle-orm";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface IStorage {
  getNextFlow(): Promise<FlowData>;
  submitDecision(flowId: number, userAction: number): Promise<DecisionResult>;
  getSessionStats(): Promise<SessionStats>;
  resetSession(): Promise<void>;
  setDifficulty(difficulty: Difficulty): Promise<void>;
  getDifficulty(): Promise<Difficulty>;
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
    using_real_ppo: false,
  };
}

function getFlowFromMLPython(): FlowData | null {
  try {
    const scriptPath = path.join(__dirname, 'ml_predict.py');
    const output = execSync(`python3 ${scriptPath}`, {
      encoding: 'utf-8',
      timeout: 10000,
      cwd: __dirname,
    });
    
    const data = JSON.parse(output.trim());
    console.log("ML prediction successful, risk_score:", data.risk_score);
    
    return {
      flow_id: data.flow_id,
      risk_score: data.risk_score,
      xgb_label: data.xgb_label as "ATTACK" | "NORMAL",
      xgb_label_raw: data.xgb_label_raw,
      rl_action: data.rl_action,
      true_label: data.true_label,
      src_ip: data.src_ip,
      dst_ip: data.dst_ip,
      src_port: data.src_port,
      dst_port: data.dst_port,
      protocol: data.protocol,
      packet_size: data.packet_size,
      duration: data.duration,
      using_real_ppo: data.using_real_ppo ?? false,
    };
  } catch (error) {
    console.log("ML prediction failed, falling back to simulation:", error);
    return null;
  }
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
  private flowCache: Map<number, FlowData> = new Map();
  private static readonly MAX_CACHED_FLOWS = 50;

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
    const mlFlow = getFlowFromMLPython();
    this.currentFlow = mlFlow ?? generateSimulatedFlow();
    
    // Cache the flow by ID for later lookup during submission
    this.flowCache.set(this.currentFlow.flow_id, this.currentFlow);
    
    // Clean up old cached flows to prevent memory leaks
    if (this.flowCache.size > DatabaseStorage.MAX_CACHED_FLOWS) {
      const keysToDelete = Array.from(this.flowCache.keys()).slice(0, 10);
      keysToDelete.forEach(key => this.flowCache.delete(key));
    }
    
    return this.currentFlow;
  }

  async submitDecision(flowId: number, userAction: number): Promise<DecisionResult> {
    // Look up the flow from cache by ID - this allows handling timing issues
    const flow = this.flowCache.get(flowId);
    
    if (!flow) {
      throw new Error("Flow not found - the flow may have expired or was never loaded");
    }

    const sessionId = await this.ensureSession();
    const trueLabel = flow.true_label;
    const reward = calculateReward(userAction, trueLabel, this.currentDifficulty);
    const isCorrect = reward > 0 ? 1 : 0;

    await db.insert(decisions).values({
      sessionId,
      flowId: flow.flow_id,
      riskScore: flow.risk_score,
      xgbLabel: flow.xgb_label,
      rlAction: flow.rl_action,
      trueLabel: flow.true_label,
      userAction,
      reward,
      isCorrect,
      srcIp: flow.src_ip,
      dstIp: flow.dst_ip,
      srcPort: flow.src_port,
      dstPort: flow.dst_port,
      protocol: flow.protocol,
      packetSize: flow.packet_size,
      duration: flow.duration,
    });

    // Remove the flow from cache after submission to prevent replay
    this.flowCache.delete(flowId);

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
    this.flowCache.clear();
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
}

export const storage = new DatabaseStorage();
