import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/AppLayout';
import { useEquipmentStore, EquipmentSubComponent } from '@/hooks/useEquipmentStore';
import { useMaintenanceStore } from '@/hooks/useMaintenanceStore';
import { useMaintenancePlanTemplates } from '@/hooks/useMaintenancePlanTemplates';
import { useCylinderHeadStore, cylinderHeadStatusLabels } from '@/hooks/useCylinderHeadStore';
import { useTurboStore, turboStatusLabels } from '@/hooks/useTurboStore';
import type { TurboMetrics } from '@/hooks/useTurboStore';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Clock, Zap, Cylinder, Fuel, CalendarDays, Droplets, CheckCircle2, AlertTriangle, XCircle, Wrench, PlusCircle, History, ChevronDown, Cog, Gauge, Wind, Thermometer, Fan, Disc, Battery, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';
import { CylinderMaintenanceDialog } from '@/components/equipment/CylinderMaintenanceDialog';
import { CylinderComponentEditDialog } from '@/components/equipment/CylinderComponentEditDialog';
import { SubComponentEditDialog } from '@/components/equipment/SubComponentEditDialog';
import { OilTab } from '@/components/equipment/OilTab';
import { CylinderLogHistory } from '@/components/equipment/CylinderLogHistory';
import { toast } from 'sonner';
import type { CylinderHeadMetrics } from '@/hooks/useCylinderHeadStore';
import { cn } from '@/lib/utils';

const fuelLabels: Record<string, string> = { biogas: 'Biogás', landfill_gas: 'Gás de Aterro', natural_gas: 'Gás Natural' };

const maintenanceTypeLabels: Record<string, string> = {
  oil_change: 'Troca de Óleo',
  spark_plug: 'Vela',
  liner: 'Camisa',
  piston: 'Pistão',
  connecting_rod: 'Biela',
  bearing: 'Bronzina',
};

interface MaintenancePlan {
  id: string;
  equipment_id: string;
  component_type: string;
  component_id: string | null;
  task: string;
  trigger_type: string;
  interval_value: number;
  last_execution_value: number;
}

interface CylComp {
  id: string;
  equipment_id: string;
  cylinder_number: number;
  component_type: string;
  horimeter_at_install: number;
}

function fmtNum(n: number): string {
  return n.toLocaleString('pt-BR');
}

function getStatus(usage: number, interval: number) {
  if (interval <= 0) return 'ok';
  const ratio = usage / interval;
  if (ratio >= 1) return 'critical';
  if (ratio >= 0.9) return 'warning';
  return 'ok';
}

function getPercent(usage: number, interval: number) {
  if (interval <= 0) return 0;
  return Math.min(Math.round((usage / interval) * 100), 100);
}

const componentTypeLabels: Record<string, string> = {
  spark_plug: 'Vela',
  liner: 'Camisa',
  piston: 'Pistão',
  connecting_rod: 'Biela',
  bearing: 'Bronzina',
  turbine: 'Turbina',
  intercooler: 'Intercooler',
  oil_exchanger: 'Trocador de Óleo',
  oil_change: 'Troca de Óleo',
  blowby: 'Blowby',
  damper: 'Damper',
  starter_motor: 'Motor de Arranque',
  battery: 'Bateria',
};

const subComponentIcons: Record<string, typeof Cog> = {
  turbine: Wind,
  intercooler: Thermometer,
  oil_exchanger: Droplets,
  blowby: Fan,
  damper: Disc,
  starter_motor: Zap,
  battery: Battery,
};

const cylinderComponentTypes = ['spark_plug', 'liner', 'piston', 'connecting_rod', 'bearing'];

const triggerLabels: Record<string, string> = {
  hours: 'Horas',
  months: 'Meses',
  starts: 'Arranques',
};

