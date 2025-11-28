import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Flame, ThumbsUp, Minus, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ReactionType = "champion" | "support" | "neutral" | "concerns";

interface ReactionCounts {
  champion: number;
  support: number;
  neutral: number;
  concerns: number;
}

interface ReactionButtonsProps {
  suggestionId: string;
  initialCounts?: ReactionCounts;
  userReaction?: ReactionType | null;
  compact?: boolean;
  onReactionChange?: (counts: ReactionCounts, userReaction: ReactionType | null) => void;
}

const reactionConfig: Record<ReactionType, { 
  icon: typeof Flame; 
  label: string; 
  weight: string;
  color: string;
  activeColor: string;
}> = {
  champion: { 
    icon: Flame, 
    label: "Champion", 
    weight: "+2",
    color: "text-muted-foreground hover:text-orange-500",
    activeColor: "text-orange-500 bg-orange-500/10"
  },
  support: { 
    icon: ThumbsUp, 
    label: "Support", 
    weight: "+1",
    color: "text-muted-foreground hover:text-emerald-500",
    activeColor: "text-emerald-500 bg-emerald-500/10"
  },
  neutral: { 
    icon: Minus, 
    label: "Neutral", 
    weight: "0",
    color: "text-muted-foreground hover:text-blue-500",
    activeColor: "text-blue-500 bg-blue-500/10"
  },
  concerns: { 
    icon: AlertTriangle, 
    label: "Concerns", 
    weight: "-1",
    color: "text-muted-foreground hover:text-amber-500",
    activeColor: "text-amber-500 bg-amber-500/10"
  },
};

export const ReactionButtons = ({
  suggestionId,
  initialCounts = { champion: 0, support: 0, neutral: 0, concerns: 0 },
  userReaction: initialUserReaction = null,
  compact = false,
  onReactionChange,
}: ReactionButtonsProps) => {
  const [counts, setCounts] = useState<ReactionCounts>(initialCounts);
  const [userReaction, setUserReaction] = useState<ReactionType | null>(initialUserReaction);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id || null);
    };
    getUser();
  }, []);

  useEffect(() => {
    setCounts(initialCounts);
    setUserReaction(initialUserReaction);
  }, [initialCounts, initialUserReaction]);

  const handleReaction = async (reactionType: ReactionType) => {
    if (!userId) {
      toast.error("Please sign in to react");
      return;
    }

    setLoading(true);

    try {
      const previousReaction = userReaction;
      const previousCounts = { ...counts };

      // Optimistic update
      const newCounts = { ...counts };
      
      if (previousReaction === reactionType) {
        // Removing reaction
        newCounts[reactionType] = Math.max(0, newCounts[reactionType] - 1);
        setUserReaction(null);
        setCounts(newCounts);

        // Delete from database
        const { error } = await supabase
          .from("reactions")
          .delete()
          .eq("user_id", userId)
          .eq("suggestion_id", suggestionId);

        if (error) throw error;
        onReactionChange?.(newCounts, null);
      } else {
        // Adding/changing reaction
        if (previousReaction) {
          newCounts[previousReaction] = Math.max(0, newCounts[previousReaction] - 1);
        }
        newCounts[reactionType] = newCounts[reactionType] + 1;
        setUserReaction(reactionType);
        setCounts(newCounts);

        // Upsert to database
        const { error } = await supabase
          .from("reactions")
          .upsert(
            {
              user_id: userId,
              suggestion_id: suggestionId,
              reaction_type: reactionType,
            },
            { onConflict: "user_id,suggestion_id" }
          );

        if (error) throw error;
        onReactionChange?.(newCounts, reactionType);
      }
    } catch (error: any) {
      // Revert on error
      console.error("Reaction error:", error);
      toast.error("Failed to save reaction");
      setCounts(initialCounts);
      setUserReaction(initialUserReaction);
    } finally {
      setLoading(false);
    }
  };

  const totalScore = 
    counts.champion * 2 + 
    counts.support * 1 + 
    counts.neutral * 0 + 
    counts.concerns * -1;

  if (compact) {
    return (
      <TooltipProvider>
        <div className="flex items-center gap-1">
          {(Object.keys(reactionConfig) as ReactionType[]).map((type) => {
            const config = reactionConfig[type];
            const Icon = config.icon;
            const isActive = userReaction === type;
            const count = counts[type];

            if (count === 0 && !isActive) return null;

            return (
              <Tooltip key={type}>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReaction(type);
                    }}
                    disabled={loading}
                    className={cn(
                      "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs transition-colors",
                      isActive ? config.activeColor : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{count}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{config.label} ({config.weight})</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
          {totalScore !== 0 && (
            <span className={cn(
              "text-xs font-medium ml-1",
              totalScore > 0 ? "text-emerald-500" : "text-amber-500"
            )}>
              {totalScore > 0 ? `+${totalScore}` : totalScore}
            </span>
          )}
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {(Object.keys(reactionConfig) as ReactionType[]).map((type) => {
            const config = reactionConfig[type];
            const Icon = config.icon;
            const isActive = userReaction === type;

            return (
              <Tooltip key={type}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReaction(type);
                    }}
                    disabled={loading}
                    className={cn(
                      "h-8 gap-1.5 transition-all",
                      isActive ? config.activeColor : config.color
                    )}
                  >
                    {loading && userReaction === type ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                    <span className="text-xs">{counts[type]}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{config.label} ({config.weight} momentum)</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Total Score:</span>
          <span className={cn(
            "font-semibold",
            totalScore > 0 ? "text-emerald-500" : totalScore < 0 ? "text-amber-500" : "text-muted-foreground"
          )}>
            {totalScore > 0 ? `+${totalScore}` : totalScore}
          </span>
        </div>
      </div>
    </TooltipProvider>
  );
};
