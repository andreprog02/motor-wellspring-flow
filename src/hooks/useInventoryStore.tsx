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

export const APLICACAO_OPTIONS = ['Mecânica', 'Elétrica'] as const;
export type Aplicacao = typeof APLICACAO_OPTIONS[number];

export const TIPO_OPTIONS = [
  'Arruela', 'Cabo', 'Compensador', 'Equipamento', 'Ferramenta', 'Filtro',
  'Insumos', 'Junta', 'Mangueira', 'O-ring', 'Outros', 'Parafuso',
  'Peça', 'Porca', 'Sensor', 'Válvula',
] as const;
export type Tipo = typeof TIPO_OPTIONS[number];

export const GERADOR_OPTIONS = ['Série 3', 'Série 03', 'Outros', ''] as const;
export type Gerador = typeof GERADOR_OPTIONS[number];

export interface InventoryItemRow {
  id: string;
  part_number: string;
  name: string;
  aplicacao: string;
  tipo: string;
  gerador: string;
  quantity: number;
  location_id: string;
}

export interface InventoryItemDisplay extends InventoryItemRow {
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
        .select('*, locations(name)')
        .order('name');
      if (error) throw error;
      return (data as any[]).map((row: any) => ({
        id: row.id,
        part_number: row.part_number,
        name: row.name,
        aplicacao: row.aplicacao ?? '',
        tipo: row.tipo ?? '',
        gerador: row.gerador ?? '',
        quantity: row.quantity,
        location_id: row.location_id,
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
      const { error } = await (supabase as any).from('inventory_items').insert({
        part_number: item.part_number,
        name: item.name,
        aplicacao: item.aplicacao,
        tipo: item.tipo,
        gerador: item.gerador,
        quantity: item.quantity,
        location_id: item.location_id,
        category: item.tipo,
        min_stock: 0,
        manufacturer_id: null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory_items'] }),
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...data }: Partial<InventoryItemRow> & { id: string }) => {
      const updateData: any = { ...data };
      if (data.tipo) updateData.category = data.tipo;
      const { error } = await (supabase as any).from('inventory_items').update(updateData).eq('id', id);
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
