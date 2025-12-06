import { z } from "zod";

export const flowDataSchema = z.object({
  flow_id: z.number(),
  risk_score: z.number().min(0).max(1),
  xgb_label: z.enum(["NORMAL", "ATTACK"]),
  xgb_label_raw: z.number().min(0).max(1),
  rl_action: z.number().min(0).max(1),
  true_label: z.number().min(0).max(1),
});

export type FlowData = z.infer<typeof flowDataSchema>;

export const submitDecisionSchema = z.object({
  flow_id: z.number(),
  user_action: z.number().min(0).max(1),
  true_label: z.number().min(0).max(1),
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
