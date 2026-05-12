import Database from 'better-sqlite3';
import path from 'path';
import { GameResult } from '../types/game';

const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'declare.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_code TEXT NOT NULL,
    multiplier INTEGER NOT NULL,
    winnings INTEGER NOT NULL,
    is_tie INTEGER NOT NULL,
    winner_name TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS game_players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL,
    player_name TEXT NOT NULL,
    hand_value INTEGER NOT NULL,
    is_winner INTEGER NOT NULL,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_game_players_name ON game_players(player_name);
`);

export interface SavedGame {
  id: number;
  room_code: string;
  multiplier: number;
  winnings: number;
  is_tie: number;
  winner_name: string | null;
  created_at: number;
}

export interface PlayerStats {
  player_name: string;
  games_played: number;
  games_won: number;
  avg_hand_value: number;
  total_winnings: number;
}

export function recordGame(args: {
  roomCode: string;
  multiplier: number;
  winnings: number;
  isTie: boolean;
  winnerName: string | null;
  results: GameResult[];
}): number {
  const insertGame = db.prepare(`
    INSERT INTO games (room_code, multiplier, winnings, is_tie, winner_name, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const insertPlayer = db.prepare(`
    INSERT INTO game_players (game_id, player_name, hand_value, is_winner)
    VALUES (?, ?, ?, ?)
  `);

  const tx = db.transaction(() => {
    const info = insertGame.run(
      args.roomCode,
      args.multiplier,
      args.winnings,
      args.isTie ? 1 : 0,
      args.winnerName,
      Date.now(),
    );
    const gameId = info.lastInsertRowid as number;
    for (const r of args.results) {
      const isWinner = !args.isTie && r.playerName === args.winnerName ? 1 : 0;
      insertPlayer.run(gameId, r.playerName, r.handValue, isWinner);
    }
    return gameId;
  });
  return tx();
}

export function getPlayerStats(playerName: string): PlayerStats {
  const row = db
    .prepare(
      `SELECT
        ? AS player_name,
        COUNT(*) AS games_played,
        SUM(is_winner) AS games_won,
        AVG(hand_value) AS avg_hand_value
      FROM game_players WHERE player_name = ?`,
    )
    .get(playerName, playerName) as any;

  const winnings = db
    .prepare(
      `SELECT COALESCE(SUM(g.winnings), 0) AS total_winnings
       FROM games g WHERE g.winner_name = ?`,
    )
    .get(playerName) as any;

  return {
    player_name: playerName,
    games_played: row?.games_played ?? 0,
    games_won: row?.games_won ?? 0,
    avg_hand_value: Number(row?.avg_hand_value ?? 0),
    total_winnings: Number(winnings?.total_winnings ?? 0),
  };
}

export function getRecentGames(limit = 20): SavedGame[] {
  return db
    .prepare(`SELECT * FROM games ORDER BY created_at DESC LIMIT ?`)
    .all(limit) as SavedGame[];
}

export default db;
