import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useInventoryStore, InventoryItemDisplay } from '@/hooks/useInventoryStore';
import { InventoryFormDialog } from '@/components/inventory/InventoryFormDialog';
import { InventoryExportMenu } from '@/components/inventory/InventoryExportMenu';
import { LocationsDialog } from '@/components/inventory/LocationsDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, Plus, Pencil, Trash2, MapPin, Search, ArrowUpDown } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type SortField = 'part_number' | 'name' | 'aplicacao' | 'tipo' | 'gerador' | 'quantity' | 'location_name';
const sortOptions: { value: SortField; label: string }[] = [
  { value: 'part_number', label: 'Código' },
  { value: 'name', label: 'Nome' },
  { value: 'aplicacao', label: 'Aplicação' },
  { value: 'tipo', label: 'Tipo' },
  { value: 'gerador', label: 'Gerador' },
  { value: 'quantity', label: 'Quantidade' },
  { value: 'location_name', label: 'Local' },
];

export default function InventoryPage() {
  const store = useInventoryStore();
  const [formOpen, setFormOpen] = useState(false);
  const [locationsOpen, setLocationsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItemDisplay | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleNew = () => { setEditingItem(null); setFormOpen(true); };
  const handleEdit = (item: InventoryItemDisplay) => { setEditingItem(item); setFormOpen(true); };
  const handleSave = (data: any) => {
    if (editingItem) store.updateItem.mutate({ id: editingItem.id, ...data });
    else store.addItem.mutate(data);
  };
  const confirmDelete = () => { if (deleteId) { store.deleteItem.mutate(deleteId); setDeleteId(null); } };

  const filteredItems = useMemo(() => {
    let items = store.items;

    // Filter
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(i =>
        i.name.toLowerCase().includes(q) ||
        i.part_number.toLowerCase().includes(q)
      );
    }

    // Sort
    const dir = sortDir === 'asc' ? 1 : -1;
    items = [...items].sort((a, b) => {
      const av = (a as any)[sortBy] ?? '';
      const bv = (b as any)[sortBy] ?? '';
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv), 'pt-BR', { numeric: true }) * dir;
    });

    return items;
  }, [store.items, search, sortBy, sortDir]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Estoque de Peças</h1>
            <p className="text-sm text-muted-foreground mt-1">Inventário completo de peças e equipamentos</p>
          </div>
          <div className="flex gap-2">
            <InventoryExportMenu items={filteredItems} />
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
          {search && (
            <span className="text-xs text-muted-foreground">{filteredItems.length} resultado(s)</span>
          )}
        </div>

        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Aplicação</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Gerador</TableHead>
                  <TableHead>Qtd</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-sm">{item.part_number}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium text-sm">{item.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{item.aplicacao}</TableCell>
                    <TableCell className="text-sm">{item.tipo}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.gerador || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono">{item.quantity}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.location_name}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(item)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteId(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {search ? 'Nenhum item encontrado.' : 'Nenhum item cadastrado. Clique em "Novo Item" para começar.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
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