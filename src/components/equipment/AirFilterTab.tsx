import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantId } from '@/hooks/useTenantId';
import { formatLocalDate } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Wind, CalendarDays, PlusCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AirFilterTabProps {
  equipmentId: string;
  equipmentHorimeter: number;
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

export function AirFilterTab({ equipmentId, equipmentHorimeter }: AirFilterTabProps) {
  const queryClient = useQueryClient();
  const tenantId = useTenantId();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [changeDate, setChangeDate] = useState(formatLocalDate());
  const [changeHorimeter, setChangeHorimeter] = useState(String(equipmentHorimeter));
  const [changeNotes, setChangeNotes] = useState('');

  // Fetch air filter change logs
  const airFilterLogs = useQuery({
    queryKey: ['maintenance_logs', equipmentId, 'air_filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_logs')
        .select('*')
        .eq('equipment_id', equipmentId)
        .eq('maintenance_type', 'air_filter')
        .order('service_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch maintenance plans for air_filter
  const airFilterPlans = useQuery({
    queryKey: ['component_maintenance_plans', equipmentId, 'air_filter'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('component_maintenance_plans')
        .select('*')
        .eq('equipment_id', equipmentId)
        .eq('component_type', 'air_filter');
      if (error) throw error;
      return data as Array<{
        id: string;
        task: string;
        trigger_type: string;
        interval_value: number;
        last_execution_value: number;
        last_execution_date: string | null;
      }>;
    },
  });

  // Log air filter change
  const logAirFilterChange = useMutation({
    mutationFn: async () => {
      const horimeter = parseFloat(changeHorimeter) || 0;
      const { error } = await supabase.from('maintenance_logs').insert({
        equipment_id: equipmentId,
        maintenance_type: 'air_filter',
        service_date: changeDate,
        horimeter_at_service: horimeter,
        notes: changeNotes || null,
        tenant_id: tenantId,
      });
      if (error) throw error;

      // Update maintenance plans
      const plans = airFilterPlans.data || [];
      for (const plan of plans) {
        await (supabase as any)
          .from('component_maintenance_plans')
          .update({
            last_execution_value: horimeter,
            last_execution_date: changeDate,
          })
          .eq('id', plan.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance_logs', equipmentId, 'air_filter'] });
      queryClient.invalidateQueries({ queryKey: ['component_maintenance_plans', equipmentId, 'air_filter'] });
      queryClient.invalidateQueries({ queryKey: ['component_maintenance_plans', equipmentId] });
      toast.success('Troca de filtro de ar registrada!');
      setDialogOpen(false);
      setChangeNotes('');
    },
    onError: () => toast.error('Erro ao registrar troca de filtro de ar.'),
  });

  const logs = airFilterLogs.data || [];
  const plans = airFilterPlans.data || [];
  const lastChange = logs[0];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Wind className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Última Troca</p>
              <p className="font-bold text-sm">
                {lastChange ? format(new Date(lastChange.service_date + 'T12:00:00'), 'dd/MM/yyyy') : '—'}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Horímetro na última troca</p>
              <p className="font-bold text-sm">
                {lastChange ? `${fmtNum(lastChange.horimeter_at_service)}h` : '—'}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Total de Trocas</p>
              <p className="font-bold text-sm">{logs.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Maintenance Plans Status */}
      {plans.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Planos de Manutenção</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {plans.map(plan => {
              const usage = equipmentHorimeter - plan.last_execution_value;
              const status = getStatus(equipmentHorimeter, plan.last_execution_value, plan.interval_value);
              const percent = getPercent(equipmentHorimeter, plan.last_execution_value, plan.interval_value);
              return (
                <Card key={plan.id} className={cn(
                  status === 'critical' ? 'border-[hsl(var(--status-critical))]/40' :
                  status === 'warning' ? 'border-[hsl(var(--status-warning))]/40' : ''
                )}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{plan.task}</span>
                      <Badge variant={status === 'critical' ? 'destructive' : status === 'warning' ? 'outline' : 'secondary'} className={cn(
                        'text-[10px]',
                        status === 'warning' && 'border-[hsl(var(--status-warning))] text-[hsl(var(--status-warning))]',
                        status === 'ok' && 'text-[hsl(var(--status-ok))]'
                      )}>
                        {fmtNum(usage)}h / {fmtNum(plan.interval_value)}h
                      </Badge>
                    </div>
                    <Progress value={percent} className={cn(
                      'h-2',
                      status === 'critical' ? '[&>div]:bg-[hsl(var(--status-critical))]' :
                      status === 'warning' ? '[&>div]:bg-[hsl(var(--status-warning))]' :
                      '[&>div]:bg-[hsl(var(--status-ok))]'
                    )} />
                    {plan.last_execution_date && (
                      <p className="text-[10px] text-muted-foreground">
                        Último serviço: {format(new Date(plan.last_execution_date + 'T12:00:00'), 'dd/MM/yyyy')}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="flex justify-end">
        <Button onClick={() => {
          setChangeDate(formatLocalDate());
          setChangeHorimeter(String(equipmentHorimeter));
          setChangeNotes('');
          setDialogOpen(true);
        }}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Registrar Troca de Filtro de Ar
        </Button>
      </div>

      {/* History Table */}
      {logs.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">Histórico de Trocas</h3>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Horímetro</TableHead>
                  <TableHead>Observações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell>{format(new Date(log.service_date + 'T12:00:00'), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{fmtNum(log.horimeter_at_service)}h</TableCell>
                    <TableCell className="text-muted-foreground">{log.notes || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Register Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Troca de Filtro de Ar</DialogTitle>
            <DialogDescription>Preencha os dados da troca do filtro de ar.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data da Troca</Label>
                <Input type="date" value={changeDate} onChange={e => setChangeDate(e.target.value)} />
              </div>
              <div>
                <Label>Horímetro</Label>
                <Input type="number" value={changeHorimeter} onChange={e => setChangeHorimeter(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={changeNotes} onChange={e => setChangeNotes(e.target.value)} placeholder="Observações opcionais..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => logAirFilterChange.mutate()} disabled={logAirFilterChange.isPending}>
              {logAirFilterChange.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
