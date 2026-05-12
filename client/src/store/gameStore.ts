import { create } from 'zustand';
import type { Card, PublicGameState } from '../types/game';

type Theme = 'light' | 'dark';

interface GameStoreState {
  state: PublicGameState | null;
  playerName: string;
  selectedCardIds: string[];
  errorMessage: string | null;
  theme: Theme;
  soundEnabled: boolean;
  setState: (s: PublicGameState | null) => void;
  setPlayerName: (name: string) => void;
  toggleCard: (cardId: string) => void;
  clearSelection: () => void;
  setError: (msg: string | null) => void;
  setTheme: (t: Theme) => void;
  toggleSound: () => void;
}

const storedTheme = (typeof window !== 'undefined' &&
  (localStorage.getItem('declare-theme') as Theme | null)) || 'dark';

const storedName =
  (typeof window !== 'undefined' && localStorage.getItem('declare-name')) || '';

const storedSound =
  typeof window !== 'undefined' &&
  localStorage.getItem('declare-sound') !== 'false';

export const useGame = create<GameStoreState>((set, get) => ({
  state: null,
  playerName: storedName,
  selectedCardIds: [],
  errorMessage: null,
  theme: storedTheme,
  soundEnabled: storedSound,
  setState: (s) => set({ state: s, selectedCardIds: [] }),
  setPlayerName: (name) => {
    localStorage.setItem('declare-name', name);
    set({ playerName: name });
  },
  toggleCard: (cardId) => {
    const cur = get().selectedCardIds;
    set({
      selectedCardIds: cur.includes(cardId)
        ? cur.filter((id) => id !== cardId)
        : [...cur, cardId],
    });
  },
  clearSelection: () => set({ selectedCardIds: [] }),
  setError: (msg) => set({ errorMessage: msg }),
  setTheme: (t) => {
    localStorage.setItem('declare-theme', t);
    if (t === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    set({ theme: t });
  },
  toggleSound: () => {
    const next = !get().soundEnabled;
    localStorage.setItem('declare-sound', String(next));
    set({ soundEnabled: next });
  },
}));

export function handValueOf(cards: Card[]): number {
  return cards.reduce((s, c) => s + c.value, 0);
}
