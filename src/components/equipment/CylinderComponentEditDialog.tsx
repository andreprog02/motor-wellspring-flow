import { useState, useEffect } from 'react';
import { formatLocalDate } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

interface MaintenancePlan {
  id: string;
  task: string;
  last_execution_value: number;
  interval_value: number;
  component_id: string | null;
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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setHorimeter(currentHorimeterAtInstall);
      const vals: Record<string, number> = {};
      plans.forEach(p => { vals[p.id] = p.last_execution_value; });
      setPlanValues(vals);
    }
  }, [open, currentHorimeterAtInstall, plans]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update cylinder component horimeter_at_install
      await (supabase as any)
        .from('cylinder_components')
        .update({ horimeter_at_install: horimeter })
        .eq('id', componentId);

      // Update each plan's last_execution_value
      for (const plan of plans) {
        const newVal = planValues[plan.id];
        if (newVal !== undefined && newVal !== plan.last_execution_value) {
          await (supabase as any)
            .from('component_maintenance_plans')
            .update({ last_execution_value: newVal })
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar {label} {cylinderNumber}</DialogTitle>
          <DialogDescription>
            Altere o horímetro de instalação e os valores de última execução dos planos.
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
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Planos de Manutenção</Label>
              {plans.map(plan => (
                <div key={plan.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{plan.task}</span>
                    <span className="text-xs text-muted-foreground">
                      Intervalo: {plan.interval_value.toLocaleString('pt-BR')}h
                    </span>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Última execução (horímetro)</Label>
                    <Input
                      type="number"
                      value={planValues[plan.id] ?? plan.last_execution_value}
                      onChange={e => setPlanValues(prev => ({ ...prev, [plan.id]: Number(e.target.value) }))}
                    />
                  </div>
                </div>
              ))}
            </div>
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
