import { Card, Rank, Suit } from '../types/game';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export const RANK_ORDER: Record<Rank, number> = {
  A: 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13,
};

export function cardValue(rank: Rank): number {
  return RANK_ORDER[rank];
}

export function buildDeck(numPlayers: number): Card[] {
  const numDecks = numPlayers <= 2 ? 1 : 2;
  const cards: Card[] = [];
  for (let d = 0; d < numDecks; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({
          id: `${d}-${suit}-${rank}-${Math.random().toString(36).slice(2, 8)}`,
          suit,
          rank,
          value: cardValue(rank),
        });
      }
    }
  }
  return shuffle(cards);
}

export function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function handValue(hand: Card[]): number {
  return hand.reduce((sum, c) => sum + c.value, 0);
}
