import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  componentId: string;
  componentType: string;
  currentHorimeter: number;
  currentInstallationDate: string | null;
  equipmentTotalStarts: number;
  plans: MaintenancePlan[];
  isOtherAsset?: boolean;
}

const typeLabels: Record<string, string> = {
  starter_motor: 'Motor de Arranque',
  battery: 'Bateria',
  turbine: 'Turbina',
  intercooler: 'Intercooler',
  oil_exchanger: 'Trocador de Óleo',
  blowby: 'Blowby',
  damper: 'Damper',
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

export function SubComponentEditDialog({
  open, onOpenChange, componentId, componentType,
  currentHorimeter, currentInstallationDate, equipmentTotalStarts, plans,
  isOtherAsset = false,
}: Props) {
  const qc = useQueryClient();
  const [horimeter, setHorimeter] = useState(currentHorimeter);
  const [compName, setCompName] = useState(componentType);
  const [installDate, setInstallDate] = useState<Date | undefined>(
    currentInstallationDate ? new Date(currentInstallationDate + 'T12:00:00') : undefined
  );
  const [planValues, setPlanValues] = useState<Record<string, number>>({});
  const [planDates, setPlanDates] = useState<Record<string, Date | undefined>>({});
  const [planTriggerTypes, setPlanTriggerTypes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setHorimeter(currentHorimeter);
      setCompName(componentType);
      setInstallDate(currentInstallationDate ? new Date(currentInstallationDate + 'T12:00:00') : undefined);
      const vals: Record<string, number> = {};
      const dates: Record<string, Date | undefined> = {};
      const triggers: Record<string, string> = {};
      plans.forEach(p => {
        vals[p.id] = p.last_execution_value;
        dates[p.id] = p.last_execution_date ? new Date(p.last_execution_date + 'T12:00:00') : undefined;
        triggers[p.id] = p.trigger_type;
      });
      setPlanValues(vals);
      setPlanDates(dates);
      setPlanTriggerTypes(triggers);
    }
  }, [open, currentHorimeter, currentInstallationDate, plans, componentType]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData: any = {
        horimeter,
        installation_date: installDate ? format(installDate, 'yyyy-MM-dd') : null,
      };
      if (isOtherAsset && compName.trim() && compName.trim() !== componentType) {
        updateData.component_type = compName.trim();
      }
      const { error } = await supabase
        .from('equipment_sub_components')
        .update(updateData)
        .eq('id', componentId);

      if (error) throw error;

      // Update plans
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
        const newTrigger = planTriggerTypes[plan.id];
        if (newTrigger && newTrigger !== plan.trigger_type) {
          updates.trigger_type = newTrigger;
        }
        if (Object.keys(updates).length > 0) {
          await (supabase as any)
            .from('component_maintenance_plans')
            .update(updates)
            .eq('id', plan.id);
        }
      }

      qc.invalidateQueries({ queryKey: ['equipment_sub_components'] });
      qc.invalidateQueries({ queryKey: ['component_maintenance_plans'] });
      toast.success(`${typeLabels[componentType] || componentType} atualizado`);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const label = isOtherAsset ? compName : (typeLabels[componentType] || componentType);
  const isStarter = componentType === 'starter_motor';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar {label}</DialogTitle>
          <DialogDescription>
            Altere os dados de instalação e manutenções do componente.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {isOtherAsset && (
            <div>
              <Label>Nome do Componente</Label>
              <Input
                value={compName}
                onChange={e => setCompName(e.target.value)}
                placeholder="Nome do componente"
              />
            </div>
          )}
          <div>
            <Label>{isStarter ? 'Arranques na Instalação' : 'Horímetro na Instalação'}</Label>
            <Input
              type="number"
              value={horimeter}
              onChange={e => setHorimeter(Number(e.target.value))}
            />
            {isStarter && (
              <p className="text-xs text-muted-foreground mt-1">
                Total de arranques do equipamento: {equipmentTotalStarts.toLocaleString('pt-BR')}
              </p>
            )}
          </div>

          <div>
            <Label>Data da Instalação</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !installDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {installDate ? format(installDate, "dd/MM/yyyy") : "Selecionar data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={installDate}
                  onSelect={setInstallDate}
                  locale={ptBR}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {plans.length > 0 && (
            <>
              <Separator />
              <div className="space-y-4">
                <Label className="text-sm font-semibold">Manutenções Cadastradas</Label>
                {plans.map(plan => {
                  const currentTrigger = planTriggerTypes[plan.id] || plan.trigger_type;
                  const unit = triggerUnits[currentTrigger] || 'h';
                  const triggerLabel = triggerLabels[currentTrigger] || currentTrigger;
                  return (
                    <div key={plan.id} className="rounded-lg border border-border p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{plan.task}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {triggerLabel} • {plan.interval_value.toLocaleString('pt-BR')}{unit}
                        </Badge>
                      </div>

                      {isOtherAsset && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Contador de manutenção</Label>
                          <Select
                            value={currentTrigger}
                            onValueChange={v => setPlanTriggerTypes(prev => ({ ...prev, [plan.id]: v }))}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="hours">Horímetro</SelectItem>
                              <SelectItem value="months">Meses</SelectItem>
                              <SelectItem value="weeks">Semanas</SelectItem>
                              <SelectItem value="days">Dias</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

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
