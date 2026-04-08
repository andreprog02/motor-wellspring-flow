import { InventoryItemDisplay } from '@/hooks/useInventoryStore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Package, Pencil, Trash2, Eye, Plus, Minus } from 'lucide-react';

interface Props {
  items: InventoryItemDisplay[];
  onEdit: (item: InventoryItemDisplay) => void;
  onDelete: (id: string) => void;
  onQuantityChange?: (id: string, delta: number) => void;
  emptyMessage?: string;
  showTipo?: boolean;
}

export function InventoryTable({ items, onEdit, onDelete, onQuantityChange, emptyMessage = 'Nenhum item cadastrado.', showTipo = true }: Props) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
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
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="icon" variant="ghost" title="Ações"><Eye className="h-4 w-4" /></Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-auto p-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">Quantidade:</span>
                    <Button size="icon" variant="outline" className="h-7 w-7" disabled={item.quantity <= 0} onClick={() => onQuantityChange?.(item.id, -1)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Badge variant="secondary" className="font-mono min-w-[2rem] justify-center">{item.quantity}</Badge>
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => onQuantityChange?.(item.id, 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex gap-1 border-t pt-2">
                    <Button size="sm" variant="ghost" className="flex-1 text-xs" onClick={() => onEdit(item)}>
                      <Pencil className="h-3 w-3 mr-1" /> Editar
                    </Button>
                    <Button size="sm" variant="ghost" className="flex-1 text-xs text-destructive" onClick={() => onDelete(item.id)}>
                      <Trash2 className="h-3 w-3 mr-1" /> Excluir
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
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
