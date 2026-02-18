import { MaintenanceStatus, getUsagePercent } from '@/types/models';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: MaintenanceStatus;
  label?: string;
  className?: string;
}

const statusConfig = {
  ok: { label: 'Normal', dotClass: 'status-dot-ok', badgeClass: 'status-ok' },
  warning: { label: 'Atenção', dotClass: 'status-dot-warning', badgeClass: 'status-warning' },
  critical: { label: 'Vencido', dotClass: 'status-dot-critical', badgeClass: 'status-critical' },
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium', config.badgeClass, className)}>
      <span className={config.dotClass} />
      {label ?? config.label}
    </span>
  );
}

interface WearProgressProps {
  currentValue: number;
  lastExecution: number;
  interval: number;
  className?: string;
}

export function WearProgress({ currentValue, lastExecution, interval, className }: WearProgressProps) {
  const percent = getUsagePercent(currentValue, lastExecution, interval);
  const usage = currentValue - lastExecution;
  const status: MaintenanceStatus = percent >= 100 ? 'critical' : percent >= 90 ? 'warning' : 'ok';

  const barColor = {
    ok: 'bg-status-ok',
    warning: 'bg-status-warning',
    critical: 'bg-status-critical',
  }[status];

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground font-mono">{usage}/{interval}h</span>
        <span className={cn('font-semibold', {
          'text-status-ok': status === 'ok',
          'text-status-warning': status === 'warning',
          'text-status-critical': status === 'critical',
        })}>{percent}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColor, {
            'animate-pulse-slow': status === 'critical',
          })}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
