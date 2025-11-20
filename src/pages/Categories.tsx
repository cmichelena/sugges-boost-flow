import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ChevronUp, ChevronDown, Eye, EyeOff, Plus, Pencil, Check, X } from "lucide-react";

interface Category {
  id: string;
  name: string;
  is_default: boolean;
  is_hidden: boolean;
  display_order: number;
}

export default function Categories() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    loadData();
  }, [user, navigate]);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Get user's organization
      const { data: memberData, error: memberError } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .single();

      if (memberError) throw memberError;
      if (!memberData) {
        toast.error("No organization found");
        return;
      }

      setOrganizationId(memberData.organization_id);

      // Get user role
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("organization_id", memberData.organization_id)
        .single();

      if (roleError) throw roleError;
      setUserRole(roleData?.role || null);

      // Check if user is admin or owner
      if (roleData?.role !== "admin" && roleData?.role !== "owner") {
        toast.error("You don't have permission to manage categories");
        navigate("/");
        return;
      }

      // Load all categories (including hidden ones for admins)
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("suggestion_categories")
        .select("*")
        .eq("organization_id", memberData.organization_id)
        .order("display_order");

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!organizationId || !newCategoryName.trim()) {
      toast.error("Please enter a category name");
      return;
    }

    try {
      const maxOrder = Math.max(...categories.map(c => c.display_order), 0);
      
      const { error } = await supabase
        .from("suggestion_categories")
        .insert({
          organization_id: organizationId,
          name: newCategoryName.trim(),
          is_default: false,
          is_hidden: false,
          display_order: maxOrder + 1,
        });

      if (error) {
        if (error.code === "23505") {
          toast.error("A category with this name already exists");
        } else {
          throw error;
        }
        return;
      }

      toast.success("Category added successfully");
      setNewCategoryName("");
      loadData();
    } catch (error) {
      console.error("Error adding category:", error);
      toast.error("Failed to add category");
    }
  };

  const handleToggleVisibility = async (category: Category) => {
    try {
      const { error } = await supabase
        .from("suggestion_categories")
        .update({ is_hidden: !category.is_hidden })
        .eq("id", category.id);

      if (error) throw error;

      toast.success(category.is_hidden ? "Category shown" : "Category hidden");
      loadData();
    } catch (error) {
      console.error("Error toggling visibility:", error);
      toast.error("Failed to update category");
    }
  };

  const handleMove = async (category: Category, direction: "up" | "down") => {
    const currentIndex = categories.findIndex(c => c.id === category.id);
    if (currentIndex === -1) return;

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= categories.length) return;

    const otherCategory = categories[newIndex];

    try {
      // Swap display orders
      await supabase
        .from("suggestion_categories")
        .update({ display_order: otherCategory.display_order })
        .eq("id", category.id);

      await supabase
        .from("suggestion_categories")
        .update({ display_order: category.display_order })
        .eq("id", otherCategory.id);

      toast.success("Category order updated");
      loadData();
    } catch (error) {
      console.error("Error moving category:", error);
      toast.error("Failed to update order");
    }
  };

  const startEdit = (category: Category) => {
    setEditingId(category.id);
    setEditingName(category.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  const saveEdit = async (categoryId: string) => {
    if (!editingName.trim()) {
      toast.error("Category name cannot be empty");
      return;
    }

    try {
      const { error } = await supabase
        .from("suggestion_categories")
        .update({ name: editingName.trim() })
        .eq("id", categoryId);

      if (error) {
        if (error.code === "23505") {
          toast.error("A category with this name already exists");
        } else {
          throw error;
        }
        return;
      }

      toast.success("Category renamed successfully");
      setEditingId(null);
      setEditingName("");
      loadData();
    } catch (error) {
      console.error("Error renaming category:", error);
      toast.error("Failed to rename category");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const defaultCategories = categories.filter(c => c.is_default);
  const customCategories = categories.filter(c => !c.is_default);

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Manage Suggestion Categories</CardTitle>
          <CardDescription>
            Customize categories for your organization. Hide, rename, reorder, or add new categories.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Default Categories */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Default Categories</h3>
            <div className="space-y-2">
              {defaultCategories.map((category, index) => (
                <div
                  key={category.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    category.is_hidden ? "bg-muted opacity-60" : "bg-background"
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    {editingId === category.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="max-w-xs"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => saveEdit(category.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={cancelEdit}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="font-medium">{category.name}</span>
                        <Badge variant="secondary">Default</Badge>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {editingId !== category.id && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEdit(category)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleVisibility(category)}
                        >
                          {category.is_hidden ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={index === 0}
                          onClick={() => handleMove(category, "up")}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={index === defaultCategories.length - 1}
                          onClick={() => handleMove(category, "down")}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Categories */}
          {customCategories.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Custom Categories</h3>
              <div className="space-y-2">
                {customCategories.map((category, index) => (
                  <div
                    key={category.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      category.is_hidden ? "bg-muted opacity-60" : "bg-background"
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {editingId === category.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="max-w-xs"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => saveEdit(category.id)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={cancelEdit}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <span className="font-medium">{category.name}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {editingId !== category.id && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEdit(category)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleVisibility(category)}
                          >
                            {category.is_hidden ? (
                              <Eye className="h-4 w-4" />
                            ) : (
                              <EyeOff className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={index === 0}
                            onClick={() => handleMove(category, "up")}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={index === customCategories.length - 1}
                            onClick={() => handleMove(category, "down")}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add New Category */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Add New Category</h3>
            <div className="flex gap-2">
              <Input
                placeholder="Enter category name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAddCategory()}
              />
              <Button onClick={handleAddCategory}>
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
