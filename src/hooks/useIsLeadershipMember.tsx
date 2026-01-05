import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";

export const useIsLeadershipMember = () => {
  const { user } = useAuth();
  const { activeOrganization } = useOrganization();
  const [isLeadershipMember, setIsLeadershipMember] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkLeadershipMembership = async () => {
      if (!user || !activeOrganization) {
        setIsLeadershipMember(false);
        setLoading(false);
        return;
      }

      try {
        const { data } = await supabase
          .rpc("is_leadership_member", {
            _user_id: user.id,
            _org_id: activeOrganization.id
          });
        
        setIsLeadershipMember(!!data);
      } catch (error) {
        console.error("Error checking leadership membership:", error);
        setIsLeadershipMember(false);
      } finally {
        setLoading(false);
      }
    };

    checkLeadershipMembership();
  }, [user, activeOrganization]);

  return { isLeadershipMember, loading };
};
