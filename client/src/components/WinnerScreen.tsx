import { useGame } from '../store/gameStore';
import { emitAck } from '../socket/socket';
import { PlayingCard } from './Card';

export function WinnerScreen() {
  const state = useGame((s) => s.state);
  if (!state || state.phase !== 'ended' || !state.results) return null;

  const winner = state.results[0];
  const isHost = state.hostId === state.yourId;
  const youWon = !state.isTie && state.winnerId === state.yourId;

  const playAgain = async () => {
    await emitAck('reset-game');
  };

  return (
    <div className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-yellow-400/40 rounded-2xl p-6 w-full max-w-3xl shadow-2xl">
        <div className="text-center mb-4">
          {state.isTie ? (
            <>
              <h2 className="text-4xl font-display text-yellow-300 mb-1">It's a Tie!</h2>
              <p className="text-slate-300">No winnings awarded</p>
            </>
          ) : (
            <>
              <h2 className="text-4xl font-display text-yellow-300 mb-1">
                {youWon ? '🏆 You Won!' : `${winner.playerName} Wins!`}
              </h2>
              <p className="text-slate-300">
                Hand Value: <span className="text-yellow-300 font-bold">{winner.handValue}</span>
              </p>
            </>
          )}
        </div>

        {!state.isTie && (
          <div className="bg-slate-800/60 rounded-lg p-3 mb-4 text-sm text-slate-200">
            <div className="font-bold mb-1">Monetization Breakdown</div>
            <div>Highest hand: {state.results[state.results.length - 1].handValue}</div>
            <div>Lowest hand: {state.results[0].handValue}</div>
            <div>Multiplier: ×{state.multiplier}</div>
            <div className="text-yellow-300 font-bold mt-1">
              Winnings: ({state.results[state.results.length - 1].handValue} − {state.results[0].handValue}) × {state.multiplier} = {state.winnings}
            </div>
          </div>
        )}

        <div className="space-y-3 mb-4">
          {state.results.map((r, idx) => (
            <div
              key={r.playerId}
              className={`rounded-lg p-3 ${
                !state.isTie && state.winnerId === r.playerId
                  ? 'bg-yellow-400/15 border border-yellow-400'
                  : 'bg-slate-800/40 border border-slate-700'
              }`}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-slate-100">
                  #{idx + 1} {r.playerName}
                </span>
                <span className="text-yellow-300 font-bold">{r.handValue}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {r.hand.map((c) => (
                  <PlayingCard key={c.id} card={c} small />
                ))}
              </div>
            </div>
          ))}
        </div>

        {isHost && (
          <button
            onClick={playAgain}
            className="w-full px-4 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-bold transition"
          >
            Play Again
          </button>
        )}
        {!isHost && (
          <div className="text-center text-slate-400 text-sm">
            Waiting for host to start the next game…
          </div>
        )}
      </div>
    </div>
  );
}
