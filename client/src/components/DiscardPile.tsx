import { PlayingCard, CardBack } from './Card';
import { emitAck } from '../socket/socket';
import { useGame } from '../store/gameStore';
import type { PublicGameState } from '../types/game';

interface Props {
  state: PublicGameState;
}

export function DiscardPile({ state }: Props) {
  const setError = useGame((s) => s.setError);
  const isMyTurn = state.currentTurnPlayerId === state.yourId;
  const canPickFromDiscard = isMyTurn && state.turnState === 'must-draw';

  const pickCard = async (cardId: string) => {
    const res = await emitAck<{ ok?: boolean; error?: string }>('draw-discard', { cardId });
    if (res?.error) setError(res.error);
  };

  return (
    <div className="flex items-center gap-6 sm:gap-12 justify-center">
      <div className="flex flex-col items-center gap-1">
        <CardBack />
        <span className="text-xs text-slate-300">Deck · {state.deckCount}</span>
      </div>

      <div className="flex flex-col items-center gap-1">
        <div className="flex -space-x-8">
          {state.discardTop.length === 0 ? (
            <div className="w-20 h-28 sm:w-24 sm:h-32 rounded-lg border-2 border-dashed border-slate-500/60 flex items-center justify-center text-slate-400 text-xs">
              Empty
            </div>
          ) : (
            state.discardTop.map((c, i) => (
              <div
                key={c.id}
                style={{ zIndex: i }}
                className={canPickFromDiscard ? 'ring-2 ring-yellow-400 rounded-lg' : ''}
              >
                <PlayingCard
                  card={c}
                  onClick={canPickFromDiscard ? () => pickCard(c.id) : undefined}
                />
              </div>
            ))
          )}
        </div>
        <span className="text-xs text-slate-300">
          {canPickFromDiscard ? '↑ Click to take a card' : 'Last Discard'}
        </span>
      </div>
    </div>
  );
}
