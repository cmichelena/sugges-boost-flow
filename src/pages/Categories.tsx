import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { toast } from "sonner";
import { Loader2, Plus, GripVertical, Trash2, Eye, EyeOff, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Category {
  id: string;
  name: string;
  is_default: boolean;
  is_hidden: boolean;
  display_order: number;
  organization_id: string;
  can_be_anonymous: boolean;
  responsible_team_id: string | null;
}

interface Team {
  id: string;
  name: string;
  is_active: boolean;
}

const Categories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
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

    setOrganizationId(orgMember.organization_id);

    // Load categories and teams
    await loadCategories(orgMember.organization_id);
    await loadTeams(orgMember.organization_id);

    setLoading(false);
  };

  const loadCategories = async (orgId: string) => {
    const { data, error } = await supabase
      .from("suggestion_categories")
      .select("*")
      .eq("organization_id", orgId)
      .order("display_order");

    if (error) {
      toast.error("Failed to load categories");
      return;
    }

    setCategories(data || []);
  };

  const loadTeams = async (orgId: string) => {
    const { data, error } = await supabase
      .from("teams")
      .select("id, name, is_active")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .order("name");

    if (error) {
      toast.error("Failed to load teams");
      return;
    }

    setTeams(data || []);
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim() || !organizationId) return;

    setCreatingCategory(true);
    const maxOrder = Math.max(...categories.map(c => c.display_order), 0);
    
    const { error } = await supabase
      .from("suggestion_categories")
      .insert({
        organization_id: organizationId,
        name: newCategoryName.trim(),
        display_order: maxOrder + 1,
      });

    if (error) {
      toast.error("Failed to create category");
    } else {
      toast.success("Category created successfully");
      setNewCategoryName("");
      loadCategories(organizationId);
    }
    setCreatingCategory(false);
  };

  const handleToggleHidden = async (categoryId: string, isHidden: boolean) => {
    const { error } = await supabase
      .from("suggestion_categories")
      .update({ is_hidden: !isHidden })
      .eq("id", categoryId);

    if (error) {
      toast.error("Failed to update category");
    } else {
      toast.success(isHidden ? "Category shown" : "Category hidden");
      if (organizationId) loadCategories(organizationId);
    }
  };

  const handleAssignTeam = async (categoryId: string, teamId: string) => {
    const { error } = await supabase
      .from("suggestion_categories")
      .update({ responsible_team_id: teamId || null })
      .eq("id", categoryId);

    if (error) {
      toast.error("Failed to assign team");
    } else {
      toast.success("Team assigned successfully");
      if (organizationId) loadCategories(organizationId);
    }
  };

  const handleToggleAnonymous = async (categoryId: string, canBeAnonymous: boolean) => {
    const { error } = await supabase
      .from("suggestion_categories")
      .update({ can_be_anonymous: canBeAnonymous })
      .eq("id", categoryId);

    if (error) {
      toast.error("Failed to update category");
    } else {
      toast.success(canBeAnonymous ? "Anonymous submissions enabled" : "Anonymous submissions disabled");
      if (organizationId) loadCategories(organizationId);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const { error } = await supabase
      .from("suggestion_categories")
      .delete()
      .eq("id", categoryId);

    if (error) {
      toast.error("Failed to delete category");
    } else {
      toast.success("Category deleted");
      if (organizationId) loadCategories(organizationId);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Categories</h1>
              <p className="text-muted-foreground">Manage suggestion categories and assignments</p>
            </div>
          </div>

          {/* Create Category */}
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Create New Category
            </h2>
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Category name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
                />
              </div>
              <Button onClick={handleCreateCategory} disabled={creatingCategory || !newCategoryName.trim()}>
                {creatingCategory && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Category
              </Button>
            </div>
          </Card>

          {/* Categories List */}
          <div className="space-y-4">
            {categories.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No categories yet. Create your first category above.</p>
              </Card>
            ) : (
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">All Categories</h2>
                <div className="space-y-3">
                  {categories.map((category) => (
                    <div key={category.id} className="p-4 bg-muted/30 rounded-lg space-y-3">
                      <div className="flex items-center gap-4">
                        <GripVertical className="w-5 h-5 text-muted-foreground cursor-move" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{category.name}</span>
                            {category.is_default && <Badge variant="secondary">Default</Badge>}
                            {category.is_hidden && <Badge variant="outline">Hidden</Badge>}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleHidden(category.id, category.is_hidden)}
                          >
                            {category.is_hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </Button>
                          {!category.is_default && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCategory(category.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 pl-9">
                        <div className="flex items-center gap-2 flex-1">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <Select 
                            value={category.responsible_team_id || "none"} 
                            onValueChange={(val) => handleAssignTeam(category.id, val === "none" ? "" : val)}
                          >
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="No team assigned" />
                            </SelectTrigger>
                            <SelectContent className="bg-background z-50">
                              <SelectItem value="none">No team assigned</SelectItem>
                              {teams.map(team => (
                                <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-center gap-2">
                          <Switch 
                            checked={category.can_be_anonymous}
                            onCheckedChange={(checked) => handleToggleAnonymous(category.id, checked)}
                          />
                          <Label className="text-sm">Allow anonymous</Label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Categories;
