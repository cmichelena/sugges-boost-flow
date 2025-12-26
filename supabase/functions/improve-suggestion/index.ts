import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const suggestionSchema = z.object({
  title: z.string().trim().min(1).max(100),
  description: z.string().trim().min(10).max(2000),
  category: z.enum(['Process Improvement', 'Cost Reduction', 'Customer Experience', 'Employee Wellbeing', 'Technology', 'Safety', 'Other'])
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("Missing authorization header");
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error("Auth verification failed:", userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Request authenticated for user:", user.id);

    // Get user's active organization and check subscription tier
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('active_organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.active_organization_id) {
      console.error("No active organization found for user");
      return new Response(
        JSON.stringify({ error: 'No active organization' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if organization has AI improvements enabled via subscription tier
    const { data: orgData, error: orgError } = await supabaseClient
      .from('organizations')
      .select('id, subscription_tier')
      .eq('id', profile.active_organization_id)
      .single();

    if (orgError || !orgData) {
      console.error("Failed to fetch organization:", orgError);
      return new Response(
        JSON.stringify({ error: 'Organization not found' }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check subscription plan for AI improvements feature
    const { data: planData } = await supabaseClient
      .from('subscription_plans')
      .select('ai_improvements_enabled')
      .eq('tier', orgData.subscription_tier)
      .single();

    if (!planData?.ai_improvements_enabled) {
      console.log("AI improvements not enabled for tier:", orgData.subscription_tier);
      return new Response(
        JSON.stringify({ error: 'AI improvements feature not available on your plan. Please upgrade to access this feature.' }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("AI feature access verified for tier:", orgData.subscription_tier);

    const { title, description, category } = await req.json();
    
    // Validate input
    const validationResult = suggestionSchema.safeParse({ title, description, category });
    if (!validationResult.success) {
      console.error("Validation failed:", validationResult.error);
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: validationResult.error.errors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.log("Processing suggestion improvement request");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = `You are helping improve a workplace suggestion. The user submitted:

Title: ${title}
Description: ${description}
Category: ${category}

Please:
1. Rewrite the title to be clear, actionable, and concise (max 60 chars)
2. Rewrite the description to be professional, clear, and well-structured (2-3 sentences)
3. Suggest 3-5 relevant tags (single words, lowercase)

Respond in JSON format:
{
  "improved_title": "...",
  "improved_description": "...",
  "tags": ["tag1", "tag2", "tag3"]
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that improves workplace suggestions. Always respond with valid JSON only.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error("Rate limit exceeded");
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        console.error("Payment required");
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    console.log("AI response received");

    const result = JSON.parse(content);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in improve-suggestion function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});