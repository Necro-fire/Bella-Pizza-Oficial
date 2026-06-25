-- Ensure every sale is attached to an open register when the client does not provide one.
-- This is a database-side safeguard so the caixa logic always sees the sale in the active shift.
CREATE OR REPLACE FUNCTION public.ensure_sale_register_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_register_id uuid;
BEGIN
  IF NEW.register_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT id
  INTO v_register_id
  FROM public.cash_registers
  WHERE closed_at IS NULL
  ORDER BY opened_at DESC, created_at DESC
  LIMIT 1;

  IF v_register_id IS NOT NULL THEN
    NEW.register_id := v_register_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sales_assign_register ON public.sales;
CREATE TRIGGER trg_sales_assign_register
BEFORE INSERT OR UPDATE OF register_id ON public.sales
FOR EACH ROW
EXECUTE FUNCTION public.ensure_sale_register_id();

UPDATE public.sales
SET register_id = sub.register_id
FROM (
  SELECT s.id, r.id AS register_id
  FROM public.sales s
  JOIN public.cash_registers r ON r.closed_at IS NULL
  WHERE s.register_id IS NULL
    AND s.created_at >= r.opened_at
  ORDER BY s.created_at DESC
) AS sub
WHERE public.sales.id = sub.id;
