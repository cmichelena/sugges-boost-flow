import { useState } from "react";
import { ChevronDown, Check, User, Plus, Briefcase, ChevronRight } from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { useAccount } from "@/hooks/useAccount";
import { getWorkspaceConfig } from "@/lib/workspace-type-config";
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

const OrgIcon = ({ type, workspaceType }: { type: "personal" | "company"; workspaceType?: string }) => {
  if (type === "personal") {
    return <User className="w-4 h-4 shrink-0" />;
  }
  const config = getWorkspaceConfig(workspaceType);
  const IconComponent = config.icon;
  return <IconComponent className="w-4 h-4 shrink-0" />;
};

export const OrganizationSwitcher = () => {
  const { activeOrganization, organizations, loading, switchOrganization } = useOrganization();
  const { activeAccount, hasAccountAccess } = useAccount();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const handleSwitch = async (orgId: string) => {
    if (orgId === activeOrganization?.id) return;

    const success = await switchOrganization(orgId);
    if (success) {
      toast.success("Switched workspace");
      window.location.reload();
    } else {
      toast.error("Failed to switch workspace");
    }
  };

  if (loading) {
    return <Skeleton className="h-9 w-40" />;
  }

  if (!activeOrganization) {
    return null;
  }

  const workspaceConfig = getWorkspaceConfig(activeOrganization.workspace_type);
  const accountName = hasAccountAccess && activeAccount ? activeAccount.name : null;

  const triggerContent = (
    <Button variant="ghost" size="sm" className="gap-1.5 max-w-[200px] sm:max-w-[280px] h-auto py-1.5">
      <div className="flex flex-col items-start text-left min-w-0">
        {accountName && (
          <span className="text-[10px] leading-tight text-muted-foreground truncate max-w-full flex items-center gap-1">
            <Briefcase className="w-3 h-3 shrink-0" />
            {accountName}
          </span>
        )}
        <span className="text-sm font-medium truncate max-w-full flex items-center gap-1.5">
          <OrgIcon type={activeOrganization.organization_type} workspaceType={activeOrganization.workspace_type} />
          <span className="truncate">{activeOrganization.name}</span>
        </span>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize mt-0.5">
          {workspaceConfig.label}
        </Badge>
      </div>
      <ChevronDown className="w-3 h-3 shrink-0 opacity-50" />
    </Button>
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {triggerContent}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Switch Workspace
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {organizations.map((org) => {
            const config = getWorkspaceConfig(org.workspace_type);
            return (
              <DropdownMenuItem
                key={org.id}
                onClick={() => handleSwitch(org.id)}
                className="flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <OrgIcon type={org.organization_type} workspaceType={org.workspace_type} />
                  <span className="truncate">{org.name}</span>
                  <Badge variant="secondary" className="text-[10px] px-1 py-0 capitalize shrink-0">
                    {config.label}
                  </Badge>
                </div>
                {org.id === activeOrganization.id && (
                  <Check className="w-4 h-4 text-primary shrink-0" />
                )}
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-2 text-primary"
          >
            <Plus className="w-4 h-4" />
            <span>Create Workspace</span>
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
