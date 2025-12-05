import { useMemo, useState } from "react";
import { Card, CardContent } from "./ui/card";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { calculateMomentum, calculateReactionScore } from "@/lib/momentum";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { CalendarDays, TrendingUp } from "lucide-react";
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
          const momentum = calculateMomentum(
            reactionScore,
            s.comments ?? 0,
            s.views ?? 0,
            createdAt
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

  return (
    <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-2 uppercase tracking-wider">
            <TrendingUp className="w-3.5 h-3.5" />
            Suggestion Journey
          </h3>
          <div className="flex items-center gap-4">
            {/* Legend */}
            <div className="hidden sm:flex items-center gap-3 text-[10px]">
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
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
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
                  return [
                    `${value} momentum`,
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
              <ReferenceLine y={25} stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <ReferenceLine y={50} stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <ReferenceLine y={75} stroke="hsl(var(--border))" strokeDasharray="3 3" />
              
              {filteredSuggestions.map((suggestion) => (
                <Line
                  key={suggestion.id}
                  type="monotone"
                  dataKey={suggestion.id}
                  stroke={getStatusColor(suggestion.status)}
                  strokeWidth={2}
                  dot={{ 
                    r: 3, 
                    fill: getStatusColor(suggestion.status),
                    strokeWidth: 0
                  }}
                  activeDot={{ 
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

        {/* Mobile legend */}
        <div className="flex sm:hidden items-center justify-center gap-4 mt-3 text-[10px]">
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
          {statusGroups.rejected > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "hsl(38 92% 50%)" }} />
              <span className="text-muted-foreground">Rejected</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
