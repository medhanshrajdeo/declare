import { PlayingCard } from './Card';
import { useGame, handValueOf } from '../store/gameStore';

interface Props {
  isMyTurn: boolean;
  canAct: boolean;
}

export function PlayerHand({ isMyTurn, canAct }: Props) {
  const state = useGame((s) => s.state);
  const selected = useGame((s) => s.selectedCardIds);
  const toggleCard = useGame((s) => s.toggleCard);
  if (!state) return null;

  const hand = [...state.yourHand].sort((a, b) => a.value - b.value);
  const value = handValueOf(state.yourHand);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2 px-2">
        <h3 className="text-sm uppercase tracking-wide text-slate-200/80">
          Your Hand · {hand.length} cards · value <span className="text-yellow-300 font-bold">{value}</span>
        </h3>
        {value <= 5 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-400 text-slate-900 font-bold">
            Can Declare
          </span>
        )}
      </div>
      <div className="flex flex-wrap justify-center gap-2 px-2">
        {hand.map((c) => (
          <PlayingCard
            key={c.id}
            card={c}
            selected={selected.includes(c.id)}
            onClick={canAct && isMyTurn ? () => toggleCard(c.id) : undefined}
          />
        ))}
        {hand.length === 0 && (
          <div className="text-slate-400 italic py-8">Waiting for cards…</div>
        )}
      </div>
    </div>
  );
}
