import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { ArrowRight, MessageSquarePlus, Eye, Shield, Building2, Home, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import centerIcon from "@/assets/suggestion-box-center.png";

const Landing = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="container mx-auto px-4 pt-10 pb-20 lg:pt-16 lg:pb-32 relative">
          <div className="max-w-4xl mx-auto text-center">
            <img src={centerIcon} alt="Suggistit" className="h-56 mx-auto mb-8" />
            <div className="flex flex-col items-center gap-1 text-muted-foreground mb-6 text-base">
              <span>No noise.</span>
              <span>No black holes.</span>
              <span>No forgotten issues.</span>
            </div>
            <h1 className="text-4xl lg:text-6xl font-bold mb-4 text-foreground leading-tight">
              Turn Ideas Into Action
            </h1>
            <p className="text-xl lg:text-2xl text-muted-foreground mb-4">
              Structured Visibility. Transparent Action.
            </p>
            <p className="text-2xl lg:text-3xl font-bold mb-6" style={{ color: '#FF6B35' }}>
              Just visible progress.
            </p>
            <p className="text-xl lg:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Suggistit brings people and decision-makers into one clear interface — for offices, buildings, and communities.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild className="text-lg px-8 py-6 text-white hover:opacity-90" style={{ backgroundColor: '#FF6B35' }}>
                <Link to="/auth">
                  Start Free Trial <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="text-lg px-8 py-6">
                <Link to="/how-it-works">Watch Demo</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Core Positioning Strip */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-10">
            <div className="text-center">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <MessageSquarePlus className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Human Interface</h3>
              <p className="text-muted-foreground text-sm">
                Submit in seconds. Photo, description, category. No email threads. No forms. No friction.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Eye className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Transparent Action</h3>
              <p className="text-muted-foreground text-sm">
                Every issue has a status. Every action has visibility. Expectations are aligned.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Governance Without Friction</h3>
              <p className="text-muted-foreground text-sm">
                Workspaces operate independently. Organisations oversee portfolios. Ownership is protected.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Context Strip — Built For */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-bold mb-8">Built for</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
              <div className="flex flex-col items-center gap-2 p-6 rounded-lg bg-card border transition-all duration-200 ease-out hover:scale-[1.02] hover:shadow-md">
                <Building2 className="w-8 h-8 text-primary" />
                <span className="font-medium">Offices &amp; Teams</span>
                <span className="text-sm text-muted-foreground">Idea management with guaranteed closure</span>
              </div>
              <div className="flex flex-col items-center gap-2 p-6 rounded-lg bg-card border transition-all duration-200 ease-out hover:scale-[1.02] hover:shadow-md">
                <Home className="w-8 h-8 text-primary" />
                <span className="font-medium">Residential Buildings</span>
                <span className="text-sm text-muted-foreground">Issue tracking with tenant visibility</span>
              </div>
              <div className="flex flex-col items-center gap-2 p-6 rounded-lg bg-card border transition-all duration-200 ease-out hover:scale-[1.02] hover:shadow-md">
                <Users className="w-8 h-8 text-primary" />
                <span className="font-medium">Communities &amp; Associations</span>
                <span className="text-sm text-muted-foreground">Clear communication with accountability</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">One engine. Different contexts.</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-bold mb-6">Stop losing track of issues and ideas.</h2>
            <p className="text-xl text-muted-foreground mb-8">
              See what happens after you speak up.
            </p>
            <Button size="lg" asChild className="text-lg px-8 py-6 text-white hover:opacity-90" style={{ backgroundColor: '#FF6B35' }}>
              <Link to="/auth">
                Start Free Trial <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Ownership Trust Line */}
      <section className="py-10 border-t border-b">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm text-muted-foreground">
            Workspace data ownership always remains with the workspace owner.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-muted-foreground">© 2025 Suggistit. All rights reserved.</p>
            <div className="flex gap-6">
              <Link to="/how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
                {t("nav.howItWorks")}
              </Link>
              <Link to="/privacy-policy" className="text-sm text-muted-foreground/70 hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
              <a href="https://www.vector56.com/contact" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground/70 hover:text-foreground transition-colors">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
