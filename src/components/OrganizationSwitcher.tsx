import { useState } from "react";
import { Building2, ChevronDown, Check, User, Plus } from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CreateOrganizationDialog } from "@/components/CreateOrganizationDialog";

const OrgIcon = ({ type }: { type: "personal" | "company" }) => {
  if (type === "personal") {
    return <User className="w-4 h-4 shrink-0" />;
  }
  return <Building2 className="w-4 h-4 shrink-0" />;
};

export const OrganizationSwitcher = () => {
  const { activeOrganization, organizations, loading, switchOrganization } = useOrganization();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const handleSwitch = async (orgId: string) => {
    if (orgId === activeOrganization?.id) return;

    const success = await switchOrganization(orgId);
    if (success) {
      toast.success("Switched organization");
      // Reload the page to refresh all data
      window.location.reload();
    } else {
      toast.error("Failed to switch organization");
    }
  };

  if (loading) {
    return <Skeleton className="h-9 w-40" />;
  }

  if (!activeOrganization) {
    return null;
  }

  // If user only has one organization, show a simple display with create option
  if (organizations.length === 1) {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 max-w-[200px]">
              <OrgIcon type={activeOrganization.organization_type} />
              <span className="truncate">{activeOrganization.name}</span>
              <ChevronDown className="w-3 h-3 shrink-0 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Your Organization
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex items-center gap-2">
              <OrgIcon type={activeOrganization.organization_type} />
              <span className="truncate">{activeOrganization.name}</span>
              <Check className="w-4 h-4 text-primary shrink-0 ml-auto" />
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setShowCreateDialog(true)}
              className="flex items-center gap-2 text-primary"
            >
              <Plus className="w-4 h-4" />
              <span>Create Organization</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <CreateOrganizationDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
        />
      </>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2 max-w-[200px]">
            <OrgIcon type={activeOrganization.organization_type} />
            <span className="truncate">{activeOrganization.name}</span>
            <ChevronDown className="w-3 h-3 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Switch Organization
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {organizations.map((org) => (
            <DropdownMenuItem
              key={org.id}
              onClick={() => handleSwitch(org.id)}
              className="flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <OrgIcon type={org.organization_type} />
                <span className="truncate">{org.name}</span>
                {org.organization_type === "company" && (
                  <Badge variant="secondary" className="text-xs px-1 py-0">
                    Company
                  </Badge>
                )}
              </div>
              {org.id === activeOrganization.id && (
                <Check className="w-4 h-4 text-primary shrink-0" />
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-2 text-primary"
          >
            <Plus className="w-4 h-4" />
            <span>Create Organization</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateOrganizationDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </>
  );
};
