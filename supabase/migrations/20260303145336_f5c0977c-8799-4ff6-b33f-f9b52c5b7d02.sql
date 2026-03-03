
ALTER TABLE public.maintenance_plan_templates
  ADD COLUMN manufacturer_id uuid REFERENCES public.component_manufacturers(id) ON DELETE SET NULL,
  ADD COLUMN model_id uuid REFERENCES public.component_models(id) ON DELETE SET NULL;
