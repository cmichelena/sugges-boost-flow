import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/AppLayout";
import { toast } from "sonner";
import { Loader2, ScrollText, Sparkles, Lock } from "lucide-react";
import { z } from "zod";
import { Checkbox } from "@/components/ui/checkbox";
import { SuggestionDisclaimer } from "@/components/SuggestionDisclaimer";
import { FileUpload } from "@/components/FileUpload";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";

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
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const navigate = useNavigate();
  const { hasAccess, loading: featureLoading } = useFeatureAccess();
  const { activeOrganization, loading: orgLoading } = useOrganization();
  const { user } = useAuth();

  const hasAIAccess = hasAccess("ai_improvements");

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!orgLoading && activeOrganization) {
      loadCategories();
    }
  }, [navigate, user, orgLoading, activeOrganization]);

  const loadCategories = async () => {
    if (!activeOrganization) return;

    const { data: categoriesData, error: categoriesError } = await supabase
      .from("suggestion_categories")
      .select("id, name, can_be_anonymous")
      .eq("organization_id", activeOrganization.id)
      .eq("is_hidden", false)
      .order("display_order");

    if (categoriesError) {
      console.error("Error fetching categories:", categoriesError);
      toast.error("Failed to load categories");
      return;
    }

    setCategories(categoriesData || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validation = suggestionSchema.safeParse({ title, description, categoryId });
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        setLoading(false);
        return;
      }

      const selectedCategory = categories.find(c => c.id === categoryId);

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session || !activeOrganization) {
        toast.error("Please sign in to submit a suggestion");
        navigate("/auth");
        return;
      }

      let improved = null;

      // Only call AI if user has access to AI improvements
      if (hasAIAccess) {
        const { data: aiData, error: aiError } = await supabase.functions.invoke(
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
          // Don't block submission, just log the error
        } else {
          improved = aiData;
        }
      }

      // Get auto-assignment data
      const { data: assignmentData } = await supabase
        .rpc('auto_assign_suggestion_to_team', { _category_id: categoryId });

      const { data: suggestionData, error } = await supabase.from("suggestions").insert({
        user_id: isAnonymous ? null : session.user.id,
        organization_id: activeOrganization.id,
        title: improved?.improved_title || title,
        description: improved?.improved_description || description,
        original_title: title,
        original_description: description,
        category: selectedCategory?.name || "Other",
        category_id: categoryId,
        ai_improved_title: improved?.improved_title || null,
        ai_improved_description: improved?.improved_description || null,
        ai_tags: improved?.tags || [],
        status: "Open",
        is_anonymous: isAnonymous,
        assigned_team_id: assignmentData?.[0]?.team_id || null,
        assigned_to_user_id: assignmentData?.[0]?.assigned_user_id || null,
      }).select('id').single();

      if (error) throw error;

      // Send assignment notification if suggestion was assigned
      const assignedTeamId = assignmentData?.[0]?.team_id;
      const assignedUserId = assignmentData?.[0]?.assigned_user_id;
      
      if (suggestionData && (assignedTeamId || assignedUserId)) {
        supabase.functions.invoke("send-assignment-notification", {
          body: {
            suggestion_id: suggestionData.id,
            suggestion_title: improved?.improved_title || title,
            assigned_user_id: assignedUserId || undefined,
            assigned_team_id: assignedTeamId || undefined,
            organization_name: activeOrganization.name,
          },
        }).then(({ error: notifError }) => {
          if (notifError) {
            console.error("Failed to send assignment notification:", notifError);
          } else {
            console.log("Assignment notification sent successfully");
          }
        });
      }

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

      toast.success(
        hasAIAccess 
          ? "Suggestion submitted and enhanced with AI!" 
          : "Suggestion submitted successfully!"
      );
      navigate("/");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card className="p-8">
            <h1 className="font-bold mb-2 flex items-center gap-2">
              <ScrollText className="h-7 w-7" />
              Submit a Suggestion
            </h1>
            <p className="text-muted-foreground mb-6">
              Share your ideas to improve our organization.
              {hasAIAccess && " AI will help refine your suggestion."}
            </p>

            {/* AI Enhancement Status */}
            {!featureLoading && (
              <div className={`mb-6 p-4 rounded-lg border ${
                hasAIAccess 
                  ? "bg-primary/5 border-primary/20" 
                  : "bg-amber-500/5 border-amber-500/20"
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {hasAIAccess ? (
                      <>
                        <div className="p-2 rounded-full bg-primary/10">
                          <Sparkles className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">AI Enhancement Active</p>
                          <p className="text-xs text-muted-foreground">
                            Your suggestion will be automatically improved
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="p-2 rounded-full bg-amber-500/10">
                          <Lock className="w-4 h-4 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium flex items-center gap-2">
                            AI Enhancement
                            <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
                              Pro+
                            </Badge>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Upgrade to get AI-powered improvements
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                  {!hasAIAccess && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => setShowUpgradePrompt(true)}
                      className="shrink-0"
                    >
                      <Sparkles className="w-3 h-3 mr-1" />
                      Upgrade
                    </Button>
                  )}
                </div>
              </div>
            )}

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
                <Label>Category</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-wrap gap-1.5 mt-2">
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
                          px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200
                          border hover:scale-105 active:scale-95 truncate
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

      <UpgradePrompt
        feature="ai_improvements"
        open={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
      />
    </AppLayout>
  );
};

export default Submit;
