import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatLocalDate } from '@/lib/utils';

export interface CylinderHead {
  id: string;
  serial_number: string;
  status: string;
  location_id: string | null;
  last_maintenance_date: string | null;
  estimated_total_hours: number;
  created_at: string;
}

export interface CylinderHeadInstallation {
  id: string;
  cylinder_head_id: string;
  equipment_id: string;
  install_date: string;
  install_equipment_horimeter: number;
  remove_date: string | null;
  remove_equipment_horimeter: number | null;
  created_at: string;
}

export interface CylinderHeadMaintenance {
  id: string;
  cylinder_head_id: string;
  maintenance_date: string;
  description: string;
  horimeter_at_maintenance: number;
  created_at: string;
}

export interface CylinderHeadMetrics {
  total_hours: number;
  hours_since_maintenance: number;
  last_maintenance_date: string | null;
}

export interface CylinderHeadComponent {
  id: string;
  cylinder_head_id: string;
  component_type: string;
  replacement_date: string;
  horimeter_at_replacement: number;
  created_at: string;
}

export const cylinderHeadComponentTypes: Record<string, string> = {
  intake_valve: 'Válvula de Admissão',
  exhaust_valve: 'Válvula de Escape',
  intake_seat: 'Sede de Admissão',
  exhaust_seat: 'Sede de Escape',
  intake_oring: 'O-Ring Admissão',
  exhaust_oring: 'O-Ring Escape',
};

const statusLabels: Record<string, string> = {
  in_stock: 'Estoque',
  active: 'No Motor',
  maintenance: 'Em Reparo',
};

export { statusLabels as cylinderHeadStatusLabels };

