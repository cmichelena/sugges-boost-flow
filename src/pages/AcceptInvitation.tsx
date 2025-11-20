import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"validating" | "success" | "error">("validating");
  const [message, setMessage] = useState("");
  const [organizationName, setOrganizationName] = useState("");

  useEffect(() => {
    const acceptInvitation = async () => {
      const token = searchParams.get("token");
      
      if (!token) {
        setStatus("error");
        setMessage("Invalid invitation link");
        setLoading(false);
        return;
      }

      if (!user) {
        // Redirect to auth with return URL
        navigate(`/auth?redirect=${encodeURIComponent(`/accept-invitation?token=${token}`)}`);
        return;
      }

      try {
        // Fetch invitation
        const { data: invitation, error: invError } = await supabase
          .from("organization_invitations")
          .select("*, organizations(name)")
          .eq("token", token)
          .is("accepted_at", null)
          .single();

        if (invError || !invitation) {
          setStatus("error");
          setMessage("Invalid or expired invitation");
          setLoading(false);
          return;
        }

        // Check if expired
        if (new Date(invitation.expires_at) < new Date()) {
          setStatus("error");
          setMessage("This invitation has expired");
          setLoading(false);
          return;
        }

        // Check if email matches
        if (invitation.email !== user.email) {
          setStatus("error");
          setMessage("This invitation was sent to a different email address");
          setLoading(false);
          return;
        }

        setOrganizationName(invitation.organizations.name);

        // Check if already a member
        const { data: existingMember } = await supabase
          .from("organization_members")
          .select("id")
          .eq("user_id", user.id)
          .eq("organization_id", invitation.organization_id)
          .single();

        if (existingMember) {
          setStatus("error");
          setMessage("You are already a member of this organization");
          setLoading(false);
          return;
        }

        // Add to organization_members
        const { error: memberError } = await supabase
          .from("organization_members")
          .insert({
            user_id: user.id,
            organization_id: invitation.organization_id,
            status: "active",
            joined_at: new Date().toISOString(),
            invited_by: invitation.invited_by,
          });

        if (memberError) {
          throw memberError;
        }

        // Add user role
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({
            user_id: user.id,
            organization_id: invitation.organization_id,
            role: invitation.role,
          });

        if (roleError) {
          throw roleError;
        }

        // Mark invitation as accepted
        await supabase
          .from("organization_invitations")
          .update({ accepted_at: new Date().toISOString() })
          .eq("id", invitation.id);

        setStatus("success");
        setMessage(`You've successfully joined ${invitation.organizations.name}!`);
        
        toast.success("Invitation accepted!");
        
        // Redirect to home after 2 seconds
        setTimeout(() => {
          navigate("/");
        }, 2000);
      } catch (error: any) {
        console.error("Error accepting invitation:", error);
        setStatus("error");
        setMessage(error.message || "Failed to accept invitation");
      } finally {
        setLoading(false);
      }
    };

    acceptInvitation();
  }, [searchParams, user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {loading && <Loader2 className="h-6 w-6 animate-spin" />}
            {status === "success" && <CheckCircle2 className="h-6 w-6 text-green-500" />}
            {status === "error" && <XCircle className="h-6 w-6 text-destructive" />}
            {loading ? "Processing Invitation..." : status === "success" ? "Success!" : "Error"}
          </CardTitle>
          <CardDescription>
            {loading ? "Please wait while we process your invitation" : message}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          {status === "success" && organizationName && (
            <p className="text-sm text-muted-foreground mb-4">
              Redirecting you to {organizationName}...
            </p>
          )}
          {status === "error" && (
            <Button onClick={() => navigate("/")} className="mt-4">
              Go to Home
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}