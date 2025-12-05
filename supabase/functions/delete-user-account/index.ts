import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create client with user's token to verify identity
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: requestingUser }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !requestingUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { targetUserId, organizationId } = await req.json();

    if (!targetUserId || !organizationId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify requesting user is admin/owner of the organization
    const { data: requesterRole, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .eq("organization_id", organizationId)
      .single();

    if (roleError || !requesterRole) {
      console.error("Role check error:", roleError);
      return new Response(JSON.stringify({ error: "Failed to verify permissions" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (requesterRole.role !== "admin" && requesterRole.role !== "owner") {
      return new Response(JSON.stringify({ error: "Only admins and owners can delete accounts" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify target user belongs to the same organization
    const { data: targetMembership, error: membershipError } = await supabaseAdmin
      .from("organization_members")
      .select("id")
      .eq("user_id", targetUserId)
      .eq("organization_id", organizationId)
      .single();

    if (membershipError || !targetMembership) {
      return new Response(JSON.stringify({ error: "User not found in this organization" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if target is the owner - owners cannot be deleted by others
    const { data: targetRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", targetUserId)
      .eq("organization_id", organizationId)
      .single();

    if (targetRole?.role === "owner" && targetUserId !== requestingUser.id) {
      return new Response(JSON.stringify({ error: "Organization owner cannot be deleted by others" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Starting deletion of user ${targetUserId} from organization ${organizationId}`);

    // Delete user data in order (respecting foreign keys)
    
    // 1. Delete reactions
    const { error: reactionsError } = await supabaseAdmin
      .from("reactions")
      .delete()
      .eq("user_id", targetUserId);
    if (reactionsError) console.error("Error deleting reactions:", reactionsError);

    // 2. Delete likes
    const { error: likesError } = await supabaseAdmin
      .from("likes")
      .delete()
      .eq("user_id", targetUserId);
    if (likesError) console.error("Error deleting likes:", likesError);

    // 3. Delete comments
    const { error: commentsError } = await supabaseAdmin
      .from("comments")
      .delete()
      .eq("user_id", targetUserId);
    if (commentsError) console.error("Error deleting comments:", commentsError);

    // 4. Get user's suggestions to delete attachments
    const { data: userSuggestions } = await supabaseAdmin
      .from("suggestions")
      .select("id")
      .eq("user_id", targetUserId);

    if (userSuggestions && userSuggestions.length > 0) {
      const suggestionIds = userSuggestions.map(s => s.id);
      
      // 5. Delete suggestion attachments (files from storage)
      const { data: attachments } = await supabaseAdmin
        .from("suggestion_attachments")
        .select("file_path")
        .in("suggestion_id", suggestionIds);

      if (attachments && attachments.length > 0) {
        const filePaths = attachments.map(a => a.file_path);
        await supabaseAdmin.storage
          .from("suggestion-attachments")
          .remove(filePaths);
      }

      // Delete attachment records
      await supabaseAdmin
        .from("suggestion_attachments")
        .delete()
        .in("suggestion_id", suggestionIds);

      // Delete reactions on user's suggestions
      await supabaseAdmin
        .from("reactions")
        .delete()
        .in("suggestion_id", suggestionIds);

      // Delete likes on user's suggestions
      await supabaseAdmin
        .from("likes")
        .delete()
        .in("suggestion_id", suggestionIds);

      // Delete comments on user's suggestions
      await supabaseAdmin
        .from("comments")
        .delete()
        .in("suggestion_id", suggestionIds);
    }

    // 6. Delete user's suggestions
    const { error: suggestionsError } = await supabaseAdmin
      .from("suggestions")
      .delete()
      .eq("user_id", targetUserId);
    if (suggestionsError) console.error("Error deleting suggestions:", suggestionsError);

    // 7. Delete team memberships
    const { error: teamMembersError } = await supabaseAdmin
      .from("team_members")
      .delete()
      .eq("user_id", targetUserId);
    if (teamMembersError) console.error("Error deleting team members:", teamMembersError);

    // 8. Delete user roles for this organization
    const { error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", targetUserId)
      .eq("organization_id", organizationId);
    if (rolesError) console.error("Error deleting user roles:", rolesError);

    // 9. Delete organization membership
    const { error: memberError } = await supabaseAdmin
      .from("organization_members")
      .delete()
      .eq("user_id", targetUserId)
      .eq("organization_id", organizationId);
    if (memberError) console.error("Error deleting organization member:", memberError);

    // 10. Check if user has other organizations
    const { data: otherOrgs } = await supabaseAdmin
      .from("organization_members")
      .select("id")
      .eq("user_id", targetUserId);

    // If no other organizations, delete profile and auth user
    if (!otherOrgs || otherOrgs.length === 0) {
      // Delete profile
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .delete()
        .eq("id", targetUserId);
      if (profileError) console.error("Error deleting profile:", profileError);

      // Delete auth user
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
      if (authDeleteError) console.error("Error deleting auth user:", authDeleteError);

      console.log(`Fully deleted user ${targetUserId}`);
    } else {
      console.log(`Removed user ${targetUserId} from organization ${organizationId}, user still has other orgs`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in delete-user-account:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
