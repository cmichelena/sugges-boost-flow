import { formatDistanceToNow } from "date-fns";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Eye, User, Users, EyeOff, Flame, ThumbsUp, Minus, AlertTriangle } from "lucide-react";
import { MomentumDial } from "./MomentumDial";
import { calculateMomentum, getMomentumLevel, calculateReactionScore } from "@/lib/momentum";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ReactionCounts {
  champion: number;
  support: number;
  neutral: number;
  concerns: number;
}

interface SuggestionCardProps {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  reactions: ReactionCounts;
  comments: number;
  views: number;
  createdAt: string;
  authorName: string | null;
  isAnonymous?: boolean;
  assignedToUserName?: string | null;
  assignedToTeamName?: string | null;
  onClick: () => void;
}

export const SuggestionCard = ({
  title,
  description,
  category,
  status,
  reactions,
  comments,
  views,
  createdAt,
  authorName,
  isAnonymous,
  assignedToUserName,
  assignedToTeamName,
  onClick,
}: SuggestionCardProps) => {
  const reactionScore = calculateReactionScore(
    reactions.champion,
    reactions.support,
    reactions.neutral,
    reactions.concerns
  );
  const momentum = calculateMomentum(reactionScore, comments, views, new Date(createdAt));
  const momentumLevel = getMomentumLevel(momentum);

  const totalReactions = reactions.champion + reactions.support + reactions.neutral + reactions.concerns;

  return (
    <Card
      className="p-6 hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-primary/20 hover:border-l-primary"
      onClick={onClick}
    >
      <div className="flex gap-4">
        <MomentumDial level={momentumLevel} score={momentum} size="sm" />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-2">
            <h3 className="text-xl font-semibold line-clamp-2 flex-1">{title}</h3>
            <div className="flex gap-2 flex-shrink-0">
              <Badge variant="outline">{status}</Badge>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 flex-wrap">
            <span>{isAnonymous ? "Anonymous" : (authorName || "Unknown")}</span>
            <span>•</span>
            <span>{formatDistanceToNow(new Date(createdAt), { addSuffix: true })}</span>
            {isAnonymous && (
              <>
                <span>•</span>
                <Badge variant="secondary" className="text-xs">
                  <EyeOff className="w-3 h-3 mr-1" />
                  Anonymous
                </Badge>
              </>
            )}
            {assignedToUserName && (
              <>
                <span>•</span>
                <Badge variant="secondary" className="text-xs">
                  <User className="w-3 h-3 mr-1" />
                  Assigned to {assignedToUserName}
                </Badge>
              </>
            )}
            {!assignedToUserName && assignedToTeamName && (
              <>
                <span>•</span>
                <Badge variant="outline" className="text-xs">
                  <Users className="w-3 h-3 mr-1" />
                  Assigned to {assignedToTeamName}
                </Badge>
              </>
            )}
          </div>

          <p className="text-muted-foreground text-sm line-clamp-2 mb-3">{description}</p>

          <div className="flex items-center gap-2">
            <Badge variant="secondary">{category}</Badge>
          </div>

          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
            {/* Reactions summary */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    {reactions.champion > 0 && (
                      <div className="flex items-center gap-0.5 text-orange-500">
                        <Flame className="w-3.5 h-3.5" />
                        <span className="text-xs">{reactions.champion}</span>
                      </div>
                    )}
                    {reactions.support > 0 && (
                      <div className="flex items-center gap-0.5 text-emerald-500">
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span className="text-xs">{reactions.support}</span>
                      </div>
                    )}
                    {reactions.neutral > 0 && (
                      <div className="flex items-center gap-0.5 text-blue-500">
                        <Minus className="w-3.5 h-3.5" />
                        <span className="text-xs">{reactions.neutral}</span>
                      </div>
                    )}
                    {reactions.concerns > 0 && (
                      <div className="flex items-center gap-0.5 text-amber-500">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span className="text-xs">{reactions.concerns}</span>
                      </div>
                    )}
                    {totalReactions === 0 && (
                      <span className="text-xs text-muted-foreground">No reactions</span>
                    )}
                    {totalReactions > 0 && (
                      <span className={cn(
                        "text-xs font-medium ml-1",
                        reactionScore > 0 ? "text-emerald-500" : reactionScore < 0 ? "text-amber-500" : "text-muted-foreground"
                      )}>
                        ({reactionScore > 0 ? `+${reactionScore}` : reactionScore})
                      </span>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs space-y-1">
                    <div>Champion: {reactions.champion} (+2 each)</div>
                    <div>Support: {reactions.support} (+1 each)</div>
                    <div>Neutral: {reactions.neutral} (0 each)</div>
                    <div>Concerns: {reactions.concerns} (-1 each)</div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <div className="flex items-center gap-1">
              <MessageSquare className="w-4 h-4" />
              <span>{comments}</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              <span>{views}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
