import { useState, useEffect, useMemo, useCallback } from 'react';
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

  const getMemeMessage = useCallback(() => {
    if (!gameState || gameState.status !== 'won') return "";
    const isWinner = gameState.winner === playerSymbol;
    
    const winMessages = [
      "អបអរសាទរអ្នកឈ្នះសត្រូវរបស់អ្នកហើយ 🏆",
      "ឈ្នះរហូតបាយចិត្តណាស់! 🍚🥢",
      "ខ្លាំងមែនទែន! មិនមែនលេងសើចទេ 😎",
      "ឈ្នះបានសម្រេច! ដៃគូសុំចុះចាញ់ហើយ ✨"
    ];
    
    const loseMessages = [
      "អន់ហាលេងចាញ់គេ! 🤪",
      "លេងចាញ់គេញឹកអញ្ចឹងស្រឡាញ់គេទៅបានឈ្នះ 💖",
      "សំណាងក្រោយទៀតចុះ កុំទាន់អស់សង្ឃឹម! 💪",
      "បើចាញ់ញឹកពេក ទៅរៀនថែមសិនទៅ! 📚"
    ];
    
    const list = isWinner ? winMessages : loseMessages;
    // Simple way to get a stable message for the current game result
    // We use the roomId and the status to help keep it stable during the same result
    const seed = (roomId || "").length + (gameState.scores.X + gameState.scores.O);
    return list[seed % list.length];
  }, [gameState, playerSymbol, roomId]);

  return (
    <div className="min-h-screen flex flex-col p-4 sm:p-6 w-full bg-slate-950 text-slate-200 selection:bg-sky-500/30">
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
        <div className="flex-1 flex items-center justify-center max-w-4xl mx-auto w-full">
          <Lobby onCreateRoom={handleCreate} onJoinRoom={handleJoin} loading={loading} />
        </div>
      ) : (
        <div className="max-w-[1400px] mx-auto w-full flex-1 flex flex-col">
          {/* Header */}
          <header className="flex flex-col lg:flex-row justify-between items-center gap-6 mb-8">
            <div className="flex items-center gap-4 w-full lg:w-auto">
              <button 
                onClick={handleLeave}
                className="p-3 bg-slate-900 border border-slate-800 rounded-xl hover:text-pink-500 transition-colors"
                title="Leave Game"
                id="btn-leave-game"
              >
                <LogOut className="w-5 h-5" />
              </button>
              <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
                <h1 className="text-4xl sm:text-5xl font-black tracking-tighter italic" id="app-title">
                  TicTac<span className="text-sky-400 font-black">Toe</span> 🇰🇭
                </h1>
                <div className="flex items-center justify-center sm:justify-start gap-2 px-3 py-1 bg-slate-800/40 rounded-full border border-slate-700/50 text-[10px] mt-2">
                   <span className="text-slate-400 font-medium tracking-wider">GOMOKU 15x15</span>
                   <span className="text-slate-700">|</span>
                   <span className="text-sky-400/80 font-bold uppercase tracking-tight">5 in a row wins</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-4 w-full lg:w-auto">
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl w-full md:w-auto justify-center">
                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">ROOM ID:</span>
                <span className="text-lg font-mono font-bold tracking-tighter text-white">{roomId}</span>
                <button onClick={copyRoomId} className="ml-2 p-1 hover:text-sky-400 text-slate-500 transition-colors" title="Copy Code">
                  <Copy className="w-4 h-4" />
                </button>
              </div>

              <div className="flex gap-2 bg-slate-900/50 border border-slate-800 p-1 rounded-2xl w-full md:w-auto justify-center">
                <div className={`px-4 py-1.5 rounded-xl flex items-center gap-2 transition-all ${playerSymbol === 'X' ? 'bg-sky-500/10 border border-sky-500/20 text-sky-400' : 'opacity-40'}`}>
                  <div className="w-2 h-2 rounded-full bg-sky-500"></div>
                  <span className="font-bold text-xs">PLAYER X</span>
                </div>
                <div className={`px-4 py-1.5 rounded-xl flex items-center gap-2 transition-all ${playerSymbol === 'O' ? 'bg-pink-500/10 border border-pink-500/20 text-pink-400' : 'opacity-40'}`}>
                  <div className="w-2 h-2 rounded-full bg-pink-500"></div>
                  <span className="font-bold text-xs">PLAYER O</span>
                </div>
              </div>
            </div>
          </header>

          {/* Main Game Area */}
          <main className="flex-1 flex flex-col items-center justify-center gap-6 py-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-4 py-20">
                <RefreshCw className="w-10 h-10 text-sky-400 animate-spin" />
                <p className="text-slate-400 font-medium animate-pulse">កំពុងភ្ជាប់... (Connecting...)</p>
              </div>
            ) : (
              <>
                {/* Score Board & Status */}
                <div className="flex flex-col md:flex-row gap-6 w-full items-center justify-center mb-4">
                  {gameState && (
                    <div className="grid grid-cols-2 gap-3 w-full max-w-[300px]">
                      <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl text-center">
                        <p className="text-slate-500 text-[10px] font-bold uppercase mb-1">X Wins</p>
                        <p className="text-2xl font-bold text-sky-400">{gameState.scores.X}</p>
                      </div>
                      <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl text-center">
                        <p className="text-slate-500 text-[10px] font-bold uppercase mb-1">O Wins</p>
                        <p className="text-2xl font-bold text-pink-400">{gameState.scores.O}</p>
                      </div>
                    </div>
                  )}

                  <div className="min-h-[60px] flex items-center justify-center">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={gameState?.status + (gameState?.turn || '')}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center font-bold tracking-wide"
                      >
                        {gameState?.status === 'waiting' && (
                          <div className="flex flex-col items-center gap-2">
                            <div className="flex items-center gap-3 text-slate-400">
                              <Users className="w-5 h-5 animate-pulse" />
                              <span className="text-lg">កំពុងរង់ចាំដៃគូ...</span>
                            </div>
                          </div>
                        )}
                        {gameState?.status === 'active' && (
                          <div className="flex flex-col items-center gap-1">
                            <div className="px-4 py-1.5 bg-slate-800/80 rounded-full border border-slate-700 shadow-lg mb-2">
                              <span className={`text-sm font-bold ${playerSymbol === 'X' ? 'text-sky-400' : playerSymbol === 'O' ? 'text-pink-400' : 'text-slate-500'}`}>
                                {playerSymbol === 'X' ? "អ្នកគឺជាកីឡាករ X" : playerSymbol === 'O' ? "អ្នកគឺជាកីឡាករ O" : "អ្នកជាអ្នកទស្សនា"}
                              </span>
                            </div>
                            
                            <span className={`text-xl ${gameState.turn === 'X' ? 'text-sky-400' : 'text-pink-400'}`}>
                              {gameState.turn === playerSymbol ? "✨ ដល់វេនអ្នកហើយ" : `រង់ចាំវេន ${gameState.turn}...`}
                            </span>
                          </div>
                        )}
                        {gameState?.status === 'won' && (
                          <div className="flex flex-col items-center gap-4">
                            <span className="text-yellow-400 text-3xl font-black uppercase tracking-widest drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]">
                              {gameState.winner === playerSymbol ? "🏆 អ្នកឈ្នះហើយ! 🏆" : "ដៃគូជាអ្នកឈ្នះ!"}
                            </span>
                            <motion.div 
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              className="px-6 py-4 bg-slate-900/80 border-2 border-yellow-500/30 rounded-2xl shadow-[0_0_30px_rgba(234,179,8,0.15)] max-w-xs"
                            >
                              <p className="text-lg font-bold text-center text-slate-200 leading-relaxed">
                                {getMemeMessage()}
                              </p>
                            </motion.div>
                          </div>
                        )}
                        {gameState?.status === 'draw' && (
                          <span className="text-slate-400 text-2xl uppercase tracking-widest">ស្មើគ្នា! (DRAW)</span>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>

                {/* Game Board Container */}
                <div className="relative w-full flex justify-center items-center z-10 px-2 sm:px-6">
                  <div className="absolute -inset-10 bg-gradient-to-r from-sky-500/5 to-pink-500/5 rounded-full blur-[100px] pointer-events-none"></div>
                  <Board 
                    board={gameState?.board || Array(BOARD_SIZE * BOARD_SIZE).fill('')} 
                    onSquareClick={makeMove}
                    disabled={gameState?.status !== 'active' || gameState.turn !== playerSymbol}
                    winningCombo={winningCombo}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md mt-4">
                  {gameState && (gameState.status === 'won' || gameState.status === 'draw') && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={resetGame}
                      className="w-full py-4 px-8 bg-sky-600 hover:bg-sky-500 text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl"
                    >
                      <RefreshCw className="w-5 h-5" />
                      លេងម្ដងទៀត (Play Again)
                    </motion.button>
                  )}

                  {gameState?.status === 'waiting' && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                         const shareText = `មកលេងហ្គេម Tic Tac Toe ជាមួយខ្ញុំ: ${roomId}\n${window.location.href}`;
                         if (navigator.share) {
                           navigator.share({ title: 'Neon Gomoku', text: shareText, url: window.location.href });
                         } else {
                           copyRoomId();
                         }
                      }}
                      className="w-full py-4 bg-slate-900 border border-slate-800 text-white rounded-2xl flex items-center justify-center gap-3 hover:bg-slate-800 transition-all font-bold"
                    >
                      <Share2 className="w-5 h-5 text-sky-400" />
                      អញ្ជើញមិត្តភក្តិ (Invite Friend)
                    </motion.button>
                  )}
                </div>
              </>
            )}
          </main>

          <footer className="mt-8 py-6 border-t border-slate-900 flex flex-col sm:flex-row justify-between items-center text-slate-600 text-xs gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 shadow-sm animate-pulse"></div>
              Server Region: Asia Southeast
            </div>
            <div className="flex items-center gap-6">
              <span className="font-medium text-slate-500">Supported by Phearoth💖🧑💻</span>
              <div className="flex items-center gap-2">
                <Github className="w-3 h-3" /> Source
              </div>
            </div>
          </footer>
        </div>
      )}
    </div>

  );
}
