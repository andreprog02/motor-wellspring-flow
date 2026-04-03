import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/AppLayout';
import { useMaintenancePlanTemplates, MaintenancePlanTemplate, MaintenancePlanTemplateTask } from '@/hooks/useMaintenancePlanTemplates';
import { useEquipmentStore } from '@/hooks/useEquipmentStore';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, FileText, Factory, Box, FolderOpen, Folder, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const COMPONENT_TYPES = [
  { value: 'battery', label: 'Bateria' },
  { value: 'bearing', label: 'Bronzina' },
  { value: 'connecting_rod', label: 'Biela' },
  { value: 'blowby', label: 'Blowby' },
  { value: 'liner', label: 'Camisa' },
  { value: 'damper', label: 'Damper' },
  { value: 'air_filter', label: 'Filtro de Ar' },
  { value: 'intercooler', label: 'Intercooler' },
  { value: 'starter_motor', label: 'Motor de Arranque' },
  { value: 'oil', label: 'Óleo' },
  { value: 'custom', label: 'Personalizado' },
  { value: 'piston', label: 'Pistão' },
  { value: 'oil_exchanger', label: 'Trocador de Óleo' },
  { value: 'turbine', label: 'Turbina' },
  { value: 'spark_plug', label: 'Vela' },
];

const SERVICE_TYPES = [
  { value: 'Substituição', label: 'Substituição' },
  { value: 'Inspeção', label: 'Inspeção' },
  { value: 'Limpeza', label: 'Limpeza' },
  { value: 'Lubrificação', label: 'Lubrificação' },
  { value: 'Análise', label: 'Análise' },
  { value: 'Coleta', label: 'Coleta' },
  { value: 'Calibração', label: 'Calibração' },
  { value: 'Regulagem', label: 'Regulagem' },
];

const TRIGGER_TYPES = [
  { value: 'hours', label: 'Horas' },
  { value: 'months', label: 'Meses' },
  { value: 'weeks', label: 'Semanas' },
  { value: 'days', label: 'Dias' },
  { value: 'starts', label: 'Arranques' },
];

