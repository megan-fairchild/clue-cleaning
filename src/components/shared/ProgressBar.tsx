import clsx from 'clsx';

interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  colorClass?: string;
}

export default function ProgressBar({ value, max, label, colorClass = 'bg-accent' }: ProgressBarProps) {
  const percent = max > 0 ? Math.min((value / max) * 100, 100) : 0;

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-text-muted">{label}</span>
          <span className="text-xs text-text-muted">{value}/{max}</span>
        </div>
      )}
      <div className="w-full h-2 bg-mahogany/50 rounded-full overflow-hidden border border-gold/20">
        <div
          className={clsx('h-full rounded-full transition-all duration-500', colorClass)}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
