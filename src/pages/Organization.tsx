import { useEffect, useState } from "react";
import { TransferOwnershipDialog } from "@/components/TransferOwnershipDialog";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useAccount } from "@/hooks/useAccount";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, Users, Crown, Calendar, Mail, CheckCircle, Clock, Trash2, AlertTriangle, Building2, User, Globe, X, ChevronRight, Briefcase } from "lucide-react";
import { z } from "zod";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { isIOSApp } from "@/lib/platform";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const emailSchema = z.string().email("Please enter a valid email address");

interface Member {
  id: string;
  user_id: string;
  status: string;
  joined_at: string | null;
  invited_at: string;
  profiles: {
    display_name: string;
  } | null;
  user_roles: {
    role: string;
  }[];
}

const OrganizationPage = () => {
  const { user } = useAuth();
  const { activeOrganization, organizations, userRole, loading: orgLoading, refreshOrganizations, switchOrganization } = useOrganization();
  const { activeAccount, hasAccountAccess } = useAccount();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!orgLoading && activeOrganization) {
      loadOrganizationData();
    }
  }, [user, navigate, orgLoading, activeOrganization]);

  const loadOrganizationData = async () => {
    if (!activeOrganization) return;

    try {
      const { data: membersData, error: membersError } = await supabase
        .from("organization_members")
        .select("*")
        .eq("organization_id", activeOrganization.id)
        .order("joined_at", { ascending: false });

      if (membersError) throw membersError;

      const enrichedMembers = await Promise.all(
        (membersData || []).map(async (member) => {
          const [profileResult, rolesResult] = await Promise.all([
            supabase
              .from("profiles")
              .select("display_name")
              .eq("id", member.user_id)
              .single(),
            supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", member.user_id)
              .eq("organization_id", activeOrganization.id)
          ]);

          return {
            ...member,
            profiles: profileResult.data,
            user_roles: rolesResult.data || []
          };
        })
      );

      setMembers(enrichedMembers);
    } catch (error: any) {
      console.error("Error loading organization data:", error);
      toast.error("Failed to load workspace data");
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isIOSApp()) return;
    setInviting(true);

    try {
      const validation = emailSchema.safeParse(inviteEmail);
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        setInviting(false);
        return;
      }

      if (userRole !== "admin" && userRole !== "owner") {
        toast.error("Only admins and owners can invite members");
        setInviting(false);
        return;
      }

      if (!activeOrganization?.id) {
        toast.error("Workspace not found");
        setInviting(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("send-invitation", {
        body: {
          email: inviteEmail,
          organizationId: activeOrganization.id,
          role: "member",
        },
      });

      if (error) {
        throw error;
      }

      if (data?.acceptUrl) {
        toast.success(
          <div className="space-y-2">
            <p>Invitation created! Email could not be sent.</p>
            <p className="text-xs">Share this link with the invitee:</p>
            <code className="block text-xs bg-muted p-2 rounded break-all">{data.acceptUrl}</code>
          </div>,
          { duration: 15000 }
        );
      } else {
        toast.success("Invitation sent successfully!");
      }
      
      setInviteEmail("");
      await loadOrganizationData();
    } catch (error: any) {
      console.error("Error inviting member:", error);
      
      let errorMessage = "Failed to send invitation. Please try again.";
      
      try {
        if (error.context?.body) {
          const parsed = JSON.parse(error.context.body);
          if (parsed.message) {
            errorMessage = parsed.message;
          } else if (parsed.error) {
            errorMessage = parsed.error;
          }
        } else if (error.message) {
          try {
            const parsed = JSON.parse(error.message);
            if (parsed.message) {
              errorMessage = parsed.message;
            }
          } catch {
            if (error.message.includes("session") || error.message.includes("expired")) {
              errorMessage = "Your session may have expired. Please sign out and sign back in, then try again.";
            } else if (error.message.includes("401") || error.message.includes("Unauthorized")) {
              errorMessage = "Authentication failed. Please sign out and sign back in, then try again.";
            } else if (error.message.includes("403") || error.message.includes("permission")) {
              errorMessage = "You don't have permission to invite members.";
            } else if (error.message.includes("already") && error.message.includes("member")) {
              errorMessage = "This person is already a member of your organization.";
            } else if (error.message !== "[object Object]") {
              errorMessage = error.message;
            }
          }
        }
      } catch {
        // Use default message if parsing fails
      }
      
      toast.error(errorMessage);
    } finally {
      setInviting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "active") {
      return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
    }
    return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
  };

  const getRoleBadge = (role: string) => {
    if (role === "owner") {
      return <Badge variant="default"><Crown className="w-3 h-3 mr-1" />Owner</Badge>;
    }
    if (role === "admin") {
      return <Badge variant="secondary">Admin</Badge>;
    }
    return <Badge variant="outline">Member</Badge>;
  };

  const handleDeleteMember = async () => {
    if (!memberToDelete || !activeOrganization) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("delete-user-account", {
        body: {
          targetUserId: memberToDelete.user_id,
          organizationId: activeOrganization.id,
        },
      });

      if (error) throw error;

      toast.success("User account and data deleted successfully");
      setDeleteDialogOpen(false);
      setMemberToDelete(null);
      await loadOrganizationData();
    } catch (error: unknown) {
      console.error("Error deleting member:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to delete user account";
      toast.error(errorMessage);
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteDialog = (member: Member) => {
    setMemberToDelete(member);
    setDeleteDialogOpen(true);
  };

  const handleUpdateOrganizationType = async (type: "personal" | "company") => {
    if (!activeOrganization || userRole !== "owner") return;

    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({ organization_type: type })
        .eq("id", activeOrganization.id);

      if (error) throw error;
      toast.success(`Access type updated to ${type}`);
      await refreshOrganizations();
    } catch (error) {
      console.error("Error updating organization type:", error);
      toast.error("Failed to update access type");
    } finally {
      setSavingSettings(false);
    }
  };

  const validateDomain = (domain: string): boolean => {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    return domainRegex.test(domain) || /^[a-zA-Z0-9]+\.[a-zA-Z]{2,}$/.test(domain);
  };

  const handleAddDomain = async () => {
    if (!activeOrganization || !newDomain.trim() || userRole !== "owner") return;

    const domain = newDomain.trim().toLowerCase();

    // Validate domain format
    if (!validateDomain(domain)) {
      toast.error("Invalid domain format (e.g., company.com)");
      return;
    }

    // Check length per RFC 1035
    if (domain.length > 253) {
      toast.error("Domain name too long (max 253 characters)");
      return;
    }

    const currentDomains = activeOrganization.allowed_email_domains || [];
    
    if (currentDomains.includes(domain)) {
      toast.error("Domain already added");
      return;
    }

    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({ allowed_email_domains: [...currentDomains, domain] })
        .eq("id", activeOrganization.id);

      if (error) throw error;
      toast.success("Domain added");
      setNewDomain("");
      await refreshOrganizations();
    } catch (error) {
      console.error("Error adding domain:", error);
      toast.error("Failed to add domain");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleRemoveDomain = async (domain: string) => {
    if (!activeOrganization || userRole !== "owner") return;

    const currentDomains = activeOrganization.allowed_email_domains || [];
    const newDomains = currentDomains.filter(d => d !== domain);

    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({ allowed_email_domains: newDomains.length > 0 ? newDomains : null })
        .eq("id", activeOrganization.id);

      if (error) throw error;
      toast.success("Domain removed");
      await refreshOrganizations();
    } catch (error) {
      console.error("Error removing domain:", error);
      toast.error("Failed to remove domain");
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading || orgLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Organisation context card */}
        <Card className="p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Briefcase className="w-5 h-5 text-muted-foreground shrink-0" />
            {hasAccountAccess && activeAccount ? (
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Organisation</p>
                <p className="font-medium truncate">{activeAccount.name}</p>
              </div>
            ) : (
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">This workspace is standalone.</p>
              </div>
            )}
          </div>
          {hasAccountAccess && activeAccount ? (
            <Button variant="outline" size="sm" asChild>
              <Link to="/organisation-settings">Open Organisation Settings</Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" asChild>
              <Link to="/portfolio">Attach to Organisation</Link>
            </Button>
          )}
        </Card>

        <h1 className="font-bold mb-6 flex items-center gap-3">
          <Building2 className="w-8 h-8" />
          Workspace Settings
        </h1>

        {/* Workspace Info */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            {activeOrganization?.organization_type === "company" ? (
              <Building2 className="w-5 h-5" />
            ) : (
              <User className="w-5 h-5" />
            )}
            Workspace Details
          </h2>
          <div className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Workspace Name</Label>
              <p className="text-lg font-medium">{activeOrganization?.name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Created</Label>
              <p className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {activeOrganization?.created_at ? new Date(activeOrganization.created_at).toLocaleDateString() : "N/A"}
              </p>
            </div>
            
            {/* Organization Type */}
            <div>
              <Label className="text-muted-foreground">Access Type</Label>
              {userRole === "owner" ? (
                <Select
                  value={activeOrganization?.organization_type || "personal"}
                  onValueChange={(value) => handleUpdateOrganizationType(value as "personal" | "company")}
                  disabled={savingSettings}
                >
                  <SelectTrigger className="w-[200px] mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Personal
                      </div>
                    </SelectItem>
                    <SelectItem value="company">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Company
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="flex items-center gap-2 mt-1">
                  {activeOrganization?.organization_type === "company" ? (
                    <>
                      <Building2 className="w-4 h-4" />
                      Company
                    </>
                  ) : (
                    <>
                      <User className="w-4 h-4" />
                      Personal
                    </>
                  )}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {activeOrganization?.organization_type === "company" 
                  ? "Company orgs can restrict signups by email domain"
                  : "Personal workspaces are auto-created for each user"}
              </p>
            </div>

            {/* Allowed Email Domains (only for company orgs) */}
            {activeOrganization?.organization_type === "company" && userRole === "owner" && (
              <div>
                <Label className="text-muted-foreground flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Allowed Email Domains
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Only users with these email domains can join via invitation. Leave empty to allow any email.
                </p>
                
                {/* Current domains */}
                <div className="flex flex-wrap gap-2 mb-2">
                  {(activeOrganization.allowed_email_domains || []).map((domain) => (
                    <Badge key={domain} variant="secondary" className="flex items-center gap-1">
                      @{domain}
                      <button
                        onClick={() => handleRemoveDomain(domain)}
                        disabled={savingSettings}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                  {(!activeOrganization.allowed_email_domains || activeOrganization.allowed_email_domains.length === 0) && (
                    <span className="text-sm text-muted-foreground italic">No restrictions - any email allowed</span>
                  )}
                </div>
                
                {/* Add domain form */}
                <div className="flex gap-2">
                  <Input
                    placeholder="example.com"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    disabled={savingSettings}
                    className="w-48"
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleAddDomain}
                    disabled={savingSettings || !newDomain.trim()}
                  >
                    Add Domain
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Workspace Ownership */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Crown className="w-5 h-5" />
            Workspace Ownership
          </h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Current Owner</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="default"><Crown className="w-3 h-3 mr-1" />Owner</Badge>
                <span className="font-medium">
                  {members.find(m => m.user_id === activeOrganization?.owner_id)?.profiles?.display_name || "Loading..."}
                </span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              The workspace owner is the legal data authority. Only the owner can transfer or delete this workspace.
            </p>
            {userRole === "owner" && (
              <Button
                variant="outline"
                onClick={() => setTransferDialogOpen(true)}
              >
                Transfer Ownership
              </Button>
            )}
          </div>
        </Card>

        <TransferOwnershipDialog
          open={transferDialogOpen}
          onOpenChange={setTransferDialogOpen}
          onTransferComplete={async () => {
            await refreshOrganizations();
            await loadOrganizationData();
          }}
        />

        {/* My Workspaces - show all workspaces the user has joined */}
        {organizations.length > 1 && (
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              My Workspaces ({organizations.length})
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              All workspaces you're a member of. Click to switch.
            </p>
            <div className="space-y-2">
              {organizations.map((org) => {
                const isActive = org.id === activeOrganization?.id;
                return (
                  <button
                    key={org.id}
                    onClick={async () => {
                      if (!isActive) {
                        const success = await switchOrganization(org.id);
                        if (success) {
                          toast.success(`Switched to ${org.name}`);
                          window.location.reload();
                        } else {
                          toast.error("Failed to switch workspace");
                        }
                      }
                    }}
                    className={`w-full flex items-center justify-between p-3 border rounded-lg transition-colors ${
                      isActive 
                        ? "border-primary bg-primary/5" 
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {org.organization_type === "company" ? (
                        <Building2 className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <User className="w-5 h-5 text-muted-foreground" />
                      )}
                      <div className="text-left">
                        <p className="font-medium">{org.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {org.organization_type} • {org.subscription_tier}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isActive ? (
                        <Badge variant="default" className="text-xs">Active</Badge>
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        )}

        {/* Subscription moved to Organisation Settings */}
        {hasAccountAccess && (
          <Card className="p-6 mb-6">
            <h2 className="text-lg font-semibold mb-2">Subscription & Billing</h2>
            <p className="text-sm text-muted-foreground mb-3">
              Subscription and usage limits are managed at the organisation level.
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link to="/organisation-settings">Go to Organisation Settings</Link>
            </Button>
          </Card>
        )}

        {/* Category Management */}
        {(userRole === "admin" || userRole === "owner") && (
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-semibold mb-2">Suggestion Categories</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Customize the categories available for suggestions in your workspace
            </p>
            <Button variant="outline" onClick={() => navigate("/categories")}>
              Manage Categories
            </Button>
          </Card>
        )}

        {/* Team Members */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Team Members ({members.length})</h2>
          
          <div className="space-y-3 mb-6">
            {members.map((member) => {
              const memberRole = member.user_roles[0]?.role;
              const isOwner = memberRole === "owner";
              const isSelf = member.user_id === user?.id;
              const canDelete = (userRole === "admin" || userRole === "owner") && !isOwner && !isSelf;
              
              return (
                <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{member.profiles?.display_name || "Unknown User"}</p>
                    <p className="text-sm text-muted-foreground">
                      {member.status === "active" 
                        ? `Joined ${member.joined_at ? new Date(member.joined_at).toLocaleDateString() : "N/A"}`
                        : `Invited ${new Date(member.invited_at).toLocaleDateString()}`
                      }
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(member.status)}
                    {memberRole && getRoleBadge(memberRole)}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => openDeleteDialog(member)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {(userRole === "admin" || userRole === "owner") && (
            <>
              <Separator className="my-4" />
              <form onSubmit={handleInviteMember} className="space-y-4">
                <div>
                  <Label htmlFor="invite-email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Invite New Member
                  </Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="colleague@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      disabled={inviting}
                    />
                    <Button type="submit" disabled={inviting || !inviteEmail}>
                      {inviting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Inviting...
                        </>
                      ) : (
                        "Send Invite"
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    An invitation email will be sent to this address. They'll have 7 days to accept.
                  </p>
                </div>
              </form>
            </>
          )}
        </Card>

        {/* Delete User Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                Delete User Account
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p>
                  Are you sure you want to delete <strong>{memberToDelete?.profiles?.display_name || "this user"}</strong>'s account?
                </p>
                <p className="text-destructive font-medium">
                  This action is permanent and cannot be undone.
                </p>
                <ul className="text-sm space-y-1 mt-2">
                  <li>• All their suggestions will be deleted</li>
                  <li>• All their comments will be removed</li>
                  <li>• All their reactions will be deleted</li>
                  <li>• Their user account will be permanently removed</li>
                </ul>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteMember}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete Account"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
};

export default OrganizationPage;