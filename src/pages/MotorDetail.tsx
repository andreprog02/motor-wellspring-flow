import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { HealthScore } from '@/components/HealthScore';
import { StatusBadge, WearProgress } from '@/components/StatusIndicators';
import { motors, componentPositions, maintenancePlans, maintenanceLogs, getMotorHealthScore } from '@/data/mockData';
import { getMaintenanceStatus } from '@/types/models';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin, Gauge, Zap, Hash, Calendar, Wrench, Droplets, Cog, Flame, Wind } from 'lucide-react';

const groupIcons: Record<string, typeof Cog> = {
  'Sistema de Óleo': Droplets,
  'Sistema de Combustível': Flame,
  'Cabeçotes': Cog,
  'Turbocompressores': Wind,
};

export default function MotorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const motor = motors.find(m => m.id === id);

  if (!motor) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Motor não encontrado.</p>
        </div>
      </AppLayout>
    );
  }

  const healthScore = getMotorHealthScore(motor.id);
  const components = componentPositions.filter(c => c.motorId === motor.id);
  const plans = maintenancePlans.filter(p => {
    const cp = componentPositions.find(c => c.id === p.componentPositionId);
    return cp?.motorId === motor.id;
  });
  const logs = maintenanceLogs.filter(l => l.motorId === motor.id);

  const groupedComponents = components.reduce((acc, cp) => {
    if (!acc[cp.groupName]) acc[cp.groupName] = [];
    acc[cp.groupName].push(cp);
    return acc;
  }, {} as Record<string, typeof components>);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="mt-1">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{motor.name}</h1>
              <StatusBadge status={motor.status} />
            </div>
            <p className="text-sm text-muted-foreground mt-1 font-mono">{motor.brand} {motor.model} · S/N {motor.serialNumber}</p>
          </div>
          <HealthScore score={healthScore} size="md" />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: MapPin, label: 'Localização', value: motor.location },
            { icon: Gauge, label: 'Horímetro', value: `${motor.totalHorimeter.toLocaleString()}h` },
            { icon: Zap, label: 'Arranques', value: motor.totalStarts.toLocaleString() },
            { icon: Hash, label: 'Config.', value: `${motor.cylinders} cil. · ${motor.turbos} turbo` },
          ].map(stat => (
            <Card key={stat.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <stat.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{stat.label}</p>
                  <p className="text-sm font-semibold truncate">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="components" className="space-y-4">
          <TabsList>
            <TabsTrigger value="components">Componentes</TabsTrigger>
            <TabsTrigger value="plans">Planos de Manutenção</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          {/* Components Tab */}
          <TabsContent value="components" className="space-y-4">
            {Object.entries(groupedComponents).map(([groupName, comps]) => {
              const Icon = groupIcons[groupName] || Cog;
              return (
                <Card key={groupName}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Icon className="h-4 w-4 text-industrial" />
                      {groupName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {comps.map(cp => {
                        const plan = plans.find(p => p.componentPositionId === cp.id);
                        return (
                          <div key={cp.id} className="flex items-center gap-4 py-2 px-3 rounded-md bg-secondary/50">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{cp.name}</p>
                              <p className="text-xs text-muted-foreground">{cp.installedPartName}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Instalado em {new Date(cp.installDate).toLocaleDateString('pt-BR')} · {cp.horimeterAtInstall.toLocaleString()}h
                              </p>
                            </div>
                            {plan && (
                              <div className="w-40">
                                <WearProgress
                                  currentValue={plan.currentValue}
                                  lastExecution={plan.lastExecutionValue}
                                  interval={plan.interval}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* Plans Tab */}
          <TabsContent value="plans">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Componente</TableHead>
                      <TableHead>Tarefa</TableHead>
                      <TableHead>Gatilho</TableHead>
                      <TableHead>Progresso</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plans.map(plan => {
                      const status = getMaintenanceStatus(plan.currentValue, plan.lastExecutionValue, plan.interval);
                      return (
                        <TableRow key={plan.id}>
                          <TableCell className="font-medium text-sm">{plan.componentName}</TableCell>
                          <TableCell className="text-sm">{plan.task}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="font-mono text-xs">
                              {plan.interval} {plan.triggerType === 'hours' ? 'h' : plan.triggerType === 'starts' ? 'arr.' : 'meses'}
                            </Badge>
                          </TableCell>
                          <TableCell className="w-48">
                            <WearProgress
                              currentValue={plan.currentValue}
                              lastExecution={plan.lastExecutionValue}
                              interval={plan.interval}
                            />
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={status} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Componente</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Horímetro</TableHead>
                      <TableHead>Peça</TableHead>
                      <TableHead>Técnico</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-sm">{new Date(log.date).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell className="font-medium text-sm">{log.componentName}</TableCell>
                        <TableCell>
                          <Badge variant={log.serviceType === 'replacement' ? 'default' : 'secondary'} className="text-xs">
                            {log.serviceType === 'replacement' ? 'Troca' : log.serviceType === 'inspection' ? 'Inspeção' : 'Reparo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{log.horimeter.toLocaleString()}h</TableCell>
                        <TableCell className="text-sm">{log.partUsed}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{log.technician}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
