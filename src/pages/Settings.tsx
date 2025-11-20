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
import { Loader2, Users, Crown, Calendar, Mail, CheckCircle, Clock } from "lucide-react";
import { z } from "zod";

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

const Settings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);

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

      // TODO: Implement actual invite logic
      // For now, just show a success message
      toast.success("Invitation sent! (Note: Email invites not yet implemented)");
      setInviteEmail("");
    } catch (error: any) {
      toast.error(error.message);
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

  const trialDays = getTrialDaysRemaining();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">Organization Settings</h1>

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

        {/* Current Plan */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Current Plan</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-muted-foreground">Subscription Tier</Label>
                <p className="text-lg font-medium capitalize">{organization?.subscription_tier}</p>
              </div>
              <Badge variant={organization?.subscription_status === "trialing" ? "default" : "secondary"}>
                {organization?.subscription_status}
              </Badge>
            </div>
            
            {organization?.subscription_status === "trialing" && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                <p className="text-sm font-medium">
                  Trial ends in <span className="text-primary font-bold">{trialDays} days</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Upgrade to continue using premium features after your trial ends
                </p>
              </div>
            )}
          </div>
          <Separator className="my-4" />
          <Button variant="outline" disabled>
            Upgrade Plan (Coming Soon)
          </Button>
        </Card>

        {/* Team Members */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Team Members ({members.length})</h2>
          
          <div className="space-y-3 mb-6">
            {members.map((member) => (
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
                  {member.user_roles[0] && getRoleBadge(member.user_roles[0].role)}
                </div>
              </div>
            ))}
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
                    Note: Email invitations are not yet implemented. This is a placeholder for future functionality.
                  </p>
                </div>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Settings;
