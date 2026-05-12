import { customAlphabet, nanoid } from 'nanoid';
import {
  Card,
  GameResult,
  GameState,
  LogEntry,
  Player,
  PublicGameState,
  PublicPlayer,
} from '../types/game';
import { buildDeck, handValue, shuffle } from './deck';
import {
  getCardsByIds,
  removeCardsFromHand,
  validateDiscard,
} from './gameLogic';

const roomCodeGen = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 5);
const HAND_SIZE = 5;
const MAX_PLAYERS = 4;
const MIN_PLAYERS = 2;
const DECLARE_THRESHOLD = 5;

const rooms = new Map<string, GameState>();

export function getRoom(code: string): GameState | undefined {
  return rooms.get(code);
}

export function listRooms(): GameState[] {
  return Array.from(rooms.values());
}

export function createRoom(
  hostName: string,
  socketId: string,
  multiplier: number,
): { state: GameState; player: Player } {
  let code = roomCodeGen();
  while (rooms.has(code)) code = roomCodeGen();

  const player: Player = {
    id: nanoid(8),
    socketId,
    name: hostName,
    hand: [],
    connected: true,
    hasPlayedFinalTurn: false,
  };

  const state: GameState = {
    roomCode: code,
    hostId: player.id,
    players: [player],
    deck: [],
    discardPile: [],
    lastDiscard: [],
    pendingDiscard: [],
    currentTurnIndex: 0,
    phase: 'lobby',
    declarerId: null,
    log: [makeLog(`${hostName} created room ${code}`)],
    results: null,
    winnerId: null,
    isTie: false,
    winnings: 0,
    multiplier,
    createdAt: Date.now(),
    turnState: 'must-discard',
  };

  rooms.set(code, state);
  return { state, player };
}

export function joinRoom(
  code: string,
  name: string,
  socketId: string,
): { state: GameState; player: Player } | { error: string } {
  const state = rooms.get(code);
  if (!state) return { error: 'Room not found' };
  if (state.phase !== 'lobby') {
    const existing = state.players.find(
      (p) => p.name.toLowerCase() === name.toLowerCase() && !p.connected,
    );
    if (existing) {
      existing.socketId = socketId;
      existing.connected = true;
      state.log.push(makeLog(`${existing.name} reconnected`));
      return { state, player: existing };
    }
    return { error: 'Game already in progress' };
  }
  if (state.players.length >= MAX_PLAYERS) return { error: 'Room is full' };
  if (state.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
    return { error: 'Name already taken in this room' };
  }

  const player: Player = {
    id: nanoid(8),
    socketId,
    name,
    hand: [],
    connected: true,
    hasPlayedFinalTurn: false,
  };
  state.players.push(player);
  state.log.push(makeLog(`${name} joined the room`));
  return { state, player };
}

export function startGame(code: string, playerId: string): GameState | { error: string } {
  const state = rooms.get(code);
  if (!state) return { error: 'Room not found' };
  if (state.hostId !== playerId) return { error: 'Only host can start the game' };
  if (state.phase !== 'lobby') return { error: 'Game already started' };
  if (state.players.length < MIN_PLAYERS) {
    return { error: `Need at least ${MIN_PLAYERS} players` };
  }

  state.deck = buildDeck(state.players.length);
  for (const p of state.players) {
    p.hand = state.deck.splice(0, HAND_SIZE);
    p.hasPlayedFinalTurn = false;
  }

  // Deal one card face-up to start the open pile
  const openCard = state.deck.shift()!;
  state.discardPile = [openCard];
  state.lastDiscard = [openCard];
  state.pendingDiscard = [];

  state.currentTurnIndex = 0;
  state.phase = 'playing';
  state.turnState = 'must-discard';
  state.declarerId = null;
  state.results = null;
  state.winnerId = null;
  state.isTie = false;
  state.winnings = 0;
  state.log.push(
    makeLog(
      `Game started with ${state.players.length} players. ` +
      `Opening card: ${describeDiscard([openCard])}. ` +
      `${state.players[0].name}'s turn.`,
    ),
  );
  return state;
}

