import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshOrganizations } = useOrganization();
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
        // Use the secure RPC function to validate and accept the invitation
        // This function hashes the token server-side and validates it securely
        const { data, error } = await supabase.rpc('validate_invitation_token', {
          p_token: token,
          p_user_id: user.id,
          p_user_email: user.email || ''
        });

        if (error) {
          console.error("Error validating invitation:", error);
          setStatus("error");
          setMessage("Failed to validate invitation");
          setLoading(false);
          return;
        }

        const result = data as { success: boolean; error?: string; organization_name?: string; role?: string };

        if (!result.success) {
          setStatus("error");
          setMessage(result.error || "Invalid or expired invitation");
          setLoading(false);
          return;
        }

        setOrganizationName(result.organization_name || "");
        setStatus("success");
        setMessage(`You've successfully joined ${result.organization_name}!`);
        
        toast.success("Invitation accepted!");
        
        // Refresh organizations to include the new one
        await refreshOrganizations();
        
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          navigate("/dashboard");
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
  }, [searchParams, user, navigate, refreshOrganizations]);

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
