import { Building2, ChevronDown, Check, User } from "lucide-react";
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

const OrgIcon = ({ type }: { type: "personal" | "company" }) => {
  if (type === "personal") {
    return <User className="w-4 h-4 shrink-0" />;
  }
  return <Building2 className="w-4 h-4 shrink-0" />;
};

export const OrganizationSwitcher = () => {
  const { activeOrganization, organizations, loading, switchOrganization } = useOrganization();

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

  // If user only has one organization, show a simple display
  if (organizations.length === 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground">
        <OrgIcon type={activeOrganization.organization_type} />
        <span className="max-w-[150px] truncate">{activeOrganization.name}</span>
      </div>
    );
  }

  return (
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
