import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { submitDecisionSchema } from "@shared/schema";

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
      const parseResult = submitDecisionSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Invalid request body",
          details: parseResult.error.errors 
        });
      }

      const { flow_id, user_action, true_label } = parseResult.data;
      const result = await storage.submitDecision(flow_id, user_action, true_label);
      res.json(result);
    } catch (error) {
      console.error("Error submitting decision:", error);
      res.status(500).json({ error: "Failed to submit decision" });
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

  return httpServer;
}
