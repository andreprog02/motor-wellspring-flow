import { useState } from 'react';
import { formatLocalDate } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantId } from '@/hooks/useTenantId';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Droplets, CalendarDays, PlusCircle,
  Filter, FlaskConical, ExternalLink, Check, ChevronsUpDown, Pencil, TestTubes, Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface OilTabProps {
  equipmentId: string;
  equipmentHorimeter: number;
  oilName?: string;
  oilTypeId?: string | null;
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

export function OilTab({ equipmentId, equipmentHorimeter, oilName, oilTypeId }: OilTabProps) {
  const queryClient = useQueryClient();
  const tenantId = useTenantId();

  // Analysis dialog state
  const [analysisDialogOpen, setAnalysisDialogOpen] = useState(false);
  const [analysisDate, setAnalysisDate] = useState(formatLocalDate());
  const [analysisHorimeter, setAnalysisHorimeter] = useState(String(equipmentHorimeter));
  const [analysisResult, setAnalysisResult] = useState('');
  const [analysisNotes, setAnalysisNotes] = useState('');
  const [analysisFile, setAnalysisFile] = useState<File | null>(null);
  const [analysisCollectionId, setAnalysisCollectionId] = useState<string>('');

  // Oil change dialog state
  const [oilChangeDialogOpen, setOilChangeDialogOpen] = useState(false);
  const [oilChangeDate, setOilChangeDate] = useState(formatLocalDate());
  const [oilChangeHorimeter, setOilChangeHorimeter] = useState(String(equipmentHorimeter));
  const [oilChangeNotes, setOilChangeNotes] = useState('');
  const [oilChangeTypeId, setOilChangeTypeId] = useState(oilTypeId || '');
  const [oilChangeComboOpen, setOilChangeComboOpen] = useState(false);
  const [oilChangeSearch, setOilChangeSearch] = useState('');

  // Oil type edit state
  const [oilTypeDialogOpen, setOilTypeDialogOpen] = useState(false);
  const [selectedOilTypeId, setSelectedOilTypeId] = useState(oilTypeId || '');
  const [oilTypeComboOpen, setOilTypeComboOpen] = useState(false);
  const [oilTypeSearch, setOilTypeSearch] = useState('');

  // Collection dialog state
  const [collectionDialogOpen, setCollectionDialogOpen] = useState(false);
  const [collectionNumber, setCollectionNumber] = useState('');
  const [collectionDate, setCollectionDate] = useState(formatLocalDate());
  const [collectionHorimeter, setCollectionHorimeter] = useState(String(equipmentHorimeter));
  const [collectionNotes, setCollectionNotes] = useState('');

  // Fetch oil types
  const oilTypesQuery = useQuery({
    queryKey: ['oil_types'],
    queryFn: async () => {
      const { data, error } = await supabase.from('oil_types').select('*').order('name');
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });
  const allOilTypes = oilTypesQuery.data || [];

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

  // Fetch oil analyses (with collection info)
  const analyses = useQuery({
    queryKey: ['oil_analyses', equipmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('oil_analyses')
        .select('*, oil_collections(collection_number)')
        .eq('equipment_id', equipmentId)
        .order('analysis_date', { ascending: false });
      if (error) throw error;
      return data as (OilAnalysis & { collection_id?: string | null; oil_collections?: { collection_number: string } | null })[];
    },
  });

  // Fetch oil collections
  const collections = useQuery({
    queryKey: ['oil_collections', equipmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('oil_collections')
        .select('*')
        .eq('equipment_id', equipmentId)
        .order('collection_date', { ascending: false });
      if (error) throw error;
      return data as { id: string; collection_number: string; collection_date: string; horimeter_at_collection: number; notes: string | null; created_at: string }[];
    },
  });

  // Fetch ALL oil-related maintenance plans
  const OIL_COMPONENT_TYPES = ['oil_change', 'oil_filter', 'air_filter', 'fuel_filter', 'oil'];
  const oilPlans = useQuery({
    queryKey: ['oil_plans', equipmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('component_maintenance_plans')
        .select('*')
        .eq('equipment_id', equipmentId)
        .in('component_type', OIL_COMPONENT_TYPES);
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

  // Add oil type mutation
  const addOilType = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase.from('oil_types').insert({ name, tenant_id: tenantId }).select().single();
      if (error) throw error;
      return data as { id: string; name: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oil_types'] });
    },
  });

  // Update equipment oil type
  const updateEquipmentOilType = useMutation({
    mutationFn: async (newOilTypeId: string | null) => {
      const { error } = await supabase
        .from('equipments')
        .update({ oil_type_id: newOilTypeId })
        .eq('id', equipmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipments'] });
      toast.success('Tipo de óleo atualizado!');
      setOilTypeDialogOpen(false);
    },
    onError: (err: any) => toast.error('Erro: ' + err.message),
  });

  // Add analysis mutation
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
        collection_id: analysisCollectionId || null,
        tenant_id: tenantId,
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
      setAnalysisCollectionId('');
    },
    onError: (err: any) => toast.error('Erro: ' + err.message),
  });

  // Generic maintenance mutation for any oil-related type
  const addOilMaintenance = useMutation({
    mutationFn: async (params: { maintenanceType: string; horimeter: number; date: string; notes: string; oilTypeId?: string }) => {
      const { maintenanceType, horimeter, date, notes, oilTypeId: mtOilTypeId } = params;

      // 1. Insert the maintenance log
      const { error: logErr } = await supabase.from('maintenance_logs').insert({
        equipment_id: equipmentId,
        maintenance_type: maintenanceType,
        horimeter_at_service: horimeter,
        oil_type_id: maintenanceType === 'oil_change' ? (mtOilTypeId || null) : null,
        notes,
        service_date: date,
        tenant_id: tenantId,
      });
      if (logErr) throw logErr;

      // 2. Update the matching plan's last_execution_value
      const matchingPlan = (oilPlans.data || []).find(p => p.component_type === maintenanceType);
      if (matchingPlan) {
        await supabase
          .from('component_maintenance_plans')
          .update({ last_execution_value: horimeter })
          .eq('id', matchingPlan.id);
      }

      // 3. Update equipment horimeter if higher
      if (horimeter > equipmentHorimeter) {
        await supabase
          .from('equipments')
          .update({ total_horimeter: horimeter })
          .eq('id', equipmentId);
      }

      // 4. Update equipment oil type if oil_change and changed
      if (maintenanceType === 'oil_change' && mtOilTypeId && mtOilTypeId !== oilTypeId) {
        await supabase
          .from('equipments')
          .update({ oil_type_id: mtOilTypeId })
          .eq('id', equipmentId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oil_logs', equipmentId] });
      queryClient.invalidateQueries({ queryKey: ['filter_logs', equipmentId] });
      queryClient.invalidateQueries({ queryKey: ['oil_plans', equipmentId] });
      queryClient.invalidateQueries({ queryKey: ['equipments'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance_logs'] });
      queryClient.invalidateQueries({ queryKey: ['component_maintenance_plans'] });
      toast.success('Manutenção registrada!');
      setOilChangeDialogOpen(false);
      setOilChangeNotes('');
    },
    onError: (err: any) => toast.error('Erro: ' + err.message),
  });

  // Add collection mutation
  const addCollection = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('oil_collections').insert({
        equipment_id: equipmentId,
        collection_number: collectionNumber,
        collection_date: collectionDate,
        horimeter_at_collection: Number(collectionHorimeter),
        notes: collectionNotes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oil_collections', equipmentId] });
      toast.success('Coleta registrada!');
      setCollectionDialogOpen(false);
      setCollectionNumber('');
      setCollectionNotes('');
    },
    onError: (err: any) => toast.error('Erro: ' + err.message),
  });

  const lastOilChange = oilLogs.data?.[0];
  const lastFilterChange = filterLogs.data?.[0];
  const lastAnalysis = analyses.data?.[0];
  const allPlans = oilPlans.data || [];

  const componentTypeLabels: Record<string, string> = {
    oil_change: 'Troca de Óleo',
    oil: 'Substituição de Óleo',
    oil_filter: 'Filtro de Óleo',
    air_filter: 'Filtro de Ar',
    fuel_filter: 'Filtro de Combustível',
  };

  const componentTypeIcons: Record<string, typeof Droplets> = {
    oil_change: Droplets,
    oil: Droplets,
    oil_filter: Filter,
    air_filter: Filter,
    fuel_filter: Filter,
  };

  // State for generic maintenance dialog
  const [genericMaintenanceType, setGenericMaintenanceType] = useState('');

  const triggerLabels: Record<string, string> = { hours: 'Horas', months: 'Meses', starts: 'Arranques' };

  const filteredOilTypes = allOilTypes.filter(o =>
    o.name.toLowerCase().includes(oilTypeSearch.toLowerCase())
  );
  const filteredOilTypesChange = allOilTypes.filter(o =>
    o.name.toLowerCase().includes(oilChangeSearch.toLowerCase())
  );

  function renderOilCombobox(
    value: string,
    setValue: (id: string) => void,
    open: boolean,
    setOpen: (o: boolean) => void,
    search: string,
    setSearch: (s: string) => void,
    filtered: typeof allOilTypes
  ) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="w-full justify-between">
            {value ? allOilTypes.find(o => o.id === value)?.name || 'Selecione...' : 'Selecione...'}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar ou criar..." value={search} onValueChange={setSearch} />
            <CommandList>
              <CommandEmpty>
                {search.trim() ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={async () => {
                      try {
                        const newOil = await addOilType.mutateAsync(search.trim());
                        setValue(newOil.id);
                        setSearch('');
                        setOpen(false);
                      } catch (e: any) {
                        toast.error('Erro ao criar: ' + e.message);
                      }
                    }}
                  >
                    <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
                    Criar "{search.trim()}"
                  </Button>
                ) : (
                  <span className="text-sm text-muted-foreground">Nenhum resultado.</span>
                )}
              </CommandEmpty>
              <CommandGroup>
                {filtered.map(o => (
                  <CommandItem
                    key={o.id}
                    value={o.name}
                    onSelect={() => {
                      setValue(o.id);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", value === o.id ? "opacity-100" : "opacity-0")} />
                    {o.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      {(() => {
        const oilChangePlan = allPlans.find(p => 
          (p.component_type === 'oil_change' || (p.component_type === 'oil' && p.task === 'Substituição'))
        );
        const lastOilHorimeter = lastOilChange ? lastOilChange.horimeter_at_service : null;
        const oilHours = lastOilHorimeter != null ? equipmentHorimeter - lastOilHorimeter : null;
        const oilInterval = oilChangePlan?.interval_value ?? null;
        const oilHoursStatus = oilHours != null && oilInterval != null && oilInterval > 0
          ? getStatus(equipmentHorimeter, lastOilHorimeter!, oilInterval)
          : null;
        const oilHoursPercent = oilHours != null && oilInterval != null && oilInterval > 0
          ? getPercent(equipmentHorimeter, lastOilHorimeter!, oilInterval)
          : null;

        return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
        {/* Oil Hours Card */}
        <Card className={cn(
          oilHoursStatus === 'critical' ? 'border-[hsl(var(--status-critical))]/40' :
          oilHoursStatus === 'warning' ? 'border-[hsl(var(--status-warning))]/40' : ''
        )}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">Horas do Óleo</span>
              </div>
              {oilHoursStatus && (
                <Badge
                  variant={oilHoursStatus === 'critical' ? 'destructive' : oilHoursStatus === 'warning' ? 'secondary' : 'default'}
                  className={cn('text-[10px] px-1.5 py-0',
                    oilHoursStatus === 'ok' ? 'bg-[hsl(var(--status-ok))] text-[hsl(var(--status-ok-foreground))]' :
                    oilHoursStatus === 'warning' ? 'bg-[hsl(var(--status-warning))] text-[hsl(var(--status-warning-foreground))]' : ''
                  )}
                >
                  {oilHoursStatus === 'ok' ? 'Em dia' : oilHoursStatus === 'warning' ? 'Atenção' : 'Vencido'}
                </Badge>
              )}
            </div>
            {oilHours != null ? (
              <>
                <p className="font-bold text-lg font-mono">{fmtNum(oilHours)}h</p>
                {oilInterval != null && oilInterval > 0 ? (
                  <>
                    <Progress value={oilHoursPercent!} className="h-1.5 mt-1.5 mb-1" />
                    <p className="text-xs text-muted-foreground font-mono">{fmtNum(oilHours)} / {fmtNum(oilInterval)}h ({oilHoursPercent}%)</p>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">Sem plano de troca de óleo</p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma troca registrada</p>
            )}
          </CardContent>
        </Card>
        {/* Oil Type */}
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => {
          setSelectedOilTypeId(oilTypeId || '');
          setOilTypeDialogOpen(true);
        }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">Tipo de Óleo</span>
              </div>
              <Pencil className="h-3 w-3 text-muted-foreground" />
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
        );
      })()}

      {/* Maintenance Plan Status */}
      {allPlans.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {allPlans.map(plan => {
            const status = getStatus(equipmentHorimeter, plan.last_execution_value, plan.interval_value);
            const percent = getPercent(equipmentHorimeter, plan.last_execution_value, plan.interval_value);
            const usage = equipmentHorimeter - plan.last_execution_value;
            const Icon = componentTypeIcons[plan.component_type] || Filter;
            return (
              <Card
                key={plan.id}
                className={cn(
                  'cursor-pointer hover:border-primary/50 transition-colors',
                  status === 'critical' ? 'border-[hsl(var(--status-critical))]/40' :
                  status === 'warning' ? 'border-[hsl(var(--status-warning))]/40' : ''
                )}
                onClick={() => {
                  setGenericMaintenanceType(plan.component_type);
                  setOilChangeHorimeter(String(equipmentHorimeter));
                  setOilChangeDate(formatLocalDate());
                  setOilChangeTypeId(oilTypeId || '');
                  setOilChangeNotes('');
                  setOilChangeDialogOpen(true);
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold text-sm">{componentTypeLabels[plan.component_type] || plan.component_type}</span>
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
                    <span>{fmtNum(usage)} / {fmtNum(plan.interval_value)} {triggerLabels[plan.trigger_type]?.toLowerCase()}</span>
                    <span>{percent}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Tarefa: {plan.task}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => {
          setGenericMaintenanceType('oil_change');
          setOilChangeHorimeter(String(equipmentHorimeter));
          setOilChangeDate(formatLocalDate());
          setOilChangeTypeId(oilTypeId || '');
          setOilChangeNotes('');
          setOilChangeDialogOpen(true);
        }}>
          <Droplets className="h-3.5 w-3.5 mr-1.5" />
          Registrar Troca de Óleo
        </Button>
        <Button size="sm" variant="outline" onClick={() => {
          setGenericMaintenanceType('oil_filter');
          setOilChangeHorimeter(String(equipmentHorimeter));
          setOilChangeDate(formatLocalDate());
          setOilChangeTypeId('');
          setOilChangeNotes('');
          setOilChangeDialogOpen(true);
        }}>
          <Filter className="h-3.5 w-3.5 mr-1.5" />
          Registrar Troca de Filtro de Óleo
        </Button>
        <Button size="sm" variant="outline" onClick={() => {
          setAnalysisHorimeter(String(equipmentHorimeter));
          setAnalysisDate(formatLocalDate());
          setAnalysisCollectionId('');
          setAnalysisResult('');
          setAnalysisNotes('');
          setAnalysisFile(null);
          setAnalysisDialogOpen(true);
        }}>
          <FlaskConical className="h-3.5 w-3.5 mr-1.5" />
          Registrar Análise
        </Button>
        <Button size="sm" variant="outline" onClick={() => {
          setCollectionHorimeter(String(equipmentHorimeter));
          setCollectionDate(formatLocalDate());
          setCollectionNumber('');
          setCollectionNotes('');
          setCollectionDialogOpen(true);
        }}>
          <TestTubes className="h-3.5 w-3.5 mr-1.5" />
          Registrar Coleta
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
          <TabsTrigger value="collections">
            <TestTubes className="h-3.5 w-3.5 mr-1" />
            Coletas ({collections.data?.length || 0})
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
              {(analyses.data || []).map((a) => (
                <Card key={a.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {a.oil_collections?.collection_number && (
                          <Badge variant="outline" className="font-mono text-xs">{a.oil_collections.collection_number}</Badge>
                        )}
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

        <TabsContent value="collections" className="mt-3">
          {(collections.data || []).length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Nenhuma coleta registrada.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {(collections.data || []).map((c) => (
                <Card key={c.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => {
                  setAnalysisCollectionId(c.id);
                  setAnalysisHorimeter(String(c.horimeter_at_collection));
                  setAnalysisDate(formatLocalDate());
                  setAnalysisResult('');
                  setAnalysisNotes('');
                  setAnalysisFile(null);
                  setAnalysisDialogOpen(true);
                }}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs">{c.collection_number || '—'}</Badge>
                        <span className="font-mono text-xs">{format(new Date(c.collection_date), 'dd/MM/yyyy')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono text-xs">{fmtNum(c.horimeter_at_collection)}h</Badge>
                        <FlaskConical className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </div>
                    {c.notes && <p className="text-xs text-muted-foreground mt-0.5">{c.notes}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Oil Type Dialog */}
      <Dialog open={oilTypeDialogOpen} onOpenChange={setOilTypeDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Tipo de Óleo</DialogTitle>
            <DialogDescription>Selecione ou cadastre um novo tipo de óleo para este equipamento.</DialogDescription>
          </DialogHeader>
          <div>
            <Label>Tipo de Óleo</Label>
            {renderOilCombobox(
              selectedOilTypeId,
              setSelectedOilTypeId,
              oilTypeComboOpen,
              setOilTypeComboOpen,
              oilTypeSearch,
              setOilTypeSearch,
              filteredOilTypes
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOilTypeDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => updateEquipmentOilType.mutate(selectedOilTypeId || null)}
              disabled={updateEquipmentOilType.isPending}
            >
              {updateEquipmentOilType.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Oil Change Dialog */}
      <Dialog open={oilChangeDialogOpen} onOpenChange={setOilChangeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar {componentTypeLabels[genericMaintenanceType] || 'Manutenção'}</DialogTitle>
            <DialogDescription>Preencha os dados da manutenção.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data</Label>
                <Input type="date" value={oilChangeDate} onChange={e => setOilChangeDate(e.target.value)} />
              </div>
              <div>
                <Label>Horímetro</Label>
                <Input type="number" value={oilChangeHorimeter} onChange={e => setOilChangeHorimeter(e.target.value)} />
              </div>
            </div>
            {genericMaintenanceType === 'oil_change' && (
              <div>
                <Label>Tipo de Óleo</Label>
                {renderOilCombobox(
                  oilChangeTypeId,
                  setOilChangeTypeId,
                  oilChangeComboOpen,
                  setOilChangeComboOpen,
                  oilChangeSearch,
                  setOilChangeSearch,
                  filteredOilTypesChange
                )}
              </div>
            )}
            <div>
              <Label>Observações</Label>
              <Textarea
                value={oilChangeNotes}
                onChange={e => setOilChangeNotes(e.target.value)}
                placeholder="Observações adicionais..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOilChangeDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => addOilMaintenance.mutate({
                maintenanceType: genericMaintenanceType || 'oil_change',
                horimeter: Number(oilChangeHorimeter),
                date: oilChangeDate,
                notes: oilChangeNotes,
                oilTypeId: oilChangeTypeId,
              })}
              disabled={addOilMaintenance.isPending}
            >
              {addOilMaintenance.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Analysis Dialog */}
      <Dialog open={analysisDialogOpen} onOpenChange={setAnalysisDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Análise de Óleo</DialogTitle>
            <DialogDescription>Preencha os dados da análise laboratorial.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {/* Collection selector */}
            <div>
              <Label>Coleta de Referência</Label>
              <Select value={analysisCollectionId} onValueChange={(val) => {
                setAnalysisCollectionId(val);
                // Auto-fill horimeter from selected collection
                const col = (collections.data || []).find(c => c.id === val);
                if (col) {
                  setAnalysisHorimeter(String(col.horimeter_at_collection));
                  setAnalysisDate(col.collection_date);
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma coleta..." />
                </SelectTrigger>
                <SelectContent>
                  {(collections.data || []).map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.collection_number} — {format(new Date(c.collection_date), 'dd/MM/yyyy')} — {fmtNum(c.horimeter_at_collection)}h
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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

      {/* Collection Dialog */}
      <Dialog open={collectionDialogOpen} onOpenChange={setCollectionDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Coleta de Óleo</DialogTitle>
            <DialogDescription>Preencha os dados da coleta.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nº da Coleta</Label>
              <Input value={collectionNumber} onChange={e => setCollectionNumber(e.target.value)} placeholder="Ex: COL-001" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data</Label>
                <Input type="date" value={collectionDate} onChange={e => setCollectionDate(e.target.value)} />
              </div>
              <div>
                <Label>Horímetro</Label>
                <Input type="number" value={collectionHorimeter} onChange={e => setCollectionHorimeter(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={collectionNotes} onChange={e => setCollectionNotes(e.target.value)} placeholder="Observações adicionais..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCollectionDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => addCollection.mutate()}
              disabled={addCollection.isPending || !collectionNumber.trim()}
            >
              {addCollection.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
