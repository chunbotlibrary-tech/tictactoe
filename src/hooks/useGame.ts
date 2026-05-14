import { useState, useEffect, useCallback } from 'react';
import { 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  serverTimestamp, 
  getDoc,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
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
      console.log("[useGame] Auth state changed:", user?.uid);
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
      console.error("Auth failed:", err);
      handleError(err, OperationType.GET, 'auth/ensure-sign-in');
      setLoading(false); // Make sure we stop loading if auth fails
      return null;
    }
  }, [handleError]);

  // Initialize Auth on mount if needed
  useEffect(() => {
    if (!auth.currentUser) {
      ensureAuth();
    }
  }, [ensureAuth]);

  // Sync player symbol whenever gameState or userId changes
  useEffect(() => {
    const currentUid = auth.currentUser?.uid || userId;
    console.log("[useGame] Syncing player symbol:", { currentUid, hasGameState: !!gameState, players: gameState?.players });
    if (gameState && currentUid && gameState.players) {
      if (gameState.players.X === currentUid) {
        console.log("[useGame] Identified as Player X");
        setPlayerSymbol('X');
      } else if (gameState.players.O === currentUid) {
        console.log("[useGame] Identified as Player O");
        setPlayerSymbol('O');
      } else {
        console.log("[useGame] Identified as Spectator");
        setPlayerSymbol(null);
      }
    } else {
      console.log("[useGame] Symbol sync incomplete:", { hasGameState: !!gameState, currentUid });
      setPlayerSymbol(null);
    }
  }, [gameState, userId, auth.currentUser?.uid]);

  // Listen to Game State
  useEffect(() => {
    if (!roomId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const roomRef = doc(db, 'rooms', roomId);

    // Add a safety timeout to stop loading if connection is too slow/blocked
    const timeoutId = setTimeout(() => {
      setLoading(prev => {
        if (prev) {
          console.warn("Connection timeout - showing partial state");
          return false;
        }
        return false;
      });
    }, 10000);
    
    const unsub = onSnapshot(roomRef, (snapshot) => {
      clearTimeout(timeoutId);
      if (snapshot.exists()) {
        const data = snapshot.data() as GameState;
        setGameState(data);
      } else {
        setError("រកមិនឃើញបន្ទប់លេង (Room not found)");
      }
      setLoading(false);
    }, (err) => {
      clearTimeout(timeoutId);
      handleError(err, OperationType.GET, `rooms/${roomId}`);
      setLoading(false);
    });

    return () => unsub();
  }, [roomId, handleError]);

  const createRoom = useCallback(async () => {
    const currentUserId = await ensureAuth();
    if (!currentUserId) return null;

    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const roomRef = doc(db, 'rooms', newRoomId);
    
    const initialState: GameState = {
      board: Array(BOARD_SIZE * BOARD_SIZE).fill(''),
      turn: 'X',
      status: 'waiting',
      players: { X: currentUserId },
      winner: null,
      scores: { X: 0, O: 0 },
      createdAt: serverTimestamp() as any,
      lastMoveAt: serverTimestamp() as any
    };

    try {
      await setDoc(roomRef, initialState);
      return newRoomId;
    } catch (err) {
      handleError(err, OperationType.CREATE, `rooms/${newRoomId}`);
      return null;
    }
  }, [ensureAuth, handleError]);

  const joinRoom = useCallback(async (targetRoomId: string) => {
    const currentUserId = await ensureAuth();
    if (!currentUserId) return false;

    const roomRef = doc(db, 'rooms', targetRoomId);
    
    try {
      const snap = await getDoc(roomRef);
      if (!snap.exists()) {
        setError("Room doesn't exist");
        return false;
      }
      
      const data = snap.data() as GameState;
      
      if (data.players.X === currentUserId || (data.players.O === currentUserId)) return true;
      
      if (data.players.O) {
        setError("Room is full");
        return false;
      }

      await updateDoc(roomRef, {
        'players.O': currentUserId,
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
    const currentUid = auth.currentUser?.uid || userId;
    
    console.log("[makeMove] Attempting move at index:", index, {
      roomId,
      playerSymbol,
      currentUid,
      gameStatus: gameState?.status,
      gameTurn: gameState?.turn
    });

    if (!roomId || !gameState || !playerSymbol || !currentUid) {
      console.warn("Cannot move: Missing critical data", { roomId, hasGameState: !!gameState, playerSymbol, currentUid });
      return;
    }

    if (gameState.status !== 'active') {
      console.log("Cannot move: Game is in status", gameState.status);
      return;
    }

    if (gameState.turn !== playerSymbol) {
      console.log("Cannot move: It is turn", gameState.turn, "but you are", playerSymbol);
      return;
    }

    if (gameState.board[index] !== '') {
      console.log("Cannot move: Cell", index, "is already taken by", gameState.board[index]);
      return;
    }

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
      console.log("[makeMove] Updating database with new move...");
      await updateDoc(doc(db, 'rooms', roomId), {
        board: newBoard,
        turn: nextTurn,
        status: newStatus,
        winner: newWinner,
        scores: newScores,
        lastMoveAt: serverTimestamp()
      });
      console.log("[makeMove] Database updated successfully.");
    } catch (err) {
      console.error("[makeMove] Error updating database:", err);
      handleError(err, OperationType.UPDATE, `rooms/${roomId}`);
    }
  }, [roomId, gameState, playerSymbol, userId, handleError]);

  const resetGame = useCallback(async () => {
    if (!roomId || !gameState) return;
    
    try {
      await updateDoc(doc(db, 'rooms', roomId), {
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
