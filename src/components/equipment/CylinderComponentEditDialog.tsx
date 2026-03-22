import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const componentTypeLabels: Record<string, string> = {
  spark_plug: 'Vela',
  liner: 'Camisa',
  piston: 'Pistão',
  connecting_rod: 'Biela',
  bearing: 'Bronzina',
};

const triggerLabels: Record<string, string> = {
  hours: 'Horas',
  months: 'Meses',
  starts: 'Arranques',
};

const triggerUnits: Record<string, string> = {
  hours: 'h',
  months: 'meses',
  starts: 'arr.',
};

interface MaintenancePlan {
  id: string;
  task: string;
  last_execution_value: number;
  interval_value: number;
  component_id: string | null;
  trigger_type: string;
  last_execution_date: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipmentId: string;
  equipmentHorimeter: number;
  componentType: string;
  cylinderNumber: number;
  componentId: string;
  currentHorimeterAtInstall: number;
  plans: MaintenancePlan[];
}

export function CylinderComponentEditDialog({
  open, onOpenChange, equipmentId, equipmentHorimeter,
  componentType, cylinderNumber, componentId, currentHorimeterAtInstall, plans,
}: Props) {
  const qc = useQueryClient();
  const [horimeter, setHorimeter] = useState(currentHorimeterAtInstall);
  const [planValues, setPlanValues] = useState<Record<string, number>>({});
  const [planDates, setPlanDates] = useState<Record<string, Date | undefined>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setHorimeter(currentHorimeterAtInstall);
      const vals: Record<string, number> = {};
      const dates: Record<string, Date | undefined> = {};
      plans.forEach(p => {
        vals[p.id] = p.last_execution_value;
        dates[p.id] = p.last_execution_date ? new Date(p.last_execution_date + 'T12:00:00') : undefined;
      });
      setPlanValues(vals);
      setPlanDates(dates);
    }
  }, [open, currentHorimeterAtInstall, plans]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await (supabase as any)
        .from('cylinder_components')
        .update({ horimeter_at_install: horimeter })
        .eq('id', componentId);

      for (const plan of plans) {
        const newVal = planValues[plan.id];
        const newDate = planDates[plan.id];
        const dateStr = newDate ? format(newDate, 'yyyy-MM-dd') : null;
        
        const updates: any = {};
        if (newVal !== undefined && newVal !== plan.last_execution_value) {
          updates.last_execution_value = newVal;
        }
        if (dateStr !== plan.last_execution_date) {
          updates.last_execution_date = dateStr;
        }
        if (Object.keys(updates).length > 0) {
          await (supabase as any)
            .from('component_maintenance_plans')
            .update(updates)
            .eq('id', plan.id);
        }
      }

      qc.invalidateQueries({ queryKey: ['cylinder_components'] });
      qc.invalidateQueries({ queryKey: ['component_maintenance_plans'] });

      toast.success(`${componentTypeLabels[componentType] || componentType} ${cylinderNumber} atualizada`);
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar {label} {cylinderNumber}</DialogTitle>
          <DialogDescription>
            Altere os dados de instalação e os valores das manutenções.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Horímetro na Instalação</Label>
            <Input
              type="number"
              value={horimeter}
              onChange={e => setHorimeter(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Horímetro atual do equipamento: {equipmentHorimeter.toLocaleString('pt-BR')}h
            </p>
          </div>

          {plans.length > 0 && (
            <>
              <Separator />
              <div className="space-y-4">
                <Label className="text-sm font-semibold">Manutenções Cadastradas</Label>
                {plans.map(plan => {
                  const unit = triggerUnits[plan.trigger_type] || 'h';
                  const triggerLabel = triggerLabels[plan.trigger_type] || plan.trigger_type;
                  return (
                    <div key={plan.id} className="rounded-lg border border-border p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{plan.task}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {triggerLabel} • {plan.interval_value.toLocaleString('pt-BR')}{unit}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Última execução ({triggerLabel.toLowerCase()})
                          </Label>
                          <Input
                            type="number"
                            value={planValues[plan.id] ?? plan.last_execution_value}
                            onChange={e => setPlanValues(prev => ({ ...prev, [plan.id]: Number(e.target.value) }))}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Data da execução</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal h-9",
                                  !planDates[plan.id] && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                                {planDates[plan.id] ? format(planDates[plan.id]!, "dd/MM/yyyy") : "Selecionar"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={planDates[plan.id]}
                                onSelect={d => setPlanDates(prev => ({ ...prev, [plan.id]: d }))}
                                locale={ptBR}
                                initialFocus
                                className={cn("p-3 pointer-events-auto")}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
