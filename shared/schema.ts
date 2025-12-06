import { z } from "zod";
import { pgTable, serial, integer, real, varchar, timestamp, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

// Database Tables

export const gameSessions = pgTable("game_sessions", {
  id: serial("id").primaryKey(),
  difficulty: varchar("difficulty", { length: 20 }).notNull().default("normal"),
  totalScore: integer("total_score").notNull().default(0),
  totalFlows: integer("total_flows").notNull().default(0),
  correct: integer("correct").notNull().default(0),
  accuracy: real("accuracy").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const decisions = pgTable("decisions", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => gameSessions.id).notNull(),
  flowId: integer("flow_id").notNull(),
  riskScore: real("risk_score").notNull(),
  xgbLabel: varchar("xgb_label", { length: 10 }).notNull(),
  rlAction: integer("rl_action").notNull(),
  trueLabel: integer("true_label").notNull(),
  userAction: integer("user_action").notNull(),
  reward: integer("reward").notNull(),
  isCorrect: integer("is_correct").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  // Flow feature details for visualization
  srcIp: varchar("src_ip", { length: 50 }),
  dstIp: varchar("dst_ip", { length: 50 }),
  srcPort: integer("src_port"),
  dstPort: integer("dst_port"),
  protocol: varchar("protocol", { length: 20 }),
  packetSize: integer("packet_size"),
  duration: real("duration"),
});

export const leaderboard = pgTable("leaderboard", {
  id: serial("id").primaryKey(),
  playerName: varchar("player_name", { length: 50 }).notNull(),
  score: integer("score").notNull(),
  accuracy: real("accuracy").notNull(),
  totalFlows: integer("total_flows").notNull(),
  difficulty: varchar("difficulty", { length: 20 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertGameSessionSchema = createInsertSchema(gameSessions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDecisionSchema = createInsertSchema(decisions).omit({ id: true, createdAt: true });
export const insertLeaderboardSchema = createInsertSchema(leaderboard).omit({ id: true, createdAt: true });

// Types
export type GameSession = typeof gameSessions.$inferSelect;
export type InsertGameSession = z.infer<typeof insertGameSessionSchema>;
export type Decision = typeof decisions.$inferSelect;
export type InsertDecision = z.infer<typeof insertDecisionSchema>;
export type LeaderboardEntry = typeof leaderboard.$inferSelect;
export type InsertLeaderboardEntry = z.infer<typeof insertLeaderboardSchema>;

// API schemas (for request/response validation)
export const flowDataSchema = z.object({
  flow_id: z.number(),
  risk_score: z.number().min(0).max(1),
  xgb_label: z.enum(["NORMAL", "ATTACK"]),
  xgb_label_raw: z.number().min(0).max(1),
  rl_action: z.number().min(0).max(1),
  true_label: z.number().min(0).max(1),
  // Flow features for visualization
  src_ip: z.string().optional(),
  dst_ip: z.string().optional(),
  src_port: z.number().optional(),
  dst_port: z.number().optional(),
  protocol: z.string().optional(),
  packet_size: z.number().optional(),
  duration: z.number().optional(),
});

export type FlowData = z.infer<typeof flowDataSchema>;

export const submitDecisionSchema = z.object({
  flow_id: z.number(),
  user_action: z.number().min(0).max(1),
  true_label: z.number().min(0).max(1),
  risk_score: z.number().optional(),
  xgb_label: z.string().optional(),
  rl_action: z.number().optional(),
  src_ip: z.string().optional(),
  dst_ip: z.string().optional(),
  src_port: z.number().optional(),
  dst_port: z.number().optional(),
  protocol: z.string().optional(),
  packet_size: z.number().optional(),
  duration: z.number().optional(),
});

export type SubmitDecision = z.infer<typeof submitDecisionSchema>;

export const decisionResultSchema = z.object({
  reward: z.number(),
  total_score: z.number(),
  total_flows: z.number(),
  correct: z.number(),
  accuracy: z.number().min(0).max(1),
});

export type DecisionResult = z.infer<typeof decisionResultSchema>;

export const sessionStatsSchema = z.object({
  total_score: z.number(),
  total_flows: z.number(),
  correct: z.number(),
  accuracy: z.number().min(0).max(1),
});

export type SessionStats = z.infer<typeof sessionStatsSchema>;

export const difficultySchema = z.enum(["easy", "normal", "hard", "expert"]);
export type Difficulty = z.infer<typeof difficultySchema>;

export const difficultyMultipliers: Record<Difficulty, { reward: number; penalty: number; timeLimit: number | null }> = {
  easy: { reward: 1.0, penalty: 0.5, timeLimit: null },
  normal: { reward: 1.0, penalty: 1.0, timeLimit: null },
  hard: { reward: 1.5, penalty: 1.5, timeLimit: 30 },
  expert: { reward: 2.0, penalty: 2.0, timeLimit: 15 },
};
