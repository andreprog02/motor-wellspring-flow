
CREATE TABLE public.oil_collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL REFERENCES public.equipments(id) ON DELETE CASCADE,
  collection_number TEXT NOT NULL DEFAULT '',
  collection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  horimeter_at_collection NUMERIC NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.oil_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to oil_collections"
  ON public.oil_collections
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);
