import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useInventoryStore, InventoryItemDisplay } from '@/hooks/useInventoryStore';
import { InventoryFormDialog } from '@/components/inventory/InventoryFormDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, Plus, Pencil, Trash2 } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function InventoryPage() {
  const store = useInventoryStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItemDisplay | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleNew = () => { setEditingItem(null); setFormOpen(true); };
  const handleEdit = (item: InventoryItemDisplay) => { setEditingItem(item); setFormOpen(true); };
  const handleSave = (data: any) => {
    if (editingItem) store.updateItem.mutate({ id: editingItem.id, ...data });
    else store.addItem.mutate(data);
  };
  const confirmDelete = () => { if (deleteId) { store.deleteItem.mutate(deleteId); setDeleteId(null); } };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Estoque de Peças</h1>
            <p className="text-sm text-muted-foreground mt-1">Catálogo de peças e controle de quantidades</p>
          </div>
          <Button onClick={handleNew}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Item
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Peça</TableHead>
                  <TableHead>Fabricante</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Part Number</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {store.items.map(item => {
                  const isLow = item.quantity <= item.min_stock;
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">{item.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{item.manufacturer_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.model_name || '—'}</TableCell>
                      <TableCell className="font-mono text-sm">{item.part_number}</TableCell>
                      <TableCell>
                        <Badge variant={isLow ? 'destructive' : 'secondary'} className="font-mono">
                          {item.quantity} {isLow && `(mín: ${item.min_stock})`}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.location_name}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => handleEdit(item)}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => setDeleteId(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {store.items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum item cadastrado. Clique em "Novo Item" para começar.
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
        manufacturers={store.manufacturers}
        models={store.models}
        locations={store.locations}
        onSave={handleSave}
        onAddManufacturer={store.addManufacturer}
        onAddLocation={store.addLocation}
        onAddModel={store.addModel}
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
    </AppLayout>
  );
}
