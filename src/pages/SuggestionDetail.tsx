import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { MomentumDial } from "@/components/MomentumDial";
import { calculateMomentum, getMomentumLevel } from "@/lib/momentum";
import { Heart, MessageCircle, Eye, ArrowLeft, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  profiles: {
    display_name: string;
  } | null;
}

const SuggestionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [suggestion, setSuggestion] = useState<any>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [likesCount, setLikesCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (id) {
      loadSuggestion();
      incrementViews();
    }
  }, [id]);

  const incrementViews = async () => {
    if (!id) return;
    const { data } = await supabase
      .from("suggestions")
      .select("views")
      .eq("id", id)
      .single();

    if (data) {
      await supabase
        .from("suggestions")
        .update({ views: data.views + 1 })
        .eq("id", id);
    }
  };

  const loadSuggestion = async () => {
    try {
      const { data: suggestionData, error } = await supabase
        .from("suggestions")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      const [{ data: profile }, { count: likesCount }, { data: commentsData }, userLike] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("display_name")
            .eq("id", suggestionData.user_id)
            .single(),
          supabase
            .from("likes")
            .select("*", { count: "exact", head: true })
            .eq("suggestion_id", id),
          supabase
            .from("comments")
            .select("*")
            .eq("suggestion_id", id)
            .order("created_at", { ascending: true }),
          user
            ? supabase
                .from("likes")
                .select("id")
                .eq("suggestion_id", id)
                .eq("user_id", user.id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
        ]);

      const commentsWithProfiles = await Promise.all(
        (commentsData || []).map(async (comment) => {
          const { data: commentProfile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", comment.user_id)
            .single();
          return { ...comment, profiles: commentProfile };
        })
      );

      setSuggestion({ ...suggestionData, profiles: profile });
      setLikesCount(likesCount || 0);
      setComments(commentsWithProfiles);
      setHasLiked(!!userLike.data);
      setIsOwner(user?.id === suggestionData.user_id);
    } catch (error) {
      console.error("Error loading suggestion:", error);
      toast.error("Failed to load suggestion");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const toggleLike = async () => {
    if (!user) {
      toast.error("Please sign in to like suggestions");
      navigate("/auth");
      return;
    }

    try {
      if (hasLiked) {
        await supabase
          .from("likes")
          .delete()
          .eq("suggestion_id", id)
          .eq("user_id", user.id);
        setLikesCount((prev) => prev - 1);
        setHasLiked(false);
      } else {
        await supabase
          .from("likes")
          .insert({ suggestion_id: id, user_id: user.id });
        setLikesCount((prev) => prev + 1);
        setHasLiked(true);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      toast.error("Failed to update like");
    }
  };

  const submitComment = async () => {
    if (!user) {
      toast.error("Please sign in to comment");
      navigate("/auth");
      return;
    }

    if (!newComment.trim()) {
      toast.error("Comment cannot be empty");
      return;
    }

    setSubmittingComment(true);
    try {
      const { data, error } = await supabase
        .from("comments")
        .insert({
          suggestion_id: id,
          user_id: user.id,
          content: newComment,
        })
        .select()
        .single();

      if (error) throw error;

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single();

      setComments([...comments, { ...data, profiles: profile }]);
      setNewComment("");
      toast.success("Comment added!");
    } catch (error) {
      console.error("Error submitting comment:", error);
      toast.error("Failed to submit comment");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;

    try {
      const { error } = await supabase
        .from("suggestions")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;

      setSuggestion({ ...suggestion, status: newStatus });
      toast.success("Status updated successfully");
    } catch (error: any) {
      toast.error("Failed to update status");
      console.error(error);
    }
  };

  const handleDelete = async () => {
    if (!id) return;

    try {
      const { error } = await supabase
        .from("suggestions")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Suggestion deleted successfully");
      navigate("/");
    } catch (error: any) {
      toast.error("Failed to delete suggestion");
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!suggestion) return null;

  const momentumScore = calculateMomentum(
    likesCount,
    comments.length,
    suggestion.views,
    new Date(suggestion.created_at)
  );
  const momentumLevel = getMomentumLevel(momentumScore);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Feed
        </Button>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <div className="space-y-4 mb-4">
                <div className="flex items-center gap-2">
                  <Badge>{suggestion.category}</Badge>
                  <Badge variant="outline">{suggestion.status}</Badge>
                </div>
                <h1 className="text-3xl font-bold">{suggestion.title}</h1>
                <p className="text-muted-foreground">
                  by {suggestion.profiles?.display_name || "Anonymous"} •{" "}
                  {formatDistanceToNow(new Date(suggestion.created_at), { addSuffix: true })}
                </p>
                <div className="flex justify-center py-4">
                  <MomentumDial level={momentumLevel} score={momentumScore} size="lg" />
                </div>
              </div>

              {isOwner && (
                <div className="mb-4 pb-4 border-b">
                  <label className="text-sm font-medium mb-2 block">Change Status</label>
                  <Select value={suggestion.status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Open">Open</SelectItem>
                      <SelectItem value="Acknowledged">Acknowledged</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="Rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="prose max-w-none mb-6">
                <p className="text-foreground whitespace-pre-wrap">{suggestion.description}</p>
              </div>

              {suggestion.ai_tags && suggestion.ai_tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {suggestion.ai_tags.map((tag: string) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-6 pt-4 border-t">
                <Button
                  variant={hasLiked ? "default" : "outline"}
                  size="sm"
                  onClick={toggleLike}
                  className="gap-2"
                >
                  <Heart className={`w-4 h-4 ${hasLiked ? "fill-current" : ""}`} />
                  {likesCount}
                </Button>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MessageCircle className="w-4 h-4" />
                  <span>{comments.length}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Eye className="w-4 h-4" />
                  <span>{suggestion.views}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4">Comments ({comments.length})</h2>

              <div className="space-y-4 mb-6">
                {comments.map((comment) => (
                  <div key={comment.id} className="border-l-2 border-primary/20 pl-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">
                        {comment.profiles?.display_name || "Anonymous"}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-foreground">{comment.content}</p>
                  </div>
                ))}
              </div>

              {user ? (
                <div className="space-y-2">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    rows={3}
                  />
                  <Button onClick={submitComment} disabled={submittingComment}>
                    <Send className="w-4 h-4 mr-2" />
                    {submittingComment ? "Sending..." : "Post Comment"}
                  </Button>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  Please <span className="text-primary cursor-pointer" onClick={() => navigate("/auth")}>sign in</span> to comment
                </p>
              )}
            </Card>
          </div>

          {isOwner && (
            <div className="lg:col-span-2">
              <Card className="p-6">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="lg" className="w-full gap-2">
                      <Trash2 className="w-4 h-4" />
                      Delete Suggestion
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Suggestion</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this suggestion? This action cannot be undone.
                        All comments and likes will also be removed.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuggestionDetail;