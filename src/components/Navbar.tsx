import { Link } from "react-router-dom";
import { Plus, User, LogOut, Info, DollarSign } from "lucide-react";
import { Button } from "./ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LanguageSwitcher } from "./LanguageSwitcher";
import logo from "@/assets/suggistit-logo.png";

export const Navbar = () => {
  const { user, signOut } = useAuth();
  const { t } = useTranslation();

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
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to="/my-suggestions">{t("nav.mySuggestions")}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/teams">{t("nav.teams")}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/settings">{t("common.settings")}</Link>
                  </DropdownMenuItem>
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
