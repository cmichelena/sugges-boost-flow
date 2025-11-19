import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Lightbulb, Sparkles, Heart, MessageCircle, TrendingUp, CheckCircle, Search, Filter } from "lucide-react";
import { MomentumDial } from "@/components/MomentumDial";

const HowItWorks = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">How Suggistit Works</h1>
            <p className="text-xl text-muted-foreground">
              Share ideas, track momentum, and make your voice heard
            </p>
          </div>

          <div className="space-y-8">
            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Lightbulb className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">1. Submit Your Idea</h3>
                  <p className="text-muted-foreground">
                    Have a suggestion? Click "Submit Suggestion" and share your idea with a title, 
                    description, and category. Whether it's a feature request, improvement, or issue—
                    every voice matters.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-accent" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">2. AI Enhancement</h3>
                  <p className="text-muted-foreground">
                    Our AI automatically improves your submission for clarity and adds 
                    relevant tags. Your original idea is preserved, but presented in a way 
                    that's easier for others to understand and engage with.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0">
                  <Heart className="w-6 h-6 text-secondary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">3. Community Engagement</h3>
                  <p className="text-muted-foreground">
                    Browse suggestions, like the ones you support, and share your thoughts 
                    through comments. Use the search bar to find specific ideas, or filter 
                    by tags and categories. Every interaction helps surface the best ideas.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-momentum-fire/10 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-6 h-6 text-momentum-fire" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">4. Momentum Tracking</h3>
                  <p className="text-muted-foreground mb-4">
                    Each suggestion has a momentum level based on likes, comments, views, and 
                    time since submission. Click the momentum circles on the dashboard to filter 
                    suggestions by their heat level—from Fresh ideas to those On Fire!
                  </p>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <MomentumDial level="fresh" score={25} size="sm" />
                      <span className="text-sm">Fresh</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MomentumDial level="warming" score={100} size="sm" />
                      <span className="text-sm">Warming Up</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MomentumDial level="heating" score={200} size="sm" />
                      <span className="text-sm">Heating Up</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MomentumDial level="fire" score={350} size="sm" />
                      <span className="text-sm">On Fire</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">5. Status Updates</h3>
                  <p className="text-muted-foreground mb-3">
                    Track progress as suggestions move through different stages:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-muted rounded-full text-sm">Open</span>
                    <span className="px-3 py-1 bg-blue-500/10 text-blue-600 rounded-full text-sm">In Review</span>
                    <span className="px-3 py-1 bg-amber-500/10 text-amber-600 rounded-full text-sm">In Progress</span>
                    <span className="px-3 py-1 bg-green-500/10 text-green-600 rounded-full text-sm">Completed</span>
                    <span className="px-3 py-1 bg-gray-500/10 text-gray-600 rounded-full text-sm">Rejected</span>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <Search className="w-6 h-6 text-blue-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">6. Find What Matters</h3>
                  <p className="text-muted-foreground mb-3">
                    Use powerful tools to discover relevant suggestions:
                  </p>
                  <ul className="space-y-2 text-muted-foreground text-sm">
                    <li className="flex items-start gap-2">
                      <Search className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span><strong>Search:</strong> Find suggestions by keywords in titles and descriptions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Filter className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span><strong>Filter:</strong> Click momentum circles to see suggestions at specific heat levels</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <TrendingUp className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span><strong>Sort:</strong> Order by newest, momentum, likes, or comments</span>
                    </li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>

          <div className="mt-12 text-center">
            <h2 className="text-2xl font-bold mb-4">Ready to share your ideas?</h2>
            <div className="flex justify-center gap-4">
              <Button size="lg" onClick={() => navigate("/submit")}>
                Submit a Suggestion
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/")}>
                Browse Suggestions
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;