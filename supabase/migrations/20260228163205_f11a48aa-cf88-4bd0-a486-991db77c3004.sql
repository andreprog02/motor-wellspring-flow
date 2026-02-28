
CREATE TABLE public.maintenance_descriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.maintenance_descriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to maintenance_descriptions" ON public.maintenance_descriptions
  FOR ALL USING (true) WITH CHECK (true);

-- Seed with existing hardcoded descriptions
INSERT INTO public.maintenance_descriptions (name) VALUES
  ('Revisão Geral'),
  ('Retífica Completa'),
  ('Troca de Válvulas'),
  ('Troca de Sedes de Válvulas'),
  ('Troca de Guias de Válvulas'),
  ('Retífica de Sedes'),
  ('Lapidação de Válvulas'),
  ('Teste de Estanqueidade'),
  ('Troca de Juntas'),
  ('Inspeção Visual');
