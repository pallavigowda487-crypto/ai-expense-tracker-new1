require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');
const expenseRoutes = require('./routes/expenseRoutes');

const app = express();
const PORT = process.env.PORT || 5000;
let mongoMemoryServer;

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/expenses', expenseRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', message: 'AI Expense Tracker backend is running.' });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

async function connectToDatabase() {
  const mongoUri = process.env.MONGODB_URI;

  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
    return;
  } catch (error) {
    const shouldFallback = /localhost|127\.0\.0\.1/.test(mongoUri || '');

    if (!shouldFallback) {
      throw error;
    }

    console.warn('Local MongoDB is not available. Starting an in-memory MongoDB instance for local development.');
    mongoMemoryServer = await MongoMemoryServer.create();
    const fallbackUri = mongoMemoryServer.getUri();
    process.env.MONGODB_URI = fallbackUri;
    await mongoose.connect(fallbackUri);
    console.log('Connected to in-memory MongoDB');
  }
}

async function startServer() {
  try {
    await connectToDatabase();

    const server = app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });

    server.on('error', async (error) => {
      if (error.code === 'EADDRINUSE') {
        console.warn(`Port ${PORT} is already in use. Another server process is running.`);
        if (mongoMemoryServer) {
          await mongoMemoryServer.stop();
        }
        process.exit(0);
        return;
      }

      console.error('Failed to start server:', error);
      process.exit(1);
    });

    process.on('SIGINT', async () => {
      if (mongoMemoryServer) {
        await mongoMemoryServer.stop();
      }
      server.close(() => process.exit(0));
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
