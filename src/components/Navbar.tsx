import { Link } from "react-router-dom";
import { Plus, User, LogOut, Info } from "lucide-react";
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
    <nav className="border-b bg-card">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center">
          <img src={logo} alt="Suggistit" className="h-8" />
        </Link>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/how-it-works">
              <Info className="w-4 h-4 mr-2" />
              How it Works
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