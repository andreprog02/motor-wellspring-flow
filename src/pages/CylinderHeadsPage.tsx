import { useState } from 'react';
import { formatLocalDate } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/AppLayout';
import { useCylinderHeadStore, cylinderHeadStatusLabels, cylinderHeadComponentTypes } from '@/hooks/useCylinderHeadStore';
import { useEquipmentStore } from '@/hooks/useEquipmentStore';
import { useInventoryStore } from '@/hooks/useInventoryStore';
import { supabase } from '@/integrations/supabase/client';
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PlusCircle, Clock, Wrench, Gauge, ArrowRightLeft, Pencil, Trash2, Calendar, Package, Search, ArrowUpDown, Download } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { CylinderHeadMetrics, CylinderHeadComponent } from '@/hooks/useCylinderHeadStore';

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

export default function CylinderHeadsPage() {
  const store = useCylinderHeadStore();
  const { equipments } = useEquipmentStore();
  const inventoryStore = useInventoryStore();

  // Dialog states
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

  // Form states
  const [serialNumber, setSerialNumber] = useState('');
  const [editSerial, setEditSerial] = useState('');
  const [editStatus, setEditStatus] = useState('in_stock');
  const [editEstimatedHours, setEditEstimatedHours] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [maintDesc, setMaintDesc] = useState('');
  const [maintHorimeter, setMaintHorimeter] = useState('');
  const [maintDate, setMaintDate] = useState('');

  // Batch maintenance states
  const [batchSelected, setBatchSelected] = useState<string[]>([]);
  const [batchDesc, setBatchDesc] = useState('');
  const [batchHorimeter, setBatchHorimeter] = useState('');
  const [batchDate, setBatchDate] = useState('');

  // Component replacement states
  const [compTypes, setCompTypes] = useState<string[]>([]);
  const [compDate, setCompDate] = useState('');
  const [compHorimeter, setCompHorimeter] = useState('');
  const [compInventoryItems, setCompInventoryItems] = useState<CompInventoryItem[]>([]);
  const [compAddingItemType, setCompAddingItemType] = useState<string | null>(null);

  // Historical installation states
  const [histEquipId, setHistEquipId] = useState('');
  const [histInstallDate, setHistInstallDate] = useState('');
  const [histInstallHor, setHistInstallHor] = useState('');
  const [histRemoveDate, setHistRemoveDate] = useState('');
  const [histRemoveHor, setHistRemoveHor] = useState('');

  // Batch historical installation states
  const [batchHistSelected, setBatchHistSelected] = useState<string[]>([]);
  const [batchHistEquipId, setBatchHistEquipId] = useState('');
  const [batchHistInstallDate, setBatchHistInstallDate] = useState('');
  const [batchHistInstallHor, setBatchHistInstallHor] = useState('');
  const [batchHistRemoveDate, setBatchHistRemoveDate] = useState('');
  const [batchHistRemoveHor, setBatchHistRemoveHor] = useState('');

  // Edit installation states
  const [editInstId, setEditInstId] = useState('');
  const [editInstEquipId, setEditInstEquipId] = useState('');
  const [editInstInstallHor, setEditInstInstallHor] = useState('');
  const [editInstRemoveHor, setEditInstRemoveHor] = useState('');

  // Edit/delete maintenance states
  const [editMaintId, setEditMaintId] = useState('');
  const [editMaintDesc, setEditMaintDesc] = useState('');
  const [editMaintHorimeter, setEditMaintHorimeter] = useState('');
  const [editMaintDate, setEditMaintDate] = useState('');
  const [deleteMaintId, setDeleteMaintId] = useState('');

  // Filter & sort states
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'serial' | 'maintenance'>('serial');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const headsRaw = store.cylinderHeads.data || [];
  const allInstallations = store.installations.data || [];

  const heads = headsRaw
    .filter(h => {
      if (statusFilter !== 'all' && h.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        return h.serial_number.toLowerCase().includes(searchQuery.trim().toLowerCase());
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'serial') {
        const cmp = a.serial_number.localeCompare(b.serial_number, 'pt-BR', { numeric: true });
        return sortDir === 'asc' ? cmp : -cmp;
      }
      const da = a.last_maintenance_date || '';
      const db = b.last_maintenance_date || '';
      const cmp = da.localeCompare(db);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  const allMaintenances = store.maintenances.data || [];
  const allComponents = store.headComponents.data || [];

  const selectedHead = heads.find(h => h.id === detailId);
  const headInstallations = allInstallations.filter(i => i.cylinder_head_id === detailId);
  const headMaintenances = allMaintenances.filter(m => m.cylinder_head_id === detailId);
  const headComps = allComponents.filter(c => c.cylinder_head_id === detailId);

  const metrics = useQuery({
    queryKey: ['cylinder_head_metrics', detailId],
    queryFn: () => store.getMetrics(detailId!),
    enabled: !!detailId,
  });

  // --- Handlers ---

  const handleAdd = async () => {
    if (!serialNumber.trim()) return;
    const existing = headsRaw.find(h => h.serial_number === serialNumber.trim());
    if (existing) {
      toast.error('Já existe um cabeçote com esse código.');
      return;
    }
    try {
      await store.addCylinderHead.mutateAsync({ serial_number: serialNumber.trim() });
      toast.success('Cabeçote cadastrado!');
      setSerialNumber('');
      setAddOpen(false);
    } catch (err: any) {
      if (err?.message?.includes('duplicate') || err?.code === '23505') {
        toast.error('Já existe um cabeçote com esse código.');
      } else {
        toast.error('Erro ao cadastrar cabeçote.');
      }
    }
  };

  const openEdit = (head: typeof heads[0], e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditId(head.id);
    setEditSerial(head.serial_number);
    setEditStatus(head.status);
    setEditEstimatedHours(head.estimated_total_hours != null ? String(head.estimated_total_hours) : '');
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editId || !editSerial.trim()) return;
    try {
      await store.updateCylinderHead.mutateAsync({ id: editId, serial_number: editSerial.trim(), status: editStatus, estimated_total_hours: editEstimatedHours ? Number(editEstimatedHours) : null });
      toast.success('Cabeçote atualizado!');
      setEditOpen(false);
    } catch {
      toast.error('Erro ao atualizar cabeçote.');
    }
  };

  const openDelete = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDeleteId(id);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await store.deleteCylinderHead.mutateAsync(deleteId);
      toast.success('Cabeçote excluído!');
      setDeleteOpen(false);
      if (detailId === deleteId) setDetailId(null);
    } catch {
      toast.error('Erro ao excluir. Verifique se não há instalações vinculadas.');
    }
  };

  const handleAddMaintenance = async () => {
    if (!detailId || !maintDesc.trim()) return;
    try {
      await store.addMaintenance.mutateAsync({
        cylinder_head_id: detailId,
        description: maintDesc.trim(),
        horimeter_at_maintenance: Number(maintHorimeter) || 0,
        maintenance_date: maintDate || undefined,
      });
      toast.success('Manutenção registrada!');
      setMaintDesc('');
      setMaintHorimeter('');
      setMaintDate('');
      setMaintOpen(false);
    } catch {
      toast.error('Erro ao registrar manutenção.');
    }
  };

  const toggleBatchSelect = (id: string) => {
    setBatchSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleAllBatch = () => {
    if (batchSelected.length === headsRaw.length) {
      setBatchSelected([]);
    } else {
      setBatchSelected(headsRaw.map(h => h.id));
    }
  };

  const handleBatchMaintenance = async () => {
    if (batchSelected.length === 0 || !batchDesc.trim()) return;
    try {
      for (const id of batchSelected) {
        await store.addMaintenance.mutateAsync({
          cylinder_head_id: id,
          description: batchDesc.trim(),
          horimeter_at_maintenance: Number(batchHorimeter) || 0,
          maintenance_date: batchDate || undefined,
        });
      }
      toast.success(`Manutenção registrada em ${batchSelected.length} cabeçote(s)!`);
      setBatchDesc('');
      setBatchHorimeter('');
      setBatchDate('');
      setBatchSelected([]);
      setBatchMaintOpen(false);
    } catch {
      toast.error('Erro ao registrar manutenção em lote.');
    }
  };

  const metricsData = metrics.data as CylinderHeadMetrics | undefined;

  const handleAddComponents = async () => {
    if (!detailId || compTypes.length === 0) return;
    const dateVal = compDate || formatLocalDate();
    const horimeterVal = Number(compHorimeter) || 0;
    try {
      const rows = compTypes.map(ct => ({
        cylinder_head_id: detailId,
        component_type: ct,
        replacement_date: dateVal,
        horimeter_at_replacement: horimeterVal,
      }));
      await store.addHeadComponentsBatch.mutateAsync(rows);

      // Deduct inventory items
      for (const ci of compInventoryItems) {
        if (ci.quantity > 0) {
          const item = inventoryStore.items.find(i => i.id === ci.inventoryItemId);
          if (item) {
            await inventoryStore.updateItem.mutateAsync({
              id: ci.inventoryItemId,
              quantity: Math.max(0, item.quantity - ci.quantity),
            });
          }
        }
      }

      toast.success(`Troca registrada para ${compTypes.length} item(ns)!`);
      setCompTypes([]);
      setCompDate('');
      setCompHorimeter('');
      setCompInventoryItems([]);
      setCompAddingItemType(null);
      setCompOpen(false);
    } catch {
      toast.error('Erro ao registrar troca de componente.');
    }
  };

  const handleAddCompInventoryItem = (compType: string, itemId: string) => {
    const item = inventoryStore.items.find(i => i.id === itemId);
    if (!item) return;
    // Check if already added for this comp type
    const exists = compInventoryItems.find(ci => ci.compType === compType && ci.inventoryItemId === itemId);
    if (exists) return;
    setCompInventoryItems(prev => [...prev, {
      compType,
      inventoryItemId: itemId,
      inventoryItemName: `${item.name} (${item.part_number})`,
      quantity: 1,
      available: item.quantity,
    }]);
    setCompAddingItemType(null);
  };

  const handleRemoveCompInventoryItem = (compType: string, itemId: string) => {
    setCompInventoryItems(prev => prev.filter(ci => !(ci.compType === compType && ci.inventoryItemId === itemId)));
  };

  const handleCompInventoryQtyChange = (compType: string, itemId: string, qty: number) => {
    setCompInventoryItems(prev => prev.map(ci =>
      ci.compType === compType && ci.inventoryItemId === itemId
        ? { ...ci, quantity: Math.max(1, Math.min(qty, ci.available)) }
        : ci
    ));
  };

  const handleAddHistoricalInstallation = async () => {
    if (!detailId || !histEquipId || !histInstallDate) return;
    try {
      await store.addHistoricalInstallation.mutateAsync({
        cylinder_head_id: detailId,
        equipment_id: histEquipId,
        install_date: histInstallDate,
        install_equipment_horimeter: Number(histInstallHor) || 0,
        remove_date: histRemoveDate || null,
        remove_equipment_horimeter: histRemoveHor ? Number(histRemoveHor) : null,
      });
      toast.success('Instalação histórica registrada!');
      setHistEquipId('');
      setHistInstallDate('');
      setHistInstallHor('');
      setHistRemoveDate('');
      setHistRemoveHor('');
      setHistInstOpen(false);
    } catch {
      toast.error('Erro ao registrar instalação.');
    }
  };


  const toggleBatchHistSelect = (id: string) => {
    setBatchHistSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleAllBatchHist = () => {
    if (batchHistSelected.length === headsRaw.length) {
      setBatchHistSelected([]);
    } else {
      setBatchHistSelected(headsRaw.map(h => h.id));
    }
  };

  const handleBatchHistoricalInstallation = async () => {
    if (batchHistSelected.length === 0 || !batchHistEquipId || !batchHistInstallDate) return;
    try {
      for (const chId of batchHistSelected) {
        await store.addHistoricalInstallation.mutateAsync({
          cylinder_head_id: chId,
          equipment_id: batchHistEquipId,
          install_date: batchHistInstallDate,
          install_equipment_horimeter: Number(batchHistInstallHor) || 0,
          remove_date: batchHistRemoveDate || null,
          remove_equipment_horimeter: batchHistRemoveHor ? Number(batchHistRemoveHor) : null,
        });
      }
      toast.success(`Instalação registrada em ${batchHistSelected.length} cabeçote(s)!`);
      setBatchHistSelected([]);
      setBatchHistEquipId('');
      setBatchHistInstallDate('');
      setBatchHistInstallHor('');
      setBatchHistRemoveDate('');
      setBatchHistRemoveHor('');
      setBatchHistOpen(false);
    } catch {
      toast.error('Erro ao registrar instalações em lote.');
    }
  };

  const getLatestReplacements = () => {
    const latest: Record<string, CylinderHeadComponent> = {};
    headComps.forEach(c => {
      if (!latest[c.component_type] || new Date(c.replacement_date) > new Date(latest[c.component_type].replacement_date)) {
        latest[c.component_type] = c;
      }
    });
    return latest;
  };

  const openEditInstallation = (inst: typeof headInstallations[0]) => {
    setEditInstId(inst.id);
    setEditInstEquipId(inst.equipment_id);
    setEditInstInstallHor(String(inst.install_equipment_horimeter));
    setEditInstRemoveHor(inst.remove_equipment_horimeter != null ? String(inst.remove_equipment_horimeter) : '');
    setEditInstOpen(true);
  };

  const handleEditInstallation = async () => {
    if (!editInstId || !editInstEquipId) return;
    try {
      await store.updateInstallation.mutateAsync({
        id: editInstId,
        equipment_id: editInstEquipId,
        install_equipment_horimeter: Number(editInstInstallHor) || 0,
        remove_equipment_horimeter: editInstRemoveHor ? Number(editInstRemoveHor) : null,
      });
      toast.success('Instalação atualizada!');
      setEditInstOpen(false);
    } catch {
      toast.error('Erro ao atualizar instalação.');
    }
  };

  const openEditMaintenance = (m: typeof headMaintenances[0]) => {
    setEditMaintId(m.id);
    setEditMaintDesc(m.description);
    setEditMaintHorimeter(String(m.horimeter_at_maintenance));
    setEditMaintDate(m.maintenance_date);
    setEditMaintOpen(true);
  };

  const handleEditMaintenance = async () => {
    if (!editMaintId || !editMaintDesc.trim()) return;
    try {
      await store.updateMaintenance.mutateAsync({
        id: editMaintId,
        description: editMaintDesc.trim(),
        horimeter_at_maintenance: Number(editMaintHorimeter) || 0,
        maintenance_date: editMaintDate,
      });
      toast.success('Manutenção atualizada!');
      setEditMaintOpen(false);
    } catch {
      toast.error('Erro ao atualizar manutenção.');
    }
  };

  const handleDeleteMaintenance = async () => {
    if (!deleteMaintId) return;
    try {
      await store.deleteMaintenance.mutateAsync(deleteMaintId);
      toast.success('Manutenção excluída!');
      setDeleteMaintOpen(false);
    } catch {
      toast.error('Erro ao excluir manutenção.');
    }
  };

  // --- Export functions ---
  const buildExportRows = () => {
    return heads.map(head => {
      const activeInst = allInstallations.find(i => i.cylinder_head_id === head.id && !i.remove_date);
      const eqName = activeInst ? equipments.data?.find(e => e.id === activeInst.equipment_id)?.name : '';
      const headMaints = allMaintenances.filter(m => m.cylinder_head_id === head.id)
        .sort((a, b) => a.maintenance_date.localeCompare(b.maintenance_date));
      const maintStr = headMaints.map((m, i) => `${i + 1}ª: ${fmtNum(m.horimeter_at_maintenance)}h (${format(new Date(m.maintenance_date + 'T12:00:00'), 'dd/MM/yyyy')})`).join(' | ');
      return {
        sn: head.serial_number,
        status: cylinderHeadStatusLabels[head.status] || head.status,
        equipment: eqName || '—',
        estimatedHours: head.estimated_total_hours || 0,
        maintenances: headMaints.length,
        maintDetail: maintStr || '—',
        lastMaint: head.last_maintenance_date ? format(new Date(head.last_maintenance_date + 'T12:00:00'), 'dd/MM/yyyy') : '—',
      };
    });
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const rows = buildExportRows();
    doc.setFontSize(16);
    doc.text('Relatório de Cabeçotes', 14, 18);
    doc.setFontSize(9);
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 25);

    autoTable(doc, {
      startY: 32,
      head: [['S/N', 'Status', 'Equipamento', 'Horas Estimadas', 'Manutenções', 'Última Manutenção']],
      body: rows.map(r => [r.sn, r.status, r.equipment, fmtNum(r.estimatedHours), String(r.maintenances), r.lastMaint]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [41, 65, 94], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    });

    // Summary table at the end
    const finalY = (doc as any).lastAutoTable?.finalY || 80;
    const pageHeight = doc.internal.pageSize.height;
    let startY = finalY + 15;
    if (startY + 20 > pageHeight) {
      doc.addPage();
      startY = 20;
    }
    doc.setFontSize(13);
    doc.text('Resumo — Horímetro por Cabeçote', 14, startY);
    autoTable(doc, {
      startY: startY + 8,
      head: [['S/N', 'Horas Totais Estimadas', 'Qtd. Manutenções', 'Detalhe Manutenções']],
      body: rows.map(r => [r.sn, fmtNum(r.estimatedHours) + 'h', String(r.maintenances), r.maintDetail]),
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [30, 80, 120], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 245, 250] },
      columnStyles: { 3: { cellWidth: 120 } },
    });

    doc.save(`cabecotes_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success('PDF exportado!');
  };

  const exportExcel = () => {
    const rows = buildExportRows();
    const wsData = [
      ['S/N', 'Status', 'Equipamento', 'Horas Estimadas', 'Manutenções', 'Última Manutenção', 'Detalhe Manutenções'],
      ...rows.map(r => [r.sn, r.status, r.equipment, r.estimatedHours, r.maintenances, r.lastMaint, r.maintDetail]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 10 }, { wch: 12 }, { wch: 20 }, { wch: 18 }, { wch: 12 }, { wch: 16 }, { wch: 60 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cabeçotes');
    XLSX.writeFile(wb, `cabecotes_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success('Excel exportado!');
  };

  const exportCSV = () => {
    const rows = buildExportRows();
    const header = 'S/N;Status;Equipamento;Horas Estimadas;Manutenções;Última Manutenção;Detalhe';
    const lines = rows.map(r => `${r.sn};${r.status};${r.equipment};${r.estimatedHours};${r.maintenances};${r.lastMaint};${r.maintDetail}`);
    const csv = [header, ...lines].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cabecotes_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportado!');
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Cabeçotes</h1>
            <p className="text-sm text-muted-foreground">Gestão de cabeçotes com rastreamento de horas</p>
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={exportPDF}>PDF</DropdownMenuItem>
                <DropdownMenuItem onClick={exportExcel}>Excel</DropdownMenuItem>
                <DropdownMenuItem onClick={exportCSV}>CSV</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" onClick={() => { setBatchHistSelected([]); setBatchHistOpen(true); }}>
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              Instalações em Lote
            </Button>
            <Button variant="outline" onClick={() => { setBatchSelected([]); setBatchMaintOpen(true); }}>
              <Calendar className="h-4 w-4 mr-2" />
              Manutenção em Lote
            </Button>
            <Button onClick={() => setAddOpen(true)}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Novo Cabeçote
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(['in_stock', 'active', 'maintenance'] as const).map(status => (
            <Card key={status}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                  status === 'in_stock' ? 'bg-[hsl(var(--status-ok))]/10' :
                  status === 'active' ? 'bg-[hsl(var(--industrial))]/10' :
                  'bg-[hsl(var(--status-warning))]/10'
                }`}>
                  {status === 'in_stock' ? <ArrowRightLeft className="h-5 w-5 text-[hsl(var(--status-ok))]" /> :
                   status === 'active' ? <Gauge className="h-5 w-5 text-[hsl(var(--industrial))]" /> :
                   <Wrench className="h-5 w-5 text-[hsl(var(--status-warning))]" />}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{cylinderHeadStatusLabels[status]}</p>
                  <p className="text-2xl font-bold">{heads.filter(h => h.status === status).length}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="in_stock">Estoque</SelectItem>
              <SelectItem value="active">No Motor</SelectItem>
              <SelectItem value="maintenance">Em Reparo</SelectItem>
            </SelectContent>
          </Select>
          <Select value={`${sortBy}-${sortDir}`} onValueChange={v => {
            const [by, dir] = v.split('-') as ['serial' | 'maintenance', 'asc' | 'desc'];
            setSortBy(by);
            setSortDir(dir);
          }}>
            <SelectTrigger className="w-[220px]">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="serial-asc">Código (A→Z)</SelectItem>
              <SelectItem value="serial-desc">Código (Z→A)</SelectItem>
              <SelectItem value="maintenance-desc">Manutenção (Recente)</SelectItem>
              <SelectItem value="maintenance-asc">Manutenção (Antiga)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>S/N</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Horas Estimadas</TableHead>
                <TableHead>Última Manutenção</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {heads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhum cabeçote cadastrado.
                  </TableCell>
                </TableRow>
              ) : heads.map(head => {
                const activeInst = allInstallations.find(i => i.cylinder_head_id === head.id && !i.remove_date);
                const eqName = activeInst ? equipments.data?.find(e => e.id === activeInst.equipment_id)?.name : null;
                return (
                  <TableRow key={head.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDetailId(head.id)}>
                    <TableCell className="font-mono font-medium">{head.serial_number || '—'}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[head.status]}>
                        {cylinderHeadStatusLabels[head.status] || head.status}
                      </Badge>
                      {eqName && <span className="ml-2 text-xs text-muted-foreground">({eqName})</span>}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-right">
                      {head.estimated_total_hours > 0 ? fmtNum(head.estimated_total_hours) + 'h' : '—'}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {head.last_maintenance_date ? format(new Date(head.last_maintenance_date), 'dd/MM/yyyy') : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={(e) => openEdit(head, e)} title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={(e) => openDelete(head.id, e)} title="Excluir">
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
          <DialogHeader>
            <DialogTitle>Novo Cabeçote</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Número de Série</label>
              <Input value={serialNumber} onChange={e => setSerialNumber(e.target.value)} placeholder="Ex: CH-001" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button onClick={handleAdd} disabled={store.addCylinderHead.isPending}>Cadastrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Cabeçote</DialogTitle>
          </DialogHeader>
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
            <div>
              <label className="text-sm font-medium">Horas Totais Estimadas</label>
              <Input type="number" placeholder="Ex: 25000" value={editEstimatedHours} onChange={e => setEditEstimatedHours(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleEdit} disabled={store.updateCylinderHead.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir Cabeçote</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Tem certeza que deseja excluir este cabeçote? Esta ação não pode ser desfeita.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={store.deleteCylinderHead.isPending}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailId} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedHead && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <span>Cabeçote {selectedHead.serial_number}</span>
                  <Badge className={statusColors[selectedHead.status]}>
                    {cylinderHeadStatusLabels[selectedHead.status]}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              {metricsData && (
                <div className="grid grid-cols-3 gap-4 my-4">
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
                  {selectedHead.estimated_total_hours > 0 && (
                    <Card className="border-primary/20">
                      <CardContent className="p-4 flex items-center gap-3">
                        <Clock className="h-5 w-5 text-primary" />
                        <div>
                          <p className="text-xs text-muted-foreground">Estimativa Total</p>
                          <p className="text-xl font-bold font-mono">{fmtNum(selectedHead.estimated_total_hours)}h</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              <Tabs defaultValue="report" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="report">Relatório</TabsTrigger>
                  <TabsTrigger value="components">Componentes</TabsTrigger>
                  <TabsTrigger value="history">Instalações</TabsTrigger>
                  <TabsTrigger value="maintenances">Manutenções</TabsTrigger>
                </TabsList>

                {/* Report tab - consolidated per head */}
                <TabsContent value="report">
                  <div className="space-y-5">
                    {/* Header */}
                    <div className="bg-secondary/40 rounded-lg p-4">
                      <h3 className="text-lg font-bold tracking-tight">Cabeçote {selectedHead.serial_number}</h3>
                      <div className="flex flex-wrap gap-x-6 gap-y-1 mt-1 text-sm text-muted-foreground">
                        <span>Status: <Badge className={`ml-1 ${statusColors[selectedHead.status] || ''}`}>{cylinderHeadStatusLabels[selectedHead.status] || selectedHead.status}</Badge></span>
                        {metrics.data && (
                          <>
                            <span>Horas Totais: <strong className="text-foreground font-mono">{fmtNum(metrics.data.total_hours)}h</strong></span>
                            <span>Horas Pós-Revisão: <strong className="text-foreground font-mono">{fmtNum(metrics.data.hours_since_maintenance)}h</strong></span>
                          </>
                        )}
                        {selectedHead.estimated_total_hours > 0 && (
                          <span>Estimativa Total: <strong className="text-foreground font-mono">{fmtNum(selectedHead.estimated_total_hours)}h</strong></span>
                        )}
                      </div>
                    </div>

                    {/* Sections by type */}
                    {(() => {
                      const sections: Array<{ title: string; icon: string; color: string; items: Array<{ date: string; description: string; horimeter?: number }> }> = [];

                      // Manutenções
                      const maintItems = headMaintenances.map(m => ({
                        date: m.maintenance_date,
                        description: m.description || 'Manutenção',
                        horimeter: m.horimeter_at_maintenance,
                      })).sort((a, b) => b.date.localeCompare(a.date));
                      if (maintItems.length > 0) {
                        sections.push({ title: 'Manutenções / Revisões', icon: '🔧', color: 'border-l-[hsl(var(--status-warning))]', items: maintItems });
                      }

                      // Instalações / Remoções
                      const instItems: Array<{ date: string; description: string; horimeter?: number }> = [];
                      headInstallations.forEach(inst => {
                        const eqName = equipments.data?.find(e => e.id === inst.equipment_id)?.name || '—';
                        instItems.push({ date: inst.install_date, description: `Instalado no ${eqName}`, horimeter: inst.install_equipment_horimeter });
                        if (inst.remove_date) {
                          instItems.push({ date: inst.remove_date, description: `Removido do ${eqName}`, horimeter: inst.remove_equipment_horimeter! });
                        }
                      });
                      instItems.sort((a, b) => b.date.localeCompare(a.date));
                      if (instItems.length > 0) {
                        sections.push({ title: 'Instalações / Remoções', icon: '🔄', color: 'border-l-[hsl(var(--industrial))]', items: instItems });
                      }

                      // Troca de componentes
                      const compItems = headComps.map(c => ({
                        date: c.replacement_date,
                        description: cylinderHeadComponentTypes[c.component_type] || c.component_type,
                        horimeter: c.horimeter_at_replacement,
                      })).sort((a, b) => b.date.localeCompare(a.date));
                      if (compItems.length > 0) {
                        sections.push({ title: 'Troca de Componentes', icon: '⚙️', color: 'border-l-[hsl(var(--status-ok))]', items: compItems });
                      }

                      if (sections.length === 0) {
                        return <p className="text-sm text-muted-foreground text-center py-6">Nenhum evento registrado para este cabeçote.</p>;
                      }

                      return sections.map((section, sIdx) => (
                        <div key={sIdx}>
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <span>{section.icon}</span> {section.title}
                            <Badge variant="secondary" className="text-xs font-mono">{section.items.length}</Badge>
                          </h4>
                          <div className="space-y-1">
                            {section.items.map((item, iIdx) => (
                              <div key={iIdx} className={`flex items-center gap-3 py-2 px-3 rounded-md bg-secondary/30 border-l-4 ${section.color}`}>
                                <span className="font-mono text-sm font-medium min-w-[90px]">{format(new Date(item.date + 'T12:00:00'), 'dd/MM/yyyy')}</span>
                                <span className="text-sm flex-1">{item.description}</span>
                                {item.horimeter != null && <span className="font-mono text-xs text-muted-foreground">{fmtNum(item.horimeter)}h</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </TabsContent>

                <TabsContent value="components">
                  <div className="flex justify-end mb-3">
                    <Button size="sm" onClick={() => { setCompTypes([]); setCompDate(''); setCompHorimeter(''); setCompInventoryItems([]); setCompAddingItemType(null); setCompOpen(true); }}>
                      <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
                      Registrar Troca
                    </Button>
                  </div>
                  {(() => {
                    const latest = getLatestReplacements();
                    return (
                      <div className="space-y-2">
                        {Object.entries(cylinderHeadComponentTypes).map(([key, label]) => {
                          const comp = latest[key];
                          return (
                            <div key={key} className="flex items-center justify-between py-2.5 px-3 rounded-md bg-secondary/50">
                              <span className="text-sm font-medium">{label}</span>
                              {comp ? (
                                <div className="text-right">
                                  <span className="text-sm font-mono">{format(new Date(comp.replacement_date), 'dd/MM/yyyy')}</span>
                                  <span className="text-xs text-muted-foreground ml-2">({fmtNum(comp.horimeter_at_replacement)}h)</span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">Sem registro</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {headComps.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Histórico completo de trocas</p>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Componente</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Horímetro</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {headComps.map(c => (
                            <TableRow key={c.id}>
                              <TableCell className="text-sm">{cylinderHeadComponentTypes[c.component_type] || c.component_type}</TableCell>
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
                      <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
                      Adicionar Instalação
                    </Button>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Equipamento</TableHead>
                        <TableHead>Instalação</TableHead>
                        <TableHead>Remoção</TableHead>
                        <TableHead>Horas (Delta)</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {headInstallations.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-4">Nenhuma instalação.</TableCell></TableRow>
                      ) : headInstallations.map(inst => {
                        const eqName = equipments.data?.find(e => e.id === inst.equipment_id)?.name || '—';
                        const delta = inst.remove_equipment_horimeter != null
                          ? inst.remove_equipment_horimeter - inst.install_equipment_horimeter
                          : null;
                        return (
                          <TableRow key={inst.id}>
                            <TableCell className="font-medium text-sm">{eqName}</TableCell>
                            <TableCell className="text-xs">
                              <span className="font-mono">{format(new Date(inst.install_date), 'dd/MM/yyyy')}</span>
                              <span className="text-muted-foreground ml-1">({fmtNum(inst.install_equipment_horimeter)}h)</span>
                            </TableCell>
                            <TableCell className="text-xs">
                              {inst.remove_date ? (
                                <>
                                  <span className="font-mono">{format(new Date(inst.remove_date), 'dd/MM/yyyy')}</span>
                                  <span className="text-muted-foreground ml-1">({fmtNum(inst.remove_equipment_horimeter!)}h)</span>
                                </>
                              ) : <Badge variant="secondary" className="text-xs">Ativo</Badge>}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {delta != null ? `${fmtNum(delta)}h` : '—'}
                            </TableCell>
                            <TableCell>
                              <Button size="icon" variant="ghost" onClick={() => openEditInstallation(inst)} title="Editar">
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TabsContent>

                <TabsContent value="maintenances">
                  <div className="flex justify-end mb-3">
                    <Button size="sm" onClick={() => { setMaintDate(''); setMaintOpen(true); }}>
                      <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
                      Registrar Manutenção
                    </Button>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Horímetro</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="w-20 text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {headMaintenances.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">Nenhuma manutenção.</TableCell></TableRow>
                      ) : headMaintenances.map(m => (
                        <TableRow key={m.id}>
                          <TableCell className="font-mono text-sm">{format(new Date(m.maintenance_date), 'dd/MM/yyyy')}</TableCell>
                          <TableCell className="font-mono text-sm">{fmtNum(m.horimeter_at_maintenance)}h</TableCell>
                          <TableCell className="text-sm">{m.description}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button size="icon" variant="ghost" onClick={() => openEditMaintenance(m)} title="Editar">
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => { setDeleteMaintId(m.id); setDeleteMaintOpen(true); }} title="Excluir">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
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
          <DialogHeader>
            <DialogTitle>Editar Instalação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Equipamento</label>
              <Select value={editInstEquipId} onValueChange={setEditInstEquipId}>
                <SelectTrigger><SelectValue placeholder="Selecione o motor" /></SelectTrigger>
                <SelectContent>
                  {(equipments.data || []).map(eq => (
                    <SelectItem key={eq.id} value={eq.id}>{eq.name}</SelectItem>
                  ))}
                </SelectContent>
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

      {/* Edit Maintenance Dialog */}
      <Dialog open={editMaintOpen} onOpenChange={setEditMaintOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Manutenção</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Data da Manutenção</label>
              <Input type="date" value={editMaintDate} onChange={e => setEditMaintDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Textarea value={editMaintDesc} onChange={e => setEditMaintDesc(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Horímetro no momento</label>
              <Input type="number" value={editMaintHorimeter} onChange={e => setEditMaintHorimeter(e.target.value)} placeholder="0" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMaintOpen(false)}>Cancelar</Button>
            <Button onClick={handleEditMaintenance} disabled={store.updateMaintenance.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Maintenance Confirmation */}
      <Dialog open={deleteMaintOpen} onOpenChange={setDeleteMaintOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir Manutenção</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Tem certeza que deseja excluir este registro de manutenção?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteMaintOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteMaintenance} disabled={store.deleteMaintenance.isPending}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Individual Maintenance Dialog */}
      <Dialog open={maintOpen} onOpenChange={setMaintOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Manutenção do Cabeçote</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Data da Manutenção</label>
              <Input type="date" value={maintDate} onChange={e => setMaintDate(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">Deixe em branco para usar a data de hoje.</p>
            </div>
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Textarea value={maintDesc} onChange={e => setMaintDesc(e.target.value)} placeholder="Retífica completa, troca de válvulas..." />
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
          <DialogHeader>
            <DialogTitle>Manutenção em Lote</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Selecionar Cabeçotes</label>
                <Button size="sm" variant="ghost" onClick={toggleAllBatch} className="text-xs h-7">
                  {batchSelected.length === headsRaw.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                </Button>
              </div>
              <div className="border rounded-md max-h-48 overflow-y-auto divide-y">
                {headsRaw.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-3 text-center">Nenhum cabeçote cadastrado.</p>
                ) : headsRaw.map(head => (
                  <label key={head.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer">
                    <Checkbox
                      checked={batchSelected.includes(head.id)}
                      onCheckedChange={() => toggleBatchSelect(head.id)}
                    />
                    <span className="font-mono text-sm flex-1">{head.serial_number || '—'}</span>
                    <Badge className={`${statusColors[head.status]} text-xs`}>
                      {cylinderHeadStatusLabels[head.status]}
                    </Badge>
                  </label>
                ))}
              </div>
              {batchSelected.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">{batchSelected.length} selecionado(s)</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">Data da Manutenção</label>
              <Input type="date" value={batchDate} onChange={e => setBatchDate(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">Deixe em branco para usar a data de hoje.</p>
            </div>
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Textarea value={batchDesc} onChange={e => setBatchDesc(e.target.value)} placeholder="Retífica completa, troca de válvulas..." />
            </div>
            <div>
              <label className="text-sm font-medium">Horímetro no momento</label>
              <Input type="number" value={batchHorimeter} onChange={e => setBatchHorimeter(e.target.value)} placeholder="0" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchMaintOpen(false)}>Cancelar</Button>
            <Button onClick={handleBatchMaintenance} disabled={store.addMaintenance.isPending || batchSelected.length === 0}>
              Registrar em {batchSelected.length} Cabeçote(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Component Replacement Dialog */}
      <Dialog open={compOpen} onOpenChange={setCompOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Troca de Componentes</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Componentes trocados</label>
              <div className="border rounded-md divide-y">
                {Object.entries(cylinderHeadComponentTypes).map(([key, label]) => (
                  <div key={key}>
                    <label className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer">
                      <Checkbox
                        checked={compTypes.includes(key)}
                        onCheckedChange={() => {
                          setCompTypes(prev => prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key]);
                          if (compTypes.includes(key)) {
                            setCompInventoryItems(prev => prev.filter(ci => ci.compType !== key));
                          }
                        }}
                      />
                      <span className="text-sm flex-1">{label}</span>
                    </label>
                    {compTypes.includes(key) && (
                      <div className="px-3 pb-2 pl-9 space-y-1.5">
                        {compInventoryItems.filter(ci => ci.compType === key).map(ci => (
                          <div key={ci.inventoryItemId} className="flex items-center gap-2 bg-secondary/50 rounded px-2 py-1.5">
                            <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-xs flex-1 truncate">{ci.inventoryItemName}</span>
                            <Input
                              type="number"
                              className="w-16 h-7 text-xs"
                              value={ci.quantity}
                              min={1}
                              max={ci.available}
                              onChange={e => handleCompInventoryQtyChange(key, ci.inventoryItemId, Number(e.target.value))}
                            />
                            <span className="text-xs text-muted-foreground">/ {ci.available}</span>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleRemoveCompInventoryItem(key, ci.inventoryItemId)}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        ))}
                        {compAddingItemType === key ? (
                          <Select onValueChange={(val) => handleAddCompInventoryItem(key, val)}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Selecione a peça do estoque" />
                            </SelectTrigger>
                            <SelectContent>
                              {inventoryStore.items.filter(i => i.quantity > 0).map(item => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.name} — {item.part_number} (Estoque: {item.quantity})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setCompAddingItemType(key)}>
                            <PlusCircle className="h-3 w-3 mr-1" />
                            Vincular peça do estoque
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {compTypes.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">{compTypes.length} selecionado(s)</p>
              )}
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
            <Button onClick={handleAddComponents} disabled={store.addHeadComponentsBatch.isPending || compTypes.length === 0}>
              Registrar {compTypes.length} Troca(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Historical Installation Dialog */}
      <Dialog open={histInstOpen} onOpenChange={setHistInstOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Instalação Histórica</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Equipamento (Motor)</label>
              <Select value={histEquipId} onValueChange={setHistEquipId}>
                <SelectTrigger><SelectValue placeholder="Selecione o motor" /></SelectTrigger>
                <SelectContent>
                  {(equipments.data || []).map(eq => (
                    <SelectItem key={eq.id} value={eq.id}>{eq.name} — {eq.serial_number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Data Instalação</label>
                <Input type="date" value={histInstallDate} onChange={e => setHistInstallDate(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Horímetro Instalação</label>
                <Input type="number" value={histInstallHor} onChange={e => setHistInstallHor(e.target.value)} placeholder="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Data Remoção</label>
                <Input type="date" value={histRemoveDate} onChange={e => setHistRemoveDate(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Horímetro Remoção</label>
                <Input type="number" value={histRemoveHor} onChange={e => setHistRemoveHor(e.target.value)} placeholder="0" />
              </div>
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
            <Button
              onClick={handleAddHistoricalInstallation}
              disabled={store.addHistoricalInstallation.isPending || !histEquipId || !histInstallDate}
            >
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Historical Installation Dialog */}
      <Dialog open={batchHistOpen} onOpenChange={setBatchHistOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Instalações Históricas em Lote</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Selecionar Cabeçotes</label>
                <Button size="sm" variant="ghost" onClick={toggleAllBatchHist} className="text-xs h-7">
                  {batchHistSelected.length === headsRaw.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                </Button>
              </div>
              <div className="border rounded-md max-h-48 overflow-y-auto divide-y">
                {headsRaw.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-3 text-center">Nenhum cabeçote cadastrado.</p>
                ) : headsRaw.map(head => (
                  <label key={head.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer">
                    <Checkbox
                      checked={batchHistSelected.includes(head.id)}
                      onCheckedChange={() => toggleBatchHistSelect(head.id)}
                    />
                    <span className="font-mono text-sm flex-1">{head.serial_number || '—'}</span>
                    <Badge className={`${statusColors[head.status]} text-xs`}>
                      {cylinderHeadStatusLabels[head.status]}
                    </Badge>
                  </label>
                ))}
              </div>
              {batchHistSelected.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">{batchHistSelected.length} selecionado(s)</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">Equipamento (Motor)</label>
              <Select value={batchHistEquipId} onValueChange={setBatchHistEquipId}>
                <SelectTrigger><SelectValue placeholder="Selecione o motor" /></SelectTrigger>
                <SelectContent>
                  {(equipments.data || []).map(eq => (
                    <SelectItem key={eq.id} value={eq.id}>{eq.name} — {eq.serial_number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Data Instalação</label>
                <Input type="date" value={batchHistInstallDate} onChange={e => setBatchHistInstallDate(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Horímetro Instalação</label>
                <Input type="number" value={batchHistInstallHor} onChange={e => setBatchHistInstallHor(e.target.value)} placeholder="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Data Remoção</label>
                <Input type="date" value={batchHistRemoveDate} onChange={e => setBatchHistRemoveDate(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Horímetro Remoção</label>
                <Input type="number" value={batchHistRemoveHor} onChange={e => setBatchHistRemoveHor(e.target.value)} placeholder="0" />
              </div>
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
            <Button
              onClick={handleBatchHistoricalInstallation}
              disabled={store.addHistoricalInstallation.isPending || batchHistSelected.length === 0 || !batchHistEquipId || !batchHistInstallDate}
            >
              Registrar em {batchHistSelected.length} Cabeçote(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
