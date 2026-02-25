import { useState, useMemo } from 'react';
import { formatLocalDate } from '@/lib/utils';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Clock, Wrench, Circle } from 'lucide-react';
import { useEquipmentStore } from '@/hooks/useEquipmentStore';
import { useInventoryStore } from '@/hooks/useInventoryStore';
import { useMaintenanceStore } from '@/hooks/useMaintenanceStore';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface SelectedItem {
  inventory_item_id: string;
  name: string;
  quantity: number;
  available: number;
}

interface PeriodicityEntry {
  component_type: string;
  task: string;
  trigger_type: string;
  interval_value: number;
}

export default function BearingMaintenancePage() {
  const { equipments } = useEquipmentStore();
  const { items: inventoryItems } = useInventoryStore();
  const { logs, logItems, addMaintenanceLog } = useMaintenanceStore();

  const [equipmentId, setEquipmentId] = useState('');
  const [horimeter, setHorimeter] = useState('');
  const [serviceType, setServiceType] = useState<'inspection' | 'replacement'>('inspection');
  const [serviceDate, setServiceDate] = useState(formatLocalDate());
  const [notes, setNotes] = useState('');
  const [selectedCylinders, setSelectedCylinders] = useState<number[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [addingItemId, setAddingItemId] = useState('');
  const [periodicityEntries, setPeriodicityEntries] = useState<PeriodicityEntry[]>([]);
  const [newPeriodTrigger, setNewPeriodTrigger] = useState('hours');
  const [newPeriodInterval, setNewPeriodInterval] = useState('');

  const selectedEquipment = (equipments.data ?? []).find(e => e.id === equipmentId);
  const cylinderCount = selectedEquipment?.cylinders ?? 0;

  const cylinderComponents = useQuery({
    queryKey: ['cylinder_components', equipmentId, 'bearing'],
    queryFn: async () => {
      if (!equipmentId) return [];
      const { data, error } = await (supabase as any)
        .from('cylinder_components')
        .select('*')
        .eq('equipment_id', equipmentId)
        .eq('component_type', 'bearing')
        .order('cylinder_number');
      if (error) throw error;
      return data as Array<{ id: string; cylinder_number: number; horimeter_at_install: number }>;
    },
    enabled: !!equipmentId,
  });

  const cylinderNumbers = useMemo(() => {
    if (cylinderComponents.data && cylinderComponents.data.length > 0) {
      return cylinderComponents.data.map(c => c.cylinder_number);
    }
    return Array.from({ length: cylinderCount }, (_, i) => i + 1);
  }, [cylinderComponents.data, cylinderCount]);

  const toggleCylinder = (num: number) => {
    setSelectedCylinders(prev => prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num]);
  };

  const selectAllCylinders = () => {
    setSelectedCylinders(prev => prev.length === cylinderNumbers.length ? [] : [...cylinderNumbers]);
  };

  const handleAddItem = () => {
    if (!addingItemId) return;
    const item = inventoryItems.find(i => i.id === addingItemId);
    if (!item) return;
    if (selectedItems.some(s => s.inventory_item_id === addingItemId)) {
      toast({ title: 'Item já adicionado', variant: 'destructive' });
      return;
    }
    setSelectedItems(prev => [...prev, { inventory_item_id: item.id, name: item.name, quantity: 1, available: item.quantity }]);
    setAddingItemId('');
  };

  const handleRemoveItem = (id: string) => setSelectedItems(prev => prev.filter(i => i.inventory_item_id !== id));
  const handleItemQtyChange = (id: string, qty: number) => setSelectedItems(prev => prev.map(i => i.inventory_item_id === id ? { ...i, quantity: Math.max(1, qty) } : i));

  const handleAddPeriodicity = () => {
    if (!newPeriodInterval || Number(newPeriodInterval) <= 0) return;
    setPeriodicityEntries(prev => [...prev, {
      component_type: 'bearing',
      task: serviceType === 'inspection' ? 'Inspeção da bronzina' : 'Substituição da bronzina',
      trigger_type: newPeriodTrigger,
      interval_value: Number(newPeriodInterval),
    }]);
    setNewPeriodInterval('');
  };

  const handleRemovePeriodicity = (index: number) => setPeriodicityEntries(prev => prev.filter((_, i) => i !== index));

  const handleSubmit = async () => {
    if (!equipmentId || !horimeter) {
      toast({ title: 'Preencha equipamento e horímetro', variant: 'destructive' });
      return;
    }
    if (selectedCylinders.length === 0) {
      toast({ title: 'Selecione ao menos um cilindro', variant: 'destructive' });
      return;
    }

    try {
      const maintenanceType = serviceType === 'inspection' ? 'bearing_inspection' : 'bearing_replacement';
      const cylindersLabel = selectedCylinders.sort((a, b) => a - b).join(', ');

      await addMaintenanceLog.mutateAsync({
        log: {
          equipment_id: equipmentId,
          maintenance_type: maintenanceType,
          horimeter_at_service: Number(horimeter),
          oil_type_id: null,
          notes: `Cilindros: ${cylindersLabel}${notes ? '. ' + notes : ''}`,
          service_date: serviceDate,
        },
        items: selectedItems.map(i => ({ inventory_item_id: i.inventory_item_id, quantity: i.quantity })),
        periodicity: periodicityEntries.map(p => ({
          equipment_id: equipmentId,
          component_type: p.component_type,
          task: p.task,
          trigger_type: p.trigger_type,
          interval_value: p.interval_value,
          last_execution_value: Number(horimeter),
        })),
      });

      if (serviceType === 'replacement' && cylinderComponents.data) {
        for (const cylNum of selectedCylinders) {
          const comp = cylinderComponents.data.find(c => c.cylinder_number === cylNum);
          if (comp) {
            await (supabase as any)
              .from('cylinder_components')
              .update({ horimeter_at_install: Number(horimeter) })
              .eq('id', comp.id);
          }
        }
      }

      toast({ title: 'Manutenção de bronzina registrada com sucesso!' });
      setEquipmentId(''); setHorimeter(''); setNotes('');
      setSelectedItems([]); setPeriodicityEntries([]);
      setSelectedCylinders([]); setServiceType('inspection');
    } catch (err: any) {
      toast({ title: 'Erro ao registrar', description: err.message, variant: 'destructive' });
    }
  };

  const logsData = logs.data ?? [];
  const logItemsData = logItems.data ?? [];
  const history = logsData
    .filter(l => l.maintenance_type === 'bearing_inspection' || l.maintenance_type === 'bearing_replacement')
    .map(l => ({ ...l, items: logItemsData.filter(li => li.maintenance_log_id === l.id) }));

  const triggerLabel: Record<string, string> = { hours: 'Horas', months: 'Meses', starts: 'Arranques' };
  const maintenanceTypeLabel: Record<string, string> = { bearing_inspection: 'Inspeção', bearing_replacement: 'Substituição' };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manutenção — Bronzinas</h1>
          <p className="text-sm text-muted-foreground mt-1">Registre inspeções e substituições de bronzinas por cilindro</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Circle className="h-5 w-5" />
              Novo Serviço de Bronzina
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Equipamento *</Label>
                <Select value={equipmentId} onValueChange={v => {
                  setEquipmentId(v); setSelectedCylinders([]);
                  const eq = (equipments.data ?? []).find(e => e.id === v);
                  if (eq) setHorimeter(String(eq.total_horimeter));
                }}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {(equipments.data ?? []).map(eq => (
                      <SelectItem key={eq.id} value={eq.id}>{eq.name} ({eq.cylinders} cil.)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Horímetro no Serviço *</Label>
                <Input type="number" value={horimeter} onChange={e => setHorimeter(e.target.value)} placeholder="Ex: 15000" />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Serviço</Label>
                <Select value={serviceType} onValueChange={v => setServiceType(v as 'inspection' | 'replacement')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inspection">Inspeção</SelectItem>
                    <SelectItem value="replacement">Substituição</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data do Serviço</Label>
                <Input type="date" value={serviceDate} onChange={e => setServiceDate(e.target.value)} />
              </div>
            </div>

            {equipmentId && cylinderNumbers.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2"><Wrench className="h-4 w-4" />Cilindros Atendidos *</Label>
                  <Button variant="ghost" size="sm" onClick={selectAllCylinders}>
                    {selectedCylinders.length === cylinderNumbers.length ? 'Desmarcar todos' : 'Selecionar todos'}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-3">
                  {cylinderNumbers.map(num => {
                    const comp = cylinderComponents.data?.find(c => c.cylinder_number === num);
                    const hoursUsed = comp ? Number(horimeter || 0) - comp.horimeter_at_install : 0;
                    return (
                      <label key={num} className={`flex flex-col items-center gap-1 rounded-lg border-2 p-3 cursor-pointer transition-colors min-w-[80px] ${selectedCylinders.includes(num) ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/50'}`}>
                        <Checkbox checked={selectedCylinders.includes(num)} onCheckedChange={() => toggleCylinder(num)} />
                        <span className="text-sm font-medium">Cil. {num}</span>
                        {comp && <span className="text-xs text-muted-foreground">{hoursUsed}h uso</span>}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
            {equipmentId && cylinderNumbers.length === 0 && (
              <p className="text-sm text-muted-foreground">Este equipamento não possui cilindros cadastrados.</p>
            )}

            <div className="space-y-3">
              <Label className="flex items-center gap-2"><Plus className="h-4 w-4" />Peças do Estoque</Label>
              <div className="flex gap-2">
                <Select value={addingItemId} onValueChange={setAddingItemId}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Selecionar item do estoque" /></SelectTrigger>
                  <SelectContent>
                    {inventoryItems.filter(i => i.quantity > 0).map(item => (
                      <SelectItem key={item.id} value={item.id}>{item.name} (disp: {item.quantity})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={handleAddItem}><Plus className="h-4 w-4" /></Button>
              </div>
              {selectedItems.length > 0 && (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader><TableRow><TableHead>Item</TableHead><TableHead className="w-24">Disponível</TableHead><TableHead className="w-24">Qtd</TableHead><TableHead className="w-12"></TableHead></TableRow></TableHeader>
                    <TableBody>
                      {selectedItems.map(item => (
                        <TableRow key={item.inventory_item_id}>
                          <TableCell className="text-sm">{item.name}</TableCell>
                          <TableCell><Badge variant="secondary">{item.available}</Badge></TableCell>
                          <TableCell><Input type="number" min={1} max={item.available} value={item.quantity} onChange={e => handleItemQtyChange(item.inventory_item_id, Number(e.target.value))} className="h-8 w-20" /></TableCell>
                          <TableCell><Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.inventory_item_id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label className="flex items-center gap-2"><Clock className="h-4 w-4" />Periodicidade de Manutenção</Label>
              <div className="flex flex-wrap gap-2 items-end">
                <div className="space-y-1">
                  <Label className="text-xs">Gatilho</Label>
                  <Select value={newPeriodTrigger} onValueChange={setNewPeriodTrigger}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hours">Horas</SelectItem>
                      <SelectItem value="months">Meses</SelectItem>
                      <SelectItem value="starts">Arranques</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Intervalo</Label>
                  <Input type="number" value={newPeriodInterval} onChange={e => setNewPeriodInterval(e.target.value)} placeholder="Ex: 15000" className="w-28 h-10" />
                </div>
                <Button variant="outline" onClick={handleAddPeriodicity}><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
              </div>
              {periodicityEntries.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {periodicityEntries.map((p, i) => (
                    <Badge key={i} variant="secondary" className="flex items-center gap-1.5 py-1.5 px-3">
                      {p.task}: {p.interval_value} {triggerLabel[p.trigger_type]}
                      <button onClick={() => handleRemovePeriodicity(i)}><Trash2 className="h-3 w-3 text-destructive" /></button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observações adicionais..." />
            </div>

            <Button onClick={handleSubmit} disabled={addMaintenanceLog.isPending} className="w-full md:w-auto">
              {addMaintenanceLog.isPending ? 'Registrando...' : 'Registrar Manutenção'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Histórico de Manutenção de Bronzinas</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead><TableHead>Equipamento</TableHead><TableHead>Tipo</TableHead>
                  <TableHead>Horímetro</TableHead><TableHead>Itens Utilizados</TableHead><TableHead>Observações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma manutenção de bronzina registrada</TableCell></TableRow>
                ) : (
                  history.map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">{new Date(log.service_date).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell className="text-sm font-medium">{log.equipment_name}</TableCell>
                      <TableCell><Badge variant={log.maintenance_type === 'bearing_replacement' ? 'default' : 'secondary'}>{maintenanceTypeLabel[log.maintenance_type] || log.maintenance_type}</Badge></TableCell>
                      <TableCell><Badge variant="secondary" className="font-mono">{log.horimeter_at_service}h</Badge></TableCell>
                      <TableCell className="text-sm">{log.items.length > 0 ? log.items.map((li: any) => `${li.inventory_item_name} (${li.quantity})`).join(', ') : '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-48 truncate">{log.notes || '—'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
