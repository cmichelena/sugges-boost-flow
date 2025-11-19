import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { SuggestionCard } from "@/components/SuggestionCard";
import { Loader2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { calculateMomentum, getMomentumLevel } from "@/lib/momentum";
import type { MomentumLevel } from "@/lib/momentum";
import vector56Logo from "@/assets/vector56-logo.png";

interface Suggestion {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  views: number;
  created_at: string;
  ai_tags: string[] | null;
  profiles: {
    display_name: string;
  } | null;
  likes_count: number;
  comments_count: number;
}

interface MomentumStats {
  fresh: number;
  warming: number;
  heating: number;
  fire: number;
}

type SortOption = "newest" | "oldest" | "momentum" | "most-liked" | "most-commented";

const SAMPLE_SUGGESTIONS: Suggestion[] = [
  {
    id: "sample-1",
    title: "Add Dark Mode Toggle",
    description: "It would be great to have a dark mode option in the settings. Many users prefer dark themes, especially when working late at night.",
    category: "Feature",
    status: "Open",
    views: 234,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    ai_tags: ["UI", "Accessibility", "User Experience"],
    profiles: { display_name: "Sample User" },
    likes_count: 45,
    comments_count: 12,
  },
  {
    id: "sample-2",
    title: "Improve Mobile Navigation",
    description: "The navigation menu is a bit difficult to use on mobile devices. Consider adding a hamburger menu or improving the touch targets.",
    category: "Enhancement",
    status: "Open",
    views: 189,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    ai_tags: ["Mobile", "UI", "Navigation"],
    profiles: { display_name: "Demo User" },
    likes_count: 32,
    comments_count: 8,
  },
  {
    id: "sample-3",
    title: "Export Data Feature",
    description: "Allow users to export their data in CSV or JSON format. This would be useful for backing up information or analyzing trends.",
    category: "Feature",
    status: "Open",
    views: 156,
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    ai_tags: ["Data", "Export", "Analytics"],
    profiles: { display_name: "Sample User" },
    likes_count: 28,
    comments_count: 5,
  },
  {
    id: "sample-4",
    title: "Add Search Functionality",
    description: "A search bar would help users find specific suggestions quickly, especially as the number of suggestions grows.",
    category: "Feature",
    status: "Open",
    views: 312,
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    ai_tags: ["Search", "User Experience", "Performance"],
    profiles: { display_name: "Demo User" },
    likes_count: 67,
    comments_count: 15,
  },
];

const Index = () => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMomentum, setSelectedMomentum] = useState<MomentumLevel | null>(null);
  const [momentumStats, setMomentumStats] = useState<MomentumStats>({
    fresh: 0,
    warming: 0,
    heating: 0,
    fire: 0,
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadSuggestions();
  }, []);

  const loadSuggestions = async () => {
    try {
      const { data: suggestionsData, error } = await supabase
        .from("suggestions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch related data separately
      const suggestionsWithCounts = await Promise.all(
        (suggestionsData || []).map(async (suggestion) => {
          const [{ data: profile }, { count: likesCount }, { count: commentsCount }] = await Promise.all([
            supabase
              .from("profiles")
              .select("display_name")
              .eq("id", suggestion.user_id)
              .single(),
            supabase
              .from("likes")
              .select("*", { count: "exact", head: true })
              .eq("suggestion_id", suggestion.id),
            supabase
              .from("comments")
              .select("*", { count: "exact", head: true })
              .eq("suggestion_id", suggestion.id),
          ]);

          return {
            ...suggestion,
            profiles: profile,
            likes_count: likesCount || 0,
            comments_count: commentsCount || 0,
          };
        })
      );

      setSuggestions(suggestionsWithCounts);
      
      // Calculate momentum stats
      const stats: MomentumStats = { fresh: 0, warming: 0, heating: 0, fire: 0 };
      suggestionsWithCounts.forEach((suggestion) => {
        const momentum = calculateMomentum(
          suggestion.likes_count,
          suggestion.comments_count,
          suggestion.views,
          new Date(suggestion.created_at)
        );
        const level = getMomentumLevel(momentum);
        stats[level]++;
      });
      setMomentumStats(stats);
    } catch (error) {
      console.error("Error loading suggestions:", error);
    } finally {
      setLoading(false);
    }
  };

  const displaySuggestions = suggestions.length === 0 ? SAMPLE_SUGGESTIONS : suggestions;

  const allTags = Array.from(
    new Set(displaySuggestions.flatMap((s) => s.ai_tags || []))
  ).sort();

  let filteredSuggestions = displaySuggestions;

  // Filter by search query
  if (searchQuery) {
    filteredSuggestions = filteredSuggestions.filter((s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  // Filter by tags
  if (selectedTags.length > 0) {
    filteredSuggestions = filteredSuggestions.filter((s) =>
      s.ai_tags?.some((tag) => selectedTags.includes(tag))
    );
  }

  // Filter by momentum level
  if (selectedMomentum) {
    filteredSuggestions = filteredSuggestions.filter((s) => {
      const momentum = calculateMomentum(
        s.likes_count,
        s.comments_count,
        s.views,
        new Date(s.created_at)
      );
      return getMomentumLevel(momentum) === selectedMomentum;
    });
  }

  const sortedSuggestions = [...filteredSuggestions].sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case "oldest":
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case "momentum": {
        const momentumA = calculateMomentum(
          a.likes_count,
          a.comments_count,
          a.views,
          new Date(a.created_at)
        );
        const momentumB = calculateMomentum(
          b.likes_count,
          b.comments_count,
          b.views,
          new Date(b.created_at)
        );
        return momentumB - momentumA;
      }
      case "most-liked":
        return b.likes_count - a.likes_count;
      case "most-commented":
        return b.comments_count - a.comments_count;
      default:
        return 0;
    }
  });

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="mb-6">
            <img 
              src={vector56Logo} 
              alt="Vector56" 
              className="h-16 mx-auto mb-4 object-contain"
            />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-4">
            If you see something,{" "}
            <span className="text-primary">Suggistit</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-6">
            Share your ideas, support great suggestions, and help shape what's next. 
            Every voice matters in building something better together.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-full">
            <span className="text-sm font-medium">{suggestions.length} active suggestions</span>
            {selectedMomentum && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-sm text-primary capitalize">{selectedMomentum} filtered</span>
              </>
            )}
          </div>
        </div>

        {/* Momentum Filter Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-center mb-6">
            Filter by Momentum
          </h2>

        {!loading && suggestions.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 mb-12">
            <button
              onClick={() => setSelectedMomentum(selectedMomentum === "fresh" ? null : "fresh")}
              className={`flex flex-col items-center gap-2 transition-opacity ${
                selectedMomentum && selectedMomentum !== "fresh" ? "opacity-40" : "opacity-100"
              } hover:opacity-100 cursor-pointer`}
            >
              <div className={`w-12 h-12 rounded-full bg-momentum-fresh flex items-center justify-center ${
                selectedMomentum === "fresh" ? "ring-2 ring-momentum-fresh ring-offset-2" : ""
              }`}>
                <span className="text-sm font-semibold text-white">{momentumStats.fresh}</span>
              </div>
              <span className="text-xs text-muted-foreground">Fresh</span>
            </button>
            
            <button
              onClick={() => setSelectedMomentum(selectedMomentum === "warming" ? null : "warming")}
              className={`flex flex-col items-center gap-2 transition-opacity ${
                selectedMomentum && selectedMomentum !== "warming" ? "opacity-40" : "opacity-100"
              } hover:opacity-100 cursor-pointer`}
            >
              <div className={`w-12 h-12 rounded-full bg-momentum-warming flex items-center justify-center ${
                selectedMomentum === "warming" ? "ring-2 ring-momentum-warming ring-offset-2" : ""
              }`}>
                <span className="text-sm font-semibold text-white">{momentumStats.warming}</span>
              </div>
              <span className="text-xs text-muted-foreground">Warming</span>
            </button>
            
            <button
              onClick={() => setSelectedMomentum(selectedMomentum === "heating" ? null : "heating")}
              className={`flex flex-col items-center gap-2 transition-opacity ${
                selectedMomentum && selectedMomentum !== "heating" ? "opacity-40" : "opacity-100"
              } hover:opacity-100 cursor-pointer`}
            >
              <div className={`w-12 h-12 rounded-full bg-momentum-heating flex items-center justify-center ${
                selectedMomentum === "heating" ? "ring-2 ring-momentum-heating ring-offset-2" : ""
              }`}>
                <span className="text-sm font-semibold text-white">{momentumStats.heating}</span>
              </div>
              <span className="text-xs text-muted-foreground">Heating</span>
            </button>
            
            <button
              onClick={() => setSelectedMomentum(selectedMomentum === "fire" ? null : "fire")}
              className={`flex flex-col items-center gap-2 transition-opacity ${
                selectedMomentum && selectedMomentum !== "fire" ? "opacity-40" : "opacity-100"
              } hover:opacity-100 cursor-pointer`}
            >
              <div className={`w-12 h-12 rounded-full bg-momentum-fire flex items-center justify-center animate-pulse ${
                selectedMomentum === "fire" ? "ring-2 ring-momentum-fire ring-offset-2" : ""
              }`}>
                <span className="text-sm font-semibold text-white">{momentumStats.fire}</span>
              </div>
              <span className="text-xs text-muted-foreground">On Fire</span>
            </button>
          </div>
        )}
        </div>

        {/* Search and Filters Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Browse Suggestions</h2>
          
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="text"
              placeholder="Search suggestions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {allTags.length > 0 && (
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-2">Filter by tags:</p>
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          <div className="sm:w-48">
            <p className="text-sm text-muted-foreground mb-2">Sort by:</p>
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="momentum">Highest Momentum</SelectItem>
                <SelectItem value="most-liked">Most Liked</SelectItem>
                <SelectItem value="most-commented">Most Commented</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : sortedSuggestions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              {searchQuery 
                ? "No suggestions match your search."
                : selectedTags.length > 0 
                ? "No suggestions match the selected tags."
                : selectedMomentum
                ? "No suggestions at this momentum level."
                : "No suggestions found."}
            </p>
          </div>
        ) : (
          <>
            {suggestions.length === 0 && (
              <div className="mb-4 p-4 bg-muted/50 rounded-lg border border-border">
                <p className="text-sm text-muted-foreground text-center">
                  👋 These are sample suggestions to help you get started. Submit your own to see them here!
                </p>
              </div>
            )}
            <div className="space-y-4">
              {sortedSuggestions.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  id={suggestion.id}
                  title={suggestion.title}
                  description={suggestion.description}
                  category={suggestion.category}
                  status={suggestion.status}
                  likes={suggestion.likes_count}
                  comments={suggestion.comments_count}
                  views={suggestion.views}
                  createdAt={suggestion.created_at}
                  authorName={suggestion.profiles?.display_name || "Anonymous"}
                  onClick={() => navigate(`/suggestion/${suggestion.id}`)}
                />
              ))}
            </div>
          </>
        )}
      </div>
      
      <footer className="py-6 text-center border-t border-border/40">
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span>Created by</span>
          <img src={vector56Logo} alt="Vector56" className="h-4 opacity-70" />
        </div>
      </footer>
    </div>
  );
};

export default Index;
