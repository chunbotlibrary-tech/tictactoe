import { motion } from 'motion/react';
import { PlayerSymbol } from '../constants';

interface SquareProps {
  value: PlayerSymbol | '';
  onClick: () => void;
  isWinningSquare?: boolean;
  disabled?: boolean;
  key?: any;
}

export function Square({ value, onClick, isWinningSquare, disabled }: SquareProps) {
  return (
    <motion.button
      whileHover={!disabled && value === '' ? { scale: 0.98, backgroundColor: 'rgba(255,255,255,0.05)' } : {}}
      whileTap={!disabled && value === '' ? { scale: 0.95 } : {}}
      onClick={onClick}
      disabled={disabled || value !== ''}
      className={`
        h-24 w-24 sm:h-32 sm:w-32 border border-slate-800 rounded-xl flex items-center justify-center text-5xl sm:text-6xl font-bold transition-colors
        ${isWinningSquare ? 'bg-slate-800/50' : 'bg-slate-900/40'}
        ${disabled ? 'cursor-default' : 'cursor-pointer'}
      `}
      id={`square-${value}`}
    >
      {value === 'X' && (
        <motion.span
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          className="text-sky-400 neon-text-x"
        >
          X
        </motion.span>
      )}
      {value === 'O' && (
        <motion.span
          initial={{ scale: 0, rotate: 45 }}
          animate={{ scale: 1, rotate: 0 }}
          className="text-pink-400 neon-text-o"
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
    <div className="grid grid-cols-3 gap-3 p-3 bg-slate-900/20 rounded-2xl border border-slate-800/50" id="game-board">
      {board.map((value, i) => (
        <Square
          key={i}
          value={value}
          onClick={() => onSquareClick(i)}
          disabled={disabled}
          isWinningSquare={winningCombo?.includes(i)}
        />
      ))}
    </div>
  );
}
