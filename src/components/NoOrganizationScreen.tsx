import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Mail, Plus, ArrowRight } from "lucide-react";
import { CreateOrganizationDialog } from "@/components/CreateOrganizationDialog";

export const NoOrganizationScreen = () => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  return (
    <>
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="w-full max-w-lg space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Welcome to Suggistit 👋</h1>
            <p className="text-muted-foreground">
              To get started, join an existing workspace or create your own.
            </p>
          </div>

          {/* Option 1: Join via invitation */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                Join a workspace
              </CardTitle>
              <CardDescription>
                Ask your organisation admin to send you an invitation link via email. Click the link to join instantly.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                <ArrowRight className="w-4 h-4 shrink-0" />
                <span>Check your inbox for an invitation email, then click the link to join.</span>
              </div>
            </CardContent>
          </Card>

          {/* Option 2: Create a workspace */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Create a workspace
              </CardTitle>
              <CardDescription>
                Set up a new workspace for your team, building, or community. You'll be the owner.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button onClick={() => setShowCreateDialog(true)} className="w-full gap-2">
                <Plus className="w-4 h-4" />
                Create Workspace
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <CreateOrganizationDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </>
  );
};
