
-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- PRODUCTS
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('pizza','hamburguer','bebida','porcao','extras','outros')),
  icon TEXT DEFAULT '📦',
  price NUMERIC DEFAULT 0,
  cost NUMERIC DEFAULT 0,
  active BOOLEAN DEFAULT true,
  pizza_type TEXT CHECK (pizza_type IS NULL OR pizza_type IN ('tradicional','especial1','especial2','doce')),
  pizza_prices JSONB,
  pizza_costs JSONB,
  observations TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to products" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- BORDERS
CREATE TABLE public.borders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price NUMERIC DEFAULT 0,
  category TEXT DEFAULT 'tradicional' CHECK (category IN ('tradicional','premium')),
  active BOOLEAN DEFAULT true,
  free_sizes TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.borders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to borders" ON public.borders FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER update_borders_updated_at BEFORE UPDATE ON public.borders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SODA PRODUCTS
CREATE TABLE public.soda_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT DEFAULT '🥤',
  price NUMERIC DEFAULT 0,
  cost NUMERIC DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.soda_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to soda_products" ON public.soda_products FOR ALL USING (true) WITH CHECK (true);

-- FREE RULES
CREATE TABLE public.free_border_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  size TEXT NOT NULL UNIQUE CHECK (size IN ('P','M','G','GG')),
  enabled BOOLEAN DEFAULT false
);
ALTER TABLE public.free_border_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to free_border_rules" ON public.free_border_rules FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.free_soda_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  size TEXT NOT NULL UNIQUE CHECK (size IN ('P','M','G','GG')),
  enabled BOOLEAN DEFAULT false
);
ALTER TABLE public.free_soda_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to free_soda_rules" ON public.free_soda_rules FOR ALL USING (true) WITH CHECK (true);

-- CASH REGISTERS
CREATE TABLE public.cash_registers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opened_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ,
  initial_amount NUMERIC DEFAULT 0,
  informed_amount NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to cash_registers" ON public.cash_registers FOR ALL USING (true) WITH CHECK (true);

-- CASH MOVEMENTS
CREATE TABLE public.cash_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  register_id UUID NOT NULL REFERENCES public.cash_registers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('entry','exit','sangria','reforco')),
  amount NUMERIC NOT NULL,
  description TEXT,
  payment_method TEXT,
  origin TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to cash_movements" ON public.cash_movements FOR ALL USING (true) WITH CHECK (true);

-- SALES
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  register_id UUID REFERENCES public.cash_registers(id),
  total NUMERIC NOT NULL,
  change_amount NUMERIC DEFAULT 0,
  customer_name TEXT,
  customer_contact TEXT,
  observations TEXT[] DEFAULT '{}',
  cancelled BOOLEAN DEFAULT false,
  cancelled_at TIMESTAMPTZ,
  delivery_mode TEXT DEFAULT 'retirada',
  delivery_address JSONB,
  delivery_fee NUMERIC DEFAULT 0,
  payments JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to sales" ON public.sales FOR ALL USING (true) WITH CHECK (true);

-- SALE ITEMS
CREATE TABLE public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_data JSONB NOT NULL,
  quantity INTEGER DEFAULT 1,
  observations TEXT[] DEFAULT '{}',
  pizza_size TEXT,
  second_flavor JSONB,
  calculated_price NUMERIC NOT NULL,
  border_data JSONB,
  border_free BOOLEAN DEFAULT false,
  free_soda JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to sale_items" ON public.sale_items FOR ALL USING (true) WITH CHECK (true);

-- AUDIT LOGS
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  details TEXT,
  user_name TEXT DEFAULT 'system',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to audit_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

-- APP SETTINGS
CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to app_settings" ON public.app_settings FOR ALL USING (true) WITH CHECK (true);

