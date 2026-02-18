import { AppLayout } from '@/components/AppLayout';
import { StatusBadge, WearProgress } from '@/components/StatusIndicators';
import { motors, maintenancePlans, componentPositions } from '@/data/mockData';
import { getMaintenanceStatus } from '@/types/models';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

export default function MaintenancePage() {
  const navigate = useNavigate();

  const enrichedPlans = maintenancePlans.map(plan => {
    const cp = componentPositions.find(c => c.id === plan.componentPositionId);
    const motor = motors.find(m => m.id === cp?.motorId);
    const status = getMaintenanceStatus(plan.currentValue, plan.lastExecutionValue, plan.interval);
    return { ...plan, motor, status };
  }).sort((a, b) => {
    const order = { critical: 0, warning: 1, ok: 2 };
    return order[a.status] - order[b.status];
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Planos de Manutenção</h1>
          <p className="text-sm text-muted-foreground mt-1">Todas as preventivas da frota, ordenadas por urgência</p>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Motor</TableHead>
                  <TableHead>Componente</TableHead>
                  <TableHead>Tarefa</TableHead>
                  <TableHead>Intervalo</TableHead>
                  <TableHead>Progresso</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrichedPlans.map(plan => (
                  <TableRow
                    key={plan.id}
                    className="cursor-pointer hover:bg-accent/50"
                    onClick={() => plan.motor && navigate(`/motor/${plan.motor.id}`)}
                  >
                    <TableCell className="font-medium text-sm">{plan.motor?.name ?? '—'}</TableCell>
                    <TableCell className="text-sm">{plan.componentName}</TableCell>
                    <TableCell className="text-sm">{plan.task}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {plan.interval}{plan.triggerType === 'hours' ? 'h' : plan.triggerType === 'starts' ? ' arr.' : ' meses'}
                      </Badge>
                    </TableCell>
                    <TableCell className="w-48">
                      <WearProgress
                        currentValue={plan.currentValue}
                        lastExecution={plan.lastExecutionValue}
                        interval={plan.interval}
                      />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={plan.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
