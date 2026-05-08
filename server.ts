import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { nanoid } from "nanoid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    path: "/socket.io/",
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  const PORT = 3000;

  // Game state
  const BOARD_SIZE = 15;
  const WIN_CONDITION = 5;

  const rooms = new Map<string, {
    id: string;
    players: { id: string; name: string; symbol: string; score: number }[];
    board: (string | null)[];
    lastMove: number | null;
    history: { winner: string; time: string; players: { name: string; symbol: string }[] }[];
    turn: string; // socket id
    status: "waiting" | "playing" | "ended";
    winner: string | null; // socket id or "draw"
  }>();

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("create-room", ({ name, symbol }) => {
      const roomId = nanoid(5).toUpperCase();
      const room = {
        id: roomId,
        players: [{ id: socket.id, name, symbol, score: 0 }],
        board: Array(BOARD_SIZE * BOARD_SIZE).fill(null),
        lastMove: null,
        history: [],
        turn: socket.id,
        status: "waiting" as const,
        winner: null,
      };
      rooms.set(roomId, room);
      socket.join(roomId);
      socket.emit("room-created", room);
    });

    socket.on("join-room", ({ roomId, name, symbol }) => {
      const room = rooms.get(roomId.toUpperCase());
      if (!room) {
        return socket.emit("error", "មិនឃើញបន្ទប់នេះទេ (Room not found)");
      }
      if (room.players.length >= 2) {
        return socket.emit("error", "បន្ទប់នេះពេញហើយ (Room is full)");
      }

      // Check for symbol collision
      if (room.players.some(p => p.symbol === symbol)) {
        return socket.emit("error", "រូបសញ្ញានេះត្រូវបានគេយកហើយ (Symbol already taken)");
      }

      room.players.push({ id: socket.id, name, symbol, score: 0 });
      room.status = "playing";
      socket.join(roomId.toUpperCase());
      io.to(roomId.toUpperCase()).emit("room-updated", room);
    });

    socket.on("make-move", ({ roomId, index }) => {
      const room = rooms.get(roomId.toUpperCase());
      if (!room || room.status !== "playing" || room.turn !== socket.id) return;
      if (room.board[index]) return;

      const player = room.players.find(p => p.id === socket.id);
      if (!player) return;

      room.board[index] = player.symbol;
      room.lastMove = index;
      
      const winnerSymbol = checkWinner(room.board, index);
      if (winnerSymbol) {
        room.status = "ended";
        if (winnerSymbol === "draw") {
          room.winner = "draw";
          room.history.push({ 
            winner: "Draw", 
            time: new Date().toLocaleTimeString(), 
            players: room.players.map(p => ({ name: p.name, symbol: p.symbol })) 
          });
        } else {
          room.winner = socket.id;
          player.score += 1;
          room.history.push({ 
            winner: player.name, 
            time: new Date().toLocaleTimeString(), 
            players: room.players.map(p => ({ name: p.name, symbol: p.symbol })) 
          });
        }
      } else {
        room.turn = room.players.find(p => p.id !== socket.id)?.id || socket.id;
      }

      io.to(roomId.toUpperCase()).emit("room-updated", room);
    });

    socket.on("reset-game", (roomId) => {
      const room = rooms.get(roomId.toUpperCase());
      if (!room) return;
      
      room.board = Array(BOARD_SIZE * BOARD_SIZE).fill(null);
      room.lastMove = null;
      room.status = "playing";
      room.winner = null;
      // Switch who starts
      room.turn = room.players[Math.floor(Math.random() * 2)].id;
      
      io.to(roomId.toUpperCase()).emit("room-updated", room);
    });

    socket.on("change-symbol", ({ roomId, symbol }) => {
      const room = rooms.get(roomId.toUpperCase());
      if (!room) return;
      
      const isTaken = room.players.some(p => p.id !== socket.id && p.symbol === symbol);
      if (isTaken) {
        return socket.emit("error", "រូបសញ្ញានេះត្រូវបានគេយកហើយ (Symbol already taken)");
      }

      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        player.symbol = symbol;
        io.to(roomId.toUpperCase()).emit("room-updated", room);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      // Clean up empty rooms or notify other player
      for (const [roomId, room] of rooms.entries()) {
        const playerIndex = room.players.findIndex(p => p.id === socket.id);
        if (playerIndex !== -1) {
          room.players.splice(playerIndex, 1);
          if (room.players.length === 0) {
            rooms.delete(roomId);
          } else {
            room.status = "waiting";
            room.board = Array(BOARD_SIZE * BOARD_SIZE).fill(null);
            io.to(roomId).emit("room-updated", room);
          }
        }
      }
    });
  });

  function checkWinner(board: (string | null)[], lastIndex: number) {
    const symbol = board[lastIndex];
    if (!symbol) return null;

    const r = Math.floor(lastIndex / BOARD_SIZE);
    const c = lastIndex % BOARD_SIZE;

    const directions = [
      [0, 1],  // Horizontal
      [1, 0],  // Vertical
      [1, 1],  // Diagonal \
      [1, -1]  // Diagonal /
    ];

    for (const [dr, dc] of directions) {
      let count = 1;

      // Check one direction
      for (let i = 1; i < WIN_CONDITION; i++) {
        const nr = r + dr * i;
        const nc = c + dc * i;
        if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr * BOARD_SIZE + nc] === symbol) {
          count++;
        } else break;
      }

      // Check opposite direction
      for (let i = 1; i < WIN_CONDITION; i++) {
        const nr = r - dr * i;
        const nc = c - dc * i;
        if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr * BOARD_SIZE + nc] === symbol) {
          count++;
        } else break;
      }

      if (count >= WIN_CONDITION) return symbol;
    }

    if (board.every(cell => cell !== null)) return "draw";
    return null;
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
