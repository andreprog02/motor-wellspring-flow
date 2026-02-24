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
import { ArrowLeft, Clock, Zap, Cylinder, Fuel, CalendarDays, Droplets, CheckCircle2, AlertTriangle, XCircle, Wrench } from 'lucide-react';
import { format } from 'date-fns';

const fuelLabels: Record<string, string> = { biogas: 'Biogás', landfill_gas: 'Gás de Aterro', natural_gas: 'Gás Natural' };

const maintenanceTypeLabels: Record<string, string> = {
  oil_change: 'Troca de Óleo',
  spark_plug: 'Vela',
  liner: 'Camisa',
  piston: 'Pistão',
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
  turbine: 'Turbina',
  intercooler: 'Intercooler',
  oil_exchanger: 'Trocador de Óleo',
  oil_change: 'Troca de Óleo',
};

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
  const equipmentLogs = (logs.data || []).filter((l: any) => l.equipment_id === id);
  const allLogItems = logItems.data || [];

  const okPlans = allPlans.filter(p => getStatus(equipment.total_horimeter, p.last_execution_value, p.interval_value) === 'ok');
  const warningPlans = allPlans.filter(p => getStatus(equipment.total_horimeter, p.last_execution_value, p.interval_value) === 'warning');
  const criticalPlans = allPlans.filter(p => getStatus(equipment.total_horimeter, p.last_execution_value, p.interval_value) === 'critical');

  // Group plans by unique component_type + task
  const uniquePlans = allPlans.reduce<MaintenancePlan[]>((acc, plan) => {
    const exists = acc.find(p => p.component_type === plan.component_type && p.task === plan.task);
    if (!exists) acc.push(plan);
    return acc;
  }, []);

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
                <p className="font-bold">{equipment.total_horimeter}h</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Arranques</p>
                <p className="font-bold">{equipment.total_starts}</p>
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
        <Tabs defaultValue="plans">
          <TabsList>
            <TabsTrigger value="plans">Planos de Manutenção</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="plans" className="mt-4">
            {uniquePlans.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  Nenhum plano de manutenção cadastrado.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {uniquePlans.map(plan => {
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
                          <span className="text-xs font-mono text-muted-foreground w-28 text-right">
                            {usage}/{plan.interval_value} {triggerLabels[plan.trigger_type]?.toLowerCase() || plan.trigger_type}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

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
                          <TableCell className="font-mono">{log.horimeter_at_service}h</TableCell>
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
    </AppLayout>
  );
}
