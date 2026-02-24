import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useInventoryStore, Location } from '@/hooks/useInventoryStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Pencil, Trash2, MapPin } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function LocationsPage() {
  const store = useInventoryStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);
  const [name, setName] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openNew = () => { setEditing(null); setName(''); setDialogOpen(true); };
  const openEdit = (l: Location) => { setEditing(l); setName(l.name); setDialogOpen(true); };
  const save = () => {
    if (!name.trim()) return;
    if (editing) store.updateLocation.mutate({ id: editing.id, name: name.trim() });
    else store.addLocation.mutate(name.trim());
    setDialogOpen(false);
  };
  const confirmDelete = () => { if (deleteId) { store.deleteLocation.mutate(deleteId); setDeleteId(null); } };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Locais de Estoque</h1>
            <p className="text-sm text-muted-foreground mt-1">Gerencie os locais de armazenamento de peças</p>
          </div>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Local
          </Button>
        </div>

        <div className="space-y-2">
          {store.locations.map(loc => (
            <Card key={loc.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-primary" />
                  <span className="font-medium">{loc.name}</span>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(loc)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => setDeleteId(loc.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {store.locations.length === 0 && (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhum local cadastrado.</CardContent></Card>
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Local' : 'Novo Local'}</DialogTitle>
            <DialogDescription>Informe o nome do local de armazenamento.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <Label>Nome</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Almoxarifado Central" autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={!name.trim()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir local</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir este local?</AlertDialogDescription>
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
