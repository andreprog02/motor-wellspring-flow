import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { useEquipmentStore } from '@/hooks/useEquipmentStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface MaintenancePlan {
  id: string;
  equipment_id: string;
  component_type: string;
  task: string;
  trigger_type: string;
  interval_value: number;
  last_execution_value: number;
  created_at: string;
}

const COMPONENT_TYPES = [
  { value: 'oil', label: 'Óleo' },
  { value: 'spark_plug', label: 'Vela' },
  { value: 'liner', label: 'Camisa' },
  { value: 'piston', label: 'Pistão' },
  { value: 'turbine', label: 'Turbina' },
  { value: 'intercooler', label: 'Intercooler' },
  { value: 'oil_exchanger', label: 'Trocador de Óleo' },
  { value: 'custom', label: 'Personalizado' },
];

const SERVICE_TYPES = [
  { value: 'Substituição', label: 'Substituição' },
  { value: 'Limpeza', label: 'Limpeza' },
  { value: 'Inspeção', label: 'Inspeção' },
  { value: 'Lubrificação', label: 'Lubrificação' },
];

const TRIGGER_TYPES = [
  { value: 'hours', label: 'Horas' },
  { value: 'months', label: 'Meses' },
  { value: 'starts', label: 'Arranques' },
];

export default function MaintenancePlansPage() {
  const { equipments } = useEquipmentStore();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MaintenancePlan | null>(null);
  const [filterEquipment, setFilterEquipment] = useState<string>('all');

  // Form state
  const [equipmentId, setEquipmentId] = useState('');
  const [componentType, setComponentType] = useState('');
  const [customComponentType, setCustomComponentType] = useState('');
  const [task, setTask] = useState('');
  const [triggerType, setTriggerType] = useState('hours');
  const [intervalValue, setIntervalValue] = useState('');
  const [lastExecutionValue, setLastExecutionValue] = useState('');

  const plans = useQuery({
    queryKey: ['component_maintenance_plans'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('component_maintenance_plans')
        .select('*, equipments(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as any[]).map((row: any) => ({
        ...row,
        equipment_name: row.equipments?.name ?? '',
      }));
    },
  });

  const resetForm = () => {
    setEquipmentId('');
    setComponentType('');
    setCustomComponentType('');
    setTask('');
    setTriggerType('hours');
    setIntervalValue('');
    setLastExecutionValue('');
    setEditingPlan(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (plan: any) => {
    setEditingPlan(plan);
    setEquipmentId(plan.equipment_id);
    const known = COMPONENT_TYPES.find(c => c.value === plan.component_type);
    if (known && known.value !== 'custom') {
      setComponentType(plan.component_type);
      setCustomComponentType('');
    } else {
      setComponentType('custom');
      setCustomComponentType(plan.component_type);
    }
    setTask(plan.task);
    setTriggerType(plan.trigger_type);
    setIntervalValue(String(plan.interval_value));
    setLastExecutionValue(String(plan.last_execution_value));
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    const finalComponentType = componentType === 'custom' ? customComponentType : componentType;
    if (!equipmentId || !finalComponentType || !task || !intervalValue) {
      toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }

    const payload = {
      equipment_id: equipmentId,
      component_type: finalComponentType,
      task,
      trigger_type: triggerType,
      interval_value: Number(intervalValue),
      last_execution_value: Number(lastExecutionValue) || 0,
    };

    try {
      if (editingPlan) {
        const { error } = await (supabase as any)
          .from('component_maintenance_plans')
          .update(payload)
          .eq('id', editingPlan.id);
        if (error) throw error;
        toast({ title: 'Plano atualizado com sucesso' });
      } else {
        const { error } = await (supabase as any)
          .from('component_maintenance_plans')
          .insert(payload);
        if (error) throw error;
        toast({ title: 'Plano criado com sucesso' });
      }
      qc.invalidateQueries({ queryKey: ['component_maintenance_plans'] });
      setDialogOpen(false);
      resetForm();
    } catch (err: any) {
      toast({ title: 'Erro ao salvar plano', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from('component_maintenance_plans')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Plano excluído' });
      qc.invalidateQueries({ queryKey: ['component_maintenance_plans'] });
    } catch (err: any) {
      toast({ title: 'Erro ao excluir', description: err.message, variant: 'destructive' });
    }
  };

  const triggerLabel = (t: string) => TRIGGER_TYPES.find(x => x.value === t)?.label ?? t;
  const componentLabel = (t: string) => COMPONENT_TYPES.find(x => x.value === t)?.label ?? t;

  const filteredPlans = (plans.data ?? []).filter(
    (p: any) => filterEquipment === 'all' || p.equipment_id === filterEquipment
  );

  const selectedEquipment = (equipments.data ?? []).find(e => e.id === equipmentId);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Planos de Manutenção</h1>
            <p className="text-sm text-muted-foreground">Gerencie os planos de manutenção preventiva dos equipamentos</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Novo Plano</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingPlan ? 'Editar Plano' : 'Novo Plano de Manutenção'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Equipamento *</Label>
                  <Select value={equipmentId} onValueChange={setEquipmentId}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {(equipments.data ?? []).map(eq => (
                        <SelectItem key={eq.id} value={eq.id}>{eq.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Componente *</Label>
                  <Select value={componentType} onValueChange={setComponentType}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {COMPONENT_TYPES.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {componentType === 'custom' && (
                    <Input
                      placeholder="Nome do componente personalizado"
                      value={customComponentType}
                      onChange={e => setCustomComponentType(e.target.value)}
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Serviço / Tarefa *</Label>
                  <Select value={task} onValueChange={setTask}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {SERVICE_TYPES.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Periodicidade *</Label>
                    <Select value={triggerType} onValueChange={setTriggerType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TRIGGER_TYPES.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Intervalo *</Label>
                    <Input
                      type="number"
                      placeholder="Ex: 2000"
                      value={intervalValue}
                      onChange={e => setIntervalValue(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Última Execução ({triggerLabel(triggerType)})</Label>
                  <Input
                    type="number"
                    placeholder={selectedEquipment ? String(selectedEquipment.total_horimeter) : '0'}
                    value={lastExecutionValue}
                    onChange={e => setLastExecutionValue(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Valor do horímetro/arranques na última execução ou mês de referência.
                    {selectedEquipment && triggerType === 'hours' && (
                      <> Horímetro atual: <strong>{selectedEquipment.total_horimeter}h</strong></>
                    )}
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSubmit}>
                    {editingPlan ? 'Salvar' : 'Criar Plano'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3">
          <Label className="text-sm">Filtrar por equipamento:</Label>
          <Select value={filterEquipment} onValueChange={setFilterEquipment}>
            <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {(equipments.data ?? []).map(eq => (
                <SelectItem key={eq.id} value={eq.id}>{eq.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Equipamento</TableHead>
                <TableHead>Componente</TableHead>
                <TableHead>Tarefa</TableHead>
                <TableHead>Periodicidade</TableHead>
                <TableHead>Intervalo</TableHead>
                <TableHead className="w-20">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPlans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhum plano encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPlans.map((plan: any) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">{plan.equipment_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{componentLabel(plan.component_type)}</Badge>
                    </TableCell>
                    <TableCell>{plan.task}</TableCell>
                    <TableCell>{triggerLabel(plan.trigger_type)}</TableCell>
                    <TableCell>{plan.interval_value}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(plan)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(plan.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
}
