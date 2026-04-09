import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Printer, AlertTriangle, AlertCircle, CheckCircle2, ClipboardList, Settings } from 'lucide-react';
import { useEquipmentStore } from '@/hooks/useEquipmentStore';
import { useMaintenanceStore } from '@/hooks/useMaintenanceStore';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

type StatusFilter = 'all' | 'critical' | 'warning' | 'ok';

const TRIGGER_LABELS: Record<string, string> = {
  hours: 'Horas',
  starts: 'Arranques',
  months: 'Meses',
  weeks: 'Semanas',
  days: 'Dias',
};

function fmtNum(n: number) {
  return n.toLocaleString('pt-BR');
}

function getStatus(percent: number): 'ok' | 'warning' | 'critical' {
  if (percent >= 100) return 'critical';
  if (percent >= 85) return 'warning';
  return 'ok';
}

const statusLabel: Record<string, string> = {
  ok: 'Em dia',
  warning: 'Atenção',
  critical: 'Vencido',
};

const statusColor: Record<string, string> = {
  ok: 'bg-emerald-500',
  warning: 'bg-amber-500',
  critical: 'bg-red-500',
};

const statusBadgeVariant: Record<string, 'default' | 'secondary' | 'destructive'> = {
  ok: 'default',
  warning: 'secondary',
  critical: 'destructive',
};

