import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Copy, LogOut, RefreshCw, Users, Shield, Github, Share2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Lobby } from './components/Lobby';
import { Board } from './components/Board';
import { useGame } from './hooks/useGame';
import { BOARD_SIZE, WIN_CONDITION } from './constants';
import { isConfigValid } from './lib/firebase';

export default function App() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const { 
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
  } = useGame(roomId);

  // Auto-trigger confetti on win
  useEffect(() => {
    if (gameState?.status === 'won' && gameState.winner === userId) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: playerSymbol === 'X' ? ['#38bdf8', '#0ea5e9'] : ['#f472b6', '#db2777']
      });
    }
  }, [gameState?.status, gameState?.winner, userId, playerSymbol]);

  if (!isConfigValid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-white font-sans">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-3xl space-y-6 shadow-2xl">
          <div className="p-4 bg-yellow-500/10 rounded-2xl border border-yellow-500/20 inline-block">
            <Shield className="w-10 h-10 text-yellow-500" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Firebase Setup Required</h1>
          <div className="space-y-4 text-slate-400">
            <p>
              Your Google Cloud project quota has been reached, so I couldn't automatically create a Firebase project for you.
            </p>
            <div className="bg-slate-950 p-4 rounded-xl text-sm border border-slate-800 space-y-2">
              <p className="font-bold text-slate-300">How to fix this:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Create a project at <a href="https://console.firebase.google.com" target="_blank" className="text-sky-400 hover:underline">console.firebase.google.com</a></li>
                <li>Enable <span className="text-sky-400">Firestore</span> and <span className="text-sky-400">Anonymous Auth</span></li>
                <li>Go to Project Settings and copy your Web App Config</li>
                <li>Add the keys to the <span className="text-sky-400">Secrets</span> panel in AI Studio (Settings &gt; Secrets)</li>
              </ol>
            </div>
            <p className="text-xs">
              Check the <code className="bg-slate-800 px-1 rounded text-red-400">.env.example</code> file for naming.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleCreate = async () => {
    const id = await createRoom();
    if (id) setRoomId(id);
  };

  const handleJoin = async (id: string) => {
    const success = await joinRoom(id);
    if (success) setRoomId(id);
  };

  const handleLeave = () => {
    leaveRoom();
    setRoomId(null);
  };

  const winningCombo = useMemo(() => {
    if (gameState?.status !== 'won' || !gameState.board) return null;
    const board = gameState.board;
    const symbol = gameState.winner;
    if (!symbol) return null;

    // We need to find which cells make up the winning line
    // For simplicity, we can re-run the win check logic but return the indices
    for (let i = 0; i < board.length; i++) {
      if (board[i] !== symbol) continue;

      const row = Math.floor(i / BOARD_SIZE);
      const col = i % BOARD_SIZE;

      const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
      for (const [dr, dc] of directions) {
        const combo = [i];
        for (let step = 1; step < WIN_CONDITION; step++) {
          const r = row + dr * step;
          const c = col + dc * step;
          const idx = r * BOARD_SIZE + c;
          if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[idx] === symbol) {
            combo.push(idx);
          } else break;
        }
        if (combo.length >= WIN_CONDITION) return combo;
      }
    }
    return null;
  }, [gameState]);

  const copyRoomId = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      // Optional: show toast or feedback
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-4 sm:p-8 max-w-4xl mx-auto w-full">
      {/* Global Error Banner */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-4 right-4 z-50 flex justify-center pointer-events-none"
          >
            <div className="bg-red-500 border border-red-600 text-white px-6 py-3 rounded-2xl flex items-center gap-3 shadow-2xl pointer-events-auto">
              <Shield className="w-5 h-5 shrink-0" />
              <p className="font-medium text-sm sm:text-base">{error}</p>
              <button 
                onClick={() => setError(null)} 
                className="ml-2 bg-white/20 hover:bg-white/30 p-1 rounded-lg transition-colors"
                id="btn-dismiss-error"
              >
                <LogOut className="w-4 h-4 rotate-90" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!roomId ? (
        <div className="flex-1 flex items-center justify-center">
          <Lobby onCreateRoom={handleCreate} onJoinRoom={handleJoin} loading={loading} />
        </div>
      ) : (
        <>
          {/* Header */}
          <header className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
            <div className="flex items-center gap-4">
              <button 
                onClick={handleLeave}
                className="p-3 bg-slate-900 border border-slate-800 rounded-xl hover:text-pink-500 transition-colors"
                title="Leave Game"
                id="btn-leave-game"
              >
                <LogOut className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">Room Code</span>
                  <button onClick={copyRoomId} className="hover:text-sky-400 transition-colors">
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
                <h2 className="text-2xl font-mono font-bold tracking-tighter">{roomId}</h2>
              </div>
            </div>

            <div className="flex gap-2 bg-slate-900/50 border border-slate-800 p-1 rounded-2xl">
               <div className={`px-4 py-2 rounded-xl flex items-center gap-3 transition-all ${playerSymbol === 'X' ? 'bg-sky-500/10 border border-sky-500/20 text-sky-400' : 'opacity-40'}`}>
                  <div className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></div>
                  <span className="font-bold">PLAYER X</span>
               </div>
               <div className={`px-4 py-2 rounded-xl flex items-center gap-3 transition-all ${playerSymbol === 'O' ? 'bg-pink-500/10 border border-pink-500/20 text-pink-400' : 'opacity-40'}`}>
                  <div className="w-2 h-2 rounded-full bg-pink-500 animate-pulse"></div>
                  <span className="font-bold">PLAYER O</span>
               </div>
            </div>
          </header>

          {/* Main Game Area */}
          <main className="flex-1 flex flex-col items-center justify-center gap-8">
            {/* Score Board */}
            {gameState && (
              <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-center">
                  <p className="text-slate-500 text-xs font-bold uppercase mb-1">X Wins</p>
                  <p className="text-3xl font-bold text-sky-400">{gameState.scores.X}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-center">
                  <p className="text-slate-500 text-xs font-bold uppercase mb-1">O Wins</p>
                  <p className="text-3xl font-bold text-pink-400">{gameState.scores.O}</p>
                </div>
              </div>
            )}

            {/* Status Message */}
            <div className="h-8 flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={gameState?.status + (gameState?.turn || '')}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-center font-bold tracking-wide"
                >
                  {gameState?.status === 'waiting' && (
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center gap-3 text-slate-400">
                        <Users className="w-5 h-5 animate-pulse" />
                        កំពុងរង់ចាំដៃគូ... (Waiting for opponent)
                      </div>
                      <p className="text-xs text-slate-500 font-normal">ផ្ញើលេខកូដបន្ទប់ទៅកាន់មិត្តភក្តិដើម្បីលេង</p>
                    </div>
                  )}
                  {gameState?.status === 'active' && (
                    <div className="flex flex-col items-center gap-1">
                      {playerSymbol ? (
                        <span className={gameState.turn === 'X' ? 'text-sky-400' : 'text-pink-400'}>
                          {gameState.turn === playerSymbol ? "ដល់វេនអ្នកហើយ (IT'S YOUR TURN)" : `រង់ចាំវេន ${gameState.turn} (WAITING FOR ${gameState.turn}...)`}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">WATCHING AS SPECTATOR (RE-JOIN TO PLAY)</span>
                      )}
                      {gameState.lastMoveAt && (
                        <span className="text-[10px] text-slate-600 uppercase">ដៃគូបានចូលរួម និងអាចលេងបានហើយ!</span>
                      )}
                    </div>
                  )}
                  {gameState?.status === 'won' && (
                    <span className="text-yellow-400 text-2xl uppercase tracking-widest">
                      {gameState.winner === playerSymbol ? "✨ អ្នកឈ្នះហើយ! (YOU WIN!) ✨" : "ដៃគូជាអ្នកឈ្នះ (OPPONENT WINS)"}
                    </span>
                  )}
                  {gameState?.status === 'draw' && (
                    <span className="text-slate-400 text-2xl uppercase tracking-widest">IT'S A DRAW</span>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Game Board */}
            <div className="relative group">
              <div className="absolute -inset-4 bg-gradient-to-r from-sky-500/20 to-pink-500/20 rounded-[3rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <Board 
                board={gameState?.board || Array(BOARD_SIZE * BOARD_SIZE).fill('')} 
                onSquareClick={makeMove}
                disabled={gameState?.status !== 'active' || gameState.turn !== playerSymbol}
                winningCombo={winningCombo}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
              {gameState && (gameState.status === 'won' || gameState.status === 'draw') && (
                <motion.button
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={resetGame}
                  className="w-full py-4 px-8 bg-sky-600 hover:bg-sky-500 text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl shadow-sky-900/20"
                  id="btn-play-again"
                >
                  <RefreshCw className="w-5 h-5" />
                  Play Again
                </motion.button>
              )}

              <AnimatePresence>
                {gameState?.status === 'waiting' && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => {
                       const shareText = `Join my Tic Tac Toe room: ${roomId}\n${window.location.href}`;
                       if (navigator.share) {
                         navigator.share({ title: 'Neon Tic Tac Toe', text: shareText, url: window.location.href })
                           .catch(() => copyRoomId());
                       } else {
                         copyRoomId();
                       }
                    }}
                    className="w-full py-3 border border-slate-700 text-slate-400 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-900 transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    Invite Friend
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </main>
        </>
      )}

      <footer className="mt-auto py-6 border-t border-slate-900 flex flex-col sm:flex-row justify-between items-center text-slate-600 text-sm gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 shadow-sm animate-pulse"></div>
          Server Region: Asia Southeast
        </div>
        <div className="flex items-center gap-6">
          <a href="#" className="hover:text-slate-400 transition-colors flex items-center gap-2">
            <Github className="w-4 h-4" /> Source
          </a>
          <span>© 2026 Neon Arena</span>
        </div>
      </footer>
    </div>
  );
}
