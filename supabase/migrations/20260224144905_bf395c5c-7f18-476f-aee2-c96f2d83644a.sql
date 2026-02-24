
-- Tabela de registros de manutenção (troca de óleo)
CREATE TABLE public.maintenance_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL REFERENCES public.equipments(id) ON DELETE CASCADE,
  maintenance_type TEXT NOT NULL DEFAULT 'oil_change',
  horimeter_at_service NUMERIC NOT NULL DEFAULT 0,
  oil_type_id UUID REFERENCES public.oil_types(id),
  notes TEXT DEFAULT '',
  service_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Itens utilizados na manutenção (filtros, peças do estoque)
CREATE TABLE public.maintenance_log_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  maintenance_log_id UUID NOT NULL REFERENCES public.maintenance_logs(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS policies
ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_log_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to maintenance_logs" ON public.maintenance_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to maintenance_log_items" ON public.maintenance_log_items FOR ALL USING (true) WITH CHECK (true);
