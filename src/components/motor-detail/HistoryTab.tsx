import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { maintenanceLogs } from '@/data/mockData';

interface HistoryTabProps {
  logs: typeof maintenanceLogs;
}

const serviceTypeLabels: Record<string, string> = {
  replacement: 'Troca',
  inspection: 'Inspeção',
  repair: 'Reparo',
};

export function HistoryTab({ logs }: HistoryTabProps) {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Componente</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Horímetro</TableHead>
              <TableHead>Peça</TableHead>
              <TableHead>Técnico</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map(log => (
              <TableRow key={log.id}>
                <TableCell className="font-mono text-sm">
                  {new Date(log.date).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell className="font-medium text-sm">{log.componentName}</TableCell>
                <TableCell>
                  <Badge 
                    variant={log.serviceType === 'replacement' ? 'default' : 'secondary'} 
                    className="text-xs"
                  >
                    {serviceTypeLabels[log.serviceType] || log.serviceType}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-sm">{log.horimeter.toLocaleString()}h</TableCell>
                <TableCell className="text-sm">{log.partUsed}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{log.technician}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
