import { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { BottomNavbar } from "./BottomNavbar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const isMobile = useIsMobile();
  const { user } = useAuth();

  // Add bottom padding on mobile for logged-in users to account for bottom nav
  const showBottomNav = isMobile && user;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className={showBottomNav ? "pb-20" : ""}>
        {children}
      </div>
      <BottomNavbar />
    </div>
  );
};
