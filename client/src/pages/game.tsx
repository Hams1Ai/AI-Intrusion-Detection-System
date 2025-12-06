import { useState, useCallback, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { 
  Shield, 
  XCircle, 
  Activity, 
  Zap, 
  Target, 
  TrendingUp,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Star,
  Clock,
  Gauge,
  Timer,
  Network,
  Server,
  Globe,
  Package,
  Wifi,
  AlertOctagon,
  Info
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { FlowData, DecisionResult, Difficulty } from "@shared/schema";
import { difficultyMultipliers } from "@shared/schema";

function Header() {
  return (
    <header className="w-full border-b border-border/50 bg-card/50 glass-panel">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Activity className="w-8 h-8 text-neon-cyan" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-neon-green rounded-full pulse-glow" />
          </div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-wider uppercase neon-text-cyan" data-testid="text-header-title">
            AI Intrusion Detection System
          </h1>
        </div>
        <Badge 
          variant="outline" 
          className="bg-neon-green/10 border-neon-green/50 text-neon-green pulse-glow"
          data-testid="badge-status-online"
        >
          <span className="w-2 h-2 bg-neon-green rounded-full mr-2" />
          ONLINE
        </Badge>
      </div>
    </header>
  );
}

interface DifficultySelectorProps {
  difficulty: Difficulty;
  onDifficultyChange: (difficulty: Difficulty) => void;
  disabled: boolean;
}

function DifficultySelector({ difficulty, onDifficultyChange, disabled }: DifficultySelectorProps) {
  const difficultyInfo: Record<Difficulty, { label: string; color: string; description: string }> = {
    easy: { label: "EASY", color: "text-neon-green", description: "0.5x penalties, no timer" },
    normal: { label: "NORMAL", color: "text-neon-cyan", description: "1x rewards/penalties, no timer" },
    hard: { label: "HARD", color: "text-neon-yellow", description: "1.5x multiplier, 30s timer" },
    expert: { label: "EXPERT", color: "text-neon-red", description: "2x multiplier, 15s timer" },
  };

  return (
    <Card className="neon-border-gradient">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Gauge className="w-5 h-5 text-neon-purple" />
            <div>
              <p className="text-sm font-medium uppercase tracking-wide">Difficulty Level</p>
              <p className="text-xs text-muted-foreground">{difficultyInfo[difficulty].description}</p>
            </div>
          </div>
          <Select
            value={difficulty}
            onValueChange={(value) => onDifficultyChange(value as Difficulty)}
            disabled={disabled}
          >
            <SelectTrigger className="w-40" data-testid="select-difficulty">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="easy" data-testid="select-difficulty-easy">
                <span className="text-neon-green font-semibold">EASY</span>
              </SelectItem>
              <SelectItem value="normal" data-testid="select-difficulty-normal">
                <span className="text-neon-cyan font-semibold">NORMAL</span>
              </SelectItem>
              <SelectItem value="hard" data-testid="select-difficulty-hard">
                <span className="text-neon-yellow font-semibold">HARD</span>
              </SelectItem>
              <SelectItem value="expert" data-testid="select-difficulty-expert">
                <span className="text-neon-red font-semibold">EXPERT</span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

interface TimerProps {
  timeLimit: number | null;
  timeRemaining: number;
  isActive: boolean;
}

function TimerDisplay({ timeLimit, timeRemaining, isActive }: TimerProps) {
  if (!timeLimit || !isActive) return null;

  const progress = (timeRemaining / timeLimit) * 100;
  const isLow = timeRemaining <= 5;
  const isExpired = timeRemaining <= 0;

  return (
    <Card className={`neon-border-gradient ${isLow ? "neon-glow-red" : "neon-glow-yellow"}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <Timer className={`w-6 h-6 ${isLow ? "text-neon-red animate-pulse" : "text-neon-yellow"}`} />
          <div className="flex-1 space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-sm uppercase tracking-wide font-medium">Time Pressure</p>
              <span className={`text-2xl font-bold ${isLow ? "neon-text-red" : "neon-text-yellow"}`} data-testid="text-timer">
                {isExpired ? "TIME'S UP!" : `${timeRemaining}s`}
              </span>
            </div>
            <Progress 
              value={progress} 
              className={`h-2 ${isLow ? "[&>div]:bg-neon-red" : "[&>div]:bg-neon-yellow"}`}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface FlowAnalyzerProps {
  flowData: FlowData | null;
  isLoading: boolean;
}

const SUSPICIOUS_PORTS = [4444, 5555, 6666, 31337, 12345, 1337, 6667, 23, 135, 137, 138, 139, 445];
const HIGH_RISK_PORTS = [22, 23, 3389, 5900, 5432, 3306, 27017, 6379];
const COMMON_PORTS = [80, 443, 8080, 53];

function getPortRiskLevel(port: number | undefined): { level: "suspicious" | "high-risk" | "common" | "normal"; label: string; color: string } {
  if (!port) return { level: "normal", label: "Unknown", color: "text-muted-foreground" };
  if (SUSPICIOUS_PORTS.includes(port)) return { level: "suspicious", label: "Suspicious", color: "text-neon-red" };
  if (HIGH_RISK_PORTS.includes(port)) return { level: "high-risk", label: "High-Risk", color: "text-neon-yellow" };
  if (COMMON_PORTS.includes(port)) return { level: "common", label: "Common", color: "text-neon-green" };
  return { level: "normal", label: "Standard", color: "text-muted-foreground" };
}

function getRiskLevel(score: number): { level: string; color: string; bgColor: string; borderColor: string } {
  if (score >= 0.8) return { level: "CRITICAL", color: "text-neon-red", bgColor: "bg-neon-red/20", borderColor: "border-neon-red/50" };
  if (score >= 0.6) return { level: "HIGH", color: "text-neon-yellow", bgColor: "bg-neon-yellow/20", borderColor: "border-neon-yellow/50" };
  if (score >= 0.4) return { level: "MEDIUM", color: "text-neon-purple", bgColor: "bg-neon-purple/20", borderColor: "border-neon-purple/50" };
  if (score >= 0.2) return { level: "LOW", color: "text-neon-cyan", bgColor: "bg-neon-cyan/20", borderColor: "border-neon-cyan/50" };
  return { level: "MINIMAL", color: "text-neon-green", bgColor: "bg-neon-green/20", borderColor: "border-neon-green/50" };
}

function getPacketSizeCategory(size: number | undefined): { category: string; color: string; isAnomaly: boolean } {
  if (!size) return { category: "Unknown", color: "text-muted-foreground", isAnomaly: false };
  if (size < 100) return { category: "Tiny", color: "text-neon-cyan", isAnomaly: false };
  if (size < 500) return { category: "Small", color: "text-neon-green", isAnomaly: false };
  if (size < 1000) return { category: "Medium", color: "text-muted-foreground", isAnomaly: false };
  if (size < 1400) return { category: "Large", color: "text-neon-yellow", isAnomaly: false };
  return { category: "Jumbo", color: "text-neon-red", isAnomaly: true };
}

function getDurationCategory(duration: number | undefined): { category: string; color: string; isAnomaly: boolean } {
  if (!duration) return { category: "Unknown", color: "text-muted-foreground", isAnomaly: false };
  if (duration < 1) return { category: "Instant", color: "text-neon-cyan", isAnomaly: false };
  if (duration < 10) return { category: "Short", color: "text-neon-green", isAnomaly: false };
  if (duration < 60) return { category: "Normal", color: "text-muted-foreground", isAnomaly: false };
  if (duration < 120) return { category: "Extended", color: "text-neon-yellow", isAnomaly: true };
  return { category: "Persistent", color: "text-neon-red", isAnomaly: true };
}

function FlowAnalyzer({ flowData, isLoading }: FlowAnalyzerProps) {
  if (isLoading) {
    return (
      <Card className="neon-border-gradient neon-glow-cyan">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg uppercase tracking-wide">
            <Zap className="w-5 h-5 text-neon-cyan" />
            RL Interactive Analyzer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-neon-cyan animate-spin" />
            <span className="ml-3 text-muted-foreground">Analyzing network flow...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!flowData) {
    return (
      <Card className="neon-border-gradient neon-glow-cyan">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg uppercase tracking-wide">
            <Zap className="w-5 h-5 text-neon-cyan" />
            RL Interactive Analyzer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center py-12">
            <span className="text-muted-foreground">Load a network flow to begin analysis</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isAttack = flowData.xgb_label === "ATTACK";
  const riskInfo = getRiskLevel(flowData.risk_score);
  const portRisk = getPortRiskLevel(flowData.dst_port);
  const packetInfo = getPacketSizeCategory(flowData.packet_size);
  const durationInfo = getDurationCategory(flowData.duration);
  
  const anomalies: string[] = [];
  if (portRisk.level === "suspicious") anomalies.push("Suspicious destination port");
  if (portRisk.level === "high-risk") anomalies.push("High-risk service port");
  if (packetInfo.isAnomaly) anomalies.push("Unusual packet size");
  if (durationInfo.isAnomaly) anomalies.push("Extended connection duration");
  if (flowData.risk_score >= 0.7) anomalies.push("High ML risk score");

  return (
    <Card className="neon-border-gradient neon-glow-cyan">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between gap-2 text-lg uppercase tracking-wide">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-neon-cyan" />
            RL Interactive Analyzer
          </div>
          {anomalies.length > 0 && (
            <Badge 
              variant="destructive" 
              className="bg-neon-red/20 border border-neon-red/50 text-neon-red"
              data-testid="badge-anomaly-count"
            >
              <AlertOctagon className="w-3 h-3 mr-1" />
              {anomalies.length} {anomalies.length === 1 ? "Anomaly" : "Anomalies"}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground uppercase tracking-wide">Flow ID</p>
            <p className="text-2xl font-bold neon-text-cyan" data-testid="text-flow-id">
              Flow #{flowData.flow_id.toString().padStart(5, '0')}
            </p>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="space-y-2 text-center">
              <p className="text-sm text-muted-foreground uppercase tracking-wide">XGBoost Classification</p>
              <Badge 
                variant={isAttack ? "destructive" : "default"}
                className={`text-base px-4 py-1 ${
                  isAttack 
                    ? "bg-neon-red/20 border border-neon-red/50 text-neon-red neon-glow-red" 
                    : "bg-neon-green/20 border border-neon-green/50 text-neon-green neon-glow-green"
                }`}
                data-testid="badge-xgb-classification"
              >
                {flowData.xgb_label}
              </Badge>
            </div>
          </div>
        </div>

        <div className="space-y-3 p-4 rounded-md border border-border/30 bg-secondary/10">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-neon-yellow" />
              <span className="text-sm uppercase tracking-wide">Risk Assessment</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge 
                className={`${riskInfo.bgColor} border ${riskInfo.borderColor} ${riskInfo.color}`}
                data-testid="badge-risk-level"
              >
                {riskInfo.level}
              </Badge>
              <span className={`text-2xl font-bold ${riskInfo.color}`} data-testid="text-risk-score">
                {(flowData.risk_score * 100).toFixed(0)}%
              </span>
            </div>
          </div>
          <Progress 
            value={flowData.risk_score * 100} 
            className={`h-3 ${
              flowData.risk_score >= 0.8 ? "[&>div]:bg-neon-red" :
              flowData.risk_score >= 0.6 ? "[&>div]:bg-neon-yellow" :
              flowData.risk_score >= 0.4 ? "[&>div]:bg-neon-purple" :
              flowData.risk_score >= 0.2 ? "[&>div]:bg-neon-cyan" :
              "[&>div]:bg-neon-green"
            }`}
            data-testid="progress-risk-score"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Safe</span>
            <span>Critical</span>
          </div>
        </div>

        {anomalies.length > 0 && (
          <div className="p-3 rounded-md border border-neon-red/30 bg-neon-red/5 space-y-2" data-testid="panel-anomalies">
            <div className="flex items-center gap-2 text-neon-red">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium uppercase tracking-wide">Detected Anomalies</span>
            </div>
            <ul className="space-y-1">
              {anomalies.map((anomaly, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-neon-red/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-neon-red" />
                  {anomaly}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground uppercase tracking-wide">
            <Network className="w-4 h-4" />
            Network Details
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-md bg-secondary/20 space-y-1">
              <div className="flex items-center gap-2">
                <Server className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Source</span>
              </div>
              <p className="text-sm font-mono" data-testid="text-src-ip">{flowData.src_ip}</p>
              <p className="text-xs text-muted-foreground">Port: <span className="font-mono">{flowData.src_port}</span></p>
            </div>
            <div className="p-3 rounded-md bg-secondary/20 space-y-1">
              <div className="flex items-center gap-2">
                <Globe className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Destination</span>
              </div>
              <p className="text-sm font-mono" data-testid="text-dst-ip">{flowData.dst_ip}</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Port:</span>
                <span className={`text-xs font-mono font-medium ${portRisk.color}`} data-testid="text-dst-port">
                  {flowData.dst_port}
                </span>
                {(portRisk.level === "suspicious" || portRisk.level === "high-risk") && (
                  <Badge variant="outline" className={`text-xs px-1 py-0 ${portRisk.level === "suspicious" ? "border-neon-red/50 text-neon-red" : "border-neon-yellow/50 text-neon-yellow"}`}>
                    {portRisk.label}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-md bg-secondary/20 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Wifi className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Protocol</span>
            </div>
            <p className="text-sm font-mono font-medium" data-testid="text-protocol">{flowData.protocol}</p>
          </div>
          <div className={`p-3 rounded-md text-center ${packetInfo.isAnomaly ? "bg-neon-red/10 border border-neon-red/30" : "bg-secondary/20"}`}>
            <div className="flex items-center justify-center gap-1 mb-1">
              <Package className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Packet Size</span>
            </div>
            <p className={`text-sm font-mono font-medium ${packetInfo.color}`} data-testid="text-packet-size">
              {flowData.packet_size} bytes
            </p>
            <p className={`text-xs ${packetInfo.color}`} data-testid="text-packet-size-category">{packetInfo.category}</p>
          </div>
          <div className={`p-3 rounded-md text-center ${durationInfo.isAnomaly ? "bg-neon-red/10 border border-neon-red/30" : "bg-secondary/20"}`}>
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Duration</span>
            </div>
            <p className={`text-sm font-mono font-medium ${durationInfo.color}`} data-testid="text-duration">
              {flowData.duration?.toFixed(2)}s
            </p>
            <p className={`text-xs ${durationInfo.color}`} data-testid="text-duration-category">{durationInfo.category}</p>
          </div>
        </div>
        
        <div className="pt-4 border-t border-border/30">
          <p className="text-center text-sm text-muted-foreground uppercase tracking-wide">
            RL Agent Recommendation: 
            <span className={`ml-2 font-semibold ${flowData.rl_action === 1 ? "text-neon-red" : "text-neon-cyan"}`}>
              {flowData.rl_action === 1 ? "BLOCK" : "IGNORE"}
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

interface ActionButtonsProps {
  onAction: (action: number) => void;
  isSubmitting: boolean;
  hasFlow: boolean;
  hasResult: boolean;
  timerExpired: boolean;
}

function ActionButtons({ onAction, isSubmitting, hasFlow, hasResult, timerExpired }: ActionButtonsProps) {
  const disabled = isSubmitting || !hasFlow || hasResult || timerExpired;
  
  return (
    <div className="space-y-4">
      <p className="text-center text-lg font-medium uppercase tracking-wide text-muted-foreground">
        What action should the SOC analyst take?
      </p>
      <div className="grid grid-cols-2 gap-4">
        <Button
          size="lg"
          variant="outline"
          onClick={() => onAction(0)}
          disabled={disabled}
          className={`
            h-16 text-lg font-bold uppercase tracking-wide
            bg-neon-blue/10 border-2 border-neon-blue/50 text-neon-blue
            transition-all duration-200
            ${!disabled && "hover:bg-neon-blue/20 hover:border-neon-blue hover:scale-[1.02]"}
            ${disabled && "opacity-50"}
          `}
          data-testid="button-action-ignore"
        >
          <Shield className="w-6 h-6 mr-2" />
          IGNORE
        </Button>
        <Button
          size="lg"
          variant="destructive"
          onClick={() => onAction(1)}
          disabled={disabled}
          className={`
            h-16 text-lg font-bold uppercase tracking-wide
            bg-neon-red/10 border-2 border-neon-red/50 text-neon-red
            transition-all duration-200
            ${!disabled && "hover:bg-neon-red/20 hover:border-neon-red hover:scale-[1.02]"}
            ${disabled && "opacity-50"}
          `}
          data-testid="button-action-block"
        >
          <XCircle className="w-6 h-6 mr-2" />
          BLOCK
        </Button>
      </div>
    </div>
  );
}

interface FeedbackPanelProps {
  result: DecisionResult | null;
  userAction: number | null;
  rlAction: number | null;
  trueLabel: number | null;
}

function FeedbackPanel({ result, userAction, rlAction, trueLabel }: FeedbackPanelProps) {
  if (!result || userAction === null) return null;

  const isCorrect = result.reward > 0;
  const userActionText = userAction === 1 ? "Block" : "Ignore";
  const rlActionText = rlAction === 1 ? "Block" : "Ignore";
  const matchesAgent = userAction === rlAction;

  let feedbackMessage = "";
  if (isCorrect) {
    if (userAction === 0 && trueLabel === 0) {
      feedbackMessage = "Perfect! You correctly ignored normal traffic.";
    } else if (userAction === 1 && trueLabel === 1) {
      feedbackMessage = "Excellent! You successfully blocked an attack.";
    }
  } else {
    if (userAction === 0 && trueLabel === 1) {
      feedbackMessage = "Wrong! You ignored an attack. Security breach!";
    } else if (userAction === 1 && trueLabel === 0) {
      feedbackMessage = "Incorrect. You blocked normal traffic, disrupting users.";
    }
  }

  return (
    <Card 
      className={`transition-all duration-300 ${
        isCorrect 
          ? "neon-border-gradient border-neon-green/50 neon-glow-green" 
          : "border-2 border-neon-red/50 neon-glow-red"
      }`}
      data-testid={isCorrect ? "panel-feedback-correct" : "panel-feedback-incorrect"}
    >
      <CardHeader className="pb-2">
        <CardTitle className={`flex items-center gap-2 text-lg ${isCorrect ? "neon-text-green" : "neon-text-red"}`}>
          {isCorrect ? (
            <>
              <CheckCircle2 className="w-6 h-6" />
              Correct Decision
            </>
          ) : (
            <>
              <AlertTriangle className="w-6 h-6" />
              Incorrect Decision
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-lg">
          {feedbackMessage} 
          <span className={`font-bold ml-2 ${result.reward > 0 ? "neon-text-green" : "neon-text-red"}`}>
            {result.reward > 0 ? "+" : ""}{result.reward} points!
          </span>
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 pt-2">
          <div className="flex-1 p-3 rounded-md bg-secondary/30">
            <p className="text-sm text-muted-foreground">Your action</p>
            <p className="font-semibold" data-testid="text-user-action">{userActionText}</p>
          </div>
          <div className="flex-1 p-3 rounded-md bg-secondary/30">
            <p className="text-sm text-muted-foreground">RL agent recommends</p>
            <p className="font-semibold" data-testid="text-rl-recommendation">{rlActionText}</p>
          </div>
          <div className="flex items-center">
            <Badge 
              variant={matchesAgent ? "default" : "secondary"}
              className={matchesAgent 
                ? "bg-neon-green/20 border border-neon-green/50 text-neon-green" 
                : "bg-neon-yellow/20 border border-neon-yellow/50 text-neon-yellow"
              }
              data-testid="badge-agent-match"
            >
              {matchesAgent ? "Matches Agent" : "Different from Agent"}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface SessionStatsProps {
  stats: {
    total_score: number;
    correct: number;
    total_flows: number;
    accuracy: number;
  };
}

function SessionStats({ stats }: SessionStatsProps) {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold uppercase tracking-wide">
        <Star className="w-5 h-5 text-neon-yellow" />
        Session Stats
      </h2>
      <div className="grid grid-cols-2 gap-4">
        <Card className="neon-border-gradient text-center p-4">
          <p className="text-sm text-muted-foreground uppercase tracking-wide mb-2">Total Score</p>
          <p 
            className={`text-3xl font-bold ${stats.total_score >= 0 ? "neon-text-green" : "neon-text-red"}`}
            data-testid="text-stat-score"
          >
            {stats.total_score}
          </p>
        </Card>
        <Card className="neon-border-gradient text-center p-4">
          <p className="text-sm text-muted-foreground uppercase tracking-wide mb-2">Correct</p>
          <p className="text-3xl font-bold neon-text-cyan" data-testid="text-stat-correct">
            {stats.correct}
          </p>
        </Card>
        <Card className="neon-border-gradient text-center p-4">
          <p className="text-sm text-muted-foreground uppercase tracking-wide mb-2">Total Flows</p>
          <p className="text-3xl font-bold text-foreground" data-testid="text-stat-flows">
            {stats.total_flows}
          </p>
        </Card>
        <Card className="neon-border-gradient text-center p-4">
          <p className="text-sm text-muted-foreground uppercase tracking-wide mb-2">Accuracy</p>
          <p className="text-3xl font-bold neon-text-purple" data-testid="text-stat-accuracy">
            {Math.round(stats.accuracy * 100)}%
          </p>
        </Card>
      </div>
    </div>
  );
}

export default function GamePage() {
  const [currentFlow, setCurrentFlow] = useState<FlowData | null>(null);
  const [lastResult, setLastResult] = useState<DecisionResult | null>(null);
  const [lastUserAction, setLastUserAction] = useState<number | null>(null);
  const [lastFlowTrueLabel, setLastFlowTrueLabel] = useState<number | null>(null);
  const [lastFlowRlAction, setLastFlowRlAction] = useState<number | null>(null);
  const [stats, setStats] = useState({
    total_score: 0,
    correct: 0,
    total_flows: 0,
    accuracy: 0,
  });
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasAutoSubmittedRef = useRef(false);
  const isSubmittingRef = useRef(false);

  const { isLoading: isLoadingFlow, refetch: refetchFlow } = useQuery<FlowData>({
    queryKey: ["/api/next-flow"],
    enabled: false,
  });

  const { data: serverDifficulty } = useQuery<{ difficulty: Difficulty }>({
    queryKey: ["/api/difficulty"],
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (serverDifficulty?.difficulty && serverDifficulty.difficulty !== difficulty) {
      setDifficulty(serverDifficulty.difficulty);
    }
  }, [serverDifficulty, difficulty]);

  const difficultyMutation = useMutation({
    mutationFn: async (newDifficulty: Difficulty) => {
      const response = await apiRequest("POST", "/api/difficulty", { difficulty: newDifficulty });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/difficulty"] });
    },
  });

  const handleDifficultyChange = useCallback((newDifficulty: Difficulty) => {
    setDifficulty(newDifficulty);
    difficultyMutation.mutate(newDifficulty);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setTimerActive(false);
    setTimeRemaining(0);
  }, [difficultyMutation]);

  const loadNewFlow = useCallback(async () => {
    if (isSubmittingRef.current) {
      return;
    }
    setLastResult(null);
    setLastUserAction(null);
    setLastFlowTrueLabel(null);
    setLastFlowRlAction(null);
    hasAutoSubmittedRef.current = false;
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setTimerActive(false);
    
    const result = await refetchFlow();
    if (result.data) {
      setCurrentFlow(result.data);
      const timeLimit = difficultyMultipliers[difficulty].timeLimit;
      if (timeLimit) {
        setTimeRemaining(timeLimit);
        setTimerActive(true);
      }
    }
  }, [refetchFlow, difficulty]);

  const submitMutation = useMutation({
    mutationFn: async (userAction: number) => {
      if (!currentFlow) throw new Error("No flow loaded");
      isSubmittingRef.current = true;
      const response = await apiRequest("POST", "/api/submit-decision", {
        flow_id: currentFlow.flow_id,
        user_action: userAction,
      });
      return response.json() as Promise<DecisionResult>;
    },
    onSuccess: (data, userAction) => {
      isSubmittingRef.current = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setTimerActive(false);
      setLastResult(data);
      setLastUserAction(userAction);
      setStats({
        total_score: data.total_score,
        correct: data.correct,
        total_flows: data.total_flows,
        accuracy: data.accuracy,
      });
    },
    onError: () => {
      isSubmittingRef.current = false;
    },
  });

  const handleAction = useCallback((action: number) => {
    if (currentFlow) {
      setLastFlowTrueLabel(currentFlow.true_label);
      setLastFlowRlAction(currentFlow.rl_action);
    }
    submitMutation.mutate(action);
  }, [submitMutation, currentFlow]);

  useEffect(() => {
    if (timerActive && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            if (timerRef.current) {
              clearInterval(timerRef.current);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timerActive]);

  useEffect(() => {
    if (timerActive && timeRemaining === 0 && currentFlow && !lastResult && !hasAutoSubmittedRef.current && !submitMutation.isPending) {
      hasAutoSubmittedRef.current = true;
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setTimerActive(false);
      setLastFlowTrueLabel(currentFlow.true_label);
      setLastFlowRlAction(currentFlow.rl_action);
      const randomAction = Math.round(Math.random());
      submitMutation.mutate(randomAction);
    }
  }, [timeRemaining, timerActive, currentFlow, lastResult, submitMutation]);

  return (
    <div className="min-h-screen bg-background scanline-overlay">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <DifficultySelector 
          difficulty={difficulty}
          onDifficultyChange={handleDifficultyChange}
          disabled={isLoadingFlow || submitMutation.isPending || difficultyMutation.isPending}
        />
        
        <TimerDisplay 
          timeLimit={difficultyMultipliers[difficulty].timeLimit}
          timeRemaining={timeRemaining}
          isActive={timerActive && !lastResult}
        />
        
        <FlowAnalyzer flowData={currentFlow} isLoading={isLoadingFlow} />
        
        <ActionButtons 
          onAction={handleAction}
          isSubmitting={submitMutation.isPending}
          hasFlow={!!currentFlow}
          hasResult={!!lastResult}
          timerExpired={timerActive && timeRemaining === 0}
        />
        
        <Button
          size="lg"
          onClick={loadNewFlow}
          disabled={isLoadingFlow || submitMutation.isPending}
          className={`
            w-full h-14 text-lg font-bold uppercase tracking-wide
            bg-gradient-to-r from-neon-cyan/20 via-neon-purple/20 to-neon-blue/20
            border-2 border-neon-cyan/50
            neon-glow-cyan
            transition-all duration-300
            hover:from-neon-cyan/30 hover:via-neon-purple/30 hover:to-neon-blue/30
            hover:border-neon-cyan hover:scale-[1.01]
          `}
          data-testid="button-load-flow"
        >
          {isLoadingFlow ? (
            <>
              <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <Target className="w-5 h-5 mr-2" />
              Load New Flow
            </>
          )}
        </Button>
        
        <FeedbackPanel 
          result={lastResult}
          userAction={lastUserAction}
          rlAction={lastFlowRlAction}
          trueLabel={lastFlowTrueLabel}
        />
        
        <SessionStats stats={stats} />
      </main>
      
      <footer className="text-center py-6 text-muted-foreground text-sm border-t border-border/30">
        <p className="flex items-center justify-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Powered by XGBoost + PPO Reinforcement Learning
        </p>
      </footer>
    </div>
  );
}
