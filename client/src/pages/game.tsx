import { useState, useCallback, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Gauge
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { FlowData, DecisionResult } from "@shared/schema";

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

interface FlowAnalyzerProps {
  flowData: FlowData | null;
  isLoading: boolean;
}

function getRiskLevel(score: number): { level: string; color: string; bgColor: string; borderColor: string } {
  if (score >= 0.8) return { level: "CRITICAL", color: "text-neon-red", bgColor: "bg-neon-red/20", borderColor: "border-neon-red/50" };
  if (score >= 0.6) return { level: "HIGH", color: "text-neon-yellow", bgColor: "bg-neon-yellow/20", borderColor: "border-neon-yellow/50" };
  if (score >= 0.4) return { level: "MEDIUM", color: "text-neon-purple", bgColor: "bg-neon-purple/20", borderColor: "border-neon-purple/50" };
  if (score >= 0.2) return { level: "LOW", color: "text-neon-cyan", bgColor: "bg-neon-cyan/20", borderColor: "border-neon-cyan/50" };
  return { level: "MINIMAL", color: "text-neon-green", bgColor: "bg-neon-green/20", borderColor: "border-neon-green/50" };
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
}

function ActionButtons({ onAction, isSubmitting, hasFlow, hasResult }: ActionButtonsProps) {
  const disabled = isSubmitting || !hasFlow || hasResult;
  
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
  const isSubmittingRef = useRef(false);

  const flowMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/next-flow");
      if (!response.ok) {
        throw new Error("Failed to fetch flow");
      }
      return response.json() as Promise<FlowData>;
    },
    onSuccess: (data) => {
      setCurrentFlow(data);
    },
  });

  const loadNewFlow = useCallback(() => {
    if (isSubmittingRef.current) {
      return;
    }
    setLastResult(null);
    setLastUserAction(null);
    setLastFlowTrueLabel(null);
    setLastFlowRlAction(null);
    flowMutation.mutate();
  }, [flowMutation]);

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

  // Auto-load the first flow when the page opens
  useEffect(() => {
    loadNewFlow();
  }, []);

  return (
    <div className="min-h-screen bg-background scanline-overlay">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <FlowAnalyzer flowData={currentFlow} isLoading={flowMutation.isPending} />
        
        <ActionButtons 
          onAction={handleAction}
          isSubmitting={submitMutation.isPending}
          hasFlow={!!currentFlow}
          hasResult={!!lastResult}
        />
        
        <Button
          size="lg"
          onClick={loadNewFlow}
          disabled={flowMutation.isPending || submitMutation.isPending}
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
          {flowMutation.isPending ? (
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
