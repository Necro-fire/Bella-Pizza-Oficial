-- SECURITY: "authenticated" is not enough while the project accepts sign-ups,
-- so the business tables are restricted to the internal POS account created by
-- the app-auth edge function.
BEGIN;

CREATE OR REPLACE FUNCTION public.is_pos_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.app_settings
    WHERE key = 'pos_user_email'
      AND lower(trim(both '"' from (value #>> '{}'))) = lower(auth.jwt() ->> 'email')
  );
$$;

REVOKE ALL ON FUNCTION public.is_pos_user() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_pos_user() TO authenticated, service_role;

-- Replace every existing policy on the business tables with a POS-only one.
DO $$
DECLARE
  t text;
  p record;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'audit_logs','borders','cash_movements','cash_registers',
    'free_border_rules','free_soda_rules','products','sale_items',
    'sales','soda_products'
  ]
  LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t);
    END LOOP;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_pos_user()) WITH CHECK (public.is_pos_user())',
      'POS access to ' || t, t
    );
  END LOOP;
END $$;

-- These functions ran as their owner, which skips row level security, and
-- create_sale was executable by anyone. Run them as the caller instead.
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT oid::regprocedure AS signature
    FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace
      AND proname IN ('create_sale', 'generate_sale_code')
  LOOP
    EXECUTE format('ALTER FUNCTION %s SECURITY INVOKER', f.signature);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM public, anon', f.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', f.signature);
  END LOOP;
END $$;

COMMIT;
