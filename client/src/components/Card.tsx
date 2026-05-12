import type { Card as CardType, Suit } from '../types/game';

const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const RED_SUITS: Suit[] = ['hearts', 'diamonds'];

interface CardProps {
  card: CardType;
  selected?: boolean;
  onClick?: () => void;
  small?: boolean;
  faded?: boolean;
}

export function PlayingCard({ card, selected, onClick, small, faded }: CardProps) {
  const isRed = RED_SUITS.includes(card.suit);
  const symbol = SUIT_SYMBOLS[card.suit];

  if (small) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={!onClick}
        className={`
          w-12 h-16 rounded-lg border-2 shadow-card deal-in flex flex-col p-1
          bg-white dark:bg-slate-100 overflow-hidden select-none
          ${isRed ? 'text-red-600' : 'text-slate-900'}
          ${selected ? 'border-yellow-400 -translate-y-2 ring-2 ring-yellow-300' : 'border-slate-300'}
          ${faded ? 'opacity-40' : ''}
          ${onClick ? 'cursor-pointer' : 'cursor-default'}
        `}
      >
        <div className="flex flex-col items-start leading-none shrink-0">
          <span className="text-xs font-bold leading-none">{card.rank}</span>
          <span className="text-[9px] leading-none">{symbol}</span>
        </div>
        <div className="flex-1 flex items-center justify-center text-base">
          {symbol}
        </div>
        <div className="flex flex-col items-end leading-none rotate-180 shrink-0">
          <span className="text-xs font-bold leading-none">{card.rank}</span>
          <span className="text-[9px] leading-none">{symbol}</span>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`
        w-20 h-28 sm:w-24 sm:h-32 rounded-lg border-2 shadow-card card-tilt deal-in
        flex flex-col p-1.5 sm:p-2
        bg-white dark:bg-slate-100 overflow-hidden select-none
        ${isRed ? 'text-red-600' : 'text-slate-900'}
        ${selected
          ? 'border-yellow-400 -translate-y-3 ring-2 ring-yellow-300'
          : 'border-slate-300 dark:border-slate-400'}
        ${faded ? 'opacity-40' : ''}
        ${onClick ? 'cursor-pointer' : 'cursor-default'}
      `}
    >
      {/* Top-left corner */}
      <div className="flex flex-col items-start leading-none shrink-0">
        <span className="text-sm font-bold leading-none">{card.rank}</span>
        <span className="text-xs leading-none">{symbol}</span>
      </div>

      {/* Centre pip */}
      <div className="flex-1 flex items-center justify-center text-3xl sm:text-4xl">
        {symbol}
      </div>

      {/* Bottom-right corner (rotated) */}
      <div className="flex flex-col items-end leading-none rotate-180 shrink-0">
        <span className="text-sm font-bold leading-none">{card.rank}</span>
        <span className="text-xs leading-none">{symbol}</span>
      </div>
    </button>
  );
}

export function CardBack({ small }: { small?: boolean }) {
  const sizeCls = small ? 'w-12 h-16' : 'w-20 h-28 sm:w-24 sm:h-32';
  return (
    <div
      className={`${sizeCls} rounded-lg border-2 border-slate-700 shadow-card
        bg-gradient-to-br from-indigo-700 to-indigo-950
        flex items-center justify-center text-white text-xl font-display select-none`}
    >
      <div className="border-2 border-indigo-300/40 rounded m-1 w-full h-full flex items-center justify-center">
        ★
      </div>
    </div>
  );
}
