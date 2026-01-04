import { useMemo, useState } from "react";
import { Card, CardContent } from "./ui/card";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea } from "recharts";
import { calculateMomentum, calculateReactionScore, getMomentumLevel } from "@/lib/momentum";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { CalendarDays, TrendingUp, Layers, Palette } from "lucide-react";
import { Button } from "./ui/button";

interface ReactionCounts {
  champion: number;
  support: number;
  neutral: number;
  concerns: number;
}

interface Suggestion {
  id: string;
  title: string;
  status: string;
  created_at: string;
  reactions?: ReactionCounts;
  comments: number;
  views: number;
}

interface SuggestionJourneyChartProps {
  suggestions: Suggestion[];
}

type TimeRange = "week" | "month";
type ChartStyle = "zones" | "gradient";

// Momentum level colors
const MOMENTUM_COLORS = {
  fresh: "hsl(200 70% 55%)",      // Blue
  warming: "hsl(45 93% 47%)",     // Yellow/Gold
  heating: "hsl(25 95% 53%)",     // Orange
  fire: "hsl(0 84% 60%)",         // Red
};

// Get color based on momentum value
const getMomentumColor = (momentum: number) => {
  if (momentum < 50) return MOMENTUM_COLORS.fresh;
  if (momentum < 150) return MOMENTUM_COLORS.warming;
  if (momentum < 300) return MOMENTUM_COLORS.heating;
  return MOMENTUM_COLORS.fire;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "Completed":
      return "hsl(142 71% 45%)"; // Green - accepted
    case "Declined":
      return "hsl(38 92% 50%)"; // Amber - rejected
    default:
      return "hsl(200 70% 55%)"; // Blue - active
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "Completed":
      return "Accepted";
    case "Declined":
      return "Rejected";
    default:
      return "Active";
  }
};

