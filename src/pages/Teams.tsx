import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { AppLayout } from "@/components/AppLayout";
import { toast } from "sonner";
import { Loader2, Plus, Users, Trash2, UserPlus, Crown, User, ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { isIOSApp } from "@/lib/platform";
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
  const [loading, setLoading] = useState(true);
  const [newTeamName, setNewTeamName] = useState("");
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [selectedTeamForMember, setSelectedTeamForMember] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'team' | 'member', id: string, teamId?: string } | null>(null);
  const navigate = useNavigate();
  const { activeOrganization, userRole, loading: orgLoading } = useOrganization();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!orgLoading && activeOrganization) {
      fetchData();
    }
  }, [navigate, user, orgLoading, activeOrganization]);

  const fetchData = async () => {
    if (!activeOrganization || !user) return;

    // Check if user is admin/owner
    if (userRole !== "admin" && userRole !== "owner") {
      toast.error("You don't have permission to manage teams");
      navigate("/");
      return;
    }

    // Load teams
    await loadTeams(activeOrganization.id);

    // Load organization members
    const { data: members } = await supabase
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", activeOrganization.id)
      .eq("status", "active");

    if (members) {
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
    if (!newTeamName.trim() || !activeOrganization) return;

    setCreatingTeam(true);
    const { error } = await supabase
      .from("teams")
      .insert({
        organization_id: activeOrganization.id,
        name: newTeamName.trim(),
      });

    if (error) {
      toast.error("Failed to create team");
    } else {
      toast.success("Team created successfully");
      setNewTeamName("");
      loadTeams(activeOrganization.id);
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
      if (activeOrganization) loadTeams(activeOrganization.id);
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
      if (activeOrganization) loadTeams(activeOrganization.id);
    }
    setDeleteConfirm(null);
  };

  const handleAddMember = async () => {
    if (!selectedTeamForMember || !selectedUserId) {
      toast.error("Please select a member to add");
      return;
    }

    const teamId = selectedTeamForMember;
    const userId = selectedUserId;

    const { error } = await supabase
      .from("team_members")
      .insert({
        team_id: teamId,
        user_id: userId,
        role: "member",
      });

    if (error) {
      console.error("Error adding member:", error);
      toast.error("Failed to add member: " + (error.message || "Unknown error"));
    } else {
      toast.success("Member added successfully");
      await loadTeamMembers(teamId);
    }
    
    setSelectedUserId("");
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
      <AppLayout>
        <div className="container mx-auto px-4 py-8 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  const iosApp = isIOSApp();

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-bold">Teams</h1>
              <p className="text-muted-foreground">Manage teams and assign responsibilities</p>
            </div>
          </div>

          {iosApp && (
            <p className="text-sm text-muted-foreground mb-6">
              Team management is handled on suggistit.com.
            </p>
          )}

          {/* Create Team — hidden on iOS per App Store guidelines */}
          {!iosApp && (
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
          )}

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
                        {!iosApp && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteConfirm({ type: 'team', id: team.id })}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t pt-4 space-y-4">
                        {/* Add Member — hidden on iOS per App Store guidelines */}
                        {!iosApp && (
                          <div className="flex gap-2">
                            <Select
                              value={selectedTeamForMember === team.id ? selectedUserId : ""}
                              onValueChange={(val) => {
                                setSelectedTeamForMember(team.id);
                                setSelectedUserId(val);
                              }}
                            >
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder={availableMembers.length === 0 ? "No available members" : "Add team member..."} />
                              </SelectTrigger>
                              <SelectContent className="bg-background z-50">
                                {availableMembers.length === 0 ? (
                                  <div className="py-2 px-3 text-sm text-muted-foreground">
                                    All organization members are already in this team
                                  </div>
                                ) : (
                                  availableMembers.map((member) => (
                                    <SelectItem key={member.user_id} value={member.user_id}>
                                      {member.profiles?.display_name || 'Unknown User'}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            <Button
                              onClick={handleAddMember}
                              disabled={!selectedUserId || selectedTeamForMember !== team.id || availableMembers.length === 0}
                              size="sm"
                            >
                              <UserPlus className="w-4 h-4" />
                            </Button>
                          </div>
                        )}

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
                                {!iosApp && member.role === "member" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePromoteToLead(team.id, member.id, member.user_id)}
                                  >
                                    Promote to Lead
                                  </Button>
                                )}
                                {!iosApp && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setDeleteConfirm({ type: 'member', id: member.id, teamId: team.id })}
                                  >
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                )}
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
    </AppLayout>
  );
};

export default Teams;
