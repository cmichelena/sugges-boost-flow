import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { SuggestionCard } from "@/components/SuggestionCard";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { calculateMomentum } from "@/lib/momentum";

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

  const filteredSuggestions = selectedTags.length === 0
    ? displaySuggestions
    : displaySuggestions.filter((s) =>
        s.ai_tags?.some((tag) => selectedTags.includes(tag))
      );

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
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">All Suggestions</h1>
          <p className="text-xl text-primary font-semibold mb-2">
            If you see something, Suggistit.
          </p>
          <p className="text-muted-foreground">
            Browse and engage with ideas from the community
          </p>
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

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : sortedSuggestions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              No suggestions match the selected tags.
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
    </div>
  );
};

export default Index;
