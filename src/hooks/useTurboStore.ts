import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatLocalDate } from '@/lib/utils';

export interface Turbo {
  id: string;
  serial_number: string;
  status: string;
  location_id: string | null;
  last_maintenance_date: string | null;
  created_at: string;
}

export interface TurboInstallation {
  id: string;
  turbo_id: string;
  equipment_id: string;
  install_date: string;
  install_equipment_horimeter: number;
  remove_date: string | null;
  remove_equipment_horimeter: number | null;
  created_at: string;
}

export interface TurboMaintenance {
  id: string;
  turbo_id: string;
  maintenance_date: string;
  description: string;
  horimeter_at_maintenance: number;
  attachment_url: string | null;
  created_at: string;
}

export interface TurboMetrics {
  total_hours: number;
  hours_since_maintenance: number;
  last_maintenance_date: string | null;
}

export interface TurboComponent {
  id: string;
  turbo_id: string;
  component_type: string;
  replacement_date: string;
  horimeter_at_replacement: number;
  created_at: string;
}

export const turboComponentTypes: Record<string, string> = {
  turbine_wheel: 'Roda da Turbina',
  compressor_wheel: 'Roda do Compressor',
  bearing: 'Mancal / Rolamento',
  seal_ring: 'Anel de Vedação',
  wastegate: 'Wastegate',
  oil_seal: 'Retentor de Óleo',
};

const statusLabels: Record<string, string> = {
  in_stock: 'Estoque',
  active: 'No Motor',
  maintenance: 'Em Reparo',
};

export { statusLabels as turboStatusLabels };

