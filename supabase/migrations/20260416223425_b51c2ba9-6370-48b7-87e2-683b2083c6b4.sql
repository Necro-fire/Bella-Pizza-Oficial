CREATE OR REPLACE FUNCTION public.generate_sale_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num int;
BEGIN
  SELECT COALESCE(MAX(CAST(code AS bigint)), 0) + 1
  INTO next_num
  FROM public.sales
  WHERE code ~ '^[0-9]+$';
  
  RETURN LPAD(next_num::text, 6, '0');
END;
$$;