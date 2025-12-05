import { useState } from "react";
import { Check, Crown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { STRIPE_TIERS, getStripePriceId, type StripeTier } from "@/lib/stripe-config";

interface PricingTier {
  name: string;
  tier: string;
  priceMonthly: number;
  priceAnnual: number;
  isLifetime: boolean;
  comingSoon: boolean;
  popular?: boolean;
  features: string[];
  maxMembers: number | null;
  maxSuggestions: number | null;
  stripeEnabled?: boolean;
}

const Pricing = () => {
  const [isAnnual, setIsAnnual] = useState(false);
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const tiers: PricingTier[] = [
    {
      name: "Free",
      tier: "free",
      priceMonthly: 0,
      priceAnnual: 0,
      isLifetime: false,
      comingSoon: false,
      features: [
        "25 suggestions/month",
        "Up to 5 team members",
        "Basic features",
      ],
      maxMembers: 5,
      maxSuggestions: 25,
    },
    {
      name: "Forever (Lifetime Access)",
      tier: "forever",
      priceMonthly: 199,
      priceAnnual: 0,
      isLifetime: true,
      comingSoon: true,
      features: [
        "Up to 10 team members",
        "200 suggestions/month",
        "AI improvements",
        "Basic analytics",
        "Self-service support",
      ],
      maxMembers: 10,
      maxSuggestions: 200,
    },
    {
      name: "Pro",
      tier: "pro",
      priceMonthly: 69,
      priceAnnual: 650,
      isLifetime: false,
      comingSoon: false,
      stripeEnabled: true,
      features: [
        "Up to 50 team members",
        "500 suggestions/month",
        "AI improvements",
        "Basic analytics",
        "Email support",
      ],
      maxMembers: 50,
      maxSuggestions: 500,
    },
    {
      name: "Business",
      tier: "business",
      priceMonthly: 199,
      priceAnnual: 1990,
      isLifetime: false,
      comingSoon: false,
      stripeEnabled: true,
      popular: true,
      features: [
        "Up to 200 team members",
        "Unlimited suggestions",
        "AI improvements",
        "Advanced analytics",
        "Custom branding",
        "Priority support",
      ],
      maxMembers: 200,
      maxSuggestions: null,
    },
    {
      name: "Enterprise",
      tier: "enterprise",
      priceMonthly: 0,
      priceAnnual: 0,
      isLifetime: false,
      comingSoon: true,
      features: [
        "Unlimited users",
        "Unlimited suggestions",
        "All features",
        "Enterprise integrations",
        "SLA & onboarding",
      ],
      maxMembers: null,
      maxSuggestions: null,
    },
  ];

  const formatPrice = (tier: PricingTier) => {
    if (tier.tier === "enterprise") {
      return "Custom Pricing";
    }
    
    if (tier.isLifetime) {
      return `€${tier.priceMonthly} one-time`;
    }

    if (tier.priceMonthly === 0) {
      return "€0/mo";
    }

    const price = isAnnual ? tier.priceAnnual : tier.priceMonthly;
    const period = isAnnual ? "/yr" : "/mo";
    return `€${price}${period}`;
  };

  const getSavings = (tier: PricingTier) => {
    if (tier.isLifetime || tier.priceMonthly === 0 || tier.tier === "enterprise") {
      return null;
    }
    const monthlyCost = tier.priceMonthly * 12;
    const savings = monthlyCost - tier.priceAnnual;
    const percentage = Math.round((savings / monthlyCost) * 100);
    return percentage > 0 ? `Save ${percentage}%` : null;
  };

  const handleGetStarted = async (tier: PricingTier) => {
    if (tier.comingSoon) {
      return;
    }

    if (tier.tier === "free") {
      navigate("/auth");
      return;
    }

    if (tier.stripeEnabled && (tier.tier === "pro" || tier.tier === "business")) {
      // Require authentication for paid tiers
      if (!user) {
        toast({
          title: "Sign in required",
          description: "Please sign in to subscribe to a paid plan.",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      setLoadingTier(tier.tier);

      try {
        const priceId = getStripePriceId(tier.tier as StripeTier, isAnnual);
        
        const { data, error } = await supabase.functions.invoke("create-checkout", {
          body: {
            priceId,
            tier: tier.tier,
            billingPeriod: isAnnual ? "annual" : "monthly",
          },
        });

        if (error) {
          throw error;
        }

        if (data?.url) {
          window.open(data.url, "_blank");
        } else {
          throw new Error("No checkout URL returned");
        }
      } catch (error) {
        console.error("Checkout error:", error);
        toast({
          title: "Checkout failed",
          description: "There was a problem starting the checkout process. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoadingTier(null);
      }
    }
  };

  const getButtonText = (tier: PricingTier) => {
    if (loadingTier === tier.tier) {
      return (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Loading...
        </>
      );
    }
    
    if (tier.comingSoon) {
      return "Join Waitlist";
    }
    
    if (tier.tier === "enterprise") {
      return "Contact Sales";
    }
    
    if (tier.stripeEnabled) {
      return "Subscribe Now";
    }
    
    return "Get Started";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="font-bold mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Start free and scale as you grow
          </p>

          {/* Annual/Monthly Toggle */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <Label htmlFor="billing-toggle" className={!isAnnual ? "font-semibold" : ""}>
              Monthly
            </Label>
            <Switch
              id="billing-toggle"
              checked={isAnnual}
              onCheckedChange={setIsAnnual}
            />
            <Label htmlFor="billing-toggle" className={isAnnual ? "font-semibold" : ""}>
              Annual
            </Label>
            {isAnnual && (
              <Badge variant="secondary" className="ml-2">
                Save up to 20%
              </Badge>
            )}
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 max-w-7xl mx-auto">
          {tiers.map((tier) => (
            <Card
              key={tier.tier}
              className={`relative flex flex-col ${
                tier.popular ? "border-primary shadow-lg scale-105" : ""
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="gap-1">
                    <Crown className="w-3 h-3" />
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader>
                <div className="flex justify-between items-start mb-2">
                  <CardTitle className="text-xl">{tier.name}</CardTitle>
                  <Badge variant={tier.comingSoon ? "secondary" : "default"}>
                    {tier.comingSoon ? "Coming Soon" : "Available"}
                  </Badge>
                </div>
                <div className="mt-4">
                  <div className="text-3xl font-bold">{formatPrice(tier)}</div>
                  {isAnnual && getSavings(tier) && (
                    <Badge variant="outline" className="mt-2">
                      {getSavings(tier)}
                    </Badge>
                  )}
                </div>
                <CardDescription className="mt-2">
                  {tier.isLifetime && "One-time payment, lifetime access"}
                </CardDescription>
              </CardHeader>

              <CardContent className="flex-grow">
                <ul className="space-y-3">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full"
                  variant={tier.popular ? "default" : "outline"}
                  disabled={tier.comingSoon || loadingTier === tier.tier}
                  onClick={() => handleGetStarted(tier)}
                >
                  {getButtonText(tier)}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* FAQ or Additional Info */}
        <div className="mt-16 text-center">
          <p className="text-muted-foreground">
            Questions about pricing? Contact us at support@suggistit.com
          </p>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
