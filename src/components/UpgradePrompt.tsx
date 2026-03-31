import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Crown, Lock, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Feature, useFeatureAccess } from "@/hooks/useFeatureAccess";

interface UpgradePromptProps {
  feature: Feature;
  open: boolean;
  onClose: () => void;
  onContinueWithout?: () => void;
  showContinueWithout?: boolean;
}

export const UpgradePrompt = ({
  feature,
  open,
  onClose,
  onContinueWithout,
  showContinueWithout = false,
}: UpgradePromptProps) => {
  const isIOSApp = /iPad|iPhone|iPod/.test(navigator.userAgent) && window.matchMedia('(display-mode: standalone)').matches;
  open,
  onClose,
  onContinueWithout,
  showContinueWithout = false,
}: UpgradePromptProps) => {
  const navigate = useNavigate();
  const { getFeatureName, getFeatureDescription, getMinTierForFeature } = useFeatureAccess();
  const [isNavigating, setIsNavigating] = useState(false);

  const featureName = getFeatureName(feature);
  const featureDescription = getFeatureDescription(feature);
  const minTier = getMinTierForFeature(feature);

  const handleUpgrade = () => {
    setIsNavigating(true);
    onClose();
    navigate("/pricing");
  };

  const handleContinueWithout = () => {
    onClose();
    onContinueWithout?.();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-amber-500/10">
              <Lock className="w-5 h-5 text-amber-500" />
            </div>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
              {minTier}+ Feature
            </Badge>
          </div>
          <DialogTitle className="text-xl">{featureName}</DialogTitle>
          <DialogDescription className="text-base">
            {featureDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10 rounded-lg p-4 border border-primary/20">
            <h4 className="font-semibold flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Unlock with {minTier}
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {minTier === "Starter" && (
                <>
                  <li>• Create company organizations</li>
                  <li>• Up to 250 suggestions/month</li>
                  <li>• Up to 10 team members</li>
                  <li>• Domain-restricted invitations</li>
                </>
              )}
              {minTier === "Pro" && (
                <>
                  <li>• AI-powered suggestion improvements</li>
                  <li>• Advanced analytics dashboard</li>
                  <li>• Up to 500 suggestions/month</li>
                  <li>• Up to 50 team members</li>
                </>
              )}
              {minTier === "Business" && (
                <>
                  <li>• Everything in Pro</li>
                  <li>• Custom branding</li>
                  <li>• Priority support</li>
                  <li>• Unlimited suggestions</li>
                  <li>• Up to 200 team members</li>
                </>
              )}
            </ul>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {showContinueWithout && (
            <Button variant="ghost" onClick={handleContinueWithout} className="w-full sm:w-auto">
              Continue without
            </Button>
          )}
          <Button onClick={handleUpgrade} disabled={isNavigating} className="w-full sm:w-auto gap-2">
            <Crown className="w-4 h-4" />
            View Plans
            <ArrowRight className="w-4 h-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Inline upgrade banner for use within pages
interface UpgradeBannerProps {
  feature: Feature;
  compact?: boolean;
  onUpgradeClick?: () => void;
}

export const UpgradeBanner = ({ feature, compact = false, onUpgradeClick }: UpgradeBannerProps) => {
  const navigate = useNavigate();
  const { getFeatureName, getMinTierForFeature } = useFeatureAccess();

  const featureName = getFeatureName(feature);
  const minTier = getMinTierForFeature(feature);

  const handleClick = () => {
    if (onUpgradeClick) {
      onUpgradeClick();
    } else {
      navigate("/pricing");
    }
  };

  if (compact) {
    return (
      <button
        onClick={handleClick}
        className="flex items-center gap-2 text-xs text-amber-600 hover:text-amber-700 transition-colors"
      >
        <Lock className="w-3 h-3" />
        <span>Upgrade to {minTier} for {featureName}</span>
      </button>
    );
  }

  return (
    <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-lg p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-amber-500/20 mt-0.5">
            <Lock className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h4 className="font-medium text-sm flex items-center gap-2">
              {featureName}
              <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
                {minTier}+
              </Badge>
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              Upgrade your plan to access this feature
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={handleClick} className="shrink-0">
          <Sparkles className="w-3 h-3 mr-1" />
          Upgrade
        </Button>
      </div>
    </div>
  );
};
