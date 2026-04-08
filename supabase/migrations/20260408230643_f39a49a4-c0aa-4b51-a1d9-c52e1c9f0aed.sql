
-- Create equipment_documents table
CREATE TABLE public.equipment_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL REFERENCES public.equipments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.equipment_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_select" ON public.equipment_documents FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id());
CREATE POLICY "tenant_insert" ON public.equipment_documents FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id());
CREATE POLICY "tenant_delete" ON public.equipment_documents FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id());
CREATE POLICY "tenant_update" ON public.equipment_documents FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id()) WITH CHECK (tenant_id = get_user_tenant_id());

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('equipment-documents', 'equipment-documents', true);

-- Storage policies
CREATE POLICY "Authenticated users can upload equipment docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'equipment-documents');

CREATE POLICY "Anyone can view equipment docs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'equipment-documents');

CREATE POLICY "Authenticated users can delete equipment docs"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'equipment-documents');
