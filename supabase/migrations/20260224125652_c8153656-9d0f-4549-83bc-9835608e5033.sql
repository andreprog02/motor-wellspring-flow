
-- Manufacturers table
CREATE TABLE public.manufacturers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.manufacturers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to manufacturers" ON public.manufacturers FOR ALL USING (true) WITH CHECK (true);

-- Manufacturer models table
CREATE TABLE public.manufacturer_models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  manufacturer_id UUID NOT NULL REFERENCES public.manufacturers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.manufacturer_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to manufacturer_models" ON public.manufacturer_models FOR ALL USING (true) WITH CHECK (true);

-- Locations table
CREATE TABLE public.locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to locations" ON public.locations FOR ALL USING (true) WITH CHECK (true);

-- Inventory items table
CREATE TABLE public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  manufacturer_id UUID NOT NULL REFERENCES public.manufacturers(id),
  model_id UUID REFERENCES public.manufacturer_models(id),
  part_number TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 1,
  location_id UUID NOT NULL REFERENCES public.locations(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to inventory_items" ON public.inventory_items FOR ALL USING (true) WITH CHECK (true);

-- Seed initial data
INSERT INTO public.manufacturers (id, name) VALUES 
  ('a0000000-0000-0000-0000-000000000001', 'Caterpillar'),
  ('a0000000-0000-0000-0000-000000000002', 'Cummins'),
  ('a0000000-0000-0000-0000-000000000003', 'BorgWarner');

INSERT INTO public.manufacturer_models (manufacturer_id, name) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'C32 ACERT'),
  ('a0000000-0000-0000-0000-000000000001', 'C18'),
  ('a0000000-0000-0000-0000-000000000002', 'QSK60'),
  ('a0000000-0000-0000-0000-000000000003', 'S400SX-71');

INSERT INTO public.locations (id, name) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'Almoxarifado Central'),
  ('b0000000-0000-0000-0000-000000000002', 'Almoxarifado Sul');

INSERT INTO public.inventory_items (name, manufacturer_id, part_number, quantity, location_id, min_stock) VALUES
  ('Filtro de Óleo CAT 1R-0751', 'a0000000-0000-0000-0000-000000000001', '1R-0751', 12, 'b0000000-0000-0000-0000-000000000001', 5),
  ('Filtro de Óleo CAT 1R-0749', 'a0000000-0000-0000-0000-000000000001', '1R-0749', 8, 'b0000000-0000-0000-0000-000000000001', 3),
  ('Filtro Combustível CAT 1R-0753', 'a0000000-0000-0000-0000-000000000001', '1R-0753', 6, 'b0000000-0000-0000-0000-000000000001', 3),
  ('Filtro Cummins LF9009', 'a0000000-0000-0000-0000-000000000002', 'LF9009', 2, 'b0000000-0000-0000-0000-000000000002', 4),
  ('Turbo BorgWarner S400', 'a0000000-0000-0000-0000-000000000003', 'S400SX-71', 1, 'b0000000-0000-0000-0000-000000000001', 1),
  ('Cabeçote OEM C32', 'a0000000-0000-0000-0000-000000000001', 'C32-HEAD-01', 2, 'b0000000-0000-0000-0000-000000000001', 1);
