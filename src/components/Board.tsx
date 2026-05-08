import { motion } from 'motion/react';
import { BOARD_SIZE, PlayerSymbol } from '../constants';

interface SquareProps {
  value: PlayerSymbol | '';
  onClick: () => void;
  isWinningSquare?: boolean;
  disabled?: boolean;
  index: number;
}

export function Square({ value, onClick, isWinningSquare, disabled, index }: SquareProps) {
  return (
    <motion.button
      whileHover={!disabled && value === '' ? { scale: 1.05, backgroundColor: 'rgba(255,255,255,0.05)' } : {}}
      whileTap={!disabled && value === '' ? { scale: 0.95 } : {}}
      onClick={onClick}
      disabled={disabled || value !== ''}
      className={`
        h-7 w-7 sm:h-9 sm:w-9 border border-slate-800/50 rounded-sm flex items-center justify-center text-sm sm:text-base font-bold transition-all
        ${isWinningSquare ? 'bg-yellow-500/20 border-yellow-500/50 scale-110 z-10' : 'bg-slate-900/60'}
        ${disabled ? 'cursor-default' : 'cursor-pointer'}
        ${value === '' && !disabled ? 'hover:border-slate-600' : ''}
      `}
      id={`square-${index}`}
    >
      {value === 'X' && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)] leading-none"
        >
          X
        </motion.span>
      )}
      {value === 'O' && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-pink-400 drop-shadow-[0_0_8px_rgba(244,114,182,0.5)] leading-none"
        >
          O
        </motion.span>
      )}
    </motion.button>
  );
}

interface BoardProps {
  board: (PlayerSymbol | '')[];
  onSquareClick: (index: number) => void;
  disabled?: boolean;
  winningCombo?: number[] | null;
}

export function Board({ board, onSquareClick, disabled, winningCombo }: BoardProps) {
  return (
    <div 
      className="grid gap-1 p-2 bg-slate-900/40 rounded-xl border border-slate-800 shadow-inner" 
      style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))` }}
      id="game-board"
    >
      {board.map((value, i) => (
        <Square
          key={i}
          index={i}
          value={value}
          onClick={() => onSquareClick(i)}
          disabled={disabled}
          isWinningSquare={winningCombo?.includes(i)}
        />
      ))}
    </div>
  );
}
