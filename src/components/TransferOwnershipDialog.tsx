import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import { Loader2, Crown, AlertTriangle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isIOSApp } from "@/lib/platform";

interface MemberOption {
  user_id: string;
  display_name: string;
}

interface TransferOwnershipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTransferComplete: () => void;
}

export const TransferOwnershipDialog = ({
  open,
  onOpenChange,
  onTransferComplete,
}: TransferOwnershipDialogProps) => {
  const { activeOrganization } = useOrganization();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    if (open) {
      setStep(1);
      setSelectedUserId("");
      loadMembers();
    }
  }, [open]);

  const loadMembers = async () => {
    if (!activeOrganization) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", activeOrganization.id)
        .eq("status", "active")
        .neq("user_id", activeOrganization.owner_id);

      if (error) throw error;

      const enriched = await Promise.all(
        (data || []).map(async (m) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", m.user_id)
            .single();
          return {
            user_id: m.user_id,
            display_name: profile?.display_name || "Unknown User",
          };
        })
      );

      setMembers(enriched);
    } catch (error) {
      console.error("Error loading members:", error);
      toast.error("Failed to load workspace members");
    } finally {
      setLoading(false);
    }
  };

  const selectedMember = members.find((m) => m.user_id === selectedUserId);

  const handleTransfer = async () => {
    if (!activeOrganization || !selectedUserId) return;
    setTransferring(true);
    try {
      const { data, error } = await supabase.rpc(
        "transfer_workspace_ownership",
        {
          _workspace_id: activeOrganization.id,
          _new_owner_id: selectedUserId,
        }
      );

      if (error) throw error;

      setStep(3);
      toast.success("Ownership transferred successfully");
      onTransferComplete();
    } catch (error: any) {
      console.error("Transfer error:", error);
      toast.error(error.message || "Failed to transfer ownership");
    } finally {
      setTransferring(false);
    }
  };

  if (isIOSApp()) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5" />
              Transfer Workspace Ownership
            </DialogTitle>
          </DialogHeader>
          <p className="py-4 text-sm text-muted-foreground">
            Workspace ownership transfers are managed on suggistit.com.
          </p>
          <Button onClick={() => onOpenChange(false)} className="w-full">Close</Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5" />
            Transfer Workspace Ownership
          </DialogTitle>
          <DialogDescription>
            {step === 1 && "Select a workspace member to become the new owner."}
            {step === 2 && "Please confirm this ownership transfer."}
            {step === 3 && "Transfer complete."}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : members.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                No other active members in this workspace. Invite members first before transferring ownership.
              </p>
            ) : (
              <>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select new owner" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((m) => (
                      <SelectItem key={m.user_id} value={m.user_id}>
                        {m.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  className="w-full"
                  disabled={!selectedUserId}
                  onClick={() => setStep(2)}
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div className="space-y-2 text-sm">
                  <p>
                    You are about to transfer ownership to{" "}
                    <strong>{selectedMember?.display_name}</strong>.
                  </p>
                  <p>
                    Transferring ownership gives the new owner full legal control
                    of this workspace, including transfer to another organisation
                    and deletion.
                  </p>
                  <p>Your role will be downgraded to Admin.</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep(1)}
                disabled={transferring}
              >
                Back
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleTransfer}
                disabled={transferring}
              >
                {transferring ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Transferring...
                  </>
                ) : (
                  "Confirm Transfer"
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 text-center py-4">
            <p className="text-sm text-muted-foreground">
              Ownership has been transferred to{" "}
              <strong>{selectedMember?.display_name}</strong>. You are now an
              Admin of this workspace.
            </p>
            <Button onClick={() => onOpenChange(false)} className="w-full">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
