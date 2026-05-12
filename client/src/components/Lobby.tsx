import { useState } from 'react';
import { emitAck } from '../socket/socket';
import { useGame } from '../store/gameStore';

export function Lobby() {
  const playerName = useGame((s) => s.playerName);
  const setPlayerName = useGame((s) => s.setPlayerName);
  const setError = useGame((s) => s.setError);
  const [roomCode, setRoomCode] = useState('');
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<any>(null);

  const validateName = (n: string) => {
    const trimmed = n.trim();
    if (!trimmed) {
      setError('Please enter your name');
      return null;
    }
    if (trimmed.length > 20) {
      setError('Name must be 20 characters or fewer');
      return null;
    }
    return trimmed;
  };

  const create = async () => {
    const name = validateName(playerName);
    if (!name) return;
    const res = await emitAck<{ roomCode?: string; error?: string }>('create-room', { name });
    if (res?.error) setError(res.error);
  };

  const join = async () => {
    const name = validateName(playerName);
    if (!name) return;
    const code = roomCode.trim().toUpperCase();
    if (!code) {
      setError('Please enter a room code');
      return;
    }
    if (!/^[A-Z0-9]{4,8}$/.test(code)) {
      setError('Room code must be 4-8 letters/digits');
      return;
    }
    const res = await emitAck<{ roomCode?: string; error?: string }>('join-room', {
      name,
      roomCode: code,
    });
    if (res?.error) setError(res.error);
  };

  const loadStats = async () => {
    const name = validateName(playerName);
    if (!name) return;
    const res = await emitAck<{ stats: any; recent: any[] }>('get-stats', { name });
    setStats(res);
    setShowStats(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 felt-bg">
      <div className="bg-slate-900/90 backdrop-blur border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h1 className="text-5xl font-display text-yellow-300 text-center mb-1 tracking-wider">
          DECLARE
        </h1>
        <p className="text-center text-slate-400 mb-6 text-sm">
          Multiplayer card game · 2-4 players
        </p>

        <label className="block text-sm text-slate-300 mb-1">Your Name</label>
        <input
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          maxLength={20}
          placeholder="Enter your name"
          className="w-full px-3 py-2 mb-4 rounded-lg bg-slate-800 text-white border border-slate-600 focus:border-yellow-400 outline-none"
        />

        {mode === 'menu' && (
          <div className="space-y-2">
            <button
              onClick={() => setMode('create')}
              className="w-full px-4 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-bold transition"
            >
              Create Room
            </button>
            <button
              onClick={() => setMode('join')}
              className="w-full px-4 py-3 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-bold transition"
            >
              Join Room
            </button>
            <button
              onClick={loadStats}
              className="w-full px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm transition"
            >
              My Stats
            </button>
          </div>
        )}

        {mode === 'create' && (
          <div className="space-y-3">
            <p className="text-slate-300 text-sm">
              A unique room code will be generated. Share it with friends to invite them.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setMode('menu')}
                className="flex-1 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white"
              >
                Back
              </button>
              <button
                onClick={create}
                className="flex-1 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-bold"
              >
                Create
              </button>
            </div>
          </div>
        )}

        {mode === 'join' && (
          <div className="space-y-3">
            <label className="block text-sm text-slate-300">Room Code</label>
            <input
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={8}
              placeholder="e.g. AB23X"
              className="w-full px-3 py-2 rounded-lg bg-slate-800 text-white border border-slate-600 focus:border-yellow-400 outline-none uppercase tracking-widest"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setMode('menu')}
                className="flex-1 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white"
              >
                Back
              </button>
              <button
                onClick={join}
                className="flex-1 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-bold"
              >
                Join
              </button>
            </div>
          </div>
        )}

        {showStats && stats && (
          <div className="fixed inset-0 z-30 bg-black/70 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 w-full max-w-md">
              <h3 className="text-2xl font-display text-yellow-300 mb-3">
                {playerName}'s Stats
              </h3>
              <div className="space-y-1 text-slate-200 text-sm">
                <div>Games played: <b>{stats.stats.games_played}</b></div>
                <div>Games won: <b>{stats.stats.games_won}</b></div>
                <div>Avg hand value: <b>{Number(stats.stats.avg_hand_value).toFixed(1)}</b></div>
                <div>Total winnings: <b className="text-yellow-300">{stats.stats.total_winnings}</b></div>
              </div>
              <div className="mt-4">
                <div className="text-xs uppercase text-slate-400 mb-1">Recent Games</div>
                <div className="text-xs text-slate-300 max-h-40 overflow-y-auto">
                  {stats.recent.map((g: any) => (
                    <div key={g.id} className="py-1 border-b border-slate-800">
                      {g.is_tie ? 'Tie' : `${g.winner_name} won`} · ${g.winnings} · {new Date(g.created_at).toLocaleString()}
                    </div>
                  ))}
                  {stats.recent.length === 0 && (
                    <div className="italic text-slate-500">No games yet</div>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowStats(false)}
                className="mt-4 w-full px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
