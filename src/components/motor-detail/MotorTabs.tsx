import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ComponentsTab } from './ComponentsTab';
import { PlansTab } from './PlansTab';
import { HistoryTab } from './HistoryTab';
import type { componentPositions, maintenancePlans, maintenanceLogs } from '@/data/mockData';

interface MotorTabsProps {
  groupedComponents: Record<string, typeof componentPositions>;
  plans: typeof maintenancePlans;
  logs: typeof maintenanceLogs;
}

export function MotorTabs({ groupedComponents, plans, logs }: MotorTabsProps) {
  return (
    <Tabs defaultValue="components" className="space-y-4">
      <TabsList>
        <TabsTrigger value="components">Componentes</TabsTrigger>
        <TabsTrigger value="plans">Planos de Manutenção</TabsTrigger>
        <TabsTrigger value="history">Histórico</TabsTrigger>
      </TabsList>

      <TabsContent value="components">
        <ComponentsTab groupedComponents={groupedComponents} plans={plans} />
      </TabsContent>

      <TabsContent value="plans">
        <PlansTab plans={plans} />
      </TabsContent>

      <TabsContent value="history">
        <HistoryTab logs={logs} />
      </TabsContent>
    </Tabs>
  );
}
