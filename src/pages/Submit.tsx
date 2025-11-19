import { useState } from "react";
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

const categories = [
  "Process Improvement",
  "Cost Reduction",
  "Customer Experience",
  "Employee Wellbeing",
  "Technology",
  "Safety",
  "Other",
];

const Submit = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to submit a suggestion");
        navigate("/auth");
        return;
      }

      // Call AI to improve the suggestion
      const { data: improved, error: aiError } = await supabase.functions.invoke(
        "improve-suggestion",
        {
          body: { title, description, category },
        }
      );

      if (aiError) {
        console.error("AI improvement error:", aiError);
        toast.error("Failed to improve suggestion with AI");
      }

      // Insert the suggestion
      const { error } = await supabase.from("suggestions").insert({
        user_id: user.id,
        title: improved?.improved_title || title,
        description: improved?.improved_description || description,
        original_title: title,
        original_description: description,
        category,
        ai_improved_title: improved?.improved_title,
        ai_improved_description: improved?.improved_description,
        ai_tags: improved?.tags || [],
        status: "Open",
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
                <Select value={category} onValueChange={setCategory} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  maxLength={1000}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  {description.length}/1000 characters
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {loading ? "Submitting..." : "Submit Suggestion"}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Submit;