import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SuggestionCard } from "@/components/SuggestionCard";
import { Navbar } from "@/components/Navbar";
import { Onboarding } from "@/components/Onboarding";
import { toast } from "sonner";
import { Loader2, User } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MomentumActivityDashboard } from "@/components/MomentumActivityDashboard";
import { SuggestionJourneyChart } from "@/components/SuggestionJourneyChart";
import { calculateMomentum, getMomentumLevel, type MomentumLevel } from "@/lib/momentum";

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
  const navigate = useNavigate();

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
        likes:likes(count),
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

    // Map suggestions with profile data
    const suggestionsWithCounts = (data || []).map((suggestion: any) => ({
      ...suggestion,
      likes: suggestion.likes?.[0]?.count || 0,
      comments: suggestion.comments?.[0]?.count || 0,
      profiles: suggestion.is_anonymous ? null : { 
        display_name: profilesMap.get(suggestion.user_id) || null 
      },
      assigned_user: suggestion.assigned_to_user_id ? {
        profiles: {
          display_name: profilesMap.get(suggestion.assigned_to_user_id) || null
        }
      } : null
    }));

    setSuggestions(suggestionsWithCounts);
    setLoading(false);
  };

  const momentumStats = useMemo(() => {
    const result = { fresh: 0, warming: 0, heating: 0, fire: 0 };
    
    for (const s of suggestions) {
      const score = calculateMomentum(
        s.likes ?? 0,
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
    let totalLikes = 0;
    let totalComments = 0;

    for (const s of suggestions) {
      const status = s.status || "";
      if (status === "Open" || status === "") open++;
      if (status === "In Progress" || status === "Under Review" || status === "Planned") inProgress++;
      if (status === "Completed") completed++;
      if (status === "Declined") declined++;

      totalLikes += s.likes ?? 0;
      totalComments += s.comments ?? 0;
    }

    return { total, open, inProgress, completed, declined, totalLikes, totalComments };
  }, [suggestions]);

  let filteredSuggestions = suggestions;

  if (selectedMomentum) {
    filteredSuggestions = filteredSuggestions.filter((s) => {
      const score = calculateMomentum(
        s.likes ?? 0,
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
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                {isNewUser ? "Welcome to Suggistit! 🎉" : "Welcome back!"}
              </h1>
              <p className="text-muted-foreground">
                {isNewUser 
                  ? "Start exploring suggestions and share your ideas with the community"
                  : "Browse and vote on community suggestions"
                }
              </p>
            </div>
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
          </div>

          <Onboarding 
            open={showOnboarding} 
            onComplete={() => setShowOnboarding(false)} 
          />

          <div className="flex gap-4 mb-6 flex-wrap">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Statuses" />
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

            <Badge
              variant={showMyAssignments ? "default" : "outline"}
              className="cursor-pointer px-4 py-2 text-sm"
              onClick={() => setShowMyAssignments(!showMyAssignments)}
            >
              <User className="w-4 h-4 mr-2" />
              My Assignments
            </Badge>
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
                  likes={suggestion.likes}
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
