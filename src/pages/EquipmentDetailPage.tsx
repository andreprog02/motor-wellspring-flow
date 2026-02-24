import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/AppLayout';
import { useEquipmentStore } from '@/hooks/useEquipmentStore';
import { useMaintenanceStore } from '@/hooks/useMaintenanceStore';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ArrowLeft, Clock, Zap, Cylinder, Fuel, CalendarDays, Droplets, CheckCircle2, AlertTriangle, XCircle, Wrench, PlusCircle } from 'lucide-react';
import { format } from 'date-fns';
import { CylinderMaintenanceDialog } from '@/components/equipment/CylinderMaintenanceDialog';

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

  const [maintDialog, setMaintDialog] = useState<{
    open: boolean;
    cylinderNumber: number;
    componentType: string;
    cylinderComponentId: string;
    installHorimeter: number;
  }>({ open: false, cylinderNumber: 0, componentType: '', cylinderComponentId: '', installHorimeter: 0 });

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

  // Get plan for a specific component type
  const getPlanForType = (type: string) => allPlans.find(p => p.component_type === type);

  // Group cylinder components by type
  const cylByType = cylinderComponentTypes.map(type => ({
    type,
    label: componentTypeLabels[type] || type,
    components: allCylComps.filter(c => c.component_type === type).sort((a, b) => a.cylinder_number - b.cylinder_number),
    plan: getPlanForType(type),
  })).filter(g => g.components.length > 0);

  const openMaintDialog = (comp: CylComp) => {
    setMaintDialog({
      open: true,
      cylinderNumber: comp.cylinder_number,
      componentType: comp.component_type,
      cylinderComponentId: comp.id,
      installHorimeter: comp.horimeter_at_install,
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
            <TabsTrigger value="plans">Planos Gerais</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          {/* One tab per cylinder component type */}
          {cylByType.map(group => {
            const plan = group.plan;
            return (
              <TabsContent key={group.type} value={group.type} className="mt-4">
                {plan && (
                  <div className="text-xs text-muted-foreground mb-3 flex items-center gap-2">
                    <Wrench className="h-3.5 w-3.5" />
                    Intervalo: <span className="font-mono font-medium">{fmtNum(plan.interval_value)} {triggerLabels[plan.trigger_type]?.toLowerCase() || plan.trigger_type}</span>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {group.components.map(comp => {
                    const usage = equipment.total_horimeter - comp.horimeter_at_install;
                    const interval = plan?.interval_value || 0;
                    const status = interval > 0 ? getStatus(equipment.total_horimeter, comp.horimeter_at_install, interval) : 'ok';
                    const percent = interval > 0 ? getPercent(equipment.total_horimeter, comp.horimeter_at_install, interval) : 0;

                    return (
                      <Card
                        key={comp.id}
                        className={
                          status === 'critical' ? 'border-[hsl(var(--status-critical))]/40' :
                          status === 'warning' ? 'border-[hsl(var(--status-warning))]/40' : ''
                        }
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-sm">{group.label} {comp.cylinder_number}</span>
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
                          <div className="text-xs text-muted-foreground space-y-1 mb-2">
                            <div className="flex justify-between">
                              <span>Instalado em:</span>
                              <span className="font-mono">{fmtNum(comp.horimeter_at_install)}h</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Uso:</span>
                              <span className="font-mono">{fmtNum(usage)}h</span>
                            </div>
                            {interval > 0 && (
                              <div className="flex justify-between">
                                <span>Próximo em:</span>
                                <span className="font-mono">{fmtNum(Math.max(0, interval - usage))}h</span>
                              </div>
                            )}
                          </div>
                          {interval > 0 && (
                            <Progress value={percent} className="h-1.5 mb-2" />
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full text-xs"
                            onClick={() => openMaintDialog(comp)}
                          >
                            <PlusCircle className="h-3 w-3 mr-1" />
                            Registrar Manutenção
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>
            );
          })}

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
          cylinderNumber={maintDialog.cylinderNumber}
          componentType={maintDialog.componentType}
          cylinderComponentId={maintDialog.cylinderComponentId}
          currentInstallHorimeter={maintDialog.installHorimeter}
        />
      )}
    </AppLayout>
  );
}
