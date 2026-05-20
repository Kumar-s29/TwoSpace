// backend/server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');
const postRoutes = require('./routes/posts');
const notifRoutes = require('./routes/notifications');
const journalRoutes = require('./routes/journal');

connectDB();

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
app.use(express.json());

// Attach io to every request so routes can emit events
app.use((req, res, next) => { req.io = io; next(); });

const authLimiter = rateLimit({ windowMs: 15*60*1000, max: 10 });
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/notifications', notifRoutes);
app.use('/api/journal', journalRoutes);

// Start timed wish unlock scheduler
require('./utils/scheduler')(io);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));

