import { useState, useEffect } from 'react';
import { InventoryItem } from '@/types/models';
import { Manufacturer, ManufacturerModel, Location } from '@/hooks/useInventoryStore';
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

interface InventoryFormData extends Omit<InventoryItem, 'id'> {
  model?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: (InventoryItem & { model?: string }) | null;
  manufacturers: Manufacturer[];
  models: ManufacturerModel[];
  locations: Location[];
  onSave: (data: InventoryFormData) => void;
  onAddManufacturer: (name: string) => Manufacturer;
  onAddLocation: (name: string) => Location;
}

const emptyForm: InventoryFormData = {
  name: '',
  manufacturer: '',
  model: '',
  partNumber: '',
  estimatedLife: 500,
  quantity: 0,
  location: '',
  minStock: 1,
};

export function InventoryFormDialog({
  open, onOpenChange, item, manufacturers, models, locations, onSave, onAddManufacturer, onAddLocation,
}: Props) {
  const [form, setForm] = useState<InventoryFormData>(emptyForm);
  const [newMfr, setNewMfr] = useState('');
  const [showNewMfr, setShowNewMfr] = useState(false);
  const [newLoc, setNewLoc] = useState('');
  const [showNewLoc, setShowNewLoc] = useState(false);

  useEffect(() => {
    if (item) {
      setForm({
        name: item.name,
        manufacturer: item.manufacturer,
        model: item.model || '',
        partNumber: item.partNumber,
        estimatedLife: item.estimatedLife,
        quantity: item.quantity,
        location: item.location,
        minStock: item.minStock,
      });
    } else {
      setForm(emptyForm);
    }
    setShowNewMfr(false);
    setShowNewLoc(false);
  }, [item, open]);

  // Get selected manufacturer id to filter models
  const selectedMfr = manufacturers.find(m => m.name === form.manufacturer);
  const filteredModels = selectedMfr ? models.filter(m => m.manufacturerId === selectedMfr.id) : [];

  const handleSave = () => {
    if (!form.name || !form.manufacturer || !form.location) return;
    onSave(form);
    onOpenChange(false);
  };

  const handleAddMfr = () => {
    if (!newMfr.trim()) return;
    const m = onAddManufacturer(newMfr.trim());
    setForm(f => ({ ...f, manufacturer: m.name, model: '' }));
    setNewMfr('');
    setShowNewMfr(false);
  };

  const handleAddLoc = () => {
    if (!newLoc.trim()) return;
    const l = onAddLocation(newLoc.trim());
    setForm(f => ({ ...f, location: l.name }));
    setNewLoc('');
    setShowNewLoc(false);
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
            <Input value={form.partNumber} onChange={e => setForm(f => ({ ...f, partNumber: e.target.value }))} placeholder="Ex: 1R-0751" className="font-mono" />
          </div>

          {/* Manufacturer */}
          <div className="grid gap-1.5">
            <Label>Fabricante</Label>
            {showNewMfr ? (
              <div className="flex gap-2">
                <Input value={newMfr} onChange={e => setNewMfr(e.target.value)} placeholder="Nome do fabricante" autoFocus />
                <Button size="sm" onClick={handleAddMfr}>Salvar</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowNewMfr(false)}>Cancelar</Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Select value={form.manufacturer} onValueChange={v => setForm(f => ({ ...f, manufacturer: v, model: '' }))}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {manufacturers.map(m => (
                      <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
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
          {form.manufacturer && (
            <div className="grid gap-1.5">
              <Label>Modelo</Label>
              <Select value={form.model || ''} onValueChange={v => setForm(f => ({ ...f, model: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o modelo (opcional)" /></SelectTrigger>
                <SelectContent>
                  {filteredModels.length === 0 ? (
                    <SelectItem value="_none" disabled>Nenhum modelo cadastrado</SelectItem>
                  ) : (
                    filteredModels.map(m => (
                      <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Gerencie modelos na página de Fabricantes</p>
            </div>
          )}

          {/* Location */}
          <div className="grid gap-1.5">
            <Label>Local</Label>
            {showNewLoc ? (
              <div className="flex gap-2">
                <Input value={newLoc} onChange={e => setNewLoc(e.target.value)} placeholder="Nome do local" autoFocus />
                <Button size="sm" onClick={handleAddLoc}>Salvar</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowNewLoc(false)}>Cancelar</Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Select value={form.location} onValueChange={v => setForm(f => ({ ...f, location: v }))}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {locations.map(l => (
                      <SelectItem key={l.id} value={l.name}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="icon" variant="outline" onClick={() => setShowNewLoc(true)} title="Adicionar local">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label>Vida Útil (h)</Label>
              <Input type="number" value={form.estimatedLife} onChange={e => setForm(f => ({ ...f, estimatedLife: Number(e.target.value) }))} />
            </div>
            <div className="grid gap-1.5">
              <Label>Quantidade</Label>
              <Input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))} />
            </div>
            <div className="grid gap-1.5">
              <Label>Estoque Mín.</Label>
              <Input type="number" value={form.minStock} onChange={e => setForm(f => ({ ...f, minStock: Number(e.target.value) }))} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!form.name || !form.manufacturer || !form.location}>
            {isEdit ? 'Salvar Alterações' : 'Adicionar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
