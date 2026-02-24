import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useInventoryStore, Manufacturer, ManufacturerModel } from '@/hooks/useInventoryStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  // Model state
  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<ManufacturerModel | null>(null);
  const [modelName, setModelName] = useState('');
  const [modelMfrId, setModelMfrId] = useState('');
  const [deleteModelId, setDeleteModelId] = useState<string | null>(null);

  // Expanded manufacturers
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Manufacturer handlers
  const openNewMfr = () => { setEditingMfr(null); setMfrName(''); setDialogOpen(true); };
  const openEditMfr = (m: Manufacturer) => { setEditingMfr(m); setMfrName(m.name); setDialogOpen(true); };
  const saveMfr = () => {
    if (!mfrName.trim()) return;
    if (editingMfr) store.updateManufacturer(editingMfr.id, mfrName.trim());
    else store.addManufacturer(mfrName.trim());
    setDialogOpen(false);
  };
  const confirmDeleteMfr = () => { if (deleteId) { store.deleteManufacturer(deleteId); setDeleteId(null); } };

  // Model handlers
  const openNewModel = (mfrId: string) => { setEditingModel(null); setModelName(''); setModelMfrId(mfrId); setModelDialogOpen(true); };
  const openEditModel = (m: ManufacturerModel) => { setEditingModel(m); setModelName(m.name); setModelMfrId(m.manufacturerId); setModelDialogOpen(true); };
  const saveModel = () => {
    if (!modelName.trim()) return;
    if (editingModel) store.updateModel(editingModel.id, modelName.trim());
    else store.addModel(modelMfrId, modelName.trim());
    setModelDialogOpen(false);
  };
  const confirmDeleteModel = () => { if (deleteModelId) { store.deleteModel(deleteModelId); setDeleteModelId(null); } };

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

        <div className="space-y-3">
          {store.manufacturers.map(mfr => {
            const mfrModels = store.models.filter(m => m.manufacturerId === mfr.id);
            const isExpanded = expanded.has(mfr.id);
            return (
              <Card key={mfr.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <button
                      className="flex items-center gap-3 text-left flex-1"
                      onClick={() => toggleExpand(mfr.id)}
                    >
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      <Factory className="h-5 w-5 text-primary" />
                      <span className="font-semibold">{mfr.name}</span>
                      <Badge variant="secondary" className="ml-2">{mfrModels.length} modelo(s)</Badge>
                    </button>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEditMfr(mfr)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeleteId(mfr.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 ml-8 space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-muted-foreground">Modelos</span>
                        <Button size="sm" variant="outline" onClick={() => openNewModel(mfr.id)}>
                          <Plus className="h-3 w-3 mr-1" /> Modelo
                        </Button>
                      </div>
                      {mfrModels.length === 0 && (
                        <p className="text-sm text-muted-foreground italic">Nenhum modelo cadastrado.</p>
                      )}
                      {mfrModels.map(model => (
                        <div key={model.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                          <span className="text-sm">{model.name}</span>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditModel(model)}><Pencil className="h-3 w-3" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDeleteModelId(model.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {store.manufacturers.length === 0 && (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhum fabricante cadastrado.</CardContent></Card>
          )}
        </div>
      </div>

      {/* Manufacturer Dialog */}
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

      {/* Model Dialog */}
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

      {/* Delete Manufacturer Confirm */}
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

      {/* Delete Model Confirm */}
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
