import { InventoryItemDisplay } from '@/hooks/useInventoryStore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, Pencil, Trash2 } from 'lucide-react';

interface Props {
  items: InventoryItemDisplay[];
  onEdit: (item: InventoryItemDisplay) => void;
  onDelete: (id: string) => void;
  emptyMessage?: string;
  showTipo?: boolean;
}

export function InventoryTable({ items, onEdit, onDelete, emptyMessage = 'Nenhum item cadastrado.', showTipo = true }: Props) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Código</TableHead>
          <TableHead>Cód. Alt. 01</TableHead>
          <TableHead>Cód. Alt. 02</TableHead>
          <TableHead>Part Number</TableHead>
          <TableHead>Nome</TableHead>
          <TableHead>Aplicação</TableHead>
          {showTipo && <TableHead>Tipo</TableHead>}
          <TableHead>Gerador</TableHead>
          <TableHead>Qtd</TableHead>
          <TableHead>Local</TableHead>
          <TableHead className="w-[100px]">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map(item => (
          <TableRow key={item.id}>
            <TableCell className="font-mono text-sm">{item.codigo || '—'}</TableCell>
            <TableCell className="font-mono text-sm">{item.codigo_alt_01 || '—'}</TableCell>
            <TableCell className="font-mono text-sm">{item.codigo_alt_02 || '—'}</TableCell>
            <TableCell className="font-mono text-sm">{item.part_number}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-medium text-sm">{item.name}</span>
              </div>
            </TableCell>
            <TableCell className="text-sm">{item.aplicacao}</TableCell>
            {showTipo && <TableCell className="text-sm">{item.tipo}</TableCell>}
            <TableCell className="text-sm text-muted-foreground">{item.gerador || '—'}</TableCell>
            <TableCell>
              <Badge variant="secondary" className="font-mono">{item.quantity}</Badge>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">{item.location_name}</TableCell>
            <TableCell>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => onEdit(item)}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => onDelete(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
        {items.length === 0 && (
          <TableRow>
            <TableCell colSpan={showTipo ? 11 : 10} className="text-center py-8 text-muted-foreground">
              {emptyMessage}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
