import { useGame, handValueOf } from '../store/gameStore';
import { emitAck } from '../socket/socket';

export function ActionBar() {
  const state = useGame((s) => s.state);
  const selected = useGame((s) => s.selectedCardIds);
  const clearSelection = useGame((s) => s.clearSelection);
  const setError = useGame((s) => s.setError);
  if (!state) return null;

  const isMyTurn = state.currentTurnPlayerId === state.yourId;
  const inPlay = state.phase === 'playing' || state.phase === 'final-round';
  const canDiscard = isMyTurn && inPlay && state.turnState === 'must-discard' && selected.length > 0;
  const canDraw = isMyTurn && inPlay && state.turnState === 'must-draw';
  const myHandValue = handValueOf(state.yourHand);
  const canDeclare =
    isMyTurn &&
    state.phase === 'playing' &&
    state.turnState === 'must-discard' &&
    myHandValue <= 5;

  const handleDiscard = async () => {
    const res = await emitAck<{ ok?: boolean; error?: string }>('discard', { cardIds: selected });
    if (res?.error) setError(res.error);
  };
  const handleDraw = async () => {
    const res = await emitAck<{ ok?: boolean; error?: string }>('draw');
    if (res?.error) setError(res.error);
  };
  const handleDeclare = async () => {
    if (!confirm(`Declare with hand value ${myHandValue}?`)) return;
    const res = await emitAck<{ ok?: boolean; error?: string }>('declare');
    if (res?.error) setError(res.error);
  };

  if (state.phase === 'ended' || state.phase === 'lobby') return null;

  return (
    <div className="flex flex-wrap gap-2 justify-center items-center mt-3 px-2">
      <button
        onClick={handleDiscard}
        disabled={!canDiscard}
        className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold shadow-md transition"
      >
        Discard {selected.length > 0 ? `(${selected.length})` : ''}
      </button>
      <button
        onClick={clearSelection}
        disabled={selected.length === 0}
        className="px-3 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-sm transition"
      >
        Clear
      </button>
      <button
        onClick={handleDraw}
        disabled={!canDraw}
        className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold shadow-md transition"
      >
        Draw Card
      </button>
      <button
        onClick={handleDeclare}
        disabled={!canDeclare}
        className="px-4 py-2 rounded-lg bg-yellow-400 hover:bg-yellow-300 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed text-slate-900 font-bold shadow-md transition"
      >
        Declare!
      </button>
      {isMyTurn && state.turnState === 'must-discard' && (
        <span className="text-slate-300 text-sm ml-2">
          Select cards then <span className="text-yellow-300 font-bold">Discard</span>
        </span>
      )}
      {isMyTurn && state.turnState === 'must-draw' && (
        <span className="text-slate-300 text-sm ml-2">
          Draw from deck <span className="text-slate-400">or click a card in the open pile</span>
        </span>
      )}
      {!isMyTurn && (
        <span className="text-slate-300 text-sm ml-2">
          Waiting for{' '}
          <span className="text-yellow-300 font-bold">
            {state.players.find((p) => p.id === state.currentTurnPlayerId)?.name ?? '...'}
          </span>
        </span>
      )}
    </div>
  );
}
