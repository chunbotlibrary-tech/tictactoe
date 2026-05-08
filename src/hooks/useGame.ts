import { useState, useEffect, useCallback } from 'react';
import { 
  ref, 
  onValue, 
  set, 
  update, 
  serverTimestamp, 
  get,
  child,
  off
} from 'firebase/database';
import { rtdb, auth } from '../lib/firebase';
import { signInAnonymously } from 'firebase/auth';
import { WINNING_COMBINATIONS, GameState, GameStatus, PlayerSymbol } from '../constants';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function useGame(roomId: string | null) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerSymbol, setPlayerSymbol] = useState<PlayerSymbol | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleError = useCallback((err: unknown, operation: OperationType, path: string | null) => {
    let message = err instanceof Error ? err.message : String(err);
    
    // Add helpful context for manual setup users
    if (message.includes('permission-denied') || message.includes('PERMISSION_DENIED')) {
      message = "Access Denied. Please ensure you've set your Realtime Database rules to 'true' for testing.";
    } else if (message.includes('auth/operation-not-allowed')) {
      message = "Auth Disabled. Please enable 'Anonymous Sign-in' in the Firebase Authentication settings.";
    } else if (message.includes('offline')) {
      message = "Network Error. Please check your internet or check if your API keys are correct.";
    }

    setError(`${message}`);
    console.error('Firebase Error: ', { error: message, operation, path });
  }, []);

  // Initialize Auth
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        try {
          const res = await signInAnonymously(auth);
          setUserId(res.user.uid);
        } catch (err) {
          handleError(err, OperationType.GET, 'auth/sign-in');
        }
      }
    });
    return unsub;
  }, [handleError]);

  // Listen to Game State
  useEffect(() => {
    if (!roomId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const roomRef = ref(rtdb, `rooms/${roomId}`);
    
    const unsub = onValue(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val() as GameState;
        setGameState(data);
        
        // Determine player symbol
        if (userId) {
          if (data.players.X === userId) setPlayerSymbol('X');
          else if (data.players.O === userId) setPlayerSymbol('O');
        }
      } else {
        setError("Room not found");
      }
      setLoading(false);
    }, (err) => {
      handleError(err, OperationType.GET, `rooms/${roomId}`);
      setLoading(false);
    });

    return () => off(roomRef, 'value', unsub);
  }, [roomId, userId, handleError]);

  const createRoom = useCallback(async () => {
    if (!userId) {
        setError("Waiting for authentication...");
        return null;
    }
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const roomRef = ref(rtdb, `rooms/${newRoomId}`);
    
    const initialState: GameState = {
      board: Array(9).fill(''),
      turn: 'X',
      status: 'waiting',
      players: { X: userId },
      winner: null,
      scores: { X: 0, O: 0 },
      createdAt: serverTimestamp(),
      lastMoveAt: serverTimestamp()
    };

    try {
      await set(roomRef, initialState);
      return newRoomId;
    } catch (err) {
      handleError(err, OperationType.CREATE, `rooms/${newRoomId}`);
      return null;
    }
  }, [userId, handleError]);

  const joinRoom = useCallback(async (targetRoomId: string) => {
    if (!userId) return false;
    const roomRef = ref(rtdb, `rooms/${targetRoomId}`);
    
    try {
      const snap = await get(roomRef);
      if (!snap.exists()) {
        setError("Room doesn't exist");
        return false;
      }
      
      const data = snap.val() as GameState;
      
      if (data.players.X === userId || data.players.O === userId) return true;
      
      if (data.players.O) {
        setError("Room is full");
        return false;
      }

      await update(roomRef, {
        'players/O': userId,
        status: 'active',
        lastMoveAt: serverTimestamp()
      });
      return true;
    } catch (err) {
      handleError(err, OperationType.UPDATE, `rooms/${targetRoomId}`);
      return false;
    }
  }, [userId, handleError]);

  const makeMove = useCallback(async (index: number) => {
    if (!roomId || !gameState || !playerSymbol || !userId) return;
    if (gameState.status !== 'active' || gameState.turn !== playerSymbol || gameState.board[index] !== '') return;

    const newBoard = [...gameState.board];
    newBoard[index] = playerSymbol;

    let newStatus: GameStatus = 'active';
    let newWinner: string | null = null;
    let newScores = { ...gameState.scores };

    const isWin = WINNING_COMBINATIONS.some(combo => {
      return combo.every(idx => newBoard[idx] === playerSymbol);
    });

    if (isWin) {
      newStatus = 'won';
      newWinner = userId;
      newScores[playerSymbol]++;
    } else if (newBoard.every(cell => cell !== '')) {
      newStatus = 'draw';
    }

    const nextTurn = playerSymbol === 'X' ? 'O' : 'X';

    try {
      await update(ref(rtdb, `rooms/${roomId}`), {
        board: newBoard,
        turn: nextTurn,
        status: newStatus,
        winner: newWinner,
        scores: newScores,
        lastMoveAt: serverTimestamp()
      });
    } catch (err) {
      handleError(err, OperationType.UPDATE, `rooms/${roomId}`);
    }
  }, [roomId, gameState, playerSymbol, userId, handleError]);

  const resetGame = useCallback(async () => {
    if (!roomId || !gameState) return;
    
    try {
      await update(ref(rtdb, `rooms/${roomId}`), {
        board: Array(9).fill(''),
        turn: 'X',
        status: 'active',
        winner: null,
        lastMoveAt: serverTimestamp()
      });
    } catch (err) {
      handleError(err, OperationType.UPDATE, `rooms/${roomId}`);
    }
  }, [roomId, gameState, handleError]);

  const leaveRoom = useCallback(async () => {
    setGameState(null);
    setPlayerSymbol(null);
    setError(null);
  }, []);

  return {
    gameState,
    playerSymbol,
    userId,
    loading,
    error,
    createRoom,
    joinRoom,
    makeMove,
    resetGame,
    leaveRoom,
    setError
  };
}
