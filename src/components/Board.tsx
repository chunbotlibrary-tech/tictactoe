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
      whileHover={(!disabled && value === '') ? { scale: 1.15, backgroundColor: 'rgba(255,255,255,0.15)', zIndex: 20 } : {}}
      whileTap={(!disabled && value === '') ? { scale: 0.85 } : {}}
      onClick={handleClick}
      className={`
        w-12 h-12 sm:w-14 sm:h-14 border-2 border-slate-800/80 flex items-center justify-center font-bold transition-all relative pointer-events-auto
        ${isWinningSquare ? 'bg-yellow-500/60 border-yellow-400 scale-110 z-10 shadow-[0_0_30px_rgba(234,179,8,0.6)]' : 'bg-slate-900'}
        ${(disabled || value !== '') ? 'cursor-default opacity-100' : 'cursor-pointer'}
        ${value === '' && !disabled ? 'hover:border-sky-500 hover:bg-slate-800 active:bg-slate-700' : ''}
      `}
      id={`square-${index}`}
    >
      {value === 'X' && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.8)] text-xl sm:text-2xl leading-none font-bold"
        >
          X
        </motion.span>
      )}
      {value === 'O' && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-pink-400 drop-shadow-[0_0_8px_rgba(244,114,182,0.8)] text-xl sm:text-2xl leading-none font-bold"
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
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  const handleCellClick = (index: number) => {
    if (disabled || board[index] !== '') return;
    onSquareClick(index);
  };

  return (
    <div 
      ref={containerRef}
      className="w-full max-w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950 p-2 sm:p-4 shadow-2xl relative"
    >
      <motion.div 
        drag
        dragConstraints={containerRef}
        dragElastic={0.1}
        dragMomentum={true}
        className="grid bg-slate-800 rounded-sm overflow-hidden relative z-20 pointer-events-auto mx-auto touch-none" 
        style={{ 
          gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))`,
          width: 'max-content',
          border: '2px solid rgb(30, 41, 59)',
          cursor: 'grab'
        }}
        whileTap={{ cursor: 'grabbing' }}
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
      </motion.div>
      <div className="mt-4 text-center text-slate-500 text-xs">
        ចុចឱ្យជាប់ដើម្បីអូសមើលក្រឡា (Hold and drag to scroll the board)
      </div>
    </div>
  );
}
