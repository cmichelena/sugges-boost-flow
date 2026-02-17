import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Building2, Plus, AlertTriangle, CheckCircle, BarChart3, Users, Mail, Briefcase } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { useAccount } from "@/hooks/useAccount";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AccountSwitcher } from "@/components/AccountSwitcher";

export default function Portfolio() {
  const { user } = useAuth();
  const { activeAccount, accounts, loading: accountsLoading, userAccountRole, refreshAccounts } = useAccount();
  const navigate = useNavigate();
  const [showCreateAccount, setShowCreateAccount] = useState(false);

  if (!user) {
    navigate("/auth");
    return null;
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Briefcase className="w-6 h-6" />
              Portfolio
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage your accounts and view building summaries
            </p>
          </div>
          <div className="flex items-center gap-2">
            {accounts.length > 0 && <AccountSwitcher />}
            <Button onClick={() => setShowCreateAccount(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Organisation
            </Button>
          </div>
        </div>

        {accountsLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : accounts.length === 0 ? (
          <EmptyState onCreateAccount={() => setShowCreateAccount(true)} />
        ) : activeAccount ? (
          <PortfolioView account={activeAccount} userRole={userAccountRole} />
        ) : null}

        <CreateAccountDialog
          open={showCreateAccount}
          onOpenChange={setShowCreateAccount}
          onCreated={refreshAccounts}
        />
      </div>
    </AppLayout>
  );
}

function EmptyState({ onCreateAccount }: { onCreateAccount: () => void }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <Briefcase className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Organisations Yet</h3>
        <p className="text-muted-foreground mb-4 max-w-md">
          Create an organisation to group multiple workspaces and get consolidated insights.
        </p>
        <Button onClick={onCreateAccount}>
          <Plus className="w-4 h-4 mr-2" />
          Create Your First Organisation
        </Button>
      </CardContent>
    </Card>
  );
}

function PortfolioView({ account, userRole }: { account: { id: string; name: string; owner_id: string; billing_email: string | null }; userRole: string | null }) {
  const navigate = useNavigate();
  const canManage = userRole === "owner" || userRole === "portfolio_admin";

  const { data: summary, isLoading } = useQuery({
    queryKey: ["portfolio-summary", account.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_portfolio_summary", {
        _account_id: account.id,
      });
      if (error) throw error;
      return data as {
        by_status: Record<string, number> | null;
        overdue_response: number;
        overdue_resolution: number;
        top_categories: Array<{ category: string; cnt: number }> | null;
        buildings_by_backlog: Array<{ organization_id: string; name: string; open_count: number }> | null;
      };
    },
  });

  const { data: members } = useQuery({
    queryKey: ["account-members", account.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("account_members")
        .select("*")
        .eq("account_id", account.id);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  const byStatus = summary?.by_status || {};
  const totalOpen = Object.values(byStatus).reduce((s, n) => s + n, 0);
  const overdueTotal = (summary?.overdue_response || 0) + (summary?.overdue_resolution || 0);

  return (
    <div className="space-y-6">
      {/* Account Info */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{account.name}</CardTitle>
              {account.billing_email && (
                <CardDescription className="flex items-center gap-1 mt-1">
                  <Mail className="w-3 h-3" />
                  {account.billing_email}
                </CardDescription>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                <Users className="w-3 h-3 mr-1" />
                {(members?.length || 0) + 1} members
              </Badge>
              <Badge variant="outline">
                {userRole || "owner"}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-2xl font-bold">{totalOpen}</div>
            <div className="text-xs text-muted-foreground mt-1">Open Issues</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <div className={`text-2xl font-bold ${overdueTotal > 0 ? "text-destructive" : "text-green-600"}`}>
              {overdueTotal}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Overdue</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-2xl font-bold">
              {summary?.buildings_by_backlog?.length || 0}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Workspaces</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-2xl font-bold">
              {summary?.top_categories?.length || 0}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Categories</div>
          </CardContent>
        </Card>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Issues by Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(byStatus).length === 0 ? (
              <p className="text-sm text-muted-foreground">No issues yet</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(byStatus).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <span className="text-sm">{status}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Categories */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Top Categories</CardTitle>
          </CardHeader>
          <CardContent>
            {!summary?.top_categories?.length ? (
              <p className="text-sm text-muted-foreground">No data yet</p>
            ) : (
              <div className="space-y-2">
                {summary.top_categories.map((cat) => (
                  <div key={cat.category} className="flex items-center justify-between">
                    <span className="text-sm">{cat.category}</span>
                    <Badge variant="secondary">{cat.cnt}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Overdue Breakdown */}
      {overdueTotal > 0 && (
        <Card className="border-destructive/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-4 h-4" />
              Overdue Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-lg font-bold text-destructive">{summary?.overdue_response || 0}</div>
                <div className="text-xs text-muted-foreground">Past response date</div>
              </div>
              <div>
                <div className="text-lg font-bold text-destructive">{summary?.overdue_resolution || 0}</div>
                <div className="text-xs text-muted-foreground">Past resolution date</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Buildings by Backlog */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Workspaces by Backlog
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!summary?.buildings_by_backlog?.length ? (
            <p className="text-sm text-muted-foreground">No workspaces with open issues</p>
          ) : (
            <div className="space-y-2">
              {summary.buildings_by_backlog.map((building) => (
                <button
                  key={building.organization_id}
                  onClick={() => {
                    // Switch to this workspace
                    navigate("/dashboard");
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{building.name}</span>
                  </div>
                  <Badge variant={building.open_count > 10 ? "destructive" : "secondary"}>
                    {building.open_count} open
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CreateAccountDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => Promise<void>;
}) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!user || !name.trim()) return;
    setIsCreating(true);

    try {
      // Create account
      const { data: newAccount, error: accountError } = await supabase
        .from("accounts")
        .insert({
          name: name.trim(),
          owner_id: user.id,
          billing_email: billingEmail.trim() || null,
        })
        .select()
        .single();

      if (accountError) throw accountError;

      // Add creator as portfolio_admin member
      const { error: memberError } = await supabase
        .from("account_members")
        .insert({
          account_id: newAccount.id,
          user_id: user.id,
          role: "portfolio_admin",
        });

      if (memberError) throw memberError;

      // Save as active account
      localStorage.setItem(`active_account_${user.id}`, newAccount.id);

      toast.success("Organisation created successfully!");
      setName("");
      setBillingEmail("");
      onOpenChange(false);
      await onCreated();
    } catch (error: any) {
      console.error("Error creating account:", error);
      toast.error(error.message || "Failed to create organisation");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Create Organisation
          </DialogTitle>
          <DialogDescription>
            Create an organisation to group multiple workspaces under one umbrella.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="account-name">Organisation Name *</Label>
            <Input
              id="account-name"
              placeholder="Pinnacle Properties"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="billing-email">Billing Email (optional)</Label>
            <Input
              id="billing-email"
              type="email"
              placeholder="billing@company.com"
              value={billingEmail}
              onChange={(e) => setBillingEmail(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating || !name.trim()}>
            {isCreating ? "Creating..." : "Create Organisation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
