import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import { OrganizationProvider } from "@/hooks/useOrganization";
import { AccountProvider } from "@/hooks/useAccount";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Submit from "./pages/Submit";
import SuggestionDetail from "./pages/SuggestionDetail";
import MySuggestions from "./pages/MySuggestions";
import HowItWorks from "./pages/HowItWorks";
import Settings from "./pages/Settings";
import Categories from "./pages/Categories";
import Teams from "./pages/Teams";
import AcceptInvitation from "./pages/AcceptInvitation";
import Pricing from "./pages/Pricing";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Organization from "./pages/Organization";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";
import Portfolio from "./pages/Portfolio";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <OrganizationProvider>
            <AccountProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/submit" element={<Submit />} />
                <Route path="/suggestion/:id" element={<SuggestionDetail />} />
                <Route path="/my-suggestions" element={<MySuggestions />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/teams" element={<Teams />} />
              <Route path="/accept-invitation" element={<AcceptInvitation />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/organization" element={<Organization />} />
              <Route path="/install" element={<Install />} />
              <Route path="/portfolio" element={<Portfolio />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AccountProvider>
            </OrganizationProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
