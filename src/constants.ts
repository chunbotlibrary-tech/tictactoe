export const BOARD_SIZE = 15;
export const WIN_CONDITION = 5;

export type GameStatus = 'waiting' | 'active' | 'won' | 'draw';
export type PlayerSymbol = 'X' | 'O';

export interface ChatMessage {
  id: string;
  sender: PlayerSymbol;
  text: string;
  timestamp: number;
}

export interface GameState {
  board: (PlayerSymbol | '')[];
  turn: PlayerSymbol;
  status: GameStatus;
  players: {
    X: string;
    O?: string;
  };
  winner: PlayerSymbol | null;
  scores: {
    X: number;
    O: number;
  };
  createdAt: any;
  lastMoveAt: any;
}
