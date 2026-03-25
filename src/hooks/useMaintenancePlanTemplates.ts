import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantId } from '@/hooks/useTenantId';

export interface MaintenancePlanTemplate {
  id: string;
  name: string;
  description: string;
  manufacturer_id: string | null;
  model_id: string | null;
  created_at: string;
}

export interface MaintenancePlanTemplateTask {
  id: string;
  template_id: string;
  component_type: string;
  task: string;
  trigger_type: string;
  interval_value: number;
  created_at: string;
}

export function useMaintenancePlanTemplates() {
  const qc = useQueryClient();
  const tenantId = useTenantId();

  const templates = useQuery({
    queryKey: ['maintenance_plan_templates'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('maintenance_plan_templates').select('*').order('name');
      if (error) throw error;
      return data as MaintenancePlanTemplate[];
    },
  });

  const templateTasks = useQuery({
    queryKey: ['maintenance_plan_template_tasks'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('maintenance_plan_template_tasks').select('*').order('created_at');
      if (error) throw error;
      return data as MaintenancePlanTemplateTask[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['maintenance_plan_templates'] });
    qc.invalidateQueries({ queryKey: ['maintenance_plan_template_tasks'] });
  };

  const addTemplate = useMutation({
    mutationFn: async (params: { name: string; description: string; manufacturer_id?: string | null; model_id?: string | null }) => {
      const { data, error } = await (supabase as any).from('maintenance_plan_templates').insert({ ...params, tenant_id: tenantId }).select().single();
      if (error) throw error;
      return data as MaintenancePlanTemplate;
    },
    onSuccess: invalidate,
  });

  const updateTemplate = useMutation({
    mutationFn: async (params: { id: string; name: string; description: string; manufacturer_id?: string | null; model_id?: string | null }) => {
      const { error } = await (supabase as any).from('maintenance_plan_templates').update({ name: params.name, description: params.description, manufacturer_id: params.manufacturer_id ?? null, model_id: params.model_id ?? null }).eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('maintenance_plan_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const addTask = useMutation({
    mutationFn: async (params: Omit<MaintenancePlanTemplateTask, 'id' | 'created_at'>) => {
      const { data, error } = await (supabase as any).from('maintenance_plan_template_tasks').insert({ ...params, tenant_id: tenantId }).select().single();
      if (error) throw error;
      return data as MaintenancePlanTemplateTask;
    },
    onSuccess: invalidate,
  });

  const updateTask = useMutation({
    mutationFn: async (params: { id: string; updates: Partial<Omit<MaintenancePlanTemplateTask, 'id' | 'created_at'>> }) => {
      const { error } = await (supabase as any).from('maintenance_plan_template_tasks').update(params.updates).eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('maintenance_plan_template_tasks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const CYLINDER_COMPONENT_TYPES = ['spark_plug', 'liner', 'piston', 'connecting_rod', 'bearing'];

  const applyTemplateToEquipment = async (templateId: string, equipmentId: string, currentHorimeter: number) => {
    const tasks = (templateTasks.data ?? []).filter(t => t.template_id === templateId);
    if (tasks.length === 0) return;

    await (supabase as any).from('component_maintenance_plans').delete().eq('equipment_id', equipmentId);

    // Fetch both cylinder components and sub-components
    const [{ data: cylComps }, { data: subComps }] = await Promise.all([
      (supabase as any).from('cylinder_components').select('id, component_type, cylinder_number').eq('equipment_id', equipmentId),
      (supabase as any).from('equipment_sub_components').select('id, component_type').eq('equipment_id', equipmentId),
    ]);

    const rows: Array<Record<string, any>> = [];

    for (const t of tasks) {
      if (CYLINDER_COMPONENT_TYPES.includes(t.component_type) && cylComps && cylComps.length > 0) {
        // Match cylinder components (spark_plug, liner, piston, etc.)
        const matchingComps = cylComps.filter((c: any) => c.component_type === t.component_type);
        for (const comp of matchingComps) {
          rows.push({
            equipment_id: equipmentId, component_type: t.component_type, component_id: comp.id,
            task: t.task, trigger_type: t.trigger_type, interval_value: t.interval_value, last_execution_value: 0, tenant_id: tenantId,
          });
        }
      } else if (subComps && subComps.length > 0) {
        // Match sub-components (custom components for other assets)
        const matchingSubs = subComps.filter((sc: any) => sc.component_type === t.component_type);
        if (matchingSubs.length > 0) {
          for (const sub of matchingSubs) {
            rows.push({
              equipment_id: equipmentId, component_type: t.component_type, component_id: sub.id,
              task: t.task, trigger_type: t.trigger_type, interval_value: t.interval_value, last_execution_value: 0, tenant_id: tenantId,
            });
          }
        } else {
          // No matching sub-component found, create without component_id
          rows.push({
            equipment_id: equipmentId, component_type: t.component_type,
            task: t.task, trigger_type: t.trigger_type, interval_value: t.interval_value, last_execution_value: 0, tenant_id: tenantId,
          });
        }
      } else {
        rows.push({
          equipment_id: equipmentId, component_type: t.component_type,
          task: t.task, trigger_type: t.trigger_type, interval_value: t.interval_value, last_execution_value: 0, tenant_id: tenantId,
        });
      }
    }

    if (rows.length > 0) {
      const { error } = await (supabase as any).from('component_maintenance_plans').insert(rows);
      if (error) throw error;
    }

    await (supabase as any).from('equipments').update({ maintenance_plan_template_id: templateId }).eq('id', equipmentId);

    qc.invalidateQueries({ queryKey: ['component_maintenance_plans'] });
    qc.invalidateQueries({ queryKey: ['equipments'] });
    qc.invalidateQueries({ queryKey: ['equipment_sub_components'] });
  };

  return {
    templates, templateTasks,
    addTemplate, updateTemplate, deleteTemplate,
    addTask, updateTask, deleteTask,
    applyTemplateToEquipment,
  };
}
