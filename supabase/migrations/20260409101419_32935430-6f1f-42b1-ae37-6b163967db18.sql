INSERT INTO public.cylinder_components (equipment_id, cylinder_number, component_type, horimeter_at_install, tenant_id)
SELECT e.id, c.cylinder_number, t.component_type, e.total_horimeter, e.tenant_id
FROM public.equipments e
CROSS JOIN generate_series(1, e.cylinders) AS c(cylinder_number)
CROSS JOIN (VALUES ('segment_ring'), ('valve')) AS t(component_type)
WHERE e.equipment_type != 'outro'
  AND e.cylinders > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.cylinder_components cc
    WHERE cc.equipment_id = e.id
      AND cc.cylinder_number = c.cylinder_number
      AND cc.component_type = t.component_type
  );