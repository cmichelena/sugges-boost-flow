import { Link } from "react-router-dom";
import { Plus, User, LogOut, Info, DollarSign, CreditCard, Sparkles, Crown, LayoutDashboard, Lightbulb, Users, Settings, Building2, Briefcase } from "lucide-react";
import { Button } from "./ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useAccount } from "@/hooks/useAccount";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { OrganizationSwitcher } from "./OrganizationSwitcher";
import logoLight from "@/assets/suggistit-logo-black.png";
import logoDark from "@/assets/suggistit-logo-white.png";
import logoIcon from "@/assets/suggistit-icon.png";

const tierConfig = {
  free: { name: "Free", color: "bg-muted text-muted-foreground", icon: null },
  starter: { name: "Starter", color: "bg-green-500/10 text-green-600", icon: Sparkles },
  pro: { name: "Pro", color: "bg-blue-500/10 text-blue-600", icon: Sparkles },
  business: { name: "Business", color: "bg-purple-500/10 text-purple-600", icon: Crown },
  enterprise: { name: "Enterprise", color: "bg-amber-500/10 text-amber-600", icon: Crown },
};

export const Navbar = () => {
  const { user, signOut } = useAuth();
  const { tier } = useSubscription();
  const { hasAccountAccess } = useAccount();
  const { t } = useTranslation();
  
  const config = tierConfig[tier] || tierConfig.free;
  const TierIcon = config.icon;

  // Logged-in view: minimal header with just logo and avatar
  if (user) {
    return (
      <nav className="sticky top-0 z-50 border-b bg-card">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
            <Link to="/dashboard" className="flex items-center flex-shrink-0">
              {/* Icon on mobile, full logo on desktop */}
              <img src={logoIcon} alt="Suggistit" className="h-10 md:hidden" />
              <img src={logoLight} alt="Suggistit" className="hidden md:block h-16 dark:hidden" />
              <img src={logoDark} alt="Suggistit" className="hidden md:dark:block h-16" />
            </Link>
            <div className="min-w-0 flex-1">
              <OrganizationSwitcher />
            </div>
          </div>

          <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
            {/* Hide submit button on mobile - it's in the bottom nav */}
            <Button variant="default" size="sm" asChild className="hidden md:flex px-4">
              <Link to="/submit">
                <Plus className="w-4 h-4 mr-2" />
                {t("common.submit")}
              </Link>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <User className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                {/* Plan Badge - hide pricing link on iOS */}
                {!/iPad|iPhone|iPod/.test(navigator.userAgent) && (
                  <>
                    <div className="px-2 py-2">
                      <Link to="/pricing" className="block">
                        <div className="flex items-center justify-between p-2 rounded-md hover:bg-accent transition-colors">
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{t("nav.myPlan")}</span>
                          </div>
                          <Badge variant="outline" className={`${config.color} text-xs`}>
                            {TierIcon && <TierIcon className="w-3 h-3 mr-1" />}
                            {config.name}
                          </Badge>
                        </div>
                      </Link>
                    </div>
                    <DropdownMenuSeparator />
                  </>
                )}
                
                {/* Navigation Section */}
                <DropdownMenuLabel className="text-xs text-muted-foreground">Navigation</DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link to="/dashboard" className="flex items-center gap-2">
                    <LayoutDashboard className="w-4 h-4" />
                    {t("common.dashboard")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/my-suggestions" className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" />
                    {t("nav.mySuggestions")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/teams" className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {t("nav.teams")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                
                {/* Organisation - only if user has account access */}
                {hasAccountAccess && (
                  <>
                    <DropdownMenuLabel className="text-xs text-muted-foreground">Organisation</DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                      <Link to="/portfolio" className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4" />
                        Organisation Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/organisation-settings" className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Organisation Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                
                {/* Info Section */}
                <DropdownMenuLabel className="text-xs text-muted-foreground">Info</DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link to="/how-it-works" className="flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    {t("nav.howItWorks")}
                  </Link>
                </DropdownMenuItem>
                {!/iPad|iPhone|iPod/.test(navigator.userAgent) && (
                  <DropdownMenuItem asChild>
                    <Link to="/pricing" className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      {t("nav.pricing")}
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <a href="https://www.suggistit.com/support" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    {t("nav.support") || "Support"}
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                
                {/* Settings Section */}
                <DropdownMenuLabel className="text-xs text-muted-foreground">Management</DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link to="/organization" className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    {t("settings.organization")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    {t("common.settings")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  {t("common.signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>
    );
  }

  // Logged-out view: full public header with nav links
  return (
    <nav className="sticky top-0 z-50 border-b bg-card">
      <div className="container mx-auto px-4 py-2 md:py-0 md:h-16 flex flex-col md:flex-row items-center justify-between gap-3 md:gap-0">
        <Link to="/" className="flex items-center flex-shrink-0">
          <img src={logoLight} alt="Suggistit" className="h-12 md:h-16 dark:hidden" />
          <img src={logoDark} alt="Suggistit" className="h-12 md:h-16 hidden dark:block" />
        </Link>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/how-it-works">
              <Info className="w-4 h-4 mr-2" />
              {t("nav.howItWorks")}
            </Link>
          </Button>

          {!/iPad|iPhone|iPod/.test(navigator.userAgent) && (
            <Button variant="ghost" size="sm" asChild>
              <Link to="/pricing">
                <DollarSign className="w-4 h-4 mr-2" />
                {t("nav.pricing")}
              </Link>
            </Button>
          )}

          <LanguageSwitcher />

          <Button variant="default" size="sm" asChild>
            <Link to="/auth">{t("common.signIn")}</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
};
