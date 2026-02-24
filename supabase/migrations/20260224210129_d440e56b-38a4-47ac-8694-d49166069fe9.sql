
-- Create oil_analyses table
CREATE TABLE public.oil_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL REFERENCES public.equipments(id) ON DELETE CASCADE,
  analysis_date DATE NOT NULL DEFAULT CURRENT_DATE,
  horimeter_at_analysis NUMERIC NOT NULL DEFAULT 0,
  result TEXT NOT NULL DEFAULT '',
  attachment_url TEXT,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.oil_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to oil_analyses" ON public.oil_analyses FOR ALL USING (true) WITH CHECK (true);

-- Storage bucket for oil analysis attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('oil-analysis-attachments', 'oil-analysis-attachments', true);

-- Storage RLS policies
CREATE POLICY "Allow all uploads to oil-analysis-attachments" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'oil-analysis-attachments');
CREATE POLICY "Allow all reads from oil-analysis-attachments" ON storage.objects FOR SELECT USING (bucket_id = 'oil-analysis-attachments');
CREATE POLICY "Allow all deletes from oil-analysis-attachments" ON storage.objects FOR DELETE USING (bucket_id = 'oil-analysis-attachments');
