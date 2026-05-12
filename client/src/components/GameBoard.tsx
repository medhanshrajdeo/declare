import { emitAck } from '../socket/socket';
import { useGame } from '../store/gameStore';
import { ActionBar } from './ActionBar';
import { DiscardPile } from './DiscardPile';
import { GameLog } from './GameLog';
import { PlayerHand } from './PlayerHand';
import { PlayerSeats } from './PlayerSeats';
import { ThemeToggle } from './ThemeToggle';
import { WinnerScreen } from './WinnerScreen';

export function GameBoard() {
  const state = useGame((s) => s.state);
  if (!state) return null;

  const isMyTurn = state.currentTurnPlayerId === state.yourId;
  const inPlay = state.phase === 'playing' || state.phase === 'final-round';
  const me = state.players.find((p) => p.id === state.yourId);

  const leave = () => emitAck('leave-room');

  return (
    <div className="min-h-screen felt-bg flex flex-col p-2 sm:p-4">
      {/* Top bar */}
      <div className="flex justify-between items-center mb-2 px-2">
        <div className="text-slate-200 text-sm">
          <span className="text-slate-400">Room</span>{' '}
          <span className="font-bold tracking-widest text-yellow-300">{state.roomCode}</span>
          <span className="ml-3 text-slate-400">Phase</span>{' '}
          <span className="font-bold">
            {state.phase === 'final-round' ? 'FINAL ROUND' : state.phase.toUpperCase()}
          </span>
        </div>
        <div className="flex gap-2 items-center">
          <ThemeToggle />
          <button
            onClick={leave}
            className="px-2 py-1 rounded bg-red-500/80 hover:bg-red-500 text-white text-sm"
          >
            Leave
          </button>
        </div>
      </div>

      {/* Other players */}
      <PlayerSeats state={state} />

      {/* Center: deck + discard */}
      <div className="flex-1 flex flex-col items-center justify-center py-4">
        <DiscardPile state={state} />
        {state.phase === 'final-round' && (
          <div className="mt-3 px-3 py-1 rounded-full bg-yellow-400 text-slate-900 text-xs font-bold">
            Final round! {state.players.find((p) => p.id === state.declarerId)?.name} declared.
          </div>
        )}
      </div>

      {/* Your hand */}
      <div className="bg-black/30 rounded-xl p-3 mb-2">
        <PlayerHand isMyTurn={isMyTurn} canAct={inPlay && state.turnState === 'must-discard'} />
        <ActionBar />
      </div>

      {/* Log */}
      <GameLog log={state.log} />

      {state.phase === 'ended' && <WinnerScreen />}

      {me && !me.connected && (
        <div className="fixed top-2 right-2 bg-red-600 text-white px-3 py-1 rounded text-sm">
          Reconnecting…
        </div>
      )}
    </div>
  );
}
