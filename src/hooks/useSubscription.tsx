import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface SubscriptionStatus {
  subscribed: boolean;
  tier: "free" | "pro" | "business" | "enterprise";
  subscriptionEnd: string | null;
  productId: string | null;
  loading: boolean;
  error: string | null;
}

export const useSubscription = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus>({
    subscribed: false,
    tier: "free",
    subscriptionEnd: null,
    productId: null,
    loading: true,
    error: null,
  });

  const checkSubscription = useCallback(async () => {
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
      setStatus((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to check subscription",
      }));
    }
  }, [user]);

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

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [checkSubscription]);

  return {
    ...status,
    refresh: checkSubscription,
    openCustomerPortal,
  };
};
