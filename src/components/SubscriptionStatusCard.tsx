import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Crown, CreditCard, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { isIOSApp } from "@/lib/platform";

const tierConfig = {
  free: {
    name: "Free",
    color: "bg-muted text-muted-foreground",
    icon: null,
    description: "25 suggestions/month, 3 team members",
  },
  starter: {
    name: "Starter",
    color: "bg-green-500/10 text-green-600 border-green-500/20",
    icon: Sparkles,
    description: "250 suggestions/month, 10 team members",
  },
  pro: {
    name: "Pro",
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    icon: Sparkles,
    description: "1,500 suggestions/month, 25 team members",
  },
  business: {
    name: "Business",
    color: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    icon: Crown,
    description: "5,000+ suggestions/month, 100 team members",
  },
  enterprise: {
    name: "Enterprise",
    color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    icon: Crown,
    description: "Unlimited suggestions and team members",
  },
};

export const SubscriptionStatusCard = () => {
  const iosApp = isIOSApp();
  const { subscribed, tier, subscriptionEnd, loading, error, refresh, openCustomerPortal } = useSubscription();
  const [portalLoading, setPortalLoading] = useState(false);
  const navigate = useNavigate();

  const config = tierConfig[tier] || tierConfig.free;
  const TierIcon = config.icon;

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
        description: "Failed to open subscription management. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-9 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Subscription
          </CardTitle>
          <CardDescription className="text-destructive">
            Failed to load subscription status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" onClick={refresh} className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Your Plan
          </CardTitle>
          <Badge variant="outline" className={config.color}>
            {TierIcon && <TierIcon className="w-3 h-3 mr-1" />}
            {config.name}
          </Badge>
        </div>
        <CardDescription>
          {config.description}
          {subscribed && subscriptionEnd && (
            <span className="block mt-1 text-xs">
              Renews {format(new Date(subscriptionEnd), "MMM d, yyyy")}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {iosApp ? (
          <p className="text-xs text-muted-foreground text-center">
            This feature is managed by your organisation admin.
          </p>
        ) : (
          <Button
            variant={subscribed ? "outline" : "default"}
            size="sm"
            onClick={handleManageSubscription}
            disabled={portalLoading}
            className="w-full"
          >
            {portalLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : subscribed ? (
              "Manage Subscription"
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Upgrade Plan
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
