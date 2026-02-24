import { useState, useCallback, createContext, useContext, ReactNode } from 'react';
import { InventoryItem } from '@/types/models';
import { inventoryItems as initialItems } from '@/data/mockData';

export interface Manufacturer {
  id: string;
  name: string;
}

export interface ManufacturerModel {
  id: string;
  manufacturerId: string;
  name: string;
}

export interface Location {
  id: string;
  name: string;
}

function extractManufacturers(items: InventoryItem[]): Manufacturer[] {
  const unique = [...new Set(items.map(i => i.manufacturer))];
  return unique.map((name, idx) => ({ id: `mfr-${idx + 1}`, name }));
}

function extractLocations(items: InventoryItem[]): Location[] {
  const unique = [...new Set(items.map(i => i.location))];
  return unique.map((name, idx) => ({ id: `loc-${idx + 1}`, name }));
}

const defaultModels: ManufacturerModel[] = [
  { id: 'mod-1', manufacturerId: 'mfr-1', name: 'C32 ACERT' },
  { id: 'mod-2', manufacturerId: 'mfr-1', name: 'C18' },
  { id: 'mod-3', manufacturerId: 'mfr-2', name: 'QSK60' },
  { id: 'mod-4', manufacturerId: 'mfr-3', name: 'S400SX-71' },
];

interface InventoryStore {
  items: InventoryItem[];
  manufacturers: Manufacturer[];
  models: ManufacturerModel[];
  locations: Location[];
  addItem: (item: Omit<InventoryItem, 'id'>) => void;
  updateItem: (id: string, data: Partial<InventoryItem>) => void;
  deleteItem: (id: string) => void;
  addManufacturer: (name: string) => Manufacturer;
  updateManufacturer: (id: string, name: string) => void;
  deleteManufacturer: (id: string) => void;
  addModel: (manufacturerId: string, name: string) => ManufacturerModel;
  updateModel: (id: string, name: string) => void;
  deleteModel: (id: string) => void;
  addLocation: (name: string) => Location;
  updateLocation: (id: string, name: string) => void;
  deleteLocation: (id: string) => void;
}

const InventoryContext = createContext<InventoryStore | null>(null);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<InventoryItem[]>(initialItems);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>(extractManufacturers(initialItems));
  const [models, setModels] = useState<ManufacturerModel[]>(defaultModels);
  const [locations, setLocations] = useState<Location[]>(extractLocations(initialItems));

  // Items
  const addItem = useCallback((item: Omit<InventoryItem, 'id'>) => {
    setItems(prev => [...prev, { ...item, id: `inv-${Date.now()}` }]);
  }, []);
  const updateItem = useCallback((id: string, data: Partial<InventoryItem>) => {
    setItems(prev => prev.map(i => (i.id === id ? { ...i, ...data } : i)));
  }, []);
  const deleteItem = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  // Manufacturers
  const addManufacturer = useCallback((name: string) => {
    const m: Manufacturer = { id: `mfr-${Date.now()}`, name };
    setManufacturers(prev => [...prev, m]);
    return m;
  }, []);
  const updateManufacturer = useCallback((id: string, name: string) => {
    setManufacturers(prev => prev.map(m => (m.id === id ? { ...m, name } : m)));
  }, []);
  const deleteManufacturer = useCallback((id: string) => {
    setManufacturers(prev => prev.filter(m => m.id !== id));
    setModels(prev => prev.filter(m => m.manufacturerId !== id));
  }, []);

  // Models
  const addModel = useCallback((manufacturerId: string, name: string) => {
    const m: ManufacturerModel = { id: `mod-${Date.now()}`, manufacturerId, name };
    setModels(prev => [...prev, m]);
    return m;
  }, []);
  const updateModel = useCallback((id: string, name: string) => {
    setModels(prev => prev.map(m => (m.id === id ? { ...m, name } : m)));
  }, []);
  const deleteModel = useCallback((id: string) => {
    setModels(prev => prev.filter(m => m.id !== id));
  }, []);

  // Locations
  const addLocation = useCallback((name: string) => {
    const l: Location = { id: `loc-${Date.now()}`, name };
    setLocations(prev => [...prev, l]);
    return l;
  }, []);
  const updateLocation = useCallback((id: string, name: string) => {
    setLocations(prev => prev.map(l => (l.id === id ? { ...l, name } : l)));
  }, []);
  const deleteLocation = useCallback((id: string) => {
    setLocations(prev => prev.filter(l => l.id !== id));
  }, []);

  return (
    <InventoryContext.Provider value={{
      items, manufacturers, models, locations,
      addItem, updateItem, deleteItem,
      addManufacturer, updateManufacturer, deleteManufacturer,
      addModel, updateModel, deleteModel,
      addLocation, updateLocation, deleteLocation,
    }}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventoryStore() {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error('useInventoryStore must be used within InventoryProvider');
  return ctx;
}
