import React from 'react';
import { motion } from 'motion/react';
import { BOARD_SIZE, PlayerSymbol } from '../constants';

interface SquareProps {
  key?: React.Key;
  value: PlayerSymbol | '';
  onClick: () => void;
  isWinningSquare?: boolean;
  disabled?: boolean;
  index: number;
}

export function Square({ value, onClick, isWinningSquare, disabled, index }: SquareProps) {
  const handleClick = (e: React.MouseEvent) => {
    // Explicitly stop propagation to avoid any issues with parent handlers
    e.stopPropagation();
    console.log("[Square] Click detected", { index, value, disabled });
    onClick();
  };

  return (
    <motion.button
      type="button"
      whileHover={(!disabled && value === '') ? { scale: 1.15, backgroundColor: 'rgba(255,255,255,0.12)', zIndex: 20 } : {}}
      whileTap={(!disabled && value === '') ? { scale: 0.85 } : {}}
      onClick={handleClick}
      className={`
        aspect-square border border-slate-700/20 rounded-[1px] flex items-center justify-center font-bold transition-all relative pointer-events-auto
        ${isWinningSquare ? 'bg-yellow-500/40 border-yellow-400/60 scale-110 z-10 shadow-[0_0_20px_rgba(234,179,8,0.4)]' : 'bg-slate-900'}
        ${(disabled || value !== '') ? 'cursor-default opacity-80' : 'cursor-pointer opacity-100'}
        ${value === '' && !disabled ? 'hover:border-sky-500/50 active:bg-slate-800' : ''}
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
  const handleCellClick = (index: number) => {
    console.log("[Board] handleCellClick triggered", { index, disabled, boardValue: board[index] });
    // Guard here as well for extra safety
    if (disabled) {
      console.log("[Board] Click ignored: Board is disabled (not your turn or game ended)");
      return;
    }
    if (board[index] !== '') {
      console.log("[Board] Click ignored: Cell already occupied");
      return;
    }
    onSquareClick(index);
  };

  return (
    <div 
      className="grid gap-[1px] bg-slate-800 p-[1px] rounded-[4px] border border-slate-700 shadow-2xl w-full max-w-[min(92vw,550px)] aspect-square overflow-hidden relative z-20 pointer-events-auto" 
      style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))` }}
      id="game-board"
    >
      {board.map((value, i) => (
        <Square
          key={i}
          index={i}
          value={value}
          onClick={() => handleCellClick(i)}
          disabled={disabled}
          isWinningSquare={winningCombo?.includes(i)}
        />
      ))}
    </div>
  );
}
