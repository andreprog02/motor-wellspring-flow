import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Droplets, Filter, Clock } from 'lucide-react';
import { useEquipmentStore } from '@/hooks/useEquipmentStore';
import { useInventoryStore } from '@/hooks/useInventoryStore';
import { useMaintenanceStore } from '@/hooks/useMaintenanceStore';
import { toast } from '@/hooks/use-toast';

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

export default function OilMaintenancePage() {
  const { equipments, oilTypes } = useEquipmentStore();
  const { items: inventoryItems } = useInventoryStore();
  const { logs, logItems, addMaintenanceLog } = useMaintenanceStore();

  // Form state
  const [equipmentId, setEquipmentId] = useState('');
  const [horimeter, setHorimeter] = useState('');
  const [oilTypeId, setOilTypeId] = useState('');
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Selected filters/items from inventory
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [addingItemId, setAddingItemId] = useState('');

  // Periodicity
  const [periodicityEntries, setPeriodicityEntries] = useState<PeriodicityEntry[]>([]);
  const [newPeriodType, setNewPeriodType] = useState('oil_change');
  const [newPeriodTask, setNewPeriodTask] = useState('Troca de óleo');
  const [newPeriodTrigger, setNewPeriodTrigger] = useState('hours');
  const [newPeriodInterval, setNewPeriodInterval] = useState('');

  const selectedEquipment = (equipments.data ?? []).find(e => e.id === equipmentId);

  const handleAddItem = () => {
    if (!addingItemId) return;
    const item = inventoryItems.find(i => i.id === addingItemId);
    if (!item) return;
    if (selectedItems.some(s => s.inventory_item_id === addingItemId)) {
      toast({ title: 'Item já adicionado', variant: 'destructive' });
      return;
    }
    setSelectedItems(prev => [...prev, {
      inventory_item_id: item.id,
      name: item.name,
      quantity: 1,
      available: item.quantity,
    }]);
    setAddingItemId('');
  };

  const handleRemoveItem = (id: string) => {
    setSelectedItems(prev => prev.filter(i => i.inventory_item_id !== id));
  };

  const handleItemQtyChange = (id: string, qty: number) => {
    setSelectedItems(prev => prev.map(i =>
      i.inventory_item_id === id ? { ...i, quantity: Math.max(1, qty) } : i
    ));
  };

  const handleAddPeriodicity = () => {
    if (!newPeriodInterval || Number(newPeriodInterval) <= 0) return;
    setPeriodicityEntries(prev => [...prev, {
      component_type: newPeriodType,
      task: newPeriodTask,
      trigger_type: newPeriodTrigger,
      interval_value: Number(newPeriodInterval),
    }]);
    setNewPeriodType('oil_change');
    setNewPeriodTask('Troca de óleo');
    setNewPeriodTrigger('hours');
    setNewPeriodInterval('');
  };

  const handleRemovePeriodicity = (index: number) => {
    setPeriodicityEntries(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!equipmentId || !horimeter) {
      toast({ title: 'Preencha equipamento e horímetro', variant: 'destructive' });
      return;
    }

    try {
      await addMaintenanceLog.mutateAsync({
        log: {
          equipment_id: equipmentId,
          maintenance_type: 'oil_change',
          horimeter_at_service: Number(horimeter),
          oil_type_id: oilTypeId || null,
          notes,
          service_date: serviceDate,
        },
        items: selectedItems.map(i => ({
          inventory_item_id: i.inventory_item_id,
          quantity: i.quantity,
        })),
        periodicity: periodicityEntries.map(p => ({
          equipment_id: equipmentId,
          component_type: p.component_type,
          task: p.task,
          trigger_type: p.trigger_type,
          interval_value: p.interval_value,
          last_execution_value: Number(horimeter),
        })),
      });

      toast({ title: 'Manutenção registrada com sucesso!' });
      // Reset form
      setEquipmentId('');
      setHorimeter('');
      setOilTypeId('');
      setNotes('');
      setSelectedItems([]);
      setPeriodicityEntries([]);
    } catch (err: any) {
      toast({ title: 'Erro ao registrar', description: err.message, variant: 'destructive' });
    }
  };

  // Build history with items
  const logsData = logs.data ?? [];
  const logItemsData = logItems.data ?? [];
  const history = logsData
    .filter(l => l.maintenance_type === 'oil_change')
    .map(l => ({
      ...l,
      items: logItemsData.filter(li => li.maintenance_log_id === l.id),
    }));

  const triggerLabel: Record<string, string> = {
    hours: 'Horas',
    months: 'Meses',
    starts: 'Arranques',
  };

  const componentTypeLabels: Record<string, string> = {
    oil_change: 'Troca de Óleo',
    oil_filter: 'Filtro de Óleo',
    air_filter: 'Filtro de Ar',
    fuel_filter: 'Filtro de Combustível',
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manutenção — Óleo</h1>
          <p className="text-sm text-muted-foreground mt-1">Registre trocas de óleo, filtros utilizados e periodicidade</p>
        </div>

        {/* Registration Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Droplets className="h-5 w-5" />
              Nova Troca de Óleo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic info */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Equipamento *</Label>
                <Select value={equipmentId} onValueChange={v => {
                  setEquipmentId(v);
                  const eq = (equipments.data ?? []).find(e => e.id === v);
                  if (eq) setHorimeter(String(eq.total_horimeter));
                }}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {(equipments.data ?? []).map(eq => (
                      <SelectItem key={eq.id} value={eq.id}>{eq.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Horímetro na Troca *</Label>
                <Input type="number" value={horimeter} onChange={e => setHorimeter(e.target.value)} placeholder="Ex: 15000" />
              </div>

              <div className="space-y-2">
                <Label>Óleo Utilizado</Label>
                <Select value={oilTypeId} onValueChange={setOilTypeId}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {(oilTypes.data ?? []).map(o => (
                      <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data do Serviço</Label>
                <Input type="date" value={serviceDate} onChange={e => setServiceDate(e.target.value)} />
              </div>
            </div>

            {/* Filters / Inventory Items */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filtros e Peças do Estoque
              </Label>
              <div className="flex gap-2">
                <Select value={addingItemId} onValueChange={setAddingItemId}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Selecionar item do estoque" /></SelectTrigger>
                  <SelectContent>
                    {inventoryItems.filter(i => i.quantity > 0).map(item => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} (disp: {item.quantity})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={handleAddItem}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {selectedItems.length > 0 && (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="w-24">Disponível</TableHead>
                        <TableHead className="w-24">Qtd</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedItems.map(item => (
                        <TableRow key={item.inventory_item_id}>
                          <TableCell className="text-sm">{item.name}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{item.available}</Badge>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={1}
                              max={item.available}
                              value={item.quantity}
                              onChange={e => handleItemQtyChange(item.inventory_item_id, Number(e.target.value))}
                              className="h-8 w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.inventory_item_id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            {/* Periodicity */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Periodicidade de Manutenção
              </Label>
              <div className="flex flex-wrap gap-2 items-end">
                <div className="space-y-1">
                  <Label className="text-xs">Tipo</Label>
                  <Select value={newPeriodType} onValueChange={v => {
                    setNewPeriodType(v);
                    setNewPeriodTask(componentTypeLabels[v] || v);
                  }}>
                    <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(componentTypeLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                  <Input
                    type="number"
                    value={newPeriodInterval}
                    onChange={e => setNewPeriodInterval(e.target.value)}
                    placeholder="Ex: 500"
                    className="w-28 h-10"
                  />
                </div>
                <Button variant="outline" onClick={handleAddPeriodicity}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar
                </Button>
              </div>

              {periodicityEntries.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {periodicityEntries.map((p, i) => (
                    <Badge key={i} variant="secondary" className="flex items-center gap-1.5 py-1.5 px-3">
                      {componentTypeLabels[p.component_type] || p.component_type}: {p.interval_value} {triggerLabel[p.trigger_type]}
                      <button onClick={() => handleRemovePeriodicity(i)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observações adicionais..." />
            </div>

            <Button onClick={handleSubmit} disabled={addMaintenanceLog.isPending} className="w-full md:w-auto">
              {addMaintenanceLog.isPending ? 'Registrando...' : 'Registrar Manutenção'}
            </Button>
          </CardContent>
        </Card>

        {/* History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Histórico de Trocas de Óleo</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Equipamento</TableHead>
                  <TableHead>Horímetro</TableHead>
                  <TableHead>Óleo</TableHead>
                  <TableHead>Itens Utilizados</TableHead>
                  <TableHead>Observações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhuma troca de óleo registrada
                    </TableCell>
                  </TableRow>
                ) : (
                  history.map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">{new Date(log.service_date).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell className="text-sm font-medium">{log.equipment_name}</TableCell>
                      <TableCell><Badge variant="secondary" className="font-mono">{log.horimeter_at_service}h</Badge></TableCell>
                      <TableCell className="text-sm">{log.oil_type_name ?? '—'}</TableCell>
                      <TableCell className="text-sm">
                        {log.items.length > 0
                          ? log.items.map((li: any) => `${li.inventory_item_name} (${li.quantity})`).join(', ')
                          : '—'}
                      </TableCell>
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
