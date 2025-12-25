import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface Organization {
  id: string;
  name: string;
  subscription_tier: string;
  subscription_status: string;
  trial_ends_at: string | null;
  created_at: string;
}

interface OrganizationContextType {
  activeOrganization: Organization | null;
  organizations: Organization[];
  loading: boolean;
  userRole: string | null;
  switchOrganization: (orgId: string) => Promise<boolean>;
  refreshOrganizations: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const OrganizationProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [activeOrganization, setActiveOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  const loadOrganizations = useCallback(async () => {
    if (!user) {
      setActiveOrganization(null);
      setOrganizations([]);
      setUserRole(null);
      setLoading(false);
      return;
    }

    try {
      // Get all organizations user is a member of
      const { data: memberships, error: memberError } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .eq("status", "active");

      if (memberError) throw memberError;

      if (!memberships || memberships.length === 0) {
        setActiveOrganization(null);
        setOrganizations([]);
        setLoading(false);
        return;
      }

      const orgIds = memberships.map(m => m.organization_id);

      // Fetch organization details
      const { data: orgsData, error: orgsError } = await supabase
        .from("organizations")
        .select("id, name, subscription_tier, subscription_status, trial_ends_at, created_at")
        .in("id", orgIds)
        .order("created_at", { ascending: true });

      if (orgsError) throw orgsError;

      setOrganizations(orgsData || []);

      // Get user's active organization from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("active_organization_id")
        .eq("id", user.id)
        .single();

      let activeOrgId = profile?.active_organization_id;

      // If no active org set, or active org is not in user's memberships, use first org
      const validOrgIds = new Set(orgIds);
      if (!activeOrgId || !validOrgIds.has(activeOrgId)) {
        activeOrgId = orgsData?.[0]?.id;
        
        // Update profile with the default organization
        if (activeOrgId) {
          await supabase
            .from("profiles")
            .update({ active_organization_id: activeOrgId })
            .eq("id", user.id);
        }
      }

      const activeOrg = orgsData?.find(o => o.id === activeOrgId) || orgsData?.[0] || null;
      setActiveOrganization(activeOrg);

      // Load user role for active org
      if (activeOrg) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("organization_id", activeOrg.id)
          .single();

        setUserRole(roleData?.role || null);
      }
    } catch (error) {
      console.error("Error loading organizations:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const switchOrganization = useCallback(async (orgId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      // Use the secure function to validate and switch
      const { data, error } = await supabase.rpc("set_active_organization", {
        _user_id: user.id,
        _org_id: orgId
      });

      if (error) throw error;

      if (data) {
        const newOrg = organizations.find(o => o.id === orgId);
        if (newOrg) {
          setActiveOrganization(newOrg);

          // Reload user role for new org
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .eq("organization_id", orgId)
            .single();

          setUserRole(roleData?.role || null);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error switching organization:", error);
      return false;
    }
  }, [user, organizations]);

  const refreshOrganizations = useCallback(async () => {
    await loadOrganizations();
  }, [loadOrganizations]);

  useEffect(() => {
    loadOrganizations();
  }, [loadOrganizations]);

  return (
    <OrganizationContext.Provider value={{
      activeOrganization,
      organizations,
      loading,
      userRole,
      switchOrganization,
      refreshOrganizations
    }}>
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error("useOrganization must be used within an OrganizationProvider");
  }
  return context;
};
