import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SuggestionCard } from "@/components/SuggestionCard";
import { Navbar } from "@/components/Navbar";
import { Onboarding } from "@/components/Onboarding";
import { toast } from "sonner";
import { Loader2, User, ChevronDown } from "lucide-react";
import { MomentumActivityDashboard } from "@/components/MomentumActivityDashboard";
import { SuggestionJourneyChart } from "@/components/SuggestionJourneyChart";
import { calculateMomentum, getMomentumLevel, calculateReactionScore, type MomentumLevel } from "@/lib/momentum";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ReactionCounts {
  champion: number;
  support: number;
  neutral: number;
  concerns: number;
}

const Dashboard = () => {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showMyAssignments, setShowMyAssignments] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedMomentum, setSelectedMomentum] = useState<MomentumLevel | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showBrowseButton, setShowBrowseButton] = useState(true);
  const navigate = useNavigate();
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const scrollToSuggestions = () => {
    setShowBrowseButton(false);
    suggestionsRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    loadSuggestions();
  }, [navigate]);

  const loadSuggestions = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    setCurrentUserId(session.user.id);

    // Check if user is new and needs onboarding
    const { data: profile } = await supabase
      .from("profiles")
      .select("created_at, onboarding_completed")
      .eq("id", session.user.id)
      .single();

    if (profile) {
      const createdAt = new Date(profile.created_at);
      const now = new Date();
      const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      
      // User is "new" if account created within last 24 hours
      setIsNewUser(hoursSinceCreation < 24);
      
      // Show onboarding if not completed
      if (!profile.onboarding_completed) {
        setShowOnboarding(true);
      }
    }

    const { data: orgMember, error: orgError } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", session.user.id)
      .eq("status", "active")
      .single();

    if (orgError || !orgMember) {
      toast.error("Failed to load organization");
      setLoading(false);
      return;
    }

    // Load categories
    const { data: categoriesData } = await supabase
      .from("suggestion_categories")
      .select("id, name")
      .eq("organization_id", orgMember.organization_id)
      .eq("is_hidden", false)
      .order("display_order");

    setCategories(categoriesData || []);

    const { data, error } = await supabase
      .from("suggestions")
      .select(`
        *,
        comments:comments!comments_suggestion_id_fkey(count),
        assigned_team:assigned_team_id (
          id,
          name
        )
      `)
      .eq("organization_id", orgMember.organization_id)
      .eq("archived", false)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load suggestions");
      setLoading(false);
      return;
    }

    // Get suggestion IDs for reactions lookup
    const suggestionIds = (data || []).map(s => s.id);
    
    // Fetch reactions for all suggestions
    const { data: reactionsData } = await supabase
      .from("reactions")
      .select("suggestion_id, reaction_type")
      .in("suggestion_id", suggestionIds);

    // Aggregate reactions by suggestion
    const reactionsMap = new Map<string, ReactionCounts>();
    suggestionIds.forEach(id => {
      reactionsMap.set(id, { champion: 0, support: 0, neutral: 0, concerns: 0 });
    });
    
    (reactionsData || []).forEach(r => {
      const counts = reactionsMap.get(r.suggestion_id);
      if (counts && r.reaction_type in counts) {
        counts[r.reaction_type as keyof ReactionCounts]++;
      }
    });

    // Get unique user IDs for profile lookup (including assigned users)
    const userIds = [...new Set(
      (data || [])
        .flatMap(s => [
          !s.is_anonymous && s.user_id ? s.user_id : null,
          s.assigned_to_user_id ? s.assigned_to_user_id : null
        ])
        .filter(Boolean)
    )];

    // Fetch profiles for these users
    const profilesMap = new Map();
    if (userIds.length > 0) {
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", userIds);
        
      profilesData?.forEach(profile => {
        profilesMap.set(profile.id, profile.display_name);
      });
    }

    // Map suggestions with profile data and reactions
    const suggestionsWithCounts = (data || []).map((suggestion: any) => {
      const reactions = reactionsMap.get(suggestion.id) || { champion: 0, support: 0, neutral: 0, concerns: 0 };
      return {
        ...suggestion,
        reactions,
        comments: suggestion.comments?.[0]?.count || 0,
        profiles: suggestion.is_anonymous ? null : { 
          display_name: profilesMap.get(suggestion.user_id) || null 
        },
        assigned_user: suggestion.assigned_to_user_id ? {
          profiles: {
            display_name: profilesMap.get(suggestion.assigned_to_user_id) || null
          }
        } : null
      };
    });

    setSuggestions(suggestionsWithCounts);
    setLoading(false);
  };

  const momentumStats = useMemo(() => {
    const result = { fresh: 0, warming: 0, heating: 0, fire: 0 };
    
    for (const s of suggestions) {
      const reactionScore = calculateReactionScore(
        s.reactions?.champion ?? 0,
        s.reactions?.support ?? 0,
        s.reactions?.neutral ?? 0,
        s.reactions?.concerns ?? 0
      );
      const score = calculateMomentum(
        reactionScore,
        s.comments ?? 0,
        s.views ?? 0,
        new Date(s.created_at)
      );
      const level = getMomentumLevel(score);
      result[level] += 1;
    }
    return result;
  }, [suggestions]);

  const activityStats = useMemo(() => {
    let total = suggestions.length;
    let open = 0;
    let inProgress = 0;
    let completed = 0;
    let declined = 0;
    let totalReactionScore = 0;
    let totalComments = 0;

    for (const s of suggestions) {
      const status = s.status || "";
      if (status === "Open" || status === "") open++;
      if (status === "In Progress" || status === "Under Review" || status === "Planned") inProgress++;
      if (status === "Completed") completed++;
      if (status === "Declined") declined++;

      const reactionScore = calculateReactionScore(
        s.reactions?.champion ?? 0,
        s.reactions?.support ?? 0,
        s.reactions?.neutral ?? 0,
        s.reactions?.concerns ?? 0
      );
      totalReactionScore += reactionScore;
      totalComments += s.comments ?? 0;
    }

    return { total, open, inProgress, completed, declined, totalLikes: totalReactionScore, totalComments };
  }, [suggestions]);

  let filteredSuggestions = suggestions;

  if (selectedMomentum) {
    filteredSuggestions = filteredSuggestions.filter((s) => {
      const reactionScore = calculateReactionScore(
        s.reactions?.champion ?? 0,
        s.reactions?.support ?? 0,
        s.reactions?.neutral ?? 0,
        s.reactions?.concerns ?? 0
      );
      const score = calculateMomentum(
        reactionScore,
        s.comments ?? 0,
        s.views ?? 0,
        new Date(s.created_at)
      );
      const level = getMomentumLevel(score);
      return level === selectedMomentum;
    });
  }
  if (categoryFilter !== "all") {
    filteredSuggestions = filteredSuggestions.filter(s => s.category_id === categoryFilter);
  }
  if (statusFilter !== "all") {
    filteredSuggestions = filteredSuggestions.filter(s => s.status === statusFilter);
  }
  if (showMyAssignments && currentUserId) {
    filteredSuggestions = filteredSuggestions.filter(s => s.assigned_to_user_id === currentUserId);
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="font-bold">Dashboard</h1>
          </div>

          <div className="mb-6 space-y-4">
            <MomentumActivityDashboard
              momentumStats={momentumStats}
              activityStats={activityStats}
              selectedMomentum={selectedMomentum}
              onMomentumClick={(level) =>
                setSelectedMomentum((current) => (current === level ? null : level))
              }
            />
            <SuggestionJourneyChart suggestions={suggestions} />
            
            {/* Browse Suggestions Button - Mobile Only */}
            {showBrowseButton && (
              <button
                onClick={scrollToSuggestions}
                className="md:hidden w-full flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors border-t border-border/30"
              >
                Browse Suggestions
                <ChevronDown className="w-4 h-4 animate-bounce" />
              </button>
            )}
          </div>

          <Onboarding 
            open={showOnboarding} 
            onComplete={() => setShowOnboarding(false)} 
          />

          {/* Welcome message above suggestions */}
          <div className="mb-4">
            <h2 className="text-2xl font-semibold mb-1">
              {isNewUser ? "Welcome to Suggistit! 🎉" : "Welcome back!"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isNewUser 
                ? "Start exploring suggestions and share your ideas with the community"
                : "Browse and vote on community suggestions"
              }
            </p>
          </div>

          {/* Filters */}
          <div ref={suggestionsRef} className="mb-6 scroll-mt-4 flex flex-wrap items-center gap-3">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px] bg-background">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] bg-background">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="Under Review">Under Review</SelectItem>
                <SelectItem value="Planned">Planned</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Declined">Declined</SelectItem>
              </SelectContent>
            </Select>

            {/* My Assignments */}
            <button
              onClick={() => setShowMyAssignments(!showMyAssignments)}
              className={`
                px-3 py-2 rounded-md text-sm font-medium transition-all duration-200
                border flex items-center gap-1.5
                ${showMyAssignments
                  ? "bg-primary border-primary text-primary-foreground"
                  : "bg-background border-input text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }
              `}
            >
              <User className="w-4 h-4" />
              My Assignments
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : filteredSuggestions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No suggestions found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSuggestions.map((suggestion: any) => (
                <SuggestionCard
                  key={suggestion.id}
                  id={suggestion.id}
                  title={suggestion.title}
                  description={suggestion.description}
                  category={suggestion.category}
                  status={suggestion.status}
                  reactions={suggestion.reactions}
                  comments={suggestion.comments}
                  views={suggestion.views}
                  createdAt={suggestion.created_at}
                  authorName={suggestion.profiles?.display_name || null}
                  isAnonymous={suggestion.is_anonymous}
                  assignedToUserName={suggestion.assigned_user?.profiles?.display_name || null}
                  assignedToTeamName={suggestion.assigned_team?.name || null}
                  onClick={() => navigate(`/suggestion/${suggestion.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
