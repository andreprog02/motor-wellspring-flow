
-- Turbos table
CREATE TABLE public.turbos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  serial_number TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'in_stock',
  location_id UUID REFERENCES public.locations(id),
  last_maintenance_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.turbos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to turbos" ON public.turbos FOR ALL USING (true) WITH CHECK (true);

-- Turbo installations table
CREATE TABLE public.turbo_installations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  turbo_id UUID NOT NULL REFERENCES public.turbos(id),
  equipment_id UUID NOT NULL REFERENCES public.equipments(id),
  install_date DATE NOT NULL DEFAULT CURRENT_DATE,
  install_equipment_horimeter NUMERIC NOT NULL DEFAULT 0,
  remove_date DATE,
  remove_equipment_horimeter NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.turbo_installations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to turbo_installations" ON public.turbo_installations FOR ALL USING (true) WITH CHECK (true);

-- Turbo maintenances table
CREATE TABLE public.turbo_maintenances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  turbo_id UUID NOT NULL REFERENCES public.turbos(id),
  maintenance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL DEFAULT '',
  horimeter_at_maintenance NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.turbo_maintenances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to turbo_maintenances" ON public.turbo_maintenances FOR ALL USING (true) WITH CHECK (true);

-- Turbo components table
CREATE TABLE public.turbo_components (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  turbo_id UUID NOT NULL REFERENCES public.turbos(id),
  component_type TEXT NOT NULL,
  replacement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  horimeter_at_replacement NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.turbo_components ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to turbo_components" ON public.turbo_components FOR ALL USING (true) WITH CHECK (true);

-- RPC function for turbo metrics (same logic as cylinder heads)
CREATE OR REPLACE FUNCTION public.get_turbo_metrics(p_turbo_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_total_hours numeric := 0;
  v_hours_since_maintenance numeric := 0;
  v_last_maintenance_date date;
  v_rec record;
BEGIN
  SELECT maintenance_date INTO v_last_maintenance_date
  FROM public.turbo_maintenances
  WHERE turbo_id = p_turbo_id
  ORDER BY maintenance_date DESC
  LIMIT 1;

  FOR v_rec IN
    SELECT
      i.install_date,
      i.install_equipment_horimeter,
      i.remove_date,
      i.remove_equipment_horimeter,
      CASE
        WHEN i.remove_equipment_horimeter IS NOT NULL THEN i.remove_equipment_horimeter
        ELSE (SELECT e.total_horimeter FROM public.equipments e WHERE e.id = i.equipment_id)
      END AS effective_end_horimeter
    FROM public.turbo_installations i
    WHERE i.turbo_id = p_turbo_id
    ORDER BY i.install_date
  LOOP
    v_total_hours := v_total_hours + (v_rec.effective_end_horimeter - v_rec.install_equipment_horimeter);

    IF v_last_maintenance_date IS NULL THEN
      v_hours_since_maintenance := v_hours_since_maintenance + (v_rec.effective_end_horimeter - v_rec.install_equipment_horimeter);
    ELSE
      IF v_rec.remove_date IS NOT NULL AND v_rec.remove_date <= v_last_maintenance_date THEN
        NULL;
      ELSIF v_rec.install_date > v_last_maintenance_date THEN
        v_hours_since_maintenance := v_hours_since_maintenance + (v_rec.effective_end_horimeter - v_rec.install_equipment_horimeter);
      ELSE
        DECLARE
          v_total_days numeric;
          v_days_after numeric;
          v_total_delta numeric;
        BEGIN
          v_total_delta := v_rec.effective_end_horimeter - v_rec.install_equipment_horimeter;
          IF v_rec.remove_date IS NOT NULL THEN
            v_total_days := GREATEST((v_rec.remove_date - v_rec.install_date), 1);
          ELSE
            v_total_days := GREATEST((CURRENT_DATE - v_rec.install_date), 1);
          END IF;
          v_days_after := GREATEST(
            CASE
              WHEN v_rec.remove_date IS NOT NULL THEN (v_rec.remove_date - v_last_maintenance_date)
              ELSE (CURRENT_DATE - v_last_maintenance_date)
            END, 0
          );
          v_hours_since_maintenance := v_hours_since_maintenance + (v_total_delta * v_days_after / v_total_days);
        END;
      END IF;
    END IF;
  END LOOP;

  RETURN json_build_object(
    'total_hours', COALESCE(v_total_hours, 0),
    'hours_since_maintenance', COALESCE(v_hours_since_maintenance, 0),
    'last_maintenance_date', v_last_maintenance_date
  );
END;
$function$;
