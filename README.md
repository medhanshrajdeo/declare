# Declare — Multiplayer Card Game

A full-stack web implementation of **Declare**, a 2-4 player card game.

- **Server:** Node.js + Express + Socket.io + SQLite (`server/`)
- **Client:** React + TypeScript + Tailwind CSS + Zustand (`client/`)
- Game state is authoritative on the backend; clients receive per-player public state.

## Game Rules (Quick Reference)

- Card values: A=1, 2-10 face, J=11, Q=12, K=13.
- Each turn you **must** discard at least 1 card. Discards can be:
  - A single card
  - 2-4 cards of the **same rank**
  - 3+ cards of the **same suit** in **sequential** rank (no wrap-around: K-A-2 is invalid)
- After discarding, you draw 1 card from the deck.
- When your hand value is ≤5, you may **Declare** at the start of your turn. All other players get exactly one final turn.
- Winner = lowest hand total after the final round. Ties = no winner.
- Winnings = (max hand − min hand) × multiplier (default 10, set via `MULTIPLIER` env var).

## Local Setup

Requires Node.js 18+.

### 1. Start the server (port 5000)

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

The server runs at `http://localhost:5000`. It will create a `declare.db` SQLite file in the working directory on first run.

### 2. Start the client (port 3000)

In a second terminal:

```bash
cd client
cp .env.example .env
npm install
npm run dev
```

The web app runs at `http://localhost:3000`.

### 3. Play

- Open `http://localhost:3000` in two or more browser tabs/windows (or different devices on your LAN).
- Player 1: enter name → **Create Room** → share the room code shown.
- Player 2-4: enter name → **Join Room** → enter the code.
- Host clicks **Start Game** once 2-4 players are present.

## Environment Variables

### server/.env

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 5000 | HTTP / socket port |
| `CLIENT_URL` | http://localhost:3000 | CORS allowed origin |
| `DB_PATH` | ./declare.db | SQLite database file |
| `MULTIPLIER` | 10 | Winnings multiplier |

### client/.env

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_SERVER_URL` | http://localhost:5000 | Server URL for socket connection |

## Project Layout

```
declare/
├── server/
│   └── src/
│       ├── game/          ← deck, validation, room state machine
│       ├── socket/        ← Socket.io event handlers
│       ├── db/            ← SQLite stats persistence
│       └── index.ts       ← Express + Socket.io entry
└── client/
    └── src/
        ├── components/    ← Card, PlayerHand, GameBoard, etc.
        ├── store/         ← Zustand store (state, selection, theme)
        ├── socket/        ← Socket.io client wrapper
        └── App.tsx
```

## Socket.io Events

Client → Server:
- `create-room { name }` → `{ roomCode, playerId }`
- `join-room { name, roomCode }` → `{ roomCode, playerId }`
- `start-game` → host only
- `discard { cardIds }`
- `draw`
- `declare`
- `reset-game` → host, after game ends
- `leave-room`
- `get-stats { name }` → `{ stats, recent }`

Server → Client:
- `state` → full public game state for this viewer
- `error-message { message }` → transient error to display

## Features

- 2-4 player multiplayer with unique room codes
- Real-time state sync via Socket.io
- Mobile-responsive Tailwind UI with dark/light theme
- Card animations, turn indicator, declare button, game log
- Winner screen with monetization breakdown
- Player stats stored in SQLite (games won, avg hand value, total winnings)
- Disconnect/reconnect handling (rejoin with same name)
- Validation: turn order, discard rules, declare threshold

## Testing Tips

- The server console logs every connect/disconnect.
- Two browser tabs work fine for testing 2 players.
- Use `GET http://localhost:5000/api/recent-games` to view persisted history.
- Use `GET http://localhost:5000/api/stats/<name>` to view a player's stats.
- For LAN play, set `VITE_SERVER_URL=http://<your-lan-ip>:5000` and `CLIENT_URL=http://<your-lan-ip>:3000` and bind devices to the same network.
