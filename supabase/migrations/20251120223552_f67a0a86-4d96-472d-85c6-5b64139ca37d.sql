-- Step 1: Add 'forever' to subscription_tier enum
ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'forever';

-- Add new columns to subscription_plans table
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS is_lifetime BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS coming_soon BOOLEAN DEFAULT true;