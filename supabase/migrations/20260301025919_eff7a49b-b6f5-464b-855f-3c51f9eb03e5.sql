
-- 1. Create maintenance plan templates table
CREATE TABLE public.maintenance_plan_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Create tasks within a template
CREATE TABLE public.maintenance_plan_template_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.maintenance_plan_templates(id) ON DELETE CASCADE,
  component_type TEXT NOT NULL,
  task TEXT NOT NULL,
  trigger_type TEXT NOT NULL DEFAULT 'hours',
  interval_value NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Add template reference to equipments
ALTER TABLE public.equipments ADD COLUMN maintenance_plan_template_id UUID REFERENCES public.maintenance_plan_templates(id) ON DELETE SET NULL;

-- 4. RLS for templates
ALTER TABLE public.maintenance_plan_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to maintenance_plan_templates" ON public.maintenance_plan_templates FOR ALL USING (true) WITH CHECK (true);

-- 5. RLS for template tasks
ALTER TABLE public.maintenance_plan_template_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to maintenance_plan_template_tasks" ON public.maintenance_plan_template_tasks FOR ALL USING (true) WITH CHECK (true);
