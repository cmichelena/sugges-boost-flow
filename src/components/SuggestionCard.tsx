import { formatDistanceToNow } from "date-fns";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThumbsUp, MessageSquare, Eye, User, Users, EyeOff } from "lucide-react";
import { MomentumDial } from "./MomentumDial";
import { calculateMomentum, getMomentumLevel } from "@/lib/momentum";

interface SuggestionCardProps {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  likes: number;
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
  likes,
  comments,
  views,
  createdAt,
  authorName,
  isAnonymous,
  assignedToUserName,
  assignedToTeamName,
  onClick,
}: SuggestionCardProps) => {
  const momentum = calculateMomentum(likes, comments, views, new Date(createdAt));
  const momentumLevel = getMomentumLevel(momentum);

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
            <div className="flex items-center gap-1">
              <ThumbsUp className="w-4 h-4" />
              <span>{likes}</span>
            </div>
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
