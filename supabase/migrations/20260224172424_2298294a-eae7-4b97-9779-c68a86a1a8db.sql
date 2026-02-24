
-- Tabela de Cabeçotes
CREATE TABLE public.cylinder_heads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  serial_number text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'in_stock',
  location_id uuid REFERENCES public.locations(id),
  last_maintenance_date date,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.cylinder_heads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to cylinder_heads" ON public.cylinder_heads FOR ALL USING (true) WITH CHECK (true);

-- Tabela de Instalações de Cabeçotes
CREATE TABLE public.cylinder_head_installations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cylinder_head_id uuid NOT NULL REFERENCES public.cylinder_heads(id) ON DELETE CASCADE,
  equipment_id uuid NOT NULL REFERENCES public.equipments(id) ON DELETE CASCADE,
  install_date date NOT NULL DEFAULT CURRENT_DATE,
  install_equipment_horimeter numeric NOT NULL DEFAULT 0,
  remove_date date,
  remove_equipment_horimeter numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.cylinder_head_installations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to cylinder_head_installations" ON public.cylinder_head_installations FOR ALL USING (true) WITH CHECK (true);

-- Tabela de Manutenções de Cabeçotes
CREATE TABLE public.cylinder_head_maintenances (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cylinder_head_id uuid NOT NULL REFERENCES public.cylinder_heads(id) ON DELETE CASCADE,
  maintenance_date date NOT NULL DEFAULT CURRENT_DATE,
  description text NOT NULL DEFAULT '',
  horimeter_at_maintenance numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.cylinder_head_maintenances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to cylinder_head_maintenances" ON public.cylinder_head_maintenances FOR ALL USING (true) WITH CHECK (true);

-- Função RPC para calcular métricas do cabeçote
CREATE OR REPLACE FUNCTION public.get_cylinder_head_metrics(p_cylinder_head_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_hours numeric := 0;
  v_hours_since_maintenance numeric := 0;
  v_last_maintenance_date date;
  v_rec record;
BEGIN
  -- Buscar a data da última manutenção
  SELECT maintenance_date INTO v_last_maintenance_date
  FROM public.cylinder_head_maintenances
  WHERE cylinder_head_id = p_cylinder_head_id
  ORDER BY maintenance_date DESC
  LIMIT 1;

  -- Calcular horas totais e horas desde manutenção
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
    FROM public.cylinder_head_installations i
    WHERE i.cylinder_head_id = p_cylinder_head_id
    ORDER BY i.install_date
  LOOP
    -- Delta de horas para esta instalação
    v_total_hours := v_total_hours + (v_rec.effective_end_horimeter - v_rec.install_equipment_horimeter);

    -- Para horas desde manutenção: considerar apenas instalações relevantes
    IF v_last_maintenance_date IS NULL THEN
      -- Sem manutenção -> igual ao total
      v_hours_since_maintenance := v_hours_since_maintenance + (v_rec.effective_end_horimeter - v_rec.install_equipment_horimeter);
    ELSE
      -- Instalação finalizada antes da última manutenção -> ignorar
      IF v_rec.remove_date IS NOT NULL AND v_rec.remove_date <= v_last_maintenance_date THEN
        -- Ignorar completamente
        NULL;
      -- Instalação começou após a manutenção -> contar inteira
      ELSIF v_rec.install_date > v_last_maintenance_date THEN
        v_hours_since_maintenance := v_hours_since_maintenance + (v_rec.effective_end_horimeter - v_rec.install_equipment_horimeter);
      -- Instalação cruzou a data de manutenção -> contar delta parcial
      ELSE
        -- Aproximar: usar a proporção de tempo
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
$$;
