import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useInventoryStore, InventoryItemDisplay } from '@/hooks/useInventoryStore';
import { InventoryFormDialog } from '@/components/inventory/InventoryFormDialog';
import { InventoryExportMenu } from '@/components/inventory/InventoryExportMenu';
import { InventoryTable } from '@/components/inventory/InventoryTable';
import { LocationsDialog } from '@/components/inventory/LocationsDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, Plus, MapPin, Search, ArrowUpDown, Wrench } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type SortField = 'codigo' | 'codigo_alt_01' | 'codigo_alt_02' | 'part_number' | 'name' | 'aplicacao' | 'tipo' | 'gerador' | 'quantity' | 'location_name';
const sortOptions: { value: SortField; label: string }[] = [
  { value: 'codigo', label: 'Código' },
  { value: 'codigo_alt_01', label: 'Cód. Alt. 01' },
  { value: 'codigo_alt_02', label: 'Cód. Alt. 02' },
  { value: 'part_number', label: 'Part Number' },
  { value: 'name', label: 'Nome' },
  { value: 'aplicacao', label: 'Aplicação' },
  { value: 'tipo', label: 'Tipo' },
  { value: 'gerador', label: 'Gerador' },
  { value: 'quantity', label: 'Quantidade' },
  { value: 'location_name', label: 'Local' },
];

function sortAndFilter(items: InventoryItemDisplay[], search: string, sortBy: SortField, sortDir: 'asc' | 'desc', filterLocation: string) {
  let result = items;

  if (filterLocation && filterLocation !== 'all') {
    result = result.filter(i => i.location_id === filterLocation);
  }

  if (search.trim()) {
    const q = search.toLowerCase();
    result = result.filter(i =>
      i.name.toLowerCase().includes(q) ||
      i.part_number.toLowerCase().includes(q) ||
      (i.codigo && i.codigo.toLowerCase().includes(q))
    );
  }

  const dir = sortDir === 'asc' ? 1 : -1;
  result = [...result].sort((a, b) => {
    const av = (a as any)[sortBy] ?? '';
    const bv = (b as any)[sortBy] ?? '';
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
    return String(av).localeCompare(String(bv), 'pt-BR', { numeric: true }) * dir;
  });

  return result;
}

export default function InventoryPage() {
  const store = useInventoryStore();
  const [formOpen, setFormOpen] = useState(false);
  const [locationsOpen, setLocationsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItemDisplay | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [filterLocation, setFilterLocation] = useState<string>('all');

  const handleNew = () => { setEditingItem(null); setFormOpen(true); };
  const handleEdit = (item: InventoryItemDisplay) => { setEditingItem(item); setFormOpen(true); };
  const handleSave = (data: any) => {
    if (editingItem) store.updateItem.mutate({ id: editingItem.id, ...data });
    else store.addItem.mutate(data);
  };
  const confirmDelete = () => { if (deleteId) { store.deleteItem.mutate(deleteId); setDeleteId(null); } };

  const estoqueItems = useMemo(() => {
    const nonTools = store.items.filter(i => i.tipo !== 'Ferramenta');
    return sortAndFilter(nonTools, search, sortBy, sortDir, filterLocation);
  }, [store.items, search, sortBy, sortDir, filterLocation]);

  const ferramentaItems = useMemo(() => {
    const tools = store.items.filter(i => i.tipo === 'Ferramenta');
    return sortAndFilter(tools, search, sortBy, sortDir, filterLocation);
  }, [store.items, search, sortBy, sortDir, filterLocation]);

  const allFiltered = useMemo(() => [...estoqueItems, ...ferramentaItems], [estoqueItems, ferramentaItems]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Estoque de Peças</h1>
            <p className="text-sm text-muted-foreground mt-1">Inventário completo de peças e equipamentos</p>
          </div>
          <div className="flex gap-2">
            <InventoryExportMenu items={allFiltered} />
            <Button variant="outline" onClick={() => setLocationsOpen(true)}>
              <MapPin className="h-4 w-4 mr-2" />
              Localização
            </Button>
            <Button onClick={handleNew}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Item
            </Button>
          </div>
        </div>

        {/* Search & Sort bar */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou código..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            <Select value={sortBy} onValueChange={v => setSortBy(v as SortField)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
              title={sortDir === 'asc' ? 'Crescente' : 'Decrescente'}
            >
              <span className="text-xs font-bold">{sortDir === 'asc' ? 'A→Z' : 'Z→A'}</span>
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <Select value={filterLocation} onValueChange={setFilterLocation}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Todos os locais" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os locais</SelectItem>
                {store.locations.map(loc => (
                  <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(search || filterLocation !== 'all') && (
            <span className="text-xs text-muted-foreground">{allFiltered.length} resultado(s)</span>
          )}
        </div>

        {/* Estoque de Peças */}
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <InventoryTable
              items={estoqueItems}
              onEdit={handleEdit}
              onDelete={id => setDeleteId(id)}
              emptyMessage={search ? 'Nenhum item encontrado.' : 'Nenhum item cadastrado. Clique em "Novo Item" para começar.'}
            />
          </CardContent>
        </Card>

        {/* Ferramentas */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Wrench className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-xl font-bold tracking-tight">Ferramentas</h2>
            <span className="text-sm text-muted-foreground">({ferramentaItems.length})</span>
          </div>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <InventoryTable
                items={ferramentaItems}
                onEdit={handleEdit}
                onDelete={id => setDeleteId(id)}
                showTipo={false}
                emptyMessage="Nenhuma ferramenta cadastrada."
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <InventoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        item={editingItem}
        locations={store.locations}
        onSave={handleSave}
        onAddLocation={store.addLocation}
      />

      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir este item do estoque?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <LocationsDialog open={locationsOpen} onOpenChange={setLocationsOpen} />
    </AppLayout>
  );
}
