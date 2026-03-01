import { useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { formatLocalDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { History, ChevronDown, Pencil, Trash2, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

function fmtNum(n: number): string {
  return n.toLocaleString('pt-BR');
}

interface LogEntry {
  id: string;
  service_date: string;
  horimeter_at_service: number;
  maintenance_type: string;
  notes: string | null;
  equipment_id: string;
}

interface Props {
  logs: LogEntry[];
  cylinderNumber: number;
  componentType: string;
  componentLabel: string;
  equipmentId: string;
  equipmentHorimeter: number;
}

const serviceTypeOptions = [
  { value: 'inspection', label: 'Inspeção', icon: '🔍' },
  { value: 'replacement', label: 'Substituição', icon: '🔄' },
  { value: 'cleaning', label: 'Limpeza', icon: '🧹' },
  { value: 'lubrication', label: 'Lubrificação', icon: '🛢️' },
];

function getServiceIcon(notes: string | null) {
  if (notes?.includes('Substituição')) return '🔄 Substituição';
  if (notes?.includes('Limpeza')) return '🧹 Limpeza';
  if (notes?.includes('Lubrificação')) return '🛢️ Lubrificação';
  return '🔍 Inspeção';
}

export function CylinderLogHistory({ logs, cylinderNumber, componentType, componentLabel, equipmentId, equipmentHorimeter }: Props) {
  const qc = useQueryClient();
  const [editLog, setEditLog] = useState<LogEntry | null>(null);
  const [deleteLogId, setDeleteLogId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [editDate, setEditDate] = useState('');
  const [editHorimeter, setEditHorimeter] = useState(0);
  const [editNotes, setEditNotes] = useState('');

  const openEdit = (log: LogEntry) => {
    setEditLog(log);
    setEditDate(log.service_date);
    setEditHorimeter(log.horimeter_at_service);
    setEditNotes(log.notes || '');
  };

  const handleSaveEdit = async () => {
    if (!editLog) return;
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('maintenance_logs')
        .update({
          service_date: editDate,
          horimeter_at_service: editHorimeter,
          notes: editNotes,
        })
        .eq('id', editLog.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['maintenance_logs'] });
      toast.success('Registro atualizado!');
      setEditLog(null);
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteLogId) return;
    setSaving(true);
    try {
      // Delete related log items first
      await (supabase as any)
        .from('maintenance_log_items')
        .delete()
        .eq('maintenance_log_id', deleteLogId);

      const { error } = await (supabase as any)
        .from('maintenance_logs')
        .delete()
        .eq('id', deleteLogId);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['maintenance_logs'] });
      qc.invalidateQueries({ queryKey: ['maintenance_log_items'] });
      toast.success('Registro excluído!');
      setDeleteLogId(null);
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (logs.length === 0) return null;

  return (
    <>
      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full text-xs mt-2 text-muted-foreground">
            <History className="h-3 w-3 mr-1" />
            Histórico ({logs.length})
            <ChevronDown className="h-3 w-3 ml-auto" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Separator className="my-2" />
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {logs.map((log) => (
              <div key={log.id} className="text-xs flex items-center gap-2 py-1 group hover:bg-accent/50 rounded px-1">
                <span className="font-mono text-muted-foreground whitespace-nowrap">
                  {format(new Date(log.service_date), 'dd/MM/yy')}
                </span>
                <span className="font-mono whitespace-nowrap">{fmtNum(log.horimeter_at_service)}h</span>
                <span className="text-muted-foreground truncate flex-1">
                  {getServiceIcon(log.notes)}
                  {log.notes?.split(' - ').slice(2).join(' - ') ? ` — ${log.notes.split(' - ').slice(2).join(' - ')}` : ''}
                </span>
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => openEdit(log)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => setDeleteLogId(log.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Edit Dialog */}
      <Dialog open={!!editLog} onOpenChange={(open) => !open && setEditLog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar Registro</DialogTitle>
            <DialogDescription>Altere os dados do registro de manutenção.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Data do Serviço</Label>
              <Input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />
            </div>
            <div>
              <Label>Horímetro</Label>
              <Input type="number" value={editHorimeter} onChange={e => setEditHorimeter(Number(e.target.value))} />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditLog(null)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteLogId} onOpenChange={(open) => !open && setDeleteLogId(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Excluir Registro</DialogTitle>
            <DialogDescription>Tem certeza que deseja excluir este registro de manutenção? Esta ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteLogId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
