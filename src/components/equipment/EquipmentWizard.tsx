import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useEquipmentStore, EquipmentSubComponent } from '@/hooks/useEquipmentStore';
import { useMaintenancePlanTemplates } from '@/hooks/useMaintenancePlanTemplates';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Plus, Loader2, CalendarIcon, Check, Fuel, Settings, Wind, Thermometer, Droplets, ClipboardCheck } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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
  installation_date: Date | undefined;
  oil_type_id: string;
  maintenance_plan_template_id: string;
}

interface SubComponentData {
  enabled: boolean;
  serial_number: string;
  manufacturer_id: string;
  model_id: string;
  horimeter: number;
  use_equipment_hours: boolean;
}

const STEPS = [
  { label: 'Dados Básicos', icon: Settings },
  { label: 'Turbina', icon: Wind },
  { label: 'Intercooler', icon: Thermometer },
  { label: 'Trocador de Óleo', icon: Droplets },
  { label: 'Revisão', icon: ClipboardCheck },
];

export function EquipmentWizard({ open, onOpenChange }: Props) {
  const { addEquipment, componentManufacturers, componentModels, addComponentManufacturer, addComponentModel, oilTypes, addOilType } = useEquipmentStore();
  const { templates: planTemplates, applyTemplateToEquipment } = useMaintenancePlanTemplates();

  const [step, setStep] = useState(0);
  const [basic, setBasic] = useState<BasicData>({
    name: '', serial_number: '', total_horimeter: 0, total_starts: 0, cylinders: 0, fuel_type: 'biogas', installation_date: undefined, oil_type_id: '', maintenance_plan_template_id: '',
  });

  const emptySubComp = (): SubComponentData => ({
    enabled: false, serial_number: '', manufacturer_id: '', model_id: '', horimeter: 0, use_equipment_hours: true,
  });

  const [turbine, setTurbine] = useState<SubComponentData>(emptySubComp());
  const [intercooler, setIntercooler] = useState<SubComponentData>(emptySubComp());
  const [oilExchanger, setOilExchanger] = useState<SubComponentData>(emptySubComp());

  const [newManufName, setNewManufName] = useState('');
  const [newModelName, setNewModelName] = useState('');
  const [newOilName, setNewOilName] = useState('');
  const [addingManuf, setAddingManuf] = useState(false);
  const [addingModel, setAddingModel] = useState(false);
  const [addingOil, setAddingOil] = useState(false);

  const manufacturers = componentManufacturers.data || [];
  const models = componentModels.data || [];
  const oils = oilTypes.data || [];

  const reset = () => {
    setStep(0);
    setBasic({ name: '', serial_number: '', total_horimeter: 0, total_starts: 0, cylinders: 0, fuel_type: 'biogas', installation_date: undefined, oil_type_id: '', maintenance_plan_template_id: '' });
    setTurbine(emptySubComp()); setIntercooler(emptySubComp()); setOilExchanger(emptySubComp());
  };

  const handleClose = () => { reset(); onOpenChange(false); };

  const handleAddOil = async () => {
    if (!newOilName.trim()) return;
    setAddingOil(true);
    try {
      const o = await addOilType.mutateAsync(newOilName.trim());
      setBasic(p => ({ ...p, oil_type_id: o.id }));
      setNewOilName('');
    } catch { toast.error('Erro ao adicionar tipo de óleo'); }
    setAddingOil(false);
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
        component_type: 'turbine', serial_number: turbine.serial_number,
        manufacturer_id: turbine.manufacturer_id || null, model_id: turbine.model_id || null,
        horimeter: turbine.use_equipment_hours ? basic.total_horimeter : turbine.horimeter, use_equipment_hours: turbine.use_equipment_hours,
      });
    }
    if (intercooler.enabled) {
      subComponents.push({
        component_type: 'intercooler', serial_number: intercooler.serial_number,
        manufacturer_id: null, model_id: null,
        horimeter: intercooler.use_equipment_hours ? basic.total_horimeter : intercooler.horimeter, use_equipment_hours: intercooler.use_equipment_hours,
      });
    }
    if (oilExchanger.enabled) {
      subComponents.push({
        component_type: 'oil_exchanger', serial_number: oilExchanger.serial_number,
        manufacturer_id: null, model_id: null,
        horimeter: oilExchanger.use_equipment_hours ? basic.total_horimeter : oilExchanger.horimeter, use_equipment_hours: oilExchanger.use_equipment_hours,
      });
    }

    try {
      const eq = await addEquipment.mutateAsync({
        equipment: {
          name: basic.name, equipment_type: 'gerador', serial_number: basic.serial_number,
          total_horimeter: basic.total_horimeter, total_starts: basic.total_starts,
          cylinders: basic.cylinders, fuel_type: basic.fuel_type,
          installation_date: basic.installation_date ? format(basic.installation_date, 'yyyy-MM-dd') : null,
          oil_type_id: basic.oil_type_id || null,
        },
        subComponents,
      });

      // Apply maintenance plan template if selected
      if (basic.maintenance_plan_template_id && eq?.id) {
        try {
          await applyTemplateToEquipment(basic.maintenance_plan_template_id, eq.id, basic.total_horimeter);
        } catch {
          toast.error('Equipamento criado, mas erro ao aplicar plano de manutenção');
        }
      }

      toast.success(`Equipamento "${basic.name}" cadastrado com sucesso!`);
      handleClose();
    } catch {
      toast.error('Erro ao cadastrar equipamento');
    }
  };

  const filteredModels = models.filter(m => m.manufacturer_id === turbine.manufacturer_id);
  const fuelLabels: Record<string, string> = { biogas: 'Biogás', landfill_gas: 'Gás de Aterro', natural_gas: 'Gás Natural' };
  const allPlanTemplates = planTemplates.data ?? [];

  // ── Stepper ──
  const renderStepper = () => (
    <div className="flex items-center justify-between mb-6">
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const isActive = i === step;
        const isDone = i < step;
        return (
          <div key={s.label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div className={cn(
                'h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all duration-300',
                isActive && 'border-primary bg-primary text-primary-foreground scale-110 shadow-lg',
                isDone && 'border-primary bg-primary/10 text-primary',
                !isActive && !isDone && 'border-muted-foreground/30 text-muted-foreground/50',
              )}>
                {isDone ? <Check className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
              </div>
              <span className={cn(
                'text-[10px] font-medium text-center leading-tight max-w-[70px]',
                isActive && 'text-primary font-semibold',
                isDone && 'text-primary/70',
                !isActive && !isDone && 'text-muted-foreground/50',
              )}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn(
                'h-0.5 flex-1 mx-2 mt-[-18px] rounded-full transition-colors duration-300',
                i < step ? 'bg-primary' : 'bg-muted',
              )} />
            )}
          </div>
        );
      })}
    </div>
  );

  // ── Step: Basic ──
  const renderBasicStep = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nome do Gerador *</Label>
          <Input className="mt-1" value={basic.name} onChange={e => setBasic(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Gerador A1" />
        </div>
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Número de Série</Label>
          <Input className="mt-1" value={basic.serial_number} onChange={e => setBasic(p => ({ ...p, serial_number: e.target.value }))} />
        </div>
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Data de Instalação</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn('w-full mt-1 justify-start text-left font-normal', !basic.installation_date && 'text-muted-foreground')}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {basic.installation_date ? format(basic.installation_date, 'dd/MM/yyyy') : 'Selecione...'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={basic.installation_date} onSelect={d => setBasic(p => ({ ...p, installation_date: d }))} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Combustível *</Label>
          <Select value={basic.fuel_type} onValueChange={v => setBasic(p => ({ ...p, fuel_type: v }))}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="biogas">Biogás</SelectItem>
              <SelectItem value="landfill_gas">Gás de Aterro</SelectItem>
              <SelectItem value="natural_gas">Gás Natural</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Óleo Utilizado</Label>
          <div className="flex gap-2 mt-1">
            <Select value={basic.oil_type_id} onValueChange={v => setBasic(p => ({ ...p, oil_type_id: v }))}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {oils.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex gap-1">
              <Input className="w-24" placeholder="Novo..." value={newOilName} onChange={e => setNewOilName(e.target.value)} />
              <Button size="icon" variant="outline" onClick={handleAddOil} disabled={addingOil}>
                {addingOil ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Horímetro (horas)</Label>
          <Input className="mt-1" type="number" value={basic.total_horimeter} onChange={e => setBasic(p => ({ ...p, total_horimeter: Number(e.target.value) }))} />
        </div>
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Arranques</Label>
          <Input className="mt-1" type="number" value={basic.total_starts} onChange={e => setBasic(p => ({ ...p, total_starts: Number(e.target.value) }))} />
        </div>
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Número de Cilindros *</Label>
          <Input className="mt-1" type="number" value={basic.cylinders} onChange={e => setBasic(p => ({ ...p, cylinders: Number(e.target.value) }))} />
        </div>
        <div className="col-span-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Plano de Manutenção</Label>
          <Select value={basic.maintenance_plan_template_id} onValueChange={v => setBasic(p => ({ ...p, maintenance_plan_template_id: v === '_none' ? '' : v }))}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione um plano..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">Nenhum</SelectItem>
              {allPlanTemplates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">Vincule um modelo de plano de manutenção preventiva</p>
        </div>
      </div>
      {basic.cylinders > 0 && (
        <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground border border-dashed">
          ⚙️ Serão criados automaticamente: <strong>{basic.cylinders}</strong> velas, <strong>{basic.cylinders}</strong> camisas e <strong>{basic.cylinders}</strong> pistões.
        </div>
      )}
    </div>
  );

  // ── Step: SubComponent ──
  const renderSubComponentStep = (
    label: string, data: SubComponentData,
    setData: React.Dispatch<React.SetStateAction<SubComponentData>>,
    showManufacturer: boolean,
  ) => (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border">
        <div>
          <Label className="text-base font-semibold">Possui {label}?</Label>
          <p className="text-xs text-muted-foreground">Ative para registrar dados deste componente</p>
        </div>
        <Switch checked={data.enabled} onCheckedChange={v => setData(p => ({ ...p, enabled: v }))} />
      </div>
      {data.enabled && (
        <div className="space-y-4 border rounded-lg p-4 animate-in fade-in duration-200">
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Número de Série do {label}</Label>
            <Input className="mt-1" value={data.serial_number} onChange={e => setData(p => ({ ...p, serial_number: e.target.value }))} />
          </div>
          {showManufacturer && (
            <>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fabricante</Label>
                <div className="flex gap-2 mt-1">
                  <Select value={data.manufacturer_id} onValueChange={v => setData(p => ({ ...p, manufacturer_id: v, model_id: '' }))}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>{manufacturers.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <div className="flex gap-1">
                    <Input className="w-28" placeholder="Novo..." value={newManufName} onChange={e => setNewManufName(e.target.value)} />
                    <Button size="icon" variant="outline" onClick={handleAddManufacturer} disabled={addingManuf}>
                      {addingManuf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
              {data.manufacturer_id && (
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Modelo</Label>
                  <div className="flex gap-2 mt-1">
                    <Select value={data.model_id} onValueChange={v => setData(p => ({ ...p, model_id: v }))}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>{filteredModels.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <div className="flex gap-1">
                      <Input className="w-28" placeholder="Novo..." value={newModelName} onChange={e => setNewModelName(e.target.value)} />
                      <Button size="icon" variant="outline" onClick={handleAddModel} disabled={addingModel}>
                        {addingModel ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <div className="space-y-3 p-3 rounded-lg bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Utilizar horas do motor</Label>
                <p className="text-xs text-muted-foreground">Espelhar horímetro do equipamento principal</p>
              </div>
              <Switch checked={data.use_equipment_hours} onCheckedChange={v => setData(p => ({ ...p, use_equipment_hours: v }))} />
            </div>
            {!data.use_equipment_hours && (
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Horímetro do {label}</Label>
                <Input className="mt-1" type="number" value={data.horimeter} onChange={e => setData(p => ({ ...p, horimeter: Number(e.target.value) }))} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // ── Step: Review ──
  const renderReviewStep = () => {
    const oilName = oils.find(o => o.id === basic.oil_type_id)?.name || '—';
    const planName = allPlanTemplates.find(t => t.id === basic.maintenance_plan_template_id)?.name || '—';
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="border rounded-lg p-4 space-y-3">
          <h4 className="font-semibold text-sm flex items-center gap-2"><Settings className="h-4 w-4 text-primary" /> Dados Básicos</h4>
          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
            <span>Nome: <span className="text-foreground font-medium">{basic.name}</span></span>
            <span>Série: <span className="text-foreground font-medium">{basic.serial_number || '—'}</span></span>
            <span>Instalação: <span className="text-foreground font-medium">{basic.installation_date ? format(basic.installation_date, 'dd/MM/yyyy') : '—'}</span></span>
            <span>Óleo: <span className="text-foreground font-medium">{oilName}</span></span>
            <span>Horímetro: <span className="text-foreground font-medium">{basic.total_horimeter}h</span></span>
            <span>Arranques: <span className="text-foreground font-medium">{basic.total_starts}</span></span>
            <span>Cilindros: <span className="text-foreground font-medium">{basic.cylinders}</span></span>
            <span>Combustível: <span className="text-foreground font-medium">{fuelLabels[basic.fuel_type]}</span></span>
            <span className="col-span-2">Plano de Manutenção: <span className="text-foreground font-medium">{planName}</span></span>
          </div>
        </div>
        <div className="border rounded-lg p-4 space-y-2">
          <h4 className="font-semibold text-sm flex items-center gap-2"><Wind className="h-4 w-4 text-primary" /> Componentes</h4>
          <p className="text-sm text-muted-foreground">Turbina: {turbine.enabled ? `✅ S/N: ${turbine.serial_number || '—'}` : '❌ Não'}</p>
          <p className="text-sm text-muted-foreground">Intercooler: {intercooler.enabled ? `✅ S/N: ${intercooler.serial_number || '—'}` : '❌ Não'}</p>
          <p className="text-sm text-muted-foreground">Trocador de Óleo: {oilExchanger.enabled ? `✅ S/N: ${oilExchanger.serial_number || '—'}` : '❌ Não'}</p>
        </div>
        <div className="border rounded-lg p-4 bg-muted/30">
          <h4 className="font-semibold text-sm mb-1">⚙️ Auto-criação</h4>
          <p className="text-sm text-muted-foreground">{basic.cylinders} velas, {basic.cylinders} camisas, {basic.cylinders} pistões com planos de manutenção padrão.</p>
        </div>
      </div>
    );
  };

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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Cadastrar Equipamento</DialogTitle>
        </DialogHeader>

        {renderStepper()}

        <div className="min-h-[280px]">{stepContent()}</div>

        <div className="flex justify-between pt-4 border-t">
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
