
CREATE TABLE public.cylinder_head_components (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cylinder_head_id uuid NOT NULL REFERENCES public.cylinder_heads(id) ON DELETE CASCADE,
  component_type text NOT NULL,
  replacement_date date NOT NULL DEFAULT CURRENT_DATE,
  horimeter_at_replacement numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.cylinder_head_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to cylinder_head_components" ON public.cylinder_head_components FOR ALL USING (true) WITH CHECK (true);
