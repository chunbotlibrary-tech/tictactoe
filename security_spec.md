# Security Spec: Neon Multiplayer Tic Tac Toe

## 1. Data Invariants
- `rooms/{roomId}`:
    - `board`: Exactly 9 strings. Each string must be "X", "O", or "".
    - `turn`: Must be "X" or "O".
    - `status`: One of "waiting", "active", "won", "draw".
    - `players`: Must have "X" (creator) and optionally "O" (joiner).
    - `scores`: Map of "X" and "O" as positive integers.
    - `winner`: Null or one of the player UIDs.

## 2. Access Control Logic
- **Create**: Any authenticated user can create a room. Creator is assigned to `players.X`.
- **Join**: Any authenticated user can join as `players.O` IF the room is in "waiting" status and `players.O` is not set.
- **Move**:
    - Only identified players in the room can move.
    - Only `players[turn]` can move.
    - Must modify exactly 1 board cell from "" to their symbol.
    - Must update `turn` and `status` based on game logic.
    - Must update `scores` if winning.
- **Read**: Any authenticated user can read a room (to join).

## 3. The Dirty Dozen (Test Cases)
1. User A moves into a slot already occupied by User B. (DENY)
2. User B moves when it's User A's turn. (DENY)
3. User C (not in room) moves. (DENY)
4. User A joins as player O when player O already exists. (DENY)
5. User A resets the game while it's active. (DENY - only on win/draw)
6. User A sets their score to 100 manually. (DENY)
7. User A sets themselves as winner without a line. (DENY - enforced by schema)
8. User A changes `players.X` to someone else. (DENY)
9. User A creates a board with 10 slots. (DENY)
10. User A moves to slot -1 or 9. (DENY)
11. User A sends a string 1MB long in a field. (DENY)
12. User A deletes the room. (DENY - currently no UI for delete)
