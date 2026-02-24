import { useState, useCallback } from 'react';
import { InventoryItem } from '@/types/models';
import { inventoryItems as initialItems } from '@/data/mockData';

export interface Manufacturer {
  id: string;
  name: string;
}

export interface Location {
  id: string;
  name: string;
}

// Extract unique manufacturers and locations from initial data
function extractInitial<T extends { id: string; name: string }>(
  items: InventoryItem[],
  key: 'manufacturer' | 'location'
): T[] {
  const unique = [...new Set(items.map(i => i[key]))];
  return unique.map((name, idx) => ({ id: `${key}-${idx + 1}`, name })) as T[];
}

export function useInventoryStore() {
  const [items, setItems] = useState<InventoryItem[]>(initialItems);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>(
    extractInitial(initialItems, 'manufacturer')
  );
  const [locations, setLocations] = useState<Location[]>(
    extractInitial(initialItems, 'location')
  );

  const addItem = useCallback((item: Omit<InventoryItem, 'id'>) => {
    const newItem: InventoryItem = { ...item, id: `inv-${Date.now()}` };
    setItems(prev => [...prev, newItem]);
  }, []);

  const updateItem = useCallback((id: string, data: Partial<InventoryItem>) => {
    setItems(prev => prev.map(i => (i.id === id ? { ...i, ...data } : i)));
  }, []);

  const deleteItem = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const addManufacturer = useCallback((name: string) => {
    const m: Manufacturer = { id: `mfr-${Date.now()}`, name };
    setManufacturers(prev => [...prev, m]);
    return m;
  }, []);

  const addLocation = useCallback((name: string) => {
    const l: Location = { id: `loc-${Date.now()}`, name };
    setLocations(prev => [...prev, l]);
    return l;
  }, []);

  return { items, manufacturers, locations, addItem, updateItem, deleteItem, addManufacturer, addLocation };
}
