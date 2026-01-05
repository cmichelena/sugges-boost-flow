import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";

interface Suggestion {
  user_id: string | null;
  assigned_to_user_id: string | null;
  assigned_team_id: string | null;
  organization_id: string | null;
}

export const useCanManageSuggestion = (suggestion: Suggestion | null) => {
  const { user } = useAuth();
  const { userRole } = useOrganization();
  const [isTeamMember, setIsTeamMember] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkTeamMembership = async () => {
      if (!user || !suggestion?.assigned_team_id) {
        setIsTeamMember(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("team_members")
          .select("id")
          .eq("team_id", suggestion.assigned_team_id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Error checking team membership:", error);
          setIsTeamMember(false);
        } else {
          setIsTeamMember(!!data);
        }
      } catch (error) {
        console.error("Error checking team membership:", error);
        setIsTeamMember(false);
      } finally {
        setLoading(false);
      }
    };

    checkTeamMembership();
  }, [user, suggestion?.assigned_team_id]);

  const canManage = useMemo(() => {
    if (!user || !suggestion) return false;
    
    // Original author can always manage (except anonymous)
    if (suggestion.user_id && user.id === suggestion.user_id) return true;
    
    // Assigned user can manage
    if (suggestion.assigned_to_user_id && user.id === suggestion.assigned_to_user_id) return true;
    
    // Team members can manage
    if (isTeamMember) return true;
    
    // Admins/owners can manage
    if (userRole === 'admin' || userRole === 'owner') return true;
    
    return false;
  }, [user, suggestion, isTeamMember, userRole]);

  const isOwner = useMemo(() => {
    if (!user || !suggestion) return false;
    return suggestion.user_id === user.id;
  }, [user, suggestion]);

  return { canManage, isOwner, isTeamMember, loading };
};
