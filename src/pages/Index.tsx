import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import Landing from "./Landing";
import Dashboard from "./Dashboard";

const Index = () => {
  const { user, session } = useAuth();
  const navigate = useNavigate();

  // Show landing page to visitors, dashboard to authenticated users
  if (user && session) {
    return <Dashboard />;
  }

  return <Landing />;
};

export default Index;
