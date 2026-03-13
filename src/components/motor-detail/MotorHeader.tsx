import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { HealthScore } from '@/components/HealthScore';
import { StatusBadge } from '@/components/StatusIndicators';
import { motors } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface MotorHeaderProps {
  motor: typeof motors[0];
  healthScore: number;
}

export function MotorHeader({ motor, healthScore }: MotorHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex items-start gap-4">
      <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="mt-1">
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{motor.name}</h1>
          <StatusBadge status={motor.status} />
        </div>
        <p className="text-sm text-muted-foreground mt-1 font-mono">
          {motor.brand} {motor.model} · S/N {motor.serialNumber}
        </p>
      </div>
      <HealthScore score={healthScore} size="md" />
    </div>
  );
}