// Step 1 of a turn: player discards 1+ cards from their hand.
// lastDiscard (previous player's open pile) stays unchanged so it remains pickable in step 2.
export function performDiscard(
  code: string,
  playerId: string,
  cardIds: string[],
): GameState | { error: string } {
  const state = rooms.get(code);
  if (!state) return { error: 'Room not found' };
  if (state.phase !== 'playing' && state.phase !== 'final-round') {
    return { error: 'Game is not in progress' };
  }
  const current = state.players[state.currentTurnIndex];
  if (current.id !== playerId) return { error: 'Not your turn' };
  if (state.turnState !== 'must-discard') {
    return { error: 'You must draw a card before discarding again' };
  }

  const cards = getCardsByIds(current.hand, cardIds);
  if (!cards) return { error: 'Cards not in hand' };

  const validation = validateDiscard(cards);
  if (!validation.valid) return { error: validation.reason };

  current.hand = removeCardsFromHand(current.hand, cardIds);
  state.discardPile.push(...cards);
  // Store as pendingDiscard — becomes lastDiscard after the player draws
  state.pendingDiscard = cards;

  const desc = describeDiscard(cards);
  state.log.push(makeLog(`${current.name} discarded ${desc}`, current.id));
  state.turnState = 'must-draw';

  return state;
}

// Step 2a: player draws 1 card from the deck, completing their turn.
export function performDraw(
  code: string,
  playerId: string,
): GameState | { error: string } {
  const state = rooms.get(code);
  if (!state) return { error: 'Room not found' };
  if (state.phase !== 'playing' && state.phase !== 'final-round') {
    return { error: 'Game is not in progress' };
  }
  const current = state.players[state.currentTurnIndex];
  if (current.id !== playerId) return { error: 'Not your turn' };
  if (state.turnState !== 'must-draw') {
    return { error: 'You must discard before drawing' };
  }

  if (state.deck.length === 0) {
    // Reshuffle: keep lastDiscard (pickable) and pendingDiscard (about to become lastDiscard)
    const keepIds = new Set([
      ...state.lastDiscard.map((c) => c.id),
      ...state.pendingDiscard.map((c) => c.id),
    ]);
    const reshuffleSource = state.discardPile.filter((c) => !keepIds.has(c.id));
    if (reshuffleSource.length === 0) {
      return { error: 'No cards available to draw' };
    }
    state.deck = shuffle(reshuffleSource);
    state.discardPile = state.discardPile.filter((c) => keepIds.has(c.id));
    state.log.push(makeLog('Deck reshuffled from discard pile'));
  }

  const drawn = state.deck.shift()!;
  current.hand.push(drawn);
  state.log.push(makeLog(`${current.name} drew a card from the deck`, current.id));

  completeTurn(state, current.id);
  return state;
}

// Step 2b: player takes one specific card from the previous player's open discard pile,
// completing their turn.
export function performDrawFromDiscard(
  code: string,
  playerId: string,
  cardId: string,
): GameState | { error: string } {
  const state = rooms.get(code);
  if (!state) return { error: 'Room not found' };
  if (state.phase !== 'playing' && state.phase !== 'final-round') {
    return { error: 'Game is not in progress' };
  }
  const current = state.players[state.currentTurnIndex];
  if (current.id !== playerId) return { error: 'Not your turn' };
  if (state.turnState !== 'must-draw') {
    return { error: 'You must discard before drawing' };
  }

  const cardIndex = state.lastDiscard.findIndex((c) => c.id === cardId);
  if (cardIndex === -1) return { error: 'Card not in the open discard pile' };

  const card = state.lastDiscard[cardIndex];
  // Remove the chosen card from both lastDiscard and discardPile
  state.lastDiscard = state.lastDiscard.filter((c) => c.id !== cardId);
  state.discardPile = state.discardPile.filter((c) => c.id !== cardId);

  current.hand.push(card);
  state.log.push(
    makeLog(`${current.name} took ${describeDiscard([card])} from the discard pile`, current.id),
  );

  completeTurn(state, current.id);
  return state;
}

