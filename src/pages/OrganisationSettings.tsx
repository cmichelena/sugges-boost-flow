import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAccount } from "@/hooks/useAccount";
import { useOrganization } from "@/hooks/useOrganization";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Loader2,
  Building2,
  Users,
  Crown,
  Mail,
  Briefcase,
  ChevronRight,
} from "lucide-react";
import { PlanUsageCard } from "@/components/PlanUsageCard";
import { AccountSwitcher } from "@/components/AccountSwitcher";

interface AccountMember {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  display_name: string | null;
}

const OrganisationSettings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { activeAccount, accounts, loading: accountLoading, userAccountRole } = useAccount();
  const { activeOrganization, organizations } = useOrganization();
  const [members, setMembers] = useState<AccountMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [billingEmail, setBillingEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
  }, [user, navigate]);

  useEffect(() => {
    if (activeAccount) {
      setBillingEmail(activeAccount.billing_email || "");
      loadMembers();
    }
  }, [activeAccount]);

  const loadMembers = async () => {
    if (!activeAccount) return;
    setLoadingMembers(true);
    try {
      const { data: membersData, error } = await supabase
        .from("account_members")
        .select("id, user_id, role, created_at")
        .eq("account_id", activeAccount.id);

      if (error) throw error;

      // Enrich with profile names
      const enriched = await Promise.all(
        (membersData || []).map(async (m) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", m.user_id)
            .single();
          return { ...m, display_name: profile?.display_name || null };
        })
      );

      // Add owner if not already in members
      const ownerInMembers = enriched.find(m => m.user_id === activeAccount.owner_id);
      if (!ownerInMembers) {
        const { data: ownerProfile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", activeAccount.owner_id)
          .single();
        enriched.unshift({
          id: "owner",
          user_id: activeAccount.owner_id,
          role: "owner",
          created_at: activeAccount.created_at,
          display_name: ownerProfile?.display_name || null,
        });
      }

      setMembers(enriched);
    } catch (error) {
      console.error("Error loading members:", error);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleSaveBillingEmail = async () => {
    if (!activeAccount || (userAccountRole !== "owner" && userAccountRole !== "portfolio_admin")) return;
    setSavingEmail(true);
    try {
      const { error } = await supabase
        .from("accounts")
        .update({ billing_email: billingEmail.trim() || null })
        .eq("id", activeAccount.id);
      if (error) throw error;
      toast.success("Billing email updated");
    } catch (error) {
      console.error("Error updating billing email:", error);
      toast.error("Failed to update billing email");
    } finally {
      setSavingEmail(false);
    }
  };

  // Get workspaces belonging to this account
  const linkedWorkspaces = organizations.filter(
    (o) => activeAccount && (o as any).account_id === activeAccount.id
  );

  const getRoleBadge = (role: string) => {
    if (role === "owner") return <Badge variant="default"><Crown className="w-3 h-3 mr-1" />Owner</Badge>;
    if (role === "portfolio_admin") return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20">Admin</Badge>;
    if (role === "manager") return <Badge variant="secondary">Manager</Badge>;
    return <Badge variant="outline">Viewer</Badge>;
  };

  if (accountLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (accounts.length === 0) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <h1 className="font-bold mb-6 flex items-center gap-3">
            <Briefcase className="w-8 h-8" />
            Organisation Settings
          </h1>
          <Card className="p-8 text-center">
            <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Organisation Yet</h2>
            <p className="text-muted-foreground mb-4">
              Create an organisation from the Portfolio page to manage multiple workspaces.
            </p>
            <Button onClick={() => navigate("/portfolio")}>
              Go to Portfolio
            </Button>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header with switcher */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-bold flex items-center gap-3">
            <Briefcase className="w-8 h-8" />
            Organisation Settings
          </h1>
          {accounts.length > 1 && (
            <AccountSwitcher />
          )}
        </div>

        {activeAccount && (
          <>
            {/* Organisation Details */}
            <Card className="p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Organisation Details
              </h2>
              <div className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Organisation Name</Label>
                  <p className="text-lg font-medium">{activeAccount.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Created</Label>
                  <p className="text-sm">
                    {new Date(activeAccount.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </Card>

            {/* Billing */}
            <Card className="p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Billing
              </h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="billing-email">Billing Email</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="billing-email"
                      type="email"
                      value={billingEmail}
                      onChange={(e) => setBillingEmail(e.target.value)}
                      placeholder="billing@company.com"
                      disabled={userAccountRole !== "owner" && userAccountRole !== "portfolio_admin"}
                    />
                    {(userAccountRole === "owner" || userAccountRole === "portfolio_admin") && (
                      <Button onClick={handleSaveBillingEmail} disabled={savingEmail}>
                        {savingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Subscription & Usage - uses the active workspace's subscription */}
            {activeOrganization && (
              <div className="mb-6">
                <PlanUsageCard
                  organizationId={activeOrganization.id}
                  dbSubscriptionTier={activeOrganization.subscription_tier}
                  dbSubscriptionStatus={activeOrganization.subscription_status}
                  trialEndsAt={activeOrganization.trial_ends_at}
                />
              </div>
            )}

            {/* Linked Workspaces */}
            {linkedWorkspaces.length > 0 && (
              <Card className="p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Linked Workspaces ({linkedWorkspaces.length})
                </h2>
                <div className="space-y-2">
                  {linkedWorkspaces.map((ws) => (
                    <button
                      key={ws.id}
                      onClick={() => navigate("/organization")}
                      className="w-full flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Building2 className="w-5 h-5 text-muted-foreground" />
                        <div className="text-left">
                          <p className="font-medium">{ws.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {ws.workspace_type} • {ws.subscription_tier}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </Card>
            )}

            {/* Organisation Members */}
            <Card className="p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Organisation Members ({members.length})
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Members with organisation-level access across all linked workspaces.
              </p>
              {loadingMembers ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-3">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{member.display_name || "Unknown User"}</p>
                        <p className="text-xs text-muted-foreground">
                          Since {new Date(member.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      {getRoleBadge(member.role)}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default OrganisationSettings;
