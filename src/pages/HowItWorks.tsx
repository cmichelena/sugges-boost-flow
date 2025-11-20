import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Lightbulb, Users, Heart, MessageCircle, TrendingUp, CheckCircle, Filter, UserCircle, Shield } from "lucide-react";
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
              If you see something, Suggistit
            </p>
          </div>

          <div className="space-y-8">
            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Lightbulb className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">1. Submit Your Suggestion</h3>
                  <p className="text-muted-foreground mb-3">
                    Click "Submit Suggestion" and share your idea with a title, description, and category. 
                    Each category may have different settings:
                  </p>
                  <ul className="space-y-2 text-muted-foreground text-sm">
                    <li className="flex items-start gap-2">
                      <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span><strong>Anonymous Option:</strong> Some categories allow anonymous submissions to encourage honest feedback</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Users className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span><strong>Team Assignment:</strong> Suggestions are automatically routed to responsible teams based on category</span>
                    </li>
                  </ul>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0">
                  <Heart className="w-6 h-6 text-secondary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">2. Community Engagement</h3>
                  <p className="text-muted-foreground mb-3">
                    Browse suggestions, like the ones you support, and share your thoughts through comments. 
                    Every interaction helps build momentum and surface the best ideas.
                  </p>
                  <ul className="space-y-2 text-muted-foreground text-sm">
                    <li className="flex items-start gap-2">
                      <Heart className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span><strong>Likes:</strong> Show support for suggestions you agree with</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <MessageCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span><strong>Comments:</strong> Share your thoughts, ask questions, or provide feedback</span>
                    </li>
                  </ul>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-momentum-fire/10 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-6 h-6 text-momentum-fire" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">3. Momentum Tracking</h3>
                  <p className="text-muted-foreground mb-4">
                    Each suggestion has a momentum level based on likes, comments, views, and 
                    time since submission. The activity dashboard shows momentum distribution and 
                    you can click momentum levels to filter suggestions by their heat level.
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
                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <UserCircle className="w-6 h-6 text-blue-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">4. Team Management & Assignments</h3>
                  <p className="text-muted-foreground mb-3">
                    Organizations can create teams and assign members to handle specific suggestion categories:
                  </p>
                  <ul className="space-y-2 text-muted-foreground text-sm">
                    <li className="flex items-start gap-2">
                      <Users className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span><strong>Team Routing:</strong> Suggestions automatically assigned to responsible teams based on category</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <UserCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span><strong>Individual Assignment:</strong> Team leads can assign specific suggestions to team members</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Filter className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span><strong>My Assignments:</strong> Quickly view suggestions assigned to you with the filter badge</span>
                    </li>
                  </ul>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">5. Status Workflow & Closure</h3>
                  <p className="text-muted-foreground mb-3">
                    Suggestions flow through a clear status workflow. Admins and assigned team members can update 
                    status to keep everyone informed. When closing a suggestion as Completed or Declined, a comment 
                    explaining the outcome is required to maintain transparency.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-muted rounded-full text-sm">Open</span>
                    <span className="px-3 py-1 bg-blue-500/10 text-blue-600 rounded-full text-sm">Under Review</span>
                    <span className="px-3 py-1 bg-purple-500/10 text-purple-600 rounded-full text-sm">Planned</span>
                    <span className="px-3 py-1 bg-amber-500/10 text-amber-600 rounded-full text-sm">In Progress</span>
                    <span className="px-3 py-1 bg-green-500/10 text-green-600 rounded-full text-sm">Completed</span>
                    <span className="px-3 py-1 bg-gray-500/10 text-gray-600 rounded-full text-sm">Declined</span>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                  <Filter className="w-6 h-6 text-purple-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">6. Powerful Filtering</h3>
                  <p className="text-muted-foreground mb-3">
                    Quickly find what matters most with powerful filtering options:
                  </p>
                  <ul className="space-y-2 text-muted-foreground text-sm">
                    <li className="flex items-start gap-2">
                      <TrendingUp className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span><strong>Momentum Levels:</strong> Click momentum circles in the activity dashboard to filter by heat level</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Filter className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span><strong>Categories:</strong> Filter suggestions by category using the dropdown menu</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span><strong>Status:</strong> View suggestions at specific workflow stages (Open, In Progress, etc.)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <UserCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span><strong>My Assignments:</strong> Toggle to see only suggestions assigned to you</span>
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