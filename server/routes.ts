import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { difficultySchema } from "@shared/schema";
import { z } from "zod";

const submitDecisionRequestSchema = z.object({
  flow_id: z.number(),
  user_action: z.number().min(0).max(1),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get("/api/next-flow", async (req, res) => {
    try {
      const flowData = await storage.getNextFlow();
      res.json(flowData);
    } catch (error) {
      console.error("Error getting next flow:", error);
      res.status(500).json({ error: "Failed to get next flow" });
    }
  });

  app.post("/api/submit-decision", async (req, res) => {
    try {
      const parseResult = submitDecisionRequestSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Invalid request body",
          details: parseResult.error.errors 
        });
      }

      const { flow_id, user_action } = parseResult.data;
      const result = await storage.submitDecision(flow_id, user_action);
      res.json(result);
    } catch (error) {
      console.error("Error submitting decision:", error);
      const message = error instanceof Error ? error.message : "Failed to submit decision";
      res.status(400).json({ error: message });
    }
  });

  app.get("/api/session-stats", async (req, res) => {
    try {
      const stats = await storage.getSessionStats();
      res.json(stats);
    } catch (error) {
      console.error("Error getting session stats:", error);
      res.status(500).json({ error: "Failed to get session stats" });
    }
  });

  app.post("/api/reset-session", async (req, res) => {
    try {
      await storage.resetSession();
      res.json({ success: true });
    } catch (error) {
      console.error("Error resetting session:", error);
      res.status(500).json({ error: "Failed to reset session" });
    }
  });

  app.get("/api/decision-history", async (req, res) => {
    try {
      const history = await storage.getDecisionHistory();
      res.json(history);
    } catch (error) {
      console.error("Error getting decision history:", error);
      res.status(500).json({ error: "Failed to get decision history" });
    }
  });

  app.get("/api/difficulty", async (req, res) => {
    try {
      const difficulty = await storage.getDifficulty();
      res.json({ difficulty });
    } catch (error) {
      console.error("Error getting difficulty:", error);
      res.status(500).json({ error: "Failed to get difficulty" });
    }
  });

  app.post("/api/difficulty", async (req, res) => {
    try {
      const parseResult = difficultySchema.safeParse(req.body.difficulty);
      
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Invalid difficulty",
          details: parseResult.error.errors 
        });
      }

      await storage.setDifficulty(parseResult.data);
      res.json({ difficulty: parseResult.data });
    } catch (error) {
      console.error("Error setting difficulty:", error);
      res.status(500).json({ error: "Failed to set difficulty" });
    }
  });

  app.get("/api/leaderboard", async (req, res) => {
    try {
      const entries = await storage.getLeaderboard();
      res.json(entries);
    } catch (error) {
      console.error("Error getting leaderboard:", error);
      res.status(500).json({ error: "Failed to get leaderboard" });
    }
  });

  app.post("/api/leaderboard", async (req, res) => {
    try {
      const { playerName } = req.body;
      
      if (!playerName || typeof playerName !== "string" || playerName.length < 1) {
        return res.status(400).json({ error: "Player name is required" });
      }

      const entry = await storage.submitScore(playerName.substring(0, 50));
      res.json(entry);
    } catch (error) {
      console.error("Error submitting score:", error);
      res.status(500).json({ error: "Failed to submit score" });
    }
  });

  return httpServer;
}
