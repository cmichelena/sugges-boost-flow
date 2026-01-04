import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SuggestionCard } from "@/components/SuggestionCard";
import { AppLayout } from "@/components/AppLayout";
import { Onboarding } from "@/components/Onboarding";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { toast } from "sonner";
import { User, ChevronDown, Loader2 } from "lucide-react";
import { MomentumActivityDashboard } from "@/components/MomentumActivityDashboard";
import { SuggestionJourneyChart } from "@/components/SuggestionJourneyChart";
import { calculateMomentum, getMomentumLevel, calculateReactionScore, type MomentumLevel } from "@/lib/momentum";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";

interface ReactionCounts {
  champion: number;
  support: number;
  neutral: number;
  concerns: number;
}

type ReactionType = "champion" | "support" | "neutral" | "concerns";

const Dashboard = () => {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showMyAssignments, setShowMyAssignments] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedMomentum, setSelectedMomentum] = useState<MomentumLevel | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showBrowseButton, setShowBrowseButton] = useState(true);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();
  const { activeOrganization, loading: orgLoading } = useOrganization();
  const { user, loading: authLoading } = useAuth();

  // Check for subscription success message
  useEffect(() => {
    const subscriptionStatus = searchParams.get("subscription");
    const tier = searchParams.get("tier");
    
    if (subscriptionStatus === "success" && tier) {
      toast.success(`Welcome to ${tier.charAt(0).toUpperCase() + tier.slice(1)}! 🎉`, {
        description: "Your subscription is now active.",
      });
      window.history.replaceState({}, "", "/dashboard");
    }
  }, [searchParams]);

  const scrollToSuggestions = () => {
    setShowBrowseButton(false);
    suggestionsRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Load suggestions function - defined before useEffect that uses it
  const loadSuggestions = async () => {
    if (!user || !activeOrganization) return;

    setLoading(true);

    // Check if user is new and needs onboarding
    const { data: profile } = await supabase
      .from("profiles")
      .select("created_at, onboarding_completed")
      .eq("id", user.id)
      .single();

    if (profile) {
      const createdAt = new Date(profile.created_at);
      const now = new Date();
      const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      setIsNewUser(hoursSinceCreation < 24);
      
      if (!profile.onboarding_completed) {
        setShowOnboarding(true);
      }
    }

    // Load categories
    const { data: categoriesData } = await supabase
      .from("suggestion_categories")
      .select("id, name")
      .eq("organization_id", activeOrganization.id)
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
      .eq("organization_id", activeOrganization.id)
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
      .select("suggestion_id, reaction_type, user_id")
      .in("suggestion_id", suggestionIds);

    // Aggregate reactions by suggestion and track user's reactions
    const reactionsMap = new Map<string, ReactionCounts>();
    const userReactionsMap = new Map<string, ReactionType | null>();
    suggestionIds.forEach(id => {
      reactionsMap.set(id, { champion: 0, support: 0, neutral: 0, concerns: 0 });
      userReactionsMap.set(id, null);
    });
    
    (reactionsData || []).forEach(r => {
      const counts = reactionsMap.get(r.suggestion_id);
      if (counts && r.reaction_type in counts) {
        counts[r.reaction_type as keyof ReactionCounts]++;
      }
      if (r.user_id === user.id) {
        userReactionsMap.set(r.suggestion_id, r.reaction_type as ReactionType);
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
        
      profilesData?.forEach(p => {
        profilesMap.set(p.id, p.display_name);
      });
    }

    // Map suggestions with profile data and reactions
    const suggestionsWithCounts = (data || []).map((suggestion: any) => {
      const reactions = reactionsMap.get(suggestion.id) || { champion: 0, support: 0, neutral: 0, concerns: 0 };
      const userReaction = userReactionsMap.get(suggestion.id) || null;
      return {
        ...suggestion,
        reactions,
        userReaction,
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

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    if (!orgLoading && activeOrganization) {
      loadSuggestions();
    }
  }, [navigate, user, authLoading, orgLoading, activeOrganization]);

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

  // Show loading state while auth or organization is loading
  if (authLoading || orgLoading) {
    return (
      <AppLayout>
        <DashboardSkeleton />
      </AppLayout>
    );
  }

  if (!activeOrganization) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground">No organization found. Please create or join an organization.</p>
        </div>
      </AppLayout>
    );
  }


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
  if (showMyAssignments && user) {
    filteredSuggestions = filteredSuggestions.filter(s => s.assigned_to_user_id === user.id);
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="font-bold">{t("common.dashboard")}</h1>
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
            
            {showBrowseButton && (
              <button
                onClick={scrollToSuggestions}
                className="md:hidden w-full flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors border-t border-border/30"
              >
                {t("dashboard.recentSuggestions")}
                <ChevronDown className="w-4 h-4 animate-bounce" />
              </button>
            )}
          </div>

          <Onboarding 
            open={showOnboarding} 
            onComplete={() => setShowOnboarding(false)} 
          />

          <div className="mb-4">
            <h2 className="text-2xl font-semibold mb-1">
              {isNewUser ? t("dashboard.welcomeNew") : t("dashboard.welcomeBack")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isNewUser 
                ? t("dashboard.beFirst")
                : t("dashboard.recentSuggestions")
              }
            </p>
          </div>

          <div ref={suggestionsRef} className="mb-6 scroll-mt-4 flex flex-wrap items-center gap-3">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px] bg-background">
                <SelectValue placeholder={t("suggestion.category")} />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="all">{t("dashboard.all")}</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] bg-background">
                <SelectValue placeholder={t("status.open")} />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="all">{t("dashboard.all")}</SelectItem>
                <SelectItem value="Open">{t("status.open")}</SelectItem>
                <SelectItem value="Under Review">{t("status.acknowledged")}</SelectItem>
                <SelectItem value="Planned">{t("status.planned")}</SelectItem>
                <SelectItem value="In Progress">{t("status.inProgress")}</SelectItem>
                <SelectItem value="Completed">{t("status.completed")}</SelectItem>
                <SelectItem value="Declined">{t("status.declined")}</SelectItem>
              </SelectContent>
            </Select>

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
              {t("dashboard.myAssignments")}
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : filteredSuggestions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">{t("dashboard.noSuggestions")}</p>
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
                  userReaction={suggestion.userReaction}
                  onReactionChange={(counts, userReaction) => {
                    setSuggestions(prev => prev.map(s => 
                      s.id === suggestion.id 
                        ? { ...s, reactions: counts, userReaction } 
                        : s
                    ));
                  }}
                  onClick={() => navigate(`/suggestion/${suggestion.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
