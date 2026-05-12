import { useEffect } from 'react';
import { socket } from './socket/socket';
import { useGame } from './store/gameStore';
import { Lobby } from './components/Lobby';
import { RoomLobby } from './components/RoomLobby';
import { GameBoard } from './components/GameBoard';
import type { PublicGameState } from './types/game';

export default function App() {
  const state = useGame((s) => s.state);
  const setState = useGame((s) => s.setState);
  const setError = useGame((s) => s.setError);
  const errorMessage = useGame((s) => s.errorMessage);
  const theme = useGame((s) => s.theme);

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme]);

  useEffect(() => {
    const onState = (s: PublicGameState) => setState(s);
    const onError = ({ message }: { message: string }) => setError(message);
    const onConnect = () => console.log('[socket] connected');
    const onDisconnect = () => console.log('[socket] disconnected');

    socket.on('state', onState);
    socket.on('error-message', onError);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('state', onState);
      socket.off('error-message', onError);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [setState, setError]);

  useEffect(() => {
    if (errorMessage) {
      const t = setTimeout(() => setError(null), 4000);
      return () => clearTimeout(t);
    }
  }, [errorMessage, setError]);

  return (
    <>
      {!state && <Lobby />}
      {state && state.phase === 'lobby' && <RoomLobby />}
      {state && state.phase !== 'lobby' && <GameBoard />}
      {errorMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm">
          {errorMessage}
        </div>
      )}
    </>
  );
}
