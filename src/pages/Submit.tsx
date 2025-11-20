import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Navbar } from "@/components/Navbar";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { Checkbox } from "@/components/ui/checkbox";
import { SuggestionDisclaimer } from "@/components/SuggestionDisclaimer";

const suggestionSchema = z.object({
  title: z.string().trim().min(5, 'Title must be at least 5 characters').max(100, 'Title must be less than 100 characters'),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(2000, 'Description must be less than 2000 characters'),
  categoryId: z.string().min(1, 'Please select a category')
});

interface Category {
  id: string;
  name: string;
  can_be_anonymous?: boolean;
}

const Submit = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const navigate = useNavigate();

  // Fetch user's organization and categories on mount
  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", session.user.id)
        .eq("status", "active")
        .single();

      if (error) {
        console.error("Error fetching organization:", error);
        toast.error("Failed to load organization");
        return;
      }

      setOrganizationId(data.organization_id);

      // Load categories for this organization
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("suggestion_categories")
        .select("id, name, can_be_anonymous")
        .eq("organization_id", data.organization_id)
        .eq("is_hidden", false)
        .order("display_order");

      if (categoriesError) {
        console.error("Error fetching categories:", categoriesError);
        toast.error("Failed to load categories");
        return;
      }

      setCategories(categoriesData || []);
    };

    fetchData();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate form inputs
      const validation = suggestionSchema.safeParse({ title, description, categoryId });
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        setLoading(false);
        return;
      }

      const selectedCategory = categories.find(c => c.id === categoryId);

      // Get the current session to ensure we have a valid token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        toast.error("Please sign in to submit a suggestion");
        navigate("/auth");
        return;
      }

      // Call AI to improve the suggestion with explicit auth header
      const { data: improved, error: aiError } = await supabase.functions.invoke(
        "improve-suggestion",
        {
          body: { title, description, category: selectedCategory?.name || "Other" },
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        }
      );

      if (aiError) {
        console.error("AI improvement error:", aiError);
        toast.error("Failed to improve suggestion with AI");
      }

      // Get auto-assignment data
      const { data: assignmentData } = await supabase
        .rpc('auto_assign_suggestion_to_team', { _category_id: categoryId });

      // Insert the suggestion with category_id and assignment
      const { error } = await supabase.from("suggestions").insert({
        user_id: isAnonymous ? null : session.user.id,
        organization_id: organizationId,
        title: improved?.improved_title || title,
        description: improved?.improved_description || description,
        original_title: title,
        original_description: description,
        category: selectedCategory?.name || "Other",
        category_id: categoryId,
        ai_improved_title: improved?.improved_title,
        ai_improved_description: improved?.improved_description,
        ai_tags: improved?.tags || [],
        status: "Open",
        is_anonymous: isAnonymous,
        assigned_team_id: assignmentData?.[0]?.team_id || null,
        assigned_to_user_id: assignmentData?.[0]?.assigned_user_id || null,
      });

      if (error) throw error;

      toast.success("Suggestion submitted successfully!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card className="p-8">
            <h1 className="text-3xl font-bold mb-2">Submit a Suggestion</h1>
            <p className="text-muted-foreground mb-6">
              Share your ideas to improve our organization. AI will help refine your suggestion.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="Brief summary of your suggestion"
                  maxLength={100}
                />
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select 
                  value={categoryId} 
                  onValueChange={(val) => {
                    setCategoryId(val);
                    const category = categories.find(c => c.id === val);
                    if (!category?.can_be_anonymous) {
                      setIsAnonymous(false);
                    }
                  }} 
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {categoryId && categories.find(c => c.id === categoryId)?.can_be_anonymous && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="anonymous"
                    checked={isAnonymous}
                    onCheckedChange={(checked) => setIsAnonymous(checked === true)}
                  />
                  <Label
                    htmlFor="anonymous"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Submit anonymously
                  </Label>
                </div>
              )}

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  placeholder="Describe your suggestion in detail..."
                  rows={6}
                  maxLength={2000}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  {description.length}/2000 characters
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {loading ? "Submitting..." : "Submit Suggestion"}
              </Button>
            </form>

            <SuggestionDisclaimer />
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Submit;
