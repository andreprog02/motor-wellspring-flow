import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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

  const templates = useQuery({
    queryKey: ['maintenance_plan_templates'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('maintenance_plan_templates')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as MaintenancePlanTemplate[];
    },
  });

  const templateTasks = useQuery({
    queryKey: ['maintenance_plan_template_tasks'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('maintenance_plan_template_tasks')
        .select('*')
        .order('created_at');
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
      const { data, error } = await (supabase as any)
        .from('maintenance_plan_templates')
        .insert(params)
        .select()
        .single();
      if (error) throw error;
      return data as MaintenancePlanTemplate;
    },
    onSuccess: invalidate,
  });

  const updateTemplate = useMutation({
    mutationFn: async (params: { id: string; name: string; description: string; manufacturer_id?: string | null; model_id?: string | null }) => {
      const { error } = await (supabase as any)
        .from('maintenance_plan_templates')
        .update({ name: params.name, description: params.description, manufacturer_id: params.manufacturer_id ?? null, model_id: params.model_id ?? null })
        .eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('maintenance_plan_templates')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const addTask = useMutation({
    mutationFn: async (params: Omit<MaintenancePlanTemplateTask, 'id' | 'created_at'>) => {
      const { data, error } = await (supabase as any)
        .from('maintenance_plan_template_tasks')
        .insert(params)
        .select()
        .single();
      if (error) throw error;
      return data as MaintenancePlanTemplateTask;
    },
    onSuccess: invalidate,
  });

  const updateTask = useMutation({
    mutationFn: async (params: { id: string; updates: Partial<Omit<MaintenancePlanTemplateTask, 'id' | 'created_at'>> }) => {
      const { error } = await (supabase as any)
        .from('maintenance_plan_template_tasks')
        .update(params.updates)
        .eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('maintenance_plan_template_tasks')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  /** Apply a template to an equipment: generates component_maintenance_plans rows */
  const applyTemplateToEquipment = async (templateId: string, equipmentId: string, currentHorimeter: number) => {
    const tasks = (templateTasks.data ?? []).filter(t => t.template_id === templateId);
    if (tasks.length === 0) return;

    // Delete existing plans for this equipment first
    await (supabase as any)
      .from('component_maintenance_plans')
      .delete()
      .eq('equipment_id', equipmentId);

    const rows = tasks.map(t => ({
      equipment_id: equipmentId,
      component_type: t.component_type,
      task: t.task,
      trigger_type: t.trigger_type,
      interval_value: t.interval_value,
      last_execution_value: currentHorimeter,
    }));

    const { error } = await (supabase as any)
      .from('component_maintenance_plans')
      .insert(rows);
    if (error) throw error;

    // Link template to equipment
    await (supabase as any)
      .from('equipments')
      .update({ maintenance_plan_template_id: templateId })
      .eq('id', equipmentId);

    qc.invalidateQueries({ queryKey: ['component_maintenance_plans'] });
    qc.invalidateQueries({ queryKey: ['equipments'] });
  };

  return {
    templates, templateTasks,
    addTemplate, updateTemplate, deleteTemplate,
    addTask, updateTask, deleteTask,
    applyTemplateToEquipment,
  };
}
