-- Update the handle_new_user trigger to auto-create organization
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_org_id uuid;
  org_name text;
BEGIN
  -- Create organization name from display name or email
  org_name := COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)) || '''s Workspace';
  
  -- Create organization for the new user
  INSERT INTO public.organizations (name, slug, owner_id, subscription_tier, subscription_status, trial_ends_at)
  VALUES (
    org_name,
    lower(replace(org_name, ' ', '-')) || '-' || substring(NEW.id::text from 1 for 8),
    NEW.id,
    'free'::subscription_tier,
    'trialing'::subscription_status,
    now() + interval '14 days'
  )
  RETURNING id INTO new_org_id;
  
  -- Add user to organization_members
  INSERT INTO public.organization_members (user_id, organization_id, status, joined_at, invited_by)
  VALUES (NEW.id, new_org_id, 'active'::member_status, now(), NEW.id);
  
  -- Add owner role in user_roles
  INSERT INTO public.user_roles (user_id, organization_id, role)
  VALUES (NEW.id, new_org_id, 'owner'::app_role);
  
  -- Insert profile
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  
  RETURN NEW;
END;
$function$;

-- Migrate existing users: Create organizations for Cristiano and Andrea
DO $$
DECLARE
  cristiano_id uuid := 'a3fab2de-b044-43fb-a830-677408949087';
  andrea_id uuid := 'f883e6d8-9d2e-4b2b-b568-2bd7935fc74a';
  cristiano_org_id uuid;
  andrea_org_id uuid;
BEGIN
  -- Create organization for Cristiano
  INSERT INTO public.organizations (name, slug, owner_id, subscription_tier, subscription_status, trial_ends_at)
  VALUES (
    'Cristiano''s Workspace',
    'cristianos-workspace-' || substring(cristiano_id::text from 1 for 8),
    cristiano_id,
    'free'::subscription_tier,
    'trialing'::subscription_status,
    now() + interval '14 days'
  )
  RETURNING id INTO cristiano_org_id;
  
  -- Add Cristiano to organization_members
  INSERT INTO public.organization_members (user_id, organization_id, status, joined_at, invited_by)
  VALUES (cristiano_id, cristiano_org_id, 'active'::member_status, now(), cristiano_id);
  
  -- Add Cristiano as owner in user_roles
  INSERT INTO public.user_roles (user_id, organization_id, role)
  VALUES (cristiano_id, cristiano_org_id, 'owner'::app_role);
  
  -- Create organization for Andrea
  INSERT INTO public.organizations (name, slug, owner_id, subscription_tier, subscription_status, trial_ends_at)
  VALUES (
    'Andrea Michelena''s Workspace',
    'andrea-michelenas-workspace-' || substring(andrea_id::text from 1 for 8),
    andrea_id,
    'free'::subscription_tier,
    'trialing'::subscription_status,
    now() + interval '14 days'
  )
  RETURNING id INTO andrea_org_id;
  
  -- Add Andrea to organization_members
  INSERT INTO public.organization_members (user_id, organization_id, status, joined_at, invited_by)
  VALUES (andrea_id, andrea_org_id, 'active'::member_status, now(), andrea_id);
  
  -- Add Andrea as owner in user_roles
  INSERT INTO public.user_roles (user_id, organization_id, role)
  VALUES (andrea_id, andrea_org_id, 'owner'::app_role);
  
  -- Update Andrea's suggestion with her organization_id
  UPDATE public.suggestions
  SET organization_id = andrea_org_id
  WHERE user_id = andrea_id;
END $$;