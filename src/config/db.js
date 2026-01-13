// file: src/config/db.js
const mysql = require('mysql2/promise');
require('dotenv').config();

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    
    // TAMBAHKAN BARIS INI! 
    // Ini memaksa MySQL mengembalikan tanggal sebagai string "YYYY-MM-DD"
    // Bukan sebagai objek Date yang rawan bergeser waktu.
    dateStrings: true 
});

module.exports = db;