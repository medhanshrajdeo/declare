import type { PublicGameState } from '../types/game';
import { CardBack } from './Card';

interface Props {
  state: PublicGameState;
}

export function PlayerSeats({ state }: Props) {
  const others = state.players.filter((p) => p.id !== state.yourId);
  return (
    <div className="flex flex-wrap gap-3 justify-center mb-3">
      {others.map((p) => {
        const isTurn = state.currentTurnPlayerId === p.id;
        const isDeclarer = state.declarerId === p.id;
        return (
          <div
            key={p.id}
            className={`
              min-w-[150px] rounded-xl p-3 backdrop-blur
              ${isTurn ? 'bg-yellow-400/15 border border-yellow-400 turn-ring' : 'bg-white/5 border border-white/10'}
              ${!p.connected ? 'opacity-50' : ''}
            `}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-100 truncate max-w-[100px]">
                {p.name}
              </span>
              <div className="flex gap-1">
                {state.hostId === p.id && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/70 text-white">HOST</span>
                )}
                {isDeclarer && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500 text-slate-900 font-bold">DECLARED</span>
                )}
                {!p.connected && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500 text-white">OFF</span>
                )}
              </div>
            </div>
            <div className="flex -space-x-4">
              {Array.from({ length: Math.min(p.handCount, 7) }).map((_, i) => (
                <div key={i} style={{ transform: `rotate(${(i - p.handCount / 2) * 3}deg)` }}>
                  <CardBack small />
                </div>
              ))}
              {p.handCount === 0 && (
                <div className="text-slate-400 text-sm italic">no cards</div>
              )}
            </div>
            <div className="text-xs text-slate-300 mt-1">{p.handCount} cards</div>
          </div>
        );
      })}
    </div>
  );
}
