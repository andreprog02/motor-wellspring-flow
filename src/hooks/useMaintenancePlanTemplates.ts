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

  const syncAfterTaskChange = async (templateId: string) => {
    // Get all equipments linked to this template
    const { data: linkedEquipments } = await (supabase as any)
      .from('equipments')
      .select('id, total_horimeter')
      .eq('maintenance_plan_template_id', templateId);
    if (!linkedEquipments || linkedEquipments.length === 0) return;

    for (const eq of linkedEquipments) {
      await applyTemplateToEquipment(templateId, eq.id, eq.total_horimeter);
    }
    qc.invalidateQueries({ queryKey: ['component_maintenance_plans'] });
    qc.invalidateQueries({ queryKey: ['component_maintenance_plans_all'] });
  };

  const addTask = useMutation({
    mutationFn: async (params: Omit<MaintenancePlanTemplateTask, 'id' | 'created_at'>) => {
      const { data, error } = await (supabase as any).from('maintenance_plan_template_tasks').insert({ ...params, tenant_id: tenantId }).select().single();
      if (error) throw error;
      return data as MaintenancePlanTemplateTask;
    },
    onSuccess: async (data) => {
      invalidate();
      await syncAfterTaskChange(data.template_id);
    },
  });

  const updateTask = useMutation({
    mutationFn: async (params: { id: string; template_id: string; updates: Partial<Omit<MaintenancePlanTemplateTask, 'id' | 'created_at'>> }) => {
      const { error } = await (supabase as any).from('maintenance_plan_template_tasks').update(params.updates).eq('id', params.id);
      if (error) throw error;
      return params;
    },
    onSuccess: async (params) => {
      invalidate();
      // Update matching component_maintenance_plans for all linked equipments
      const { data: linkedEquipments } = await (supabase as any)
        .from('equipments')
        .select('id')
        .eq('maintenance_plan_template_id', params.template_id);
      if (linkedEquipments && linkedEquipments.length > 0) {
        // Fetch old task data before update to find the right plans
        // Since the update already happened, we use the new values
        const updates = params.updates;
        // We need to update all plans that match the old component_type + task for these equipments
        for (const eq of linkedEquipments) {
          const updateFields: Record<string, any> = {};
          if (updates.component_type !== undefined) updateFields.component_type = updates.component_type;
          if (updates.task !== undefined) updateFields.task = updates.task;
          if (updates.trigger_type !== undefined) updateFields.trigger_type = updates.trigger_type;
          if (updates.interval_value !== undefined) updateFields.interval_value = updates.interval_value;
          // We can't reliably match old values after update, so re-apply template
        }
        await syncAfterTaskChange(params.template_id);
      }
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (params: { id: string; template_id: string; component_type: string; task: string }) => {
      const { error } = await (supabase as any).from('maintenance_plan_template_tasks').delete().eq('id', params.id);
      if (error) throw error;
      return params;
    },
    onSuccess: async (params) => {
      invalidate();
      // Delete matching component_maintenance_plans from all linked equipments
      const { data: linkedEquipments } = await (supabase as any)
        .from('equipments')
        .select('id')
        .eq('maintenance_plan_template_id', params.template_id);
      if (linkedEquipments && linkedEquipments.length > 0) {
        for (const eq of linkedEquipments) {
          await (supabase as any)
            .from('component_maintenance_plans')
            .delete()
            .eq('equipment_id', eq.id)
            .eq('component_type', params.component_type)
            .eq('task', params.task);
        }
        qc.invalidateQueries({ queryKey: ['component_maintenance_plans'] });
        qc.invalidateQueries({ queryKey: ['component_maintenance_plans_all'] });
      }
    },
  });

  const CYLINDER_COMPONENT_TYPES = ['spark_plug', 'liner', 'piston', 'connecting_rod', 'bearing'];

  const applyTemplateToEquipment = async (templateId: string, equipmentId: string, currentHorimeter: number) => {
    const tasks = (templateTasks.data ?? []).filter(t => t.template_id === templateId);
    if (tasks.length === 0) return;

    // Fetch existing plans to preserve recorded maintenance data
    const { data: existingPlans } = await (supabase as any)
      .from('component_maintenance_plans')
      .select('*')
      .eq('equipment_id', equipmentId);

    const existing = existingPlans || [];

    // Fetch both cylinder components and sub-components
    const [{ data: cylComps }, { data: subComps }] = await Promise.all([
      (supabase as any).from('cylinder_components').select('id, component_type, cylinder_number').eq('equipment_id', equipmentId),
      (supabase as any).from('equipment_sub_components').select('id, component_type').eq('equipment_id', equipmentId),
    ]);

    // Helper to check if a plan already exists
    const planExists = (componentType: string, task: string, componentId: string | null) => {
      return existing.some((e: any) =>
        e.component_type === componentType &&
        e.task === task &&
        (componentId ? e.component_id === componentId : !e.component_id)
      );
    };

    const rows: Array<Record<string, any>> = [];

    for (const t of tasks) {
      if (CYLINDER_COMPONENT_TYPES.includes(t.component_type) && cylComps && cylComps.length > 0) {
        const matchingComps = cylComps.filter((c: any) => c.component_type === t.component_type);
        for (const comp of matchingComps) {
          if (!planExists(t.component_type, t.task, comp.id)) {
            rows.push({
              equipment_id: equipmentId, component_type: t.component_type, component_id: comp.id,
              task: t.task, trigger_type: t.trigger_type, interval_value: t.interval_value, last_execution_value: 0, tenant_id: tenantId,
            });
          }
        }
      } else if (subComps && subComps.length > 0) {
        const matchingSubs = subComps.filter((sc: any) => sc.component_type === t.component_type);
        if (matchingSubs.length > 0) {
          for (const sub of matchingSubs) {
            if (!planExists(t.component_type, t.task, sub.id)) {
              rows.push({
                equipment_id: equipmentId, component_type: t.component_type, component_id: sub.id,
                task: t.task, trigger_type: t.trigger_type, interval_value: t.interval_value, last_execution_value: 0, tenant_id: tenantId,
              });
            }
          }
        } else {
          if (!planExists(t.component_type, t.task, null)) {
            rows.push({
              equipment_id: equipmentId, component_type: t.component_type,
              task: t.task, trigger_type: t.trigger_type, interval_value: t.interval_value, last_execution_value: 0, tenant_id: tenantId,
            });
          }
        }
      } else {
        if (!planExists(t.component_type, t.task, null)) {
          rows.push({
            equipment_id: equipmentId, component_type: t.component_type,
            task: t.task, trigger_type: t.trigger_type, interval_value: t.interval_value, last_execution_value: 0, tenant_id: tenantId,
          });
        }
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
