import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useCylinderHeadStore } from '@/hooks/useCylinderHeadStore';
import { useTurboStore } from '@/hooks/useTurboStore';
import { useEquipmentStore } from '@/hooks/useEquipmentStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { FileDown, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { cylinderHeadComponentTypes } from '@/hooks/useCylinderHeadStore';
import { turboComponentTypes } from '@/hooks/useTurboStore';

function fmtNum(n: number): string {
  return n.toLocaleString('pt-BR');
}

type ReportType = 'installations' | 'maintenances' | 'components';
type AssetType = 'all' | 'cylinder_head' | 'turbo';

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
        const dateRef = i.install_date;
        if (!filterDate(dateRef)) return;
        if (equipFilter !== 'all' && i.equipment_id !== equipFilter) return;
        const delta = i.remove_equipment_horimeter != null ? i.remove_equipment_horimeter - i.install_equipment_horimeter : null;
        rows.push({ type: 'Cabeçote', serial, equipment: eqMap[i.equipment_id] || '—', installDate: i.install_date, removeDate: i.remove_date, installHor: i.install_equipment_horimeter, removeHor: i.remove_equipment_horimeter, delta });
      });
    }

    if (assetType !== 'cylinder_head') {
      tbInstallations.forEach(i => {
        const serial = tbMap[i.turbo_id] || '—';
        if (!filterSerial(serial)) return;
        const dateRef = i.install_date;
        if (!filterDate(dateRef)) return;
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

  const handleExportCSV = () => {
    let csv = '';
    if (reportType === 'installations') {
      csv = 'Tipo;S/N;Equipamento;Data Instalação;Horímetro Inst.;Data Remoção;Horímetro Rem.;Delta (h)\n';
      installationRows.forEach(r => {
        csv += `${r.type};${r.serial};${r.equipment};${r.installDate};${r.installHor};${r.removeDate || ''};${r.removeHor ?? ''};${r.delta ?? ''}\n`;
      });
    } else if (reportType === 'maintenances') {
      csv = 'Tipo;S/N;Data;Horímetro;Descrição\n';
      maintenanceRows.forEach(r => {
        csv += `${r.type};${r.serial};${r.date};${r.horimeter};${r.description}\n`;
      });
    } else {
      csv = 'Tipo;S/N;Componente;Data;Horímetro\n';
      componentRows.forEach(r => {
        csv += `${r.type};${r.serial};${r.component};${r.date};${r.horimeter}\n`;
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

  const currentCount = reportType === 'installations' ? installationRows.length : reportType === 'maintenances' ? maintenanceRows.length : componentRows.length;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
            <p className="text-sm text-muted-foreground">Histórico consolidado de cabeçotes e turbos</p>
          </div>
          <Button variant="outline" onClick={handleExportCSV} disabled={currentCount === 0}>
            <FileDown className="h-4 w-4 mr-2" />Exportar CSV
          </Button>
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
                    <TableHead>Tipo</TableHead>
                    <TableHead>S/N</TableHead>
                    <TableHead>Equipamento</TableHead>
                    <TableHead>Instalação</TableHead>
                    <TableHead>Remoção</TableHead>
                    <TableHead className="text-right">Delta (h)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {installationRows.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum registro encontrado.</TableCell></TableRow>
                  ) : installationRows.map((r, idx) => (
                    <TableRow key={idx}>
                      <TableCell><Badge variant="secondary" className="text-xs">{r.type}</Badge></TableCell>
                      <TableCell className="font-mono font-medium text-sm">{r.serial}</TableCell>
                      <TableCell className="text-sm">{r.equipment}</TableCell>
                      <TableCell className="text-xs">
                        <span className="font-mono">{format(new Date(r.installDate), 'dd/MM/yyyy')}</span>
                        <span className="text-muted-foreground ml-1">({fmtNum(r.installHor)}h)</span>
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.removeDate ? (
                          <><span className="font-mono">{format(new Date(r.removeDate), 'dd/MM/yyyy')}</span><span className="text-muted-foreground ml-1">({fmtNum(r.removeHor!)}h)</span></>
                        ) : <Badge variant="outline" className="text-xs">Ativo</Badge>}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{r.delta != null ? `${fmtNum(r.delta)}h` : '—'}</TableCell>
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
                    <TableHead>Tipo</TableHead>
                    <TableHead>S/N</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Horímetro</TableHead>
                    <TableHead>Descrição</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {maintenanceRows.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum registro encontrado.</TableCell></TableRow>
                  ) : maintenanceRows.map((r, idx) => (
                    <TableRow key={idx}>
                      <TableCell><Badge variant="secondary" className="text-xs">{r.type}</Badge></TableCell>
                      <TableCell className="font-mono font-medium text-sm">{r.serial}</TableCell>
                      <TableCell className="font-mono text-sm">{format(new Date(r.date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="font-mono text-sm">{fmtNum(r.horimeter)}h</TableCell>
                      <TableCell className="text-sm">{r.description}</TableCell>
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
                    <TableHead>Tipo</TableHead>
                    <TableHead>S/N</TableHead>
                    <TableHead>Componente</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Horímetro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {componentRows.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum registro encontrado.</TableCell></TableRow>
                  ) : componentRows.map((r, idx) => (
                    <TableRow key={idx}>
                      <TableCell><Badge variant="secondary" className="text-xs">{r.type}</Badge></TableCell>
                      <TableCell className="font-mono font-medium text-sm">{r.serial}</TableCell>
                      <TableCell className="text-sm">{r.component}</TableCell>
                      <TableCell className="font-mono text-sm">{format(new Date(r.date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="font-mono text-sm">{fmtNum(r.horimeter)}h</TableCell>
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
