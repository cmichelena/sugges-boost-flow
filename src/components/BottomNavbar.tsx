import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Lightbulb, Plus, Users, User } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
const navItems = [{
  icon: LayoutDashboard,
  label: "Dashboard",
  path: "/dashboard"
}, {
  icon: Lightbulb,
  label: "My Ideas",
  path: "/my-suggestions"
}, {
  icon: Plus,
  label: "Submit",
  path: "/submit",
  primary: true
}, {
  icon: Users,
  label: "Teams",
  path: "/teams"
}, {
  icon: User,
  label: "Profile",
  path: "/settings"
}];
export const BottomNavbar = () => {
  const isMobile = useIsMobile();
  const {
    user
  } = useAuth();
  const location = useLocation();

  // Only show on mobile and when logged in
  if (!isMobile || !user) return null;
  return <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16">
        {navItems.map(item => {
        const isActive = location.pathname === item.path;
        const Icon = item.icon;
        if (item.primary) {
          return <Link key={item.path} to={item.path} className="flex flex-col items-center justify-center -mt-4">
                <div className="flex items-center justify-center w-14 h-14 rounded-full text-primary-foreground shadow-lg bg-[#f07000]">
                  <Icon className="w-6 h-6" />
                </div>
              </Link>;
        }
        return <Link key={item.path} to={item.path} className={cn("flex flex-col items-center justify-center gap-1 min-w-[64px] py-2 transition-colors", isActive ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
              <Icon className={cn("w-5 h-5", isActive && "scale-110")} />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>;
      })}
      </div>
    </nav>;
};