export default function MaintenancePlansPage() {
  const { templates, templateTasks, addTemplate, updateTemplate, deleteTemplate, addTask, deleteTask } = useMaintenancePlanTemplates();
  const { componentManufacturers, componentModels, equipments } = useEquipmentStore();
  const { toast } = useToast();

  const manufacturers = componentManufacturers.data ?? [];
  const models = componentModels.data ?? [];
  const allTemplates = templates.data ?? [];
  const allTasks = templateTasks.data ?? [];
  const allEquipments = equipments.data ?? [];

  // Fetch active component_maintenance_plans
  const activePlans = useQuery({
    queryKey: ['component_maintenance_plans_all'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('component_maintenance_plans')
        .select('*');
      if (error) throw error;
      return data as Array<{
        id: string;
        equipment_id: string;
        component_type: string;
        task: string;
        trigger_type: string;
        interval_value: number;
        last_execution_value: number;
      }>;
    },
  });

  // Fetch all sub-components to discover model-specific component types
  const allSubComponentsQuery = useQuery({
    queryKey: ['all_equipment_sub_components'],
    queryFn: async () => {
      const { data, error } = await supabase.from('equipment_sub_components').select('*');
      if (error) throw error;
      return data;
    },
  });

  // Fetch all cylinder components to discover standard component types per equipment
  const allCylinderComponentsQuery = useQuery({
    queryKey: ['all_cylinder_components'],
    queryFn: async () => {
      const { data, error } = await supabase.from('cylinder_components').select('*');
      if (error) throw error;
      return data;
    },
  });

  const allActivePlans = activePlans.data ?? [];
  const allSubComponents = allSubComponentsQuery.data ?? [];
  const allCylinderComponents = allCylinderComponentsQuery.data ?? [];

  // Helper: get status for a plan on an equipment
  const getStatus = (equipmentHorimeter: number, lastExecution: number, interval: number) => {
    if (interval <= 0) return 'ok';
    const usage = equipmentHorimeter - lastExecution;
    const ratio = usage / interval;
    if (ratio >= 1) return 'critical';
    if (ratio >= 0.9) return 'warning';
    return 'ok';
  };

  const getPercent = (equipmentHorimeter: number, lastExecution: number, interval: number) => {
    if (interval <= 0) return 0;
    const usage = equipmentHorimeter - lastExecution;
    return Math.min(Math.round((usage / interval) * 100), 100);
  };

  // For a template, get status summary across all linked equipments
  const getTemplateStatus = (templateId: string) => {
    const linkedEquipments = allEquipments.filter(e => e.maintenance_plan_template_id === templateId);
    let ok = 0, warning = 0, critical = 0;
    for (const eq of linkedEquipments) {
      const eqPlans = allActivePlans.filter(p => p.equipment_id === eq.id);
      for (const p of eqPlans) {
        const s = getStatus(eq.total_horimeter, p.last_execution_value, p.interval_value);
        if (s === 'critical') critical++;
        else if (s === 'warning') warning++;
        else ok++;
      }
    }
    return { ok, warning, critical, total: ok + warning + critical, equipmentCount: linkedEquipments.length };
  };

  // For a specific task across all linked equipments
  const getTaskStatus = (templateId: string, componentType: string, task: string) => {
    const linkedEquipments = allEquipments.filter(e => e.maintenance_plan_template_id === templateId);
    const results: Array<{ equipmentName: string; status: string; percent: number; usage: number; interval: number }> = [];
    for (const eq of linkedEquipments) {
      const matchingPlan = allActivePlans.find(p =>
        p.equipment_id === eq.id && p.component_type === componentType && p.task === task
      );
      if (matchingPlan) {
        const s = getStatus(eq.total_horimeter, matchingPlan.last_execution_value, matchingPlan.interval_value);
        const pct = getPercent(eq.total_horimeter, matchingPlan.last_execution_value, matchingPlan.interval_value);
        const usage = eq.total_horimeter - matchingPlan.last_execution_value;
        results.push({ equipmentName: eq.name, status: s, percent: pct, usage, interval: matchingPlan.interval_value });
      }
    }
    return results;
  };

  const fmtNum = (n: number) => n.toLocaleString('pt-BR');

  // Template dialog
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MaintenancePlanTemplate | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [templateManufId, setTemplateManufId] = useState('');
  const [templateModelId, setTemplateModelId] = useState('');

  // Task dialog
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskTemplateId, setTaskTemplateId] = useState('');
  const [taskComponentType, setTaskComponentType] = useState('');
  const [taskCustomType, setTaskCustomType] = useState('');
  const [taskService, setTaskService] = useState('');
  const [taskTrigger, setTaskTrigger] = useState('hours');
  const [taskInterval, setTaskInterval] = useState('');

  // Expanded states: manufacturer, model, plan
  const [expandedManufs, setExpandedManufs] = useState<Set<string>>(new Set());
  const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set());
  const [expandedPlans, setExpandedPlans] = useState<Set<string>>(new Set());

  const toggle = (set: Set<string>, id: string, setter: React.Dispatch<React.SetStateAction<Set<string>>>) => {
    setter(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const componentLabel = (t: string) => COMPONENT_TYPES.find(x => x.value === t)?.label ?? t;
  const triggerLabel = (t: string) => TRIGGER_TYPES.find(x => x.value === t)?.label ?? t;

  // Group templates by manufacturer > model
  const tree = useMemo(() => {
    const grouped: Record<string, Record<string, MaintenancePlanTemplate[]>> = {};
    const unlinked: MaintenancePlanTemplate[] = [];

    for (const t of allTemplates) {
      if (t.manufacturer_id && t.model_id) {
        if (!grouped[t.manufacturer_id]) grouped[t.manufacturer_id] = {};
        if (!grouped[t.manufacturer_id][t.model_id]) grouped[t.manufacturer_id][t.model_id] = [];
        grouped[t.manufacturer_id][t.model_id].push(t);
      } else {
        unlinked.push(t);
      }
    }
    return { grouped, unlinked };
  }, [allTemplates]);

  const openCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateName('');
    setTemplateDesc('');
    setTemplateManufId('');
    setTemplateModelId('');
    setTemplateDialogOpen(true);
  };

  const openEditTemplate = (t: MaintenancePlanTemplate) => {
    setEditingTemplate(t);
    setTemplateName(t.name);
    setTemplateDesc(t.description);
    setTemplateManufId(t.manufacturer_id ?? '');
    setTemplateModelId(t.model_id ?? '');
    setTemplateDialogOpen(true);
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) { toast({ title: 'Nome é obrigatório', variant: 'destructive' }); return; }
    if (!templateManufId) { toast({ title: 'Selecione um fabricante', variant: 'destructive' }); return; }
    if (!templateModelId) { toast({ title: 'Selecione um modelo', variant: 'destructive' }); return; }
    try {
      if (editingTemplate) {
        await updateTemplate.mutateAsync({ id: editingTemplate.id, name: templateName.trim(), description: templateDesc.trim(), manufacturer_id: templateManufId, model_id: templateModelId });
        toast({ title: 'Plano atualizado' });
      } else {
        await addTemplate.mutateAsync({ name: templateName.trim(), description: templateDesc.trim(), manufacturer_id: templateManufId, model_id: templateModelId });
        toast({ title: 'Plano criado' });
      }
      setTemplateDialogOpen(false);
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try { await deleteTemplate.mutateAsync(id); toast({ title: 'Plano excluído' }); } catch (err: any) { toast({ title: 'Erro', description: err.message, variant: 'destructive' }); }
  };

  const openAddTask = (templateId: string) => {
    setTaskTemplateId(templateId);
    setTaskComponentType('');
    setTaskCustomType('');
    setTaskService('');
    setTaskTrigger('hours');
    setTaskInterval('');
    setTaskDialogOpen(true);
  };

  const handleSaveTask = async () => {
    const finalType = taskComponentType === 'custom' ? taskCustomType : taskComponentType;
    if (!finalType || !taskService || !taskInterval) { toast({ title: 'Preencha todos os campos', variant: 'destructive' }); return; }
    try {
      await addTask.mutateAsync({ template_id: taskTemplateId, component_type: finalType, task: taskService, trigger_type: taskTrigger, interval_value: Number(taskInterval) });
      toast({ title: 'Tarefa adicionada' });
      setTaskDialogOpen(false);
    } catch (err: any) { toast({ title: 'Erro', description: err.message, variant: 'destructive' }); }
  };

  const handleDeleteTask = async (id: string) => {
    try { await deleteTask.mutateAsync(id); toast({ title: 'Tarefa removida' }); } catch (err: any) { toast({ title: 'Erro', description: err.message, variant: 'destructive' }); }
  };

  const filteredDialogModels = models.filter(m => m.manufacturer_id === templateManufId);

  const renderPlanCard = (template: MaintenancePlanTemplate) => {
    const tasks = allTasks.filter(t => t.template_id === template.id).sort((a, b) => componentLabel(a.component_type).localeCompare(componentLabel(b.component_type)));
    const isExpanded = expandedPlans.has(template.id);
    const templateStatus = getTemplateStatus(template.id);
    const worstStatus = templateStatus.critical > 0 ? 'critical' : templateStatus.warning > 0 ? 'warning' : 'ok';

    return (
      <div key={template.id} className={`border rounded-lg bg-card ml-8 ${
        worstStatus === 'critical' ? 'border-[hsl(var(--status-critical))]/40' :
        worstStatus === 'warning' ? 'border-[hsl(var(--status-warning))]/40' : ''
      }`}>
        <div className="flex items-center justify-between p-3 cursor-pointer" onClick={() => toggle(expandedPlans, template.id, setExpandedPlans)}>
          <div className="flex items-center gap-2">
            {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            <FileText className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">{template.name}</span>
            {template.description && <span className="text-xs text-muted-foreground ml-2">— {template.description}</span>}
          </div>
          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
            {templateStatus.equipmentCount > 0 && (
              <div className="flex items-center gap-1.5 mr-2">
                {templateStatus.ok > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[hsl(var(--status-ok))]">
                    <CheckCircle2 className="h-3 w-3" />{templateStatus.ok}
                  </span>
                )}
                {templateStatus.warning > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[hsl(var(--status-warning))]">
                    <AlertTriangle className="h-3 w-3" />{templateStatus.warning}
                  </span>
                )}
                {templateStatus.critical > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[hsl(var(--status-critical))]">
                    <XCircle className="h-3 w-3" />{templateStatus.critical}
                  </span>
                )}
              </div>
            )}
            <Badge variant="secondary">{tasks.length} {tasks.length === 1 ? 'tarefa' : 'tarefas'}</Badge>
            <Badge variant="outline">{templateStatus.equipmentCount} {templateStatus.equipmentCount === 1 ? 'equip.' : 'equips.'}</Badge>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditTemplate(template)}><Pencil className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteTemplate(template.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
          </div>
        </div>
        {isExpanded && (
          <div className="px-3 pb-3">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Componente</TableHead>
                    <TableHead>Serviço</TableHead>
                    <TableHead>Periodicidade</TableHead>
                    <TableHead>Intervalo</TableHead>
                    <TableHead>Status por Equipamento</TableHead>
                    <TableHead className="w-12">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-4">Nenhuma tarefa adicionada.</TableCell></TableRow>
                  ) : tasks.map(task => {
                    const taskResults = getTaskStatus(template.id, task.component_type, task.task);
                    return (
                      <TableRow key={task.id}>
                        <TableCell><Badge variant="outline">{componentLabel(task.component_type)}</Badge></TableCell>
                        <TableCell>{task.task}</TableCell>
                        <TableCell>{triggerLabel(task.trigger_type)}</TableCell>
                        <TableCell>{fmtNum(task.interval_value)}</TableCell>
                        <TableCell>
                          {taskResults.length === 0 ? (
                            <span className="text-xs text-muted-foreground">Nenhum equip. vinculado</span>
                          ) : (
                            <div className="space-y-1.5">
                              {taskResults.map((r, i) => (
                                <div key={i} className="space-y-0.5">
                                  <div className="flex items-center justify-between text-xs gap-2">
                                    <span className="truncate max-w-[120px]">{r.equipmentName}</span>
                                    <span className={
                                      r.status === 'critical' ? 'text-[hsl(var(--status-critical))] font-semibold whitespace-nowrap' :
                                      r.status === 'warning' ? 'text-[hsl(var(--status-warning))] font-semibold whitespace-nowrap' :
                                      'text-[hsl(var(--status-ok))] whitespace-nowrap'
                                    }>
                                      {fmtNum(r.usage)}h / {fmtNum(r.interval)}h ({r.percent}%)
                                    </span>
                                  </div>
                                  <Progress value={r.percent} className="h-1" />
                                </div>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteTask(task.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => openAddTask(template.id)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar Tarefa
            </Button>
          </div>
        )}
      </div>
    );
  };

  const manufIds = Object.keys(tree.grouped);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Planos de Manutenção</h1>
            <p className="text-sm text-muted-foreground">Organizados por Fabricante / Modelo</p>
          </div>
          <Button onClick={openCreateTemplate}><Plus className="h-4 w-4 mr-2" /> Novo Plano</Button>
        </div>

        {allTemplates.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">Nenhum plano de manutenção criado.</p>
              <Button className="mt-4" onClick={openCreateTemplate}><Plus className="h-4 w-4 mr-2" /> Criar Primeiro Plano</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {/* Grouped by Manufacturer > Model */}
            {manufIds.map(manufId => {
              const manuf = manufacturers.find(m => m.id === manufId);
              const manufName = manuf?.name ?? 'Fabricante desconhecido';
              const isManufExpanded = expandedManufs.has(manufId);
              const modelIds = Object.keys(tree.grouped[manufId]);

              return (
                <Card key={manufId}>
                  <div className="p-3 cursor-pointer" onClick={() => toggle(expandedManufs, manufId, setExpandedManufs)}>
                    <div className="flex items-center gap-2">
                      {isManufExpanded ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                      <Factory className="h-5 w-5 text-primary" />
                      <span className="font-semibold text-base">{manufName}</span>
                      <Badge variant="outline" className="ml-2">{modelIds.length} {modelIds.length === 1 ? 'modelo' : 'modelos'}</Badge>
                    </div>
                  </div>
                  {isManufExpanded && (
                    <div className="px-3 pb-3 space-y-2">
                      {modelIds.map(modelId => {
                        const model = models.find(m => m.id === modelId);
                        const modelName = model?.name ?? 'Modelo desconhecido';
                        const isModelExpanded = expandedModels.has(modelId);
                        const plansForModel = tree.grouped[manufId][modelId];

                        return (
                          <div key={modelId} className="border rounded-lg ml-4">
                            <div className="p-2.5 cursor-pointer" onClick={() => toggle(expandedModels, modelId, setExpandedModels)}>
                              <div className="flex items-center gap-2">
                                {isModelExpanded ? <FolderOpen className="h-4 w-4 text-primary" /> : <Folder className="h-4 w-4 text-primary" />}
                                <span className="font-medium text-sm">{modelName}</span>
                                <Badge variant="secondary" className="ml-2">{plansForModel.length} {plansForModel.length === 1 ? 'plano' : 'planos'}</Badge>
                              </div>
                            </div>
                            {isModelExpanded && (
                              <div className="px-2 pb-2 space-y-2">
                                {plansForModel.map(renderPlanCard)}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              );
            })}

            {/* Unlinked plans */}
            {tree.unlinked.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Planos sem fabricante/modelo vinculado</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {tree.unlinked.map(renderPlanCard)}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Template Dialog */}
        <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingTemplate ? 'Editar Plano' : 'Novo Plano de Manutenção'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Fabricante *</Label>
                <Select value={templateManufId} onValueChange={v => { setTemplateManufId(v); setTemplateModelId(''); }}>
                  <SelectTrigger><SelectValue placeholder="Selecione o fabricante..." /></SelectTrigger>
                  <SelectContent>
                    {manufacturers.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {templateManufId && (
                <div className="space-y-2">
                  <Label>Modelo *</Label>
                  <Select value={templateModelId} onValueChange={setTemplateModelId}>
                    <SelectTrigger><SelectValue placeholder="Selecione o modelo..." /></SelectTrigger>
                    <SelectContent>
                      {filteredDialogModels.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Nome do Plano *</Label>
                <Input placeholder="Ex: Plano 2000h" value={templateName} onChange={e => setTemplateName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input placeholder="Descrição opcional" value={templateDesc} onChange={e => setTemplateDesc(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSaveTemplate}>{editingTemplate ? 'Salvar' : 'Criar'}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Task Dialog */}
        <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Adicionar Tarefa ao Plano</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Componente *</Label>
                {(() => {
                  // Find the template to get its manufacturer_id and model_id
                  const currentTemplate = allTemplates.find(t => t.id === taskTemplateId);
                  const tplManufId = currentTemplate?.manufacturer_id;
                  const tplModelId = currentTemplate?.model_id;
                  
                  // Find equipments that match the template's manufacturer AND model
                  const modelEquipments = allEquipments.filter(e => {
                    if (tplManufId && tplModelId) return e.manufacturer_id === tplManufId && e.model_id === tplModelId;
                    if (tplManufId) return e.manufacturer_id === tplManufId;
                    return false;
                  });
                  
                  const equipmentIds = new Set(modelEquipments.map(e => e.id));
                  
                  // Collect component types that actually exist in these equipments
                  const componentTypes = new Set<string>();
                  
                  // From cylinder_components (generators)
                  for (const cc of allCylinderComponents) {
                    if (equipmentIds.has(cc.equipment_id)) {
                      componentTypes.add(cc.component_type);
                    }
                  }
                  
                  // From sub_components
                  for (const sc of allSubComponents) {
                    if (equipmentIds.has(sc.equipment_id)) {
                      componentTypes.add(sc.component_type);
                    }
                  }
                  
                  // Also add standard non-cylinder types that generators always have
                  const generatorEquipments = modelEquipments.filter(e => e.equipment_type === 'gerador');
                  if (generatorEquipments.length > 0) {
                    // Add oil as it's always relevant for generators
                    componentTypes.add('oil');
                  }
                  
                  // Map to label options
                  const standardLabels: Record<string, string> = {
                    battery: 'Bateria', bearing: 'Bronzina', connecting_rod: 'Biela',
                    blowby: 'Blowby', liner: 'Camisa', damper: 'Damper',
                    intercooler: 'Intercooler', starter_motor: 'Motor de Arranque',
                    oil: 'Óleo', piston: 'Pistão', oil_exchanger: 'Trocador de Óleo',
                    turbine: 'Turbina', spark_plug: 'Vela',
                  };
                  
                  const dynamicOptions = Array.from(componentTypes)
                    .map(ct => ({ value: ct, label: standardLabels[ct] || ct }))
                    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
                  
                  if (dynamicOptions.length === 0) {
                    return <p className="text-sm text-muted-foreground">Nenhum equipamento cadastrado para este fabricante/modelo. Cadastre um equipamento primeiro.</p>;
                  }
                  
                  return (
                    <Select value={taskComponentType} onValueChange={setTaskComponentType}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {dynamicOptions.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  );
                })()}
              </div>
              <div className="space-y-2">
                <Label>Tipo de Serviço *</Label>
                <Select value={taskService} onValueChange={setTaskService}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Periodicidade *</Label>
                  <Select value={taskTrigger} onValueChange={setTaskTrigger}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TRIGGER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Intervalo *</Label>
                  <Input type="number" placeholder="Ex: 2000" value={taskInterval} onChange={e => setTaskInterval(e.target.value)} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setTaskDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSaveTask}>Adicionar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
