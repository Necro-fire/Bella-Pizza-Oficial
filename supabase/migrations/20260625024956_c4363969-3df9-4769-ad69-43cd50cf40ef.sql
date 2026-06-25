-- ============================================================
-- SECURITY HARDENING: require an authenticated session for the Data API
-- and fully lock down the credentials table (app_settings).
-- ============================================================

-- 1) app_settings: holds plaintext credentials. NO client access at all.
--    Only the service_role (used by the app-auth edge function) may touch it.
DROP POLICY IF EXISTS "Allow all access to app_settings" ON public.app_settings;
REVOKE ALL ON public.app_settings FROM anon;
REVOKE ALL ON public.app_settings FROM authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
-- (no policies => anon/authenticated are denied; service_role bypasses RLS)

-- 2) Business tables: replace the public "USING (true)" policies with
--    authenticated-only access, and remove anonymous (public-key) access.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'audit_logs','borders','cash_movements','cash_registers',
    'free_border_rules','free_soda_rules','products','sale_items',
    'sales','soda_products'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Allow all access to '||t, t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      'Authenticated full access to '||t, t
    );
  END LOOP;
END $$;

-- 3) Sale-code generator: callable only by authenticated users.
REVOKE ALL ON FUNCTION public.generate_sale_code(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.generate_sale_code(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.generate_sale_code() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.generate_sale_code() TO authenticated, service_role;