export default function EquipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { equipments, oilTypes } = useEquipmentStore();
  const { logs, logItems } = useMaintenanceStore();
  const planTemplates = useMaintenancePlanTemplates();

  const turboStore = useTurboStore();
  const chStore = useCylinderHeadStore();

  const [maintDialog, setMaintDialog] = useState<{
    open: boolean;
    componentType: string;
    preSelectedCylinders: number[];
  }>({ open: false, componentType: '', preSelectedCylinders: [] });

  const [installChOpen, setInstallChOpen] = useState(false);
  const [selectedChId, setSelectedChId] = useState('');
  const [removeChId, setRemoveChId] = useState<string | null>(null);
  const [installTurboOpen, setInstallTurboOpen] = useState(false);
  const [selectedTurboId, setSelectedTurboId] = useState('');
  const [linkPlanOpen, setLinkPlanOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [taskFilter, setTaskFilter] = useState<Record<string, string>>({});
  const [editComp, setEditComp] = useState<{
    open: boolean;
    componentType: string;
    cylinderNumber: number;
    componentId: string;
    horimeterAtInstall: number;
    plans: Array<{ id: string; task: string; last_execution_value: number; interval_value: number; component_id: string | null }>;
  }>({ open: false, componentType: '', cylinderNumber: 0, componentId: '', horimeterAtInstall: 0, plans: [] });

  const [editSubComp, setEditSubComp] = useState<{
    open: boolean;
    componentId: string;
    componentType: string;
    horimeter: number;
    installationDate: string | null;
  }>({ open: false, componentId: '', componentType: '', horimeter: 0, installationDate: null });

  const equipment = equipments.data?.find(e => e.id === id);
  const oils = oilTypes.data || [];

  const plans = useQuery({
    queryKey: ['component_maintenance_plans', id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('component_maintenance_plans')
        .select('*')
        .eq('equipment_id', id)
        .order('component_type');
      if (error) throw error;
      return data as MaintenancePlan[];
    },
    enabled: !!id,
  });

  const cylinderComponents = useQuery({
    queryKey: ['cylinder_components', id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('cylinder_components')
        .select('*')
        .eq('equipment_id', id)
        .order('cylinder_number');
      if (error) throw error;
      return data as CylComp[];
    },
    enabled: !!id,
  });

  const subComponents = useQuery({
    queryKey: ['equipment_sub_components', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment_sub_components')
        .select('*')
        .eq('equipment_id', id!)
        .order('component_type');
      if (error) throw error;
      return data as EquipmentSubComponent[];
    },
    enabled: !!id,
  });

  if (!equipment) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <p>Equipamento não encontrado.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/')}>Voltar</Button>
        </div>
      </AppLayout>
    );
  }

  const oilName = oils.find(o => o.id === equipment.oil_type_id)?.name;
  const allPlans = plans.data || [];
  const allCylComps = cylinderComponents.data || [];
  const allSubComps = subComponents.data || [];
  const equipmentLogs = (logs.data || []).filter((l: any) => l.equipment_id === id);
  const allLogItems = logItems.data || [];

  // Cylinder head data for this equipment
  const allCylinderHeads = chStore.cylinderHeads.data || [];
  const allChInstallations = chStore.installations.data || [];
  const inStockHeads = allCylinderHeads.filter(h => h.status === 'in_stock');
  const activeInstallations = allChInstallations.filter(i => i.equipment_id === id && !i.remove_date);
  const activeHeadIds = activeInstallations.map(i => i.cylinder_head_id);
  const activeHeads = allCylinderHeads.filter(h => activeHeadIds.includes(h.id));

  // Turbo data for this equipment
  const allTurbos = turboStore.turbos.data || [];
  const allTurboInstallations = turboStore.installations.data || [];
  const inStockTurbos = allTurbos.filter(t => t.status === 'in_stock');
  const activeTurboInstallations = allTurboInstallations.filter(i => i.equipment_id === id && !i.remove_date);
  const activeTurboIds = activeTurboInstallations.map(i => i.turbo_id);
  const activeTurbos = allTurbos.filter(t => activeTurboIds.includes(t.id));

  const handleInstallHead = async () => {
    if (!selectedChId || !id) return;
    try {
      await chStore.installCylinderHead.mutateAsync({
        cylinder_head_id: selectedChId,
        equipment_id: id,
        install_equipment_horimeter: equipment.total_horimeter,
      });
      toast.success('Cabeçote montado com sucesso!');
      setSelectedChId('');
      setInstallChOpen(false);
    } catch {
      toast.error('Erro ao montar cabeçote.');
    }
  };

  const handleRemoveHead = async (installationId: string, headId: string) => {
    try {
      await chStore.removeCylinderHead.mutateAsync({
        installation_id: installationId,
        cylinder_head_id: headId,
        remove_equipment_horimeter: equipment.total_horimeter,
      });
      toast.success('Cabeçote removido!');
      setRemoveChId(null);
    } catch {
      toast.error('Erro ao remover cabeçote.');
    }
  };

  const handleInstallTurbo = async () => {
    if (!selectedTurboId || !id) return;
    try {
      await turboStore.installTurbo.mutateAsync({
        turbo_id: selectedTurboId,
        equipment_id: id,
        install_equipment_horimeter: equipment.total_horimeter,
      });
      toast.success('Turbo montado com sucesso!');
      setSelectedTurboId('');
      setInstallTurboOpen(false);
    } catch {
      toast.error('Erro ao montar turbo.');
    }
  };

  const handleRemoveTurbo = async (installationId: string, turboId: string) => {
    try {
      await turboStore.removeTurbo.mutateAsync({
        installation_id: installationId,
        turbo_id: turboId,
        remove_equipment_horimeter: equipment.total_horimeter,
      });
      toast.success('Turbo removido!');
    } catch {
      toast.error('Erro ao remover turbo.');
    }
  };

  // Link plan to equipment
  const allTemplates = planTemplates.templates.data || [];
  const currentTemplateName = allTemplates.find(t => t.id === equipment.maintenance_plan_template_id)?.name;

  const handleLinkPlan = async () => {
    if (!selectedTemplateId || !id) return;
    try {
      await planTemplates.applyTemplateToEquipment(selectedTemplateId, id, equipment.total_horimeter);
      toast.success('Plano de manutenção vinculado com sucesso!');
      setSelectedTemplateId('');
      setLinkPlanOpen(false);
    } catch {
      toast.error('Erro ao vincular plano.');
    }
  };

  // Get plans for a specific component (by component_id or fallback to type-level)
  const getPlansForComponent = (type: string, componentId?: string) => {
    // First try per-component plans
    const perComp = allPlans.filter(p => p.component_type === type && p.component_id === componentId);
    if (perComp.length > 0) return perComp;
    // Fallback: type-level plans (component_id is null)
    return allPlans.filter(p => p.component_type === type && !p.component_id);
  };

  // Get ALL plans for a specific component type (for shared types like oil)
  const getPlansForType = (type: string) => allPlans.filter(p => p.component_type === type);

  // Helper to check if a log mentions a specific cylinder number
  const logMatchesCylinder = (log: any, cylNumber: number) => {
    if (!log.notes) return false;
    const match = log.notes.match(/Cil\.\s*([\d,\s]+)/);
    if (!match) return false;
    const nums = match[1].split(',').map((s: string) => parseInt(s.trim(), 10));
    return nums.includes(cylNumber);
  };

  // Group cylinder components by type
  const cylByType = cylinderComponentTypes.map(type => ({
    type,
    label: componentTypeLabels[type] || type,
    components: allCylComps.filter(c => c.component_type === type).sort((a, b) => a.cylinder_number - b.cylinder_number),
  })).filter(g => g.components.length > 0);

  // Group sub-components by type (excluding cylinder types and oil)
  const subCompByType = Object.entries(
    allSubComps.reduce<Record<string, EquipmentSubComponent[]>>((acc, sc) => {
      if (!acc[sc.component_type]) acc[sc.component_type] = [];
      acc[sc.component_type].push(sc);
      return acc;
    }, {})
  ).map(([type, comps]) => ({
    type,
    label: componentTypeLabels[type] || type,
    components: comps,
    plans: getPlansForType(type),
  }));

  // Calculate status counts across ALL component types
  // Helper: get worst status for a component across its plans, considering component install horimeter
  // Count each task independently per component (not worst-per-component)
  // Get the correct counter value based on trigger_type
  const getCounterValue = (triggerType: string) => {
    if (triggerType === 'starts') return equipment.total_starts;
    return equipment.total_horimeter;
  };

  const getCounterUnit = (triggerType: string) => {
    if (triggerType === 'starts') return 'arr.';
    return 'h';
  };

  const getTaskStatuses = (plans: MaintenancePlan[], compInstallHorimeter?: number) => {
    const uniquePlans = plans.reduce<MaintenancePlan[]>((acc, p) => {
      if (!acc.find(a => a.task === p.task)) acc.push(p);
      return acc;
    }, []);
    return uniquePlans.map(plan => {
      const counter = getCounterValue(plan.trigger_type);
      const baseline = compInstallHorimeter !== undefined
        ? Math.max(compInstallHorimeter, plan.last_execution_value)
        : plan.last_execution_value;
      const usage = counter - baseline;
      return getStatus(usage, plan.interval_value);
    });
  };

  const countStatuses = (statuses: string[]) => {
    let ok = 0, warning = 0, critical = 0;
    statuses.forEach(s => {
      if (s === 'critical') critical++;
      else if (s === 'warning') warning++;
      else ok++;
    });
    return { ok, warning, critical };
  };

  const getAllComponentStatuses = () => {
    const allStatuses: string[] = [];

    // Cylinder components - each task for each component counted independently
    cylByType.forEach(group => {
      group.components.forEach(comp => {
        const compPlans = getPlansForComponent(group.type, comp.id);
        allStatuses.push(...getTaskStatuses(compPlans, comp.horimeter_at_install));
      });
    });

    // Sub-components - each task for each component counted independently
    subCompByType.forEach(group => {
      group.components.forEach(comp => {
        allStatuses.push(...getTaskStatuses(group.plans, comp.horimeter));
      });
    });

    // Oil plans - each plan is already independent
    const oilPlans = allPlans.filter(p => p.component_type === 'oil_change' || p.component_type === 'oil_filter');
    oilPlans.forEach(p => {
      const usage = equipment.total_horimeter - p.last_execution_value;
      allStatuses.push(getStatus(usage, p.interval_value));
    });

    return countStatuses(allStatuses);
  };

  const statusCounts = getAllComponentStatuses();

  const openMaintDialog = (componentType: string, preSelectedCylinders?: number[]) => {
    setMaintDialog({
      open: true,
      componentType,
      preSelectedCylinders: preSelectedCylinders || [],
    });
  };

  // Determine default tab
  const defaultTab = cylByType.length > 0 ? cylByType[0].type : subCompByType.length > 0 ? subCompByType[0].type : 'oil';

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">{equipment.name}</h1>
            <p className="text-sm text-muted-foreground">{equipment.serial_number || 'Sem S/N'}</p>
          </div>
          <div className="flex items-center gap-2">
            {currentTemplateName && (
              <Badge variant="secondary" className="text-xs gap-1">
                <ClipboardList className="h-3 w-3" />
                {currentTemplateName}
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={() => setLinkPlanOpen(true)}>
              <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
              {equipment.maintenance_plan_template_id ? 'Alterar Plano' : 'Vincular Plano'}
            </Button>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card>
            <CardContent className="p-4 flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Horímetro</p>
                <p className="font-bold">{fmtNum(equipment.total_horimeter)}h</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Arranques</p>
                <p className="font-bold">{fmtNum(equipment.total_starts)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-2 text-sm">
              <Cylinder className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Cilindros</p>
                <p className="font-bold">{equipment.cylinders}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-2 text-sm">
              <Fuel className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Combustível</p>
                <p className="font-bold">{fuelLabels[equipment.fuel_type] || equipment.fuel_type}</p>
              </div>
            </CardContent>
          </Card>
          {equipment.installation_date && (
            <Card>
              <CardContent className="p-4 flex items-center gap-2 text-sm">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Instalação</p>
                  <p className="font-bold">{format(new Date(equipment.installation_date), 'dd/MM/yyyy')}</p>
                </div>
              </CardContent>
            </Card>
          )}
          {oilName && (
            <Card>
              <CardContent className="p-4 flex items-center gap-2 text-sm">
                <Droplets className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Óleo</p>
                  <p className="font-bold">{oilName}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Status Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-[hsl(var(--status-ok))]/20">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-[hsl(var(--status-ok))]/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-[hsl(var(--status-ok))]" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Em dia</p>
                <p className="text-2xl font-bold">{statusCounts.ok}</p>
              </div>
            </CardContent>
          </Card>
          <Card className={statusCounts.warning > 0 ? 'border-[hsl(var(--status-warning))]/30 bg-[hsl(var(--status-warning-muted))]' : ''}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-[hsl(var(--status-warning))]/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-[hsl(var(--status-warning))]" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Atenção</p>
                <p className="text-2xl font-bold">{statusCounts.warning}</p>
              </div>
            </CardContent>
          </Card>
          <Card className={statusCounts.critical > 0 ? 'border-[hsl(var(--status-critical))]/30 bg-[hsl(var(--status-critical-muted))]' : ''}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-[hsl(var(--status-critical))]/10 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-[hsl(var(--status-critical))]" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Vencidas</p>
                <p className="text-2xl font-bold">{statusCounts.critical}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue={defaultTab}>
          <TabsList className="flex-wrap h-auto gap-1">
            {/* Cylinder component tabs */}
            {cylByType.map(group => {
              const groupStatuses = countStatuses(
                group.components.flatMap(comp => getTaskStatuses(getPlansForComponent(group.type, comp.id), comp.horimeter_at_install))
              );
              const cylCritical = groupStatuses.critical;
              const cylWarning = groupStatuses.warning;
              return (
                <TabsTrigger key={group.type} value={group.type} className="relative gap-1.5">
                  {group.label}s
                  {cylCritical > 0 && (
                    <span className="inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full text-[10px] font-bold bg-[hsl(var(--status-critical))] text-white">
                      {cylCritical}
                    </span>
                  )}
                  {cylWarning > 0 && (
                    <span className="inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full text-[10px] font-bold bg-[hsl(var(--status-warning))] text-white">
                      {cylWarning}
                    </span>
                  )}
                </TabsTrigger>
              );
            })}

            {/* Oil tab */}
            {(() => {
              const oilPlans = allPlans.filter(p => p.component_type === 'oil_change' || p.component_type === 'oil_filter');
              const oilCritical = oilPlans.filter(p => getStatus(equipment.total_horimeter - p.last_execution_value, p.interval_value) === 'critical').length;
              const oilWarning = oilPlans.filter(p => getStatus(equipment.total_horimeter - p.last_execution_value, p.interval_value) === 'warning').length;
              return (
                <TabsTrigger value="oil" className="relative gap-1.5">
                  <Droplets className="h-3.5 w-3.5" />
                  Óleo
                  {oilCritical > 0 && (
                    <span className="inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full text-[10px] font-bold bg-[hsl(var(--status-critical))] text-white">
                      {oilCritical}
                    </span>
                  )}
                  {oilWarning > 0 && (
                    <span className="inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full text-[10px] font-bold bg-[hsl(var(--status-warning))] text-white">
                      {oilWarning}
                    </span>
                  )}
                </TabsTrigger>
              );
            })()}

            {/* Cylinder Heads tab */}
            <TabsTrigger value="cylinder_heads" className="gap-1.5">
              <Cog className="h-3.5 w-3.5" />
              Cabeçotes {activeHeads.length > 0 && `(${activeHeads.length})`}
            </TabsTrigger>

            {/* Turbos tab */}
            <TabsTrigger value="turbos" className="gap-1.5">
              <Wind className="h-3.5 w-3.5" />
              Turbos {activeTurbos.length > 0 && `(${activeTurbos.length})`}
            </TabsTrigger>

            {/* Sub-component tabs */}
            {subCompByType.map(group => {
              const Icon = subComponentIcons[group.type] || Cog;
              const scStatuses = countStatuses(
                group.components.flatMap(comp => getTaskStatuses(group.plans, comp.horimeter))
              );
              const scCritical = scStatuses.critical;
              const scWarning = scStatuses.warning;
              return (
                <TabsTrigger key={group.type} value={group.type} className="relative gap-1.5">
                  <Icon className="h-3.5 w-3.5" />
                  {group.label} {group.components.length > 1 && `(${group.components.length})`}
                  {scCritical > 0 && (
                    <span className="inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full text-[10px] font-bold bg-[hsl(var(--status-critical))] text-white">
                      {scCritical}
                    </span>
                  )}
                  {scWarning > 0 && (
                    <span className="inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full text-[10px] font-bold bg-[hsl(var(--status-warning))] text-white">
                      {scWarning}
                    </span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* One tab per cylinder component type */}
          {cylByType.map(group => {
            const allTypePlans = getPlansForType(group.type);
            const uniqueTaskNames = [...new Set(allTypePlans.map(p => p.task))];
            const activeFilter = taskFilter[group.type] || '_all';
            return (
              <TabsContent key={group.type} value={group.type} className="mt-4">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {uniqueTaskNames.length > 1 && (
                      <>
                        <Button
                          size="sm"
                          variant={activeFilter === '_all' ? 'default' : 'outline'}
                          className="text-xs h-7 px-3"
                          onClick={() => setTaskFilter(prev => ({ ...prev, [group.type]: '_all' }))}
                        >
                          Todos
                        </Button>
                        {uniqueTaskNames.map(tn => (
                          <Button
                            key={tn}
                            size="sm"
                            variant={activeFilter === tn ? 'default' : 'outline'}
                            className="text-xs h-7 px-3"
                            onClick={() => setTaskFilter(prev => ({ ...prev, [group.type]: tn }))}
                          >
                            {tn}
                          </Button>
                        ))}
                      </>
                    )}
                  </div>
                  <Button size="sm" onClick={() => openMaintDialog(group.type)}>
                    <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
                    Registrar Manutenção
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {group.components.map(comp => {
                    const compPlans = getPlansForComponent(group.type, comp.id);
                    const uniquePlans = compPlans.reduce<MaintenancePlan[]>((acc, p) => {
                      if (!acc.find(a => a.task === p.task)) acc.push(p);
                      return acc;
                    }, []);

                    const taskStatuses = uniquePlans.map(plan => {
                      const counter = getCounterValue(plan.trigger_type);
                      const unit = getCounterUnit(plan.trigger_type);
                      const baseline = Math.max(comp.horimeter_at_install, plan.last_execution_value);
                      const usage = counter - baseline;
                      const st = getStatus(usage, plan.interval_value);
                      const pct = getPercent(usage, plan.interval_value);
                      return { task: plan.task, status: st, percent: pct, interval: plan.interval_value, usage, baseline, unit };
                    });

                    // Apply task filter
                    const filteredStatuses = activeFilter === '_all'
                      ? taskStatuses
                      : taskStatuses.filter(ts => ts.task === activeFilter);

                    const overallStatus = filteredStatuses.some(t => t.status === 'critical') ? 'critical'
                      : filteredStatuses.some(t => t.status === 'warning') ? 'warning' : 'ok';

                    const compLogs = equipmentLogs.filter((log: any) =>
                      log.maintenance_type === comp.component_type && logMatchesCylinder(log, comp.cylinder_number)
                    );

                    return (
                      <Card
                        key={comp.id}
                        className={`cursor-pointer transition-shadow hover:shadow-md ${
                          overallStatus === 'critical' ? 'border-[hsl(var(--status-critical))]/40' :
                          overallStatus === 'warning' ? 'border-[hsl(var(--status-warning))]/40' : ''
                        }`}
                        onClick={() => setEditComp({
                          open: true,
                          componentType: comp.component_type,
                          cylinderNumber: comp.cylinder_number,
                          componentId: comp.id,
                          horimeterAtInstall: comp.horimeter_at_install,
                          plans: getPlansForComponent(group.type, comp.id),
                        })}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-sm">{group.label} {comp.cylinder_number}</span>
                            <Badge
                              variant={overallStatus === 'critical' ? 'destructive' : overallStatus === 'warning' ? 'secondary' : 'default'}
                              className={
                                overallStatus === 'ok' ? 'bg-[hsl(var(--status-ok))] text-[hsl(var(--status-ok-foreground))]' :
                                overallStatus === 'warning' ? 'bg-[hsl(var(--status-warning))] text-[hsl(var(--status-warning-foreground))]' : ''
                              }
                            >
                              {overallStatus === 'ok' ? 'Em dia' : overallStatus === 'warning' ? 'Atenção' : 'Vencida'}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1 mb-2">
                            <div className="flex justify-between">
                              <span>Instalado em:</span>
                              <span className="font-mono">{fmtNum(comp.horimeter_at_install)}h</span>
                            </div>
                          </div>

                          {filteredStatuses.length > 0 && (
                            <div className="space-y-1.5 mb-2">
                              {filteredStatuses.map((ts, i) => (
                                <div key={i} className="space-y-0.5">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">{ts.task}</span>
                                    <span className={
                                      ts.status === 'critical' ? 'text-[hsl(var(--status-critical))] font-semibold' :
                                      ts.status === 'warning' ? 'text-[hsl(var(--status-warning))] font-semibold' :
                                      'text-[hsl(var(--status-ok))]'
                                    }>
                                      {ts.status === 'ok' ? 'Em dia' : ts.status === 'warning' ? 'Atenção' : 'Vencida'}
                                    </span>
                                  </div>
                                  <Progress value={ts.percent} className="h-1" />
                                  <div className="flex justify-between text-[10px] text-muted-foreground">
                                    <span className="font-mono">
                                      {ts.unit === 'arr.'
                                        ? `${fmtNum(equipment.total_starts)} / ${fmtNum(ts.interval)} arr.`
                                        : `${fmtNum(ts.usage)}${ts.unit} / ${fmtNum(ts.interval)}${ts.unit}`
                                      }
                                    </span>
                                    <span className="font-mono">{ts.percent}%</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 text-xs"
                              onClick={(e) => { e.stopPropagation(); openMaintDialog(comp.component_type, [comp.cylinder_number]); }}
                            >
                              <PlusCircle className="h-3 w-3 mr-1" />
                              Registrar
                            </Button>
                          </div>

                          <CylinderLogHistory
                            logs={compLogs}
                            cylinderNumber={comp.cylinder_number}
                            componentType={comp.component_type}
                            componentLabel={group.label}
                            equipmentId={id!}
                            equipmentHorimeter={equipment.total_horimeter}
                          />
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>
            );
          })}

          {/* Oil Tab */}
          <TabsContent value="oil" className="mt-4">
            <OilTab
              equipmentId={id!}
              equipmentHorimeter={equipment.total_horimeter}
              oilName={oilName}
              oilTypeId={equipment.oil_type_id}
            />
          </TabsContent>

          {/* Cylinder Heads Tab */}
          <TabsContent value="cylinder_heads" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">Cabeçotes montados neste equipamento</p>
              <Button size="sm" onClick={() => setInstallChOpen(true)} disabled={inStockHeads.length === 0}>
                <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
                Montar Cabeçote
              </Button>
            </div>
            {activeHeads.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  Nenhum cabeçote montado. Clique em "Montar Cabeçote" para associar um do estoque.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeHeads.map(head => {
                  const inst = activeInstallations.find(i => i.cylinder_head_id === head.id)!;
                  const hoursOnThisEquip = equipment.total_horimeter - inst.install_equipment_horimeter;
                  return (
                    <CylinderHeadCard
                      key={head.id}
                      head={head}
                      installation={inst}
                      hoursOnEquipment={hoursOnThisEquip}
                      equipmentHorimeter={equipment.total_horimeter}
                      onRemove={() => handleRemoveHead(inst.id, head.id)}
                      getMetrics={chStore.getMetrics}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Turbos Tab */}
          <TabsContent value="turbos" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">Turbos montados neste equipamento</p>
              <Button size="sm" onClick={() => setInstallTurboOpen(true)} disabled={inStockTurbos.length === 0}>
                <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
                Montar Turbo
              </Button>
            </div>
            {activeTurbos.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  Nenhum turbo montado. Clique em "Montar Turbo" para associar um do estoque.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeTurbos.map(turbo => {
                  const inst = activeTurboInstallations.find(i => i.turbo_id === turbo.id)!;
                  const hoursOnThisEquip = equipment.total_horimeter - inst.install_equipment_horimeter;
                  return (
                    <TurboCard
                      key={turbo.id}
                      turbo={turbo}
                      installation={inst}
                      hoursOnEquipment={hoursOnThisEquip}
                      onRemove={() => handleRemoveTurbo(inst.id, turbo.id)}
                      getMetrics={turboStore.getMetrics}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Sub-component tabs */}
          {subCompByType.map(group => {
            const uniquePlans = group.plans.reduce<MaintenancePlan[]>((acc, p) => {
              if (!acc.find(a => a.task === p.task)) acc.push(p);
              return acc;
            }, []);
            const uniqueTaskNames = [...new Set(uniquePlans.map(p => p.task))];
            const activeFilter = taskFilter[group.type] || '_all';
            const Icon = subComponentIcons[group.type] || Cog;
            return (
              <TabsContent key={group.type} value={group.type} className="mt-4">
                {uniqueTaskNames.length > 1 && (
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    <Button
                      size="sm"
                      variant={activeFilter === '_all' ? 'default' : 'outline'}
                      className="text-xs h-7 px-3"
                      onClick={() => setTaskFilter(prev => ({ ...prev, [group.type]: '_all' }))}
                    >
                      Todos
                    </Button>
                    {uniqueTaskNames.map(tn => (
                      <Button
                        key={tn}
                        size="sm"
                        variant={activeFilter === tn ? 'default' : 'outline'}
                        className="text-xs h-7 px-3"
                        onClick={() => setTaskFilter(prev => ({ ...prev, [group.type]: tn }))}
                      >
                        {tn}
                      </Button>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {group.components.map(comp => {
                    const taskStatuses = uniquePlans.map(plan => {
                      const counter = getCounterValue(plan.trigger_type);
                      const unit = getCounterUnit(plan.trigger_type);
                      const baseline = Math.max(comp.horimeter, plan.last_execution_value);
                      const usage = counter - baseline;
                      const st = getStatus(usage, plan.interval_value);
                      const pct = getPercent(usage, plan.interval_value);
                      return { task: plan.task, status: st, percent: pct, interval: plan.interval_value, usage, unit };
                    });

                    const filteredStatuses = activeFilter === '_all'
                      ? taskStatuses
                      : taskStatuses.filter(ts => ts.task === activeFilter);

                    const overallStatus = filteredStatuses.some(t => t.status === 'critical') ? 'critical'
                      : filteredStatuses.some(t => t.status === 'warning') ? 'warning' : 'ok';

                      return (
                      <Card
                        key={comp.id}
                        className={cn(
                          'cursor-pointer transition-shadow hover:shadow-md',
                          overallStatus === 'critical' ? 'border-[hsl(var(--status-critical))]/40' :
                          overallStatus === 'warning' ? 'border-[hsl(var(--status-warning))]/40' : ''
                        )}
                        onClick={() => setEditSubComp({
                          open: true,
                          componentId: comp.id,
                          componentType: comp.component_type,
                          horimeter: comp.horimeter,
                          installationDate: comp.installation_date ?? null,
                        })}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                              <span className="font-semibold text-sm">{comp.serial_number || group.label}</span>
                            </div>
                            <Badge
                              variant={overallStatus === 'critical' ? 'destructive' : overallStatus === 'warning' ? 'secondary' : 'default'}
                              className={
                                overallStatus === 'ok' ? 'bg-[hsl(var(--status-ok))] text-[hsl(var(--status-ok-foreground))]' :
                                overallStatus === 'warning' ? 'bg-[hsl(var(--status-warning))] text-[hsl(var(--status-warning-foreground))]' : ''
                              }
                            >
                              {overallStatus === 'ok' ? 'Em dia' : overallStatus === 'warning' ? 'Atenção' : 'Vencida'}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1 mb-2">
                            <div className="flex justify-between">
                              <span>{group.type === 'starter_motor' ? 'Arranques na instalação:' : 'Horímetro instalação:'}</span>
                              <span className="font-mono">{fmtNum(comp.horimeter)}{group.type === 'starter_motor' ? ' arr.' : 'h'}</span>
                            </div>
                            {comp.installation_date && (
                              <div className="flex justify-between">
                                <span>Data instalação:</span>
                                <span className="font-mono">{format(new Date(comp.installation_date + 'T12:00:00'), 'dd/MM/yyyy')}</span>
                              </div>
                            )}
                          </div>

                          {filteredStatuses.length > 0 && (
                            <div className="space-y-1.5">
                              {filteredStatuses.map((ts, i) => (
                                <div key={i} className="space-y-0.5">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">{ts.task}</span>
                                    <span className={
                                      ts.status === 'critical' ? 'text-[hsl(var(--status-critical))] font-semibold' :
                                      ts.status === 'warning' ? 'text-[hsl(var(--status-warning))] font-semibold' :
                                      'text-[hsl(var(--status-ok))]'
                                    }>
                                      {ts.status === 'ok' ? 'Em dia' : ts.status === 'warning' ? 'Atenção' : 'Vencida'}
                                    </span>
                                  </div>
                                  <Progress value={ts.percent} className="h-1" />
                                  <div className="flex justify-between text-[10px] text-muted-foreground">
                                    <span className="font-mono">
                                      {ts.unit === 'arr.'
                                        ? `${fmtNum(equipment.total_starts)} / ${fmtNum(ts.interval)} arr.`
                                        : `${fmtNum(ts.usage)}${ts.unit} / ${fmtNum(ts.interval)}${ts.unit}`
                                      }
                                    </span>
                                    <span className="font-mono">{ts.percent}%</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {filteredStatuses.length === 0 && (
                            <p className="text-xs text-muted-foreground italic">Sem plano de manutenção vinculado</p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>

      {/* Maintenance Dialog */}
      {maintDialog.open && (
        <CylinderMaintenanceDialog
          open={maintDialog.open}
          onOpenChange={(open) => setMaintDialog(prev => ({ ...prev, open }))}
          equipmentId={id!}
          equipmentHorimeter={equipment.total_horimeter}
          componentType={maintDialog.componentType}
          allComponents={allCylComps.filter(c => c.component_type === maintDialog.componentType)}
          preSelectedCylinders={maintDialog.preSelectedCylinders}
        />
      )}

      {/* Edit Component Dialog */}
      {editComp.open && (
        <CylinderComponentEditDialog
          open={editComp.open}
          onOpenChange={(open) => setEditComp(prev => ({ ...prev, open }))}
          equipmentId={id!}
          equipmentHorimeter={equipment.total_horimeter}
          componentType={editComp.componentType}
          cylinderNumber={editComp.cylinderNumber}
          componentId={editComp.componentId}
          currentHorimeterAtInstall={editComp.horimeterAtInstall}
          plans={editComp.plans}
        />
      )}

      {/* Edit Sub Component Dialog */}
      {editSubComp.open && (
        <SubComponentEditDialog
          open={editSubComp.open}
          onOpenChange={(open) => setEditSubComp(prev => ({ ...prev, open }))}
          componentId={editSubComp.componentId}
          componentType={editSubComp.componentType}
          currentHorimeter={editSubComp.horimeter}
          currentInstallationDate={editSubComp.installationDate}
          equipmentTotalStarts={equipment.total_starts}
        />
      )}

      {/* Install Cylinder Head Dialog */}
      <Dialog open={installChOpen} onOpenChange={setInstallChOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Montar Cabeçote</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Selecione um cabeçote disponível em estoque:</p>
            <Select value={selectedChId} onValueChange={setSelectedChId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar cabeçote..." />
              </SelectTrigger>
              <SelectContent>
                {inStockHeads.map(h => (
                  <SelectItem key={h.id} value={h.id}>
                    {h.serial_number || h.id.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Horímetro atual do equipamento: <span className="font-mono font-medium">{fmtNum(equipment.total_horimeter)}h</span>
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInstallChOpen(false)}>Cancelar</Button>
            <Button onClick={handleInstallHead} disabled={!selectedChId || chStore.installCylinderHead.isPending}>
              Montar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Install Turbo Dialog */}
      <Dialog open={installTurboOpen} onOpenChange={setInstallTurboOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Montar Turbo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Selecione um turbo disponível em estoque:</p>
            <Select value={selectedTurboId} onValueChange={setSelectedTurboId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar turbo..." />
              </SelectTrigger>
              <SelectContent>
                {inStockTurbos.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.serial_number || t.id.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Horímetro atual do equipamento: <span className="font-mono font-medium">{fmtNum(equipment.total_horimeter)}h</span>
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInstallTurboOpen(false)}>Cancelar</Button>
            <Button onClick={handleInstallTurbo} disabled={!selectedTurboId || turboStore.installTurbo.isPending}>
              Montar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Maintenance Plan Dialog */}
      <Dialog open={linkPlanOpen} onOpenChange={setLinkPlanOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Vincular Plano de Manutenção</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecione um plano de manutenção para aplicar a este equipamento. 
              {equipment.maintenance_plan_template_id && ' O plano atual será substituído.'}
            </p>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar plano..." />
              </SelectTrigger>
              <SelectContent>
                {allTemplates.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} {t.description && `— ${t.description}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              O horímetro atual (<span className="font-mono font-medium">{fmtNum(equipment.total_horimeter)}h</span>) será usado como referência inicial para todas as tarefas do plano.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkPlanOpen(false)}>Cancelar</Button>
            <Button onClick={handleLinkPlan} disabled={!selectedTemplateId}>
              Vincular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

// Sub-component for cylinder head card with async metrics
function CylinderHeadCard({
  head,
  installation,
  hoursOnEquipment,
  equipmentHorimeter,
  onRemove,
  getMetrics,
}: {
  head: { id: string; serial_number: string; status: string; last_maintenance_date: string | null };
  installation: { id: string; install_date: string; install_equipment_horimeter: number };
  hoursOnEquipment: number;
  equipmentHorimeter: number;
  onRemove: () => void;
  getMetrics: (id: string) => Promise<CylinderHeadMetrics>;
}) {
  const metrics = useQuery({
    queryKey: ['cylinder_head_metrics', head.id],
    queryFn: () => getMetrics(head.id),
  });

  const m = metrics.data;

  return (
    <Card className="border-[hsl(var(--industrial))]/20">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cog className="h-4 w-4 text-[hsl(var(--industrial))]" />
            <span className="font-semibold text-sm">{head.serial_number || head.id.slice(0, 8)}</span>
          </div>
          <Badge className="bg-[hsl(var(--industrial))] text-[hsl(var(--industrial-foreground))]">
            Montado
          </Badge>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>Instalado em:</span>
            <span className="font-mono">{format(new Date(installation.install_date), 'dd/MM/yyyy')} ({fmtNum(installation.install_equipment_horimeter)}h)</span>
          </div>
          <div className="flex justify-between">
            <span>Horas neste motor:</span>
            <span className="font-mono font-medium">{fmtNum(Math.round(hoursOnEquipment))}h</span>
          </div>
        </div>

        {m && (
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded-md bg-[hsl(var(--industrial))]/5 border border-[hsl(var(--industrial))]/10">
              <div className="flex items-center gap-1 mb-0.5">
                <Clock className="h-3 w-3 text-[hsl(var(--industrial))]" />
                <span className="text-[10px] text-muted-foreground">Horas Totais</span>
              </div>
              <p className="text-sm font-bold font-mono">{fmtNum(Math.round(m.total_hours))}h</p>
            </div>
            <div className="p-2 rounded-md bg-[hsl(var(--status-warning))]/5 border border-[hsl(var(--status-warning))]/10">
              <div className="flex items-center gap-1 mb-0.5">
                <Gauge className="h-3 w-3 text-[hsl(var(--status-warning))]" />
                <span className="text-[10px] text-muted-foreground">Pós-Revisão</span>
              </div>
              <p className="text-sm font-bold font-mono">{fmtNum(Math.round(m.hours_since_maintenance))}h</p>
            </div>
          </div>
        )}

        {head.last_maintenance_date && (
          <p className="text-xs text-muted-foreground">
            Última revisão: <span className="font-mono">{format(new Date(head.last_maintenance_date), 'dd/MM/yyyy')}</span>
          </p>
        )}

        <Button size="sm" variant="outline" className="w-full text-xs" onClick={onRemove}>
          Desmontar Cabeçote
        </Button>
      </CardContent>
    </Card>
  );
}

// Sub-component for turbo card with async metrics
function TurboCard({
  turbo,
  installation,
  hoursOnEquipment,
  onRemove,
  getMetrics,
}: {
  turbo: { id: string; serial_number: string; status: string; last_maintenance_date: string | null };
  installation: { id: string; install_date: string; install_equipment_horimeter: number };
  hoursOnEquipment: number;
  onRemove: () => void;
  getMetrics: (id: string) => Promise<TurboMetrics>;
}) {
  const metrics = useQuery({
    queryKey: ['turbo_metrics', turbo.id],
    queryFn: () => getMetrics(turbo.id),
  });

  const m = metrics.data;

  return (
    <Card className="border-[hsl(var(--industrial))]/20">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wind className="h-4 w-4 text-[hsl(var(--industrial))]" />
            <span className="font-semibold text-sm">{turbo.serial_number || turbo.id.slice(0, 8)}</span>
          </div>
          <Badge className="bg-[hsl(var(--industrial))] text-[hsl(var(--industrial-foreground))]">
            Montado
          </Badge>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>Instalado em:</span>
            <span className="font-mono">{format(new Date(installation.install_date), 'dd/MM/yyyy')} ({fmtNum(installation.install_equipment_horimeter)}h)</span>
          </div>
          <div className="flex justify-between">
            <span>Horas neste motor:</span>
            <span className="font-mono font-medium">{fmtNum(Math.round(hoursOnEquipment))}h</span>
          </div>
        </div>

        {m && (
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded-md bg-[hsl(var(--industrial))]/5 border border-[hsl(var(--industrial))]/10">
              <div className="flex items-center gap-1 mb-0.5">
                <Clock className="h-3 w-3 text-[hsl(var(--industrial))]" />
                <span className="text-[10px] text-muted-foreground">Horas Totais</span>
              </div>
              <p className="text-sm font-bold font-mono">{fmtNum(Math.round(m.total_hours))}h</p>
            </div>
            <div className="p-2 rounded-md bg-[hsl(var(--status-warning))]/5 border border-[hsl(var(--status-warning))]/10">
              <div className="flex items-center gap-1 mb-0.5">
                <Gauge className="h-3 w-3 text-[hsl(var(--status-warning))]" />
                <span className="text-[10px] text-muted-foreground">Pós-Revisão</span>
              </div>
              <p className="text-sm font-bold font-mono">{fmtNum(Math.round(m.hours_since_maintenance))}h</p>
            </div>
          </div>
        )}

        {turbo.last_maintenance_date && (
          <p className="text-xs text-muted-foreground">
            Última revisão: <span className="font-mono">{format(new Date(turbo.last_maintenance_date), 'dd/MM/yyyy')}</span>
          </p>
        )}

        <Button size="sm" variant="outline" className="w-full text-xs" onClick={onRemove}>
          Desmontar Turbo
        </Button>
      </CardContent>
    </Card>
  );
}
