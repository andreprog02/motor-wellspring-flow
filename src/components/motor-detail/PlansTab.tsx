import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { StatusBadge, WearProgress } from '@/components/StatusIndicators';
import { getMaintenanceStatus } from '@/types/models';
import type { maintenancePlans } from '@/data/mockData';

interface PlansTabProps {
  plans: typeof maintenancePlans;
}

export function PlansTab({ plans }: PlansTabProps) {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Componente</TableHead>
              <TableHead>Tarefa</TableHead>
              <TableHead>Gatilho</TableHead>
              <TableHead>Progresso</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.map(plan => {
              const status = getMaintenanceStatus(plan.currentValue, plan.lastExecutionValue, plan.interval);
              return (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium text-sm">{plan.componentName}</TableCell>
                  <TableCell className="text-sm">{plan.task}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {plan.interval} {plan.triggerType === 'hours' ? 'h' : plan.triggerType === 'starts' ? 'arr.' : 'meses'}
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
                    <StatusBadge status={status} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
