import { AppLayout } from '@/components/AppLayout';
import { inventoryItems } from '@/data/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Package } from 'lucide-react';

export default function InventoryPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Estoque de Peças</h1>
          <p className="text-sm text-muted-foreground mt-1">Catálogo de peças e controle de quantidades</p>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Peça</TableHead>
                  <TableHead>Fabricante</TableHead>
                  <TableHead>Part Number</TableHead>
                  <TableHead>Vida Útil</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Local</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventoryItems.map(item => {
                  const isLow = item.quantity <= item.minStock;
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">{item.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{item.manufacturer}</TableCell>
                      <TableCell className="font-mono text-sm">{item.partNumber}</TableCell>
                      <TableCell className="font-mono text-sm">{item.estimatedLife.toLocaleString()}h</TableCell>
                      <TableCell>
                        <Badge variant={isLow ? 'destructive' : 'secondary'} className="font-mono">
                          {item.quantity} {isLow && `(mín: ${item.minStock})`}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.location}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
