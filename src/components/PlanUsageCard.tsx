import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Crown, 
  Sparkles, 
  Users, 
  MessageSquare, 
  Loader2,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Clock
} from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface PlanLimits {
  maxSuggestions: number | null;
  maxMembers: number | null;
  aiEnabled: boolean;
  analyticsEnabled: boolean;
  brandingEnabled: boolean;
  prioritySupport: boolean;
}

interface Usage {
  suggestionsThisMonth: number;
  totalMembers: number;
}

const tierConfig: Record<string, { name: string; color: string; icon: typeof Crown; limits: PlanLimits }> = {
  free: {
    name: "Free",
    color: "bg-muted text-muted-foreground",
    icon: Users,
    limits: {
      maxSuggestions: 25,
      maxMembers: 3,
      aiEnabled: false,
      analyticsEnabled: false,
      brandingEnabled: false,
      prioritySupport: false,
    },
  },
  starter: {
    name: "Starter",
    color: "bg-green-500/10 text-green-600 border-green-500/20",
    icon: Sparkles,
    limits: {
      maxSuggestions: 250,
      maxMembers: 10,
      aiEnabled: true,
      analyticsEnabled: false,
      brandingEnabled: false,
      prioritySupport: false,
    },
  },
  pro: {
    name: "Pro",
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    icon: Sparkles,
    limits: {
      maxSuggestions: 1500,
      maxMembers: 25,
      aiEnabled: true,
      analyticsEnabled: true,
      brandingEnabled: false,
      prioritySupport: false,
    },
  },
  business: {
    name: "Business",
    color: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    icon: Crown,
    limits: {
      maxSuggestions: 5000,
      maxMembers: 100,
      aiEnabled: true,
      analyticsEnabled: true,
      brandingEnabled: true,
      prioritySupport: true,
    },
  },
  enterprise: {
    name: "Enterprise",
    color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    icon: Crown,
    limits: {
      maxSuggestions: null,
      maxMembers: null,
      aiEnabled: true,
      analyticsEnabled: true,
      brandingEnabled: true,
      prioritySupport: true,
    },
  },
};

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  active: { label: "Active", color: "bg-green-500/10 text-green-600 border-green-500/20", icon: CheckCircle },
  trialing: { label: "Trial", color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: Clock },
  past_due: { label: "Past Due", color: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: AlertTriangle },
  canceled: { label: "Canceled", color: "bg-red-500/10 text-red-600 border-red-500/20", icon: AlertTriangle },
  incomplete: { label: "Incomplete", color: "bg-gray-500/10 text-gray-600 border-gray-500/20", icon: Clock },
};

interface PlanUsageCardProps {
  organizationId: string;
  dbSubscriptionTier: string;
  dbSubscriptionStatus: string;
  trialEndsAt: string | null;
}

