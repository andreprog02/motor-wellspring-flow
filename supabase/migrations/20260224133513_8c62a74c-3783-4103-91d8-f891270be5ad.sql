
-- Create oil_types table first
CREATE TABLE public.oil_types (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.oil_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to oil_types" ON public.oil_types FOR ALL USING (true) WITH CHECK (true);

-- Add columns to equipments (installation_date was already added by previous partial migration)
ALTER TABLE public.equipments ADD COLUMN oil_type_id uuid REFERENCES public.oil_types(id);

-- Seed some common oil types
INSERT INTO public.oil_types (name) VALUES 
  ('15W40'),
  ('20W50'),
  ('SAE 40'),
  ('SAE 30'),
  ('10W30'),
  ('5W30');
