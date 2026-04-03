
CREATE TABLE public.fuel_types (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.fuel_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_select" ON public.fuel_types FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id());
CREATE POLICY "tenant_insert" ON public.fuel_types FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id());
CREATE POLICY "tenant_update" ON public.fuel_types FOR UPDATE TO authenticated USING (tenant_id = get_user_tenant_id()) WITH CHECK (tenant_id = get_user_tenant_id());
CREATE POLICY "tenant_delete" ON public.fuel_types FOR DELETE TO authenticated USING (tenant_id = get_user_tenant_id());
