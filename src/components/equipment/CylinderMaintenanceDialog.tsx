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
import { useTenantId } from '@/hooks/useTenantId';

const componentTypeLabels: Record<string, string> = {
  spark_plug: 'Vela',
  liner: 'Camisa',
  piston: 'Pistão',
  connecting_rod: 'Biela',
  bearing: 'Bronzina',
};

const serviceTypeToLabel: Record<string, string> = {
  inspection: 'Inspeção',
  replacement: 'Substituição',
  cleaning: 'Limpeza',
  lubrication: 'Lubrificação',
  analysis: 'Análise',
  collection: 'Coleta',
  calibration: 'Calibração',
  adjustment: 'Regulagem',
};

interface CylComp {
  id: string;
  equipment_id: string;
  cylinder_number: number;
  component_type: string;
  horimeter_at_install: number;
}

interface SubComp {
  id: string;
  equipment_id: string;
  component_type: string;
  serial_number: string;
  horimeter: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipmentId: string;
  equipmentHorimeter: number;
  componentType: string;
  /** Cylinder components (for generators) */
  allComponents: CylComp[];
  /** Sub-components (for battery, damper, etc.) */
  subComponents?: SubComp[];
  /** Pre-selected cylinder numbers (optional, for single-click) */
  preSelectedCylinders?: number[];
}