// Shared end-of-turn logic: promote pendingDiscard → lastDiscard, advance turn, check game end.
function completeTurn(state: GameState, playerId: string): void {
  const current = state.players.find((p) => p.id === playerId)!;

  // Current player's discard is now the open pile for the next player
  state.lastDiscard = state.pendingDiscard;
  state.pendingDiscard = [];

  if (state.phase === 'final-round') {
    current.hasPlayedFinalTurn = true;
  }

  advanceTurn(state);

  if (state.phase === 'final-round') {
    const allDone = state.players.every(
      (p) => p.id === state.declarerId || p.hasPlayedFinalTurn,
    );
    if (allDone) endGame(state);
  }
}

export function performDeclare(
  code: string,
  playerId: string,
): GameState | { error: string } {
  const state = rooms.get(code);
  if (!state) return { error: 'Room not found' };
  if (state.phase !== 'playing') return { error: 'Cannot declare now' };
  const current = state.players[state.currentTurnIndex];
  if (current.id !== playerId) return { error: 'Not your turn' };
  if (state.turnState !== 'must-discard') {
    return { error: 'Must declare at the start of your turn, before discarding' };
  }
  const value = handValue(current.hand);
  if (value > DECLARE_THRESHOLD) {
    return { error: `Hand value ${value} exceeds threshold of ${DECLARE_THRESHOLD}` };
  }

  state.phase = 'final-round';
  state.declarerId = current.id;
  current.hasPlayedFinalTurn = true;
  state.log.push(
    makeLog(`${current.name} DECLARED with hand value ${value}! Final round begins.`, current.id),
  );

  advanceTurn(state);

  const allDone = state.players.every(
    (p) => p.id === state.declarerId || p.hasPlayedFinalTurn,
  );
  if (allDone) endGame(state);

  return state;
}

function advanceTurn(state: GameState): void {
  const n = state.players.length;
  for (let i = 1; i <= n; i++) {
    const idx = (state.currentTurnIndex + i) % n;
    const next = state.players[idx];
    if (state.phase === 'final-round' && next.id === state.declarerId) continue;
    if (state.phase === 'final-round' && next.hasPlayedFinalTurn) continue;
    state.currentTurnIndex = idx;
    state.turnState = 'must-discard';
    return;
  }
  state.turnState = 'must-discard';
}

function endGame(state: GameState): void {
  const results: GameResult[] = state.players.map((p) => ({
    playerId: p.id,
    playerName: p.name,
    handValue: handValue(p.hand),
    hand: p.hand,
  }));
  results.sort((a, b) => a.handValue - b.handValue);
  state.results = results;
  state.phase = 'ended';

  const min = results[0].handValue;
  const max = results[results.length - 1].handValue;
  const winners = results.filter((r) => r.handValue === min);
  if (winners.length > 1) {
    state.isTie = true;
    state.winnerId = null;
    state.winnings = 0;
    state.log.push(
      makeLog(`Tie at ${min}! Players: ${winners.map((w) => w.playerName).join(', ')}`),
    );
  } else {
    state.isTie = false;
    state.winnerId = winners[0].playerId;
    state.winnings = (max - min) * state.multiplier;
    state.log.push(
      makeLog(
        `${winners[0].playerName} wins with ${min}! Winnings: (${max}-${min}) × ${state.multiplier} = ${state.winnings}`,
      ),
    );
  }
}

export function handleDisconnect(socketId: string): { state: GameState; player: Player } | null {
  for (const state of rooms.values()) {
    const player = state.players.find((p) => p.socketId === socketId);
    if (player) {
      player.connected = false;
      player.socketId = null;
      state.log.push(makeLog(`${player.name} disconnected`, player.id));

      if (state.phase === 'lobby') {
        state.players = state.players.filter((p) => p.id !== player.id);
        if (state.players.length === 0) {
          rooms.delete(state.roomCode);
        } else if (state.hostId === player.id) {
          state.hostId = state.players[0].id;
          state.log.push(makeLog(`${state.players[0].name} is the new host`));
        }
      } else if (state.phase === 'playing' || state.phase === 'final-round') {
        if (
          state.players[state.currentTurnIndex] &&
          state.players[state.currentTurnIndex].id === player.id
        ) {
          state.log.push(makeLog(`${player.name} skipped (disconnected)`, player.id));
          advanceTurn(state);
        }
      }
      return { state, player };
    }
  }
  return null;
}

