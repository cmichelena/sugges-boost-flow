import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Lightbulb, Users, TrendingUp, CheckCircle, Filter, UserCircle, Shield, Sparkles, Camera, FileText, Mic, Crown, ThumbsUp, AlertTriangle, Minus, Lock } from "lucide-react";
import { MomentumDial } from "@/components/MomentumDial";

const HowItWorks = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="font-bold mb-4">{t("howItWorks.pageTitle")}</h1>
            <p className="text-xl text-muted-foreground">
              {t("howItWorks.tagline")}
            </p>
          </div>

          <div className="space-y-8">
            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Lightbulb className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">1. {t("howItWorks.step1Title")}</h3>
                  <p className="text-muted-foreground mb-3">
                    {t("howItWorks.step1Desc")}
                  </p>
                  <ul className="space-y-2 text-muted-foreground text-sm">
                    <li className="flex items-start gap-2">
                      <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span><strong>{t("suggestion.anonymous")}:</strong> {t("suggestion.anonymousHint")}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span><strong>Private HR:</strong> Submit sensitive feedback directly to HR</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Users className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span><strong>Auto-Routing:</strong> Suggestions automatically assigned to teams</span>
                    </li>
                  </ul>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <Camera className="w-6 h-6 text-amber-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">2. {t("howItWorks.step2Title")}</h3>
                  <p className="text-muted-foreground mb-3">
                    {t("howItWorks.step2Desc")}
                  </p>
                  <ul className="space-y-2 text-muted-foreground text-sm">
                    <li className="flex items-start gap-2">
                      <Camera className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span><strong>{t("suggestion.addPhoto")}:</strong> Capture images or select from gallery</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span><strong>{t("suggestion.addDocument")}:</strong> Attach PDFs or spreadsheets</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Mic className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span><strong>{t("suggestion.addVoice")}:</strong> Record audio explanations</span>
                    </li>
                  </ul>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-primary/20">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-semibold">3. {t("howItWorks.step3Title")}</h3>
                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-medium">{t("pricing.tiers.pro")}</span>
                  </div>
                  <p className="text-muted-foreground mb-3">
                    {t("howItWorks.step3Desc")}
                  </p>
                  <ul className="space-y-2 text-muted-foreground text-sm">
                    <li className="flex items-start gap-2">
                      <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span><strong>{t("suggestion.aiImprove")}:</strong> {t("suggestion.aiImproveHint")}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span><strong>One-Click:</strong> Toggle when submitting</span>
                    </li>
                  </ul>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0">
                  <ThumbsUp className="w-6 h-6 text-secondary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">4. {t("howItWorks.step4Title")}</h3>
                  <p className="text-muted-foreground mb-3">
                    {t("howItWorks.step4Desc")}
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10">
                      <Crown className="w-4 h-4 text-amber-500" />
                      <span><strong>{t("reactions.champion")}</strong> (+2)</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10">
                      <ThumbsUp className="w-4 h-4 text-green-500" />
                      <span><strong>{t("reactions.support")}</strong> (+1)</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted">
                      <Minus className="w-4 h-4 text-muted-foreground" />
                      <span><strong>{t("reactions.neutral")}</strong> (0)</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-500/10">
                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                      <span><strong>{t("reactions.concerns")}</strong> (-1)</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-momentum-fire/10 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-6 h-6 text-momentum-fire" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">5. {t("howItWorks.step5Title")}</h3>
                  <p className="text-muted-foreground mb-4">
                    {t("howItWorks.step5Desc")}
                  </p>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <MomentumDial level="fresh" score={25} size="sm" />
                      <span className="text-sm">{t("momentum.fresh")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MomentumDial level="warming" score={100} size="sm" />
                      <span className="text-sm">{t("momentum.warming")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MomentumDial level="heating" score={200} size="sm" />
                      <span className="text-sm">{t("momentum.heating")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MomentumDial level="fire" score={350} size="sm" />
                      <span className="text-sm">{t("momentum.fire")}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <UserCircle className="w-6 h-6 text-blue-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">6. {t("howItWorks.step6Title")}</h3>
                  <p className="text-muted-foreground mb-3">
                    {t("howItWorks.step6Desc")}
                  </p>
                  <ul className="space-y-2 text-muted-foreground text-sm">
                    <li className="flex items-start gap-2">
                      <Users className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span><strong>{t("nav.teams")}:</strong> Auto-assigned based on category</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <UserCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span><strong>Assignment:</strong> Team leads assign to members</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Filter className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span><strong>{t("dashboard.myAssignments")}:</strong> View your assigned suggestions</span>
                    </li>
                  </ul>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">7. {t("howItWorks.step7Title")}</h3>
                  <p className="text-muted-foreground mb-3">
                    {t("howItWorks.step7Desc")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-muted rounded-full text-sm">{t("status.open")}</span>
                    <span className="px-3 py-1 bg-blue-500/10 text-blue-600 rounded-full text-sm">{t("status.acknowledged")}</span>
                    <span className="px-3 py-1 bg-purple-500/10 text-purple-600 rounded-full text-sm">{t("status.planned")}</span>
                    <span className="px-3 py-1 bg-amber-500/10 text-amber-600 rounded-full text-sm">{t("status.inProgress")}</span>
                    <span className="px-3 py-1 bg-green-500/10 text-green-600 rounded-full text-sm">{t("status.completed")}</span>
                    <span className="px-3 py-1 bg-gray-500/10 text-gray-600 rounded-full text-sm">{t("status.declined")}</span>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                  <Filter className="w-6 h-6 text-purple-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">8. {t("howItWorks.step8Title")}</h3>
                  <p className="text-muted-foreground mb-3">
                    {t("howItWorks.step8Desc")}
                  </p>
                  <ul className="space-y-2 text-muted-foreground text-sm">
                    <li className="flex items-start gap-2">
                      <TrendingUp className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span><strong>{t("dashboard.momentum")}:</strong> Click to filter by heat level</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Filter className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span><strong>{t("nav.categories")}:</strong> Filter by category</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span><strong>Status:</strong> Filter by workflow stage</span>
                    </li>
                  </ul>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Crown className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">{t("pricing.title")}</h3>
                  <p className="text-muted-foreground mb-3">
                    {t("pricing.subtitle")}
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    <div className="p-3 rounded-lg bg-background border">
                      <div className="font-semibold mb-1">{t("pricing.tiers.free")}</div>
                      <p className="text-muted-foreground text-xs">25 suggestions/mo, 5 members</p>
                    </div>
                    <div className="p-3 rounded-lg bg-background border">
                      <div className="font-semibold mb-1">{t("pricing.tiers.forever")}</div>
                      <p className="text-muted-foreground text-xs">200 suggestions/mo, 10 members</p>
                    </div>
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <div className="font-semibold mb-1 flex items-center gap-1">{t("pricing.tiers.pro")} <Sparkles className="w-3 h-3" /></div>
                      <p className="text-muted-foreground text-xs">500 suggestions/mo, 50 members, AI</p>
                    </div>
                    <div className="p-3 rounded-lg bg-background border">
                      <div className="font-semibold mb-1">{t("pricing.tiers.business")}</div>
                      <p className="text-muted-foreground text-xs">Unlimited, 200 members</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="mt-12 text-center">
            <h2 className="text-2xl font-bold mb-4">{t("howItWorks.ctaTitle")}</h2>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" onClick={() => navigate("/submit")}>
                {t("nav.submitSuggestion")}
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/")}>
                {t("howItWorks.browseSuggestions")}
              </Button>
              <Button size="lg" variant="secondary" onClick={() => navigate("/pricing")}>
                {t("howItWorks.viewPricing")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;
