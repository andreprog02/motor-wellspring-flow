
-- Add attachment_url column to turbo_maintenances
ALTER TABLE public.turbo_maintenances ADD COLUMN attachment_url text DEFAULT NULL;

-- Create storage bucket for turbo maintenance attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('turbo-maintenance-attachments', 'turbo-maintenance-attachments', true);

-- RLS policies for the bucket
CREATE POLICY "Allow all uploads to turbo-maintenance-attachments" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'turbo-maintenance-attachments');
CREATE POLICY "Allow all reads from turbo-maintenance-attachments" ON storage.objects FOR SELECT USING (bucket_id = 'turbo-maintenance-attachments');
CREATE POLICY "Allow all deletes from turbo-maintenance-attachments" ON storage.objects FOR DELETE USING (bucket_id = 'turbo-maintenance-attachments');
