import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { MomentumDial } from "@/components/MomentumDial";
import { TrendingUp, Users, Zap, Target, ArrowRight, BarChart3 } from "lucide-react";
import logo from "@/assets/suggistit-logo.png";
import centerIcon from "@/assets/suggestion-box-center.png";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="container mx-auto px-4 py-20 lg:py-32 relative">
          <div className="max-w-4xl mx-auto text-center">
            <img src={centerIcon} alt="Suggistit" className="h-32 mx-auto mb-8" />
            <h1 className="text-5xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Turn Ideas Into Action
            </h1>
            <p className="text-xl lg:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Capture, prioritize, and track your team's best suggestions. Let momentum guide what matters most.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild className="text-lg px-8 py-6">
                <Link to="/auth">
                  Get Started <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="text-lg px-8 py-6">
                <Link to="/how-it-works">Learn More</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Momentum Dial Showcase */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-bold mb-4">Watch Ideas Gain Momentum</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Our intelligent momentum system tracks engagement and time to surface the ideas your team cares about most
              </p>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="flex flex-col items-center p-6 rounded-lg bg-card border hover:shadow-lg transition-shadow">
                <MomentumDial level="fresh" score={25} size="lg" />
              </div>
              <div className="flex flex-col items-center p-6 rounded-lg bg-card border hover:shadow-lg transition-shadow">
                <MomentumDial level="warming" score={100} size="lg" />
              </div>
              <div className="flex flex-col items-center p-6 rounded-lg bg-card border hover:shadow-lg transition-shadow">
                <MomentumDial level="heating" score={225} size="lg" />
              </div>
              <div className="flex flex-col items-center p-6 rounded-lg bg-card border hover:shadow-lg transition-shadow">
                <MomentumDial level="fire" score={450} size="lg" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-bold mb-4">Everything You Need</h2>
              <p className="text-xl text-muted-foreground">Powerful features to manage suggestions effectively</p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="p-8 rounded-lg bg-card border hover:border-primary/50 transition-colors">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Momentum Tracking</h3>
                <p className="text-muted-foreground">
                  Automatically prioritize ideas based on engagement, time, and team interest
                </p>
              </div>

              <div className="p-8 rounded-lg bg-card border hover:border-primary/50 transition-colors">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Team Collaboration</h3>
                <p className="text-muted-foreground">
                  Invite team members, assign suggestions, and work together seamlessly
                </p>
              </div>

              <div className="p-8 rounded-lg bg-card border hover:border-primary/50 transition-colors">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Smart Categories</h3>
                <p className="text-muted-foreground">
                  Organize suggestions with custom categories and automatic team routing
                </p>
              </div>

              <div className="p-8 rounded-lg bg-card border hover:border-primary/50 transition-colors">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Activity Dashboard</h3>
                <p className="text-muted-foreground">
                  Track trends, engagement metrics, and team activity at a glance
                </p>
              </div>

              <div className="p-8 rounded-lg bg-card border hover:border-primary/50 transition-colors">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Status Tracking</h3>
                <p className="text-muted-foreground">
                  Follow suggestions from submission to completion with clear status updates
                </p>
              </div>

              <div className="p-8 rounded-lg bg-card border hover:border-primary/50 transition-colors">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Anonymous Options</h3>
                <p className="text-muted-foreground">
                  Enable anonymous submissions where needed to encourage honest feedback
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-bold mb-6">Ready to Get Started?</h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join teams already using Suggistit to capture and act on their best ideas
            </p>
            <Button size="lg" asChild className="text-lg px-8 py-6">
              <Link to="/auth">
                Start Free Now <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-muted-foreground">© 2025 Suggistit. All rights reserved.</p>
            <div className="flex gap-6">
              <Link to="/how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
                How It Works
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
