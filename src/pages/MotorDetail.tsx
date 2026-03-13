import { useParams } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { MotorHeader, MotorStatsGrid, MotorTabs } from '@/components/motor-detail';
import { motors, componentPositions, maintenancePlans, maintenanceLogs, getMotorHealthScore } from '@/data/mockData';

export default function MotorDetail() {
  const { id } = useParams();
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
        <MotorHeader motor={motor} healthScore={healthScore} />
        <MotorStatsGrid motor={motor} />
        <MotorTabs groupedComponents={groupedComponents} plans={plans} logs={logs} />
      </div>
    </AppLayout>
  );
}
