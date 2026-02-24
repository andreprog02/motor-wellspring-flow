import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Manufacturer {
  id: string;
  name: string;
}

export interface ManufacturerModel {
  id: string;
  manufacturer_id: string;
  name: string;
}

export interface Location {
  id: string;
  name: string;
}

export interface InventoryItemRow {
  id: string;
  name: string;
  manufacturer_id: string;
  model_id: string | null;
  part_number: string;
  quantity: number;
  min_stock: number;
  location_id: string;
}

export interface InventoryItemDisplay extends InventoryItemRow {
  manufacturer_name: string;
  model_name: string | null;
  location_name: string;
}

export function useInventoryStore() {
  const qc = useQueryClient();

  const { data: manufacturers = [] } = useQuery({
    queryKey: ['manufacturers'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('manufacturers').select('*').order('name');
      if (error) throw error;
      return data as Manufacturer[];
    },
  });

  const { data: models = [] } = useQuery({
    queryKey: ['manufacturer_models'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('manufacturer_models').select('*').order('name');
      if (error) throw error;
      return data as ManufacturerModel[];
    },
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('locations').select('*').order('name');
      if (error) throw error;
      return data as Location[];
    },
  });

  const { data: items = [] } = useQuery({
    queryKey: ['inventory_items'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('inventory_items')
        .select('*, manufacturers(name), manufacturer_models(name), locations(name)')
        .order('name');
      if (error) throw error;
      return (data as any[]).map((row: any) => ({
        id: row.id,
        name: row.name,
        manufacturer_id: row.manufacturer_id,
        model_id: row.model_id,
        part_number: row.part_number,
        quantity: row.quantity,
        min_stock: row.min_stock,
        location_id: row.location_id,
        manufacturer_name: row.manufacturers?.name ?? '',
        model_name: row.manufacturer_models?.name ?? null,
        location_name: row.locations?.name ?? '',
      })) as InventoryItemDisplay[];
    },
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['manufacturers'] });
    qc.invalidateQueries({ queryKey: ['manufacturer_models'] });
    qc.invalidateQueries({ queryKey: ['locations'] });
    qc.invalidateQueries({ queryKey: ['inventory_items'] });
  };

  // Manufacturers
  const addManufacturer = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await (supabase as any).from('manufacturers').insert({ name }).select().single();
      if (error) throw error;
      return data as Manufacturer;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['manufacturers'] }),
  });

  const updateManufacturer = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await (supabase as any).from('manufacturers').update({ name }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(),
  });

  const deleteManufacturer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('manufacturers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(),
  });

  // Models
  const addModel = useMutation({
    mutationFn: async ({ manufacturer_id, name }: { manufacturer_id: string; name: string }) => {
      const { data, error } = await (supabase as any).from('manufacturer_models').insert({ manufacturer_id, name }).select().single();
      if (error) throw error;
      return data as ManufacturerModel;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['manufacturer_models'] }),
  });

  const updateModel = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await (supabase as any).from('manufacturer_models').update({ name }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['manufacturer_models'] }),
  });

  const deleteModel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('manufacturer_models').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['manufacturer_models'] }),
  });

  // Locations
  const addLocation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await (supabase as any).from('locations').insert({ name }).select().single();
      if (error) throw error;
      return data as Location;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['locations'] }),
  });

  const updateLocation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await (supabase as any).from('locations').update({ name }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(),
  });

  const deleteLocation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('locations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(),
  });

  // Inventory items
  const addItem = useMutation({
    mutationFn: async (item: Omit<InventoryItemRow, 'id'>) => {
      const { error } = await (supabase as any).from('inventory_items').insert(item);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory_items'] }),
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...data }: Partial<InventoryItemRow> & { id: string }) => {
      const { error } = await (supabase as any).from('inventory_items').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory_items'] }),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('inventory_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory_items'] }),
  });

  return {
    items, manufacturers, models, locations,
    addItem, updateItem, deleteItem,
    addManufacturer, updateManufacturer, deleteManufacturer,
    addModel, updateModel, deleteModel,
    addLocation, updateLocation, deleteLocation,
  };
}
