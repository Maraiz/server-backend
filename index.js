import express from 'express';
import dotenv from 'dotenv';
import db from './config/Database.js';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import router from './routes/index.js';
import serverless from 'serverless-http';

// Load environment variables
dotenv.config();

const app = express();

// === ENVIRONMENT DEBUG ===
console.log('=== ENVIRONMENT VARIABLES DEBUG ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('DATABASE_URL preview:', process.env.DATABASE_URL?.substring(0, 40) + '...');
console.log('ACCESS_TOKEN_SECRET exists:', !!process.env.ACCESS_TOKEN_SECRET);
console.log('REFRESH_TOKEN_SECRET exists:', !!process.env.REFRESH_TOKEN_SECRET);
console.log('FRONTEND_URL:', process.env.FRONTEND_URL);

const relevantEnvVars = Object.keys(process.env).filter(key =>
  key.includes('TOKEN') ||
  key.includes('DATABASE') ||
  key.includes('NODE_ENV') ||
  key.includes('FRONTEND')
);
console.log('All relevant env vars found:', relevantEnvVars);
console.log('=====================================');

// Database connection with timeout
async function connectDatabase() {
  console.log('Attempting database connection...');

  try {
    const connectionTimeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database connection timeout (15s)')), 15000)
    );

    const dbConnection = db.authenticate();
    await Promise.race([dbConnection, connectionTimeout]);

    console.log('✅ Database connected successfully!');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);

    if (error.message.includes('timeout') || error.message.includes('ECONNREFUSED')) {
      console.log('⚠️  Railway connection failed, you can try switching to local XAMPP');
      console.log('⚠️  Comment DATABASE_URL in .env to use local database');
    }

    return false;
  }
}

const dbConnected = await connectDatabase();

// Middlewares
app.use(cors({
  credentials: true,
  origin: process.env.FRONTEND_URL || 'http://localhost:9000'
}));

app.use(cookieParser());

app.use(express.json({
  limit: '4mb',
  parameterLimit: 100000,
  extended: true
}));

app.use(express.urlencoded({
  limit: '4mb',
  parameterLimit: 100000,
  extended: true
}));

// Static files
app.use('/uploads', express.static('uploads'));

// Routes
app.use(router);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    database: dbConnected ? 'Connected' : 'Disconnected'
  });
});

// DB check
app.get('/db-status', async (req, res) => {
  try {
    await db.authenticate();
    res.json({ status: 'Connected', database: 'Railway' });
  } catch (error) {
    res.status(500).json({ status: 'Error', message: error.message });
  }
});

// ✅ Penting: Export app untuk Vercel
export const handler = serverless(app);
