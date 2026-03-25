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
import { ChevronLeft, ChevronRight, Plus, Loader2, CalendarIcon, Check, Settings, Wind, Thermometer, Droplets, ClipboardCheck, Fan, Disc, Zap, Battery, Trash2, Cog, Package } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialType?: string;
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
  manufacturer_id: string;
  model_id: string;
  maintenance_plan_template_id: string;
  equipment_type: string;
}

interface SubComponentData {
  enabled: boolean;
  serial_number: string;
  manufacturer_id: string;
  model_id: string;
  horimeter: number;
  use_equipment_hours: boolean;
}

interface MultiComponentData {
  enabled: boolean;
  quantity: number;
  manufacturer_id: string;
  model_id: string;
  horimeter: number;
  use_equipment_hours: boolean;
}

interface CustomComponentData {
  name: string;
  serial_number: string;
  manufacturer_id: string;
  model_id: string;
  installation_date: Date | undefined;
}

const GENERATOR_STEPS = [
  { label: 'Dados Básicos', icon: Settings },
  { label: 'Turbina', icon: Wind },
  { label: 'Intercooler', icon: Thermometer },
  { label: 'Trocador de Óleo', icon: Droplets },
  { label: 'Blowby', icon: Fan },
  { label: 'Damper', icon: Disc },
  { label: 'Motor Arranque', icon: Zap },
  { label: 'Baterias', icon: Battery },
  { label: 'Revisão', icon: ClipboardCheck },
];

const OTHER_STEPS = [
  { label: 'Dados Básicos', icon: Settings },
  { label: 'Componentes', icon: Cog },
  { label: 'Revisão', icon: ClipboardCheck },
];

