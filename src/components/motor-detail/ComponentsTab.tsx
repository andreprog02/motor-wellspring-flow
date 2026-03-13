import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WearProgress } from '@/components/StatusIndicators';
import { Calendar, Cog, Droplets, Flame, Wind } from 'lucide-react';
import type { componentPositions, maintenancePlans } from '@/data/mockData';

const groupIcons: Record<string, typeof Cog> = {
  'Sistema de Óleo': Droplets,
  'Sistema de Combustível': Flame,
  'Cabeçotes': Cog,
  'Turbocompressores': Wind,
};

interface ComponentsTabProps {
  groupedComponents: Record<string, typeof componentPositions>;
  plans: typeof maintenancePlans;
}

export function ComponentsTab({ groupedComponents, plans }: ComponentsTabProps) {
  return (
    <div className="space-y-4">
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
    </div>
  );
}
