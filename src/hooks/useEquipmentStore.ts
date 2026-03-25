import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantId } from '@/hooks/useTenantId';

export interface Equipment {
  id: string;
  name: string;
  equipment_type: string;
  serial_number: string;
  total_horimeter: number;
  total_starts: number;
  cylinders: number;
  fuel_type: string;
  installation_date: string | null;
  oil_type_id: string | null;
  manufacturer_id: string | null;
  model_id: string | null;
  maintenance_plan_template_id: string | null;
  created_at: string;
}

export interface OilType {
  id: string;
  name: string;
}

export interface ComponentManufacturer {
  id: string;
  name: string;
}

export interface ComponentModel {
  id: string;
  manufacturer_id: string;
  name: string;
}

export interface EquipmentSubComponent {
  id: string;
  equipment_id: string;
  component_type: string;
  serial_number: string;
  manufacturer_id: string | null;
  model_id: string | null;
  horimeter: number;
  use_equipment_hours: boolean;
  installation_date?: string | null;
}

export interface CylinderComponent {
  id: string;
  equipment_id: string;
  cylinder_number: number;
  component_type: string;
  horimeter_at_install: number;
}

export function useEquipmentStore() {
  const queryClient = useQueryClient();
  const tenantId = useTenantId();

  const equipments = useQuery({
    queryKey: ['equipments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('equipments').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as Equipment[];
    },
  });

  const oilTypes = useQuery({
    queryKey: ['oil_types'],
    queryFn: async () => {
      const { data, error } = await supabase.from('oil_types').select('*').order('name');
      if (error) throw error;
      return data as OilType[];
    },
  });

  const componentManufacturers = useQuery({
    queryKey: ['component_manufacturers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('component_manufacturers').select('*').order('name');
      if (error) throw error;
      return data as ComponentManufacturer[];
    },
  });

  const componentModels = useQuery({
    queryKey: ['component_models'],
    queryFn: async () => {
      const { data, error } = await supabase.from('component_models').select('*').order('name');
      if (error) throw error;
      return data as ComponentModel[];
    },
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['equipments'] });
    queryClient.invalidateQueries({ queryKey: ['component_manufacturers'] });
    queryClient.invalidateQueries({ queryKey: ['component_models'] });
    queryClient.invalidateQueries({ queryKey: ['oil_types'] });
  };

  const addEquipment = useMutation({
    mutationFn: async (data: {
      equipment: Omit<Equipment, 'id' | 'created_at'>;
      subComponents: Array<Omit<EquipmentSubComponent, 'id' | 'equipment_id'>>;
    }) => {
      const { data: eq, error: eqErr } = await supabase
        .from('equipments')
        .insert({
          name: data.equipment.name,
          equipment_type: data.equipment.equipment_type,
          serial_number: data.equipment.serial_number,
          total_horimeter: data.equipment.total_horimeter,
          total_starts: data.equipment.total_starts,
          cylinders: data.equipment.cylinders,
          fuel_type: data.equipment.fuel_type,
          installation_date: data.equipment.installation_date,
          oil_type_id: data.equipment.oil_type_id,
          manufacturer_id: data.equipment.manufacturer_id,
          model_id: data.equipment.model_id,
          tenant_id: tenantId,
        })
        .select()
        .single();
      if (eqErr) throw eqErr;

      const equipmentId = eq.id;

      if (data.subComponents.length > 0) {
        const subs = data.subComponents.map(sc => ({
          equipment_id: equipmentId,
          component_type: sc.component_type,
          serial_number: sc.serial_number,
          manufacturer_id: sc.manufacturer_id || null,
          model_id: sc.model_id || null,
          horimeter: sc.horimeter,
          use_equipment_hours: sc.use_equipment_hours,
          tenant_id: tenantId,
        }));
        const { error: subErr } = await supabase.from('equipment_sub_components').insert(subs);
        if (subErr) throw subErr;
      }

      const cylinders = data.equipment.cylinders;
      if (cylinders > 0 && data.equipment.equipment_type !== 'outro') {
        const cylinderRows: Array<{
          equipment_id: string; cylinder_number: number; component_type: string; horimeter_at_install: number; tenant_id: string | null;
        }> = [];
        for (let i = 1; i <= cylinders; i++) {
          ['spark_plug', 'liner', 'piston', 'connecting_rod', 'bearing'].forEach(type => {
            cylinderRows.push({ equipment_id: equipmentId, cylinder_number: i, component_type: type, horimeter_at_install: data.equipment.total_horimeter, tenant_id: tenantId });
          });
        }
        const { error: cylErr } = await supabase.from('cylinder_components').insert(cylinderRows);
        if (cylErr) throw cylErr;
      }

      return eq;
    },
    onSuccess: () => invalidateAll(),
  });

  const updateEquipment = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<Omit<Equipment, 'id' | 'created_at'>> }) => {
      const { data: eq, error } = await supabase.from('equipments').update(data.updates).eq('id', data.id).select().single();
      if (error) throw error;
      return eq;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['equipments'] }),
  });

  const deleteEquipment = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('component_maintenance_plans').delete().eq('equipment_id', id);
      await supabase.from('cylinder_components').delete().eq('equipment_id', id);
      await supabase.from('equipment_sub_components').delete().eq('equipment_id', id);
      const { error } = await supabase.from('equipments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['equipments'] }),
  });

  const addOilType = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase.from('oil_types').insert({ name, tenant_id: tenantId }).select().single();
      if (error) throw error;
      return data as OilType;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['oil_types'] }),
  });

  const addComponentManufacturer = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase.from('component_manufacturers').insert({ name, tenant_id: tenantId }).select().single();
      if (error) throw error;
      return data as ComponentManufacturer;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['component_manufacturers'] }),
  });

  const addComponentModel = useMutation({
    mutationFn: async (params: { manufacturer_id: string; name: string }) => {
      const { data, error } = await supabase.from('component_models').insert({ ...params, tenant_id: tenantId }).select().single();
      if (error) throw error;
      return data as ComponentModel;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['component_models'] }),
  });

  return {
    equipments, oilTypes, componentManufacturers, componentModels,
    addEquipment, updateEquipment, deleteEquipment,
    addOilType, addComponentManufacturer, addComponentModel,
  };
}
