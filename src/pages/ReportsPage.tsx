import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useCylinderHeadStore } from '@/hooks/useCylinderHeadStore';
import { useTurboStore } from '@/hooks/useTurboStore';
import { useEquipmentStore } from '@/hooks/useEquipmentStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FileDown, Filter, FileText, Columns3 } from 'lucide-react';
import { format } from 'date-fns';
import { cylinderHeadComponentTypes } from '@/hooks/useCylinderHeadStore';
import { turboComponentTypes } from '@/hooks/useTurboStore';

function fmtNum(n: number): string {
  return n.toLocaleString('pt-BR');
}

type ReportType = 'installations' | 'maintenances' | 'components';
type AssetType = 'all' | 'cylinder_head' | 'turbo';

const installationColumns = [
  { key: 'type', label: 'Tipo' },
  { key: 'serial', label: 'S/N' },
  { key: 'equipment', label: 'Equipamento' },
  { key: 'installDate', label: 'Instalação' },
  { key: 'removeDate', label: 'Remoção' },
  { key: 'delta', label: 'Delta (h)' },
] as const;

const maintenanceColumns = [
  { key: 'type', label: 'Tipo' },
  { key: 'serial', label: 'S/N' },
  { key: 'date', label: 'Data' },
  { key: 'horimeter', label: 'Horímetro' },
  { key: 'description', label: 'Descrição' },
] as const;

const componentColumns = [
  { key: 'type', label: 'Tipo' },
  { key: 'serial', label: 'S/N' },
  { key: 'component', label: 'Componente' },
  { key: 'date', label: 'Data' },
  { key: 'horimeter', label: 'Horímetro' },
] as const;