export function leaveRoom(code: string, playerId: string): GameState | null {
  const state = rooms.get(code);
  if (!state) return null;
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return null;
  if (state.phase === 'lobby') {
    state.players = state.players.filter((p) => p.id !== playerId);
    state.log.push(makeLog(`${player.name} left the room`));
    if (state.players.length === 0) {
      rooms.delete(code);
      return null;
    }
    if (state.hostId === playerId) {
      state.hostId = state.players[0].id;
      state.log.push(makeLog(`${state.players[0].name} is the new host`));
    }
  } else {
    player.connected = false;
    player.socketId = null;
    state.log.push(makeLog(`${player.name} left mid-game`, playerId));
  }
  return state;
}

export function toPublic(state: GameState, viewerId: string): PublicGameState {
  const viewer = state.players.find((p) => p.id === viewerId);
  const showHands = state.phase === 'ended';
  const publicPlayers: PublicPlayer[] = state.players.map((p) => ({
    id: p.id,
    name: p.name,
    handCount: p.hand.length,
    handValue: showHands ? handValue(p.hand) : undefined,
    hand: showHands ? p.hand : undefined,
    connected: p.connected,
    hasPlayedFinalTurn: p.hasPlayedFinalTurn,
  }));
  return {
    roomCode: state.roomCode,
    hostId: state.hostId,
    players: publicPlayers,
    deckCount: state.deck.length,
    discardTop: state.lastDiscard,   // always the previous player's discard = the pickable open pile
    currentTurnIndex: state.currentTurnIndex,
    currentTurnPlayerId: state.players[state.currentTurnIndex]?.id ?? null,
    phase: state.phase,
    declarerId: state.declarerId,
    log: state.log.slice(-50),
    results: state.results,
    winnerId: state.winnerId,
    isTie: state.isTie,
    winnings: state.winnings,
    multiplier: state.multiplier,
    turnState: state.turnState,
    yourHand: viewer ? viewer.hand : [],
    yourId: viewerId,
  };
}

function describeDiscard(cards: Card[]): string {
  if (cards.length === 1) {
    return `${cards[0].rank}${suitSymbol(cards[0].suit)}`;
  }
  const sameRank = cards.every((c) => c.rank === cards[0].rank);
  if (sameRank) return `${cards.length}× ${cards[0].rank}`;
  const sorted = [...cards].map((c) => `${c.rank}${suitSymbol(c.suit)}`);
  return sorted.join('-');
}

function suitSymbol(s: string): string {
  return { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' }[s] ?? s;
}

function makeLog(message: string, playerId?: string): LogEntry {
  return { id: nanoid(8), timestamp: Date.now(), message, playerId };
}

export function deleteRoom(code: string): void {
  rooms.delete(code);
}

export function resetGame(code: string): GameState | { error: string } {
  const state = rooms.get(code);
  if (!state) return { error: 'Room not found' };
  if (state.phase !== 'ended') return { error: 'Game has not ended yet' };
  state.phase = 'lobby';
  state.deck = [];
  state.discardPile = [];
  state.lastDiscard = [];
  state.pendingDiscard = [];
  state.currentTurnIndex = 0;
  state.declarerId = null;
  state.results = null;
  state.winnerId = null;
  state.isTie = false;
  state.winnings = 0;
  state.turnState = 'must-discard';
  for (const p of state.players) {
    p.hand = [];
    p.hasPlayedFinalTurn = false;
  }
  state.log.push(makeLog('Lobby reopened for a new game'));
  return state;
}