export const PlanUsageCard = ({ 
  organizationId, 
  dbSubscriptionTier, 
  dbSubscriptionStatus,
  trialEndsAt 
}: PlanUsageCardProps) => {
  const { subscribed, tier: stripeTier, subscriptionEnd, loading: stripeLoading, openCustomerPortal } = useSubscription();
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const navigate = useNavigate();

  // Use Stripe tier if subscribed, otherwise use DB tier
  const effectiveTier = subscribed ? stripeTier : dbSubscriptionTier;
  const config = tierConfig[effectiveTier] || tierConfig.free;
  const TierIcon = config.icon;
  
  const statusKey = subscribed ? "active" : dbSubscriptionStatus;
  const status = statusConfig[statusKey] || statusConfig.trialing;
  const StatusIcon = status.icon;

  useEffect(() => {
    const loadUsage = async () => {
      try {
        // Get current month suggestions count
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { count: suggestionsCount } = await supabase
          .from("suggestions")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", organizationId)
          .gte("created_at", startOfMonth.toISOString());

        // Get members count
        const { count: membersCount } = await supabase
          .from("organization_members")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", organizationId)
          .eq("status", "active");

        setUsage({
          suggestionsThisMonth: suggestionsCount || 0,
          totalMembers: membersCount || 0,
        });
      } catch (error) {
        console.error("Error loading usage:", error);
      } finally {
        setLoadingUsage(false);
      }
    };

    loadUsage();
  }, [organizationId]);

  const handleManageSubscription = async () => {
    if (!subscribed) {
      navigate("/pricing");
      return;
    }

    setPortalLoading(true);
    try {
      await openCustomerPortal();
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to open subscription management.",
        variant: "destructive",
      });
    } finally {
      setPortalLoading(false);
    }
  };

  const getUsagePercentage = (current: number, max: number | null) => {
    if (max === null) return 0; // unlimited
    return Math.min(100, Math.round((current / max) * 100));
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 75) return "bg-amber-500";
    return "bg-primary";
  };

  const trialDaysRemaining = trialEndsAt 
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const isIOSApp = /iPad|iPhone|iPod/.test(navigator.userAgent) && window.matchMedia('(display-mode: standalone)').matches;

  if (stripeLoading || loadingUsage) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-10 w-full" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      {/* Header with tier badge */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">Subscription & Usage</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={`${config.color} gap-1`}>
              <TierIcon className="w-3 h-3" />
              {config.name} Plan
            </Badge>
            <Badge variant="outline" className={`${status.color} gap-1`}>
              <StatusIcon className="w-3 h-3" />
              {status.label}
            </Badge>
          </div>
        </div>
        
        <Button
          variant={subscribed ? "outline" : "default"}
          size="sm"
          onClick={handleManageSubscription}
          disabled={portalLoading}
        >
          {portalLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : subscribed ? (
            <>
              Manage
              <ExternalLink className="w-3 h-3 ml-1" />
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-1" />
              Upgrade
            </>
          )}
        </Button>
      </div>

      {/* Trial warning */}
      {dbSubscriptionStatus === "trialing" && trialDaysRemaining > 0 && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
          <p className="text-sm font-medium flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            Trial ends in <span className="text-blue-600 font-bold">{trialDaysRemaining} days</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Upgrade to continue using all features after your trial ends
          </p>
        </div>
      )}

      {/* Subscription renewal */}
      {subscribed && subscriptionEnd && (
        <div className="text-sm text-muted-foreground mb-6">
          Next billing date: <span className="font-medium">{format(new Date(subscriptionEnd), "MMMM d, yyyy")}</span>
        </div>
      )}

      <Separator className="mb-6" />

      {/* Usage stats */}
      <div className="space-y-6">
        {/* Suggestions usage */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Suggestions this month</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {usage?.suggestionsThisMonth || 0}
              {config.limits.maxSuggestions !== null ? ` / ${config.limits.maxSuggestions}` : " (Unlimited)"}
            </span>
          </div>
          {config.limits.maxSuggestions !== null && (
            <Progress 
              value={getUsagePercentage(usage?.suggestionsThisMonth || 0, config.limits.maxSuggestions)} 
              className={`h-2 ${getUsageColor(getUsagePercentage(usage?.suggestionsThisMonth || 0, config.limits.maxSuggestions))}`}
            />
          )}
          {config.limits.maxSuggestions === null && (
            <div className="h-2 bg-primary/20 rounded-full overflow-hidden">
              <div className="h-full w-full bg-gradient-to-r from-primary/50 to-primary animate-pulse" />
            </div>
          )}
        </div>

        {/* Members usage */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Team members</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {usage?.totalMembers || 0}
              {config.limits.maxMembers !== null ? ` / ${config.limits.maxMembers}` : " (Unlimited)"}
            </span>
          </div>
          {config.limits.maxMembers !== null && (
            <Progress 
              value={getUsagePercentage(usage?.totalMembers || 0, config.limits.maxMembers)} 
              className={`h-2 ${getUsageColor(getUsagePercentage(usage?.totalMembers || 0, config.limits.maxMembers))}`}
            />
          )}
          {config.limits.maxMembers === null && (
            <div className="h-2 bg-primary/20 rounded-full overflow-hidden">
              <div className="h-full w-full bg-gradient-to-r from-primary/50 to-primary animate-pulse" />
            </div>
          )}
        </div>
      </div>

      <Separator className="my-6" />

      {/* Features included */}
      <div>
        <h3 className="text-sm font-medium mb-3">Features included</h3>
        <div className="grid grid-cols-2 gap-2">
          <FeatureItem enabled={config.limits.aiEnabled} label="AI Improvements" />
          <FeatureItem enabled={config.limits.analyticsEnabled} label="Advanced Analytics" />
          <FeatureItem enabled={config.limits.brandingEnabled} label="Custom Branding" />
          <FeatureItem enabled={config.limits.prioritySupport} label="Priority Support" />
        </div>
      </div>
    </Card>
  );
};

const FeatureItem = ({ enabled, label }: { enabled: boolean; label: string }) => (
  <div className={`flex items-center gap-2 text-sm ${enabled ? "text-foreground" : "text-muted-foreground line-through"}`}>
    {enabled ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <div className="w-4 h-4 rounded-full border-2 border-muted" />
    )}
    {label}
  </div>
);
