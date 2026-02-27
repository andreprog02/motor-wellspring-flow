import { useState } from 'react';
import { formatLocalDate } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/AppLayout';
import { useTurboStore, turboStatusLabels, turboComponentTypes } from '@/hooks/useTurboStore';
import type { TurboMetrics, TurboComponent } from '@/hooks/useTurboStore';
import { useEquipmentStore } from '@/hooks/useEquipmentStore';
import { useInventoryStore } from '@/hooks/useInventoryStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { PlusCircle, Clock, Wrench, Gauge, ArrowRightLeft, Pencil, Trash2, Calendar, Package } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface CompInventoryItem {
  compType: string;
  inventoryItemId: string;
  inventoryItemName: string;
  quantity: number;
  available: number;
}

function fmtNum(n: number): string {
  return n.toLocaleString('pt-BR');
}

const statusColors: Record<string, string> = {
  in_stock: 'bg-[hsl(var(--status-ok))] text-[hsl(var(--status-ok-foreground))]',
  active: 'bg-[hsl(var(--industrial))] text-[hsl(var(--industrial-foreground))]',
  maintenance: 'bg-[hsl(var(--status-warning))] text-[hsl(var(--status-warning-foreground))]',
};

export default function TurbosPage() {
  const store = useTurboStore();
  const { equipments } = useEquipmentStore();
  const inventoryStore = useInventoryStore();

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [maintOpen, setMaintOpen] = useState(false);
  const [batchMaintOpen, setBatchMaintOpen] = useState(false);
  const [compOpen, setCompOpen] = useState(false);
  const [histInstOpen, setHistInstOpen] = useState(false);
  const [batchHistOpen, setBatchHistOpen] = useState(false);
  const [editInstOpen, setEditInstOpen] = useState(false);
  const [editMaintOpen, setEditMaintOpen] = useState(false);
  const [deleteMaintOpen, setDeleteMaintOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removeHorimeter, setRemoveHorimeter] = useState('');
  const [deleteAllDismountedOpen, setDeleteAllDismountedOpen] = useState(false);

  const [serialNumber, setSerialNumber] = useState('');
  const [editSerial, setEditSerial] = useState('');
  const [editStatus, setEditStatus] = useState('in_stock');
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [maintDesc, setMaintDesc] = useState('');
  const [maintHorimeter, setMaintHorimeter] = useState('');
  const [maintDate, setMaintDate] = useState('');

  const [batchSelected, setBatchSelected] = useState<string[]>([]);
  const [batchDesc, setBatchDesc] = useState('');
  const [batchHorimeter, setBatchHorimeter] = useState('');
  const [batchDate, setBatchDate] = useState('');

  const [compTypes, setCompTypes] = useState<string[]>([]);
  const [compDate, setCompDate] = useState('');
  const [compHorimeter, setCompHorimeter] = useState('');
  const [compInventoryItems, setCompInventoryItems] = useState<CompInventoryItem[]>([]);
  const [compAddingItemType, setCompAddingItemType] = useState<string | null>(null);

  const [histEquipId, setHistEquipId] = useState('');
  const [histInstallDate, setHistInstallDate] = useState('');
  const [histInstallHor, setHistInstallHor] = useState('');
  const [histRemoveDate, setHistRemoveDate] = useState('');
  const [histRemoveHor, setHistRemoveHor] = useState('');

  const [batchHistSelected, setBatchHistSelected] = useState<string[]>([]);
  const [batchHistEquipId, setBatchHistEquipId] = useState('');
  const [batchHistInstallDate, setBatchHistInstallDate] = useState('');
  const [batchHistInstallHor, setBatchHistInstallHor] = useState('');
  const [batchHistRemoveDate, setBatchHistRemoveDate] = useState('');
  const [batchHistRemoveHor, setBatchHistRemoveHor] = useState('');

  const [editInstId, setEditInstId] = useState('');
  const [editInstEquipId, setEditInstEquipId] = useState('');
  const [editInstInstallHor, setEditInstInstallHor] = useState('');
  const [editInstRemoveHor, setEditInstRemoveHor] = useState('');

  const [editMaintId, setEditMaintId] = useState('');
  const [editMaintDesc, setEditMaintDesc] = useState('');
  const [editMaintHorimeter, setEditMaintHorimeter] = useState('');
  const [editMaintDate, setEditMaintDate] = useState('');
  const [deleteMaintId, setDeleteMaintId] = useState('');

  const items = store.turbos.data || [];
  const allInstallations = store.installations.data || [];
  const allMaintenances = store.maintenances.data || [];
  const allComponents = store.turboComponents.data || [];

  const selectedItem = items.find(h => h.id === detailId);
  const itemInstallations = allInstallations.filter(i => i.turbo_id === detailId);
  const itemMaintenances = allMaintenances.filter(m => m.turbo_id === detailId);
  const itemComps = allComponents.filter(c => c.turbo_id === detailId);

  const metrics = useQuery({
    queryKey: ['turbo_metrics', detailId],
    queryFn: () => store.getMetrics(detailId!),
    enabled: !!detailId,
  });

  const handleAdd = async () => {
    if (!serialNumber.trim()) return;
    try {
      await store.addTurbo.mutateAsync({ serial_number: serialNumber.trim() });
      toast.success('Turbo cadastrado!');
      setSerialNumber('');
      setAddOpen(false);
    } catch { toast.error('Erro ao cadastrar turbo.'); }
  };

  const openEdit = (item: typeof items[0], e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditId(item.id); setEditSerial(item.serial_number); setEditStatus(item.status); setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editId || !editSerial.trim()) return;
    try {
      await store.updateTurbo.mutateAsync({ id: editId, serial_number: editSerial.trim(), status: editStatus });
      toast.success('Turbo atualizado!'); setEditOpen(false);
    } catch { toast.error('Erro ao atualizar turbo.'); }
  };

  const openDelete = (id: string, e?: React.MouseEvent) => { e?.stopPropagation(); setDeleteId(id); setDeleteOpen(true); };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await store.deleteTurbo.mutateAsync(deleteId);
      toast.success('Turbo excluído!'); setDeleteOpen(false);
      if (detailId === deleteId) setDetailId(null);
    } catch { toast.error('Erro ao excluir. Verifique se não há instalações vinculadas.'); }
  };

  const handleAddMaintenance = async () => {
    if (!detailId || !maintDesc.trim()) return;
    try {
      await store.addMaintenance.mutateAsync({ turbo_id: detailId, description: maintDesc.trim(), horimeter_at_maintenance: Number(maintHorimeter) || 0, maintenance_date: maintDate || undefined });
      toast.success('Manutenção registrada!'); setMaintDesc(''); setMaintHorimeter(''); setMaintDate(''); setMaintOpen(false);
    } catch { toast.error('Erro ao registrar manutenção.'); }
  };

  const toggleBatchSelect = (id: string) => setBatchSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAllBatch = () => setBatchSelected(batchSelected.length === items.length ? [] : items.map(h => h.id));

  const handleBatchMaintenance = async () => {
    if (batchSelected.length === 0 || !batchDesc.trim()) return;
    try {
      for (const id of batchSelected) {
        await store.addMaintenance.mutateAsync({ turbo_id: id, description: batchDesc.trim(), horimeter_at_maintenance: Number(batchHorimeter) || 0, maintenance_date: batchDate || undefined });
      }
      toast.success(`Manutenção registrada em ${batchSelected.length} turbo(s)!`);
      setBatchDesc(''); setBatchHorimeter(''); setBatchDate(''); setBatchSelected([]); setBatchMaintOpen(false);
    } catch { toast.error('Erro ao registrar manutenção em lote.'); }
  };

  const metricsData = metrics.data as TurboMetrics | undefined;

  const handleAddComponents = async () => {
    if (!detailId || compTypes.length === 0) return;
    const dateVal = compDate || formatLocalDate();
    const horimeterVal = Number(compHorimeter) || 0;
    try {
      const rows = compTypes.map(ct => ({ turbo_id: detailId, component_type: ct, replacement_date: dateVal, horimeter_at_replacement: horimeterVal }));
      await store.addTurboComponentsBatch.mutateAsync(rows);
      for (const ci of compInventoryItems) {
        if (ci.quantity > 0) {
          const item = inventoryStore.items.find(i => i.id === ci.inventoryItemId);
          if (item) await inventoryStore.updateItem.mutateAsync({ id: ci.inventoryItemId, quantity: Math.max(0, item.quantity - ci.quantity) });
        }
      }
      toast.success(`Troca registrada para ${compTypes.length} item(ns)!`);
      setCompTypes([]); setCompDate(''); setCompHorimeter(''); setCompInventoryItems([]); setCompAddingItemType(null); setCompOpen(false);
    } catch { toast.error('Erro ao registrar troca de componente.'); }
  };

  const handleAddCompInventoryItem = (compType: string, itemId: string) => {
    const item = inventoryStore.items.find(i => i.id === itemId);
    if (!item || compInventoryItems.find(ci => ci.compType === compType && ci.inventoryItemId === itemId)) return;
    setCompInventoryItems(prev => [...prev, { compType, inventoryItemId: itemId, inventoryItemName: `${item.name} (${item.part_number})`, quantity: 1, available: item.quantity }]);
    setCompAddingItemType(null);
  };
  const handleRemoveCompInventoryItem = (compType: string, itemId: string) => setCompInventoryItems(prev => prev.filter(ci => !(ci.compType === compType && ci.inventoryItemId === itemId)));
  const handleCompInventoryQtyChange = (compType: string, itemId: string, qty: number) => setCompInventoryItems(prev => prev.map(ci => ci.compType === compType && ci.inventoryItemId === itemId ? { ...ci, quantity: Math.max(1, Math.min(qty, ci.available)) } : ci));

  const handleAddHistoricalInstallation = async () => {
    if (!detailId || !histEquipId || !histInstallDate) return;
    try {
      await store.addHistoricalInstallation.mutateAsync({ turbo_id: detailId, equipment_id: histEquipId, install_date: histInstallDate, install_equipment_horimeter: Number(histInstallHor) || 0, remove_date: histRemoveDate || null, remove_equipment_horimeter: histRemoveHor ? Number(histRemoveHor) : null });
      toast.success('Instalação histórica registrada!');
      setHistEquipId(''); setHistInstallDate(''); setHistInstallHor(''); setHistRemoveDate(''); setHistRemoveHor(''); setHistInstOpen(false);
    } catch { toast.error('Erro ao registrar instalação.'); }
  };

  const toggleBatchHistSelect = (id: string) => setBatchHistSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAllBatchHist = () => setBatchHistSelected(batchHistSelected.length === items.length ? [] : items.map(h => h.id));

  const handleBatchHistoricalInstallation = async () => {
    if (batchHistSelected.length === 0 || !batchHistEquipId || !batchHistInstallDate) return;
    try {
      for (const tId of batchHistSelected) {
        await store.addHistoricalInstallation.mutateAsync({ turbo_id: tId, equipment_id: batchHistEquipId, install_date: batchHistInstallDate, install_equipment_horimeter: Number(batchHistInstallHor) || 0, remove_date: batchHistRemoveDate || null, remove_equipment_horimeter: batchHistRemoveHor ? Number(batchHistRemoveHor) : null });
      }
      toast.success(`Instalação registrada em ${batchHistSelected.length} turbo(s)!`);
      setBatchHistSelected([]); setBatchHistEquipId(''); setBatchHistInstallDate(''); setBatchHistInstallHor(''); setBatchHistRemoveDate(''); setBatchHistRemoveHor(''); setBatchHistOpen(false);
    } catch { toast.error('Erro ao registrar instalações em lote.'); }
  };

  const getLatestReplacements = () => {
    const latest: Record<string, TurboComponent> = {};
    itemComps.forEach(c => {
      if (!latest[c.component_type] || new Date(c.replacement_date) > new Date(latest[c.component_type].replacement_date)) latest[c.component_type] = c;
    });
    return latest;
  };

  const openEditInstallation = (inst: typeof itemInstallations[0]) => {
    setEditInstId(inst.id); setEditInstEquipId(inst.equipment_id);
    setEditInstInstallHor(String(inst.install_equipment_horimeter));
    setEditInstRemoveHor(inst.remove_equipment_horimeter != null ? String(inst.remove_equipment_horimeter) : '');
    setEditInstOpen(true);
  };

  const handleEditInstallation = async () => {
    if (!editInstId || !editInstEquipId) return;
    try {
      await store.updateInstallation.mutateAsync({ id: editInstId, equipment_id: editInstEquipId, install_equipment_horimeter: Number(editInstInstallHor) || 0, remove_equipment_horimeter: editInstRemoveHor ? Number(editInstRemoveHor) : null });
      toast.success('Instalação atualizada!'); setEditInstOpen(false);
    } catch { toast.error('Erro ao atualizar instalação.'); }
  };

  const openEditMaintenance = (m: typeof itemMaintenances[0]) => {
    setEditMaintId(m.id);
    setEditMaintDesc(m.description);
    setEditMaintHorimeter(String(m.horimeter_at_maintenance));
    setEditMaintDate(m.maintenance_date);
    setEditMaintOpen(true);
  };

  const handleEditMaintenance = async () => {
    if (!editMaintId || !editMaintDesc.trim()) return;
    try {
      await store.updateMaintenance.mutateAsync({ id: editMaintId, description: editMaintDesc.trim(), horimeter_at_maintenance: Number(editMaintHorimeter) || 0, maintenance_date: editMaintDate });
      toast.success('Manutenção atualizada!'); setEditMaintOpen(false);
    } catch { toast.error('Erro ao atualizar manutenção.'); }
  };

  const handleDeleteMaintenance = async () => {
    if (!deleteMaintId) return;
    try {
      await store.deleteMaintenance.mutateAsync(deleteMaintId);
      toast.success('Manutenção excluída!'); setDeleteMaintOpen(false);
    } catch { toast.error('Erro ao excluir manutenção.'); }
  };
  const activeInstallation = detailId ? allInstallations.find(i => i.turbo_id === detailId && !i.remove_date) : null;

  const handleRemoveTurbo = async () => {
    if (!activeInstallation || !detailId) return;
    try {
      await store.removeTurbo.mutateAsync({ installation_id: activeInstallation.id, turbo_id: detailId, remove_equipment_horimeter: Number(removeHorimeter) || 0 });
      toast.success('Turbo desmontado com sucesso!'); setRemoveOpen(false); setRemoveHorimeter('');
    } catch { toast.error('Erro ao desmontar turbo.'); }
  };

  const inStockTurbos = items.filter(t => t.status === 'in_stock');

  const handleDeleteAllDismounted = async () => {
    try {
      for (const t of inStockTurbos) {
        await store.deleteTurbo.mutateAsync(t.id);
      }
      toast.success(`${inStockTurbos.length} turbo(s) excluído(s)!`);
      setDeleteAllDismountedOpen(false);
      if (detailId && inStockTurbos.find(t => t.id === detailId)) setDetailId(null);
    } catch { toast.error('Erro ao excluir turbos. Verifique se não há instalações vinculadas.'); }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Turbos</h1>
            <p className="text-sm text-muted-foreground">Gestão de turbos com rastreamento de horas</p>
          </div>
          <div className="flex gap-2">
            {inStockTurbos.length > 0 && (
              <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setDeleteAllDismountedOpen(true)}>
                <Trash2 className="h-4 w-4 mr-2" />Excluir Desmontados ({inStockTurbos.length})
              </Button>
            )}
            <Button variant="outline" onClick={() => { setBatchHistSelected([]); setBatchHistOpen(true); }}>
              <ArrowRightLeft className="h-4 w-4 mr-2" />Instalações em Lote
            </Button>
            <Button variant="outline" onClick={() => { setBatchSelected([]); setBatchMaintOpen(true); }}>
              <Calendar className="h-4 w-4 mr-2" />Manutenção em Lote
            </Button>
            <Button onClick={() => setAddOpen(true)}>
              <PlusCircle className="h-4 w-4 mr-2" />Novo Turbo
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(['in_stock', 'active', 'maintenance'] as const).map(status => (
            <Card key={status}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${status === 'in_stock' ? 'bg-[hsl(var(--status-ok))]/10' : status === 'active' ? 'bg-[hsl(var(--industrial))]/10' : 'bg-[hsl(var(--status-warning))]/10'}`}>
                  {status === 'in_stock' ? <ArrowRightLeft className="h-5 w-5 text-[hsl(var(--status-ok))]" /> : status === 'active' ? <Gauge className="h-5 w-5 text-[hsl(var(--industrial))]" /> : <Wrench className="h-5 w-5 text-[hsl(var(--status-warning))]" />}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{turboStatusLabels[status]}</p>
                  <p className="text-2xl font-bold">{items.filter(h => h.status === status).length}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* List */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>S/N</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Última Manutenção</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhum turbo cadastrado.</TableCell></TableRow>
              ) : items.map(item => {
                const activeInst = allInstallations.find(i => i.turbo_id === item.id && !i.remove_date);
                const eqName = activeInst ? equipments.data?.find(e => e.id === activeInst.equipment_id)?.name : null;
                return (
                  <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDetailId(item.id)}>
                    <TableCell className="font-mono font-medium">{item.serial_number || '—'}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[item.status]}>{turboStatusLabels[item.status] || item.status}</Badge>
                      {eqName && <span className="ml-2 text-xs text-muted-foreground">({eqName})</span>}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{item.last_maintenance_date ? format(new Date(item.last_maintenance_date), 'dd/MM/yyyy') : '—'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={(e) => openEdit(item, e)} title="Editar"><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={(e) => openDelete(item.id, e)} title="Excluir"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Novo Turbo</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Número de Série</label>
              <Input value={serialNumber} onChange={e => setSerialNumber(e.target.value)} placeholder="Ex: TB-001" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button onClick={handleAdd} disabled={store.addTurbo.isPending}>Cadastrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Editar Turbo</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Número de Série</label>
              <Input value={editSerial} onChange={e => setEditSerial(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_stock">Estoque</SelectItem>
                  <SelectItem value="active">No Motor</SelectItem>
                  <SelectItem value="maintenance">Em Reparo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleEdit} disabled={store.updateTurbo.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Excluir Turbo</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Tem certeza que deseja excluir este turbo? Esta ação não pode ser desfeita.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={store.deleteTurbo.isPending}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailId} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <span>Turbo {selectedItem.serial_number}</span>
                  <Badge className={statusColors[selectedItem.status]}>{turboStatusLabels[selectedItem.status]}</Badge>
                </DialogTitle>
              </DialogHeader>

              {activeInstallation && (
                <div className="flex items-center justify-between bg-secondary/50 rounded-md p-3">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Instalado em: </span>
                    <span className="font-medium">{equipments.data?.find(e => e.id === activeInstallation.equipment_id)?.name || '—'}</span>
                    <span className="text-muted-foreground ml-2">({fmtNum(activeInstallation.install_equipment_horimeter)}h)</span>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => { setRemoveHorimeter(''); setRemoveOpen(true); }}>
                    <ArrowRightLeft className="h-3.5 w-3.5 mr-1.5" />Desmontar
                  </Button>
                </div>
              )}

              {metricsData && (
                <div className="grid grid-cols-2 gap-4 my-4">
                  <Card className="border-[hsl(var(--industrial))]/20">
                    <CardContent className="p-4 flex items-center gap-3">
                      <Clock className="h-5 w-5 text-[hsl(var(--industrial))]" />
                      <div>
                        <p className="text-xs text-muted-foreground">Horas Totais (Vida Útil)</p>
                        <p className="text-xl font-bold font-mono">{fmtNum(Math.round(metricsData.total_hours))}h</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-[hsl(var(--status-warning))]/20">
                    <CardContent className="p-4 flex items-center gap-3">
                      <Gauge className="h-5 w-5 text-[hsl(var(--status-warning))]" />
                      <div>
                        <p className="text-xs text-muted-foreground">Horas Pós-Revisão</p>
                        <p className="text-xl font-bold font-mono">{fmtNum(Math.round(metricsData.hours_since_maintenance))}h</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              <Tabs defaultValue="components" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="components">Componentes</TabsTrigger>
                  <TabsTrigger value="history">Histórico de Instalações</TabsTrigger>
                  <TabsTrigger value="maintenances">Manutenções</TabsTrigger>
                </TabsList>

                <TabsContent value="components">
                  <div className="flex justify-end mb-3">
                    <Button size="sm" onClick={() => { setCompTypes([]); setCompDate(''); setCompHorimeter(''); setCompInventoryItems([]); setCompAddingItemType(null); setCompOpen(true); }}>
                      <PlusCircle className="h-3.5 w-3.5 mr-1.5" />Registrar Troca
                    </Button>
                  </div>
                  {(() => {
                    const latest = getLatestReplacements();
                    return (
                      <div className="space-y-2">
                        {Object.entries(turboComponentTypes).map(([key, label]) => {
                          const comp = latest[key];
                          return (
                            <div key={key} className="flex items-center justify-between py-2.5 px-3 rounded-md bg-secondary/50">
                              <span className="text-sm font-medium">{label}</span>
                              {comp ? (
                                <div className="text-right">
                                  <span className="text-sm font-mono">{format(new Date(comp.replacement_date), 'dd/MM/yyyy')}</span>
                                  <span className="text-xs text-muted-foreground ml-2">({fmtNum(comp.horimeter_at_replacement)}h)</span>
                                </div>
                              ) : <span className="text-xs text-muted-foreground">Sem registro</span>}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                  {itemComps.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Histórico completo de trocas</p>
                      <Table>
                        <TableHeader><TableRow><TableHead>Componente</TableHead><TableHead>Data</TableHead><TableHead>Horímetro</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {itemComps.map(c => (
                            <TableRow key={c.id}>
                              <TableCell className="text-sm">{turboComponentTypes[c.component_type] || c.component_type}</TableCell>
                              <TableCell className="font-mono text-sm">{format(new Date(c.replacement_date), 'dd/MM/yyyy')}</TableCell>
                              <TableCell className="font-mono text-sm">{fmtNum(c.horimeter_at_replacement)}h</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="history">
                  <div className="flex justify-end mb-3">
                    <Button size="sm" onClick={() => { setHistEquipId(''); setHistInstallDate(''); setHistInstallHor(''); setHistRemoveDate(''); setHistRemoveHor(''); setHistInstOpen(true); }}>
                      <PlusCircle className="h-3.5 w-3.5 mr-1.5" />Adicionar Instalação
                    </Button>
                  </div>
                  <Table>
                    <TableHeader><TableRow><TableHead>Equipamento</TableHead><TableHead>Instalação</TableHead><TableHead>Remoção</TableHead><TableHead>Horas (Delta)</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
                    <TableBody>
                      {itemInstallations.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-4">Nenhuma instalação.</TableCell></TableRow>
                      ) : itemInstallations.map(inst => {
                        const eqName = equipments.data?.find(e => e.id === inst.equipment_id)?.name || '—';
                        const delta = inst.remove_equipment_horimeter != null ? inst.remove_equipment_horimeter - inst.install_equipment_horimeter : null;
                        return (
                          <TableRow key={inst.id}>
                            <TableCell className="font-medium text-sm">{eqName}</TableCell>
                            <TableCell className="text-xs">
                              <span className="font-mono">{format(new Date(inst.install_date), 'dd/MM/yyyy')}</span>
                              <span className="text-muted-foreground ml-1">({fmtNum(inst.install_equipment_horimeter)}h)</span>
                            </TableCell>
                            <TableCell className="text-xs">
                              {inst.remove_date ? (<><span className="font-mono">{format(new Date(inst.remove_date), 'dd/MM/yyyy')}</span><span className="text-muted-foreground ml-1">({fmtNum(inst.remove_equipment_horimeter!)}h)</span></>) : <Badge variant="secondary" className="text-xs">Ativo</Badge>}
                            </TableCell>
                            <TableCell className="font-mono text-sm">{delta != null ? `${fmtNum(delta)}h` : '—'}</TableCell>
                            <TableCell><Button size="icon" variant="ghost" onClick={() => openEditInstallation(inst)} title="Editar"><Pencil className="h-3.5 w-3.5" /></Button></TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TabsContent>

                <TabsContent value="maintenances">
                  <div className="flex justify-end mb-3">
                    <Button size="sm" onClick={() => { setMaintDate(''); setMaintOpen(true); }}>
                      <PlusCircle className="h-3.5 w-3.5 mr-1.5" />Registrar Manutenção
                    </Button>
                  </div>
                  <Table>
                    <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Horímetro</TableHead><TableHead>Descrição</TableHead><TableHead className="w-20"></TableHead></TableRow></TableHeader>
                    <TableBody>
                      {itemMaintenances.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">Nenhuma manutenção.</TableCell></TableRow>
                      ) : itemMaintenances.map(m => (
                        <TableRow key={m.id}>
                          <TableCell className="font-mono text-sm">{format(new Date(m.maintenance_date), 'dd/MM/yyyy')}</TableCell>
                          <TableCell className="font-mono text-sm">{fmtNum(m.horimeter_at_maintenance)}h</TableCell>
                          <TableCell className="text-sm">{m.description}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" onClick={() => openEditMaintenance(m)} title="Editar"><Pencil className="h-3.5 w-3.5" /></Button>
                              <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => { setDeleteMaintId(m.id); setDeleteMaintOpen(true); }} title="Excluir"><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Installation Dialog */}
      <Dialog open={editInstOpen} onOpenChange={setEditInstOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Editar Instalação</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Equipamento</label>
              <Select value={editInstEquipId} onValueChange={setEditInstEquipId}>
                <SelectTrigger><SelectValue placeholder="Selecione o motor" /></SelectTrigger>
                <SelectContent>{(equipments.data || []).map(eq => (<SelectItem key={eq.id} value={eq.id}>{eq.name}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Horímetro de Instalação</label>
              <Input type="number" value={editInstInstallHor} onChange={e => setEditInstInstallHor(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="text-sm font-medium">Horímetro de Remoção</label>
              <Input type="number" value={editInstRemoveHor} onChange={e => setEditInstRemoveHor(e.target.value)} placeholder="Vazio = ainda ativo" />
            </div>
            {editInstInstallHor && editInstRemoveHor && Number(editInstRemoveHor) > Number(editInstInstallHor) && (
              <div className="bg-secondary/50 rounded-md p-3 text-sm">
                <span className="text-muted-foreground">Delta de horas: </span>
                <span className="font-mono font-semibold">{fmtNum(Number(editInstRemoveHor) - Number(editInstInstallHor))}h</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditInstOpen(false)}>Cancelar</Button>
            <Button onClick={handleEditInstallation} disabled={store.updateInstallation.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Maintenance Dialog */}
      <Dialog open={maintOpen} onOpenChange={setMaintOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Registrar Manutenção do Turbo</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Data da Manutenção</label>
              <Input type="date" value={maintDate} onChange={e => setMaintDate(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">Deixe em branco para usar a data de hoje.</p>
            </div>
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Textarea value={maintDesc} onChange={e => setMaintDesc(e.target.value)} placeholder="Revisão completa, troca de mancal..." />
            </div>
            <div>
              <label className="text-sm font-medium">Horímetro no momento</label>
              <Input type="number" value={maintHorimeter} onChange={e => setMaintHorimeter(e.target.value)} placeholder="0" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMaintOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddMaintenance} disabled={store.addMaintenance.isPending}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Maintenance Dialog */}
      <Dialog open={batchMaintOpen} onOpenChange={setBatchMaintOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Manutenção em Lote</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Selecionar Turbos</label>
                <Button size="sm" variant="ghost" onClick={toggleAllBatch} className="text-xs h-7">{batchSelected.length === items.length ? 'Desmarcar Todos' : 'Selecionar Todos'}</Button>
              </div>
              <div className="border rounded-md max-h-48 overflow-y-auto divide-y">
                {items.length === 0 ? <p className="text-sm text-muted-foreground p-3 text-center">Nenhum turbo cadastrado.</p> : items.map(item => (
                  <label key={item.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer">
                    <Checkbox checked={batchSelected.includes(item.id)} onCheckedChange={() => toggleBatchSelect(item.id)} />
                    <span className="font-mono text-sm flex-1">{item.serial_number || '—'}</span>
                    <Badge className={`${statusColors[item.status]} text-xs`}>{turboStatusLabels[item.status]}</Badge>
                  </label>
                ))}
              </div>
              {batchSelected.length > 0 && <p className="text-xs text-muted-foreground mt-1">{batchSelected.length} selecionado(s)</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Data da Manutenção</label>
              <Input type="date" value={batchDate} onChange={e => setBatchDate(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">Deixe em branco para usar a data de hoje.</p>
            </div>
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Textarea value={batchDesc} onChange={e => setBatchDesc(e.target.value)} placeholder="Revisão completa..." />
            </div>
            <div>
              <label className="text-sm font-medium">Horímetro no momento</label>
              <Input type="number" value={batchHorimeter} onChange={e => setBatchHorimeter(e.target.value)} placeholder="0" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchMaintOpen(false)}>Cancelar</Button>
            <Button onClick={handleBatchMaintenance} disabled={store.addMaintenance.isPending || batchSelected.length === 0}>Registrar em {batchSelected.length} Turbo(s)</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Component Replacement Dialog */}
      <Dialog open={compOpen} onOpenChange={setCompOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Registrar Troca de Componentes</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Componentes trocados</label>
              <div className="border rounded-md divide-y">
                {Object.entries(turboComponentTypes).map(([key, label]) => (
                  <div key={key}>
                    <label className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer">
                      <Checkbox checked={compTypes.includes(key)} onCheckedChange={() => {
                        setCompTypes(prev => prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key]);
                        if (compTypes.includes(key)) setCompInventoryItems(prev => prev.filter(ci => ci.compType !== key));
                      }} />
                      <span className="text-sm flex-1">{label}</span>
                    </label>
                    {compTypes.includes(key) && (
                      <div className="px-3 pb-2 pl-9 space-y-1.5">
                        {compInventoryItems.filter(ci => ci.compType === key).map(ci => (
                          <div key={ci.inventoryItemId} className="flex items-center gap-2 bg-secondary/50 rounded px-2 py-1.5">
                            <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-xs flex-1 truncate">{ci.inventoryItemName}</span>
                            <Input type="number" className="w-16 h-7 text-xs" value={ci.quantity} min={1} max={ci.available} onChange={e => handleCompInventoryQtyChange(key, ci.inventoryItemId, Number(e.target.value))} />
                            <span className="text-xs text-muted-foreground">/ {ci.available}</span>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleRemoveCompInventoryItem(key, ci.inventoryItemId)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                          </div>
                        ))}
                        {compAddingItemType === key ? (
                          <Select onValueChange={(val) => handleAddCompInventoryItem(key, val)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione a peça do estoque" /></SelectTrigger>
                            <SelectContent>{inventoryStore.items.filter(i => i.quantity > 0).map(item => (<SelectItem key={item.id} value={item.id}>{item.name} — {item.part_number} (Estoque: {item.quantity})</SelectItem>))}</SelectContent>
                          </Select>
                        ) : (
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setCompAddingItemType(key)}>
                            <PlusCircle className="h-3 w-3 mr-1" />Vincular peça do estoque
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {compTypes.length > 0 && <p className="text-xs text-muted-foreground mt-1">{compTypes.length} selecionado(s)</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Data da Troca</label>
              <Input type="date" value={compDate} onChange={e => setCompDate(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">Deixe em branco para usar a data de hoje.</p>
            </div>
            <div>
              <label className="text-sm font-medium">Horímetro no momento</label>
              <Input type="number" value={compHorimeter} onChange={e => setCompHorimeter(e.target.value)} placeholder="0" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddComponents} disabled={store.addTurboComponentsBatch.isPending || compTypes.length === 0}>Registrar {compTypes.length} Troca(s)</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Historical Installation Dialog */}
      <Dialog open={histInstOpen} onOpenChange={setHistInstOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Adicionar Instalação Histórica</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Equipamento (Motor)</label>
              <Select value={histEquipId} onValueChange={setHistEquipId}>
                <SelectTrigger><SelectValue placeholder="Selecione o motor" /></SelectTrigger>
                <SelectContent>{(equipments.data || []).map(eq => (<SelectItem key={eq.id} value={eq.id}>{eq.name} — {eq.serial_number}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium">Data Instalação</label><Input type="date" value={histInstallDate} onChange={e => setHistInstallDate(e.target.value)} /></div>
              <div><label className="text-sm font-medium">Horímetro Instalação</label><Input type="number" value={histInstallHor} onChange={e => setHistInstallHor(e.target.value)} placeholder="0" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium">Data Remoção</label><Input type="date" value={histRemoveDate} onChange={e => setHistRemoveDate(e.target.value)} /></div>
              <div><label className="text-sm font-medium">Horímetro Remoção</label><Input type="number" value={histRemoveHor} onChange={e => setHistRemoveHor(e.target.value)} placeholder="0" /></div>
            </div>
            {histInstallHor && histRemoveHor && Number(histRemoveHor) > Number(histInstallHor) && (
              <div className="bg-secondary/50 rounded-md p-3 text-sm">
                <span className="text-muted-foreground">Delta de horas: </span>
                <span className="font-mono font-semibold">{fmtNum(Number(histRemoveHor) - Number(histInstallHor))}h</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistInstOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddHistoricalInstallation} disabled={store.addHistoricalInstallation.isPending || !histEquipId || !histInstallDate}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Historical Installation Dialog */}
      <Dialog open={batchHistOpen} onOpenChange={setBatchHistOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Instalações Históricas em Lote</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Selecionar Turbos</label>
                <Button size="sm" variant="ghost" onClick={toggleAllBatchHist} className="text-xs h-7">{batchHistSelected.length === items.length ? 'Desmarcar Todos' : 'Selecionar Todos'}</Button>
              </div>
              <div className="border rounded-md max-h-48 overflow-y-auto divide-y">
                {items.length === 0 ? <p className="text-sm text-muted-foreground p-3 text-center">Nenhum turbo cadastrado.</p> : items.map(item => (
                  <label key={item.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer">
                    <Checkbox checked={batchHistSelected.includes(item.id)} onCheckedChange={() => toggleBatchHistSelect(item.id)} />
                    <span className="font-mono text-sm flex-1">{item.serial_number || '—'}</span>
                    <Badge className={`${statusColors[item.status]} text-xs`}>{turboStatusLabels[item.status]}</Badge>
                  </label>
                ))}
              </div>
              {batchHistSelected.length > 0 && <p className="text-xs text-muted-foreground mt-1">{batchHistSelected.length} selecionado(s)</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Equipamento (Motor)</label>
              <Select value={batchHistEquipId} onValueChange={setBatchHistEquipId}>
                <SelectTrigger><SelectValue placeholder="Selecione o motor" /></SelectTrigger>
                <SelectContent>{(equipments.data || []).map(eq => (<SelectItem key={eq.id} value={eq.id}>{eq.name} — {eq.serial_number}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium">Data Instalação</label><Input type="date" value={batchHistInstallDate} onChange={e => setBatchHistInstallDate(e.target.value)} /></div>
              <div><label className="text-sm font-medium">Horímetro Instalação</label><Input type="number" value={batchHistInstallHor} onChange={e => setBatchHistInstallHor(e.target.value)} placeholder="0" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium">Data Remoção</label><Input type="date" value={batchHistRemoveDate} onChange={e => setBatchHistRemoveDate(e.target.value)} /></div>
              <div><label className="text-sm font-medium">Horímetro Remoção</label><Input type="number" value={batchHistRemoveHor} onChange={e => setBatchHistRemoveHor(e.target.value)} placeholder="0" /></div>
            </div>
            {batchHistInstallHor && batchHistRemoveHor && Number(batchHistRemoveHor) > Number(batchHistInstallHor) && (
              <div className="bg-secondary/50 rounded-md p-3 text-sm">
                <span className="text-muted-foreground">Delta de horas: </span>
                <span className="font-mono font-semibold">{fmtNum(Number(batchHistRemoveHor) - Number(batchHistInstallHor))}h</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchHistOpen(false)}>Cancelar</Button>
            <Button onClick={handleBatchHistoricalInstallation} disabled={store.addHistoricalInstallation.isPending || batchHistSelected.length === 0 || !batchHistEquipId || !batchHistInstallDate}>
              Registrar em {batchHistSelected.length} Turbo(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Maintenance Dialog */}
      <Dialog open={editMaintOpen} onOpenChange={setEditMaintOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Editar Manutenção</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Data</label>
              <Input type="date" value={editMaintDate} onChange={e => setEditMaintDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Horímetro</label>
              <Input type="number" value={editMaintHorimeter} onChange={e => setEditMaintHorimeter(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Textarea value={editMaintDesc} onChange={e => setEditMaintDesc(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMaintOpen(false)}>Cancelar</Button>
            <Button onClick={handleEditMaintenance} disabled={store.updateMaintenance.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Maintenance Dialog */}
      <Dialog open={deleteMaintOpen} onOpenChange={setDeleteMaintOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Excluir Manutenção</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Tem certeza que deseja excluir este registro de manutenção? Esta ação não pode ser desfeita.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteMaintOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteMaintenance} disabled={store.deleteMaintenance.isPending}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Turbo Dialog */}
      <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Desmontar Turbo</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {activeInstallation && (
              <div className="bg-secondary/50 rounded-md p-3 text-sm">
                <span className="text-muted-foreground">Equipamento: </span>
                <span className="font-medium">{equipments.data?.find(e => e.id === activeInstallation.equipment_id)?.name || '—'}</span>
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Horímetro de Remoção</label>
              <Input type="number" value={removeHorimeter} onChange={e => setRemoveHorimeter(e.target.value)} placeholder="Horímetro atual do equipamento" />
            </div>
            {activeInstallation && removeHorimeter && Number(removeHorimeter) > activeInstallation.install_equipment_horimeter && (
              <div className="bg-secondary/50 rounded-md p-3 text-sm">
                <span className="text-muted-foreground">Delta de horas: </span>
                <span className="font-mono font-semibold">{fmtNum(Number(removeHorimeter) - activeInstallation.install_equipment_horimeter)}h</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveOpen(false)}>Cancelar</Button>
            <Button onClick={handleRemoveTurbo} disabled={store.removeTurbo.isPending}>Desmontar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete All Dismounted Dialog */}
      <Dialog open={deleteAllDismountedOpen} onOpenChange={setDeleteAllDismountedOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Excluir Turbos Desmontados</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir <strong>{inStockTurbos.length}</strong> turbo(s) em estoque? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteAllDismountedOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteAllDismounted} disabled={store.deleteTurbo.isPending}>
              Excluir Todos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
