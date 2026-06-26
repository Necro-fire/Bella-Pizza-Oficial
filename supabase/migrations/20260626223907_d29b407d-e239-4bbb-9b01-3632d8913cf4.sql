-- ATOMIC SALE CREATION
-- Generates the per-register display code AND inserts the sale plus all its
-- items inside ONE transaction, serialized per register with an advisory lock
-- so concurrent sales can never receive the same display code. The internal
-- UUID id stays unique & permanent and is the only key used for relationships.
CREATE OR REPLACE FUNCTION public.create_sale(
  _register_id uuid,
  _total numeric,
  _change_amount numeric,
  _customer_name text,
  _customer_contact text,
  _observations text[],
  _delivery_mode text,
  _delivery_address jsonb,
  _delivery_fee numeric,
  _payments jsonb,
  _items jsonb
)
RETURNS public.sales
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  next_num int;
  new_code text;
  new_sale public.sales;
  item jsonb;
BEGIN
  -- Serialize per register so the display sequence has no race window.
  PERFORM pg_advisory_xact_lock(hashtext(COALESCE(_register_id::text, 'null')));

  SELECT COALESCE(MAX(CAST(code AS bigint)), 0) + 1
  INTO next_num
  FROM public.sales
  WHERE code ~ '^[0-9]+$'
    AND (
      (_register_id IS NULL AND register_id IS NULL)
      OR (register_id = _register_id)
    );

  new_code := LPAD(next_num::text, 6, '0');

  INSERT INTO public.sales (
    code, register_id, total, change_amount, customer_name, customer_contact,
    observations, delivery_mode, delivery_address, delivery_fee, payments
  ) VALUES (
    new_code, _register_id, _total, COALESCE(_change_amount, 0),
    _customer_name, _customer_contact, COALESCE(_observations, '{}'),
    COALESCE(_delivery_mode, 'retirada'), NULLIF(_delivery_address, 'null'::jsonb),
    COALESCE(_delivery_fee, 0), _payments
  )
  RETURNING * INTO new_sale;

  IF _items IS NOT NULL AND jsonb_typeof(_items) = 'array' THEN
    FOR item IN SELECT * FROM jsonb_array_elements(_items)
    LOOP
      INSERT INTO public.sale_items (
        sale_id, product_data, quantity, observations, pizza_size,
        second_flavor, calculated_price, border_data, border_free, free_soda
      ) VALUES (
        new_sale.id,
        item->'product_data',
        COALESCE((item->>'quantity')::int, 1),
        COALESCE((SELECT array_agg(value) FROM jsonb_array_elements_text(item->'observations')), '{}'),
        NULLIF(item->>'pizza_size', ''),
        NULLIF(item->'second_flavor', 'null'::jsonb),
        (item->>'calculated_price')::numeric,
        NULLIF(item->'border_data', 'null'::jsonb),
        COALESCE((item->>'border_free')::boolean, false),
        NULLIF(item->'free_soda', 'null'::jsonb)
      );
    END LOOP;
  END IF;

  RETURN new_sale;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.create_sale(
  uuid, numeric, numeric, text, text, text[], text, jsonb, numeric, jsonb, jsonb
) TO authenticated, service_role;