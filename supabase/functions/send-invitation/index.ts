import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.83.0";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  email: string;
  organizationId: string;
  role: "admin" | "member" | "viewer";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { email, organizationId, role }: InvitationRequest = await req.json();

    console.log("Processing invitation:", { email, organizationId, role, invitedBy: user.id });

    // Verify user has admin or owner role
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", organizationId)
      .single();

    if (!userRole || !["admin", "owner"].includes(userRole.role)) {
      throw new Error("Insufficient permissions");
    }

    // Get organization details
    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", organizationId)
      .single();

    if (!org) {
      throw new Error("Organization not found");
    }

    // Check if user already exists
    const { data: existingMember } = await supabase
      .from("organization_members")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("user_id", (await supabase.auth.admin.listUsers()).data.users.find(u => u.email === email)?.id || "")
      .single();

    if (existingMember) {
      throw new Error("User is already a member of this organization");
    }

    // Generate secure token
    const token_value = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    // Store invitation
    const { error: insertError } = await supabase
      .from("organization_invitations")
      .insert({
        organization_id: organizationId,
        email,
        role,
        token: token_value,
        invited_by: user.id,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("Error inserting invitation:", insertError);
      throw new Error("Failed to create invitation");
    }

    // Send email
    const acceptUrl = `${req.headers.get("origin") || "https://suggistit.lovable.app"}/accept-invitation?token=${token_value}`;
    
    const { error: emailError } = await resend.emails.send({
      from: "Suggistit <onboarding@resend.dev>",
      to: [email],
      subject: `You've been invited to join ${org.name} on Suggistit`,
      html: `
        <h1>You've been invited!</h1>
        <p>You've been invited to join <strong>${org.name}</strong> on Suggistit as a ${role}.</p>
        <p>Click the link below to accept the invitation:</p>
        <a href="${acceptUrl}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 16px 0;">Accept Invitation</a>
        <p>Or copy and paste this link into your browser:</p>
        <p>${acceptUrl}</p>
        <p>This invitation will expire in 7 days.</p>
        <p>If you didn't expect this invitation, you can safely ignore this email.</p>
        <hr style="margin: 24px 0; border: none; border-top: 1px solid #ccc;">
        <p style="color: #666; font-size: 12px;">Sent by Suggistit</p>
      `,
    });

    if (emailError) {
      console.error("Error sending email:", emailError);
      throw new Error("Failed to send invitation email");
    }

    console.log("Invitation sent successfully to:", email);

    return new Response(
      JSON.stringify({ success: true, message: "Invitation sent successfully" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error in send-invitation function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});