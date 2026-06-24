-- Performance: add indexes on foreign-key / filter columns used heavily by the app
CREATE INDEX IF NOT EXISTS idx_sales_register_id ON public.sales (register_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items (sale_id);
CREATE INDEX IF NOT EXISTS idx_cash_movements_register_id ON public.cash_movements (register_id);
CREATE INDEX IF NOT EXISTS idx_cash_registers_closed_at ON public.cash_registers (closed_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);

-- Per-register sale numbering: each cash register restarts its own sequence.
-- The internal id (uuid) is never affected; only the displayed "code" resets.
-- Format preserved: 6 digits, zero-padded. First sale of a register = 000001.
CREATE OR REPLACE FUNCTION public.generate_sale_code(_register_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  next_num int;
BEGIN
  SELECT COALESCE(MAX(CAST(code AS bigint)), 0) + 1
  INTO next_num
  FROM public.sales
  WHERE code ~ '^[0-9]+$'
    AND (
      (_register_id IS NULL AND register_id IS NULL)
      OR (register_id = _register_id)
    );

  RETURN LPAD(next_num::text, 6, '0');
END;
$function$;