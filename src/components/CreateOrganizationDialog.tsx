import { useState } from "react";
import { Building2, Plus, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { useAccount } from "@/hooks/useAccount";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  WORKSPACE_TYPE_CONFIGS,
  WORKSPACE_TYPES,
  type WorkspaceType,
} from "@/lib/workspace-type-config";

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
  const { accounts } = useAccount();

  const [name, setName] = useState("");
  const [workspaceType, setWorkspaceType] = useState<WorkspaceType>("organisation");
  const [emailDomains, setEmailDomains] = useState<string[]>([]);
  const [domainInput, setDomainInput] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

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

      // Use server-side function to create org + member + role atomically
      const { data: newOrgId, error } = await supabase.rpc("create_organization_with_owner", {
        _name: trimmedName,
        _slug: slug,
        _owner_id: user.id,
        _organization_type: "company",
        _workspace_type: workspaceType,
        _allowed_email_domains: emailDomains.length > 0 ? emailDomains : null,
        _account_id: selectedAccountId,
      });

      if (error) throw error;

      // Default public visibility for community and building types
      if (workspaceType === "community" || workspaceType === "building") {
        await supabase
          .from("organizations")
          .update({ public_visibility_mode: true })
          .eq("id", newOrgId);
      }

      toast.success("Workspace created successfully!");
      onOpenChange(false);
      
      // Reset form
      setName("");
      setWorkspaceType("organisation");
      setEmailDomains([]);
      setDomainInput("");
      setSelectedAccountId(null);

      // Reload to switch context
      window.location.reload();
    } catch (error: any) {
      console.error("Error creating organization:", error);
      toast.error(error.message || "Failed to create workspace");
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
              Create Workspace
            </DialogTitle>
            <DialogDescription>
              Set up a new workspace for your team. You'll be the owner.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Workspace Type Selector */}
            <div className="space-y-2">
              <Label>Workspace Type *</Label>
              <div className="grid grid-cols-3 gap-3">
                {WORKSPACE_TYPES.map((type) => {
                  const config = WORKSPACE_TYPE_CONFIGS[type];
                  const IconComponent = config.icon;
                  const isSelected = workspaceType === type;

                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setWorkspaceType(type)}
                      className={`
                        flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all
                        ${isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40 hover:bg-muted/50"
                        }
                      `}
                    >
                      <IconComponent className={`w-6 h-6 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                      <span className={`text-sm font-medium ${isSelected ? "text-primary" : "text-foreground"}`}>
                        {config.label}
                      </span>
                      <span className="text-xs text-muted-foreground text-center leading-tight">
                        {config.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Account / Portfolio Selector */}
            {accounts.length > 0 && (
              <div className="space-y-2">
                <Label>Attach to Organisation (Optional)</Label>
                <Select
                  value={selectedAccountId || "none"}
                  onValueChange={(val) => setSelectedAccountId(val === "none" ? null : val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No portfolio (standalone)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No portfolio (standalone)</SelectItem>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Attach this workspace to an organisation for consolidated management
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="org-name">Workspace Name *</Label>
              <Input
                id="org-name"
                placeholder={workspaceType === "building" ? "Parkview Tower" : "Acme Corporation"}
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
              {isCreating ? "Creating..." : "Create Workspace"}
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
