import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { toast } from "sonner";
import { Loader2, ScrollText } from "lucide-react";
import { z } from "zod";
import { Checkbox } from "@/components/ui/checkbox";
import { SuggestionDisclaimer } from "@/components/SuggestionDisclaimer";
import { FileUpload } from "@/components/FileUpload";

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
  const [attachments, setAttachments] = useState<File[]>([]);
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
      const { data: suggestionData, error } = await supabase.from("suggestions").insert({
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
      }).select('id').single();

      if (error) throw error;

      // Upload attachments if any
      if (attachments.length > 0 && suggestionData) {
        for (const file of attachments) {
          const fileExt = file.name.split('.').pop();
          const filePath = `${session.user.id}/${suggestionData.id}/${crypto.randomUUID()}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('suggestion-attachments')
            .upload(filePath, file);

          if (uploadError) {
            console.error('Upload error:', uploadError);
            continue;
          }

          await supabase.from('suggestion_attachments').insert({
            suggestion_id: suggestionData.id,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            mime_type: file.type,
            uploaded_by: session.user.id,
          });
        }
      }

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
                <div className="relative">
                  <ScrollText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    placeholder="Brief summary of your suggestion"
                    maxLength={100}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label>Category</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {categories.map((cat, index) => {
                    const isSelected = categoryId === cat.id;
                    const isPrivate = cat.name.toLowerCase().includes('private');
                    
                    // Color palette for categories
                    const colorVariants = [
                      { bg: 'bg-blue-500/10', border: 'border-blue-500', text: 'text-blue-600 dark:text-blue-400', hoverBg: 'hover:bg-blue-500/5' },
                      { bg: 'bg-emerald-500/10', border: 'border-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', hoverBg: 'hover:bg-emerald-500/5' },
                      { bg: 'bg-amber-500/10', border: 'border-amber-500', text: 'text-amber-600 dark:text-amber-400', hoverBg: 'hover:bg-amber-500/5' },
                      { bg: 'bg-rose-500/10', border: 'border-rose-500', text: 'text-rose-600 dark:text-rose-400', hoverBg: 'hover:bg-rose-500/5' },
                      { bg: 'bg-cyan-500/10', border: 'border-cyan-500', text: 'text-cyan-600 dark:text-cyan-400', hoverBg: 'hover:bg-cyan-500/5' },
                      { bg: 'bg-orange-500/10', border: 'border-orange-500', text: 'text-orange-600 dark:text-orange-400', hoverBg: 'hover:bg-orange-500/5' },
                      { bg: 'bg-indigo-500/10', border: 'border-indigo-500', text: 'text-indigo-600 dark:text-indigo-400', hoverBg: 'hover:bg-indigo-500/5' },
                      { bg: 'bg-pink-500/10', border: 'border-pink-500', text: 'text-pink-600 dark:text-pink-400', hoverBg: 'hover:bg-pink-500/5' },
                    ];
                    
                    // Private category always gets purple
                    const privateColor = { bg: 'bg-purple-500/10', border: 'border-purple-500', text: 'text-purple-600 dark:text-purple-400', hoverBg: 'hover:bg-purple-500/5' };
                    const color = isPrivate ? privateColor : colorVariants[index % colorVariants.length];
                    
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setCategoryId(cat.id);
                          if (!cat.can_be_anonymous) {
                            setIsAnonymous(false);
                          }
                        }}
                        className={`
                          px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
                          border-2 hover:scale-105 active:scale-95
                          ${isSelected 
                            ? `${color.bg} ${color.border} ${color.text}`
                            : `bg-muted/30 border-muted-foreground/20 ${color.text} opacity-60 hover:opacity-100 ${color.hoverBg}`
                          }
                        `}
                      >
                        {isPrivate && <span className="mr-1">🔒</span>}
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
                {!categoryId && (
                  <p className="text-xs text-muted-foreground mt-2">Please select a category</p>
                )}
              </div>

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

              <div>
                <Label>Attachments (optional)</Label>
                <FileUpload
                  files={attachments}
                  onFilesChange={setAttachments}
                  maxFiles={5}
                  maxSizeMB={10}
                  disabled={loading}
                />
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

              <div className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={() => navigate(-1)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {loading ? "Submitting..." : "Submit Suggestion"}
                </Button>
              </div>
            </form>

            <SuggestionDisclaimer />

            <p className="text-sm text-muted-foreground mt-6 bg-muted/50 p-3 rounded-md border border-border">
              <span className="font-medium">Need to share something confidential?</span> You can do it here by selecting <span className="font-semibold text-foreground">Private (HR visible only)</span> from the category dropdown.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Submit;
