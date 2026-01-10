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

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    console.log(`Starting data reset for user ${userId}`);

    // Use service role client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Delete user data in order (respecting foreign keys)
    
    // 1. Delete reactions by user
    const { error: reactionsError } = await supabaseAdmin
      .from("reactions")
      .delete()
      .eq("user_id", userId);
    if (reactionsError) console.error("Error deleting reactions:", reactionsError);

    // 2. Delete likes by user
    const { error: likesError } = await supabaseAdmin
      .from("likes")
      .delete()
      .eq("user_id", userId);
    if (likesError) console.error("Error deleting likes:", likesError);

    // 3. Delete comments by user
    const { error: commentsError } = await supabaseAdmin
      .from("comments")
      .delete()
      .eq("user_id", userId);
    if (commentsError) console.error("Error deleting comments:", commentsError);

    // 4. Get user's suggestions to delete attachments and related data
    const { data: userSuggestions } = await supabaseAdmin
      .from("suggestions")
      .select("id")
      .eq("user_id", userId);

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
      .eq("user_id", userId);
    if (suggestionsError) console.error("Error deleting suggestions:", suggestionsError);

    // 7. Delete notification preferences
    const { error: notifError } = await supabaseAdmin
      .from("notification_preferences")
      .delete()
      .eq("user_id", userId);
    if (notifError) console.error("Error deleting notification preferences:", notifError);

    // 8. Delete user's avatar from storage if exists
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("avatar_url")
      .eq("id", userId)
      .single();

    if (profile?.avatar_url) {
      // Extract file path from URL
      const avatarPath = profile.avatar_url.split('/avatars/').pop();
      if (avatarPath) {
        await supabaseAdmin.storage
          .from("avatars")
          .remove([avatarPath]);
      }
    }

    // 9. Reset profile (keep account but clear data)
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        display_name: null,
        avatar_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
    if (profileError) console.error("Error resetting profile:", profileError);

    console.log(`Successfully reset data for user ${userId}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in reset-user-data:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
