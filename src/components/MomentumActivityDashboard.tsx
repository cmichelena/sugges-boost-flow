import { MomentumDial } from "./MomentumDial";
import { Card, CardContent } from "./ui/card";
import type { MomentumLevel } from "@/lib/momentum";
import { TrendingUp, MessageSquare, ThumbsUp } from "lucide-react";

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
  totalLikes: number;
  totalComments: number;
}

interface MomentumActivityDashboardProps {
  momentumStats: MomentumStats;
  activityStats: ActivityStats;
  selectedMomentum: MomentumLevel | null;
  onMomentumClick: (level: MomentumLevel) => void;
}

export const MomentumActivityDashboard = ({
  momentumStats,
  activityStats,
  selectedMomentum,
  onMomentumClick,
}: MomentumActivityDashboardProps) => {
  return (
    <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
      <CardContent className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Momentum Breakdown */}
          <div className="lg:col-span-2">
            <h3 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Momentum Breakdown
            </h3>
            <div className="flex flex-wrap items-center justify-start gap-6 sm:gap-8">
              <button
                onClick={() => onMomentumClick("fresh")}
                className={`flex flex-col items-center gap-2 transition-opacity ${
                  selectedMomentum && selectedMomentum !== "fresh" ? "opacity-40" : "opacity-100"
                } hover:opacity-100 cursor-pointer ${
                  selectedMomentum === "fresh" ? "ring-2 ring-momentum-fresh ring-offset-2 ring-offset-background rounded-full" : ""
                }`}
              >
                <MomentumDial level="fresh" score={momentumStats.fresh} size="sm" />
                <span className="text-xs text-muted-foreground">Fresh</span>
              </button>
              
              <button
                onClick={() => onMomentumClick("warming")}
                className={`flex flex-col items-center gap-2 transition-opacity ${
                  selectedMomentum && selectedMomentum !== "warming" ? "opacity-40" : "opacity-100"
                } hover:opacity-100 cursor-pointer ${
                  selectedMomentum === "warming" ? "ring-2 ring-momentum-warming ring-offset-2 ring-offset-background rounded-full" : ""
                }`}
              >
                <MomentumDial level="warming" score={momentumStats.warming} size="sm" />
                <span className="text-xs text-muted-foreground">Warming</span>
              </button>
              
              <button
                onClick={() => onMomentumClick("heating")}
                className={`flex flex-col items-center gap-2 transition-opacity ${
                  selectedMomentum && selectedMomentum !== "heating" ? "opacity-40" : "opacity-100"
                } hover:opacity-100 cursor-pointer ${
                  selectedMomentum === "heating" ? "ring-2 ring-momentum-heating ring-offset-2 ring-offset-background rounded-full" : ""
                }`}
              >
                <MomentumDial level="heating" score={momentumStats.heating} size="sm" />
                <span className="text-xs text-muted-foreground">Heating</span>
              </button>
              
              <button
                onClick={() => onMomentumClick("fire")}
                className={`flex flex-col items-center gap-2 transition-opacity ${
                  selectedMomentum && selectedMomentum !== "fire" ? "opacity-40" : "opacity-100"
                } hover:opacity-100 cursor-pointer ${
                  selectedMomentum === "fire" ? "ring-2 ring-momentum-fire ring-offset-2 ring-offset-background rounded-full" : ""
                }`}
              >
                <MomentumDial level="fire" score={momentumStats.fire} size="sm" />
                <span className="text-xs text-muted-foreground">On Fire</span>
              </button>
            </div>
          </div>

          {/* Activity Stats */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Status Overview</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="text-lg font-semibold text-foreground">{activityStats.total}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Open</span>
                  <span className="text-sm font-medium text-foreground">{activityStats.open}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">In Progress</span>
                  <span className="text-sm font-medium text-foreground">{activityStats.inProgress}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Completed</span>
                  <span className="text-sm font-medium text-foreground">{activityStats.completed}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border/40">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Engagement</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <ThumbsUp className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Likes</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">{activityStats.totalLikes}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Comments</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">{activityStats.totalComments}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
