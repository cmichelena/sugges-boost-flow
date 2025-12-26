import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
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

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-INVITATION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Get authorization header first
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    logStep("Auth header present");

    // Create client with user's auth context - official Supabase pattern
    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: {
        headers: { Authorization: authHeader },
      },
      auth: {
        persistSession: false,
      },
    });
    
    // Create admin client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError) {
      logStep("Auth error from getUser", { error: authError.message });
      return new Response(
        JSON.stringify({ 
          error: "Authentication failed", 
          code: "AUTH_ERROR",
          message: "Your session may have expired. Please sign out and sign back in, then try again."
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }
    
    if (!user) {
      logStep("User not authenticated");
      return new Response(
        JSON.stringify({ 
          error: "Not authenticated", 
          code: "NO_USER",
          message: "You must be logged in to send invitations."
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    logStep("User authenticated", { userId: user.id, email: user.email });

    // Validate request body
    const body = await req.json();
    const validation = invitationSchema.safeParse(body);
    
    if (!validation.success) {
      logStep("Validation error", validation.error.errors);
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

    logStep("Processing invitation request", { organizationId, email, role });

    // Verify user has admin or owner role
    const { data: userRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", organizationId)
      .single();

    if (!userRole || !["admin", "owner"].includes(userRole.role)) {
      logStep("Insufficient permissions", { userRole });
      return new Response(
        JSON.stringify({ 
          error: "Insufficient permissions", 
          code: "FORBIDDEN",
          message: "Only organization admins and owners can invite new members."
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        }
      );
    }

    logStep("User has permission", { role: userRole.role });

    // Get organization details
    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("name")
      .eq("id", organizationId)
      .single();

    if (!org) {
      return new Response(
        JSON.stringify({ 
          error: "Organization not found", 
          code: "NOT_FOUND",
          message: "The organization could not be found. Please refresh the page and try again."
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        }
      );
    }

    logStep("Organization found", { name: org.name });

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
        return new Response(
          JSON.stringify({ 
            error: "Already a member", 
            code: "ALREADY_MEMBER",
            message: "This person is already a member of your organization."
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 409,
          }
        );
      }
    }

    // Generate secure token and hash it
    const token_value = crypto.randomUUID();
    const token_hash = await hashToken(token_value);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    logStep("Storing invitation");

    // Store invitation with both token and token_hash for validation
    // token_hash is used for secure lookup, token is cleared after acceptance
    const { error: insertError } = await supabaseAdmin
      .from("organization_invitations")
      .insert({
        organization_id: organizationId,
        email,
        role,
        token: token_value,
        token_hash: token_hash,
        invited_by: user.id,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      logStep("Error inserting invitation", insertError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to create invitation", 
          code: "DB_ERROR",
          message: "We couldn't create the invitation. Please try again in a moment."
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // Generate accept URL with the plaintext token - always use production domain
    const acceptUrl = `https://www.suggistit.com/accept-invitation?token=${token_value}`;
    
    // Try to send email
    let emailSent = false;
    try {
      const { error: emailError } = await resend.emails.send({
        from: "Suggistit <noreply@hello.suggistit.com>",
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
        logStep("Email sending failed", emailError);
      } else {
        emailSent = true;
        logStep("Invitation email sent successfully");
      }
    } catch (emailErr) {
      logStep("Email sending error", emailErr);
    }

    logStep("Invitation created successfully", { emailSent });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: emailSent 
          ? "Invitation sent successfully" 
          : "Invitation created. Email could not be sent (share the link manually).",
        acceptUrl: emailSent ? undefined : acceptUrl
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