export default function MaintenanceReportPage() {
  const { profile, tenant } = useAuth();
  const { equipments } = useEquipmentStore();
  const { logs } = useMaintenanceStore();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [equipmentFilter, setEquipmentFilter] = useState('all');
  const [historyDays, setHistoryDays] = useState('90');
  const [showHistory, setShowHistory] = useState(true);

  const plans = useQuery({
    queryKey: ['component_maintenance_plans_report'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('component_maintenance_plans')
        .select('*');
      if (error) throw error;
      return data as any[];
    },
  });

  const allEquipments = useMemo(() => {
    if (!equipments.data) return [];
    return equipments.data.filter((e: any) => e.equipment_type === 'gerador');
  }, [equipments.data]);

  const filteredEquipments = useMemo(() => {
    if (equipmentFilter === 'all') return allEquipments;
    return allEquipments.filter((e: any) => e.id === equipmentFilter);
  }, [allEquipments, equipmentFilter]);

  // Build component plans per equipment
  const equipmentBlocks = useMemo(() => {
    if (!plans.data || !filteredEquipments.length) return [];

    return filteredEquipments.map((eq: any) => {
      const eqPlans = (plans.data as any[])
        .filter((p: any) => p.equipment_id === eq.id)
        .map((p: any) => {
          const current = eq.total_horimeter ?? 0;
          const last = p.last_execution_value ?? 0;
          const interval = p.interval_value ?? 1;
          const usage = current - last;
          const percent = Math.min(Math.round((usage / interval) * 100), 100);
          const status = getStatus(percent);
          return { ...p, current, usage, percent, status };
        })
        .sort((a: any, b: any) => a.component_type.localeCompare(b.component_type, 'pt-BR'));

      const counts = { ok: 0, warning: 0, critical: 0 };
      eqPlans.forEach((p: any) => counts[p.status as keyof typeof counts]++);

      return { equipment: eq, plans: eqPlans, counts };
    });
  }, [filteredEquipments, plans.data]);

  // Filter blocks by status
  const visibleBlocks = useMemo(() => {
    if (statusFilter === 'all') return equipmentBlocks;
    return equipmentBlocks
      .map(block => ({
        ...block,
        plans: block.plans.filter((p: any) => p.status === statusFilter),
      }))
      .filter(block => block.plans.length > 0);
  }, [equipmentBlocks, statusFilter]);

  // Global KPIs
  const kpis = useMemo(() => {
    const all = equipmentBlocks.flatMap(b => b.plans);
    const critical = all.filter(p => p.status === 'critical').length;
    const warning = all.filter(p => p.status === 'warning').length;
    const ok = all.filter(p => p.status === 'ok').length;

    // Services in period
    const now = new Date();
    const daysNum = historyDays === 'all' ? 99999 : parseInt(historyDays);
    const cutoff = new Date(now.getTime() - daysNum * 86400000);
    const services = (logs.data || []).filter((l: any) => new Date(l.service_date) >= cutoff).length;

    return { critical, warning, ok, services };
  }, [equipmentBlocks, logs.data, historyDays]);

  // History logs
  const historyLogs = useMemo(() => {
    if (!logs.data) return [];
    const now = new Date();
    const daysNum = historyDays === 'all' ? 99999 : parseInt(historyDays);
    const cutoff = new Date(now.getTime() - daysNum * 86400000);

    let filtered = (logs.data as any[]).filter((l: any) => new Date(l.service_date) >= cutoff);

    if (equipmentFilter !== 'all') {
      filtered = filtered.filter((l: any) => l.equipment_id === equipmentFilter);
    }

    return filtered;
  }, [logs.data, historyDays, equipmentFilter]);

  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR');
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const historyLabel = historyDays === 'all' ? 'Todo o período' : `Últimos ${historyDays} dias`;

  return (
    <AppLayout>
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Filters - hidden on print */}
        <div className="print:hidden flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="critical">Vencidos</SelectItem>
                <SelectItem value="warning">Próximos</SelectItem>
                <SelectItem value="ok">Em dia</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Equipamento</Label>
            <Select value={equipmentFilter} onValueChange={setEquipmentFilter}>
              <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os equipamentos</SelectItem>
                {allEquipments.map((e: any) => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Período histórico</Label>
            <Select value={historyDays} onValueChange={setHistoryDays}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 dias</SelectItem>
                <SelectItem value="60">60 dias</SelectItem>
                <SelectItem value="90">90 dias</SelectItem>
                <SelectItem value="180">6 meses</SelectItem>
                <SelectItem value="all">Tudo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 pt-4">
            <Switch id="show-history" checked={showHistory} onCheckedChange={setShowHistory} />
            <Label htmlFor="show-history" className="text-xs">Exibir histórico</Label>
          </div>
          <Button onClick={() => window.print()} className="ml-auto print:hidden">
            <Printer className="h-4 w-4 mr-2" /> Imprimir / Salvar PDF
          </Button>
        </div>

        {/* Print header - only visible on print */}
        <div className="hidden print:block">
          <div className="flex justify-between items-start border-b-2 border-foreground pb-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                <Settings className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold">Hub Engine</h1>
                <p className="text-xs text-muted-foreground">Asset Management</p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-base font-bold">Relatório de Manutenção Preventiva</h2>
              <p className="text-xs text-muted-foreground">Período: {historyLabel}</p>
              <p className="text-xs text-muted-foreground">Gerado em {dateStr} às {timeStr}</p>
            </div>
          </div>
          <div className="flex gap-6 text-xs bg-muted p-2 rounded mb-4">
            <span><strong>Empresa:</strong> {tenant?.name || '—'}</span>
            <span><strong>Responsável:</strong> {profile?.full_name || '—'}</span>
            <span><strong>Equipamentos:</strong> {allEquipments.length}</span>
          </div>
        </div>

        {/* Screen header */}
        <div className="print:hidden">
          <h1 className="text-2xl font-bold">Relatório de Manutenção Preventiva</h1>
          <p className="text-sm text-muted-foreground">Gerado em {dateStr} às {timeStr}</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{kpis.critical}</p>
                  <p className="text-xs text-muted-foreground">Vencidas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="text-2xl font-bold">{kpis.warning}</p>
                  <p className="text-xs text-muted-foreground">Próximas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <div>
                  <p className="text-2xl font-bold">{kpis.ok}</p>
                  <p className="text-xs text-muted-foreground">Em dia</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{kpis.services}</p>
                  <p className="text-xs text-muted-foreground">Serviços realizados</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Equipment blocks */}
        {visibleBlocks.map(block => {
          const eq = block.equipment;
          const mfr = (equipments.data as any[])?.find((e: any) => e.id === eq.id);
          return (
            <Card key={eq.id} className="report-equipment-block">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{eq.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      S/N: {eq.serial_number || '—'}
                      {eq.installation_date && ` · Instalação: ${new Date(eq.installation_date).toLocaleDateString('pt-BR')}`}
                    </p>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <div className="text-center">
                      <p className="text-lg font-bold font-mono">{fmtNum(eq.total_horimeter)}</p>
                      <p className="text-[10px] text-muted-foreground">Horímetro</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold font-mono">{fmtNum(eq.total_starts)}</p>
                      <p className="text-[10px] text-muted-foreground">Arranques</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  {block.counts.critical > 0 && (
                    <Badge variant="destructive" className="text-[10px]">{block.counts.critical} vencido(s)</Badge>
                  )}
                  {block.counts.warning > 0 && (
                    <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-800 border-amber-300">{block.counts.warning} próximo(s)</Badge>
                  )}
                  {block.counts.ok > 0 && (
                    <Badge className="text-[10px] bg-emerald-100 text-emerald-800 border-emerald-300">{block.counts.ok} em dia</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Componente</TableHead>
                      <TableHead className="text-xs">Tarefa</TableHead>
                      <TableHead className="text-xs">Periodicidade</TableHead>
                      <TableHead className="text-xs">Última execução</TableHead>
                      <TableHead className="text-xs w-[180px]">Progresso</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {block.plans.map((p: any) => (
                      <TableRow
                        key={p.id}
                        className={cn(
                          p.status === 'critical' && 'bg-red-50 dark:bg-red-950/20',
                          p.status === 'warning' && 'bg-amber-50 dark:bg-amber-950/20',
                        )}
                      >
                        <TableCell className="text-xs font-medium">{p.component_type}</TableCell>
                        <TableCell className="text-xs">{p.task}</TableCell>
                        <TableCell className="text-xs font-mono">
                          {fmtNum(p.interval_value)} {TRIGGER_LABELS[p.trigger_type] || p.trigger_type}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {fmtNum(p.last_execution_value)} {TRIGGER_LABELS[p.trigger_type] || ''}
                          {p.last_execution_date && (
                            <span className="block text-muted-foreground">
                              {new Date(p.last_execution_date).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-2">
                            <Progress
                              value={p.percent}
                              className={cn(
                                "h-2 flex-1",
                                p.status === 'critical' && '[&>div]:bg-red-500',
                                p.status === 'warning' && '[&>div]:bg-amber-500',
                                p.status === 'ok' && '[&>div]:bg-emerald-500',
                              )}
                            />
                            <span className="text-[10px] font-mono w-8 text-right">{p.percent}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={statusBadgeVariant[p.status]}
                            className={cn(
                              "text-[10px]",
                              p.status === 'warning' && 'bg-amber-100 text-amber-800 border-amber-300',
                              p.status === 'ok' && 'bg-emerald-100 text-emerald-800 border-emerald-300',
                            )}
                          >
                            {statusLabel[p.status]}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {block.plans.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-4">
                          Nenhum plano de manutenção vinculado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })}

        {visibleBlocks.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhum equipamento encontrado com os filtros selecionados.
            </CardContent>
          </Card>
        )}

        {/* History section */}
        {showHistory && historyLogs.length > 0 && (
          <Card className="report-equipment-block">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Histórico de Serviços — {historyLabel}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Data</TableHead>
                    <TableHead className="text-xs">Equipamento</TableHead>
                    <TableHead className="text-xs">Tipo</TableHead>
                    <TableHead className="text-xs">Horímetro</TableHead>
                    <TableHead className="text-xs">Observações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyLogs.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs font-mono">
                        {new Date(log.service_date).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-xs font-medium">{log.equipment_name}</TableCell>
                      <TableCell className="text-xs">{log.maintenance_type}</TableCell>
                      <TableCell className="text-xs font-mono">{fmtNum(log.horimeter_at_service)}h</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{log.notes || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
