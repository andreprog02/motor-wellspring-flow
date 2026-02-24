import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useEquipmentStore, EquipmentSubComponent } from '@/hooks/useEquipmentStore';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Plus, Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface BasicData {
  name: string;
  serial_number: string;
  total_horimeter: number;
  total_starts: number;
  cylinders: number;
  fuel_type: string;
}

interface SubComponentData {
  enabled: boolean;
  serial_number: string;
  manufacturer_id: string;
  model_id: string;
  horimeter: number;
  use_equipment_hours: boolean;
}

const STEPS = ['Dados Básicos', 'Turbina', 'Intercooler', 'Trocador de Óleo', 'Revisão'];

export function EquipmentWizard({ open, onOpenChange }: Props) {
  const { addEquipment, componentManufacturers, componentModels, addComponentManufacturer, addComponentModel } = useEquipmentStore();

  const [step, setStep] = useState(0);
  const [basic, setBasic] = useState<BasicData>({
    name: '', serial_number: '', total_horimeter: 0, total_starts: 0, cylinders: 0, fuel_type: 'biogas',
  });

  const emptySubComp = (): SubComponentData => ({
    enabled: false, serial_number: '', manufacturer_id: '', model_id: '', horimeter: 0, use_equipment_hours: true,
  });

  const [turbine, setTurbine] = useState<SubComponentData>(emptySubComp());
  const [intercooler, setIntercooler] = useState<SubComponentData>(emptySubComp());
  const [oilExchanger, setOilExchanger] = useState<SubComponentData>(emptySubComp());

  const [newManufName, setNewManufName] = useState('');
  const [newModelName, setNewModelName] = useState('');
  const [addingManuf, setAddingManuf] = useState(false);
  const [addingModel, setAddingModel] = useState(false);

  const manufacturers = componentManufacturers.data || [];
  const models = componentModels.data || [];

  const reset = () => {
    setStep(0);
    setBasic({ name: '', serial_number: '', total_horimeter: 0, total_starts: 0, cylinders: 0, fuel_type: 'biogas' });
    setTurbine(emptySubComp());
    setIntercooler(emptySubComp());
    setOilExchanger(emptySubComp());
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const handleAddManufacturer = async () => {
    if (!newManufName.trim()) return;
    setAddingManuf(true);
    try {
      const m = await addComponentManufacturer.mutateAsync(newManufName.trim());
      setTurbine(prev => ({ ...prev, manufacturer_id: m.id }));
      setNewManufName('');
    } catch { toast.error('Erro ao adicionar fabricante'); }
    setAddingManuf(false);
  };

  const handleAddModel = async () => {
    if (!newModelName.trim() || !turbine.manufacturer_id) return;
    setAddingModel(true);
    try {
      const m = await addComponentModel.mutateAsync({ manufacturer_id: turbine.manufacturer_id, name: newModelName.trim() });
      setTurbine(prev => ({ ...prev, model_id: m.id }));
      setNewModelName('');
    } catch { toast.error('Erro ao adicionar modelo'); }
    setAddingModel(false);
  };

  const handleSubmit = async () => {
    if (!basic.name.trim()) { toast.error('Nome é obrigatório'); return; }
    if (basic.cylinders <= 0) { toast.error('Número de cilindros deve ser > 0'); return; }

    const subComponents: Array<Omit<EquipmentSubComponent, 'id' | 'equipment_id'>> = [];
    if (turbine.enabled) {
      subComponents.push({
        component_type: 'turbine',
        serial_number: turbine.serial_number,
        manufacturer_id: turbine.manufacturer_id || null,
        model_id: turbine.model_id || null,
        horimeter: turbine.use_equipment_hours ? basic.total_horimeter : turbine.horimeter,
        use_equipment_hours: turbine.use_equipment_hours,
      });
    }
    if (intercooler.enabled) {
      subComponents.push({
        component_type: 'intercooler',
        serial_number: intercooler.serial_number,
        manufacturer_id: null,
        model_id: null,
        horimeter: intercooler.use_equipment_hours ? basic.total_horimeter : intercooler.horimeter,
        use_equipment_hours: intercooler.use_equipment_hours,
      });
    }
    if (oilExchanger.enabled) {
      subComponents.push({
        component_type: 'oil_exchanger',
        serial_number: oilExchanger.serial_number,
        manufacturer_id: null,
        model_id: null,
        horimeter: oilExchanger.use_equipment_hours ? basic.total_horimeter : oilExchanger.horimeter,
        use_equipment_hours: oilExchanger.use_equipment_hours,
      });
    }

    try {
      await addEquipment.mutateAsync({
        equipment: {
          name: basic.name,
          equipment_type: 'gerador',
          serial_number: basic.serial_number,
          total_horimeter: basic.total_horimeter,
          total_starts: basic.total_starts,
          cylinders: basic.cylinders,
          fuel_type: basic.fuel_type,
        },
        subComponents,
      });
      toast.success(`Equipamento "${basic.name}" cadastrado com sucesso! ${basic.cylinders * 3} componentes de cilindro criados.`);
      handleClose();
    } catch {
      toast.error('Erro ao cadastrar equipamento');
    }
  };

  const filteredModels = models.filter(m => m.manufacturer_id === turbine.manufacturer_id);

  const renderBasicStep = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label>Nome do Gerador *</Label>
          <Input value={basic.name} onChange={e => setBasic(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Gerador A1" />
        </div>
        <div>
          <Label>Número de Série</Label>
          <Input value={basic.serial_number} onChange={e => setBasic(p => ({ ...p, serial_number: e.target.value }))} />
        </div>
        <div>
          <Label>Combustível *</Label>
          <Select value={basic.fuel_type} onValueChange={v => setBasic(p => ({ ...p, fuel_type: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="biogas">Biogás</SelectItem>
              <SelectItem value="landfill_gas">Gás de Aterro</SelectItem>
              <SelectItem value="natural_gas">Gás Natural</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Horímetro (horas)</Label>
          <Input type="number" value={basic.total_horimeter} onChange={e => setBasic(p => ({ ...p, total_horimeter: Number(e.target.value) }))} />
        </div>
        <div>
          <Label>Arranques</Label>
          <Input type="number" value={basic.total_starts} onChange={e => setBasic(p => ({ ...p, total_starts: Number(e.target.value) }))} />
        </div>
        <div>
          <Label>Número de Cilindros *</Label>
          <Input type="number" value={basic.cylinders} onChange={e => setBasic(p => ({ ...p, cylinders: Number(e.target.value) }))} />
        </div>
      </div>
      {basic.cylinders > 0 && (
        <p className="text-xs text-muted-foreground">
          Serão criados automaticamente: {basic.cylinders} velas, {basic.cylinders} camisas e {basic.cylinders} pistões com planos de manutenção padrão.
        </p>
      )}
    </div>
  );

  const renderSubComponentStep = (
    label: string,
    data: SubComponentData,
    setData: React.Dispatch<React.SetStateAction<SubComponentData>>,
    showManufacturer: boolean,
  ) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Possui {label}?</Label>
        <Switch checked={data.enabled} onCheckedChange={v => setData(p => ({ ...p, enabled: v }))} />
      </div>
      {data.enabled && (
        <div className="space-y-4 border rounded-lg p-4">
          <div>
            <Label>Número de Série do {label}</Label>
            <Input value={data.serial_number} onChange={e => setData(p => ({ ...p, serial_number: e.target.value }))} />
          </div>

          {showManufacturer && (
            <>
              <div>
                <Label>Fabricante</Label>
                <div className="flex gap-2">
                  <Select value={data.manufacturer_id} onValueChange={v => setData(p => ({ ...p, manufacturer_id: v, model_id: '' }))}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {manufacturers.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-1">
                    <Input className="w-32" placeholder="Novo..." value={newManufName} onChange={e => setNewManufName(e.target.value)} />
                    <Button size="icon" variant="outline" onClick={handleAddManufacturer} disabled={addingManuf}>
                      {addingManuf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
              {data.manufacturer_id && (
                <div>
                  <Label>Modelo</Label>
                  <div className="flex gap-2">
                    <Select value={data.model_id} onValueChange={v => setData(p => ({ ...p, model_id: v }))}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {filteredModels.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-1">
                      <Input className="w-32" placeholder="Novo..." value={newModelName} onChange={e => setNewModelName(e.target.value)} />
                      <Button size="icon" variant="outline" onClick={handleAddModel} disabled={addingModel}>
                        {addingModel ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Utilizar horas do motor</Label>
              <Switch checked={data.use_equipment_hours} onCheckedChange={v => setData(p => ({ ...p, use_equipment_hours: v }))} />
            </div>
            {!data.use_equipment_hours && (
              <div>
                <Label>Horímetro do {label}</Label>
                <Input type="number" value={data.horimeter} onChange={e => setData(p => ({ ...p, horimeter: Number(e.target.value) }))} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const fuelLabels: Record<string, string> = { biogas: 'Biogás', landfill_gas: 'Gás de Aterro', natural_gas: 'Gás Natural' };

  const renderReviewStep = () => (
    <div className="space-y-4 text-sm">
      <div className="border rounded-lg p-4 space-y-2">
        <h4 className="font-semibold">Dados Básicos</h4>
        <div className="grid grid-cols-2 gap-2 text-muted-foreground">
          <span>Nome: <span className="text-foreground font-medium">{basic.name}</span></span>
          <span>Série: <span className="text-foreground font-medium">{basic.serial_number || '—'}</span></span>
          <span>Horímetro: <span className="text-foreground font-medium">{basic.total_horimeter}h</span></span>
          <span>Arranques: <span className="text-foreground font-medium">{basic.total_starts}</span></span>
          <span>Cilindros: <span className="text-foreground font-medium">{basic.cylinders}</span></span>
          <span>Combustível: <span className="text-foreground font-medium">{fuelLabels[basic.fuel_type]}</span></span>
        </div>
      </div>

      <div className="border rounded-lg p-4 space-y-1">
        <h4 className="font-semibold">Componentes</h4>
        <p className="text-muted-foreground">Turbina: {turbine.enabled ? `✅ S/N: ${turbine.serial_number || '—'}` : '❌ Não'}</p>
        <p className="text-muted-foreground">Intercooler: {intercooler.enabled ? `✅ S/N: ${intercooler.serial_number || '—'}` : '❌ Não'}</p>
        <p className="text-muted-foreground">Trocador de Óleo: {oilExchanger.enabled ? `✅ S/N: ${oilExchanger.serial_number || '—'}` : '❌ Não'}</p>
      </div>

      <div className="border rounded-lg p-4">
        <h4 className="font-semibold">Auto-criação</h4>
        <p className="text-muted-foreground">{basic.cylinders} velas, {basic.cylinders} camisas, {basic.cylinders} pistões com planos de manutenção padrão.</p>
      </div>
    </div>
  );

  const stepContent = () => {
    switch (step) {
      case 0: return renderBasicStep();
      case 1: return renderSubComponentStep('Turbina', turbine, setTurbine, true);
      case 2: return renderSubComponentStep('Intercooler', intercooler, setIntercooler, false);
      case 3: return renderSubComponentStep('Trocador de Óleo', oilExchanger, setOilExchanger, false);
      case 4: return renderReviewStep();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cadastrar Equipamento — {STEPS[step]}</DialogTitle>
          <div className="flex gap-1 pt-2">
            {STEPS.map((s, i) => (
              <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-muted'}`} />
            ))}
          </div>
        </DialogHeader>

        <div className="py-2">{stepContent()}</div>

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={() => step === 0 ? handleClose() : setStep(s => s - 1)}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            {step === 0 ? 'Cancelar' : 'Voltar'}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(s => s + 1)}>
              Próximo <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={addEquipment.isPending}>
              {addEquipment.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Cadastrar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
