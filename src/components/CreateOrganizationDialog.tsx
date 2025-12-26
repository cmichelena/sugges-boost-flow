import { useState } from "react";
import { Building2, Plus, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { UpgradePrompt } from "@/components/UpgradePrompt";

interface CreateOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateOrganizationDialog = ({
  open,
  onOpenChange,
}: CreateOrganizationDialogProps) => {
  const { user } = useAuth();
  const { hasAccess } = useFeatureAccess();

  const [name, setName] = useState("");
  const [emailDomains, setEmailDomains] = useState<string[]>([]);
  const [domainInput, setDomainInput] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const canCreate = hasAccess("create_company_org");

  const generateSlug = (orgName: string) => {
    return (
      orgName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .substring(0, 50) +
      "-" +
      Math.random().toString(36).substring(2, 8)
    );
  };

  const validateDomain = (domain: string) => {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    return domainRegex.test(domain) || /^[a-zA-Z0-9]+\.[a-zA-Z]{2,}$/.test(domain);
  };

  const addDomain = () => {
    const trimmed = domainInput.trim().toLowerCase();
    if (!trimmed) return;

    if (!validateDomain(trimmed)) {
      toast.error("Invalid domain format (e.g., company.com)");
      return;
    }

    if (emailDomains.includes(trimmed)) {
      toast.error("Domain already added");
      return;
    }

    setEmailDomains([...emailDomains, trimmed]);
    setDomainInput("");
  };

  const removeDomain = (domain: string) => {
    setEmailDomains(emailDomains.filter((d) => d !== domain));
  };

  const handleCreate = async () => {
    if (!user) {
      toast.error("You must be logged in");
      return;
    }

    if (!canCreate) {
      setShowUpgradePrompt(true);
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      toast.error("Organization name must be at least 2 characters");
      return;
    }

    if (trimmedName.length > 50) {
      toast.error("Organization name must be less than 50 characters");
      return;
    }

    setIsCreating(true);

    try {
      const slug = generateSlug(trimmedName);

      // Create the organization
      const { data: newOrg, error: orgError } = await supabase
        .from("organizations")
        .insert({
          name: trimmedName,
          slug,
          owner_id: user.id,
          organization_type: "company",
          subscription_tier: "free",
          subscription_status: "trialing",
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          allowed_email_domains: emailDomains.length > 0 ? emailDomains : null,
        })
        .select("id")
        .single();

      if (orgError) throw orgError;

      // Add user as organization member
      const { error: memberError } = await supabase
        .from("organization_members")
        .insert({
          user_id: user.id,
          organization_id: newOrg.id,
          status: "active",
          joined_at: new Date().toISOString(),
          invited_by: user.id,
        });

      if (memberError) throw memberError;

      // Add owner role
      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: user.id,
        organization_id: newOrg.id,
        role: "owner",
      });

      if (roleError) throw roleError;

      // Switch to the new organization
      await supabase.rpc("set_active_organization", {
        _user_id: user.id,
        _org_id: newOrg.id,
      });

      toast.success("Organization created successfully!");
      onOpenChange(false);
      
      // Reset form
      setName("");
      setEmailDomains([]);
      setDomainInput("");

      // Reload to switch context
      window.location.reload();
    } catch (error: any) {
      console.error("Error creating organization:", error);
      toast.error(error.message || "Failed to create organization");
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addDomain();
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Create Company Organization
            </DialogTitle>
            <DialogDescription>
              Set up a new company workspace for your team. You'll be the owner.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">Organization Name *</Label>
              <Input
                id="org-name"
                placeholder="Acme Corporation"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground">
                2-50 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email-domains">
                Allowed Email Domains (Optional)
              </Label>
              <div className="flex gap-2">
                <Input
                  id="email-domains"
                  placeholder="company.com"
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={addDomain}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Restrict invitations to specific email domains
              </p>

              {emailDomains.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {emailDomains.map((domain) => (
                    <Badge
                      key={domain}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {domain}
                      <button
                        type="button"
                        onClick={() => removeDomain(domain)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isCreating || !name.trim()}>
              {isCreating ? "Creating..." : "Create Organization"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UpgradePrompt
        feature="create_company_org"
        open={showUpgradePrompt}
        onClose={() => {
          setShowUpgradePrompt(false);
          onOpenChange(false);
        }}
      />
    </>
  );
};
