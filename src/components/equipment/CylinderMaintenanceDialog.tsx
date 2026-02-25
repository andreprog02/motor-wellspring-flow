import { useState, useEffect } from 'react';
import { formatLocalDate } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const componentTypeLabels: Record<string, string> = {
  spark_plug: 'Vela',
  liner: 'Camisa',
  piston: 'Pistão',
  connecting_rod: 'Biela',
  bearing: 'Bronzina',
};

interface CylComp {
  id: string;
  equipment_id: string;
  cylinder_number: number;
  component_type: string;
  horimeter_at_install: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipmentId: string;
  equipmentHorimeter: number;
  componentType: string;
  /** All cylinder components of this type for this equipment */
  allComponents: CylComp[];
  /** Pre-selected cylinder numbers (optional, for single-click) */
  preSelectedCylinders?: number[];
}

export function CylinderMaintenanceDialog({
  open, onOpenChange, equipmentId, equipmentHorimeter,
  componentType, allComponents, preSelectedCylinders,
}: Props) {
  const qc = useQueryClient();
  const [selectedCylinders, setSelectedCylinders] = useState<number[]>(preSelectedCylinders || []);
  const [task, setTask] = useState('');
  const [serviceType, setServiceType] = useState('inspection');
  const [horimeter, setHorimeter] = useState(equipmentHorimeter);
  const [serviceDate, setServiceDate] = useState(formatLocalDate());
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Fetch maintenance plans for this equipment + component type to get task options
  const plansQuery = useQuery({
    queryKey: ['component_maintenance_plans', equipmentId, componentType],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('component_maintenance_plans')
        .select('*')
        .eq('equipment_id', equipmentId)
        .eq('component_type', componentType);
      if (error) throw error;
      return data as Array<{ id: string; task: string; trigger_type: string; interval_value: number; last_execution_value: number }>;
    },
    enabled: open,
  });

  const planTasks = plansQuery.data || [];
  // Get unique tasks from plans
  const uniqueTasks = [...new Set(planTasks.map(p => p.task))];

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedCylinders(preSelectedCylinders || []);
      setHorimeter(equipmentHorimeter);
      setServiceDate(formatLocalDate());
      setNotes('');
      setServiceType('inspection');
      setTask(uniqueTasks.length > 0 ? uniqueTasks[0] : '');
    }
  }, [open, preSelectedCylinders, equipmentHorimeter]);

  // Update task when plans load
  useEffect(() => {
    if (uniqueTasks.length > 0 && !task) {
      setTask(uniqueTasks[0]);
    }
  }, [uniqueTasks]);

  const toggleCylinder = (num: number) => {
    setSelectedCylinders(prev =>
      prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num].sort((a, b) => a - b)
    );
  };

  const selectAll = () => {
    const allNums = allComponents.map(c => c.cylinder_number);
    setSelectedCylinders(prev => prev.length === allNums.length ? [] : allNums);
  };

  const handleSubmit = async () => {
    if (selectedCylinders.length === 0) {
      toast.error('Selecione pelo menos um cilindro');
      return;
    }
    setSaving(true);
    try {
      const cylLabel = selectedCylinders.map(n => n.toString()).join(', ');
      const taskLabel = task || (serviceType === 'replacement' ? 'Substituição' : 'Inspeção');

      // 1. Create maintenance log
      const { data: log, error: logErr } = await (supabase as any)
        .from('maintenance_logs')
        .insert({
          equipment_id: equipmentId,
          maintenance_type: componentType,
          horimeter_at_service: horimeter,
          notes: `Cil. ${cylLabel} - ${componentTypeLabels[componentType]} - ${taskLabel}${notes ? ` - ${notes}` : ''}`,
          service_date: serviceDate,
        })
        .select()
        .single();
      if (logErr) throw logErr;

      // 2. For each selected cylinder
      for (const cylNum of selectedCylinders) {
        const comp = allComponents.find(c => c.cylinder_number === cylNum);
        if (!comp) continue;

        // If replacement, update cylinder component horimeter
        if (serviceType === 'replacement') {
          await (supabase as any)
            .from('cylinder_components')
            .update({ horimeter_at_install: horimeter })
            .eq('id', comp.id);
        }
      }

      // 3. Update maintenance plan last_execution_value
      await (supabase as any)
        .from('component_maintenance_plans')
        .update({ last_execution_value: horimeter })
        .eq('equipment_id', equipmentId)
        .eq('component_type', componentType);

      // 4. Update equipment horimeter if higher
      if (horimeter > equipmentHorimeter) {
        await (supabase as any)
          .from('equipments')
          .update({ total_horimeter: horimeter })
          .eq('id', equipmentId);
      }

      qc.invalidateQueries({ queryKey: ['maintenance_logs'] });
      qc.invalidateQueries({ queryKey: ['cylinder_components'] });
      qc.invalidateQueries({ queryKey: ['component_maintenance_plans'] });
      qc.invalidateQueries({ queryKey: ['equipments'] });

      toast.success(`Manutenção registrada — ${componentTypeLabels[componentType]} — Cil. ${cylLabel}`);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const label = componentTypeLabels[componentType] || componentType;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar Manutenção — {label}s</DialogTitle>
          <DialogDescription>
            Selecione os cilindros e o tipo de serviço.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
          {/* Cylinder selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Cilindros</Label>
              <Button variant="ghost" size="sm" className="text-xs h-6" onClick={selectAll}>
                {selectedCylinders.length === allComponents.length ? 'Desmarcar todos' : 'Selecionar todos'}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {allComponents.map(comp => (
                <label
                  key={comp.id}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border cursor-pointer text-sm transition-colors ${
                    selectedCylinders.includes(comp.cylinder_number)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card hover:bg-accent'
                  }`}
                >
                  <Checkbox
                    checked={selectedCylinders.includes(comp.cylinder_number)}
                    onCheckedChange={() => toggleCylinder(comp.cylinder_number)}
                    className="sr-only"
                  />
                  {label} {comp.cylinder_number}
                </label>
              ))}
            </div>
          </div>

          {/* Task from plans */}
          <div>
            <Label>Tarefa</Label>
            {uniqueTasks.length > 0 ? (
              <Select value={task} onValueChange={setTask}>
                <SelectTrigger><SelectValue placeholder="Selecione a tarefa..." /></SelectTrigger>
                <SelectContent>
                  {uniqueTasks.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                  <SelectItem value="_custom">Outro (personalizado)</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Input value={task} onChange={e => setTask(e.target.value)} placeholder="Ex: Substituição, Limpeza, Inspeção..." />
            )}
            {task === '_custom' && (
              <Input className="mt-2" value="" onChange={e => setTask(e.target.value)} placeholder="Digite a tarefa..." />
            )}
          </div>

          {/* Service type */}
          <div>
            <Label>Tipo de Serviço</Label>
            <Select value={serviceType} onValueChange={setServiceType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="inspection">Inspeção</SelectItem>
                <SelectItem value="replacement">Substituição</SelectItem>
                <SelectItem value="cleaning">Limpeza</SelectItem>
                <SelectItem value="lubrication">Lubrificação</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Horimeter */}
          <div>
            <Label>Horímetro no Serviço</Label>
            <Input
              type="number"
              value={horimeter}
              onChange={e => setHorimeter(Number(e.target.value))}
            />
          </div>

          {/* Date */}
          <div>
            <Label>Data do Serviço</Label>
            <Input type="date" value={serviceDate} onChange={e => setServiceDate(e.target.value)} />
          </div>

          {/* Notes */}
          <div>
            <Label>Observações</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observações..." rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving || selectedCylinders.length === 0}>
            {saving ? 'Salvando...' : `Registrar (${selectedCylinders.length} cil.)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
