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
      whileHover={!disabled && value === '' ? { scale: 1.1, backgroundColor: 'rgba(255,255,255,0.08)' } : {}}
      whileTap={!disabled && value === '' ? { scale: 0.9 } : {}}
      onClick={onClick}
      disabled={disabled || value !== ''}
      className={`
        aspect-square border border-slate-800/40 rounded-[2px] flex items-center justify-center font-bold transition-all
        ${isWinningSquare ? 'bg-yellow-500/30 border-yellow-500/60 scale-110 z-10 shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'bg-slate-900/80'}
        ${disabled ? 'cursor-default' : 'cursor-pointer'}
        ${value === '' && !disabled ? 'hover:border-slate-500 active:bg-slate-800' : ''}
      `}
      id={`square-${index}`}
    >
      {value === 'X' && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-sky-400 drop-shadow-[0_0_4px_rgba(56,189,248,0.7)] text-[10px] sm:text-base leading-none"
        >
          X
        </motion.span>
      )}
      {value === 'O' && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-pink-400 drop-shadow-[0_0_4px_rgba(244,114,182,0.7)] text-[10px] sm:text-base leading-none"
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
      className="grid gap-[2px] p-1 bg-slate-950 rounded-sm border border-slate-800 shadow-2xl w-full max-w-[min(94vw,550px)] aspect-square" 
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
