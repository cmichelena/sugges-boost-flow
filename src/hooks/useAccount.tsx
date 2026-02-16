import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface Account {
  id: string;
  name: string;
  owner_id: string;
  billing_email: string | null;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
}

interface AccountMember {
  id: string;
  account_id: string;
  user_id: string;
  role: string;
  created_at: string;
}

interface AccountContextType {
  activeAccount: Account | null;
  accounts: Account[];
  loading: boolean;
  userAccountRole: string | null;
  switchAccount: (accountId: string) => void;
  refreshAccounts: () => Promise<void>;
  hasAccountAccess: boolean;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export const AccountProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [activeAccount, setActiveAccount] = useState<Account | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [userAccountRole, setUserAccountRole] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    if (!user) {
      setActiveAccount(null);
      setAccounts([]);
      setUserAccountRole(null);
      setLoading(false);
      return;
    }

    try {
      // Get accounts where user is owner
      const { data: ownedAccounts } = await supabase
        .from("accounts")
        .select("*");

      // Get accounts where user is a member
      const { data: memberships } = await supabase
        .from("account_members")
        .select("account_id, role")
        .eq("user_id", user.id);

      const memberAccountIds = memberships?.map(m => m.account_id) || [];
      
      let memberAccounts: Account[] = [];
      if (memberAccountIds.length > 0) {
        const { data } = await supabase
          .from("accounts")
          .select("*")
          .in("id", memberAccountIds);
        memberAccounts = (data || []) as Account[];
      }

      // Merge owned + member accounts (deduplicate)
      const allAccounts = [...(ownedAccounts || []) as Account[]];
      for (const acc of memberAccounts) {
        if (!allAccounts.find(a => a.id === acc.id)) {
          allAccounts.push(acc);
        }
      }

      setAccounts(allAccounts);

      // Restore active account from localStorage
      const savedAccountId = localStorage.getItem(`active_account_${user.id}`);
      let active = allAccounts.find(a => a.id === savedAccountId) || allAccounts[0] || null;
      setActiveAccount(active);

      // Set user role for active account
      if (active) {
        if (active.owner_id === user.id) {
          setUserAccountRole("owner");
        } else {
          const membership = memberships?.find(m => m.account_id === active!.id);
          setUserAccountRole(membership?.role || null);
        }
      }
    } catch (error) {
      console.error("Error loading accounts:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const switchAccount = useCallback((accountId: string) => {
    if (!user) return;
    const account = accounts.find(a => a.id === accountId);
    if (account) {
      setActiveAccount(account);
      localStorage.setItem(`active_account_${user.id}`, accountId);
      
      // Update role
      if (account.owner_id === user.id) {
        setUserAccountRole("owner");
      } else {
        // Fetch role
        supabase
          .from("account_members")
          .select("role")
          .eq("account_id", accountId)
          .eq("user_id", user.id)
          .single()
          .then(({ data }) => {
            setUserAccountRole(data?.role || null);
          });
      }
    }
  }, [user, accounts]);

  const refreshAccounts = useCallback(async () => {
    await loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const hasAccountAccess = accounts.length > 0;

  return (
    <AccountContext.Provider value={{
      activeAccount,
      accounts,
      loading,
      userAccountRole,
      switchAccount,
      refreshAccounts,
      hasAccountAccess,
    }}>
      {children}
    </AccountContext.Provider>
  );
};

export const useAccount = () => {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error("useAccount must be used within an AccountProvider");
  }
  return context;
};
