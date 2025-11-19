import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { SuggestionCard } from "@/components/SuggestionCard";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Suggestion {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  views: number;
  created_at: string;
  profiles: {
    display_name: string;
  } | null;
  likes_count: number;
  comments_count: number;
}

const MySuggestions = () => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    loadSuggestions();
  }, [user, navigate]);

  const loadSuggestions = async () => {
    if (!user) return;

    try {
      const { data: suggestionsData, error } = await supabase
        .from("suggestions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const suggestionsWithCounts = await Promise.all(
        (suggestionsData || []).map(async (suggestion) => {
          const [{ data: profile }, { count: likesCount }, { count: commentsCount }] =
            await Promise.all([
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">My Suggestions</h1>
          <p className="text-muted-foreground">
            Track your submitted ideas and their momentum
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg mb-4">
              You haven't submitted any suggestions yet.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {suggestions.map((suggestion) => (
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

export default MySuggestions;