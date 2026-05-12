export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank =
  | 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  value: number;
}

export type GamePhase = 'lobby' | 'playing' | 'final-round' | 'ended';
export type TurnState = 'must-discard' | 'must-draw';

export interface LogEntry {
  id: string;
  timestamp: number;
  message: string;
  playerId?: string;
}

export interface GameResult {
  playerId: string;
  playerName: string;
  handValue: number;
  hand: Card[];
}

export interface PublicPlayer {
  id: string;
  name: string;
  handCount: number;
  handValue?: number;
  hand?: Card[];
  connected: boolean;
  hasPlayedFinalTurn: boolean;
}

export interface PublicGameState {
  roomCode: string;
  hostId: string;
  players: PublicPlayer[];
  deckCount: number;
  discardTop: Card[];
  currentTurnIndex: number;
  currentTurnPlayerId: string | null;
  phase: GamePhase;
  declarerId: string | null;
  log: LogEntry[];
  results: GameResult[] | null;
  winnerId: string | null;
  isTie: boolean;
  winnings: number;
  multiplier: number;
  turnState: TurnState;
  yourHand: Card[];
  yourId: string;
}