export function CylinderMaintenanceDialog({
  open, onOpenChange, equipmentId, equipmentHorimeter,
  componentType, allComponents, subComponents, preSelectedCylinders,
}: Props) {
  const qc = useQueryClient();
  const tenantId = useTenantId();
  const [selectedCylinders, setSelectedCylinders] = useState<number[]>(preSelectedCylinders || []);
  const [selectedSubIds, setSelectedSubIds] = useState<string[]>([]);
  const [task, setTask] = useState('');
  const [serviceType, setServiceType] = useState('inspection');
  const [horimeter, setHorimeter] = useState(equipmentHorimeter);
  const [serviceDate, setServiceDate] = useState(formatLocalDate());
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const isCylinderMode = allComponents.length > 0;
  const isSubMode = !isCylinderMode && (subComponents || []).length > 0;
  const subs = subComponents || [];

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
  const uniqueTasks = [...new Set(planTasks.map(p => p.task))];

  useEffect(() => {
    if (open) {
      setSelectedCylinders(preSelectedCylinders || []);
      setSelectedSubIds([]);
      setHorimeter(equipmentHorimeter);
      setServiceDate(formatLocalDate());
      setNotes('');
      setServiceType('inspection');
      setTask(uniqueTasks.length > 0 ? uniqueTasks[0] : '');
    }
  }, [open, preSelectedCylinders, equipmentHorimeter]);

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
    if (isCylinderMode) {
      const allNums = allComponents.map(c => c.cylinder_number);
      setSelectedCylinders(prev => prev.length === allNums.length ? [] : allNums);
    } else {
      setSelectedSubIds(prev => prev.length === subs.length ? [] : subs.map(s => s.id));
    }
  };

  const toggleSub = (id: string) => {
    setSelectedSubIds(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const hasSelection = isCylinderMode ? selectedCylinders.length > 0 : selectedSubIds.length > 0;
  const selectionCount = isCylinderMode ? selectedCylinders.length : selectedSubIds.length;

  const handleSubmit = async () => {
    if (!hasSelection) {
      toast.error(isCylinderMode ? 'Selecione pelo menos um cilindro' : 'Selecione pelo menos um componente');
      return;
    }
    setSaving(true);
    try {
      const taskLabel = serviceTypeToLabel[serviceType] || serviceType;

      if (isCylinderMode) {
        const cylLabel = selectedCylinders.map(n => n.toString()).join(', ');

        const { data: log, error: logErr } = await (supabase as any)
          .from('maintenance_logs')
          .insert({
            equipment_id: equipmentId,
            maintenance_type: componentType,
            horimeter_at_service: horimeter,
            notes: `Cil. ${cylLabel} - ${componentTypeLabels[componentType] || componentType} - ${taskLabel}${notes ? ` - ${notes}` : ''}`,
            service_date: serviceDate,
            tenant_id: tenantId,
          })
          .select()
          .single();
        if (logErr) throw logErr;

        const selectedCompIds: string[] = [];
        for (const cylNum of selectedCylinders) {
          const comp = allComponents.find(c => c.cylinder_number === cylNum);
          if (!comp) continue;
          selectedCompIds.push(comp.id);
          if (serviceType === 'replacement') {
            await (supabase as any)
              .from('cylinder_components')
              .update({ horimeter_at_install: horimeter })
              .eq('id', comp.id);
          }
        }

        if (selectedCompIds.length > 0) {
          const planTaskLabel = serviceTypeToLabel[serviceType] || serviceType;
          for (const compId of selectedCompIds) {
            await (supabase as any)
              .from('component_maintenance_plans')
              .update({ last_execution_value: horimeter, last_execution_date: serviceDate })
              .eq('equipment_id', equipmentId)
              .eq('component_type', componentType)
              .eq('component_id', compId)
              .eq('task', planTaskLabel);
          }
        }

        toast.success(`Manutenção registrada — ${componentTypeLabels[componentType] || componentType} — Cil. ${cylLabel}`);
      } else {
        // Sub-component mode
        const selectedNames = subs.filter(s => selectedSubIds.includes(s.id)).map((s, i) => s.serial_number || `${componentType} ${i + 1}`);
        const subLabel = selectedNames.join(', ');

        const { error: logErr } = await (supabase as any)
          .from('maintenance_logs')
          .insert({
            equipment_id: equipmentId,
            maintenance_type: componentType,
            horimeter_at_service: horimeter,
            notes: `${subLabel} - ${taskLabel}${notes ? ` - ${notes}` : ''}`,
            service_date: serviceDate,
            tenant_id: tenantId,
          })
          .select()
          .single();
        if (logErr) throw logErr;

        // Update plans for selected sub-components
        const planTaskLabel = serviceTypeToLabel[serviceType] || serviceType;
        for (const subId of selectedSubIds) {
          await (supabase as any)
            .from('component_maintenance_plans')
            .update({ last_execution_value: horimeter, last_execution_date: serviceDate })
            .eq('equipment_id', equipmentId)
            .eq('component_type', componentType)
            .eq('component_id', subId)
            .eq('task', planTaskLabel);

          if (serviceType === 'replacement') {
            await (supabase as any)
              .from('equipment_sub_components')
              .update({ horimeter })
              .eq('id', subId);
          }
        }

        toast.success(`Manutenção registrada — ${subLabel}`);
      }

      // Update equipment horimeter if higher
      if (horimeter > equipmentHorimeter) {
        await (supabase as any)
          .from('equipments')
          .update({ total_horimeter: horimeter })
          .eq('id', equipmentId);
      }

      qc.invalidateQueries({ queryKey: ['maintenance_logs'] });
      qc.invalidateQueries({ queryKey: ['cylinder_components'] });
      qc.invalidateQueries({ queryKey: ['equipment_sub_components'] });
      qc.invalidateQueries({ queryKey: ['component_maintenance_plans'] });
      qc.invalidateQueries({ queryKey: ['equipments'] });

      onOpenChange(false);
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const label = componentTypeLabels[componentType] || componentType;
  const totalItems = isCylinderMode ? allComponents.length : subs.length;
  const allSelected = isCylinderMode
    ? selectedCylinders.length === allComponents.length
    : selectedSubIds.length === subs.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar Manutenção — {label}{totalItems > 1 ? 's' : ''}</DialogTitle>
          <DialogDescription>
            {isCylinderMode ? 'Selecione os cilindros e o tipo de serviço.' : 'Selecione os componentes e o tipo de serviço.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
          {/* Component selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>{isCylinderMode ? 'Cilindros' : 'Componentes'}</Label>
              {totalItems > 1 && (
                <Button variant="ghost" size="sm" className="text-xs h-6" onClick={selectAll}>
                  {allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {isCylinderMode ? allComponents.map(comp => (
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
              )) : subs.map((sub, idx) => (
                <label
                  key={sub.id}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border cursor-pointer text-sm transition-colors ${
                    selectedSubIds.includes(sub.id)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card hover:bg-accent'
                  }`}
                >
                  <Checkbox
                    checked={selectedSubIds.includes(sub.id)}
                    onCheckedChange={() => toggleSub(sub.id)}
                    className="sr-only"
                  />
                  {sub.serial_number || `${label} ${idx + 1}`}
                </label>
              ))}
            </div>
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
                <SelectItem value="analysis">Análise</SelectItem>
                <SelectItem value="collection">Coleta</SelectItem>
                <SelectItem value="calibration">Calibração</SelectItem>
                <SelectItem value="adjustment">Regulagem</SelectItem>
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
          <Button onClick={handleSubmit} disabled={saving || !hasSelection}>
            {saving ? 'Salvando...' : `Registrar (${selectionCount})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
