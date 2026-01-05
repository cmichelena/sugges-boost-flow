import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Whitelist of allowed origins for Stripe redirect URLs
const ALLOWED_ORIGINS = [
  'https://www.suggistit.com',
  'https://suggistit.com',
  'https://cxuuuibgsnxynoaomebn.lovableproject.com',
  'http://localhost:5173', // Development
  'http://localhost:8080', // Development alternative
];

const getValidatedOrigin = (requestOrigin: string | null): string => {
  const defaultOrigin = 'https://cxuuuibgsnxynoaomebn.lovableproject.com';
  if (!requestOrigin) return defaultOrigin;
  return ALLOWED_ORIGINS.includes(requestOrigin) ? requestOrigin : defaultOrigin;
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    
    if (!user?.email) {
      throw new Error("User not authenticated or email not available");
    }
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { tier, billingPeriod } = await req.json();
    logStep("Request data", { tier, billingPeriod });

    if (!tier) {
      throw new Error("Tier is required");
    }

    // Fetch price ID from subscription_plans table
    const { data: planData, error: planError } = await supabaseClient
      .from("subscription_plans")
      .select("stripe_price_id_monthly, stripe_price_id_annual")
      .eq("tier", tier)
      .single();

    if (planError || !planData) {
      throw new Error(`Failed to find plan for tier: ${tier}`);
    }

    const priceId = billingPeriod === "annual" 
      ? planData.stripe_price_id_annual 
      : planData.stripe_price_id_monthly;

    if (!priceId) {
      throw new Error(`No Stripe price configured for tier: ${tier} (${billingPeriod})`);
    }

    logStep("Found price ID", { priceId, tier, billingPeriod });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if customer already exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
    }

    const origin = getValidatedOrigin(req.headers.get("origin"));
    logStep("Using validated origin", { origin });

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/dashboard?subscription=success&tier=${tier}`,
      cancel_url: `${origin}/pricing?subscription=canceled`,
      metadata: {
        user_id: user.id,
        tier: tier,
        billing_period: billingPeriod,
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
