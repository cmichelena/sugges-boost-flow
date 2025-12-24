import { Link } from "react-router-dom";
import { Plus, User, LogOut, Info, DollarSign, CreditCard, Sparkles, Crown } from "lucide-react";
import { Button } from "./ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { LanguageSwitcher } from "./LanguageSwitcher";
import logo from "@/assets/suggistit-logo.png";

const tierConfig = {
  free: { name: "Free", color: "bg-muted text-muted-foreground", icon: null },
  starter: { name: "Starter", color: "bg-green-500/10 text-green-600", icon: Sparkles },
  pro: { name: "Pro", color: "bg-blue-500/10 text-blue-600", icon: Sparkles },
  business: { name: "Business", color: "bg-purple-500/10 text-purple-600", icon: Crown },
  enterprise: { name: "Enterprise", color: "bg-amber-500/10 text-amber-600", icon: Crown },
};

export const Navbar = () => {
  const { user, signOut } = useAuth();
  const { tier, subscribed } = useSubscription();
  const { t } = useTranslation();
  
  const config = tierConfig[tier] || tierConfig.free;
  const TierIcon = config.icon;

  return (
    <nav className="sticky top-0 z-50 border-b bg-card">
      <div className="container mx-auto px-4 py-2 md:py-0 md:h-16 flex flex-col md:flex-row items-center justify-between gap-3 md:gap-0">
        <Link to={user ? "/dashboard" : "/"} className="flex items-center flex-shrink-0">
          <img src={logo} alt="Suggistit" className="h-12 md:h-16" />
        </Link>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/how-it-works">
              <Info className="w-4 h-4 mr-2" />
              {t("nav.howItWorks")}
            </Link>
          </Button>

          <Button variant="ghost" size="sm" asChild>
            <Link to="/pricing">
              <DollarSign className="w-4 h-4 mr-2" />
              {t("nav.pricing")}
            </Link>
          </Button>

          <LanguageSwitcher />

          {user && (
            <>
              <Button variant="default" size="sm" asChild>
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
                <DropdownMenuContent align="end" className="w-56">
                  {/* My Account Section */}
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
                  <DropdownMenuItem asChild>
                    <Link to="/my-suggestions">{t("nav.mySuggestions")}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/teams">{t("nav.teams")}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/settings">{t("common.settings")}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="w-4 h-4 mr-2" />
                    {t("common.signOut")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}

          {!user && (
            <Button variant="default" size="sm" asChild>
              <Link to="/auth">{t("common.signIn")}</Link>
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
};
