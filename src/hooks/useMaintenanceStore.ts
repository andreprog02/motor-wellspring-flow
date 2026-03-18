import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantId } from '@/hooks/useTenantId';

export interface MaintenanceLog {
  id: string;
  equipment_id: string;
  maintenance_type: string;
  horimeter_at_service: number;
  oil_type_id: string | null;
  notes: string;
  service_date: string;
  created_at: string;
}

export interface MaintenanceLogItem {
  id: string;
  maintenance_log_id: string;
  inventory_item_id: string;
  quantity: number;
}

export interface MaintenanceLogDisplay extends MaintenanceLog {
  equipment_name: string;
  oil_type_name: string | null;
  items: Array<{
    id: string;
    inventory_item_id: string;
    inventory_item_name: string;
    quantity: number;
  }>;
}

export function useMaintenanceStore() {
  const qc = useQueryClient();
  const tenantId = useTenantId();

  const logs = useQuery({
    queryKey: ['maintenance_logs'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('maintenance_logs')
        .select('*, equipments(name), oil_types(name)')
        .order('service_date', { ascending: false });
      if (error) throw error;
      return (data as any[]).map((row: any) => ({
        ...row,
        equipment_name: row.equipments?.name ?? '',
        oil_type_name: row.oil_types?.name ?? null,
      }));
    },
  });

  const logItems = useQuery({
    queryKey: ['maintenance_log_items'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('maintenance_log_items')
        .select('*, inventory_items(name)');
      if (error) throw error;
      return (data as any[]).map((row: any) => ({
        id: row.id,
        maintenance_log_id: row.maintenance_log_id,
        inventory_item_id: row.inventory_item_id,
        inventory_item_name: row.inventory_items?.name ?? '',
        quantity: row.quantity,
      }));
    },
  });

  const addMaintenanceLog = useMutation({
    mutationFn: async (data: {
      log: Omit<MaintenanceLog, 'id' | 'created_at'>;
      items: Array<{ inventory_item_id: string; quantity: number }>;
      periodicity?: Array<{
        equipment_id: string;
        component_type: string;
        task: string;
        trigger_type: string;
        interval_value: number;
        last_execution_value: number;
      }>;
    }) => {
      const { data: log, error: logErr } = await (supabase as any)
        .from('maintenance_logs')
        .insert({
          equipment_id: data.log.equipment_id,
          maintenance_type: data.log.maintenance_type,
          horimeter_at_service: data.log.horimeter_at_service,
          oil_type_id: data.log.oil_type_id || null,
          notes: data.log.notes,
          service_date: data.log.service_date,
          tenant_id: tenantId,
        })
        .select()
        .single();
      if (logErr) throw logErr;

      if (data.items.length > 0) {
        const itemRows = data.items.map(item => ({
          maintenance_log_id: log.id,
          inventory_item_id: item.inventory_item_id,
          quantity: item.quantity,
          tenant_id: tenantId,
        }));
        const { error: itemErr } = await (supabase as any)
          .from('maintenance_log_items')
          .insert(itemRows);
        if (itemErr) throw itemErr;
      }

      for (const item of data.items) {
        const { data: current, error: fetchErr } = await (supabase as any)
          .from('inventory_items')
          .select('quantity')
          .eq('id', item.inventory_item_id)
          .single();
        if (fetchErr) throw fetchErr;

        const newQty = Math.max(0, (current.quantity || 0) - item.quantity);
        const { error: updateErr } = await (supabase as any)
          .from('inventory_items')
          .update({ quantity: newQty })
          .eq('id', item.inventory_item_id);
        if (updateErr) throw updateErr;
      }

      if (data.periodicity && data.periodicity.length > 0) {
        for (const plan of data.periodicity) {
          const { data: existing } = await (supabase as any)
            .from('component_maintenance_plans')
            .select('id')
            .eq('equipment_id', plan.equipment_id)
            .eq('component_type', plan.component_type)
            .maybeSingle();

          if (existing) {
            await (supabase as any)
              .from('component_maintenance_plans')
              .update({
                interval_value: plan.interval_value,
                trigger_type: plan.trigger_type,
                last_execution_value: plan.last_execution_value,
                task: plan.task,
              })
              .eq('id', existing.id);
          } else {
            await (supabase as any)
              .from('component_maintenance_plans')
              .insert({ ...plan, tenant_id: tenantId });
          }
        }
      }

      await (supabase as any)
        .from('equipments')
        .update({ total_horimeter: data.log.horimeter_at_service })
        .eq('id', data.log.equipment_id);

      return log;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maintenance_logs'] });
      qc.invalidateQueries({ queryKey: ['maintenance_log_items'] });
      qc.invalidateQueries({ queryKey: ['inventory_items'] });
      qc.invalidateQueries({ queryKey: ['equipments'] });
      qc.invalidateQueries({ queryKey: ['component_maintenance_plans'] });
    },
  });

  return { logs, logItems, addMaintenanceLog };
}