export function useCylinderHeadStore() {
  const queryClient = useQueryClient();

  const cylinderHeads = useQuery({
    queryKey: ['cylinder_heads'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('cylinder_heads')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as CylinderHead[];
    },
  });

  const installations = useQuery({
    queryKey: ['cylinder_head_installations'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('cylinder_head_installations')
        .select('*')
        .order('install_date', { ascending: false });
      if (error) throw error;
      return data as CylinderHeadInstallation[];
    },
  });

  const maintenances = useQuery({
    queryKey: ['cylinder_head_maintenances'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('cylinder_head_maintenances')
        .select('*')
        .order('maintenance_date', { ascending: false });
      if (error) throw error;
      return data as CylinderHeadMaintenance[];
    },
  });

  const headComponents = useQuery({
    queryKey: ['cylinder_head_components'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('cylinder_head_components')
        .select('*')
        .order('replacement_date', { ascending: false });
      if (error) throw error;
      return data as CylinderHeadComponent[];
    },
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['cylinder_heads'] });
    queryClient.invalidateQueries({ queryKey: ['cylinder_head_installations'] });
    queryClient.invalidateQueries({ queryKey: ['cylinder_head_maintenances'] });
    queryClient.invalidateQueries({ queryKey: ['cylinder_head_components'] });
  };

  const addCylinderHead = useMutation({
    mutationFn: async (data: { serial_number: string; location_id?: string | null }) => {
      const { data: ch, error } = await (supabase as any)
        .from('cylinder_heads')
        .insert({ serial_number: data.serial_number, status: 'in_stock', location_id: data.location_id || null })
        .select()
        .single();
      if (error) throw error;
      return ch as CylinderHead;
    },
    onSuccess: () => invalidateAll(),
  });

  const installCylinderHead = useMutation({
    mutationFn: async (data: { cylinder_head_id: string; equipment_id: string; install_equipment_horimeter: number }) => {
      // Update status to active
      await (supabase as any)
        .from('cylinder_heads')
        .update({ status: 'active' })
        .eq('id', data.cylinder_head_id);
      // Create installation record
      const { data: inst, error } = await (supabase as any)
        .from('cylinder_head_installations')
        .insert({
          cylinder_head_id: data.cylinder_head_id,
          equipment_id: data.equipment_id,
          install_equipment_horimeter: data.install_equipment_horimeter,
        })
        .select()
        .single();
      if (error) throw error;
      return inst as CylinderHeadInstallation;
    },
    onSuccess: () => invalidateAll(),
  });

  const removeCylinderHead = useMutation({
    mutationFn: async (data: { installation_id: string; cylinder_head_id: string; remove_equipment_horimeter: number }) => {
      // Close installation
      await (supabase as any)
        .from('cylinder_head_installations')
        .update({ remove_date: formatLocalDate(), remove_equipment_horimeter: data.remove_equipment_horimeter })
        .eq('id', data.installation_id);
      // Set status back to in_stock
      await (supabase as any)
        .from('cylinder_heads')
        .update({ status: 'in_stock' })
        .eq('id', data.cylinder_head_id);
    },
    onSuccess: () => invalidateAll(),
  });

  const addMaintenance = useMutation({
    mutationFn: async (data: { cylinder_head_id: string; description: string; horimeter_at_maintenance: number; maintenance_date?: string }) => {
      const { data: m, error } = await (supabase as any)
        .from('cylinder_head_maintenances')
        .insert({
          cylinder_head_id: data.cylinder_head_id,
          description: data.description,
          horimeter_at_maintenance: data.horimeter_at_maintenance,
          maintenance_date: data.maintenance_date || formatLocalDate(),
        })
        .select()
        .single();
      if (error) throw error;
      // Update last_maintenance_date cache
      await (supabase as any)
        .from('cylinder_heads')
        .update({ last_maintenance_date: data.maintenance_date || formatLocalDate() })
        .eq('id', data.cylinder_head_id);
      return m as CylinderHeadMaintenance;
    },
    onSuccess: () => invalidateAll(),
  });

  const getMetrics = async (cylinderHeadId: string): Promise<CylinderHeadMetrics> => {
    const { data, error } = await (supabase as any).rpc('get_cylinder_head_metrics', { p_cylinder_head_id: cylinderHeadId });
    if (error) throw error;
    return data as CylinderHeadMetrics;
  };

  const updateCylinderHead = useMutation({
    mutationFn: async (data: { id: string; serial_number: string; status: string }) => {
      const { error } = await (supabase as any)
        .from('cylinder_heads')
        .update({ serial_number: data.serial_number, status: data.status })
        .eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(),
  });

  const deleteCylinderHead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('cylinder_heads').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(),
  });

  const addHeadComponent = useMutation({
    mutationFn: async (data: { cylinder_head_id: string; component_type: string; replacement_date: string; horimeter_at_replacement: number }) => {
      const { data: comp, error } = await (supabase as any)
        .from('cylinder_head_components')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return comp as CylinderHeadComponent;
    },
    onSuccess: () => invalidateAll(),
  });

  const addHeadComponentsBatch = useMutation({
    mutationFn: async (rows: Array<{ cylinder_head_id: string; component_type: string; replacement_date: string; horimeter_at_replacement: number }>) => {
      const { error } = await (supabase as any)
        .from('cylinder_head_components')
        .insert(rows);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(),
  });

  const addHistoricalInstallation = useMutation({
    mutationFn: async (data: {
      cylinder_head_id: string;
      equipment_id: string;
      install_date: string;
      install_equipment_horimeter: number;
      remove_date?: string | null;
      remove_equipment_horimeter?: number | null;
    }) => {
      const insertData: Record<string, any> = {
        cylinder_head_id: data.cylinder_head_id,
        equipment_id: data.equipment_id,
        install_date: data.install_date,
        install_equipment_horimeter: data.install_equipment_horimeter,
      };
      if (data.remove_date) {
        insertData.remove_date = data.remove_date;
        insertData.remove_equipment_horimeter = data.remove_equipment_horimeter ?? 0;
      }
      const { data: inst, error } = await (supabase as any)
        .from('cylinder_head_installations')
        .insert(insertData)
        .select()
        .single();
      if (error) throw error;
      return inst as CylinderHeadInstallation;
    },
    onSuccess: () => invalidateAll(),
  });

  const updateInstallation = useMutation({
    mutationFn: async (data: {
      id: string;
      equipment_id?: string;
      install_equipment_horimeter?: number;
      remove_equipment_horimeter?: number | null;
    }) => {
      const updates: Record<string, any> = {};
      if (data.equipment_id !== undefined) updates.equipment_id = data.equipment_id;
      if (data.install_equipment_horimeter !== undefined) updates.install_equipment_horimeter = data.install_equipment_horimeter;
      if (data.remove_equipment_horimeter !== undefined) updates.remove_equipment_horimeter = data.remove_equipment_horimeter;
      const { error } = await (supabase as any)
        .from('cylinder_head_installations')
        .update(updates)
        .eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(),
  });

  const updateMaintenance = useMutation({
    mutationFn: async (data: { id: string; description: string; horimeter_at_maintenance: number; maintenance_date: string }) => {
      const { error } = await (supabase as any)
        .from('cylinder_head_maintenances')
        .update({ description: data.description, horimeter_at_maintenance: data.horimeter_at_maintenance, maintenance_date: data.maintenance_date })
        .eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(),
  });

  const deleteMaintenance = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('cylinder_head_maintenances').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(),
  });

  return {
    cylinderHeads,
    installations,
    maintenances,
    headComponents,
    addCylinderHead,
    updateCylinderHead,
    installCylinderHead,
    removeCylinderHead,
    addMaintenance,
    getMetrics,
    deleteCylinderHead,
    addHeadComponent,
    addHeadComponentsBatch,
    addHistoricalInstallation,
    updateInstallation,
    updateMaintenance,
    deleteMaintenance,
  };
}
