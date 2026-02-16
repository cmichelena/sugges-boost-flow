
-- 1. Create accounts table first

CREATE TABLE public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL,
  billing_email text,
  stripe_customer_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON public.accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Create account_members table

CREATE TABLE public.account_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('portfolio_admin', 'manager', 'viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(account_id, user_id)
);

-- 3. Security definer helpers (tables exist now)

CREATE OR REPLACE FUNCTION public.is_account_member(_user_id uuid, _account_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.account_members
    WHERE user_id = _user_id AND account_id = _account_id
  );
$$;

CREATE OR REPLACE FUNCTION public.has_account_role(_user_id uuid, _account_id uuid, _role text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.account_members
    WHERE user_id = _user_id AND account_id = _account_id AND role = _role
  );
$$;

-- 4. RLS on accounts

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view account" ON public.accounts FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Account members can view account" ON public.accounts FOR SELECT USING (is_account_member(auth.uid(), id));
CREATE POLICY "Authenticated users can create accounts" ON public.accounts FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner can update account" ON public.accounts FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Owner can delete account" ON public.accounts FOR DELETE USING (owner_id = auth.uid());

-- 5. RLS on account_members

ALTER TABLE public.account_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Account members can view other members" ON public.account_members FOR SELECT
  USING (is_account_member(auth.uid(), account_id));

CREATE POLICY "Owner or portfolio_admin can insert members" ON public.account_members FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.accounts WHERE id = account_id AND owner_id = auth.uid())
    OR has_account_role(auth.uid(), account_id, 'portfolio_admin')
  );

CREATE POLICY "Owner or portfolio_admin can update members" ON public.account_members FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.accounts WHERE id = account_id AND owner_id = auth.uid())
    OR has_account_role(auth.uid(), account_id, 'portfolio_admin')
  );

CREATE POLICY "Owner or portfolio_admin can delete members" ON public.account_members FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.accounts WHERE id = account_id AND owner_id = auth.uid())
    OR has_account_role(auth.uid(), account_id, 'portfolio_admin')
  );

-- 6. Add account_id to organizations

ALTER TABLE public.organizations ADD COLUMN account_id uuid REFERENCES public.accounts(id);
CREATE INDEX idx_organizations_account ON public.organizations(account_id);

-- 7. Performance indexes

CREATE INDEX idx_suggestions_org_status ON public.suggestions(organization_id, status);
CREATE INDEX idx_suggestions_target_dates ON public.suggestions(target_response_date, target_resolution_date)
  WHERE target_response_date IS NOT NULL OR target_resolution_date IS NOT NULL;

-- 8. Portfolio summary function

CREATE OR REPLACE FUNCTION public.get_portfolio_summary(_account_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT (
    EXISTS (SELECT 1 FROM public.accounts WHERE id = _account_id AND owner_id = auth.uid())
    OR is_account_member(auth.uid(), _account_id)
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT jsonb_build_object(
    'by_status', (
      SELECT COALESCE(jsonb_object_agg(status, cnt), '{}'::jsonb)
      FROM (
        SELECT s.status, count(*) as cnt
        FROM suggestions s
        JOIN organizations o ON o.id = s.organization_id
        WHERE o.account_id = _account_id AND s.archived = false
        GROUP BY s.status
      ) sub
    ),
    'overdue_response', (
      SELECT count(*)
      FROM suggestions s
      JOIN organizations o ON o.id = s.organization_id
      WHERE o.account_id = _account_id
        AND s.archived = false
        AND s.target_response_date < CURRENT_DATE
        AND s.status NOT IN ('Resolved', 'Closed')
    ),
    'overdue_resolution', (
      SELECT count(*)
      FROM suggestions s
      JOIN organizations o ON o.id = s.organization_id
      WHERE o.account_id = _account_id
        AND s.archived = false
        AND s.target_resolution_date < CURRENT_DATE
        AND s.status NOT IN ('Resolved', 'Closed')
    ),
    'top_categories', (
      SELECT COALESCE(jsonb_agg(row_to_json(sub)), '[]'::jsonb)
      FROM (
        SELECT s.category, count(*) as cnt
        FROM suggestions s
        JOIN organizations o ON o.id = s.organization_id
        WHERE o.account_id = _account_id AND s.archived = false
        GROUP BY s.category
        ORDER BY cnt DESC
        LIMIT 5
      ) sub
    ),
    'buildings_by_backlog', (
      SELECT COALESCE(jsonb_agg(row_to_json(sub)), '[]'::jsonb)
      FROM (
        SELECT o.id as organization_id, o.name, count(*) as open_count
        FROM suggestions s
        JOIN organizations o ON o.id = s.organization_id
        WHERE o.account_id = _account_id
          AND s.archived = false
          AND s.status NOT IN ('Resolved', 'Closed')
        GROUP BY o.id, o.name
        ORDER BY open_count DESC
      ) sub
    )
  ) INTO result;

  RETURN result;
END;
$$;
