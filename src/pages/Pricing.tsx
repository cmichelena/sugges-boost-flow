import { useState } from "react";
import { Check, Crown, Loader2, Mail, ArrowLeft } from "lucide-react";
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
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { Navbar } from "@/components/Navbar";
import { useTranslation } from "react-i18next";
import { 
  PRICING_TIERS, 
  CURRENCIES,
  formatPrice,
  getAnnualSavings,
  type Currency,
  type PricingTier 
} from "@/lib/pricing-config";

const Pricing = () => {
  const isIOSApp = /iPad|iPhone|iPod/.test(navigator.userAgent) && window.matchMedia('(display-mode: standalone)').matches;
  const [isAnnual, setIsAnnual] = useState(false);
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tier: currentTier } = useSubscription();
  const { currency, isEU, loading: geoLoading } = useGeoLocation();
  const { t } = useTranslation();

  if (isIOSApp) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center max-w-md space-y-6">
          <Crown className="w-12 h-12 text-muted-foreground mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Subscription Management</h1>
          <p className="text-muted-foreground">
            This feature is managed by your organisation admin.
          </p>
          <Button variant="outline" onClick={() => window.history.back()} className="w-full">
            Go Back
          </Button>
        </div>
      </div>
    );
  }


  const getDisplayPrice = (tier: PricingTier): string => {
    if (tier.isEnterprise) {
      return "Custom";
    }

    const priceData = isAnnual ? tier.priceAnnual : tier.priceMonthly;
    const amount = priceData[currency];

    if (amount === 0) {
      return `${CURRENCIES[currency].symbol}0`;
    }

    return formatPrice(amount, currency);
  };

  const getMonthlyEquivalent = (tier: PricingTier): string | null => {
    if (!isAnnual || tier.isEnterprise || tier.priceMonthly[currency] === 0) {
      return null;
    }
    
    const monthlyEquiv = Math.round(tier.priceAnnual[currency] / 12);
    return formatPrice(monthlyEquiv, currency);
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

    if (!user) {
      toast({
        title: t("pricing.signInRequired"),
        description: t("pricing.signInRequiredDesc"),
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
          currency: currency.toLowerCase(),
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
        title: t("pricing.checkoutFailed"),
        description: t("pricing.checkoutFailedDesc"),
        variant: "destructive",
      });
    } finally {
      setLoadingTier(null);
    }
  };

  const isCurrentPlan = (tier: PricingTier): boolean => {
    return currentTier === tier.tier;
  };

  const getButtonText = (tier: PricingTier) => {
    if (loadingTier === tier.tier) {
      return (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          {t("pricing.loading")}
        </>
      );
    }

    if (tier.isEnterprise) {
      return (
        <>
          <Mail className="w-4 h-4 mr-2" />
          {t("pricing.contact")}
        </>
      );
    }

    if (isCurrentPlan(tier)) {
      return t("pricing.currentPlan");
    }

    if (tier.tier === "free") {
      return user ? t("pricing.currentPlan") : t("pricing.startFree");
    }

    return t("pricing.upgrade");
  };

  const getButtonVariant = (tier: PricingTier): "default" | "outline" | "secondary" => {
    if (tier.popular) return "default";
    if (tier.isEnterprise) return "secondary";
    return "outline";
  };

  const getCurrencyLabel = (curr: Currency): string => {
    return `${CURRENCIES[curr].symbol} ${curr}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t("pricing.back")}
        </Button>

        <div className="text-center mb-12">
          <h1 className="font-bold mb-4">
            {t("pricing.title")}
          </h1>
          <p className="text-xl text-muted-foreground mb-4">
            {t("pricing.subtitle")}
          </p>
          <p className="text-base text-muted-foreground mb-8">
            {t("pricing.subtitleNote")}
          </p>

          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="text-sm text-muted-foreground">
              {t("pricing.pricesShownIn")} {getCurrencyLabel(currency)}
            </span>
          </div>

          <div className="flex items-center justify-center gap-4 mb-8">
            <Label htmlFor="billing-toggle" className={!isAnnual ? "font-semibold" : ""}>
              {t("pricing.monthly")}
            </Label>
            <Switch
              id="billing-toggle"
              checked={isAnnual}
              onCheckedChange={setIsAnnual}
            />
            <Label htmlFor="billing-toggle" className={isAnnual ? "font-semibold" : ""}>
              {t("pricing.annual")}
            </Label>
            {isAnnual && (
              <Badge variant="secondary" className="ml-2">
                {t("pricing.saveUpTo")}
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 max-w-7xl mx-auto">
          {PRICING_TIERS.map((tier) => {
            const savings = getAnnualSavings(tier);
            const monthlyEquiv = getMonthlyEquivalent(tier);
            
            return (
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
                      {t("pricing.recommended")}
                    </Badge>
                  </div>
                )}

                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">{tier.name}</CardTitle>
                  <div className="mt-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold">{getDisplayPrice(tier)}</span>
                      {!tier.isEnterprise && tier.priceMonthly[currency] > 0 && (
                        <span className="text-muted-foreground">
                          {isAnnual ? t("pricing.perYear") : t("pricing.perMonth")}
                        </span>
                      )}
                    </div>
                    {isAnnual && monthlyEquiv && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {t("pricing.billedAnnually", { price: monthlyEquiv })}
                      </p>
                    )}
                    {isAnnual && savings && (
                      <Badge variant="outline" className="mt-2 text-green-600 border-green-600">
                        {t("pricing.savePercent", { percent: savings })}
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="mt-2 min-h-[20px]">
                    {tier.isEnterprise && t("pricing.tailoredForLarge")}
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
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            {t("pricing.ownershipNote")}
          </p>
        </div>

        {isEU && (
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              {t("pricing.vatNotice")}
            </p>
          </div>
        )}

        <div className="mt-16 text-center">
          <p className="text-muted-foreground">
            {t("pricing.questionsAboutPricing")}{" "}
            <a href="mailto:support@suggistit.com" className="text-primary hover:underline">
              {t("pricing.contactOurTeam")}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Pricing;