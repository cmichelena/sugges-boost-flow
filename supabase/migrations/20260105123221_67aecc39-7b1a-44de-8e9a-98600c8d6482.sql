CREATE OR REPLACE FUNCTION public.auto_assign_suggestion_to_team(_category_id uuid)
 RETURNS TABLE(team_id uuid, assigned_user_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_team_id UUID;
  v_lead_user_id UUID;
BEGIN
  -- Get the responsible team for this category
  SELECT sc.responsible_team_id INTO v_team_id
  FROM suggestion_categories sc
  WHERE sc.id = _category_id;

  -- If no team assigned to category, return nulls
  IF v_team_id IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, NULL::UUID;
    RETURN;
  END IF;

  -- Try to find the team lead (use table alias to avoid ambiguity)
  SELECT tm.user_id INTO v_lead_user_id
  FROM team_members tm
  WHERE tm.team_id = v_team_id
    AND tm.role = 'lead'
  LIMIT 1;

  -- Return the team and lead (lead may be null if no lead exists)
  RETURN QUERY SELECT v_team_id, v_lead_user_id;
END;
$function$;