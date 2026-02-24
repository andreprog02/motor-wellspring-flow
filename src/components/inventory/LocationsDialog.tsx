import { useState } from 'react';
import { useInventoryStore, Location } from '@/hooks/useInventoryStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Plus, Pencil, Trash2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function LocationsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const store = useInventoryStore();
  const [editing, setEditing] = useState<Location | null>(null);
  const [name, setName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const startNew = () => { setEditing(null); setName(''); setIsAdding(true); };
  const startEdit = (l: Location) => { setEditing(l); setName(l.name); setIsAdding(true); };
  const cancel = () => { setIsAdding(false); setEditing(null); setName(''); };

  const save = () => {
    if (!name.trim()) return;
    if (editing) store.updateLocation.mutate({ id: editing.id, name: name.trim() });
    else store.addLocation.mutate(name.trim());
    cancel();
  };

  const confirmDelete = () => {
    if (deleteId) { store.deleteLocation.mutate(deleteId); setDeleteId(null); }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Locais de Armazenamento</DialogTitle>
            <DialogDescription>Gerencie os locais onde as peças são armazenadas.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 max-h-[400px] overflow-y-auto">
            {store.locations.map(loc => (
              <div key={loc.id} className="flex items-center justify-between rounded-md border px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{loc.name}</span>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(loc)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDeleteId(loc.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
            {store.locations.length === 0 && !isAdding && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum local cadastrado.</p>
            )}

            {isAdding ? (
              <div className="flex gap-2 items-end border rounded-md p-3">
                <div className="flex-1 grid gap-1.5">
                  <Label className="text-xs">{editing ? 'Editar local' : 'Novo local'}</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Almoxarifado Central" autoFocus />
                </div>
                <Button size="sm" onClick={save} disabled={!name.trim()}>Salvar</Button>
                <Button size="sm" variant="ghost" onClick={cancel}>Cancelar</Button>
              </div>
            ) : (
              <Button variant="outline" className="w-full" onClick={startNew}>
                <Plus className="h-4 w-4 mr-2" /> Novo Local
              </Button>
            )}
          </div>
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
    </>
  );
}
