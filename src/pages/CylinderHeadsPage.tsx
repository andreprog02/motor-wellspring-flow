import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/AppLayout';
import { useCylinderHeadStore, cylinderHeadStatusLabels } from '@/hooks/useCylinderHeadStore';
import { useEquipmentStore } from '@/hooks/useEquipmentStore';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { PlusCircle, Clock, Wrench, History, Gauge, ArrowRightLeft } from 'lucide-react';
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
  const [addOpen, setAddOpen] = useState(false);
  const [serialNumber, setSerialNumber] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [maintOpen, setMaintOpen] = useState(false);
  const [maintDesc, setMaintDesc] = useState('');
  const [maintHorimeter, setMaintHorimeter] = useState('');

  const heads = store.cylinderHeads.data || [];
  const allInstallations = store.installations.data || [];
  const allMaintenances = store.maintenances.data || [];

  const selectedHead = heads.find(h => h.id === detailId);
  const headInstallations = allInstallations.filter(i => i.cylinder_head_id === detailId);
  const headMaintenances = allMaintenances.filter(m => m.cylinder_head_id === detailId);

  // Fetch metrics for detail view
  const metrics = useQuery({
    queryKey: ['cylinder_head_metrics', detailId],
    queryFn: () => store.getMetrics(detailId!),
    enabled: !!detailId,
  });

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

  const handleAddMaintenance = async () => {
    if (!detailId || !maintDesc.trim()) return;
    try {
      await store.addMaintenance.mutateAsync({
        cylinder_head_id: detailId,
        description: maintDesc.trim(),
        horimeter_at_maintenance: Number(maintHorimeter) || 0,
      });
      toast.success('Manutenção registrada!');
      setMaintDesc('');
      setMaintHorimeter('');
      setMaintOpen(false);
    } catch {
      toast.error('Erro ao registrar manutenção.');
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
          <Button onClick={() => setAddOpen(true)}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Novo Cabeçote
          </Button>
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
                <TableHead>Ações</TableHead>
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
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setDetailId(head.id); }}>
                        Detalhes
                      </Button>
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

              {/* Metrics */}
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
                    <Button size="sm" onClick={() => setMaintOpen(true)}>
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

      {/* Maintenance Registration Dialog */}
      <Dialog open={maintOpen} onOpenChange={setMaintOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Manutenção do Cabeçote</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
    </AppLayout>
  );
}
