import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipmentId: string;
  equipmentHorimeter: number;
  cylinderNumber: number;
  componentType: string;
  cylinderComponentId: string;
  currentInstallHorimeter: number;
}

export function CylinderMaintenanceDialog({
  open, onOpenChange, equipmentId, equipmentHorimeter,
  cylinderNumber, componentType, cylinderComponentId, currentInstallHorimeter,
}: Props) {
  const qc = useQueryClient();
  const [serviceType, setServiceType] = useState('inspection');
  const [horimeter, setHorimeter] = useState(equipmentHorimeter);
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      // 1. Create maintenance log
      const { data: log, error: logErr } = await (supabase as any)
        .from('maintenance_logs')
        .insert({
          equipment_id: equipmentId,
          maintenance_type: componentType,
          horimeter_at_service: horimeter,
          notes: `Cil. ${cylinderNumber} - ${componentTypeLabels[componentType]} - ${serviceType === 'replacement' ? 'Substituição' : 'Inspeção'}${notes ? ` - ${notes}` : ''}`,
          service_date: serviceDate,
        })
        .select()
        .single();
      if (logErr) throw logErr;

      // 2. If replacement, update cylinder component horimeter
      if (serviceType === 'replacement') {
        const { error: cylErr } = await (supabase as any)
          .from('cylinder_components')
          .update({ horimeter_at_install: horimeter })
          .eq('id', cylinderComponentId);
        if (cylErr) throw cylErr;
      }

      // 3. Update maintenance plan last_execution_value
      const { data: existingPlan } = await (supabase as any)
        .from('component_maintenance_plans')
        .select('id')
        .eq('equipment_id', equipmentId)
        .eq('component_type', componentType)
        .limit(1)
        .maybeSingle();

      if (existingPlan) {
        await (supabase as any)
          .from('component_maintenance_plans')
          .update({ last_execution_value: horimeter })
          .eq('equipment_id', equipmentId)
          .eq('component_type', componentType);
      }

      // 4. Update equipment horimeter if higher
      if (horimeter > equipmentHorimeter) {
        await (supabase as any)
          .from('equipments')
          .update({ total_horimeter: horimeter })
          .eq('id', equipmentId);
      }

      // Invalidate queries
      qc.invalidateQueries({ queryKey: ['maintenance_logs'] });
      qc.invalidateQueries({ queryKey: ['cylinder_components'] });
      qc.invalidateQueries({ queryKey: ['component_maintenance_plans'] });
      qc.invalidateQueries({ queryKey: ['equipments'] });

      toast.success(`Manutenção registrada - Cil. ${cylinderNumber} ${componentTypeLabels[componentType]}`);
      onOpenChange(false);
      setNotes('');
      setServiceType('inspection');
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Manutenção — Cilindro {cylinderNumber} — {componentTypeLabels[componentType]}
          </DialogTitle>
          <DialogDescription>
            Registre a manutenção para este componente.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Tipo de Serviço</Label>
            <Select value={serviceType} onValueChange={setServiceType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="inspection">Inspeção</SelectItem>
                <SelectItem value="replacement">Substituição</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Horímetro no Serviço</Label>
            <Input
              type="number"
              value={horimeter}
              onChange={e => setHorimeter(Number(e.target.value))}
            />
          </div>
          <div>
            <Label>Data do Serviço</Label>
            <Input type="date" value={serviceDate} onChange={e => setServiceDate(e.target.value)} />
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observações..." rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Salvando...' : 'Registrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
