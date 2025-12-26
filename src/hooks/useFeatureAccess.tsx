import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type Feature = "ai_improvements" | "advanced_analytics" | "custom_branding" | "priority_support" | "create_company_org";

interface FeatureConfig {
  ai_improvements: boolean;
  advanced_analytics: boolean;
  custom_branding: boolean;
  priority_support: boolean;
  create_company_org: boolean;
  max_suggestions: number | null;
  max_members: number | null;
}

const tierFeatures: Record<string, FeatureConfig> = {
  free: {
    ai_improvements: false,
    advanced_analytics: false,
    custom_branding: false,
    priority_support: false,
    create_company_org: false,
    max_suggestions: 25,
    max_members: 5,
  },
  starter: {
    ai_improvements: false,
    advanced_analytics: false,
    custom_branding: false,
    priority_support: false,
    create_company_org: true,
    max_suggestions: 250,
    max_members: 10,
  },
  pro: {
    ai_improvements: true,
    advanced_analytics: true,
    custom_branding: false,
    priority_support: false,
    create_company_org: true,
    max_suggestions: 500,
    max_members: 50,
  },
  business: {
    ai_improvements: true,
    advanced_analytics: true,
    custom_branding: true,
    priority_support: true,
    create_company_org: true,
    max_suggestions: null,
    max_members: 200,
  },
  enterprise: {
    ai_improvements: true,
    advanced_analytics: true,
    custom_branding: true,
    priority_support: true,
    create_company_org: true,
    max_suggestions: null,
    max_members: null,
  },
  forever: {
    ai_improvements: true,
    advanced_analytics: false,
    custom_branding: false,
    priority_support: false,
    create_company_org: true,
    max_suggestions: 200,
    max_members: 10,
  },
};

const featureNames: Record<Feature, string> = {
  ai_improvements: "AI-Powered Improvements",
  advanced_analytics: "Advanced Analytics",
  custom_branding: "Custom Branding",
  priority_support: "Priority Support",
  create_company_org: "Create Company Organization",
};

const featureDescriptions: Record<Feature, string> = {
  ai_improvements: "Let AI enhance your suggestions with better clarity and professional language.",
  advanced_analytics: "Access detailed insights and reports about your organization's suggestions.",
  custom_branding: "Customize your workspace with your organization's branding.",
  priority_support: "Get faster response times from our support team.",
  create_company_org: "Create company organizations with domain restrictions and team management.",
};

const featureMinTier: Record<Feature, string> = {
  ai_improvements: "Pro",
  advanced_analytics: "Pro",
  custom_branding: "Business",
  priority_support: "Business",
  create_company_org: "Starter",
};

export interface FeatureAccessState {
  tier: string;
  loading: boolean;
  hasAccess: (feature: Feature) => boolean;
  getFeatureConfig: () => FeatureConfig;
  getFeatureName: (feature: Feature) => string;
  getFeatureDescription: (feature: Feature) => string;
  getMinTierForFeature: (feature: Feature) => string;
  refresh: () => Promise<void>;
}

export const useFeatureAccess = (): FeatureAccessState => {
  const { user } = useAuth();
  const [tier, setTier] = useState<string>("free");
  const [loading, setLoading] = useState(true);

  const loadTier = useCallback(async () => {
    if (!user) {
      setTier("free");
      setLoading(false);
      return;
    }

    try {
      // First check Stripe subscription status
      const { data: stripeData, error: stripeError } = await supabase.functions.invoke("check-subscription");
      
      if (!stripeError && stripeData?.subscribed && stripeData?.tier) {
        setTier(stripeData.tier);
        setLoading(false);
        return;
      }

      // Fall back to database subscription tier (also handles auth errors gracefully)
      const { data: orgMember } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .single();

      if (orgMember) {
        const { data: org } = await supabase
          .from("organizations")
          .select("subscription_tier")
          .eq("id", orgMember.organization_id)
          .single();

        if (org) {
          setTier(org.subscription_tier);
        }
      }
    } catch (error) {
      console.error("Error loading subscription tier:", error);
      // On any error, default to free tier
      setTier("free");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadTier();
  }, [loadTier]);

  const hasAccess = useCallback((feature: Feature): boolean => {
    const config = tierFeatures[tier] || tierFeatures.free;
    return config[feature];
  }, [tier]);

  const getFeatureConfig = useCallback((): FeatureConfig => {
    return tierFeatures[tier] || tierFeatures.free;
  }, [tier]);

  const getFeatureName = useCallback((feature: Feature): string => {
    return featureNames[feature];
  }, []);

  const getFeatureDescription = useCallback((feature: Feature): string => {
    return featureDescriptions[feature];
  }, []);

  const getMinTierForFeature = useCallback((feature: Feature): string => {
    return featureMinTier[feature];
  }, []);

  return {
    tier,
    loading,
    hasAccess,
    getFeatureConfig,
    getFeatureName,
    getFeatureDescription,
    getMinTierForFeature,
    refresh: loadTier,
  };
};
