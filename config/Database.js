import { Sequelize } from "sequelize";
import dotenv from 'dotenv';

// Load environment variables di Database.js juga
dotenv.config();

// Debug environment variables (setelah dotenv load)
console.log('🔧 Database.js - Environment Check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('DATABASE_URL preview:', process.env.DATABASE_URL?.substring(0, 30) + '...');

const isProduction = process.env.NODE_ENV === 'production';
const useRailway = process.env.DATABASE_URL && process.env.DATABASE_URL.includes('railway');

console.log('Using production config:', isProduction);
console.log('Use Railway database:', useRailway);

let db;

if (useRailway) {
    // RAILWAY: MySQL (baik development maupun production)
    console.log('🚀 Connecting to Railway database...');
    db = new Sequelize(process.env.DATABASE_URL, {
        dialect: 'mysql',
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        },
        logging: false
    });
} else {
    // LOCAL: XAMPP
    console.log('🏠 Connecting to local XAMPP database...');
    db = new Sequelize('capstone_projects', 'root', '', {
        host: 'localhost',
        dialect: 'mysql'
    });
}

export default db;