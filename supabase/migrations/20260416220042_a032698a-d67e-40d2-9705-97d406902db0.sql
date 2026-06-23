CREATE OR REPLACE FUNCTION public.generate_sale_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num int;
  today_prefix text;
BEGIN
  today_prefix := to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'YYYYMMDD');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM 10) AS int)), 0) + 1
  INTO next_num
  FROM public.sales
  WHERE code LIKE today_prefix || '-%'
    AND SUBSTRING(code FROM 10) ~ '^[0-9]+$';
  
  RETURN today_prefix || '-' || LPAD(next_num::text, 4, '0');
END;
$$;