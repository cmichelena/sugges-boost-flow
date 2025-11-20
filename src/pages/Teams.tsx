import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { toast } from "sonner";
import { Loader2, Plus, Users, Trash2, UserPlus, Crown, User, ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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

interface Team {
  id: string;
  name: string;
  is_active: boolean;
  organization_id: string;
}

interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: "lead" | "member";
  profiles: {
    display_name: string | null;
  };
}

interface OrgMember {
  user_id: string;
  profiles: {
    display_name: string | null;
  };
}

const Teams = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [teamMembers, setTeamMembers] = useState<Record<string, TeamMember[]>>({});
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [newTeamName, setNewTeamName] = useState("");
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [selectedTeamForMember, setSelectedTeamForMember] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'team' | 'member', id: string, teamId?: string } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    // Get organization
    const { data: orgMember, error: orgError } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", session.user.id)
      .eq("status", "active")
      .single();

    if (orgError || !orgMember) {
      toast.error("Failed to load organization");
      setLoading(false);
      return;
    }

    setOrganizationId(orgMember.organization_id);

    // Check if user is admin/owner
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("organization_id", orgMember.organization_id)
      .in("role", ["admin", "owner"])
      .single();

    if (!role) {
      toast.error("You don't have permission to manage teams");
      navigate("/");
      return;
    }

    // Load teams
    await loadTeams(orgMember.organization_id);

    // Load organization members
    const { data: members } = await supabase
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", orgMember.organization_id)
      .eq("status", "active");

    if (members) {
      // Fetch profiles separately
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", members.map(m => m.user_id));

      const membersWithProfiles = members.map(m => ({
        user_id: m.user_id,
        profiles: profiles?.find(p => p.id === m.user_id) || { display_name: null }
      }));

      setOrgMembers(membersWithProfiles);
    }

    setLoading(false);
  };

  const loadTeams = async (orgId: string) => {
    const { data: teamsData, error } = await supabase
      .from("teams")
      .select("*")
      .eq("organization_id", orgId)
      .order("name");

    if (error) {
      toast.error("Failed to load teams");
      return;
    }

    setTeams(teamsData || []);
  };

  const loadTeamMembers = async (teamId: string) => {
    const { data, error } = await supabase
      .from("team_members")
      .select("id, team_id, user_id, role")
      .eq("team_id", teamId);

    if (error) {
      toast.error("Failed to load team members");
      return;
    }

    if (data && data.length > 0) {
      // Fetch profiles separately
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", data.map(m => m.user_id));

      const membersWithProfiles = data.map(m => ({
        ...m,
        profiles: profiles?.find(p => p.id === m.user_id) || { display_name: null }
      }));

      setTeamMembers(prev => ({ ...prev, [teamId]: membersWithProfiles }));
    } else {
      setTeamMembers(prev => ({ ...prev, [teamId]: [] }));
    }
  };

  const toggleTeamExpand = (teamId: string) => {
    const newExpanded = new Set(expandedTeams);
    if (newExpanded.has(teamId)) {
      newExpanded.delete(teamId);
    } else {
      newExpanded.add(teamId);
      if (!teamMembers[teamId]) {
        loadTeamMembers(teamId);
      }
    }
    setExpandedTeams(newExpanded);
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim() || !organizationId) return;

    setCreatingTeam(true);
    const { error } = await supabase
      .from("teams")
      .insert({
        organization_id: organizationId,
        name: newTeamName.trim(),
      });

    if (error) {
      toast.error("Failed to create team");
    } else {
      toast.success("Team created successfully");
      setNewTeamName("");
      loadTeams(organizationId);
    }
    setCreatingTeam(false);
  };

  const handleToggleActive = async (teamId: string, isActive: boolean) => {
    const { error } = await supabase
      .from("teams")
      .update({ is_active: !isActive })
      .eq("id", teamId);

    if (error) {
      toast.error("Failed to update team");
    } else {
      toast.success(isActive ? "Team deactivated" : "Team activated");
      if (organizationId) loadTeams(organizationId);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    const { error } = await supabase
      .from("teams")
      .delete()
      .eq("id", teamId);

    if (error) {
      toast.error("Failed to delete team");
    } else {
      toast.success("Team deleted");
      if (organizationId) loadTeams(organizationId);
    }
    setDeleteConfirm(null);
  };

  const handleAddMember = async () => {
    if (!selectedTeamForMember || !selectedUserId) return;

    const { error } = await supabase
      .from("team_members")
      .insert({
        team_id: selectedTeamForMember,
        user_id: selectedUserId,
        role: "member",
      });

    if (error) {
      toast.error("Failed to add member");
    } else {
      toast.success("Member added successfully");
      loadTeamMembers(selectedTeamForMember);
      setSelectedUserId("");
    }
    setSelectedTeamForMember(null);
  };

  const handlePromoteToLead = async (teamId: string, memberId: string, userId: string) => {
    // First, demote any existing leads
    await supabase
      .from("team_members")
      .update({ role: "member" })
      .eq("team_id", teamId)
      .eq("role", "lead");

    // Then promote this member
    const { error } = await supabase
      .from("team_members")
      .update({ role: "lead" })
      .eq("id", memberId);

    if (error) {
      toast.error("Failed to promote to lead");
    } else {
      toast.success("Member promoted to team lead");
      loadTeamMembers(teamId);
    }
  };

  const handleRemoveMember = async (memberId: string, teamId: string) => {
    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("id", memberId);

    if (error) {
      toast.error("Failed to remove member");
    } else {
      toast.success("Member removed");
      loadTeamMembers(teamId);
    }
    setDeleteConfirm(null);
  };

  const getAvailableMembers = (teamId: string) => {
    const currentMembers = teamMembers[teamId] || [];
    const currentMemberIds = new Set(currentMembers.map(m => m.user_id));
    return orgMembers.filter(m => !currentMemberIds.has(m.user_id));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Teams</h1>
              <p className="text-muted-foreground">Manage teams and assign responsibilities</p>
            </div>
          </div>

          {/* Create Team */}
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Create New Team
            </h2>
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Team name"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateTeam()}
                />
              </div>
              <Button onClick={handleCreateTeam} disabled={creatingTeam || !newTeamName.trim()}>
                {creatingTeam && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Team
              </Button>
            </div>
          </Card>

          {/* Teams List */}
          <div className="space-y-4">
            {teams.length === 0 ? (
              <Card className="p-8 text-center">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No teams yet. Create your first team above.</p>
              </Card>
            ) : (
              teams.map((team) => {
                const members = teamMembers[team.id] || [];
                const lead = members.find(m => m.role === "lead");
                const isExpanded = expandedTeams.has(team.id);
                const availableMembers = getAvailableMembers(team.id);

                return (
                  <Card key={team.id} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 flex-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleTeamExpand(team.id)}
                          className="p-1 h-auto"
                        >
                          {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                        </Button>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold">{team.name}</h3>
                            {!team.is_active && <Badge variant="secondary">Inactive</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {members.length} member{members.length !== 1 ? 's' : ''}
                            {lead && ` · Lead: ${lead.profiles?.display_name || 'Unknown'}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm">Active</Label>
                          <Switch
                            checked={team.is_active}
                            onCheckedChange={() => handleToggleActive(team.id, team.is_active)}
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteConfirm({ type: 'team', id: team.id })}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t pt-4 space-y-4">
                        {/* Add Member */}
                        <div className="flex gap-2">
                          <Select
                            value={selectedTeamForMember === team.id ? selectedUserId : ""}
                            onValueChange={(val) => {
                              setSelectedTeamForMember(team.id);
                              setSelectedUserId(val);
                            }}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Add team member..." />
                            </SelectTrigger>
                            <SelectContent className="bg-background z-50">
                              {availableMembers.map((member) => (
                                <SelectItem key={member.user_id} value={member.user_id}>
                                  {member.profiles?.display_name || 'Unknown User'}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            onClick={handleAddMember}
                            disabled={!selectedUserId || selectedTeamForMember !== team.id}
                            size="sm"
                          >
                            <UserPlus className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* Members List */}
                        <div className="space-y-2">
                          {members.map((member) => (
                            <div
                              key={member.id}
                              className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                            >
                              <div className="flex items-center gap-2">
                                {member.role === "lead" ? (
                                  <Crown className="w-4 h-4 text-primary" />
                                ) : (
                                  <User className="w-4 h-4 text-muted-foreground" />
                                )}
                                <span>{member.profiles?.display_name || 'Unknown User'}</span>
                                {member.role === "lead" && (
                                  <Badge variant="default" className="text-xs">Lead</Badge>
                                )}
                              </div>
                              <div className="flex gap-2">
                                {member.role === "member" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePromoteToLead(team.id, member.id, member.user_id)}
                                  >
                                    Promote to Lead
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteConfirm({ type: 'member', id: member.id, teamId: team.id })}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          ))}
                          {members.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No members yet. Add members above.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm?.type === 'team'
                ? "This will delete the team and remove all member assignments. This action cannot be undone."
                : "This will remove this member from the team."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirm?.type === 'team') {
                  handleDeleteTeam(deleteConfirm.id);
                } else if (deleteConfirm?.type === 'member' && deleteConfirm.teamId) {
                  handleRemoveMember(deleteConfirm.id, deleteConfirm.teamId);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Teams;
