
-- Equipment types: gerador, etc.
CREATE TABLE public.equipments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  equipment_type TEXT NOT NULL DEFAULT 'gerador',
  serial_number TEXT NOT NULL DEFAULT '',
  total_horimeter NUMERIC NOT NULL DEFAULT 0,
  total_starts INTEGER NOT NULL DEFAULT 0,
  cylinders INTEGER NOT NULL DEFAULT 0,
  fuel_type TEXT NOT NULL DEFAULT 'biogas',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Separate manufacturers for turbines/sub-components
CREATE TABLE public.component_manufacturers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Models for component manufacturers
CREATE TABLE public.component_models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  manufacturer_id UUID NOT NULL REFERENCES public.component_manufacturers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sub-components: turbine, intercooler, oil_exchanger
CREATE TABLE public.equipment_sub_components (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL REFERENCES public.equipments(id) ON DELETE CASCADE,
  component_type TEXT NOT NULL, -- 'turbine', 'intercooler', 'oil_exchanger'
  serial_number TEXT NOT NULL DEFAULT '',
  manufacturer_id UUID REFERENCES public.component_manufacturers(id),
  model_id UUID REFERENCES public.component_models(id),
  horimeter NUMERIC NOT NULL DEFAULT 0,
  use_equipment_hours BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cylinder components: spark_plug, liner, piston (auto-created per cylinder)
CREATE TABLE public.cylinder_components (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL REFERENCES public.equipments(id) ON DELETE CASCADE,
  cylinder_number INTEGER NOT NULL,
  component_type TEXT NOT NULL, -- 'spark_plug', 'liner', 'piston'
  horimeter_at_install NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Maintenance plans for all components
CREATE TABLE public.component_maintenance_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL REFERENCES public.equipments(id) ON DELETE CASCADE,
  component_type TEXT NOT NULL, -- 'spark_plug', 'liner', 'piston', 'turbine', 'intercooler', 'oil_exchanger'
  component_id UUID, -- reference to cylinder_components or equipment_sub_components
  task TEXT NOT NULL,
  trigger_type TEXT NOT NULL DEFAULT 'hours', -- 'hours', 'starts', 'months'
  interval_value NUMERIC NOT NULL DEFAULT 0,
  last_execution_value NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS policies (permissive for now)
ALTER TABLE public.equipments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to equipments" ON public.equipments FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.component_manufacturers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to component_manufacturers" ON public.component_manufacturers FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.component_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to component_models" ON public.component_models FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.equipment_sub_components ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to equipment_sub_components" ON public.equipment_sub_components FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.cylinder_components ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to cylinder_components" ON public.cylinder_components FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.component_maintenance_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to component_maintenance_plans" ON public.component_maintenance_plans FOR ALL USING (true) WITH CHECK (true);
