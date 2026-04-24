import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import { ArrowUpCircle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isIOSApp } from "@/lib/platform";

interface LeadershipMember {
  user_id: string;
  display_name: string;
}

interface ElevateToLeadershipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestionId: string;
  onEscalated: (escalatedToUserId: string, escalatedAt: string) => void;
}

export const ElevateToLeadershipDialog = ({
  open,
  onOpenChange,
  suggestionId,
  onEscalated,
}: ElevateToLeadershipDialogProps) => {
  const { activeOrganization } = useOrganization();
  const [leadershipMembers, setLeadershipMembers] = useState<LeadershipMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(true);

  useEffect(() => {
    const loadLeadershipMembers = async () => {
      if (!activeOrganization || !open) return;

      setLoadingMembers(true);
      try {
        const { data, error } = await supabase
          .rpc("get_leadership_members", {
            _org_id: activeOrganization.id
          });

        if (error) throw error;
        setLeadershipMembers(data || []);
      } catch (error) {
        console.error("Error loading leadership members:", error);
        toast.error("Failed to load leadership team members");
      } finally {
        setLoadingMembers(false);
      }
    };

    loadLeadershipMembers();
  }, [activeOrganization, open]);

  const handleEscalate = async () => {
    if (!selectedMemberId) {
      toast.error("Please select a leadership member");
      return;
    }

    setLoading(true);
    try {
      const escalatedAt = new Date().toISOString();

      // Update suggestion with escalation info
      const { error: updateError } = await supabase
        .from("suggestions")
        .update({
          escalated_to_user_id: selectedMemberId,
          escalated_at: escalatedAt,
        })
        .eq("id", suggestionId);

      if (updateError) throw updateError;

      // Add a comment about the escalation if provided
      if (comment.trim()) {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          await supabase.from("comments").insert({
            suggestion_id: suggestionId,
            user_id: userData.user.id,
            content: `[Escalated to Leadership] ${comment}`,
          });
        }
      }

      toast.success("Suggestion escalated to Leadership");
      onEscalated(selectedMemberId, escalatedAt);
      onOpenChange(false);
      setSelectedMemberId("");
      setComment("");
    } catch (error) {
      console.error("Error escalating suggestion:", error);
      toast.error("Failed to escalate suggestion");
    } finally {
      setLoading(false);
    }
  };

  if (isIOSApp()) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpCircle className="w-5 h-5 text-primary" />
              Elevate to Leadership
            </DialogTitle>
          </DialogHeader>
          <p className="py-4 text-sm text-muted-foreground">
            This action is managed on suggistit.com.
          </p>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)} className="w-full">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpCircle className="w-5 h-5 text-primary" />
            Elevate to Leadership
          </DialogTitle>
          <DialogDescription>
            Escalate this suggestion to a Leadership team member for final decision.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="leadership-member">Assign to</Label>
            {loadingMembers ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading leadership team...
              </div>
            ) : leadershipMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No leadership team members found. Please add members to the Leadership team first.
              </p>
            ) : (
              <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a leader" />
                </SelectTrigger>
                <SelectContent>
                  {leadershipMembers.map((member) => (
                    <SelectItem key={member.user_id} value={member.user_id}>
                      {member.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="escalation-comment">Context (optional)</Label>
            <Textarea
              id="escalation-comment"
              placeholder="Provide context for why this needs leadership attention..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {comment.length}/500
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleEscalate}
            disabled={loading || !selectedMemberId || loadingMembers}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Escalating...
              </>
            ) : (
              <>
                <ArrowUpCircle className="w-4 h-4 mr-2" />
                Escalate
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
