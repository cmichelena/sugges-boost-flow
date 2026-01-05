import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";

interface Suggestion {
  user_id: string | null;
  assigned_to_user_id: string | null;
  assigned_team_id: string | null;
  organization_id: string | null;
  escalated_to_user_id?: string | null;
  is_anonymous?: boolean;
}

export const useCanEscalate = (suggestion: Suggestion | null) => {
  const { user } = useAuth();
  const { activeOrganization } = useOrganization();
  const [isTeamMember, setIsTeamMember] = useState(false);
  const [isLeadershipMember, setIsLeadershipMember] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkMemberships = async () => {
      if (!user || !activeOrganization) {
        setIsTeamMember(false);
        setIsLeadershipMember(false);
        setLoading(false);
        return;
      }

      try {
        // Check if user is in the assigned team
        if (suggestion?.assigned_team_id) {
          const { data: teamMembership } = await supabase
            .from("team_members")
            .select("id")
            .eq("team_id", suggestion.assigned_team_id)
            .eq("user_id", user.id)
            .maybeSingle();
          
          setIsTeamMember(!!teamMembership);
        } else {
          setIsTeamMember(false);
        }

        // Check if user is in Leadership team
        const { data: leadershipCheck } = await supabase
          .rpc("is_leadership_member", {
            _user_id: user.id,
            _org_id: activeOrganization.id
          });
        
        setIsLeadershipMember(!!leadershipCheck);
      } catch (error) {
        console.error("Error checking memberships:", error);
        setIsTeamMember(false);
        setIsLeadershipMember(false);
      } finally {
        setLoading(false);
      }
    };

    checkMemberships();
  }, [user, suggestion?.assigned_team_id, activeOrganization]);

  const canEscalate = useMemo(() => {
    if (!user || !suggestion) return false;
    
    // Already escalated - can't escalate again
    if (suggestion.escalated_to_user_id) return false;
    
    // Leadership members can't escalate (they're the destination)
    if (isLeadershipMember) return false;
    
    // Original author can escalate (if not anonymous)
    if (!suggestion.is_anonymous && suggestion.user_id && user.id === suggestion.user_id) return true;
    
    // Assigned user can escalate
    if (suggestion.assigned_to_user_id && user.id === suggestion.assigned_to_user_id) return true;
    
    // Team members can escalate
    if (isTeamMember) return true;
    
    return false;
  }, [user, suggestion, isTeamMember, isLeadershipMember]);

  return { canEscalate, isLeadershipMember, loading };
};
