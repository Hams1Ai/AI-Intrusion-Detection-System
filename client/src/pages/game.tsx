import { useState, useCallback, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  History,
  Clock,
  Gauge,
  Timer
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import type { FlowData, DecisionResult, Decision, Difficulty, LeaderboardEntry } from "@shared/schema";
import { difficultyMultipliers } from "@shared/schema";
import { Trophy, Crown, Medal, User, Send } from "lucide-react";

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

  return (
    <Card className="neon-border-gradient neon-glow-cyan">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg uppercase tracking-wide">
          <Zap className="w-5 h-5 text-neon-cyan" />
          RL Interactive Analyzer
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
            
            <div className="space-y-2 text-center">
              <p className="text-sm text-muted-foreground uppercase tracking-wide">Risk Score</p>
              <p className="text-3xl font-bold neon-text-yellow" data-testid="text-risk-score">
                {flowData.risk_score.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
        
        {flowData.src_ip && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-border/30">
            <div className="p-2 rounded bg-secondary/20">
              <p className="text-xs text-muted-foreground">Source IP</p>
              <p className="text-sm font-mono" data-testid="text-src-ip">{flowData.src_ip}</p>
            </div>
            <div className="p-2 rounded bg-secondary/20">
              <p className="text-xs text-muted-foreground">Dest IP</p>
              <p className="text-sm font-mono" data-testid="text-dst-ip">{flowData.dst_ip}</p>
            </div>
            <div className="p-2 rounded bg-secondary/20">
              <p className="text-xs text-muted-foreground">Protocol</p>
              <p className="text-sm font-mono" data-testid="text-protocol">{flowData.protocol}</p>
            </div>
            <div className="p-2 rounded bg-secondary/20">
              <p className="text-xs text-muted-foreground">Dest Port</p>
              <p className="text-sm font-mono" data-testid="text-dst-port">{flowData.dst_port}</p>
            </div>
          </div>
        )}
        
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

interface DecisionHistoryProps {
  decisions: Decision[];
  isLoading: boolean;
}

function DecisionHistory({ decisions, isLoading }: DecisionHistoryProps) {
  if (isLoading) {
    return (
      <Card className="neon-border-gradient">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg uppercase tracking-wide">
            <History className="w-5 h-5 text-neon-purple" />
            Decision History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 text-neon-purple animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (decisions.length === 0) {
    return (
      <Card className="neon-border-gradient">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg uppercase tracking-wide">
            <History className="w-5 h-5 text-neon-purple" />
            Decision History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">No decisions yet. Start analyzing flows!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="neon-border-gradient">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg uppercase tracking-wide">
          <History className="w-5 h-5 text-neon-purple" />
          Decision History
          <Badge variant="secondary" className="ml-2">{decisions.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          <div className="space-y-2">
            {decisions.map((decision, index) => (
              <div 
                key={decision.id}
                className={`p-3 rounded-md space-y-2 ${
                  decision.isCorrect ? "bg-neon-green/5 border border-neon-green/20" : "bg-neon-red/5 border border-neon-red/20"
                }`}
                data-testid={`decision-history-item-${index}`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      decision.isCorrect ? "bg-neon-green/20" : "bg-neon-red/20"
                    }`}>
                      {decision.isCorrect ? (
                        <CheckCircle2 className="w-4 h-4 text-neon-green" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-neon-red" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        Flow #{decision.flowId.toString().padStart(5, '0')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        You: {decision.userAction === 1 ? "Block" : "Ignore"} | 
                        RL: {decision.rlAction === 1 ? "Block" : "Ignore"} |
                        Truth: {decision.trueLabel === 1 ? "Attack" : "Normal"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline"
                      className={decision.xgbLabel === "ATTACK" 
                        ? "border-neon-red/50 text-neon-red" 
                        : "border-neon-green/50 text-neon-green"
                      }
                      data-testid={`badge-xgb-${index}`}
                    >
                      {decision.xgbLabel}
                    </Badge>
                    <span 
                      className={`font-bold text-sm ${decision.reward > 0 ? "neon-text-green" : "neon-text-red"}`}
                      data-testid={`text-reward-${index}`}
                    >
                      {decision.reward > 0 ? "+" : ""}{decision.reward}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-1.5 rounded bg-secondary/20">
                    <span className="text-muted-foreground">Src: </span>
                    <span className="font-mono" data-testid={`text-src-${index}`}>{decision.srcIp}:{decision.srcPort}</span>
                  </div>
                  <div className="p-1.5 rounded bg-secondary/20">
                    <span className="text-muted-foreground">Dst: </span>
                    <span className="font-mono" data-testid={`text-dst-${index}`}>{decision.dstIp}:{decision.dstPort}</span>
                  </div>
                  <div className="p-1.5 rounded bg-secondary/20">
                    <span className="text-muted-foreground">Proto: </span>
                    <span className="font-mono" data-testid={`text-protocol-${index}`}>{decision.protocol}</span>
                  </div>
                  <div className="p-1.5 rounded bg-secondary/20">
                    <span className="text-muted-foreground">Risk: </span>
                    <span className="font-mono" data-testid={`text-risk-${index}`}>{decision.riskScore.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  isLoading: boolean;
  currentScore: number;
  onSubmitScore: () => void;
  canSubmit: boolean;
  totalFlows: number;
}

function Leaderboard({ entries, isLoading, currentScore, onSubmitScore, canSubmit, totalFlows }: LeaderboardProps) {
  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-neon-yellow" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="w-5 h-5 flex items-center justify-center text-sm text-muted-foreground">#{rank}</span>;
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case "easy": return "text-neon-green";
      case "normal": return "text-neon-cyan";
      case "hard": return "text-neon-yellow";
      case "expert": return "text-neon-red";
      default: return "text-foreground";
    }
  };

  return (
    <Card className="neon-border-gradient neon-glow-yellow">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-lg uppercase tracking-wide">
            <Trophy className="w-5 h-5 text-neon-yellow" />
            Leaderboard
          </div>
          {canSubmit && (
            <Button
              size="sm"
              variant="outline"
              onClick={onSubmitScore}
              className="bg-neon-yellow/10 border-neon-yellow/50 text-neon-yellow"
              data-testid="button-submit-score"
            >
              <Send className="w-4 h-4 mr-1" />
              Submit Score
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 text-neon-yellow animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <Trophy className="w-12 h-12 mx-auto text-neon-yellow/30" />
            <p className="text-muted-foreground">No high scores yet. Be the first!</p>
          </div>
        ) : (
          <ScrollArea className="h-72">
            <div className="space-y-2">
              {entries.map((entry, index) => (
                <div
                  key={entry.id}
                  className={`p-3 rounded-md flex items-center gap-3 ${
                    index === 0 ? "bg-neon-yellow/10 border border-neon-yellow/30" : "bg-secondary/20"
                  }`}
                  data-testid={`leaderboard-entry-${index}`}
                >
                  <div className="flex items-center justify-center w-8">
                    {getRankIcon(index + 1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-semibold truncate" data-testid={`text-player-name-${index}`}>
                        {entry.playerName}
                      </span>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getDifficultyColor(entry.difficulty)}`}
                        data-testid={`badge-difficulty-${index}`}
                      >
                        {entry.difficulty.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span>Accuracy: {Math.round(entry.accuracy * 100)}%</span>
                      <span>Flows: {entry.totalFlows}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p 
                      className={`text-xl font-bold ${entry.score >= 0 ? "neon-text-green" : "neon-text-red"}`}
                      data-testid={`text-score-${index}`}
                    >
                      {entry.score}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
        {totalFlows > 0 && (
          <div className="mt-4 pt-4 border-t border-border/30 text-center">
            <p className="text-sm text-muted-foreground">
              Your current score: <span className={currentScore >= 0 ? "neon-text-green" : "neon-text-red"} style={{fontWeight: 'bold'}}>{currentScore}</span>
              {entries.length > 0 && entries.length >= 10 && currentScore > entries[entries.length - 1].score && (
                <span className="ml-2 text-neon-yellow">Potential top 10!</span>
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface SubmitScoreDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (playerName: string) => void;
  isPending: boolean;
  currentScore: number;
  accuracy: number;
  difficulty: string;
}

function SubmitScoreDialog({ isOpen, onClose, onSubmit, isPending, currentScore, accuracy, difficulty }: SubmitScoreDialogProps) {
  const [playerName, setPlayerName] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setPlayerName("");
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (playerName.trim().length > 0) {
      onSubmit(playerName.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && playerName.trim().length > 0) {
      handleSubmit();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md neon-border-gradient">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 neon-text-yellow">
            <Trophy className="w-6 h-6" />
            Submit Your Score
          </DialogTitle>
          <DialogDescription>
            Enter your name to save your score to the leaderboard.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 rounded-md bg-secondary/30">
              <p className="text-xs text-muted-foreground uppercase">Score</p>
              <p className={`text-xl font-bold ${currentScore >= 0 ? "neon-text-green" : "neon-text-red"}`}>
                {currentScore}
              </p>
            </div>
            <div className="p-3 rounded-md bg-secondary/30">
              <p className="text-xs text-muted-foreground uppercase">Accuracy</p>
              <p className="text-xl font-bold neon-text-purple">
                {Math.round(accuracy * 100)}%
              </p>
            </div>
            <div className="p-3 rounded-md bg-secondary/30">
              <p className="text-xs text-muted-foreground uppercase">Difficulty</p>
              <p className={`text-xl font-bold ${
                difficulty === "easy" ? "text-neon-green" :
                difficulty === "normal" ? "text-neon-cyan" :
                difficulty === "hard" ? "text-neon-yellow" : "text-neon-red"
              }`}>
                {difficulty.toUpperCase()}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="playerName" className="text-sm font-medium">
              Player Name
            </label>
            <Input
              id="playerName"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter your name..."
              maxLength={50}
              className="bg-background"
              data-testid="input-player-name"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isPending} data-testid="button-cancel-submit">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || playerName.trim().length === 0}
            className="bg-neon-yellow/20 border border-neon-yellow/50 text-neon-yellow"
            data-testid="button-confirm-submit"
          >
            {isPending ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function GamePage() {
  const [currentFlow, setCurrentFlow] = useState<FlowData | null>(null);
  const [lastResult, setLastResult] = useState<DecisionResult | null>(null);
  const [lastUserAction, setLastUserAction] = useState<number | null>(null);
  const [stats, setStats] = useState({
    total_score: 0,
    correct: 0,
    total_flows: 0,
    accuracy: 0,
  });
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [timerActive, setTimerActive] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasAutoSubmittedRef = useRef(false);

  const { isLoading: isLoadingFlow, refetch: refetchFlow } = useQuery<FlowData>({
    queryKey: ["/api/next-flow"],
    enabled: false,
  });

  const { data: decisionHistory = [], isLoading: isLoadingHistory, refetch: refetchHistory } = useQuery<Decision[]>({
    queryKey: ["/api/decision-history"],
    enabled: true,
    refetchOnWindowFocus: false,
  });

  const { data: serverDifficulty } = useQuery<{ difficulty: Difficulty }>({
    queryKey: ["/api/difficulty"],
    refetchOnWindowFocus: false,
  });

  const { data: leaderboardEntries = [], isLoading: isLoadingLeaderboard, refetch: refetchLeaderboard } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/leaderboard"],
    refetchOnWindowFocus: false,
  });

  const submitScoreMutation = useMutation({
    mutationFn: async (playerName: string) => {
      const response = await apiRequest("POST", "/api/leaderboard", { playerName });
      return response.json();
    },
    onSuccess: () => {
      setShowSubmitDialog(false);
      refetchLeaderboard();
    },
  });

  const handleOpenSubmitDialog = useCallback(() => {
    setShowSubmitDialog(true);
  }, []);

  const handleCloseSubmitDialog = useCallback(() => {
    setShowSubmitDialog(false);
  }, []);

  const handleSubmitScore = useCallback((playerName: string) => {
    submitScoreMutation.mutate(playerName);
  }, [submitScoreMutation]);

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
    setLastResult(null);
    setLastUserAction(null);
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
      const response = await apiRequest("POST", "/api/submit-decision", {
        flow_id: currentFlow.flow_id,
        user_action: userAction,
      });
      return response.json() as Promise<DecisionResult>;
    },
    onSuccess: (data, userAction) => {
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
      refetchHistory();
    },
  });

  const handleAction = useCallback((action: number) => {
    submitMutation.mutate(action);
  }, [submitMutation]);

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
          disabled={isLoadingFlow}
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
          rlAction={currentFlow?.rl_action ?? null}
          trueLabel={currentFlow?.true_label ?? null}
        />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <SessionStats stats={stats} />
          <DecisionHistory decisions={decisionHistory} isLoading={isLoadingHistory} />
        </div>
        
        <Leaderboard
          entries={leaderboardEntries}
          isLoading={isLoadingLeaderboard}
          currentScore={stats.total_score}
          onSubmitScore={handleOpenSubmitDialog}
          canSubmit={stats.total_flows > 0 && lastResult !== null}
          totalFlows={stats.total_flows}
        />
      </main>
      
      <SubmitScoreDialog
        isOpen={showSubmitDialog}
        onClose={handleCloseSubmitDialog}
        onSubmit={handleSubmitScore}
        isPending={submitScoreMutation.isPending}
        currentScore={stats.total_score}
        accuracy={stats.accuracy}
        difficulty={difficulty}
      />
      
      <footer className="text-center py-6 text-muted-foreground text-sm border-t border-border/30">
        <p className="flex items-center justify-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Powered by XGBoost + PPO Reinforcement Learning
        </p>
      </footer>
    </div>
  );
}
