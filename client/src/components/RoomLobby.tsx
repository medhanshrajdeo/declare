import { emitAck } from '../socket/socket';
import { useGame } from '../store/gameStore';

export function RoomLobby() {
  const state = useGame((s) => s.state);
  if (!state) return null;
  const isHost = state.hostId === state.yourId;

  const start = async () => {
    const res = await emitAck<{ ok?: boolean; error?: string }>('start-game');
    if (res?.error) useGame.getState().setError(res.error);
  };
  const leave = async () => {
    await emitAck('leave-room');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 felt-bg">
      <div className="bg-slate-900/90 border border-slate-700 rounded-2xl p-6 w-full max-w-md">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="text-xs uppercase text-slate-400">Room Code</div>
            <div className="text-4xl font-display text-yellow-300 tracking-widest">
              {state.roomCode}
            </div>
          </div>
          <button
            onClick={() => navigator.clipboard?.writeText(state.roomCode)}
            className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-xs text-slate-200"
          >
            Copy
          </button>
        </div>

        <div className="text-sm uppercase text-slate-400 mb-2">
          Players ({state.players.length}/4)
        </div>
        <div className="space-y-2 mb-4">
          {state.players.map((p) => (
            <div
              key={p.id}
              className="flex justify-between items-center bg-slate-800/60 rounded-lg px-3 py-2"
            >
              <span className="text-slate-100">{p.name}</span>
              <div className="flex gap-1">
                {state.hostId === p.id && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500 text-white">HOST</span>
                )}
                {p.id === state.yourId && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500 text-white">YOU</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {isHost ? (
          <button
            onClick={start}
            disabled={state.players.length < 2}
            className="w-full px-4 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 disabled:text-slate-400 text-white font-bold transition"
          >
            {state.players.length < 2 ? 'Waiting for players…' : 'Start Game'}
          </button>
        ) : (
          <div className="text-center text-slate-400 text-sm py-2">
            Waiting for host to start…
          </div>
        )}
        <button
          onClick={leave}
          className="w-full mt-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm"
        >
          Leave Room
        </button>
      </div>
    </div>
  );
}
