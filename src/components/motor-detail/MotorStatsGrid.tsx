import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Gauge, Zap, Hash } from 'lucide-react';
import type { motors } from '@/data/mockData';

interface MotorStatsGridProps {
  motor: typeof motors[0];
}

const statsConfig = [
  { icon: MapPin, label: 'Localização', getValue: (m: typeof motors[0]) => m.location },
  { icon: Gauge, label: 'Horímetro', getValue: (m: typeof motors[0]) => `${m.totalHorimeter.toLocaleString()}h` },
  { icon: Zap, label: 'Arranques', getValue: (m: typeof motors[0]) => m.totalStarts.toLocaleString() },
  { icon: Hash, label: 'Config.', getValue: (m: typeof motors[0]) => `${m.cylinders} cil. · ${m.turbos} turbo` },
];

export function MotorStatsGrid({ motor }: MotorStatsGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {statsConfig.map(stat => (
        <Card key={stat.label}>
          <CardContent className="p-4 flex items-center gap-3">
            <stat.icon className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                {stat.label}
              </p>
              <p className="text-sm font-semibold truncate">{stat.getValue(motor)}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
