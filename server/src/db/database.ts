import path from 'path';
import { GameResult } from '../types/game';

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

// Lazily initialise better-sqlite3 so a missing native binary doesn't crash the server.
let db: import('better-sqlite3').Database | null = null;

try {
  const Database = require('better-sqlite3');
  const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'declare.db');
  db = new Database(dbPath) as import('better-sqlite3').Database;
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
  console.log('[db] SQLite initialised at', process.env.DB_PATH || 'declare.db');
} catch (err) {
  console.warn('[db] SQLite unavailable — stats will not be persisted:', (err as Error).message);
  db = null;
}

export function recordGame(args: {
  roomCode: string;
  multiplier: number;
  winnings: number;
  isTie: boolean;
  winnerName: string | null;
  results: GameResult[];
}): number {
  if (!db) return -1;
  try {
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
        args.roomCode, args.multiplier, args.winnings,
        args.isTie ? 1 : 0, args.winnerName, Date.now(),
      );
      const gameId = info.lastInsertRowid as number;
      for (const r of args.results) {
        const isWinner = !args.isTie && r.playerName === args.winnerName ? 1 : 0;
        insertPlayer.run(gameId, r.playerName, r.handValue, isWinner);
      }
      return gameId;
    });
    return tx();
  } catch (err) {
    console.error('[db] recordGame failed:', err);
    return -1;
  }
}

export function getPlayerStats(playerName: string): PlayerStats {
  if (!db) return { player_name: playerName, games_played: 0, games_won: 0, avg_hand_value: 0, total_winnings: 0 };
  try {
    const row = db.prepare(
      `SELECT ? AS player_name, COUNT(*) AS games_played, SUM(is_winner) AS games_won,
              AVG(hand_value) AS avg_hand_value
       FROM game_players WHERE player_name = ?`,
    ).get(playerName, playerName) as any;
    const winnings = db.prepare(
      `SELECT COALESCE(SUM(g.winnings), 0) AS total_winnings FROM games g WHERE g.winner_name = ?`,
    ).get(playerName) as any;
    return {
      player_name: playerName,
      games_played: row?.games_played ?? 0,
      games_won: row?.games_won ?? 0,
      avg_hand_value: Number(row?.avg_hand_value ?? 0),
      total_winnings: Number(winnings?.total_winnings ?? 0),
    };
  } catch (err) {
    console.error('[db] getPlayerStats failed:', err);
    return { player_name: playerName, games_played: 0, games_won: 0, avg_hand_value: 0, total_winnings: 0 };
  }
}

export function getRecentGames(limit = 20): SavedGame[] {
  if (!db) return [];
  try {
    return db.prepare(`SELECT * FROM games ORDER BY created_at DESC LIMIT ?`).all(limit) as SavedGame[];
  } catch (err) {
    console.error('[db] getRecentGames failed:', err);
    return [];
  }
}

export default db;
