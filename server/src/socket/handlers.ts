import { Server, Socket } from 'socket.io';
import { recordGame, getPlayerStats, getRecentGames } from '../db/database';
import {
  createRoom,
  deleteRoom,
  getRoom,
  handleDisconnect,
  joinRoom,
  leaveRoom,
  performDeclare,
  performDiscard,
  performDraw,
  performDrawFromDiscard,
  resetGame,
  startGame,
  toPublic,
} from '../game/gameState';
import { GameState } from '../types/game';

interface SocketSession {
  playerId?: string;
  roomCode?: string;
}

const sessions = new Map<string, SocketSession>();

const MULTIPLIER = Number(process.env.MULTIPLIER ?? 10);

export function registerHandlers(io: Server, socket: Socket) {
  sessions.set(socket.id, {});

  function broadcastState(state: GameState) {
    for (const player of state.players) {
      if (player.socketId) {
        const sock = io.sockets.sockets.get(player.socketId);
        if (sock) sock.emit('state', toPublic(state, player.id));
      }
    }
  }

  function emitError(message: string) {
    socket.emit('error-message', { message });
  }

  socket.on('create-room', ({ name }: { name: string }, ack?: Function) => {
    const cleanName = (name || '').trim().slice(0, 20);
    if (!cleanName) return ack?.({ error: 'Name required' });

    const { state, player } = createRoom(cleanName, socket.id, MULTIPLIER);
    sessions.set(socket.id, { playerId: player.id, roomCode: state.roomCode });
    socket.join(state.roomCode);
    ack?.({ roomCode: state.roomCode, playerId: player.id });
    broadcastState(state);
  });

  socket.on(
    'join-room',
    ({ name, roomCode }: { name: string; roomCode: string }, ack?: Function) => {
      const cleanName = (name || '').trim().slice(0, 20);
      const cleanCode = (roomCode || '').trim().toUpperCase();
      if (!cleanName) return ack?.({ error: 'Name required' });
      if (!cleanCode) return ack?.({ error: 'Room code required' });

      const result = joinRoom(cleanCode, cleanName, socket.id);
      if ('error' in result) return ack?.({ error: result.error });
      sessions.set(socket.id, {
        playerId: result.player.id,
        roomCode: result.state.roomCode,
      });
      socket.join(result.state.roomCode);
      ack?.({ roomCode: result.state.roomCode, playerId: result.player.id });
      broadcastState(result.state);
    },
  );

  socket.on('start-game', (_, ack?: Function) => {
    const sess = sessions.get(socket.id);
    if (!sess?.roomCode || !sess.playerId) return ack?.({ error: 'No session' });
    const result = startGame(sess.roomCode, sess.playerId);
    if ('error' in result) return ack?.({ error: result.error });
    ack?.({ ok: true });
    broadcastState(result);
  });

  socket.on('discard', ({ cardIds }: { cardIds: string[] }, ack?: Function) => {
    const sess = sessions.get(socket.id);
    if (!sess?.roomCode || !sess.playerId) return ack?.({ error: 'No session' });
    const result = performDiscard(sess.roomCode, sess.playerId, cardIds);
    if ('error' in result) {
      emitError(result.error);
      return ack?.({ error: result.error });
    }
    ack?.({ ok: true });
    broadcastState(result);
  });

  socket.on('draw', (_, ack?: Function) => {
    const sess = sessions.get(socket.id);
    if (!sess?.roomCode || !sess.playerId) return ack?.({ error: 'No session' });
    const result = performDraw(sess.roomCode, sess.playerId);
    if ('error' in result) {
      emitError(result.error);
      return ack?.({ error: result.error });
    }
    ack?.({ ok: true });
    persistIfEnded(result);
    broadcastState(result);
  });

  socket.on('draw-discard', ({ cardId }: { cardId: string }, ack?: Function) => {
    const sess = sessions.get(socket.id);
    if (!sess?.roomCode || !sess.playerId) return ack?.({ error: 'No session' });
    const result = performDrawFromDiscard(sess.roomCode, sess.playerId, cardId);
    if ('error' in result) {
      emitError(result.error);
      return ack?.({ error: result.error });
    }
    ack?.({ ok: true });
    persistIfEnded(result);
    broadcastState(result);
  });

  socket.on('declare', (_, ack?: Function) => {
    const sess = sessions.get(socket.id);
    if (!sess?.roomCode || !sess.playerId) return ack?.({ error: 'No session' });
    const result = performDeclare(sess.roomCode, sess.playerId);
    if ('error' in result) {
      emitError(result.error);
      return ack?.({ error: result.error });
    }
    ack?.({ ok: true });
    persistIfEnded(result);
    broadcastState(result);
  });

  socket.on('reset-game', (_, ack?: Function) => {
    const sess = sessions.get(socket.id);
    if (!sess?.roomCode || !sess.playerId) return ack?.({ error: 'No session' });
    const state = getRoom(sess.roomCode);
    if (!state) return ack?.({ error: 'Room not found' });
    if (state.hostId !== sess.playerId) return ack?.({ error: 'Only host can reset' });
    const result = resetGame(sess.roomCode);
    if ('error' in result) return ack?.({ error: result.error });
    ack?.({ ok: true });
    broadcastState(result);
  });

  socket.on('leave-room', (_, ack?: Function) => {
    const sess = sessions.get(socket.id);
    if (!sess?.roomCode || !sess.playerId) return ack?.({ ok: true });
    const state = leaveRoom(sess.roomCode, sess.playerId);
    socket.leave(sess.roomCode);
    sessions.set(socket.id, {});
    ack?.({ ok: true });
    if (state) broadcastState(state);
  });

  socket.on('get-stats', ({ name }: { name: string }, ack?: Function) => {
    if (!name) return ack?.({ error: 'Name required' });
    ack?.({ stats: getPlayerStats(name), recent: getRecentGames(10) });
  });

  socket.on('disconnect', () => {
    const result = handleDisconnect(socket.id);
    sessions.delete(socket.id);
    if (result) {
      const room = getRoom(result.state.roomCode);
      if (room) broadcastState(room);
    }
  });
}

function persistIfEnded(state: GameState) {
  if (state.phase === 'ended' && state.results) {
    try {
      const winnerName = state.isTie
        ? null
        : state.results.find((r) => r.playerId === state.winnerId)?.playerName ?? null;
      recordGame({
        roomCode: state.roomCode,
        multiplier: state.multiplier,
        winnings: state.winnings,
        isTie: state.isTie,
        winnerName,
        results: state.results,
      });
    } catch (err) {
      console.error('Failed to persist game:', err);
    }
  }
}
