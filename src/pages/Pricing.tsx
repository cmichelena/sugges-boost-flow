import { useState } from "react";
import { Check, Crown, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";

interface PricingTier {
  name: string;
  tier: string;
  priceMonthly: number;
  priceAnnual: number;
  popular?: boolean;
  features: string[];
  maxMembers: number | null;
  maxSuggestions: number | null;
  isEnterprise?: boolean;
}

const Pricing = () => {
  const [isAnnual, setIsAnnual] = useState(false);
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tier: currentTier } = useSubscription();

  const tiers: PricingTier[] = [
    {
      name: "Free",
      tier: "free",
      priceMonthly: 0,
      priceAnnual: 0,
      features: [
        "25 suggestions per month",
        "Up to 3 team members",
        "Basic insights only",
        "Suggistit branding",
      ],
      maxMembers: 3,
      maxSuggestions: 25,
    },
    {
      name: "Starter",
      tier: "starter",
      priceMonthly: 39,
      priceAnnual: 390,
      features: [
        "250 suggestions per month",
        "Up to 10 team members",
        "AI-powered improvements",
        "Basic analytics",
        "Email support",
      ],
      maxMembers: 10,
      maxSuggestions: 250,
    },
    {
      name: "Pro",
      tier: "pro",
      priceMonthly: 199,
      priceAnnual: 1990,
      popular: true,
      features: [
        "1,500 suggestions per month",
        "Up to 25 team members",
        "Advanced analytics",
        "Priority support",
        "Light custom branding",
      ],
      maxMembers: 25,
      maxSuggestions: 1500,
    },
    {
      name: "Business",
      tier: "business",
      priceMonthly: 799,
      priceAnnual: 7990,
      features: [
        "5,000+ suggestions per month",
        "Up to 100 team members",
        "Full analytics suite",
        "Custom branding",
        "SLA-backed priority support",
        "Admin and governance controls",
      ],
      maxMembers: 100,
      maxSuggestions: 5000,
    },
    {
      name: "Enterprise",
      tier: "enterprise",
      priceMonthly: 0,
      priceAnnual: 0,
      isEnterprise: true,
      features: [
        "Unlimited suggestions",
        "Unlimited team members",
        "SSO / enterprise security",
        "Data governance and compliance",
        "Dedicated account support",
      ],
      maxMembers: null,
      maxSuggestions: null,
    },
  ];

  const formatPrice = (tier: PricingTier) => {
    if (tier.isEnterprise) {
      return "Custom";
    }

    if (tier.priceMonthly === 0) {
      return "$0";
    }

    const price = isAnnual ? Math.round(tier.priceAnnual / 12) : tier.priceMonthly;
    return `$${price}`;
  };

  const getSavings = (tier: PricingTier) => {
    if (tier.priceMonthly === 0 || tier.isEnterprise) {
      return null;
    }
    const monthlyCost = tier.priceMonthly * 12;
    const savings = monthlyCost - tier.priceAnnual;
    const percentage = Math.round((savings / monthlyCost) * 100);
    return percentage > 0 ? `Save ${percentage}%` : null;
  };

  const handleGetStarted = async (tier: PricingTier) => {
    if (tier.isEnterprise) {
      window.location.href = "mailto:sales@suggistit.com?subject=Enterprise%20Inquiry";
      return;
    }

    if (tier.tier === "free") {
      if (!user) {
        navigate("/auth");
      }
      return;
    }

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
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
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
  };

  const isCurrentPlan = (tier: PricingTier) => {
    return currentTier === tier.tier;
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

    if (tier.isEnterprise) {
      return (
        <>
          <Mail className="w-4 h-4 mr-2" />
          Contact Sales
        </>
      );
    }

    if (isCurrentPlan(tier)) {
      return "Current Plan";
    }

    if (tier.tier === "free") {
      return user ? "Current Plan" : "Start Free";
    }

    return "Upgrade";
  };

  const getButtonVariant = (tier: PricingTier): "default" | "outline" | "secondary" => {
    if (tier.popular) return "default";
    if (tier.isEnterprise) return "secondary";
    return "outline";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="font-bold mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Start free and scale as your team grows
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
                Save up to 17%
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
                tier.popular ? "border-primary shadow-lg scale-105 z-10" : ""
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="gap-1">
                    <Crown className="w-3 h-3" />
                    Recommended
                  </Badge>
                </div>
              )}

              <CardHeader className="pb-4">
                <CardTitle className="text-xl">{tier.name}</CardTitle>
                <div className="mt-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">{formatPrice(tier)}</span>
                    {!tier.isEnterprise && tier.priceMonthly > 0 && (
                      <span className="text-muted-foreground">/mo</span>
                    )}
                  </div>
                  {isAnnual && getSavings(tier) && (
                    <Badge variant="outline" className="mt-2 text-green-600 border-green-600">
                      {getSavings(tier)}
                    </Badge>
                  )}
                  {isAnnual && !tier.isEnterprise && tier.priceMonthly > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Billed ${tier.priceAnnual}/year
                    </p>
                  )}
                </div>
                <CardDescription className="mt-2 min-h-[20px]">
                  {tier.isEnterprise && "Tailored for large organizations"}
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
                  variant={getButtonVariant(tier)}
                  disabled={loadingTier === tier.tier || isCurrentPlan(tier)}
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
            Questions about pricing?{" "}
            <a href="mailto:support@suggistit.com" className="text-primary hover:underline">
              Contact our team
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
