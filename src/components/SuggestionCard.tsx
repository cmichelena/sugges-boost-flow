import { Heart, MessageCircle, Eye } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MomentumDial } from "./MomentumDial";
import { calculateMomentum, getMomentumLevel } from "@/lib/momentum";
import { formatDistanceToNow } from "date-fns";

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
  authorName: string;
  onClick: () => void;
}

export const SuggestionCard = ({
  title,
  category,
  status,
  likes,
  comments,
  views,
  createdAt,
  authorName,
  onClick,
}: SuggestionCardProps) => {
  const momentumScore = calculateMomentum(likes, comments, views, new Date(createdAt));
  const momentumLevel = getMomentumLevel(momentumScore);

  return (
    <Card
      className="p-4 hover:shadow-lg transition-shadow cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        <MomentumDial level={momentumLevel} score={momentumScore} size="sm" />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold text-lg group-hover:text-primary transition-colors line-clamp-2">
              {title}
            </h3>
            <Badge variant="outline">{status}</Badge>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
            <span className="font-medium">{category}</span>
            <span>by {authorName}</span>
            <span>{formatDistanceToNow(new Date(createdAt), { addSuffix: true })}</span>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Heart className="w-4 h-4" />
              <span>{likes}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageCircle className="w-4 h-4" />
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