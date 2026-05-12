import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { registerHandlers } from './socket/handlers';
import { getPlayerStats, getRecentGames } from './db/database';

const PORT = Number(process.env.PORT ?? 5000);
const rawClientUrl = process.env.CLIENT_URL ?? 'http://localhost:3000';

// Support "*", a single origin, or comma-separated list
const corsOrigin: string | string[] =
  rawClientUrl === '*' ? '*' : rawClientUrl.split(',').map((s) => s.trim());

const app = express();
app.use(cors({ origin: corsOrigin }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, time: Date.now() });
});

app.get('/api/stats/:name', (req, res) => {
  res.json(getPlayerStats(req.params.name));
});

app.get('/api/recent-games', (_req, res) => {
  res.json(getRecentGames(20));
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: corsOrigin, methods: ['GET', 'POST'] },
});

io.on('connection', (socket) => {
  console.log(`[socket] connected ${socket.id}`);
  registerHandlers(io, socket);
  socket.on('disconnect', () => {
    console.log(`[socket] disconnected ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`Declare server listening on port ${PORT}`);
  console.log(`CORS allowing: ${JSON.stringify(corsOrigin)}`);
});
