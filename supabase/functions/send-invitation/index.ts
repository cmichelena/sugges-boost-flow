import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.83.0";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const invitationSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  organizationId: z.string().uuid("Invalid organization ID"),
  role: z.enum(["admin", "member", "viewer"], { 
    errorMap: () => ({ message: "Role must be admin, member, or viewer" })
  }),
});

// Hash a token using SHA-256 and return hex string
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create service role client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    // Create a client with the user's auth header to verify their identity
    const supabaseUserClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    });
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabaseUserClient.auth.getUser();
    
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    // Validate request body
    const body = await req.json();
    const validation = invitationSchema.safeParse(body);
    
    if (!validation.success) {
      console.error("Validation error:", validation.error.errors);
      return new Response(
        JSON.stringify({ 
          error: "Invalid input", 
          details: validation.error.errors.map(e => ({ 
            field: e.path.join('.'), 
            message: e.message 
          }))
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const { email, organizationId, role } = validation.data;

    console.log("Processing invitation request", { organizationId });

    // Verify user has admin or owner role
    const { data: userRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", organizationId)
      .single();

    if (!userRole || !["admin", "owner"].includes(userRole.role)) {
      throw new Error("Insufficient permissions");
    }

    // Get organization details
    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("name")
      .eq("id", organizationId)
      .single();

    if (!org) {
      throw new Error("Organization not found");
    }

    // Check if user with this email already exists and is a member
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u: { email?: string }) => u.email === email);
    
    if (existingUser) {
      const { data: existingMember } = await supabaseAdmin
        .from("organization_members")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("user_id", existingUser.id)
        .single();

      if (existingMember) {
        throw new Error("User is already a member of this organization");
      }
    }

    // Generate secure token and hash it
    const token_value = crypto.randomUUID();
    const token_hash = await hashToken(token_value);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    // Store invitation with hashed token
    const { error: insertError } = await supabaseAdmin
      .from("organization_invitations")
      .insert({
        organization_id: organizationId,
        email,
        role,
        token: token_value, // Store token (needed for NOT NULL constraint)
        token_hash: token_hash, // Also store hash for secure validation
        invited_by: user.id,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("Error inserting invitation:", insertError);
      throw new Error("Failed to create invitation");
    }

    // Generate accept URL with the plaintext token (only sent via email, never stored)
    const acceptUrl = `${req.headers.get("origin") || "https://suggistit.lovable.app"}/accept-invitation?token=${token_value}`;
    
    // Try to send email, but don't fail if it doesn't work (for testing with unverified domains)
    let emailSent = false;
    try {
      const { error: emailError } = await resend.emails.send({
        from: "Suggistit <noreply@suggistit.com>",
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
        console.warn("Email sending failed (domain not verified?):", emailError);
      } else {
        emailSent = true;
        console.log("Invitation email sent successfully");
      }
    } catch (emailErr) {
      console.warn("Email sending error:", emailErr);
    }

    console.log("Invitation created successfully", { emailSent });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: emailSent 
          ? "Invitation sent successfully" 
          : "Invitation created. Email could not be sent (share the link manually).",
        acceptUrl: emailSent ? undefined : acceptUrl // Return URL only if email failed
      }),
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
