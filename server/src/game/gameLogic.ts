import { Card, Rank } from '../types/game';
import { RANK_ORDER } from './deck';

export type DiscardValidation =
  | { valid: true; type: 'single' | 'set' | 'run' }
  | { valid: false; reason: string };

export function validateDiscard(cards: Card[]): DiscardValidation {
  if (!cards || cards.length === 0) {
    return { valid: false, reason: 'Must discard at least 1 card' };
  }
  if (cards.length === 1) {
    return { valid: true, type: 'single' };
  }

  const allSameRank = cards.every((c) => c.rank === cards[0].rank);
  if (allSameRank) {
    if (cards.length > 4) {
      return { valid: false, reason: 'Cannot discard more than 4 of a kind' };
    }
    return { valid: true, type: 'set' };
  }

  if (cards.length >= 3) {
    const allSameSuit = cards.every((c) => c.suit === cards[0].suit);
    if (!allSameSuit) {
      return {
        valid: false,
        reason: 'Multi-card discards must be same rank or sequential same-suit',
      };
    }
    const sorted = [...cards].sort((a, b) => RANK_ORDER[a.rank] - RANK_ORDER[b.rank]);
    for (let i = 1; i < sorted.length; i++) {
      const prev = RANK_ORDER[sorted[i - 1].rank];
      const cur = RANK_ORDER[sorted[i].rank];
      if (cur !== prev + 1) {
        return {
          valid: false,
          reason: 'Sequential discard must be consecutive ranks (no wrap-around)',
        };
      }
    }
    return { valid: true, type: 'run' };
  }

  return {
    valid: false,
    reason: 'Invalid discard combination',
  };
}

export function removeCardsFromHand(hand: Card[], cardIds: string[]): Card[] {
  const idSet = new Set(cardIds);
  return hand.filter((c) => !idSet.has(c.id));
}

export function getCardsByIds(hand: Card[], cardIds: string[]): Card[] | null {
  const found: Card[] = [];
  for (const id of cardIds) {
    const card = hand.find((c) => c.id === id);
    if (!card) return null;
    found.push(card);
  }
  return found;
}
