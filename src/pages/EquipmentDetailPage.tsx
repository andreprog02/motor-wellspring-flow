import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/AppLayout';
import { useEquipmentStore } from '@/hooks/useEquipmentStore';
import { useMaintenanceStore } from '@/hooks/useMaintenanceStore';
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
import { ArrowLeft, Clock, Zap, Cylinder, Fuel, CalendarDays, Droplets, CheckCircle2, AlertTriangle, XCircle, Wrench, PlusCircle, History, ChevronDown, Cog, Gauge, Wind } from 'lucide-react';
import { format } from 'date-fns';
import { CylinderMaintenanceDialog } from '@/components/equipment/CylinderMaintenanceDialog';
import { OilTab } from '@/components/equipment/OilTab';
import { toast } from 'sonner';
import type { CylinderHeadMetrics } from '@/hooks/useCylinderHeadStore';

// Removed duplicate TurboMetrics import (already imported above)

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

function getStatus(current: number, lastExec: number, interval: number) {
  if (interval <= 0) return 'ok';
  const usage = current - lastExec;
  const ratio = usage / interval;
  if (ratio >= 1) return 'critical';
  if (ratio >= 0.9) return 'warning';
  return 'ok';
}

function getPercent(current: number, lastExec: number, interval: number) {
  if (interval <= 0) return 0;
  const usage = current - lastExec;
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

  const okPlans = allPlans.filter(p => getStatus(equipment.total_horimeter, p.last_execution_value, p.interval_value) === 'ok');
  const warningPlans = allPlans.filter(p => getStatus(equipment.total_horimeter, p.last_execution_value, p.interval_value) === 'warning');
  const criticalPlans = allPlans.filter(p => getStatus(equipment.total_horimeter, p.last_execution_value, p.interval_value) === 'critical');

  // Group plans by unique component_type + task (for non-cylinder plans)
  const nonCylinderPlans = allPlans.filter(p => !cylinderComponentTypes.includes(p.component_type));
  const uniqueNonCylPlans = nonCylinderPlans.reduce<MaintenancePlan[]>((acc, plan) => {
    const exists = acc.find(p => p.component_type === plan.component_type && p.task === plan.task);
    if (!exists) acc.push(plan);
    return acc;
  }, []);

  // Get ALL plans for a specific component type
  const getPlansForType = (type: string) => allPlans.filter(p => p.component_type === type);

  // Helper to check if a log mentions a specific cylinder number
  const logMatchesCylinder = (log: any, cylNumber: number) => {
    if (!log.notes) return false;
    // Match "Cil. X" patterns - handles "Cil. 1, 2, 3" and "Cil. 1"
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
    plans: getPlansForType(type),
  })).filter(g => g.components.length > 0);

  const openMaintDialog = (componentType: string, preSelectedCylinders?: number[]) => {
    setMaintDialog({
      open: true,
      componentType,
      preSelectedCylinders: preSelectedCylinders || [],
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{equipment.name}</h1>
            <p className="text-sm text-muted-foreground">{equipment.serial_number || 'Sem S/N'}</p>
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
                <p className="text-2xl font-bold">{okPlans.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className={warningPlans.length > 0 ? 'border-[hsl(var(--status-warning))]/30 bg-[hsl(var(--status-warning-muted))]' : ''}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-[hsl(var(--status-warning))]/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-[hsl(var(--status-warning))]" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Atenção</p>
                <p className="text-2xl font-bold">{warningPlans.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className={criticalPlans.length > 0 ? 'border-[hsl(var(--status-critical))]/30 bg-[hsl(var(--status-critical-muted))]' : ''}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-[hsl(var(--status-critical))]/10 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-[hsl(var(--status-critical))]" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Vencidas</p>
                <p className="text-2xl font-bold">{criticalPlans.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue={cylByType.length > 0 ? cylByType[0].type : 'plans'}>
          <TabsList className="flex-wrap h-auto gap-1">
            {cylByType.map(group => (
              <TabsTrigger key={group.type} value={group.type}>{group.label}s</TabsTrigger>
            ))}
            <TabsTrigger value="oil">
              <Droplets className="h-3.5 w-3.5 mr-1" />
              Óleo
            </TabsTrigger>
            <TabsTrigger value="cylinder_heads">
              <Cog className="h-3.5 w-3.5 mr-1" />
              Cabeçotes {activeHeads.length > 0 && `(${activeHeads.length})`}
            </TabsTrigger>
            <TabsTrigger value="turbos">
              <Wind className="h-3.5 w-3.5 mr-1" />
              Turbos {activeTurbos.length > 0 && `(${activeTurbos.length})`}
            </TabsTrigger>
            <TabsTrigger value="plans">Planos Gerais</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          {/* One tab per cylinder component type */}
          {cylByType.map(group => {
            const plans = group.plans;
            // Get unique tasks from plans
            const uniquePlans = plans.reduce<MaintenancePlan[]>((acc, p) => {
              if (!acc.find(a => a.task === p.task)) acc.push(p);
              return acc;
            }, []);
            const mainPlan = plans[0]; // for interval display
            return (
              <TabsContent key={group.type} value={group.type} className="mt-4">
                <div className="flex items-center justify-between mb-3">
                  {mainPlan ? (
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <Wrench className="h-3.5 w-3.5" />
                      Intervalo: <span className="font-mono font-medium">{fmtNum(mainPlan.interval_value)} {triggerLabels[mainPlan.trigger_type]?.toLowerCase() || mainPlan.trigger_type}</span>
                    </div>
                  ) : <div />}
                  <Button size="sm" onClick={() => openMaintDialog(group.type)}>
                    <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
                    Registrar Manutenção
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {group.components.map(comp => {
                    const usage = equipment.total_horimeter - comp.horimeter_at_install;

                    // Per-task status for this cylinder
                    const taskStatuses = uniquePlans.map(plan => {
                      const st = getStatus(equipment.total_horimeter, comp.horimeter_at_install, plan.interval_value);
                      const pct = getPercent(equipment.total_horimeter, comp.horimeter_at_install, plan.interval_value);
                      return { task: plan.task, status: st, percent: pct, interval: plan.interval_value };
                    });

                    // Overall status = worst of all tasks
                    const overallStatus = taskStatuses.some(t => t.status === 'critical') ? 'critical'
                      : taskStatuses.some(t => t.status === 'warning') ? 'warning' : 'ok';

                    // Logs for THIS cylinder
                    const compLogs = equipmentLogs.filter((log: any) =>
                      log.maintenance_type === comp.component_type && logMatchesCylinder(log, comp.cylinder_number)
                    );

                    return (
                      <Card
                        key={comp.id}
                        className={
                          overallStatus === 'critical' ? 'border-[hsl(var(--status-critical))]/40' :
                          overallStatus === 'warning' ? 'border-[hsl(var(--status-warning))]/40' : ''
                        }
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
                            <div className="flex justify-between">
                              <span>Uso:</span>
                              <span className="font-mono">{fmtNum(usage)}h</span>
                            </div>
                          </div>

                          {/* Per-task plan status */}
                          {taskStatuses.length > 0 && (
                            <div className="space-y-1.5 mb-2">
                              {taskStatuses.map((ts, i) => (
                                <div key={i} className="space-y-0.5">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground truncate mr-2">{ts.task}</span>
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
                                    <span className="font-mono">{fmtNum(usage)}h / {fmtNum(ts.interval)}h</span>
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
                              onClick={() => openMaintDialog(comp.component_type, [comp.cylinder_number])}
                            >
                              <PlusCircle className="h-3 w-3 mr-1" />
                              Registrar
                            </Button>
                          </div>

                          {/* History section */}
                          {compLogs.length > 0 && (
                            <Collapsible>
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="w-full text-xs mt-2 text-muted-foreground">
                                  <History className="h-3 w-3 mr-1" />
                                  Histórico ({compLogs.length})
                                  <ChevronDown className="h-3 w-3 ml-auto" />
                                </Button>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <Separator className="my-2" />
                                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                  {compLogs.map((log: any) => (
                                    <div key={log.id} className="text-xs flex items-start gap-2 py-1">
                                      <span className="font-mono text-muted-foreground whitespace-nowrap">
                                        {format(new Date(log.service_date), 'dd/MM/yy')}
                                      </span>
                                      <span className="font-mono whitespace-nowrap">{fmtNum(log.horimeter_at_service)}h</span>
                                      <span className="text-muted-foreground truncate flex-1">
                                        {log.notes?.includes('Substituição') ? '🔄 Substituição' :
                                         log.notes?.includes('Limpeza') ? '🧹 Limpeza' :
                                         log.notes?.includes('Lubrificação') ? '🛢️ Lubrificação' : '🔍 Inspeção'}
                                        {log.notes?.split(' - ').slice(2).join(' - ') ? ` — ${log.notes.split(' - ').slice(2).join(' - ')}` : ''}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          )}
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

          {/* General Plans Tab */}
          <TabsContent value="plans" className="mt-4">
            {uniqueNonCylPlans.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  Nenhum plano de manutenção geral cadastrado.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {uniqueNonCylPlans.map(plan => {
                  const status = getStatus(equipment.total_horimeter, plan.last_execution_value, plan.interval_value);
                  const percent = getPercent(equipment.total_horimeter, plan.last_execution_value, plan.interval_value);
                  const usage = equipment.total_horimeter - plan.last_execution_value;
                  return (
                    <Card key={plan.id} className={
                      status === 'critical' ? 'border-[hsl(var(--status-critical))]/30' :
                      status === 'warning' ? 'border-[hsl(var(--status-warning))]/30' : ''
                    }>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Wrench className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold text-sm">{componentTypeLabels[plan.component_type] || plan.component_type}</span>
                            <span className="text-xs text-muted-foreground">— {plan.task}</span>
                          </div>
                          <Badge
                            variant={status === 'critical' ? 'destructive' : status === 'warning' ? 'secondary' : 'default'}
                            className={
                              status === 'ok' ? 'bg-[hsl(var(--status-ok))] text-[hsl(var(--status-ok-foreground))]' :
                              status === 'warning' ? 'bg-[hsl(var(--status-warning))] text-[hsl(var(--status-warning-foreground))]' : ''
                            }
                          >
                            {status === 'ok' ? 'Em dia' : status === 'warning' ? 'Atenção' : 'Vencida'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3">
                          <Progress value={percent} className="flex-1 h-2" />
                          <span className="text-xs font-mono text-muted-foreground w-32 text-right">
                            {fmtNum(usage)}/{fmtNum(plan.interval_value)} {triggerLabels[plan.trigger_type]?.toLowerCase() || plan.trigger_type}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-4">
            {equipmentLogs.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  Nenhuma manutenção registrada.
                </CardContent>
              </Card>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Horímetro</TableHead>
                      <TableHead>Itens Usados</TableHead>
                      <TableHead>Notas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {equipmentLogs.map((log: any) => {
                      const items = allLogItems.filter((i: any) => i.maintenance_log_id === log.id);
                      return (
                        <TableRow key={log.id}>
                          <TableCell className="font-mono text-xs">{format(new Date(log.service_date), 'dd/MM/yyyy')}</TableCell>
                          <TableCell>{maintenanceTypeLabels[log.maintenance_type] || log.maintenance_type}</TableCell>
                          <TableCell className="font-mono">{fmtNum(log.horimeter_at_service)}h</TableCell>
                          <TableCell className="text-xs">
                            {items.length > 0
                              ? items.map((i: any) => `${i.inventory_item_name} (${i.quantity})`).join(', ')
                              : '—'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{log.notes || '—'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>
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
