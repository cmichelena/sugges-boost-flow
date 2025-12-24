import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, Users, Crown, Calendar, Mail, CheckCircle, Clock, Sparkles, BarChart3, Palette, Headphones, Check, Trash2, AlertTriangle } from "lucide-react";
import { z } from "zod";
import { PlanUsageCard } from "@/components/PlanUsageCard";
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

const emailSchema = z.string().email("Please enter a valid email address");

interface Organization {
  id: string;
  name: string;
  subscription_tier: string;
  subscription_status: string;
  trial_ends_at: string;
  created_at: string;
}

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

interface SubscriptionPlan {
  id: string;
  name: string;
  tier: string;
  price_monthly: number;
  price_annual: number;
  max_suggestions_per_month: number | null;
  max_members: number | null;
  ai_improvements_enabled: boolean;
  advanced_analytics_enabled: boolean;
  custom_branding_enabled: boolean;
  priority_support_enabled: boolean;
}

const Settings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    loadOrganizationData();
  }, [user, navigate]);

  const loadOrganizationData = async () => {
    try {
      // Get user's organization
      const { data: orgMember, error: orgError } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .single();

      if (orgError) throw orgError;

      // Get organization details
      const { data: org, error: orgDetailsError } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", orgMember.organization_id)
        .single();

      if (orgDetailsError) throw orgDetailsError;
      setOrganization(org);

      // Get user's role
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .eq("organization_id", orgMember.organization_id)
        .single();

      if (roleError) throw roleError;
      setUserRole(roleData.role);

      // Get all organization members
      const { data: membersData, error: membersError } = await supabase
        .from("organization_members")
        .select("*")
        .eq("organization_id", orgMember.organization_id)
        .order("joined_at", { ascending: false });

      if (membersError) throw membersError;

      // Fetch profiles and roles separately
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
              .eq("organization_id", orgMember.organization_id)
          ]);

          return {
            ...member,
            profiles: profileResult.data,
            user_roles: rolesResult.data || []
          };
        })
      );

      setMembers(enrichedMembers);

      // Fetch available subscription plans
      const { data: plansData, error: plansError } = await supabase
        .from("subscription_plans")
        .select("*")
        .order("price_monthly", { ascending: true });

      if (!plansError && plansData) {
        setPlans(plansData);
      }
    } catch (error: any) {
      console.error("Error loading organization data:", error);
      toast.error("Failed to load organization data");
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);

    try {
      const validation = emailSchema.safeParse(inviteEmail);
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        setInviting(false);
        return;
      }

      // Check if user can invite (admin or owner)
      if (userRole !== "admin" && userRole !== "owner") {
        toast.error("Only admins and owners can invite members");
        setInviting(false);
        return;
      }

      if (!organization?.id) {
        toast.error("Organization not found");
        setInviting(false);
        return;
      }

      // Call edge function to send invitation
      const { data, error } = await supabase.functions.invoke("send-invitation", {
        body: {
          email: inviteEmail,
          organizationId: organization.id,
          role: "member",
        },
      });

      if (error) {
        throw error;
      }

      // Check if email was sent or if we need to show the link manually
      if (data?.acceptUrl) {
        // Email couldn't be sent, show the link to copy
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
      
      // Reload members list
      await loadOrganizationData();
    } catch (error: any) {
      console.error("Error inviting member:", error);
      
      // Parse the error response for user-friendly messages
      let errorMessage = "Failed to send invitation. Please try again.";
      
      try {
        // Check if error has context with a message from the edge function
        if (error.context?.body) {
          const parsed = JSON.parse(error.context.body);
          if (parsed.message) {
            errorMessage = parsed.message;
          } else if (parsed.error) {
            errorMessage = parsed.error;
          }
        } else if (error.message) {
          // Try to parse the error message if it's JSON
          try {
            const parsed = JSON.parse(error.message);
            if (parsed.message) {
              errorMessage = parsed.message;
            }
          } catch {
            // Check for common error patterns
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

  const getTrialDaysRemaining = () => {
    if (!organization?.trial_ends_at) return 0;
    const trialEnd = new Date(organization.trial_ends_at);
    const now = new Date();
    const diff = trialEnd.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const handleDeleteMember = async () => {
    if (!memberToDelete || !organization) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("delete-user-account", {
        body: {
          targetUserId: memberToDelete.user_id,
          organizationId: organization.id,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="font-bold mb-6">Organization Settings</h1>

        {/* Organization Info */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Organization Details
          </h2>
          <div className="space-y-3">
            <div>
              <Label className="text-muted-foreground">Organization Name</Label>
              <p className="text-lg font-medium">{organization?.name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Created</Label>
              <p className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {organization?.created_at ? new Date(organization.created_at).toLocaleDateString() : "N/A"}
              </p>
            </div>
          </div>
        </Card>

        {/* Subscription & Usage */}
        {organization && (
          <div className="mb-6">
            <PlanUsageCard
              organizationId={organization.id}
              dbSubscriptionTier={organization.subscription_tier}
              dbSubscriptionStatus={organization.subscription_status}
              trialEndsAt={organization.trial_ends_at}
            />
          </div>
        )}

        {/* Pricing Plans - Only for Admins/Owners */}
        {(userRole === "admin" || userRole === "owner") && plans.length > 0 && (
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-semibold mb-2">Available Plans</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Choose the plan that best fits your organization's needs
            </p>
            
            <div className="grid md:grid-cols-3 gap-4">
              {plans.map((plan) => {
                const isCurrentPlan = plan.tier === organization?.subscription_tier;
                
                return (
                  <Card 
                    key={plan.id} 
                    className={`p-5 relative ${isCurrentPlan ? 'border-primary border-2 shadow-lg' : ''}`}
                  >
                    {isCurrentPlan && (
                      <Badge className="absolute -top-2 right-4">Current Plan</Badge>
                    )}
                    
                    <div className="mb-4">
                      <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold">${plan.price_monthly}</span>
                        <span className="text-muted-foreground">/month</span>
                      </div>
                      {plan.price_annual > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          ${plan.price_annual}/year (save {Math.round((1 - (plan.price_annual / 12) / plan.price_monthly) * 100)}%)
                        </p>
                      )}
                    </div>

                    <Separator className="my-4" />

                    <ul className="space-y-3 mb-6">
                      {plan.max_suggestions_per_month && (
                        <li className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{plan.max_suggestions_per_month === -1 ? 'Unlimited' : plan.max_suggestions_per_month} suggestions/month</span>
                        </li>
                      )}
                      {plan.max_members && (
                        <li className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{plan.max_members === -1 ? 'Unlimited' : plan.max_members} team members</span>
                        </li>
                      )}
                      {plan.ai_improvements_enabled && (
                        <li className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <span className="flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            AI-powered improvements
                          </span>
                        </li>
                      )}
                      {plan.advanced_analytics_enabled && (
                        <li className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <span className="flex items-center gap-1">
                            <BarChart3 className="w-3 h-3" />
                            Advanced analytics
                          </span>
                        </li>
                      )}
                      {plan.custom_branding_enabled && (
                        <li className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <span className="flex items-center gap-1">
                            <Palette className="w-3 h-3" />
                            Custom branding
                          </span>
                        </li>
                      )}
                      {plan.priority_support_enabled && (
                        <li className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <span className="flex items-center gap-1">
                            <Headphones className="w-3 h-3" />
                            Priority support
                          </span>
                        </li>
                      )}
                    </ul>

                    <Button 
                      className="w-full" 
                      variant={isCurrentPlan ? "outline" : "default"}
                      disabled
                    >
                      {isCurrentPlan ? "Current Plan" : "Upgrade (Coming Soon)"}
                    </Button>
                  </Card>
                );
              })}
            </div>
          </Card>
        )}

        {/* Category Management */}
        {(userRole === "admin" || userRole === "owner") && (
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-semibold mb-2">Suggestion Categories</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Customize the categories available for suggestions in your organization
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
                  This action will permanently delete:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>All suggestions submitted by this user</li>
                  <li>All comments and reactions</li>
                  <li>All uploaded attachments</li>
                  <li>Team memberships</li>
                  <li>Their user profile and authentication data</li>
                </ul>
                <p className="font-semibold text-destructive">
                  This action cannot be undone.
                </p>
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
    </div>
  );
};

export default Settings;
