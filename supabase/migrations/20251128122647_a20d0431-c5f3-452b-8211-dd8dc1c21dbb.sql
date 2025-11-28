-- Add Private (HR) category to the seed_default_categories function
CREATE OR REPLACE FUNCTION public.seed_default_categories()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.suggestion_categories (organization_id, name, is_default, display_order, can_be_anonymous)
  VALUES 
    (NEW.id, 'Process Improvement', true, 1, true),
    (NEW.id, 'Cost Reduction', true, 2, true),
    (NEW.id, 'Customer Experience', true, 3, true),
    (NEW.id, 'Employee Wellbeing', true, 4, true),
    (NEW.id, 'Technology & Tools', true, 5, true),
    (NEW.id, 'Safety & Compliance', true, 6, true),
    (NEW.id, 'Private (HR visible only)', true, 7, true),
    (NEW.id, 'Other', true, 8, true);
  RETURN NEW;
END;
$function$;

-- Add Private (HR) category to existing organizations that don't have it
INSERT INTO public.suggestion_categories (organization_id, name, is_default, display_order, can_be_anonymous)
SELECT o.id, 'Private (HR visible only)', true, 7, true
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.suggestion_categories sc 
  WHERE sc.organization_id = o.id 
  AND sc.name = 'Private (HR visible only)'
);