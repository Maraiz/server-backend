import express from 'express';
import dotenv from 'dotenv';
import db from './config/Database.js';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import router from './routes/index.js';
import serverless from 'serverless-http';

// Load environment variables
dotenv.config();

console.log('🚀 Starting Express app...');
const app = express();

// === ENVIRONMENT DEBUG ===
console.log('=== ENVIRONMENT VARIABLES DEBUG ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('DATABASE_URL preview:', process.env.DATABASE_URL?.substring(0, 40) + '...');
console.log('ACCESS_TOKEN_SECRET exists:', !!process.env.ACCESS_TOKEN_SECRET);
console.log('REFRESH_TOKEN_SECRET exists:', !!process.env.REFRESH_TOKEN_SECRET);
console.log('FRONTEND_URL:', process.env.FRONTEND_URL);

// Database connection function (tidak dipanggil di startup)
async function connectDatabase() {
  console.log('Attempting database connection...');

  try {
    const connectionTimeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database connection timeout (10s)')), 10000)
    );

    const dbConnection = db.authenticate();
    await Promise.race([dbConnection, connectionTimeout]);

    console.log('✅ Database connected successfully!');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

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

// Health check dengan lazy database connection
app.get('/health', async (req, res) => {
  try {
    const dbConnected = await connectDatabase();
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      database: dbConnected ? 'Connected' : 'Disconnected'
    });
  } catch (error) {
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      database: 'Error',
      error: error.message
    });
  }
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

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    message: 'Endpoint not found',
    path: req.path
  });
});

// ✅ Export untuk Vercel
export default serverless(app);

// ✅ Juga export app untuk development
export { app };

// 🚀 Development server startup
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
    console.log(`📊 DB status: http://localhost:${PORT}/db-status`);
  });
}