export default function ReportsPage() {
  const chStore = useCylinderHeadStore();
  const tbStore = useTurboStore();
  const { equipments } = useEquipmentStore();

  const [reportType, setReportType] = useState<ReportType>('installations');
  const [assetType, setAssetType] = useState<AssetType>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [equipFilter, setEquipFilter] = useState('all');
  const [serialFilter, setSerialFilter] = useState('');

  // Column visibility state per report type
  const [instCols, setInstCols] = useState<Set<string>>(new Set(installationColumns.map(c => c.key)));
  const [maintCols, setMaintCols] = useState<Set<string>>(new Set(maintenanceColumns.map(c => c.key)));
  const [compCols, setCompCols] = useState<Set<string>>(new Set(componentColumns.map(c => c.key)));

  const toggleCol = (set: Set<string>, setFn: React.Dispatch<React.SetStateAction<Set<string>>>, key: string) => {
    const next = new Set(set);
    if (next.has(key)) { if (next.size > 1) next.delete(key); } else next.add(key);
    setFn(next);
  };

  const heads = chStore.cylinderHeads.data || [];
  const chInstallations = chStore.installations.data || [];
  const chMaintenances = chStore.maintenances.data || [];
  const chComponents = chStore.headComponents.data || [];

  const turbos = tbStore.turbos.data || [];
  const tbInstallations = tbStore.installations.data || [];
  const tbMaintenances = tbStore.maintenances.data || [];
  const tbComponents = tbStore.turboComponents.data || [];

  const eqList = equipments.data || [];
  const eqMap = useMemo(() => Object.fromEntries(eqList.map(e => [e.id, e.name])), [eqList]);
  const chMap = useMemo(() => Object.fromEntries(heads.map(h => [h.id, h.serial_number])), [heads]);
  const tbMap = useMemo(() => Object.fromEntries(turbos.map(t => [t.id, t.serial_number])), [turbos]);

  const filterDate = (dateStr: string) => {
    if (dateFrom && dateStr < dateFrom) return false;
    if (dateTo && dateStr > dateTo) return false;
    return true;
  };

  const filterSerial = (serial: string) => {
    if (!serialFilter) return true;
    return serial.toLowerCase().includes(serialFilter.toLowerCase());
  };

  // --- Installations ---
  const installationRows = useMemo(() => {
    const rows: Array<{ type: string; serial: string; equipment: string; installDate: string; removeDate: string | null; installHor: number; removeHor: number | null; delta: number | null }> = [];

    if (assetType !== 'turbo') {
      chInstallations.forEach(i => {
        const serial = chMap[i.cylinder_head_id] || '—';
        if (!filterSerial(serial)) return;
        if (!filterDate(i.install_date)) return;
        if (equipFilter !== 'all' && i.equipment_id !== equipFilter) return;
        const delta = i.remove_equipment_horimeter != null ? i.remove_equipment_horimeter - i.install_equipment_horimeter : null;
        rows.push({ type: 'Cabeçote', serial, equipment: eqMap[i.equipment_id] || '—', installDate: i.install_date, removeDate: i.remove_date, installHor: i.install_equipment_horimeter, removeHor: i.remove_equipment_horimeter, delta });
      });
    }

    if (assetType !== 'cylinder_head') {
      tbInstallations.forEach(i => {
        const serial = tbMap[i.turbo_id] || '—';
        if (!filterSerial(serial)) return;
        if (!filterDate(i.install_date)) return;
        if (equipFilter !== 'all' && i.equipment_id !== equipFilter) return;
        const delta = i.remove_equipment_horimeter != null ? i.remove_equipment_horimeter - i.install_equipment_horimeter : null;
        rows.push({ type: 'Turbo', serial, equipment: eqMap[i.equipment_id] || '—', installDate: i.install_date, removeDate: i.remove_date, installHor: i.install_equipment_horimeter, removeHor: i.remove_equipment_horimeter, delta });
      });
    }

    rows.sort((a, b) => b.installDate.localeCompare(a.installDate));
    return rows;
  }, [assetType, chInstallations, tbInstallations, chMap, tbMap, eqMap, dateFrom, dateTo, equipFilter, serialFilter]);

  // --- Maintenances ---
  const maintenanceRows = useMemo(() => {
    const rows: Array<{ type: string; serial: string; date: string; description: string; horimeter: number }> = [];

    if (assetType !== 'turbo') {
      chMaintenances.forEach(m => {
        const serial = chMap[m.cylinder_head_id] || '—';
        if (!filterSerial(serial)) return;
        if (!filterDate(m.maintenance_date)) return;
        rows.push({ type: 'Cabeçote', serial, date: m.maintenance_date, description: m.description, horimeter: m.horimeter_at_maintenance });
      });
    }

    if (assetType !== 'cylinder_head') {
      tbMaintenances.forEach(m => {
        const serial = tbMap[m.turbo_id] || '—';
        if (!filterSerial(serial)) return;
        if (!filterDate(m.maintenance_date)) return;
        rows.push({ type: 'Turbo', serial, date: m.maintenance_date, description: m.description, horimeter: m.horimeter_at_maintenance });
      });
    }

    rows.sort((a, b) => b.date.localeCompare(a.date));
    return rows;
  }, [assetType, chMaintenances, tbMaintenances, chMap, tbMap, dateFrom, dateTo, serialFilter]);

  // --- Components ---
  const componentRows = useMemo(() => {
    const rows: Array<{ type: string; serial: string; component: string; date: string; horimeter: number }> = [];

    if (assetType !== 'turbo') {
      chComponents.forEach(c => {
        const serial = chMap[c.cylinder_head_id] || '—';
        if (!filterSerial(serial)) return;
        if (!filterDate(c.replacement_date)) return;
        rows.push({ type: 'Cabeçote', serial, component: cylinderHeadComponentTypes[c.component_type] || c.component_type, date: c.replacement_date, horimeter: c.horimeter_at_replacement });
      });
    }

    if (assetType !== 'cylinder_head') {
      tbComponents.forEach(c => {
        const serial = tbMap[c.turbo_id] || '—';
        if (!filterSerial(serial)) return;
        if (!filterDate(c.replacement_date)) return;
        rows.push({ type: 'Turbo', serial, component: turboComponentTypes[c.component_type] || c.component_type, date: c.replacement_date, horimeter: c.horimeter_at_replacement });
      });
    }

    rows.sort((a, b) => b.date.localeCompare(a.date));
    return rows;
  }, [assetType, chComponents, tbComponents, chMap, tbMap, dateFrom, dateTo, serialFilter]);

  // Get active columns config for current report type
  const activeColsDef = reportType === 'installations' ? installationColumns : reportType === 'maintenances' ? maintenanceColumns : componentColumns;
  const activeColsSet = reportType === 'installations' ? instCols : reportType === 'maintenances' ? maintCols : compCols;
  const activeColsSetFn = reportType === 'installations' ? setInstCols : reportType === 'maintenances' ? setMaintCols : setCompCols;

  const handleExportCSV = () => {
    let csv = '';
    if (reportType === 'installations') {
      const allCols = [
        { key: 'type', label: 'Tipo' }, { key: 'serial', label: 'S/N' }, { key: 'equipment', label: 'Equipamento' },
        { key: 'installDate', label: 'Data Instalação' }, { key: 'installHor', label: 'Horímetro Inst.' },
        { key: 'removeDate', label: 'Data Remoção' }, { key: 'removeHor', label: 'Horímetro Rem.' }, { key: 'delta', label: 'Delta (h)' },
      ];
      // Map visible UI cols to CSV cols
      const visibleKeys = new Set<string>();
      if (instCols.has('type')) visibleKeys.add('type');
      if (instCols.has('serial')) visibleKeys.add('serial');
      if (instCols.has('equipment')) visibleKeys.add('equipment');
      if (instCols.has('installDate')) { visibleKeys.add('installDate'); visibleKeys.add('installHor'); }
      if (instCols.has('removeDate')) { visibleKeys.add('removeDate'); visibleKeys.add('removeHor'); }
      if (instCols.has('delta')) visibleKeys.add('delta');
      const cols = allCols.filter(c => visibleKeys.has(c.key));
      csv = cols.map(c => c.label).join(';') + '\n';
      installationRows.forEach(r => {
        const vals: Record<string, string> = {
          type: r.type, serial: r.serial, equipment: r.equipment, installDate: r.installDate,
          installHor: String(r.installHor), removeDate: r.removeDate || '', removeHor: r.removeHor != null ? String(r.removeHor) : '', delta: r.delta != null ? String(r.delta) : '',
        };
        csv += cols.map(c => vals[c.key]).join(';') + '\n';
      });
    } else if (reportType === 'maintenances') {
      const cols = maintenanceColumns.filter(c => maintCols.has(c.key));
      csv = cols.map(c => c.label).join(';') + '\n';
      maintenanceRows.forEach(r => {
        const vals: Record<string, string> = { type: r.type, serial: r.serial, date: r.date, horimeter: String(r.horimeter), description: r.description };
        csv += cols.map(c => vals[c.key]).join(';') + '\n';
      });
    } else {
      const cols = componentColumns.filter(c => compCols.has(c.key));
      csv = cols.map(c => c.label).join(';') + '\n';
      componentRows.forEach(r => {
        const vals: Record<string, string> = { type: r.type, serial: r.serial, component: r.component, date: r.date, horimeter: String(r.horimeter) };
        csv += cols.map(c => vals[c.key]).join(';') + '\n';
      });
    }

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_${reportType}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF({ orientation: 'landscape' });
    const title = reportType === 'installations' ? 'Relatório de Instalações' : reportType === 'maintenances' ? 'Relatório de Manutenções' : 'Relatório de Troca de Componentes';
    doc.setFontSize(16);
    doc.text(title, 14, 18);
    doc.setFontSize(9);
    doc.text(`Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 25);

    if (reportType === 'installations') {
      const allPdfCols = [
        { key: 'type', label: 'Tipo' }, { key: 'serial', label: 'S/N' }, { key: 'equipment', label: 'Equipamento' },
        { key: 'installDate', label: 'Data Instalação' }, { key: 'installHor', label: 'Hor. Inst.' },
        { key: 'removeDate', label: 'Data Remoção' }, { key: 'removeHor', label: 'Hor. Rem.' }, { key: 'delta', label: 'Delta (h)' },
      ];
      const visibleKeys = new Set<string>();
      if (instCols.has('type')) visibleKeys.add('type');
      if (instCols.has('serial')) visibleKeys.add('serial');
      if (instCols.has('equipment')) visibleKeys.add('equipment');
      if (instCols.has('installDate')) { visibleKeys.add('installDate'); visibleKeys.add('installHor'); }
      if (instCols.has('removeDate')) { visibleKeys.add('removeDate'); visibleKeys.add('removeHor'); }
      if (instCols.has('delta')) visibleKeys.add('delta');
      const cols = allPdfCols.filter(c => visibleKeys.has(c.key));
      autoTable(doc, {
        startY: 30,
        head: [cols.map(c => c.label)],
        body: installationRows.map(r => {
          const vals: Record<string, string> = {
            type: r.type, serial: r.serial, equipment: r.equipment,
            installDate: r.installDate ? format(new Date(r.installDate), 'dd/MM/yyyy') : '',
            installHor: fmtNum(r.installHor),
            removeDate: r.removeDate ? format(new Date(r.removeDate), 'dd/MM/yyyy') : '—',
            removeHor: r.removeHor != null ? fmtNum(r.removeHor) : '—',
            delta: r.delta != null ? fmtNum(r.delta) : '—',
          };
          return cols.map(c => vals[c.key]);
        }),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [60, 60, 60] },
      });
    } else if (reportType === 'maintenances') {
      const cols = maintenanceColumns.filter(c => maintCols.has(c.key));
      autoTable(doc, {
        startY: 30,
        head: [cols.map(c => c.label)],
        body: maintenanceRows.map(r => {
          const vals: Record<string, string> = {
            type: r.type, serial: r.serial, date: format(new Date(r.date), 'dd/MM/yyyy'), horimeter: fmtNum(r.horimeter) + 'h', description: r.description,
          };
          return cols.map(c => vals[c.key]);
        }),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [60, 60, 60] },
      });
    } else {
      const cols = componentColumns.filter(c => compCols.has(c.key));
      autoTable(doc, {
        startY: 30,
        head: [cols.map(c => c.label)],
        body: componentRows.map(r => {
          const vals: Record<string, string> = {
            type: r.type, serial: r.serial, component: r.component, date: format(new Date(r.date), 'dd/MM/yyyy'), horimeter: fmtNum(r.horimeter) + 'h',
          };
          return cols.map(c => vals[c.key]);
        }),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [60, 60, 60] },
      });
    }

    doc.save(`relatorio_${reportType}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const currentCount = reportType === 'installations' ? installationRows.length : reportType === 'maintenances' ? maintenanceRows.length : componentRows.length;

  const visibleInstColCount = installationColumns.filter(c => instCols.has(c.key)).length;
  const visibleMaintColCount = maintenanceColumns.filter(c => maintCols.has(c.key)).length;
  const visibleCompColCount = componentColumns.filter(c => compCols.has(c.key)).length;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
            <p className="text-sm text-muted-foreground">Histórico consolidado de cabeçotes e turbos</p>
          </div>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Columns3 className="h-4 w-4 mr-2" />Colunas
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-52 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">Colunas visíveis</p>
                <div className="space-y-2">
                  {activeColsDef.map(col => (
                    <label key={col.key} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={activeColsSet.has(col.key)}
                        onCheckedChange={() => toggleCol(activeColsSet, activeColsSetFn, col.key)}
                      />
                      {col.label}
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={currentCount === 0}>
                  <FileDown className="h-4 w-4 mr-2" />Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportCSV}>
                  <FileDown className="h-4 w-4 mr-2" />CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF}>
                  <FileText className="h-4 w-4 mr-2" />PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtros</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Tipo de Ativo</label>
                <Select value={assetType} onValueChange={(v) => setAssetType(v as AssetType)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="cylinder_head">Cabeçotes</SelectItem>
                    <SelectItem value="turbo">Turbos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Equipamento</label>
                <Select value={equipFilter} onValueChange={setEquipFilter}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {eqList.map(eq => <SelectItem key={eq.id} value={eq.id}>{eq.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">S/N (busca)</label>
                <Input className="h-9" value={serialFilter} onChange={e => setSerialFilter(e.target.value)} placeholder="Filtrar por S/N..." />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Data Início</label>
                <Input type="date" className="h-9" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Data Fim</label>
                <Input type="date" className="h-9" value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Report Tabs */}
        <Tabs value={reportType} onValueChange={(v) => setReportType(v as ReportType)} className="space-y-4">
          <TabsList>
            <TabsTrigger value="installations">Instalações ({installationRows.length})</TabsTrigger>
            <TabsTrigger value="maintenances">Manutenções ({maintenanceRows.length})</TabsTrigger>
            <TabsTrigger value="components">Troca de Componentes ({componentRows.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="installations">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    {instCols.has('type') && <TableHead>Tipo</TableHead>}
                    {instCols.has('serial') && <TableHead>S/N</TableHead>}
                    {instCols.has('equipment') && <TableHead>Equipamento</TableHead>}
                    {instCols.has('installDate') && <TableHead>Instalação</TableHead>}
                    {instCols.has('removeDate') && <TableHead>Remoção</TableHead>}
                    {instCols.has('delta') && <TableHead className="text-right">Delta (h)</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {installationRows.length === 0 ? (
                    <TableRow><TableCell colSpan={visibleInstColCount} className="text-center text-muted-foreground py-8">Nenhum registro encontrado.</TableCell></TableRow>
                  ) : installationRows.map((r, idx) => (
                    <TableRow key={idx}>
                      {instCols.has('type') && <TableCell><Badge variant="secondary" className="text-xs">{r.type}</Badge></TableCell>}
                      {instCols.has('serial') && <TableCell className="font-mono font-medium text-sm">{r.serial}</TableCell>}
                      {instCols.has('equipment') && <TableCell className="text-sm">{r.equipment}</TableCell>}
                      {instCols.has('installDate') && (
                        <TableCell className="text-xs">
                          <span className="font-mono">{format(new Date(r.installDate), 'dd/MM/yyyy')}</span>
                          <span className="text-muted-foreground ml-1">({fmtNum(r.installHor)}h)</span>
                        </TableCell>
                      )}
                      {instCols.has('removeDate') && (
                        <TableCell className="text-xs">
                          {r.removeDate ? (
                            <><span className="font-mono">{format(new Date(r.removeDate), 'dd/MM/yyyy')}</span><span className="text-muted-foreground ml-1">({fmtNum(r.removeHor!)}h)</span></>
                          ) : <Badge variant="outline" className="text-xs">Ativo</Badge>}
                        </TableCell>
                      )}
                      {instCols.has('delta') && <TableCell className="text-right font-mono text-sm">{r.delta != null ? `${fmtNum(r.delta)}h` : '—'}</TableCell>}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="maintenances">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    {maintCols.has('type') && <TableHead>Tipo</TableHead>}
                    {maintCols.has('serial') && <TableHead>S/N</TableHead>}
                    {maintCols.has('date') && <TableHead>Data</TableHead>}
                    {maintCols.has('horimeter') && <TableHead>Horímetro</TableHead>}
                    {maintCols.has('description') && <TableHead>Descrição</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {maintenanceRows.length === 0 ? (
                    <TableRow><TableCell colSpan={visibleMaintColCount} className="text-center text-muted-foreground py-8">Nenhum registro encontrado.</TableCell></TableRow>
                  ) : maintenanceRows.map((r, idx) => (
                    <TableRow key={idx}>
                      {maintCols.has('type') && <TableCell><Badge variant="secondary" className="text-xs">{r.type}</Badge></TableCell>}
                      {maintCols.has('serial') && <TableCell className="font-mono font-medium text-sm">{r.serial}</TableCell>}
                      {maintCols.has('date') && <TableCell className="font-mono text-sm">{format(new Date(r.date), 'dd/MM/yyyy')}</TableCell>}
                      {maintCols.has('horimeter') && <TableCell className="font-mono text-sm">{fmtNum(r.horimeter)}h</TableCell>}
                      {maintCols.has('description') && <TableCell className="text-sm">{r.description}</TableCell>}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="components">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    {compCols.has('type') && <TableHead>Tipo</TableHead>}
                    {compCols.has('serial') && <TableHead>S/N</TableHead>}
                    {compCols.has('component') && <TableHead>Componente</TableHead>}
                    {compCols.has('date') && <TableHead>Data</TableHead>}
                    {compCols.has('horimeter') && <TableHead>Horímetro</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {componentRows.length === 0 ? (
                    <TableRow><TableCell colSpan={visibleCompColCount} className="text-center text-muted-foreground py-8">Nenhum registro encontrado.</TableCell></TableRow>
                  ) : componentRows.map((r, idx) => (
                    <TableRow key={idx}>
                      {compCols.has('type') && <TableCell><Badge variant="secondary" className="text-xs">{r.type}</Badge></TableCell>}
                      {compCols.has('serial') && <TableCell className="font-mono font-medium text-sm">{r.serial}</TableCell>}
                      {compCols.has('component') && <TableCell className="text-sm">{r.component}</TableCell>}
                      {compCols.has('date') && <TableCell className="font-mono text-sm">{format(new Date(r.date), 'dd/MM/yyyy')}</TableCell>}
                      {compCols.has('horimeter') && <TableCell className="font-mono text-sm">{fmtNum(r.horimeter)}h</TableCell>}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
