import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { ChevronUp, ChevronDown, ChevronsUp, ChevronsDown, Loader2, Info } from "lucide-react";
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

// Mapping database enum to new semantic labels
// champion = Strong Support (+2), support = Support (+1), neutral = Oppose (-1), concerns = Strong Oppose (-2)
const reactionConfig: Record<ReactionType, { 
  icon: typeof ChevronUp; 
  label: string; 
  weight: number;
  weightLabel: string;
  color: string;
  activeColor: string;
}> = {
  champion: { 
    icon: ChevronsUp, 
    label: "Strong Support", 
    weight: 2,
    weightLabel: "+2",
    color: "text-muted-foreground hover:text-emerald-500",
    activeColor: "text-emerald-500 bg-emerald-500/20"
  },
  support: { 
    icon: ChevronUp, 
    label: "Support", 
    weight: 1,
    weightLabel: "+1",
    color: "text-muted-foreground hover:text-emerald-400",
    activeColor: "text-emerald-400 bg-emerald-400/20"
  },
  neutral: { 
    icon: ChevronDown, 
    label: "Oppose", 
    weight: -1,
    weightLabel: "-1",
    color: "text-muted-foreground hover:text-orange-400",
    activeColor: "text-orange-400 bg-orange-400/20"
  },
  concerns: { 
    icon: ChevronsDown, 
    label: "Strong Oppose", 
    weight: -2,
    weightLabel: "-2",
    color: "text-muted-foreground hover:text-red-500",
    activeColor: "text-red-500 bg-red-500/20"
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
    counts.neutral * -1 + 
    counts.concerns * -2;

  if (compact) {
    const hasVoted = userReaction !== null;
    
    return (
      <TooltipProvider>
        <div className="flex items-center gap-1.5">
          {/* Single-choice reaction selector */}
          <div className="flex items-center border border-border rounded-md overflow-hidden bg-muted/30">
            {(Object.keys(reactionConfig) as ReactionType[]).map((type) => {
              const config = reactionConfig[type];
              const Icon = config.icon;
              const isActive = userReaction === type;
              const count = counts[type];

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
                        "flex items-center gap-0.5 px-2 py-1.5 text-xs transition-all border-r border-border/50 last:border-r-0 relative",
                        isActive 
                          ? cn(config.activeColor, "font-semibold shadow-sm z-10")
                          : hasVoted
                            ? "text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/50"
                            : "text-muted-foreground hover:bg-muted/50"
                      )}
                    >
                      <Icon className={cn(
                        "w-3.5 h-3.5 transition-transform",
                        isActive && "scale-125"
                      )} />
                      {count > 0 && (
                        <span className={cn(
                          "min-w-[14px] text-center",
                          isActive ? "font-bold" : "opacity-70"
                        )}>
                          {count}
                        </span>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    <p className="font-medium">{config.label}</p>
                    <p className="text-muted-foreground">{config.weightLabel} momentum</p>
                    {isActive && <p className="text-primary text-[10px] mt-0.5">Your vote • click to remove</p>}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
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
                  <p>{config.label} ({config.weightLabel} momentum)</p>
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
