import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AssignmentNotificationRequest {
  suggestion_id: string;
  suggestion_title: string;
  assigned_user_id?: string;
  assigned_team_id?: string;
  organization_name: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      suggestion_id, 
      suggestion_title, 
      assigned_user_id, 
      assigned_team_id,
      organization_name 
    }: AssignmentNotificationRequest = await req.json();

    console.log("Processing assignment notification:", { 
      suggestion_id, 
      suggestion_title,
      assigned_user_id, 
      assigned_team_id 
    });

    const emailsToSend: { email: string; name: string; type: 'user' | 'team' }[] = [];

    // If assigned to a specific user, get their email
    if (assigned_user_id) {
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(assigned_user_id);
      
      if (userError) {
        console.error("Error fetching assigned user:", userError);
      } else if (userData?.user?.email) {
        // Get display name from profiles
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", assigned_user_id)
          .single();
        
        emailsToSend.push({
          email: userData.user.email,
          name: profile?.display_name || userData.user.email.split('@')[0],
          type: 'user'
        });
        console.log("Added assigned user to notification list:", userData.user.email);
      }
    }

    // If assigned to a team, get all team member emails
    if (assigned_team_id) {
      const { data: teamMembers, error: teamError } = await supabase
        .from("team_members")
        .select("user_id")
        .eq("team_id", assigned_team_id);

      if (teamError) {
        console.error("Error fetching team members:", teamError);
      } else if (teamMembers && teamMembers.length > 0) {
        // Get team name
        const { data: team } = await supabase
          .from("teams")
          .select("name")
          .eq("id", assigned_team_id)
          .single();

        const teamName = team?.name || "your team";

        for (const member of teamMembers) {
          // Skip if this user was already added as the direct assignee
          if (member.user_id === assigned_user_id) continue;

          const { data: memberData, error: memberError } = await supabase.auth.admin.getUserById(member.user_id);
          
          if (memberError) {
            console.error("Error fetching team member:", memberError);
            continue;
          }

          if (memberData?.user?.email) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("display_name")
              .eq("id", member.user_id)
              .single();

            emailsToSend.push({
              email: memberData.user.email,
              name: profile?.display_name || memberData.user.email.split('@')[0],
              type: 'team'
            });
            console.log("Added team member to notification list:", memberData.user.email);
          }
        }
      }
    }

    if (emailsToSend.length === 0) {
      console.log("No recipients to notify");
      return new Response(
        JSON.stringify({ success: true, message: "No recipients to notify" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get team name if assigned to team
    let teamName = "";
    if (assigned_team_id) {
      const { data: team } = await supabase
        .from("teams")
        .select("name")
        .eq("id", assigned_team_id)
        .single();
      teamName = team?.name || "";
    }

    // Send emails
    const emailResults = [];
    for (const recipient of emailsToSend) {
      const subject = recipient.type === 'user' 
        ? `New suggestion assigned to you: ${suggestion_title}`
        : `New suggestion assigned to your team: ${suggestion_title}`;

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">📋 New Assignment</h1>
            </div>
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px;">
              <p style="margin-top: 0;">Hi ${recipient.name},</p>
              <p>
                ${recipient.type === 'user' 
                  ? 'A new suggestion has been assigned directly to you:'
                  : `A new suggestion has been assigned to your team${teamName ? ` (${teamName})` : ''}:`
                }
              </p>
              <div style="background: white; border-left: 4px solid #7c3aed; padding: 15px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                <h2 style="margin: 0 0 10px 0; color: #1a1a1a; font-size: 18px;">${suggestion_title}</h2>
                <p style="margin: 0; color: #666; font-size: 14px;">Organization: ${organization_name}</p>
              </div>
              <p>Please log in to review and take action on this suggestion.</p>
              <p style="margin-bottom: 0;">Best regards,<br><strong>The Suggistit Team</strong></p>
            </div>
            <div style="text-align: center; padding: 20px; color: #888; font-size: 12px;">
              <p style="margin: 0;">You're receiving this because you're a member of ${organization_name} on Suggistit.</p>
            </div>
          </body>
        </html>
      `;

      try {
        const emailResponse = await resend.emails.send({
          from: "Suggistit <onboarding@resend.dev>",
          to: [recipient.email],
          subject,
          html,
        });

        console.log(`Email sent to ${recipient.email}:`, emailResponse);
        emailResults.push({ email: recipient.email, success: true });
      } catch (emailError: any) {
        console.error(`Failed to send email to ${recipient.email}:`, emailError);
        emailResults.push({ email: recipient.email, success: false, error: emailError.message });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sent ${emailResults.filter(r => r.success).length} notification(s)`,
        results: emailResults 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in send-assignment-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
