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
    e.stopPropagation();
    onClick();
  };

  return (
    <motion.button
      type="button"
      whileHover={(!disabled && value === '') ? { backgroundColor: 'rgba(255,255,255,0.1)', zIndex: 10 } : {}}
      onClick={handleClick}
      className={`
        w-8 h-8 sm:w-10 sm:h-10 border border-slate-700/50 flex items-center justify-center font-bold transition-all relative pointer-events-auto
        ${isWinningSquare ? 'bg-yellow-500/80 border-yellow-400 z-10' : 'bg-slate-900/95'}
        ${(disabled || value !== '') ? 'cursor-default opacity-100' : 'cursor-pointer'}
        ${value === '' && !disabled ? 'hover:border-sky-500 hover:bg-slate-800' : ''}
      `}
      id={`square-${index}`}
    >
      {value === 'X' && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.8)] text-lg sm:text-xl leading-none font-bold"
        >
          X
        </motion.span>
      )}
      {value === 'O' && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-pink-400 drop-shadow-[0_0_8px_rgba(244,114,182,0.8)] text-lg sm:text-xl leading-none font-bold"
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
    if (disabled || board[index] !== '') return;
    onSquareClick(index);
  };

  return (
    <div className="w-full max-w-full overflow-auto rounded-xl border border-slate-800 bg-slate-950 p-1 shadow-2xl custom-scrollbar max-h-[60vh]">
      <div 
        className="grid bg-slate-800 rounded-sm overflow-hidden relative z-20 pointer-events-auto mx-auto" 
        style={{ 
          gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))`,
          width: 'max-content',
          border: '1px solid rgb(30, 41, 59)'
        }}
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
    </div>
  );
}
