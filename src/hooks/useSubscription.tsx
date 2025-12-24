import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface SubscriptionStatus {
  subscribed: boolean;
  tier: "free" | "starter" | "pro" | "business" | "enterprise";
  subscriptionEnd: string | null;
  productId: string | null;
  loading: boolean;
  error: string | null;
}

export const useSubscription = () => {
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus>({
    subscribed: false,
    tier: "free",
    subscriptionEnd: null,
    productId: null,
    loading: true,
    error: null,
  });

  const checkSubscription = useCallback(async () => {
    // Don't check subscription if auth is still loading or no user
    if (authLoading) {
      return;
    }
    
    if (!user) {
      setStatus({
        subscribed: false,
        tier: "free",
        subscriptionEnd: null,
        productId: null,
        loading: false,
        error: null,
      });
      return;
    }

    setStatus((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");

      if (error) {
        throw error;
      }

      setStatus({
        subscribed: data.subscribed || false,
        tier: data.tier || "free",
        subscriptionEnd: data.subscription_end || null,
        productId: data.product_id || null,
        loading: false,
        error: null,
      });
    } catch (err) {
      console.error("Error checking subscription:", err);
      // Don't show error for auth issues - just default to free tier
      setStatus({
        subscribed: false,
        tier: "free",
        subscriptionEnd: null,
        productId: null,
        loading: false,
        error: null,
      });
    }
  }, [user, authLoading]);

  const openCustomerPortal = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");

      if (error) {
        throw error;
      }

      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err) {
      console.error("Error opening customer portal:", err);
      throw err;
    }
  };

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Auto-refresh every 60 seconds (only when user is authenticated)
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [checkSubscription, user]);

  return {
    ...status,
    refresh: checkSubscription,
    openCustomerPortal,
  };
};
