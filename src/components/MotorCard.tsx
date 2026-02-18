import { useNavigate } from 'react-router-dom';
import { Motor } from '@/types/models';
import { getMotorHealthScore } from '@/data/mockData';
import { StatusBadge } from '@/components/StatusIndicators';
import { HealthScore } from '@/components/HealthScore';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Hash, Gauge, Zap } from 'lucide-react';

interface MotorCardProps {
  motor: Motor;
}

export function MotorCard({ motor }: MotorCardProps) {
  const navigate = useNavigate();
  const healthScore = getMotorHealthScore(motor.id);

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-all duration-200 hover:border-primary/20 group"
      onClick={() => navigate(`/motor/${motor.id}`)}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm truncate group-hover:text-industrial transition-colors">{motor.name}</h3>
              <StatusBadge status={motor.status} />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="font-mono">{motor.brand} {motor.model}</span>
              <span>·</span>
              <span className="font-mono">{motor.serialNumber}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{motor.location}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Hash className="h-3 w-3" />
                <span>{motor.cylinders} cil. · {motor.turbos} turbo</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Gauge className="h-3 w-3" />
                <span className="font-mono font-medium">{motor.totalHorimeter.toLocaleString()}h</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Zap className="h-3 w-3" />
                <span className="font-mono font-medium">{motor.totalStarts.toLocaleString()} arranques</span>
              </div>
            </div>
          </div>
          <HealthScore score={healthScore} size="sm" />
        </div>
      </CardContent>
    </Card>
  );
}
