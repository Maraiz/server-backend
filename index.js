import express from 'express';
import dotenv from 'dotenv';
import db from './config/Database.js';
import cookieParser from 'cookie-parser';
import cors from 'cors';
// import Users from './models/userModel.js';
// import WorkoutSessions from './models/WorkoutSessionModel.js';
import router from './routes/index.js';

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

// List all relevant environment variables
const relevantEnvVars = Object.keys(process.env).filter(key => 
    key.includes('TOKEN') || 
    key.includes('DATABASE') || 
    key.includes('NODE_ENV') ||
    key.includes('FRONTEND')
);
console.log('All relevant env vars found:', relevantEnvVars);
console.log('=====================================');

console.log('ACCESS_TOKEN_SECRET:', process.env.ACCESS_TOKEN_SECRET);
console.log('REFRESH_TOKEN_SECRET:', process.env.REFRESH_TOKEN_SECRET);
console.log('Old env vars check:', Object.keys(process.env).filter(key => key.includes('TOKEN')));

// Database connection with timeout
async function connectDatabase() {
    console.log('Attempting database connection...');
    
    try {
        // Set timeout untuk connection
        const connectionTimeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Database connection timeout (15s)')), 15000)
        );
        
        const dbConnection = db.authenticate();
        
        // Race between connection dan timeout
        await Promise.race([dbConnection, connectionTimeout]);
        
        console.log('✅ Database connected successfully!');
        
        // Sync models - Create tables jika belum ada
        try {
            // await Users.sync();
            // await WorkoutSessions.sync();
            console.log('📋 Models sync completed (uncomment to enable)');
        } catch (syncError) {
            console.error('⚠️  Model sync failed:', syncError.message);
        }
        
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        
        // Jika Railway gagal, bisa fallback ke local (optional)
        if (error.message.includes('timeout') || error.message.includes('ECONNREFUSED')) {
            console.log('⚠️  Railway connection failed, you can try switching to local XAMPP');
            console.log('⚠️  Comment DATABASE_URL in .env to use local database');
        }
        
        return false;
    }
}

// Connect to database
const dbConnected = await connectDatabase();

// CORS configuration
app.use(cors({ 
    credentials: true, 
    origin: process.env.FRONTEND_URL || 'http://localhost:9000'
}));

app.use(cookieParser()); 

// Body parser limits untuk handle gambar base64
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

// Serve static files untuk uploaded images
app.use('/uploads', express.static('uploads'));

// Routes
app.use(router);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        database: dbConnected ? 'Connected' : 'Disconnected'
    });
});

// Database status endpoint
app.get('/db-status', async (req, res) => {
    try {
        await db.authenticate();
        res.json({ status: 'Connected', database: 'Railway' });
    } catch (error) {
        res.status(500).json({ status: 'Error', message: error.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🗄️  Database status: http://localhost:${PORT}/db-status`);
    
    if (!dbConnected) {
        console.log('⚠️  Server started but database not connected');
        console.log('⚠️  Check your Railway connection or switch to local XAMPP');
    }
});