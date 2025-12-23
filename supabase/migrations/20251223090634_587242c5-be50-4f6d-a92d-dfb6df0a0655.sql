-- Update existing plans and add new Starter tier
-- First, update Free tier
UPDATE subscription_plans 
SET 
  max_members = 3,
  max_suggestions_per_month = 25,
  coming_soon = false,
  ai_improvements_enabled = false,
  advanced_analytics_enabled = false,
  custom_branding_enabled = false,
  priority_support_enabled = false,
  updated_at = now()
WHERE tier = 'free';

-- Insert Starter tier
INSERT INTO subscription_plans (
  tier, name, price_monthly, price_annual, 
  max_members, max_suggestions_per_month,
  ai_improvements_enabled, advanced_analytics_enabled,
  custom_branding_enabled, priority_support_enabled,
  coming_soon, is_lifetime
) VALUES (
  'starter', 'Starter', 3900, 39000,
  10, 250,
  true, false,
  false, false,
  false, false
);

-- Update Pro tier
UPDATE subscription_plans 
SET 
  price_monthly = 19900,
  price_annual = 199000,
  max_members = 25,
  max_suggestions_per_month = 1500,
  ai_improvements_enabled = true,
  advanced_analytics_enabled = true,
  custom_branding_enabled = true,
  priority_support_enabled = true,
  coming_soon = false,
  updated_at = now()
WHERE tier = 'pro';

-- Update Business tier
UPDATE subscription_plans 
SET 
  price_monthly = 79900,
  price_annual = 799000,
  max_members = 100,
  max_suggestions_per_month = 5000,
  ai_improvements_enabled = true,
  advanced_analytics_enabled = true,
  custom_branding_enabled = true,
  priority_support_enabled = true,
  coming_soon = false,
  updated_at = now()
WHERE tier = 'business';

-- Update Enterprise tier
UPDATE subscription_plans 
SET 
  max_members = NULL,
  max_suggestions_per_month = NULL,
  ai_improvements_enabled = true,
  advanced_analytics_enabled = true,
  custom_branding_enabled = true,
  priority_support_enabled = true,
  coming_soon = false,
  updated_at = now()
WHERE tier = 'enterprise';

-- Delete the forever tier if it exists
DELETE FROM subscription_plans WHERE tier = 'forever';