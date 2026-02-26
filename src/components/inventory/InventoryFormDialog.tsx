import { useState, useEffect } from 'react';
import { Location, InventoryItemRow, InventoryItemDisplay, APLICACAO_OPTIONS, TIPO_OPTIONS, GERADOR_OPTIONS } from '@/hooks/useInventoryStore';
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
  locations: Location[];
  onSave: (data: Omit<InventoryItemRow, 'id'>) => void;
  onAddLocation: UseMutationResult<Location, Error, string>;
}

interface FormState {
  codigo: string;
  codigo_alt_01: string;
  codigo_alt_02: string;
  part_number: string;
  name: string;
  aplicacao: string;
  tipo: string;
  gerador: string;
  quantity: number;
  location_id: string;
}

const emptyForm: FormState = {
  codigo: '',
  codigo_alt_01: '',
  codigo_alt_02: '',
  part_number: '',
  name: '',
  aplicacao: 'Mecânica',
  tipo: 'Peça',
  gerador: '',
  quantity: 0,
  location_id: '',
};

export function InventoryFormDialog({
  open, onOpenChange, item, locations, onSave, onAddLocation,
}: Props) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [newLoc, setNewLoc] = useState('');
  const [showNewLoc, setShowNewLoc] = useState(false);

  useEffect(() => {
    if (item) {
      setForm({
        codigo: item.codigo || '',
        codigo_alt_01: item.codigo_alt_01 || '',
        codigo_alt_02: item.codigo_alt_02 || '',
        part_number: item.part_number,
        name: item.name,
        aplicacao: item.aplicacao || 'Mecânica',
        tipo: item.tipo || 'Peça',
        gerador: item.gerador || '',
        quantity: item.quantity,
        location_id: item.location_id,
      });
    } else {
      setForm(emptyForm);
    }
    setShowNewLoc(false);
  }, [item, open]);

  const handleSave = () => {
    if (!form.name || !form.location_id) return;
    onSave({
      codigo: form.codigo,
      codigo_alt_01: form.codigo_alt_01,
      codigo_alt_02: form.codigo_alt_02,
      part_number: form.part_number,
      name: form.name,
      aplicacao: form.aplicacao,
      tipo: form.tipo,
      gerador: form.gerador,
      quantity: form.quantity,
      location_id: form.location_id,
    });
    onOpenChange(false);
  };

  const handleAddLoc = async () => {
    if (!newLoc.trim()) return;
    const l = await onAddLocation.mutateAsync(newLoc.trim());
    setForm(f => ({ ...f, location_id: l.id }));
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
            <Label>Código</Label>
            <Input value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} placeholder="Ex: ABC-001" className="font-mono" />
          </div>

          <div className="grid gap-1.5">
            <Label>Código Alternativo 01</Label>
            <Input value={form.codigo_alt_01} onChange={e => setForm(f => ({ ...f, codigo_alt_01: e.target.value }))} placeholder="Ex: ALT-001" className="font-mono" />
          </div>

          <div className="grid gap-1.5">
            <Label>Código Alternativo 02</Label>
            <Input value={form.codigo_alt_02} onChange={e => setForm(f => ({ ...f, codigo_alt_02: e.target.value }))} placeholder="Ex: ALT-002" className="font-mono" />
          </div>

          <div className="grid gap-1.5">
            <Label>Part Number</Label>
            <Input value={form.part_number} onChange={e => setForm(f => ({ ...f, part_number: e.target.value }))} placeholder="Ex: 100012" className="font-mono" />
          </div>

          <div className="grid gap-1.5">
            <Label>Nome</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: O-ring verde pequeno" />
          </div>

          <div className="grid gap-1.5">
            <Label>Aplicação</Label>
            <Select value={form.aplicacao} onValueChange={v => setForm(f => ({ ...f, aplicacao: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {APLICACAO_OPTIONS.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label>Tipo</Label>
            <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {TIPO_OPTIONS.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label>Gerador</Label>
            <Select value={form.gerador || '_none'} onValueChange={v => setForm(f => ({ ...f, gerador: v === '_none' ? '' : v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">— Nenhum —</SelectItem>
                {GERADOR_OPTIONS.filter(g => g !== '').map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label>Quantidade</Label>
            <Input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))} />
          </div>

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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!form.name || !form.location_id}>
            {isEdit ? 'Salvar Alterações' : 'Adicionar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
