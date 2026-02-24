import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
        }));
        const { error: subErr } = await supabase.from('equipment_sub_components').insert(subs);
        if (subErr) throw subErr;
      }

      const cylinders = data.equipment.cylinders;
      if (cylinders > 0) {
        const cylinderRows: Array<{
          equipment_id: string; cylinder_number: number; component_type: string; horimeter_at_install: number;
        }> = [];
        for (let i = 1; i <= cylinders; i++) {
          ['spark_plug', 'liner', 'piston', 'connecting_rod', 'bearing'].forEach(type => {
            cylinderRows.push({ equipment_id: equipmentId, cylinder_number: i, component_type: type, horimeter_at_install: data.equipment.total_horimeter });
          });
        }
        const { error: cylErr } = await supabase.from('cylinder_components').insert(cylinderRows);
        if (cylErr) throw cylErr;

        const defaultPlans: Record<string, { task: string; interval: number }> = {
          spark_plug: { task: 'Substituição da vela', interval: 2000 },
          liner: { task: 'Inspeção da camisa', interval: 8000 },
          piston: { task: 'Inspeção do pistão', interval: 12000 },
          connecting_rod: { task: 'Inspeção da biela', interval: 15000 },
          bearing: { task: 'Inspeção da bronzina', interval: 15000 },
        };
        const planRows = cylinderRows.map(cr => ({
          equipment_id: equipmentId, component_type: cr.component_type,
          task: defaultPlans[cr.component_type].task, trigger_type: 'hours',
          interval_value: defaultPlans[cr.component_type].interval, last_execution_value: data.equipment.total_horimeter,
        }));
        const { error: planErr } = await supabase.from('component_maintenance_plans').insert(planRows);
        if (planErr) throw planErr;
      }

      const subPlanDefaults: Record<string, { task: string; interval: number }> = {
        turbine: { task: 'Inspeção da turbina', interval: 4000 },
        intercooler: { task: 'Inspeção do intercooler', interval: 6000 },
        oil_exchanger: { task: 'Inspeção do trocador de óleo', interval: 5000 },
      };
      if (data.subComponents.length > 0) {
        const subPlans = data.subComponents.map(sc => ({
          equipment_id: equipmentId, component_type: sc.component_type,
          task: subPlanDefaults[sc.component_type]?.task || 'Inspeção', trigger_type: 'hours',
          interval_value: subPlanDefaults[sc.component_type]?.interval || 5000,
          last_execution_value: sc.use_equipment_hours ? data.equipment.total_horimeter : sc.horimeter,
        }));
        const { error: spErr } = await supabase.from('component_maintenance_plans').insert(subPlans);
        if (spErr) throw spErr;
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
      // Delete related data first
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
      const { data, error } = await supabase.from('oil_types').insert({ name }).select().single();
      if (error) throw error;
      return data as OilType;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['oil_types'] }),
  });

  const addComponentManufacturer = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase.from('component_manufacturers').insert({ name }).select().single();
      if (error) throw error;
      return data as ComponentManufacturer;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['component_manufacturers'] }),
  });

  const addComponentModel = useMutation({
    mutationFn: async (params: { manufacturer_id: string; name: string }) => {
      const { data, error } = await supabase.from('component_models').insert(params).select().single();
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
