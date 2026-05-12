import { useEffect, useRef } from 'react';
import type { LogEntry } from '../types/game';

interface Props {
  log: LogEntry[];
}

export function GameLog({ log }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [log.length]);

  return (
    <div className="w-full">
      <h3 className="text-sm uppercase tracking-wide text-slate-200/80 mb-1 px-2">Game Log</h3>
      <div
        ref={ref}
        className="bg-black/30 rounded-lg p-2 h-40 overflow-y-auto text-xs font-mono text-slate-200/90 space-y-0.5"
      >
        {log.map((entry) => (
          <div key={entry.id}>
            <span className="text-slate-400">
              {new Date(entry.timestamp).toLocaleTimeString().slice(0, 8)}
            </span>{' '}
            {entry.message}
          </div>
        ))}
        {log.length === 0 && (
          <div className="text-slate-400 italic">No moves yet…</div>
        )}
      </div>
    </div>
  );
}
