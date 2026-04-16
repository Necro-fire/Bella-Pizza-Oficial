
-- Fix existing duplicates by appending row number suffix
WITH duplicates AS (
  SELECT id, code, ROW_NUMBER() OVER (PARTITION BY code ORDER BY created_at) as rn
  FROM public.sales
)
UPDATE public.sales s
SET code = d.code || '-' || d.rn
FROM duplicates d
WHERE s.id = d.id AND d.rn > 1;

-- Add unique constraint
ALTER TABLE public.sales ADD CONSTRAINT sales_code_unique UNIQUE (code);

-- Create atomic function to generate next sale code
CREATE OR REPLACE FUNCTION public.generate_sale_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_val integer;
  new_code text;
BEGIN
  UPDATE app_settings
  SET value = (COALESCE((value)::integer, 0) + 1)::text::jsonb
  WHERE key = 'next_sale_code'
  RETURNING (value)::integer INTO current_val;

  IF current_val IS NULL THEN
    INSERT INTO app_settings (key, value) VALUES ('next_sale_code', '1'::jsonb)
    ON CONFLICT (key) DO UPDATE SET value = (COALESCE((app_settings.value)::integer, 0) + 1)::text::jsonb
    RETURNING (value)::integer INTO current_val;
  END IF;

  new_code := lpad(current_val::text, 6, '0');
  RETURN new_code;
END;
$$;
