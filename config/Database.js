import 'mysql2';
console.log('✅ mysql2 is available');

import { Sequelize } from "sequelize";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Hanya log di development, tidak di production
const isDev = process.env.NODE_ENV !== 'production';
const isProduction = process.env.NODE_ENV === 'production';
const useRailway = process.env.DATABASE_URL && process.env.DATABASE_URL.includes('railway');

if (isDev) {
    console.log('🔧 Database.js - Environment Check:');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
    console.log('Use Railway database:', useRailway);
}

let db;

if (useRailway || process.env.DATABASE_URL) {
    // RAILWAY/PRODUCTION: MySQL
    if (isDev) console.log('🚀 Connecting to Railway database...');
    
    db = new Sequelize(process.env.DATABASE_URL, {
        dialect: 'mysql',
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            },
            connectTimeout: 60000,
        },
        pool: {
            max: 2,
            min: 0,
            acquire: 30000,
            idle: 10000,
            evict: 15000,
            handleDisconnects: true
        },
        logging: isDev ? console.log : false,
        retry: {
            match: [
                /ConnectionError/,
                /ConnectionRefusedError/,
                /ConnectionTimedOutError/,
                /TimeoutError/,
                /SequelizeConnectionError/,
                /SequelizeConnectionRefusedError/,
                /SequelizeHostNotFoundError/,
                /SequelizeHostNotReachableError/,
                /SequelizeInvalidConnectionError/,
                /SequelizeConnectionTimedOutError/
            ],
            max: 3
        },
        define: {
            timestamps: true,
            freezeTableName: true
        }
    });
} else {
    // LOCAL: XAMPP
    if (isDev) console.log('🏠 Connecting to local XAMPP database...');
    
    db = new Sequelize('capstone_projects', 'root', '', {
        host: 'localhost',
        dialect: 'mysql',
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        },
        logging: isDev ? console.log : false,
        define: {
            timestamps: true,
            freezeTableName: true
        }
    });
}

// Connection test function (opsional, untuk debugging)
export const testConnection = async () => {
    try {
        await db.authenticate();
        if (isDev) console.log('✅ Database connection established successfully.');
        return true;
    } catch (error) {
        console.error('❌ Unable to connect to the database:', error.message);
        return false;
    }
};

// Graceful shutdown function
export const closeConnection = async () => {
    try {
        await db.close();
        if (isDev) console.log('🔌 Database connection closed.');
    } catch (error) {
        console.error('❌ Error closing database connection:', error.message);
    }
};

export default db;