export function useTurboStore() {
  const queryClient = useQueryClient();

  const turbos = useQuery({
    queryKey: ['turbos'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('turbos').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as Turbo[];
    },
  });

  const installations = useQuery({
    queryKey: ['turbo_installations'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('turbo_installations').select('*').order('install_date', { ascending: false });
      if (error) throw error;
      return data as TurboInstallation[];
    },
  });

  const maintenances = useQuery({
    queryKey: ['turbo_maintenances'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('turbo_maintenances').select('*').order('maintenance_date', { ascending: false });
      if (error) throw error;
      return data as TurboMaintenance[];
    },
  });

  const turboComponents = useQuery({
    queryKey: ['turbo_components'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('turbo_components').select('*').order('replacement_date', { ascending: false });
      if (error) throw error;
      return data as TurboComponent[];
    },
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['turbos'] });
    queryClient.invalidateQueries({ queryKey: ['turbo_installations'] });
    queryClient.invalidateQueries({ queryKey: ['turbo_maintenances'] });
    queryClient.invalidateQueries({ queryKey: ['turbo_components'] });
  };

  const addTurbo = useMutation({
    mutationFn: async (data: { serial_number: string }) => {
      const { data: t, error } = await (supabase as any).from('turbos').insert({ serial_number: data.serial_number, status: 'in_stock' }).select().single();
      if (error) throw error;
      return t as Turbo;
    },
    onSuccess: () => invalidateAll(),
  });

  const updateTurbo = useMutation({
    mutationFn: async (data: { id: string; serial_number: string; status: string }) => {
      const { error } = await (supabase as any).from('turbos').update({ serial_number: data.serial_number, status: data.status }).eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(),
  });

  const deleteTurbo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('turbos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(),
  });

  const installTurbo = useMutation({
    mutationFn: async (data: { turbo_id: string; equipment_id: string; install_equipment_horimeter: number }) => {
      await (supabase as any).from('turbos').update({ status: 'active' }).eq('id', data.turbo_id);
      const { data: inst, error } = await (supabase as any).from('turbo_installations').insert({
        turbo_id: data.turbo_id,
        equipment_id: data.equipment_id,
        install_equipment_horimeter: data.install_equipment_horimeter,
      }).select().single();
      if (error) throw error;
      return inst as TurboInstallation;
    },
    onSuccess: () => invalidateAll(),
  });

  const removeTurbo = useMutation({
    mutationFn: async (data: { installation_id: string; turbo_id: string; remove_equipment_horimeter: number }) => {
      await (supabase as any).from('turbo_installations').update({ remove_date: formatLocalDate(), remove_equipment_horimeter: data.remove_equipment_horimeter }).eq('id', data.installation_id);
      await (supabase as any).from('turbos').update({ status: 'in_stock' }).eq('id', data.turbo_id);
    },
    onSuccess: () => invalidateAll(),
  });

  const addMaintenance = useMutation({
    mutationFn: async (data: { turbo_id: string; description: string; horimeter_at_maintenance: number; maintenance_date?: string; attachment_url?: string | null }) => {
      const mDate = data.maintenance_date || formatLocalDate();
      const insertData: Record<string, any> = {
        turbo_id: data.turbo_id, description: data.description, horimeter_at_maintenance: data.horimeter_at_maintenance, maintenance_date: mDate,
      };
      if (data.attachment_url) insertData.attachment_url = data.attachment_url;
      const { data: m, error } = await (supabase as any).from('turbo_maintenances').insert(insertData).select().single();
      if (error) throw error;
      await (supabase as any).from('turbos').update({ last_maintenance_date: mDate }).eq('id', data.turbo_id);
      return m as TurboMaintenance;
    },
    onSuccess: () => invalidateAll(),
  });

  const getMetrics = async (turboId: string): Promise<TurboMetrics> => {
    const { data, error } = await (supabase as any).rpc('get_turbo_metrics', { p_turbo_id: turboId });
    if (error) throw error;
    return data as TurboMetrics;
  };

  const addTurboComponentsBatch = useMutation({
    mutationFn: async (rows: Array<{ turbo_id: string; component_type: string; replacement_date: string; horimeter_at_replacement: number }>) => {
      const { error } = await (supabase as any).from('turbo_components').insert(rows);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(),
  });

  const updateMaintenance = useMutation({
    mutationFn: async (data: { id: string; description: string; horimeter_at_maintenance: number; maintenance_date: string; attachment_url?: string | null }) => {
      const updates: Record<string, any> = {
        description: data.description,
        horimeter_at_maintenance: data.horimeter_at_maintenance,
        maintenance_date: data.maintenance_date,
      };
      if (data.attachment_url !== undefined) updates.attachment_url = data.attachment_url;
      const { error } = await (supabase as any).from('turbo_maintenances').update(updates).eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(),
  });

  const deleteMaintenance = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('turbo_maintenances').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(),
  });

  const addHistoricalInstallation = useMutation({
    mutationFn: async (data: { turbo_id: string; equipment_id: string; install_date: string; install_equipment_horimeter: number; remove_date?: string | null; remove_equipment_horimeter?: number | null }) => {
      const insertData: Record<string, any> = { turbo_id: data.turbo_id, equipment_id: data.equipment_id, install_date: data.install_date, install_equipment_horimeter: data.install_equipment_horimeter };
      if (data.remove_date) { insertData.remove_date = data.remove_date; insertData.remove_equipment_horimeter = data.remove_equipment_horimeter ?? 0; }
      const { data: inst, error } = await (supabase as any).from('turbo_installations').insert(insertData).select().single();
      if (error) throw error;
      return inst as TurboInstallation;
    },
    onSuccess: () => invalidateAll(),
  });

  const updateInstallation = useMutation({
    mutationFn: async (data: { id: string; equipment_id?: string; install_equipment_horimeter?: number; remove_equipment_horimeter?: number | null }) => {
      const updates: Record<string, any> = {};
      if (data.equipment_id !== undefined) updates.equipment_id = data.equipment_id;
      if (data.install_equipment_horimeter !== undefined) updates.install_equipment_horimeter = data.install_equipment_horimeter;
      if (data.remove_equipment_horimeter !== undefined) updates.remove_equipment_horimeter = data.remove_equipment_horimeter;
      const { error } = await (supabase as any).from('turbo_installations').update(updates).eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(),
  });

  return {
    turbos, installations, maintenances, turboComponents,
    addTurbo, updateTurbo, deleteTurbo,
    installTurbo, removeTurbo,
    addMaintenance, getMetrics,
    addTurboComponentsBatch,
    addHistoricalInstallation, updateInstallation,
    updateMaintenance, deleteMaintenance,
  };
}
