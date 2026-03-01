import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useMaintenancePlanTemplates, MaintenancePlanTemplate, MaintenancePlanTemplateTask } from '@/hooks/useMaintenancePlanTemplates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const COMPONENT_TYPES = [
  { value: 'oil', label: 'Óleo' },
  { value: 'spark_plug', label: 'Vela' },
  { value: 'liner', label: 'Camisa' },
  { value: 'piston', label: 'Pistão' },
  { value: 'connecting_rod', label: 'Biela' },
  { value: 'bearing', label: 'Bronzina' },
  { value: 'turbine', label: 'Turbina' },
  { value: 'intercooler', label: 'Intercooler' },
  { value: 'oil_exchanger', label: 'Trocador de Óleo' },
  { value: 'custom', label: 'Personalizado' },
];

const SERVICE_TYPES = [
  { value: 'Substituição', label: 'Substituição' },
  { value: 'Limpeza', label: 'Limpeza' },
  { value: 'Inspeção', label: 'Inspeção' },
  { value: 'Lubrificação', label: 'Lubrificação' },
];

const TRIGGER_TYPES = [
  { value: 'hours', label: 'Horas' },
  { value: 'months', label: 'Meses' },
  { value: 'starts', label: 'Arranques' },
];

export default function MaintenancePlansPage() {
  const { templates, templateTasks, addTemplate, updateTemplate, deleteTemplate, addTask, deleteTask } = useMaintenancePlanTemplates();
  const { toast } = useToast();

  // Template dialog
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MaintenancePlanTemplate | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');

  // Task dialog
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskTemplateId, setTaskTemplateId] = useState('');
  const [taskComponentType, setTaskComponentType] = useState('');
  const [taskCustomType, setTaskCustomType] = useState('');
  const [taskService, setTaskService] = useState('');
  const [taskTrigger, setTaskTrigger] = useState('hours');
  const [taskInterval, setTaskInterval] = useState('');

  // Expanded templates
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const componentLabel = (t: string) => COMPONENT_TYPES.find(x => x.value === t)?.label ?? t;
  const triggerLabel = (t: string) => TRIGGER_TYPES.find(x => x.value === t)?.label ?? t;

  const openCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateName('');
    setTemplateDesc('');
    setTemplateDialogOpen(true);
  };

  const openEditTemplate = (t: MaintenancePlanTemplate) => {
    setEditingTemplate(t);
    setTemplateName(t.name);
    setTemplateDesc(t.description);
    setTemplateDialogOpen(true);
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast({ title: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }
    try {
      if (editingTemplate) {
        await updateTemplate.mutateAsync({ id: editingTemplate.id, name: templateName.trim(), description: templateDesc.trim() });
        toast({ title: 'Plano atualizado' });
      } else {
        await addTemplate.mutateAsync({ name: templateName.trim(), description: templateDesc.trim() });
        toast({ title: 'Plano criado' });
      }
      setTemplateDialogOpen(false);
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await deleteTemplate.mutateAsync(id);
      toast({ title: 'Plano excluído' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
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
    if (!finalType || !taskService || !taskInterval) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }
    try {
      await addTask.mutateAsync({
        template_id: taskTemplateId,
        component_type: finalType,
        task: taskService,
        trigger_type: taskTrigger,
        interval_value: Number(taskInterval),
      });
      toast({ title: 'Tarefa adicionada' });
      setTaskDialogOpen(false);
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await deleteTask.mutateAsync(id);
      toast({ title: 'Tarefa removida' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const allTemplates = templates.data ?? [];
  const allTasks = templateTasks.data ?? [];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Planos de Manutenção</h1>
            <p className="text-sm text-muted-foreground">Crie modelos de planos e vincule aos equipamentos</p>
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
          <div className="space-y-3">
            {allTemplates.map(template => {
              const tasks = allTasks.filter(t => t.template_id === template.id);
              const isExpanded = expanded.has(template.id);
              return (
                <Card key={template.id}>
                  <CardHeader className="pb-3 cursor-pointer" onClick={() => toggleExpand(template.id)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isExpanded ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                        <div>
                          <CardTitle className="text-base">{template.name}</CardTitle>
                          {template.description && <CardDescription className="text-xs mt-0.5">{template.description}</CardDescription>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <Badge variant="secondary">{tasks.length} {tasks.length === 1 ? 'tarefa' : 'tarefas'}</Badge>
                        <Button variant="ghost" size="icon" onClick={() => openEditTemplate(template)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteTemplate(template.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {isExpanded && (
                    <CardContent className="pt-0">
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Componente</TableHead>
                              <TableHead>Tarefa</TableHead>
                              <TableHead>Periodicidade</TableHead>
                              <TableHead>Intervalo</TableHead>
                              <TableHead className="w-16">Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {tasks.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                                  Nenhuma tarefa. Adicione tarefas a este plano.
                                </TableCell>
                              </TableRow>
                            ) : (
                              tasks.map(task => (
                                <TableRow key={task.id}>
                                  <TableCell><Badge variant="outline">{componentLabel(task.component_type)}</Badge></TableCell>
                                  <TableCell>{task.task}</TableCell>
                                  <TableCell>{triggerLabel(task.trigger_type)}</TableCell>
                                  <TableCell>{task.interval_value}</TableCell>
                                  <TableCell>
                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteTask(task.id)}>
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                      <Button variant="outline" size="sm" className="mt-3" onClick={() => openAddTask(template.id)}>
                        <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar Tarefa
                      </Button>
                    </CardContent>
                  )}
                </Card>
              );
            })}
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
                <Label>Nome do Plano *</Label>
                <Input placeholder="Ex: Plano Jenbacher Serie 03" value={templateName} onChange={e => setTemplateName(e.target.value)} />
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
                <Select value={taskComponentType} onValueChange={setTaskComponentType}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {COMPONENT_TYPES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {taskComponentType === 'custom' && (
                  <Input placeholder="Nome do componente" value={taskCustomType} onChange={e => setTaskCustomType(e.target.value)} />
                )}
              </div>
              <div className="space-y-2">
                <Label>Tipo de Serviço *</Label>
                <Select value={taskService} onValueChange={setTaskService}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Periodicidade *</Label>
                  <Select value={taskTrigger} onValueChange={setTaskTrigger}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TRIGGER_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
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
