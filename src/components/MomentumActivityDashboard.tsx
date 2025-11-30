import { MomentumDial } from "./MomentumDial";
import { Card, CardContent } from "./ui/card";
import type { MomentumLevel } from "@/lib/momentum";
import { TrendingUp, MessageSquare, ThumbsUp, CheckCircle2, XCircle, Clock, Target } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface MomentumStats {
  fresh: number;
  warming: number;
  heating: number;
  fire: number;
}

interface ActivityStats {
  total: number;
  open: number;
  inProgress: number;
  completed: number;
  declined: number;
  totalLikes: number;
  totalComments: number;
}

interface MomentumActivityDashboardProps {
  momentumStats: MomentumStats;
  activityStats: ActivityStats;
  selectedMomentum: MomentumLevel | null;
  onMomentumClick: (level: MomentumLevel) => void;
}

const MiniDonutChart = ({ 
  data, 
  colors, 
  centerValue, 
  centerLabel,
  size = "default"
}: { 
  data: { name: string; value: number }[]; 
  colors: string[]; 
  centerValue: string; 
  centerLabel: string;
  size?: "default" | "large" | "desktop";
}) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const dimensions = size === "desktop" ? "w-24 h-24" : size === "large" ? "w-28 h-28" : "w-20 h-20";
  const innerRadius = size === "desktop" ? 30 : size === "large" ? 35 : 25;
  const outerRadius = size === "desktop" ? 45 : size === "large" ? 52 : 38;
  
  if (total === 0) {
    return (
      <div className={`relative ${dimensions} flex items-center justify-center`}>
        <div className="w-full h-full rounded-full border-4 border-muted" />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-muted-foreground">—</span>
          <span className="text-[10px] text-muted-foreground">{centerLabel}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${dimensions}`}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
            dataKey="value"
            strokeWidth={0}
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-bold text-foreground ${size === "large" ? "text-base" : size === "desktop" ? "text-sm" : "text-sm"}`}>{centerValue}</span>
        <span className="text-[9px] text-muted-foreground leading-tight">{centerLabel}</span>
      </div>
    </div>
  );
};

