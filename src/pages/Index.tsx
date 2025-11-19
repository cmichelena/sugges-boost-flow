import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { SuggestionCard } from "@/components/SuggestionCard";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

const Index = () => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
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

  const allTags = Array.from(
    new Set(suggestions.flatMap((s) => s.ai_tags || []))
  ).sort();

  const filteredSuggestions = selectedTags.length === 0
    ? suggestions
    : suggestions.filter((s) =>
        s.ai_tags?.some((tag) => selectedTags.includes(tag))
      );

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

        {allTags.length > 0 && (
          <div className="mb-6">
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

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredSuggestions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              {suggestions.length === 0
                ? "No suggestions yet. Be the first to submit one!"
                : "No suggestions match the selected tags."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSuggestions.map((suggestion) => (
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
        )}
      </div>
    </div>
  );
};

export default Index;