export const SuggestionJourneyChart = ({ suggestions }: SuggestionJourneyChartProps) => {
  const [timeRange, setTimeRange] = useState<TimeRange>("week");
  const [chartStyle, setChartStyle] = useState<ChartStyle>("zones");
  
  const chartData = useMemo(() => {
    const now = new Date();
    const interval = timeRange === "week" 
      ? { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) }
      : { start: startOfMonth(now), end: endOfMonth(now) };
    
    const days = eachDayOfInterval(interval);
    
    // Include all suggestions that were created before or during the time range
    // (i.e., suggestions that exist during this period)
    const relevantSuggestions = suggestions.filter(s => {
      const createdAt = new Date(s.created_at);
      return createdAt <= interval.end;
    });

    // Create data points for each day
    const data = days.map(day => {
      const dayData: Record<string, any> = {
        date: format(day, timeRange === "week" ? "EEE" : "d"),
        fullDate: format(day, "MMM d"),
      };

      // Add momentum for each suggestion that exists on this day
      relevantSuggestions.forEach(s => {
        const createdAt = new Date(s.created_at);
        // Suggestion appears from its creation date onwards
        if (createdAt <= day) {
          const reactionScore = calculateReactionScore(
            s.reactions?.champion ?? 0,
            s.reactions?.support ?? 0,
            s.reactions?.neutral ?? 0,
            s.reactions?.concerns ?? 0
          );
          // Pass the current chart day as reference date to show progression over time
          const momentum = calculateMomentum(
            reactionScore,
            s.comments ?? 0,
            s.views ?? 0,
            createdAt,
            day
          );
          dayData[s.id] = Math.round(momentum);
        }
      });

      return dayData;
    });

    return { data, suggestions: relevantSuggestions };
  }, [suggestions, timeRange]);

  const { data, suggestions: filteredSuggestions } = chartData;

  // Group suggestions by status for legend
  const statusGroups = useMemo(() => {
    const groups = { active: 0, accepted: 0, rejected: 0 };
    filteredSuggestions.forEach(s => {
      if (s.status === "Completed") groups.accepted++;
      else if (s.status === "Declined") groups.rejected++;
      else groups.active++;
    });
    return groups;
  }, [filteredSuggestions]);

  // For gradient mode: compute colors for each suggestion's current (latest) momentum
  // Must be called before any early returns to maintain hook order
  const suggestionColors = useMemo(() => {
    const colors: Record<string, string> = {};
    if (chartStyle === "gradient" && data.length > 0) {
      const latestData = data[data.length - 1];
      filteredSuggestions.forEach(s => {
        const momentum = latestData[s.id] ?? 0;
        colors[s.id] = getMomentumColor(momentum);
      });
    }
    return colors;
  }, [chartStyle, data, filteredSuggestions]);

  if (filteredSuggestions.length === 0) {
    return (
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-2 uppercase tracking-wider">
              <TrendingUp className="w-3.5 h-3.5" />
              Suggestion Journey
            </h3>
            <div className="flex gap-1">
              <Button
                variant={timeRange === "week" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setTimeRange("week")}
              >
                Week
              </Button>
              <Button
                variant={timeRange === "month" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setTimeRange("month")}
              >
                Month
              </Button>
            </div>
          </div>
          <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
            <CalendarDays className="w-4 h-4 mr-2" />
            No suggestions this {timeRange}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Custom dot component for gradient mode
  const GradientDot = (props: any) => {
    const { cx, cy, payload, dataKey } = props;
    if (cx === undefined || cy === undefined) return null;
    const momentum = payload[dataKey] ?? 0;
    const color = getMomentumColor(momentum);
    return (
      <circle
        cx={cx}
        cy={cy}
        r={3}
        fill={color}
        strokeWidth={0}
      />
    );
  };

  const GradientActiveDot = (props: any) => {
    const { cx, cy, payload, dataKey } = props;
    if (cx === undefined || cy === undefined) return null;
    const momentum = payload[dataKey] ?? 0;
    const color = getMomentumColor(momentum);
    return (
      <circle
        cx={cx}
        cy={cy}
        r={5}
        fill={color}
        stroke="hsl(var(--background))"
        strokeWidth={2}
      />
    );
  };

  return (
    <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-2 uppercase tracking-wider">
            <TrendingUp className="w-3.5 h-3.5" />
            Suggestion Journey
          </h3>
          <div className="flex items-center gap-2">
            {/* Chart style toggle */}
            <div className="hidden sm:flex items-center gap-1 mr-2">
              <Button
                variant={chartStyle === "zones" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setChartStyle("zones")}
                title="Show momentum zones"
              >
                <Layers className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant={chartStyle === "gradient" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setChartStyle("gradient")}
                title="Show gradient lines"
              >
                <Palette className="w-3.5 h-3.5" />
              </Button>
            </div>
            {/* Legend - show momentum levels in zones mode, status in gradient mode */}
            <div className="hidden sm:flex items-center gap-3 text-[10px]">
              {chartStyle === "zones" ? (
                <>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: MOMENTUM_COLORS.fresh }} />
                    <span className="text-muted-foreground">Fresh</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: MOMENTUM_COLORS.warming }} />
                    <span className="text-muted-foreground">Warming</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: MOMENTUM_COLORS.heating }} />
                    <span className="text-muted-foreground">Heating</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: MOMENTUM_COLORS.fire }} />
                    <span className="text-muted-foreground">Fire</span>
                  </div>
                </>
              ) : (
                <>
                  {statusGroups.active > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "hsl(200 70% 55%)" }} />
                      <span className="text-muted-foreground">Active ({statusGroups.active})</span>
                    </div>
                  )}
                  {statusGroups.accepted > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "hsl(142 71% 45%)" }} />
                      <span className="text-muted-foreground">Accepted ({statusGroups.accepted})</span>
                    </div>
                  )}
                  {statusGroups.rejected > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "hsl(38 92% 50%)" }} />
                      <span className="text-muted-foreground">Rejected ({statusGroups.rejected})</span>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="flex gap-1">
              <Button
                variant={timeRange === "week" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setTimeRange("week")}
              >
                Week
              </Button>
              <Button
                variant={timeRange === "month" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setTimeRange("month")}
              >
                Month
              </Button>
            </div>
          </div>
        </div>

        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              {/* Background zones for zones mode */}
              {chartStyle === "zones" && (
                <>
                  <ReferenceArea y1={0} y2={50} fill={MOMENTUM_COLORS.fresh} fillOpacity={0.1} />
                  <ReferenceArea y1={50} y2={150} fill={MOMENTUM_COLORS.warming} fillOpacity={0.1} />
                  <ReferenceArea y1={150} y2={300} fill={MOMENTUM_COLORS.heating} fillOpacity={0.1} />
                  <ReferenceArea y1={300} y2={400} fill={MOMENTUM_COLORS.fire} fillOpacity={0.1} />
                </>
              )}
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                domain={[0, 'auto']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                formatter={(value: number, name: string) => {
                  const suggestion = filteredSuggestions.find(s => s.id === name);
                  const level = getMomentumLevel(value);
                  return [
                    <span key="value" style={{ color: getMomentumColor(value) }}>
                      {value} momentum ({level})
                    </span>,
                    suggestion ? `${suggestion.title.slice(0, 30)}${suggestion.title.length > 30 ? '...' : ''} (${getStatusLabel(suggestion.status)})` : name
                  ];
                }}
                labelFormatter={(label, payload) => {
                  if (payload && payload[0]) {
                    return payload[0].payload.fullDate;
                  }
                  return label;
                }}
              />
              {chartStyle === "zones" && (
                <>
                  <ReferenceLine y={50} stroke={MOMENTUM_COLORS.warming} strokeDasharray="3 3" strokeOpacity={0.5} />
                  <ReferenceLine y={150} stroke={MOMENTUM_COLORS.heating} strokeDasharray="3 3" strokeOpacity={0.5} />
                  <ReferenceLine y={300} stroke={MOMENTUM_COLORS.fire} strokeDasharray="3 3" strokeOpacity={0.5} />
                </>
              )}
              
              {filteredSuggestions.map((suggestion) => (
                <Line
                  key={suggestion.id}
                  type="monotone"
                  dataKey={suggestion.id}
                  stroke={chartStyle === "gradient" ? suggestionColors[suggestion.id] || MOMENTUM_COLORS.fresh : getStatusColor(suggestion.status)}
                  strokeWidth={2}
                  dot={chartStyle === "gradient" ? <GradientDot dataKey={suggestion.id} /> : { 
                    r: 3, 
                    fill: getStatusColor(suggestion.status),
                    strokeWidth: 0
                  }}
                  activeDot={chartStyle === "gradient" ? <GradientActiveDot dataKey={suggestion.id} /> : { 
                    r: 5, 
                    fill: getStatusColor(suggestion.status),
                    stroke: "hsl(var(--background))",
                    strokeWidth: 2
                  }}
                  connectNulls={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Mobile legend and style toggle */}
        <div className="flex sm:hidden items-center justify-between mt-3">
          <div className="flex items-center gap-1">
            <Button
              variant={chartStyle === "zones" ? "secondary" : "ghost"}
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setChartStyle("zones")}
            >
              <Layers className="w-3 h-3" />
            </Button>
            <Button
              variant={chartStyle === "gradient" ? "secondary" : "ghost"}
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setChartStyle("gradient")}
            >
              <Palette className="w-3 h-3" />
            </Button>
          </div>
          <div className="flex items-center gap-3 text-[10px]">
            {chartStyle === "zones" ? (
              <>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: MOMENTUM_COLORS.fresh }} />
                  <span className="text-muted-foreground">Fresh</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: MOMENTUM_COLORS.fire }} />
                  <span className="text-muted-foreground">Fire</span>
                </div>
              </>
            ) : (
              <>
                {statusGroups.active > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "hsl(200 70% 55%)" }} />
                    <span className="text-muted-foreground">Active</span>
                  </div>
                )}
                {statusGroups.accepted > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "hsl(142 71% 45%)" }} />
                    <span className="text-muted-foreground">Accepted</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
