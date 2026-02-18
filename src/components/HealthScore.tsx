import { cn } from '@/lib/utils';

interface HealthScoreProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function HealthScore({ score, size = 'md', className }: HealthScoreProps) {
  const sizeMap = { sm: 60, md: 90, lg: 120 };
  const strokeMap = { sm: 5, md: 6, lg: 8 };
  const fontSizeMap = { sm: 'text-sm', md: 'text-xl', lg: 'text-3xl' };

  const dim = sizeMap[size];
  const stroke = strokeMap[size];
  const radius = (dim - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color = score >= 80 ? 'var(--status-ok)' : score >= 50 ? 'var(--status-warning)' : 'var(--status-critical)';

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={dim} height={dim} className="-rotate-90">
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--secondary))"
          strokeWidth={stroke}
        />
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          fill="none"
          stroke={`hsl(${color})`}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className={cn('absolute font-bold', fontSizeMap[size])}>
        {score}
      </span>
    </div>
  );
}
