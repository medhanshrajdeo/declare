import { useGame } from '../store/gameStore';

export function ThemeToggle() {
  const theme = useGame((s) => s.theme);
  const setTheme = useGame((s) => s.setTheme);
  const sound = useGame((s) => s.soundEnabled);
  const toggleSound = useGame((s) => s.toggleSound);

  return (
    <div className="flex gap-1">
      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="px-2 py-1 rounded bg-slate-800/70 hover:bg-slate-700 text-slate-100 text-sm border border-slate-600"
        title="Toggle theme"
      >
        {theme === 'dark' ? '☀' : '☾'}
      </button>
      <button
        onClick={toggleSound}
        className="px-2 py-1 rounded bg-slate-800/70 hover:bg-slate-700 text-slate-100 text-sm border border-slate-600"
        title="Toggle sound"
      >
        {sound ? '🔊' : '🔇'}
      </button>
    </div>
  );
}