export const MomentumActivityDashboard = ({
  momentumStats,
  activityStats,
  selectedMomentum,
  onMomentumClick,
}: MomentumActivityDashboardProps) => {
  // Calculate closure stats (Open vs Closed)
  const closedCount = activityStats.completed + activityStats.declined;
  const closureRate = activityStats.total > 0 
    ? Math.round((closedCount / activityStats.total) * 100) 
    : 0;
  
  const closureData = [
    { name: "Closed", value: closedCount },
    { name: "Open", value: activityStats.open + activityStats.inProgress },
  ];

  // Calculate adoption stats (Accepted vs Rejected from closed suggestions)
  const adoptionRate = closedCount > 0 
    ? Math.round((activityStats.completed / closedCount) * 100) 
    : 0;
  
  const adoptionData = [
    { name: "Accepted", value: activityStats.completed },
    { name: "Rejected", value: activityStats.declined },
  ];

  return (
    <Card className="border-border/40 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm overflow-hidden">
      <CardContent className="p-4 sm:p-6">
        {/* Mobile Layout: Stacked vertical sections */}
        <div className="flex flex-col gap-5 md:hidden">
          {/* Row 1: Momentum Breakdown - centered full width */}
          <div className="w-full">
            <h3 className="text-xs font-semibold text-muted-foreground mb-3 flex items-center justify-center gap-2 uppercase tracking-wider">
              <TrendingUp className="w-3.5 h-3.5" />
              Momentum
            </h3>
            <div className="flex items-center justify-center gap-4">
              {(["fresh", "warming", "heating", "fire"] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => onMomentumClick(level)}
                  className={`flex flex-col items-center gap-1.5 transition-all duration-200 ${
                    selectedMomentum && selectedMomentum !== level ? "opacity-40 scale-95" : "opacity-100"
                  } hover:opacity-100 hover:scale-105 cursor-pointer ${
                    selectedMomentum === level ? "ring-2 ring-offset-2 ring-offset-background rounded-full" : ""
                  }`}
                  style={{
                    ...(selectedMomentum === level && {
                      boxShadow: `0 0 20px hsl(var(--momentum-${level}) / 0.4)`
                    })
                  }}
                >
                  <MomentumDial level={level} score={momentumStats[level]} size="sm" />
                  <span className="text-[10px] text-muted-foreground capitalize">{level === "fire" ? "On Fire" : level}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Row 2: Pie Charts - bigger and centered */}
          <div className="flex justify-center gap-8">
            <div className="flex flex-col items-center gap-2">
              <MiniDonutChart
                data={closureData}
                colors={["hsl(142 71% 45%)", "hsl(200 70% 55%)"]}
                centerValue={`${closureRate}%`}
                centerLabel="Closed"
                size="large"
              />
              <div className="flex items-center gap-3 text-[10px]">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-status-closed" />
                  <span className="text-muted-foreground">{closedCount}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-status-open" />
                  <span className="text-muted-foreground">{activityStats.open + activityStats.inProgress}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center gap-2">
              <MiniDonutChart
                data={adoptionData}
                colors={["hsl(142 71% 45%)", "hsl(0 72% 51%)"]}
                centerValue={`${adoptionRate}%`}
                centerLabel="Adopted"
                size="large"
              />
              <div className="flex items-center gap-3 text-[10px]">
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5 text-status-accepted" />
                  <span className="text-muted-foreground">{activityStats.completed}</span>
                </div>
                <div className="flex items-center gap-1">
                  <XCircle className="w-2.5 h-2.5 text-status-rejected" />
                  <span className="text-muted-foreground">{activityStats.declined}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Quick Stats - 4 in one row */}
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-muted/30 rounded-lg p-2 text-center">
              <Target className="w-3 h-3 text-muted-foreground mx-auto mb-0.5" />
              <div className="text-base font-bold text-foreground">{activityStats.total}</div>
              <div className="text-[8px] text-muted-foreground uppercase tracking-wider">Total</div>
            </div>
            <div className="bg-muted/30 rounded-lg p-2 text-center">
              <Clock className="w-3 h-3 text-muted-foreground mx-auto mb-0.5" />
              <div className="text-base font-bold text-foreground">{activityStats.inProgress}</div>
              <div className="text-[8px] text-muted-foreground uppercase tracking-wider">Progress</div>
            </div>
            <div className="bg-muted/30 rounded-lg p-2 text-center">
              <ThumbsUp className="w-3 h-3 text-muted-foreground mx-auto mb-0.5" />
              <div className="text-base font-bold text-foreground">{activityStats.totalLikes}</div>
              <div className="text-[8px] text-muted-foreground uppercase tracking-wider">Likes</div>
            </div>
            <div className="bg-muted/30 rounded-lg p-2 text-center">
              <MessageSquare className="w-3 h-3 text-muted-foreground mx-auto mb-0.5" />
              <div className="text-base font-bold text-foreground">{activityStats.totalComments}</div>
              <div className="text-[8px] text-muted-foreground uppercase tracking-wider">Comments</div>
            </div>
          </div>
        </div>

        {/* Desktop Layout: 3 rows - momentum+pies, stats, journey */}
        <div className="hidden md:flex md:flex-col gap-6">
          {/* Row 1: Momentum + Pie Charts */}
          <div className="flex items-start justify-between gap-6">
            {/* Momentum Breakdown */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-2 uppercase tracking-wider">
                <TrendingUp className="w-3.5 h-3.5" />
                Momentum
              </h3>
              <div className="flex flex-wrap items-center justify-start gap-4 sm:gap-6">
                {(["fresh", "warming", "heating", "fire"] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => onMomentumClick(level)}
                    className={`flex flex-col items-center gap-1.5 transition-all duration-200 ${
                      selectedMomentum && selectedMomentum !== level ? "opacity-40 scale-95" : "opacity-100"
                    } hover:opacity-100 hover:scale-105 cursor-pointer ${
                      selectedMomentum === level ? "ring-2 ring-offset-2 ring-offset-background rounded-full" : ""
                    }`}
                    style={{
                      ...(selectedMomentum === level && {
                        boxShadow: `0 0 20px hsl(var(--momentum-${level}) / 0.4)`
                      })
                    }}
                  >
                    <MomentumDial level={level} score={momentumStats[level]} size="sm" />
                    <span className="text-[10px] text-muted-foreground capitalize">{level === "fire" ? "On Fire" : level}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Pie Charts */}
            <div className="flex gap-4 items-start">
              <div className="flex flex-col items-center gap-2">
                <MiniDonutChart
                  data={closureData}
                  colors={["hsl(142 71% 45%)", "hsl(200 70% 55%)"]}
                  centerValue={`${closureRate}%`}
                  centerLabel="Closed"
                  size="desktop"
                />
                <div className="flex items-center gap-3 text-[10px]">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-status-closed" />
                    <span className="text-muted-foreground">{closedCount}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-status-open" />
                    <span className="text-muted-foreground">{activityStats.open + activityStats.inProgress}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center gap-2">
                <MiniDonutChart
                  data={adoptionData}
                  colors={["hsl(142 71% 45%)", "hsl(0 72% 51%)"]}
                  centerValue={`${adoptionRate}%`}
                  centerLabel="Adopted"
                  size="desktop"
                />
                <div className="flex items-center gap-3 text-[10px]">
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5 text-status-accepted" />
                    <span className="text-muted-foreground">{activityStats.completed}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <XCircle className="w-2.5 h-2.5 text-status-rejected" />
                    <span className="text-muted-foreground">{activityStats.declined}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Quick Stats - 4 in one row */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-muted/30 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Target className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div className="text-xl font-bold text-foreground">{activityStats.total}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</div>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div className="text-xl font-bold text-foreground">{activityStats.inProgress}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">In Progress</div>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <ThumbsUp className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div className="text-xl font-bold text-foreground">{activityStats.totalLikes}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Likes</div>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div className="text-xl font-bold text-foreground">{activityStats.totalComments}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Comments</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