-- SEED DATA
INSERT INTO public.products (name, category, icon, price, cost, active, pizza_type, pizza_prices, pizza_costs) VALUES
  ('Calabresa', 'pizza', '🍕', 0, 0, true, 'tradicional', '{"P":25,"M":35,"G":45,"GG":55}', '{"P":8,"M":12,"G":16,"GG":20}'),
  ('Margherita', 'pizza', '🍕', 0, 0, true, 'tradicional', '{"P":25,"M":35,"G":45,"GG":55}', '{"P":8,"M":12,"G":16,"GG":20}'),
  ('Mussarela', 'pizza', '🍕', 0, 0, true, 'tradicional', '{"P":22,"M":32,"G":42,"GG":52}', '{"P":7,"M":10,"G":14,"GG":18}'),
  ('Portuguesa', 'pizza', '🍕', 0, 0, true, 'tradicional', '{"P":28,"M":38,"G":48,"GG":58}', '{"P":9,"M":13,"G":17,"GG":21}'),
  ('4 Queijos', 'pizza', '🍕', 0, 0, true, 'especial1', '{"P":30,"M":42,"G":52,"GG":62}', '{"P":10,"M":15,"G":19,"GG":23}'),
  ('Frango c/ Catupiry', 'pizza', '🍕', 0, 0, true, 'especial1', '{"P":30,"M":42,"G":52,"GG":62}', '{"P":10,"M":15,"G":19,"GG":23}'),
  ('Camarão', 'pizza', '🍕', 0, 0, true, 'especial2', '{"P":35,"M":48,"G":60,"GG":72}', '{"P":14,"M":20,"G":26,"GG":32}'),
  ('Lombo Canadense', 'pizza', '🍕', 0, 0, true, 'especial2', '{"P":33,"M":45,"G":57,"GG":68}', '{"P":12,"M":18,"G":24,"GG":30}'),
  ('Chocolate', 'pizza', '🍫', 0, 0, true, 'doce', '{"P":28,"M":38,"G":48,"GG":58}', '{"P":9,"M":13,"G":17,"GG":21}'),
  ('Banana c/ Canela', 'pizza', '🍌', 0, 0, true, 'doce', '{"P":26,"M":36,"G":46,"GG":56}', '{"P":8,"M":12,"G":16,"GG":20}'),
  ('X-Burger', 'hamburguer', '🍔', 22, 10, true, NULL, NULL, NULL),
  ('X-Bacon', 'hamburguer', '🍔', 28, 13, true, NULL, NULL, NULL),
  ('X-Tudo', 'hamburguer', '🍔', 32, 15, true, NULL, NULL, NULL),
  ('Coca-Cola 2L', 'bebida', '🥤', 12, 6, true, NULL, NULL, NULL),
  ('Guaraná 2L', 'bebida', '🥤', 10, 5, true, NULL, NULL, NULL),
  ('Suco Natural', 'bebida', '🧃', 8, 3, true, NULL, NULL, NULL),
  ('Água Mineral', 'bebida', '💧', 4, 1.5, true, NULL, NULL, NULL),
  ('Batata Frita', 'porcao', '🍟', 18, 6, true, NULL, NULL, NULL),
  ('Onion Rings', 'porcao', '🧅', 20, 7, true, NULL, NULL, NULL),
  ('Borda Recheada', 'extras', '🧀', 8, 3, true, NULL, NULL, NULL),
  ('Molho Extra', 'extras', '🫙', 3, 0.8, true, NULL, NULL, NULL),
  ('Sobremesa do Dia', 'outros', '🍰', 15, 5, true, NULL, NULL, NULL);

INSERT INTO public.borders (name, price, category, active, free_sizes) VALUES
  ('Catupiry', 8, 'tradicional', true, '{"G","GG"}'),
  ('Cheddar', 8, 'tradicional', true, '{"G","GG"}'),
  ('Cream Cheese', 10, 'premium', true, '{"GG"}'),
  ('Chocolate', 10, 'premium', true, '{}'),
  ('Doce de Leite', 10, 'premium', true, '{}');

INSERT INTO public.soda_products (name, icon, price, cost, active) VALUES
  ('Coca-Cola 1L', '🥤', 8, 4, true),
  ('Guaraná 1L', '🥤', 7, 3.5, true),
  ('Fanta Laranja 1L', '🥤', 7, 3.5, true),
  ('Sprite 1L', '🥤', 7, 3.5, true);

INSERT INTO public.free_border_rules (size, enabled) VALUES
  ('P', false), ('M', false), ('G', true), ('GG', true);

INSERT INTO public.free_soda_rules (size, enabled) VALUES
  ('P', false), ('M', false), ('G', false), ('GG', true);

INSERT INTO public.app_settings (key, value) VALUES
  ('next_sale_code', '1');
