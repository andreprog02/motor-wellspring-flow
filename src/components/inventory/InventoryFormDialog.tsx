import { useState, useEffect } from 'react';
import { Manufacturer, ManufacturerModel, Location, InventoryItemRow, InventoryItemDisplay } from '@/hooks/useInventoryStore';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { UseMutationResult } from '@tanstack/react-query';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: InventoryItemDisplay | null;
  manufacturers: Manufacturer[];
  models: ManufacturerModel[];
  locations: Location[];
  onSave: (data: Omit<InventoryItemRow, 'id'>) => void;
  onAddManufacturer: UseMutationResult<Manufacturer, Error, string>;
  onAddLocation: UseMutationResult<Location, Error, string>;
  onAddModel: UseMutationResult<ManufacturerModel, Error, { manufacturer_id: string; name: string }>;
}

interface FormState {
  name: string;
  manufacturer_id: string;
  model_id: string;
  part_number: string;
  quantity: number;
  location_id: string;
  min_stock: number;
}

const emptyForm: FormState = {
  name: '',
  manufacturer_id: '',
  model_id: '',
  part_number: '',
  quantity: 0,
  location_id: '',
  min_stock: 1,
};

export function InventoryFormDialog({
  open, onOpenChange, item, manufacturers, models, locations, onSave, onAddManufacturer, onAddLocation, onAddModel,
}: Props) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [newMfr, setNewMfr] = useState('');
  const [showNewMfr, setShowNewMfr] = useState(false);
  const [newLoc, setNewLoc] = useState('');
  const [showNewLoc, setShowNewLoc] = useState(false);
  const [newModel, setNewModel] = useState('');
  const [showNewModel, setShowNewModel] = useState(false);

  useEffect(() => {
    if (item) {
      setForm({
        name: item.name,
        manufacturer_id: item.manufacturer_id,
        model_id: item.model_id || '',
        part_number: item.part_number,
        quantity: item.quantity,
        location_id: item.location_id,
        min_stock: item.min_stock,
      });
    } else {
      setForm(emptyForm);
    }
    setShowNewMfr(false);
    setShowNewLoc(false);
    setShowNewModel(false);
  }, [item, open]);

  const filteredModels = form.manufacturer_id ? models.filter(m => m.manufacturer_id === form.manufacturer_id) : [];

  const handleSave = () => {
    if (!form.name || !form.manufacturer_id || !form.location_id) return;
    onSave({
      name: form.name,
      manufacturer_id: form.manufacturer_id,
      model_id: form.model_id || null,
      part_number: form.part_number,
      quantity: form.quantity,
      location_id: form.location_id,
      min_stock: form.min_stock,
    });
    onOpenChange(false);
  };

  const handleAddMfr = async () => {
    if (!newMfr.trim()) return;
    const m = await onAddManufacturer.mutateAsync(newMfr.trim());
    setForm(f => ({ ...f, manufacturer_id: m.id, model_id: '' }));
    setNewMfr('');
    setShowNewMfr(false);
  };

  const handleAddLoc = async () => {
    if (!newLoc.trim()) return;
    const l = await onAddLocation.mutateAsync(newLoc.trim());
    setForm(f => ({ ...f, location_id: l.id }));
    setNewLoc('');
    setShowNewLoc(false);
  };

  const handleAddModel = async () => {
    if (!newModel.trim() || !form.manufacturer_id) return;
    const m = await onAddModel.mutateAsync({ manufacturer_id: form.manufacturer_id, name: newModel.trim() });
    setForm(f => ({ ...f, model_id: m.id }));
    setNewModel('');
    setShowNewModel(false);
  };

  const isEdit = !!item;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Item' : 'Novo Item de Estoque'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Atualize os dados do item.' : 'Preencha os dados para adicionar um novo item ao estoque.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label>Nome da Peça</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Filtro de Óleo CAT" />
          </div>

          <div className="grid gap-1.5">
            <Label>Part Number</Label>
            <Input value={form.part_number} onChange={e => setForm(f => ({ ...f, part_number: e.target.value }))} placeholder="Ex: 1R-0751" className="font-mono" />
          </div>

          {/* Manufacturer */}
          <div className="grid gap-1.5">
            <Label>Fabricante</Label>
            {showNewMfr ? (
              <div className="flex gap-2">
                <Input value={newMfr} onChange={e => setNewMfr(e.target.value)} placeholder="Nome do fabricante" autoFocus />
                <Button size="sm" onClick={handleAddMfr} disabled={onAddManufacturer.isPending}>Salvar</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowNewMfr(false)}>Cancelar</Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Select value={form.manufacturer_id} onValueChange={v => setForm(f => ({ ...f, manufacturer_id: v, model_id: '' }))}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {manufacturers.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="icon" variant="outline" onClick={() => setShowNewMfr(true)} title="Adicionar fabricante">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Model (filtered by manufacturer) */}
          {form.manufacturer_id && (
            <div className="grid gap-1.5">
              <Label>Modelo</Label>
              {showNewModel ? (
                <div className="flex gap-2">
                  <Input value={newModel} onChange={e => setNewModel(e.target.value)} placeholder="Nome do modelo" autoFocus />
                  <Button size="sm" onClick={handleAddModel} disabled={onAddModel.isPending}>Salvar</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowNewModel(false)}>Cancelar</Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Select value={form.model_id || '_none'} onValueChange={v => setForm(f => ({ ...f, model_id: v === '_none' ? '' : v }))}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">— Nenhum —</SelectItem>
                      {filteredModels.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="icon" variant="outline" onClick={() => setShowNewModel(true)} title="Adicionar modelo">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Location */}
          <div className="grid gap-1.5">
            <Label>Local</Label>
            {showNewLoc ? (
              <div className="flex gap-2">
                <Input value={newLoc} onChange={e => setNewLoc(e.target.value)} placeholder="Nome do local" autoFocus />
                <Button size="sm" onClick={handleAddLoc} disabled={onAddLocation.isPending}>Salvar</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowNewLoc(false)}>Cancelar</Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Select value={form.location_id} onValueChange={v => setForm(f => ({ ...f, location_id: v }))}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {locations.map(l => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="icon" variant="outline" onClick={() => setShowNewLoc(true)} title="Adicionar local">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Quantidade</Label>
              <Input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))} />
            </div>
            <div className="grid gap-1.5">
              <Label>Estoque Mín.</Label>
              <Input type="number" value={form.min_stock} onChange={e => setForm(f => ({ ...f, min_stock: Number(e.target.value) }))} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!form.name || !form.manufacturer_id || !form.location_id}>
            {isEdit ? 'Salvar Alterações' : 'Adicionar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
