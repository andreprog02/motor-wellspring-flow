import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useInventoryStore, Manufacturer, ManufacturerModel } from '@/hooks/useInventoryStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Factory, ChevronDown, ChevronRight } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function ManufacturersPage() {
  const store = useInventoryStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMfr, setEditingMfr] = useState<Manufacturer | null>(null);
  const [mfrName, setMfrName] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<ManufacturerModel | null>(null);
  const [modelName, setModelName] = useState('');
  const [modelMfrId, setModelMfrId] = useState('');
  const [deleteModelId, setDeleteModelId] = useState<string | null>(null);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleExpand = (id: string) => {
    setExpanded(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const openNewMfr = () => { setEditingMfr(null); setMfrName(''); setDialogOpen(true); };
  const openEditMfr = (m: Manufacturer) => { setEditingMfr(m); setMfrName(m.name); setDialogOpen(true); };
  const saveMfr = () => {
    if (!mfrName.trim()) return;
    if (editingMfr) store.updateManufacturer.mutate({ id: editingMfr.id, name: mfrName.trim() });
    else store.addManufacturer.mutate(mfrName.trim());
    setDialogOpen(false);
  };
  const confirmDeleteMfr = () => { if (deleteId) { store.deleteManufacturer.mutate(deleteId); setDeleteId(null); } };

  const openNewModel = (mfrId: string) => { setEditingModel(null); setModelName(''); setModelMfrId(mfrId); setModelDialogOpen(true); };
  const openEditModel = (m: ManufacturerModel) => { setEditingModel(m); setModelName(m.name); setModelMfrId(m.manufacturer_id); setModelDialogOpen(true); };
  const saveModel = () => {
    if (!modelName.trim()) return;
    if (editingModel) store.updateModel.mutate({ id: editingModel.id, name: modelName.trim() });
    else store.addModel.mutate({ manufacturer_id: modelMfrId, name: modelName.trim() });
    setModelDialogOpen(false);
  };
  const confirmDeleteModel = () => { if (deleteModelId) { store.deleteModel.mutate(deleteModelId); setDeleteModelId(null); } };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Fabricantes & Modelos</h1>
            <p className="text-sm text-muted-foreground mt-1">Gerencie fabricantes e seus modelos de equipamento</p>
          </div>
          <Button onClick={openNewMfr}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Fabricante
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {store.manufacturers.map(mfr => {
            const mfrModels = store.models.filter(m => m.manufacturer_id === mfr.id);
            return (
              <Card key={mfr.id} className="group hover:shadow-md transition-shadow">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Factory className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold leading-tight">{mfr.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{mfrModels.length} modelo(s)</p>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditMfr(mfr)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setDeleteId(mfr.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Modelos</span>
                      <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => openNewModel(mfr.id)}>
                        <Plus className="h-3 w-3 mr-1" />Adicionar
                      </Button>
                    </div>
                    {mfrModels.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic py-2">Nenhum modelo cadastrado.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {mfrModels.map(model => (
                          <Badge
                            key={model.id}
                            variant="secondary"
                            className="group/model cursor-default pl-2.5 pr-1 py-1 gap-1"
                          >
                            <span className="text-xs">{model.name}</span>
                            <span className="inline-flex gap-0.5 opacity-0 group-hover/model:opacity-100 transition-opacity">
                              <button className="hover:text-primary" onClick={() => openEditModel(model)}><Pencil className="h-2.5 w-2.5" /></button>
                              <button className="hover:text-destructive" onClick={() => setDeleteModelId(model.id)}><Trash2 className="h-2.5 w-2.5" /></button>
                            </span>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        {store.manufacturers.length === 0 && (
          <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum fabricante cadastrado.</CardContent></Card>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingMfr ? 'Editar Fabricante' : 'Novo Fabricante'}</DialogTitle>
            <DialogDescription>Informe o nome do fabricante.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <Label>Nome</Label>
            <Input value={mfrName} onChange={e => setMfrName(e.target.value)} placeholder="Ex: Jenbacher" autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveMfr} disabled={!mfrName.trim()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modelDialogOpen} onOpenChange={setModelDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingModel ? 'Editar Modelo' : 'Novo Modelo'}</DialogTitle>
            <DialogDescription>Informe o nome do modelo de equipamento.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <Label>Nome do Modelo</Label>
            <Input value={modelName} onChange={e => setModelName(e.target.value)} placeholder="Ex: J620" autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModelDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveModel} disabled={!modelName.trim()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir fabricante</AlertDialogTitle>
            <AlertDialogDescription>Todos os modelos vinculados também serão removidos. Deseja continuar?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteMfr}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteModelId} onOpenChange={open => !open && setDeleteModelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir modelo</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir este modelo?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteModel}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
