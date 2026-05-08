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
import { BOARD_SIZE, WIN_CONDITION, GameState, GameStatus, PlayerSymbol } from '../constants';

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
  const [userId, setUserId] = useState<string | null>(auth.currentUser?.uid || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync userId when auth state changes
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(user => {
      setUserId(user?.uid || null);
    });
    return unsub;
  }, []);

  const handleError = useCallback((err: any, operation: OperationType, path: string | null) => {
    let message = err?.message || String(err);
    const code = err?.code;
    
    // Auth specific errors
    if (code === 'auth/operation-not-allowed' || message.includes('operation-not-allowed')) {
      message = "Critical: Anonymous Authentication is DISABLED in your Firebase Console. Go to Authentication > Sign-in method and enable 'Anonymous'.";
    } else if (code === 'auth/invalid-api-key' || message.includes('invalid-api-key') || message.includes('API key not valid')) {
      message = "Critical: Your Firebase API Key is invalid. Please check your configuration in lib/firebase.ts.";
    } else if (code === 'auth/network-request-failed' || message.includes('network-request-failed')) {
      message = "Network Error: Failed to reach Firebase Auth. check your internet connection.";
    } else if (message.includes('permission-denied') || message.includes('PERMISSION_DENIED')) {
      message = "Access Denied: Please check your Realtime Database Rules in the Firebase Console.";
    }

    setError(message);
    console.error('Firebase Error Detail:', { code, message, operation, path });
  }, []);

  const ensureAuth = useCallback(async () => {
    if (auth.currentUser) return auth.currentUser.uid;
    
    try {
      console.log("Ensuring authentication...");
      const res = await signInAnonymously(auth);
      setUserId(res.user.uid);
      return res.user.uid;
    } catch (err: any) {
      handleError(err, OperationType.GET, 'auth/ensure-sign-in');
      return null;
    }
  }, [handleError]);

  // Initialize Auth on mount
  useEffect(() => {
    let isMounted = true;
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!isMounted) return;
      if (user) {
        setUserId(user.uid);
      } else {
        // Transparently try to sign in on mount
        ensureAuth();
      }
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, [ensureAuth]);

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
        
        // Use live auth uid for symbol detection to avoid stale state issues
        const currentUid = auth.currentUser?.uid || userId;
        if (currentUid && data.players) {
          if (data.players.X === currentUid) setPlayerSymbol('X');
          else if (data.players.O === currentUid) setPlayerSymbol('O');
          else setPlayerSymbol(null);
        }
      } else {
        setError("រកមិនឃើញបន្ទប់លេង (Room not found)");
      }
      setLoading(false);
    }, (err) => {
      handleError(err, OperationType.GET, `rooms/${roomId}`);
      setLoading(false);
    });

    return () => off(roomRef, 'value', unsub);
  }, [roomId, userId, handleError]);

  const createRoom = useCallback(async () => {
    const currentUserId = await ensureAuth();
    if (!currentUserId) return null;

    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const roomRef = ref(rtdb, `rooms/${newRoomId}`);
    
    const initialState: GameState = {
      board: Array(BOARD_SIZE * BOARD_SIZE).fill(''),
      turn: 'X',
      status: 'waiting',
      players: { X: currentUserId },
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
  }, [ensureAuth, handleError]);

  const joinRoom = useCallback(async (targetRoomId: string) => {
    const currentUserId = await ensureAuth();
    if (!currentUserId) return false;

    const roomRef = ref(rtdb, `rooms/${targetRoomId}`);
    
    try {
      const snap = await get(roomRef);
      if (!snap.exists()) {
        setError("Room doesn't exist");
        return false;
      }
      
      const data = snap.val() as GameState;
      
      if (data.players.X === currentUserId || data.players.O === currentUserId) return true;
      
      if (data.players.O) {
        setError("Room is full");
        return false;
      }

      await update(roomRef, {
        'players/O': currentUserId,
        status: 'active',
        lastMoveAt: serverTimestamp()
      });
      return true;
    } catch (err) {
      handleError(err, OperationType.UPDATE, `rooms/${targetRoomId}`);
      return false;
    }
  }, [ensureAuth, handleError]);

  const makeMove = useCallback(async (index: number) => {
    const currentUid = auth.currentUser?.uid;
    if (!roomId || !gameState || !playerSymbol || !currentUid) {
      console.warn("Cannot move: Missing data", { roomId, playerSymbol, currentUid });
      return;
    }

    if (gameState.status !== 'active') {
      console.log("Cannot move: Game is", gameState.status);
      return;
    }

    if (gameState.turn !== playerSymbol) {
      console.log("Cannot move: It is turn", gameState.turn, "but you are", playerSymbol);
      return;
    }

    if (gameState.board[index] !== '') return;

    const newBoard = [...gameState.board];
    newBoard[index] = playerSymbol;

    let newStatus: GameStatus = 'active';
    let newWinner: PlayerSymbol | null = null;
    let newScores = { ...gameState.scores };

    const checkWin = (board: (PlayerSymbol | '')[], idx: number) => {
      const symbol = board[idx];
      if (!symbol) return false;

      const row = Math.floor(idx / BOARD_SIZE);
      const col = idx % BOARD_SIZE;

      const directions = [
        [1, 0],  // Horizontal
        [0, 1],  // Vertical
        [1, 1],  // Diagonal \
        [1, -1]  // Diagonal /
      ];

      for (const [dr, dc] of directions) {
        let count = 1;

        // Check one direction
        for (let i = 1; i < WIN_CONDITION; i++) {
          const r = row + dr * i;
          const c = col + dc * i;
          if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) break;
          if (board[r * BOARD_SIZE + c] === symbol) count++;
          else break;
        }

        // Check opposite direction
        for (let i = 1; i < WIN_CONDITION; i++) {
          const r = row - dr * i;
          const c = col - dc * i;
          if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) break;
          if (board[r * BOARD_SIZE + c] === symbol) count++;
          else break;
        }

        if (count >= WIN_CONDITION) return true;
      }
      return false;
    };

    if (checkWin(newBoard, index)) {
      newStatus = 'won';
      newWinner = playerSymbol;
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
  }, [roomId, gameState, playerSymbol, handleError]);

  const resetGame = useCallback(async () => {
    if (!roomId || !gameState) return;
    
    try {
      await update(ref(rtdb, `rooms/${roomId}`), {
        board: Array(BOARD_SIZE * BOARD_SIZE).fill(''),
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
