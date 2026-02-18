import { AppLayout } from '@/components/AppLayout';
import { MotorCard } from '@/components/MotorCard';
import { HealthScore } from '@/components/HealthScore';
import { StatusBadge } from '@/components/StatusIndicators';
import { motors, maintenancePlans, getMotorHealthScore, inventoryItems } from '@/data/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Gauge, AlertTriangle, Package, Wrench } from 'lucide-react';

const Dashboard = () => {
  const fleetScore = Math.round(motors.reduce((acc, m) => acc + getMotorHealthScore(m.id), 0) / motors.length);
  const criticalCount = motors.filter(m => m.status === 'critical').length;
  const warningCount = motors.filter(m => m.status === 'warning').length;
  const overduePlans = maintenancePlans.filter(p => {
    const usage = p.currentValue - p.lastExecutionValue;
    return usage >= p.interval;
  });
  const lowStockItems = inventoryItems.filter(i => i.quantity <= i.minStock);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard da Frota</h1>
          <p className="text-sm text-muted-foreground mt-1">Visão geral da saúde dos motores e alertas de manutenção</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <HealthScore score={fleetScore} size="sm" />
              <div>
                <p className="text-xs text-muted-foreground font-medium">Health Score</p>
                <p className="text-lg font-bold">Frota</p>
              </div>
            </CardContent>
          </Card>

          <Card className={criticalCount > 0 ? 'border-status-critical/30 bg-status-critical-muted' : ''}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-status-critical/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-status-critical" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Vencidas</p>
                <p className="text-2xl font-bold">{overduePlans.length}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-industrial/10 flex items-center justify-center">
                <Gauge className="h-5 w-5 text-industrial" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Motores</p>
                <p className="text-2xl font-bold">{motors.length}</p>
              </div>
            </CardContent>
          </Card>

          <Card className={lowStockItems.length > 0 ? 'border-status-warning/30 bg-status-warning-muted' : ''}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-status-warning/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-status-warning" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Estoque Baixo</p>
                <p className="text-2xl font-bold">{lowStockItems.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts */}
        {overduePlans.length > 0 && (
          <Card className="border-status-critical/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-status-critical" />
                Manutenções Vencidas
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {overduePlans.map(plan => (
                  <div key={plan.id} className="flex items-center justify-between py-2 px-3 rounded-md bg-status-critical-muted text-sm">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-3.5 w-3.5 text-status-critical" />
                      <span className="font-medium">{plan.componentName}</span>
                      <span className="text-muted-foreground">— {plan.task}</span>
                    </div>
                    <StatusBadge status="critical" label={`${plan.currentValue - plan.lastExecutionValue}/${plan.interval}h`} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Motor Grid */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Motores da Frota</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {motors.map(motor => (
              <MotorCard key={motor.id} motor={motor} />
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