export function EquipmentWizard({ open, onOpenChange, initialType }: Props) {
  const { addEquipment, componentManufacturers, componentModels, addComponentManufacturer, addComponentModel, oilTypes, addOilType } = useEquipmentStore();
  const { templates: planTemplates, applyTemplateToEquipment } = useMaintenancePlanTemplates();

  const [step, setStep] = useState(0);
  const [basic, setBasic] = useState<BasicData>({
    name: '', serial_number: '', total_horimeter: 0, total_starts: 0, cylinders: 0, fuel_type: 'biogas', installation_date: undefined, oil_type_id: '', manufacturer_id: '', model_id: '', maintenance_plan_template_id: '', equipment_type: initialType || 'gerador',
  });

  const emptySubComp = (): SubComponentData => ({
    enabled: false, serial_number: '', manufacturer_id: '', model_id: '', horimeter: 0, use_equipment_hours: true,
  });

  const emptyMultiComp = (): MultiComponentData => ({
    enabled: false, quantity: 1, manufacturer_id: '', model_id: '', horimeter: 0, use_equipment_hours: true,
  });

  const [turbine, setTurbine] = useState<SubComponentData>(emptySubComp());
  const [intercooler, setIntercooler] = useState<SubComponentData>(emptySubComp());
  const [oilExchanger, setOilExchanger] = useState<SubComponentData>(emptySubComp());
  const [blowby, setBlowby] = useState<MultiComponentData>(emptyMultiComp());
  const [damper, setDamper] = useState<MultiComponentData>(emptyMultiComp());
  const [starterMotor, setStarterMotor] = useState<MultiComponentData>(emptyMultiComp());
  const [battery, setBattery] = useState<MultiComponentData>(emptyMultiComp());

  // Custom components for "outro" type
  const [customComponents, setCustomComponents] = useState<CustomComponentData[]>([]);

  const [newManufName, setNewManufName] = useState('');
  const [newModelName, setNewModelName] = useState('');
  const [newOilName, setNewOilName] = useState('');
  const [addingManuf, setAddingManuf] = useState(false);
  const [addingModel, setAddingModel] = useState(false);
  const [addingOil, setAddingOil] = useState(false);
  const [manufContext, setManufContext] = useState<string>('turbine');

  const manufacturers = componentManufacturers.data || [];
  const models = componentModels.data || [];
  const oils = oilTypes.data || [];

  const isOtherAsset = basic.equipment_type === 'outro';
  const STEPS = isOtherAsset ? OTHER_STEPS : GENERATOR_STEPS;

  const reset = () => {
    setStep(0);
    setBasic({ name: '', serial_number: '', total_horimeter: 0, total_starts: 0, cylinders: 0, fuel_type: 'biogas', installation_date: undefined, oil_type_id: '', manufacturer_id: '', model_id: '', maintenance_plan_template_id: '', equipment_type: initialType || 'gerador' });
    setTurbine(emptySubComp()); setIntercooler(emptySubComp()); setOilExchanger(emptySubComp());
    setBlowby(emptyMultiComp()); setDamper(emptyMultiComp()); setStarterMotor(emptyMultiComp()); setBattery(emptyMultiComp());
    setCustomComponents([]);
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

  const handleAddManufacturer = async (targetSetter?: (id: string) => void) => {
    if (!newManufName.trim()) return;
    setAddingManuf(true);
    try {
      const m = await addComponentManufacturer.mutateAsync(newManufName.trim());
      if (targetSetter) {
        targetSetter(m.id);
      } else {
        setTurbine(prev => ({ ...prev, manufacturer_id: m.id }));
      }
      setNewManufName('');
    } catch { toast.error('Erro ao adicionar fabricante'); }
    setAddingManuf(false);
  };

  const handleAddModel = async (manufacturerId: string, targetSetter?: (id: string) => void) => {
    if (!newModelName.trim() || !manufacturerId) return;
    setAddingModel(true);
    try {
      const m = await addComponentModel.mutateAsync({ manufacturer_id: manufacturerId, name: newModelName.trim() });
      if (targetSetter) {
        targetSetter(m.id);
      } else {
        setTurbine(prev => ({ ...prev, model_id: m.id }));
      }
      setNewModelName('');
    } catch { toast.error('Erro ao adicionar modelo'); }
    setAddingModel(false);
  };

  const handleSubmit = async () => {
    if (!basic.name.trim()) { toast.error('Nome é obrigatório'); return; }
    if (!isOtherAsset && basic.cylinders <= 0) { toast.error('Número de cilindros deve ser > 0'); return; }

    const subComponents: Array<Omit<EquipmentSubComponent, 'id' | 'equipment_id'>> = [];

    if (isOtherAsset) {
      // Custom components for "outro" type
      customComponents.forEach(cc => {
        if (cc.name.trim()) {
          subComponents.push({
            component_type: cc.name.trim(),
            serial_number: cc.serial_number,
            manufacturer_id: cc.manufacturer_id || null,
            model_id: cc.model_id || null,
            horimeter: basic.total_horimeter,
            use_equipment_hours: true,
            installation_date: cc.installation_date ? format(cc.installation_date, 'yyyy-MM-dd') : null,
          });
        }
      });
    } else {
      // Generator sub-components
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
      if (blowby.enabled && blowby.quantity > 0) {
        for (let i = 0; i < blowby.quantity; i++) {
          subComponents.push({
            component_type: 'blowby', serial_number: `Blowby ${i + 1}`,
            manufacturer_id: null, model_id: null,
            horimeter: blowby.use_equipment_hours ? basic.total_horimeter : blowby.horimeter, use_equipment_hours: blowby.use_equipment_hours,
          });
        }
      }
      if (damper.enabled && damper.quantity > 0) {
        for (let i = 0; i < damper.quantity; i++) {
          subComponents.push({
            component_type: 'damper', serial_number: `Damper ${i + 1}`,
            manufacturer_id: null, model_id: null,
            horimeter: damper.use_equipment_hours ? basic.total_horimeter : damper.horimeter, use_equipment_hours: damper.use_equipment_hours,
          });
        }
      }
      if (starterMotor.enabled && starterMotor.quantity > 0) {
        for (let i = 0; i < starterMotor.quantity; i++) {
          subComponents.push({
            component_type: 'starter_motor', serial_number: `Motor Arranque ${i + 1}`,
            manufacturer_id: starterMotor.manufacturer_id || null, model_id: starterMotor.model_id || null,
            horimeter: basic.total_starts, use_equipment_hours: false,
          });
        }
      }
      if (battery.enabled && battery.quantity > 0) {
        for (let i = 0; i < battery.quantity; i++) {
          subComponents.push({
            component_type: 'battery', serial_number: `Bateria ${i + 1}`,
            manufacturer_id: battery.manufacturer_id || null, model_id: battery.model_id || null,
            horimeter: basic.total_starts, use_equipment_hours: false,
          });
        }
      }
    }

    try {
      const eq = await addEquipment.mutateAsync({
        equipment: {
          name: basic.name, equipment_type: basic.equipment_type, serial_number: basic.serial_number,
          total_horimeter: basic.total_horimeter, total_starts: basic.total_starts,
          cylinders: isOtherAsset ? 0 : basic.cylinders, fuel_type: isOtherAsset ? '' : basic.fuel_type,
          installation_date: basic.installation_date ? format(basic.installation_date, 'yyyy-MM-dd') : null,
          oil_type_id: basic.oil_type_id || null,
          manufacturer_id: basic.manufacturer_id || null,
          model_id: basic.model_id || null,
          maintenance_plan_template_id: null,
        },
        subComponents,
      });

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

  const getFilteredModels = (manufacturerId: string) => models.filter(m => m.manufacturer_id === manufacturerId);
  const filteredEquipModels = getFilteredModels(basic.manufacturer_id);
  const fuelLabels: Record<string, string> = { biogas: 'Biogás', landfill_gas: 'Gás de Aterro', natural_gas: 'Gás Natural' };
  const allPlanTemplates = planTemplates.data ?? [];

  // ── Stepper ──
  const renderStepper = () => (
    <div className="flex items-center justify-between mb-6 overflow-x-auto pb-2">
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const isActive = i === step;
        const isDone = i < step;
        return (
          <div key={s.label} className="flex items-center flex-1 last:flex-none min-w-0">
            <div className="flex flex-col items-center gap-1">
              <div className={cn(
                'h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 shrink-0',
                isActive && 'border-primary bg-primary text-primary-foreground scale-110 shadow-lg',
                isDone && 'border-primary bg-primary/10 text-primary',
                !isActive && !isDone && 'border-muted-foreground/30 text-muted-foreground/50',
              )}>
                {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
              </div>
              <span className={cn(
                'text-[9px] font-medium text-center leading-tight max-w-[55px] truncate',
                isActive && 'text-primary font-semibold',
                isDone && 'text-primary/70',
                !isActive && !isDone && 'text-muted-foreground/50',
              )}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn(
                'h-0.5 flex-1 mx-1 mt-[-14px] rounded-full transition-colors duration-300 min-w-[8px]',
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
      {/* Equipment Type Selector */}
      <div className="grid grid-cols-2 gap-3 mb-2">
        <Button
          type="button"
          variant={basic.equipment_type === 'gerador' ? 'default' : 'outline'}
          className="h-16 flex flex-col gap-1"
          onClick={() => { setBasic(p => ({ ...p, equipment_type: 'gerador' })); setStep(0); }}
        >
          <Zap className="h-5 w-5" />
          <span className="text-xs">Gerador</span>
        </Button>
        <Button
          type="button"
          variant={basic.equipment_type === 'outro' ? 'default' : 'outline'}
          className="h-16 flex flex-col gap-1"
          onClick={() => { setBasic(p => ({ ...p, equipment_type: 'outro' })); setStep(0); }}
        >
          <Package className="h-5 w-5" />
          <span className="text-xs">Outro Ativo</span>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {isOtherAsset ? 'Nome do Ativo *' : 'Nome do Gerador *'}
          </Label>
          <Input className="mt-1" value={basic.name} onChange={e => setBasic(p => ({ ...p, name: e.target.value }))} placeholder={isOtherAsset ? 'Ex: Compressor XYZ' : 'Ex: Gerador A1'} />
        </div>
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fabricante</Label>
          <div className="flex gap-2 mt-1">
            <Select value={basic.manufacturer_id} onValueChange={v => setBasic(p => ({ ...p, manufacturer_id: v, model_id: '' }))}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {manufacturers.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex gap-1">
              <Input className="w-24" placeholder="Novo..." value={newManufName} onChange={e => setNewManufName(e.target.value)} />
              <Button size="icon" variant="outline" onClick={() => handleAddManufacturer((id) => setBasic(p => ({ ...p, manufacturer_id: id })))} disabled={addingManuf}>
                {addingManuf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Modelo</Label>
          <div className="flex gap-2 mt-1">
            <Select value={basic.model_id} onValueChange={v => setBasic(p => ({ ...p, model_id: v }))} disabled={!basic.manufacturer_id}>
              <SelectTrigger className="flex-1"><SelectValue placeholder={basic.manufacturer_id ? 'Selecione...' : 'Selecione o fabricante primeiro'} /></SelectTrigger>
              <SelectContent>
                {filteredEquipModels.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex gap-1">
              <Input className="w-24" placeholder="Novo..." value={newModelName} onChange={e => setNewModelName(e.target.value)} disabled={!basic.manufacturer_id} />
              <Button size="icon" variant="outline" onClick={() => handleAddModel(basic.manufacturer_id, (id) => setBasic(p => ({ ...p, model_id: id })))} disabled={addingModel || !basic.manufacturer_id}>
                {addingModel ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
          </div>
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

        {/* Generator-specific fields */}
        {!isOtherAsset && (
          <>
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
          </>
        )}

        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Horímetro (horas)</Label>
          <Input className="mt-1" type="number" value={basic.total_horimeter} onChange={e => setBasic(p => ({ ...p, total_horimeter: Number(e.target.value) }))} />
        </div>

        {!isOtherAsset && (
          <>
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Arranques</Label>
              <Input className="mt-1" type="number" value={basic.total_starts} onChange={e => setBasic(p => ({ ...p, total_starts: Number(e.target.value) }))} />
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Número de Cilindros *</Label>
              <Input className="mt-1" type="number" value={basic.cylinders} onChange={e => setBasic(p => ({ ...p, cylinders: Number(e.target.value) }))} />
            </div>
          </>
        )}

        <div className="col-span-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Plano de Manutenção</Label>
          <Select value={basic.maintenance_plan_template_id} onValueChange={v => setBasic(p => ({ ...p, maintenance_plan_template_id: v === '_none' ? '' : v }))}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione um plano..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">Nenhum</SelectItem>
              {allPlanTemplates
                .filter(t => !basic.manufacturer_id || !basic.model_id || (t.manufacturer_id === basic.manufacturer_id && t.model_id === basic.model_id))
                .map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">Vincule um modelo de plano de manutenção preventiva</p>
        </div>
      </div>
      {!isOtherAsset && basic.cylinders > 0 && (
        <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground border border-dashed">
          ⚙️ Serão criados automaticamente: <strong>{basic.cylinders}</strong> velas, <strong>{basic.cylinders}</strong> camisas e <strong>{basic.cylinders}</strong> pistões.
        </div>
      )}
    </div>
  );

  // ── Step: Custom Components (for "outro" type) ──
  const renderCustomComponentsStep = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Componentes do Ativo</h3>
          <p className="text-xs text-muted-foreground">Adicione os componentes que compõem este ativo</p>
        </div>
        <Button
          size="sm"
          onClick={() => setCustomComponents(prev => [...prev, { name: '', serial_number: '', manufacturer_id: '', model_id: '', installation_date: undefined }])}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Adicionar
        </Button>
      </div>

      {customComponents.length === 0 && (
        <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
          <Cog className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhum componente adicionado.</p>
          <p className="text-xs mt-1">Clique em "Adicionar" para incluir componentes como Correia, Filtro, Rolamento, etc.</p>
        </div>
      )}

      <div className="space-y-3 max-h-[40vh] overflow-y-auto">
        {customComponents.map((cc, idx) => (
          <div key={idx} className="border rounded-lg p-3 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Componente {idx + 1}</span>
              <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => setCustomComponents(prev => prev.filter((_, i) => i !== idx))}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs">Nome do Componente *</Label>
                <Input
                  className="mt-1"
                  placeholder="Ex: Correia, Filtro de Ar, Rolamento..."
                  value={cc.name}
                  onChange={e => setCustomComponents(prev => prev.map((c, i) => i === idx ? { ...c, name: e.target.value } : c))}
                />
              </div>
              <div>
                <Label className="text-xs">Número de Série</Label>
                <Input
                  className="mt-1"
                  value={cc.serial_number}
                  onChange={e => setCustomComponents(prev => prev.map((c, i) => i === idx ? { ...c, serial_number: e.target.value } : c))}
                />
              </div>
              <div>
                <Label className="text-xs">Data de Instalação</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full mt-1 justify-start text-left font-normal text-xs', !cc.installation_date && 'text-muted-foreground')}>
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {cc.installation_date ? format(cc.installation_date, 'dd/MM/yyyy') : 'Selecione...'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={cc.installation_date}
                      onSelect={d => setCustomComponents(prev => prev.map((c, i) => i === idx ? { ...c, installation_date: d } : c))}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label className="text-xs">Fabricante</Label>
                <Select
                  value={cc.manufacturer_id}
                  onValueChange={v => setCustomComponents(prev => prev.map((c, i) => i === idx ? { ...c, manufacturer_id: v, model_id: '' } : c))}
                >
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {manufacturers.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {cc.manufacturer_id && (
                <div>
                  <Label className="text-xs">Modelo</Label>
                  <Select
                    value={cc.model_id}
                    onValueChange={v => setCustomComponents(prev => prev.map((c, i) => i === idx ? { ...c, model_id: v } : c))}
                  >
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {getFilteredModels(cc.manufacturer_id).map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ── Step: SubComponent (single, e.g. Turbine/Intercooler/OilExchanger) ──
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
                    <Button size="icon" variant="outline" onClick={() => handleAddManufacturer(id => setData(p => ({ ...p, manufacturer_id: id })))} disabled={addingManuf}>
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
                      <SelectContent>{getFilteredModels(data.manufacturer_id).map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <div className="flex gap-1">
                      <Input className="w-28" placeholder="Novo..." value={newModelName} onChange={e => setNewModelName(e.target.value)} />
                      <Button size="icon" variant="outline" onClick={() => handleAddModel(data.manufacturer_id, id => setData(p => ({ ...p, model_id: id })))} disabled={addingModel}>
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

  // ── Step: Multi-quantity component (Blowby, Damper) – tracks hours ──
  const renderMultiHoursStep = (
    label: string, data: MultiComponentData,
    setData: React.Dispatch<React.SetStateAction<MultiComponentData>>,
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
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quantidade de {label}</Label>
            <Input className="mt-1" type="number" min={1} value={data.quantity} onChange={e => setData(p => ({ ...p, quantity: Math.max(1, Number(e.target.value)) }))} />
          </div>
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
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Horímetro atual do {label}</Label>
                <Input className="mt-1" type="number" value={data.horimeter} onChange={e => setData(p => ({ ...p, horimeter: Number(e.target.value) }))} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // ── Step: Multi-quantity component (Starter Motor, Battery) – tracks starts, with manufacturer/model ──
  const renderMultiStartsStep = (
    label: string, data: MultiComponentData,
    setData: React.Dispatch<React.SetStateAction<MultiComponentData>>,
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
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quantidade de {label}</Label>
            <Input className="mt-1" type="number" min={1} value={data.quantity} onChange={e => setData(p => ({ ...p, quantity: Math.max(1, Number(e.target.value)) }))} />
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fabricante</Label>
            <div className="flex gap-2 mt-1">
              <Select value={data.manufacturer_id} onValueChange={v => setData(p => ({ ...p, manufacturer_id: v, model_id: '' }))}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{manufacturers.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
              </Select>
              <div className="flex gap-1">
                <Input className="w-28" placeholder="Novo..." value={newManufName} onChange={e => setNewManufName(e.target.value)} />
                <Button size="icon" variant="outline" onClick={() => handleAddManufacturer(id => setData(p => ({ ...p, manufacturer_id: id })))} disabled={addingManuf}>
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
                  <SelectContent>{getFilteredModels(data.manufacturer_id).map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                </Select>
                <div className="flex gap-1">
                  <Input className="w-28" placeholder="Novo..." value={newModelName} onChange={e => setNewModelName(e.target.value)} />
                  <Button size="icon" variant="outline" onClick={() => handleAddModel(data.manufacturer_id, id => setData(p => ({ ...p, model_id: id })))} disabled={addingModel}>
                    {addingModel ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          )}
          <div className="rounded-lg bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">
              📊 O controle deste componente é baseado na <strong>quantidade de arranques</strong> do equipamento ({basic.total_starts} arranques atuais).
            </p>
          </div>
        </div>
      )}
    </div>
  );

  // ── Step: Review ──
  const renderReviewStep = () => {
    const oilNameReview = oils.find(o => o.id === basic.oil_type_id)?.name || '—';
    const planName = allPlanTemplates.find(t => t.id === basic.maintenance_plan_template_id)?.name || '—';
    const manufName = (id: string) => manufacturers.find(m => m.id === id)?.name || '—';
    const modelName = (id: string) => models.find(m => m.id === id)?.name || '—';

    if (isOtherAsset) {
      return (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="border rounded-lg p-4 space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2"><Settings className="h-4 w-4 text-primary" /> Dados Básicos</h4>
            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              <span>Nome: <span className="text-foreground font-medium">{basic.name}</span></span>
              <span>Tipo: <span className="text-foreground font-medium">Outro Ativo</span></span>
              <span>Série: <span className="text-foreground font-medium">{basic.serial_number || '—'}</span></span>
              <span>Instalação: <span className="text-foreground font-medium">{basic.installation_date ? format(basic.installation_date, 'dd/MM/yyyy') : '—'}</span></span>
              <span>Horímetro: <span className="text-foreground font-medium">{basic.total_horimeter}h</span></span>
              <span className="col-span-2">Plano de Manutenção: <span className="text-foreground font-medium">{planName}</span></span>
            </div>
          </div>
          <div className="border rounded-lg p-4 space-y-2">
            <h4 className="font-semibold text-sm flex items-center gap-2"><Cog className="h-4 w-4 text-primary" /> Componentes ({customComponents.length})</h4>
            {customComponents.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Nenhum componente adicionado</p>
            ) : (
              customComponents.map((cc, i) => (
                <p key={i} className="text-sm text-muted-foreground">
                  {cc.name || `Componente ${i + 1}`}: ✅ S/N: {cc.serial_number || '—'}
                  {cc.manufacturer_id && ` | ${manufName(cc.manufacturer_id)}`}
                  {cc.model_id && ` / ${modelName(cc.model_id)}`}
                </p>
              ))
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="border rounded-lg p-4 space-y-3">
          <h4 className="font-semibold text-sm flex items-center gap-2"><Settings className="h-4 w-4 text-primary" /> Dados Básicos</h4>
          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
            <span>Nome: <span className="text-foreground font-medium">{basic.name}</span></span>
            <span>Série: <span className="text-foreground font-medium">{basic.serial_number || '—'}</span></span>
            <span>Instalação: <span className="text-foreground font-medium">{basic.installation_date ? format(basic.installation_date, 'dd/MM/yyyy') : '—'}</span></span>
            <span>Óleo: <span className="text-foreground font-medium">{oilNameReview}</span></span>
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
          <p className="text-sm text-muted-foreground">Blowby: {blowby.enabled ? `✅ Qtd: ${blowby.quantity}` : '❌ Não'}</p>
          <p className="text-sm text-muted-foreground">Damper: {damper.enabled ? `✅ Qtd: ${damper.quantity}` : '❌ Não'}</p>
          <p className="text-sm text-muted-foreground">Motor de Arranque: {starterMotor.enabled ? `✅ Qtd: ${starterMotor.quantity} | ${manufName(starterMotor.manufacturer_id)} / ${modelName(starterMotor.model_id)}` : '❌ Não'}</p>
          <p className="text-sm text-muted-foreground">Baterias: {battery.enabled ? `✅ Qtd: ${battery.quantity} | ${manufName(battery.manufacturer_id)} / ${modelName(battery.model_id)}` : '❌ Não'}</p>
        </div>
        <div className="border rounded-lg p-4 bg-muted/30">
          <h4 className="font-semibold text-sm mb-1">⚙️ Auto-criação</h4>
          <p className="text-sm text-muted-foreground">{basic.cylinders} velas, {basic.cylinders} camisas, {basic.cylinders} pistões com planos de manutenção padrão.</p>
        </div>
      </div>
    );
  };

  const stepContent = () => {
    if (isOtherAsset) {
      switch (step) {
        case 0: return renderBasicStep();
        case 1: return renderCustomComponentsStep();
        case 2: return renderReviewStep();
      }
    } else {
      switch (step) {
        case 0: return renderBasicStep();
        case 1: return renderSubComponentStep('Turbina', turbine, setTurbine, true);
        case 2: return renderSubComponentStep('Intercooler', intercooler, setIntercooler, false);
        case 3: return renderSubComponentStep('Trocador de Óleo', oilExchanger, setOilExchanger, false);
        case 4: return renderMultiHoursStep('Blowby', blowby, setBlowby);
        case 5: return renderMultiHoursStep('Damper', damper, setDamper);
        case 6: return renderMultiStartsStep('Motor de Arranque', starterMotor, setStarterMotor);
        case 7: return renderMultiStartsStep('Baterias', battery, setBattery);
        case 8: return renderReviewStep();
      }
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
              Próximo
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={addEquipment.isPending}>
              {addEquipment.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Cadastrar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
