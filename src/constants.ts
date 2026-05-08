export const WINNING_COMBINATIONS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
  [0, 4, 8], [2, 4, 6]             // Diagonals
];

export type GameStatus = 'waiting' | 'active' | 'won' | 'draw';
export type PlayerSymbol = 'X' | 'O';

export interface GameState {
  board: (PlayerSymbol | '')[];
  turn: PlayerSymbol;
  status: GameStatus;
  players: {
    X: string;
    O?: string;
  };
  winner: string | null;
  scores: {
    X: number;
    O: number;
  };
  createdAt: any;
  lastMoveAt: any;
}
