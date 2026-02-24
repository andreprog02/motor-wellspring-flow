import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/AppLayout';
import { useCylinderHeadStore, cylinderHeadStatusLabels } from '@/hooks/useCylinderHeadStore';
import { useEquipmentStore } from '@/hooks/useEquipmentStore';
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
import { PlusCircle, Clock, Wrench, Gauge, ArrowRightLeft, Pencil, Trash2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { CylinderHeadMetrics } from '@/hooks/useCylinderHeadStore';

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

  // Dialog states
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [maintOpen, setMaintOpen] = useState(false);
  const [batchMaintOpen, setBatchMaintOpen] = useState(false);

  // Form states
  const [serialNumber, setSerialNumber] = useState('');
  const [editSerial, setEditSerial] = useState('');
  const [editStatus, setEditStatus] = useState('in_stock');
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

  const heads = store.cylinderHeads.data || [];
  const allInstallations = store.installations.data || [];
  const allMaintenances = store.maintenances.data || [];

  const selectedHead = heads.find(h => h.id === detailId);
  const headInstallations = allInstallations.filter(i => i.cylinder_head_id === detailId);
  const headMaintenances = allMaintenances.filter(m => m.cylinder_head_id === detailId);

  const metrics = useQuery({
    queryKey: ['cylinder_head_metrics', detailId],
    queryFn: () => store.getMetrics(detailId!),
    enabled: !!detailId,
  });

  // --- Handlers ---

  const handleAdd = async () => {
    if (!serialNumber.trim()) return;
    try {
      await store.addCylinderHead.mutateAsync({ serial_number: serialNumber.trim() });
      toast.success('Cabeçote cadastrado!');
      setSerialNumber('');
      setAddOpen(false);
    } catch {
      toast.error('Erro ao cadastrar cabeçote.');
    }
  };

  const openEdit = (head: typeof heads[0], e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditId(head.id);
    setEditSerial(head.serial_number);
    setEditStatus(head.status);
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editId || !editSerial.trim()) return;
    try {
      await store.updateCylinderHead.mutateAsync({ id: editId, serial_number: editSerial.trim(), status: editStatus });
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
    if (batchSelected.length === heads.length) {
      setBatchSelected([]);
    } else {
      setBatchSelected(heads.map(h => h.id));
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

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Cabeçotes</h1>
            <p className="text-sm text-muted-foreground">Gestão de cabeçotes com rastreamento de horas</p>
          </div>
          <div className="flex gap-2">
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
              {heads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
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

              <Tabs defaultValue="history" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="history">Histórico de Instalações</TabsTrigger>
                  <TabsTrigger value="maintenances">Manutenções</TabsTrigger>
                </TabsList>

                <TabsContent value="history">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Equipamento</TableHead>
                        <TableHead>Instalação</TableHead>
                        <TableHead>Remoção</TableHead>
                        <TableHead>Horas (Delta)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {headInstallations.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">Nenhuma instalação.</TableCell></TableRow>
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
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {headMaintenances.length === 0 ? (
                        <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-4">Nenhuma manutenção.</TableCell></TableRow>
                      ) : headMaintenances.map(m => (
                        <TableRow key={m.id}>
                          <TableCell className="font-mono text-sm">{format(new Date(m.maintenance_date), 'dd/MM/yyyy')}</TableCell>
                          <TableCell className="font-mono text-sm">{fmtNum(m.horimeter_at_maintenance)}h</TableCell>
                          <TableCell className="text-sm">{m.description}</TableCell>
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
                  {batchSelected.length === heads.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                </Button>
              </div>
              <div className="border rounded-md max-h-48 overflow-y-auto divide-y">
                {heads.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-3 text-center">Nenhum cabeçote cadastrado.</p>
                ) : heads.map(head => (
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
    </AppLayout>
  );
}
