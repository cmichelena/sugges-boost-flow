import { Link } from "react-router-dom";
import { Plus, User, LogOut, Info, DollarSign } from "lucide-react";
import { Button } from "./ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import logo from "@/assets/suggistit-logo.png";

export const Navbar = () => {
  const { user, signOut } = useAuth();

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
              How it Works
            </Link>
          </Button>

          <Button variant="ghost" size="sm" asChild>
            <Link to="/pricing">
              <DollarSign className="w-4 h-4 mr-2" />
              Pricing
            </Link>
          </Button>

          {user && (
            <>
              <Button variant="default" size="sm" asChild>
                <Link to="/submit">
                  <Plus className="w-4 h-4 mr-2" />
                  Submit
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
                    <Link to="/my-suggestions">My Suggestions</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/teams">Teams</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/settings">Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}

          {!user && (
            <Button variant="default" size="sm" asChild>
              <Link to="/auth">Sign In</Link>
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
};