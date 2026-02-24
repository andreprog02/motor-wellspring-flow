import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Droplets, Clock, CalendarDays, FileText, PlusCircle, History,
  ChevronDown, Upload, ExternalLink, Filter, FlaskConical
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface OilTabProps {
  equipmentId: string;
  equipmentHorimeter: number;
  oilName?: string;
}

interface OilAnalysis {
  id: string;
  equipment_id: string;
  analysis_date: string;
  horimeter_at_analysis: number;
  result: string;
  attachment_url: string | null;
  notes: string;
  created_at: string;
}

function fmtNum(n: number): string {
  return n.toLocaleString('pt-BR');
}

function getStatus(current: number, lastExec: number, interval: number) {
  if (interval <= 0) return 'ok';
  const usage = current - lastExec;
  const ratio = usage / interval;
  if (ratio >= 1) return 'critical';
  if (ratio >= 0.9) return 'warning';
  return 'ok';
}

function getPercent(current: number, lastExec: number, interval: number) {
  if (interval <= 0) return 0;
  const usage = current - lastExec;
  return Math.min(Math.round((usage / interval) * 100), 100);
}

export function OilTab({ equipmentId, equipmentHorimeter, oilName }: OilTabProps) {
  const queryClient = useQueryClient();
  const [analysisDialogOpen, setAnalysisDialogOpen] = useState(false);
  const [analysisDate, setAnalysisDate] = useState(new Date().toISOString().split('T')[0]);
  const [analysisHorimeter, setAnalysisHorimeter] = useState(String(equipmentHorimeter));
  const [analysisResult, setAnalysisResult] = useState('');
  const [analysisNotes, setAnalysisNotes] = useState('');
  const [analysisFile, setAnalysisFile] = useState<File | null>(null);

  // Fetch oil change logs for this equipment
  const oilLogs = useQuery({
    queryKey: ['oil_logs', equipmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_logs')
        .select('*, oil_types(name)')
        .eq('equipment_id', equipmentId)
        .eq('maintenance_type', 'oil_change')
        .order('service_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch filter change logs
  const filterLogs = useQuery({
    queryKey: ['filter_logs', equipmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_logs')
        .select('*')
        .eq('equipment_id', equipmentId)
        .eq('maintenance_type', 'oil_filter')
        .order('service_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch oil analyses
  const analyses = useQuery({
    queryKey: ['oil_analyses', equipmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('oil_analyses')
        .select('*')
        .eq('equipment_id', equipmentId)
        .order('analysis_date', { ascending: false });
      if (error) throw error;
      return data as OilAnalysis[];
    },
  });

  // Fetch oil maintenance plans
  const oilPlans = useQuery({
    queryKey: ['oil_plans', equipmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('component_maintenance_plans')
        .select('*')
        .eq('equipment_id', equipmentId)
        .in('component_type', ['oil_change', 'oil_filter']);
      if (error) throw error;
      return data;
    },
  });

  // Log items for oil/filter logs
  const logItems = useQuery({
    queryKey: ['oil_log_items', equipmentId],
    queryFn: async () => {
      const logIds = [...(oilLogs.data || []), ...(filterLogs.data || [])].map(l => l.id);
      if (logIds.length === 0) return [];
      const { data, error } = await supabase
        .from('maintenance_log_items')
        .select('*, inventory_items(name)')
        .in('maintenance_log_id', logIds);
      if (error) throw error;
      return data;
    },
    enabled: !!(oilLogs.data || filterLogs.data),
  });

  const addAnalysis = useMutation({
    mutationFn: async () => {
      let attachment_url: string | null = null;
      if (analysisFile) {
        const ext = analysisFile.name.split('.').pop();
        const path = `${equipmentId}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('oil-analysis-attachments')
          .upload(path, analysisFile);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage
          .from('oil-analysis-attachments')
          .getPublicUrl(path);
        attachment_url = urlData.publicUrl;
      }

      const { error } = await supabase.from('oil_analyses').insert({
        equipment_id: equipmentId,
        analysis_date: analysisDate,
        horimeter_at_analysis: Number(analysisHorimeter),
        result: analysisResult,
        attachment_url,
        notes: analysisNotes,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oil_analyses', equipmentId] });
      toast.success('Análise de óleo registrada!');
      setAnalysisDialogOpen(false);
      setAnalysisResult('');
      setAnalysisNotes('');
      setAnalysisFile(null);
    },
    onError: (err: any) => toast.error('Erro: ' + err.message),
  });

  const lastOilChange = oilLogs.data?.[0];
  const lastFilterChange = filterLogs.data?.[0];
  const lastAnalysis = analyses.data?.[0];
  const oilChangePlan = (oilPlans.data || []).find(p => p.component_type === 'oil_change');
  const filterPlan = (oilPlans.data || []).find(p => p.component_type === 'oil_filter');

  const triggerLabels: Record<string, string> = { hours: 'Horas', months: 'Meses', starts: 'Arranques' };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {/* Oil Type */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Droplets className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">Tipo de Óleo</span>
            </div>
            <p className="font-bold text-sm">{oilName || 'Não definido'}</p>
          </CardContent>
        </Card>

        {/* Last Oil Change */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">Última Troca de Óleo</span>
            </div>
            {lastOilChange ? (
              <>
                <p className="font-bold text-sm">{format(new Date(lastOilChange.service_date), 'dd/MM/yyyy')}</p>
                <p className="text-xs text-muted-foreground font-mono">{fmtNum(lastOilChange.horimeter_at_service)}h</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma troca</p>
            )}
          </CardContent>
        </Card>

        {/* Last Analysis */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <FlaskConical className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">Última Análise</span>
            </div>
            {lastAnalysis ? (
              <>
                <p className="font-bold text-sm">{format(new Date(lastAnalysis.analysis_date), 'dd/MM/yyyy')}</p>
                <p className="text-xs text-muted-foreground font-mono">{fmtNum(lastAnalysis.horimeter_at_analysis)}h</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma análise</p>
            )}
          </CardContent>
        </Card>

        {/* Last Filter Change */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">Última Troca de Filtro</span>
            </div>
            {lastFilterChange ? (
              <>
                <p className="font-bold text-sm">{format(new Date(lastFilterChange.service_date), 'dd/MM/yyyy')}</p>
                <p className="text-xs text-muted-foreground font-mono">{fmtNum(lastFilterChange.horimeter_at_service)}h</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma troca</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Maintenance Plan Status */}
      {(oilChangePlan || filterPlan) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {oilChangePlan && (() => {
            const status = getStatus(equipmentHorimeter, oilChangePlan.last_execution_value, oilChangePlan.interval_value);
            const percent = getPercent(equipmentHorimeter, oilChangePlan.last_execution_value, oilChangePlan.interval_value);
            const usage = equipmentHorimeter - oilChangePlan.last_execution_value;
            return (
              <Card className={
                status === 'critical' ? 'border-[hsl(var(--status-critical))]/40' :
                status === 'warning' ? 'border-[hsl(var(--status-warning))]/40' : ''
              }>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Droplets className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold text-sm">Troca de Óleo</span>
                    </div>
                    <Badge
                      variant={status === 'critical' ? 'destructive' : status === 'warning' ? 'secondary' : 'default'}
                      className={
                        status === 'ok' ? 'bg-[hsl(var(--status-ok))] text-[hsl(var(--status-ok-foreground))]' :
                        status === 'warning' ? 'bg-[hsl(var(--status-warning))] text-[hsl(var(--status-warning-foreground))]' : ''
                      }
                    >
                      {status === 'ok' ? 'Em dia' : status === 'warning' ? 'Atenção' : 'Vencida'}
                    </Badge>
                  </div>
                  <Progress value={percent} className="h-2 mb-1" />
                  <div className="flex justify-between text-xs text-muted-foreground font-mono">
                    <span>{fmtNum(usage)} / {fmtNum(oilChangePlan.interval_value)} {triggerLabels[oilChangePlan.trigger_type]?.toLowerCase()}</span>
                    <span>{percent}%</span>
                  </div>
                </CardContent>
              </Card>
            );
          })()}
          {filterPlan && (() => {
            const status = getStatus(equipmentHorimeter, filterPlan.last_execution_value, filterPlan.interval_value);
            const percent = getPercent(equipmentHorimeter, filterPlan.last_execution_value, filterPlan.interval_value);
            const usage = equipmentHorimeter - filterPlan.last_execution_value;
            return (
              <Card className={
                status === 'critical' ? 'border-[hsl(var(--status-critical))]/40' :
                status === 'warning' ? 'border-[hsl(var(--status-warning))]/40' : ''
              }>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold text-sm">Troca de Filtro de Óleo</span>
                    </div>
                    <Badge
                      variant={status === 'critical' ? 'destructive' : status === 'warning' ? 'secondary' : 'default'}
                      className={
                        status === 'ok' ? 'bg-[hsl(var(--status-ok))] text-[hsl(var(--status-ok-foreground))]' :
                        status === 'warning' ? 'bg-[hsl(var(--status-warning))] text-[hsl(var(--status-warning-foreground))]' : ''
                      }
                    >
                      {status === 'ok' ? 'Em dia' : status === 'warning' ? 'Atenção' : 'Vencida'}
                    </Badge>
                  </div>
                  <Progress value={percent} className="h-2 mb-1" />
                  <div className="flex justify-between text-xs text-muted-foreground font-mono">
                    <span>{fmtNum(usage)} / {fmtNum(filterPlan.interval_value)} {triggerLabels[filterPlan.trigger_type]?.toLowerCase()}</span>
                    <span>{percent}%</span>
                  </div>
                </CardContent>
              </Card>
            );
          })()}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => {
          setAnalysisHorimeter(String(equipmentHorimeter));
          setAnalysisDialogOpen(true);
        }}>
          <FlaskConical className="h-3.5 w-3.5 mr-1.5" />
          Registrar Análise
        </Button>
      </div>

      {/* History Sub-tabs */}
      <Tabs defaultValue="oil_changes">
        <TabsList className="h-auto gap-1">
          <TabsTrigger value="oil_changes">
            <Droplets className="h-3.5 w-3.5 mr-1" />
            Trocas de Óleo ({oilLogs.data?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="analyses">
            <FlaskConical className="h-3.5 w-3.5 mr-1" />
            Análises ({analyses.data?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="filters">
            <Filter className="h-3.5 w-3.5 mr-1" />
            Filtros ({filterLogs.data?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="oil_changes" className="mt-3">
          {(oilLogs.data || []).length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Nenhuma troca de óleo registrada.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {(oilLogs.data || []).map((log: any) => {
                const items = (logItems.data || []).filter((i: any) => i.maintenance_log_id === log.id);
                return (
                  <Card key={log.id}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs">{format(new Date(log.service_date), 'dd/MM/yyyy')}</span>
                          <Badge variant="secondary" className="font-mono text-xs">{fmtNum(log.horimeter_at_service)}h</Badge>
                        </div>
                        {log.oil_types?.name && (
                          <span className="text-xs text-muted-foreground">{log.oil_types.name}</span>
                        )}
                      </div>
                      {items.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Itens: {items.map((i: any) => `${i.inventory_items?.name || '?'} (${i.quantity})`).join(', ')}
                        </p>
                      )}
                      {log.notes && <p className="text-xs text-muted-foreground mt-1">{log.notes}</p>}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analyses" className="mt-3">
          {(analyses.data || []).length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Nenhuma análise de óleo registrada.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {(analyses.data || []).map((a: OilAnalysis) => (
                <Card key={a.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">{format(new Date(a.analysis_date), 'dd/MM/yyyy')}</span>
                        <Badge variant="secondary" className="font-mono text-xs">{fmtNum(a.horimeter_at_analysis)}h</Badge>
                      </div>
                      {a.attachment_url && (
                        <a href={a.attachment_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1 hover:underline">
                          <ExternalLink className="h-3 w-3" /> Laudo
                        </a>
                      )}
                    </div>
                    {a.result && <p className="text-xs font-medium">{a.result}</p>}
                    {a.notes && <p className="text-xs text-muted-foreground mt-0.5">{a.notes}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="filters" className="mt-3">
          {(filterLogs.data || []).length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Nenhuma troca de filtro registrada.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {(filterLogs.data || []).map((log: any) => {
                const items = (logItems.data || []).filter((i: any) => i.maintenance_log_id === log.id);
                return (
                  <Card key={log.id}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs">{format(new Date(log.service_date), 'dd/MM/yyyy')}</span>
                        <Badge variant="secondary" className="font-mono text-xs">{fmtNum(log.horimeter_at_service)}h</Badge>
                      </div>
                      {items.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Itens: {items.map((i: any) => `${i.inventory_items?.name || '?'} (${i.quantity})`).join(', ')}
                        </p>
                      )}
                      {log.notes && <p className="text-xs text-muted-foreground mt-1">{log.notes}</p>}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Analysis Dialog */}
      <Dialog open={analysisDialogOpen} onOpenChange={setAnalysisDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Análise de Óleo</DialogTitle>
            <DialogDescription>Preencha os dados da análise laboratorial.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data da Análise</Label>
                <Input type="date" value={analysisDate} onChange={e => setAnalysisDate(e.target.value)} />
              </div>
              <div>
                <Label>Horímetro</Label>
                <Input type="number" value={analysisHorimeter} onChange={e => setAnalysisHorimeter(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Resultado</Label>
              <Textarea value={analysisResult} onChange={e => setAnalysisResult(e.target.value)} placeholder="Resultado da análise..." />
            </div>
            <div>
              <Label>Observações</Label>
              <Input value={analysisNotes} onChange={e => setAnalysisNotes(e.target.value)} placeholder="Observações adicionais..." />
            </div>
            <div>
              <Label>Laudo / Anexo</Label>
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={e => setAnalysisFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAnalysisDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => addAnalysis.mutate()} disabled={addAnalysis.isPending}>
              {addAnalysis.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
