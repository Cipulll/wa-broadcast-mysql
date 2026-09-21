const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "wa_engine_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function initDB() {
  try {
    const connection = await pool.getConnection();

    await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

    await connection.query(`
            CREATE TABLE IF NOT EXISTS contacts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                name VARCHAR(100) NOT NULL,
                phone VARCHAR(20) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

    await connection.query(`
            CREATE TABLE IF NOT EXISTS broadcasts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                title VARCHAR(150) NOT NULL,
                message TEXT NOT NULL,
                total_contacts INT DEFAULT 0,
                status ENUM('PENDING', 'PROCESSING', 'COMPLETED') DEFAULT 'PENDING',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

    await connection.query(`
            CREATE TABLE IF NOT EXISTS broadcast_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                broadcast_id INT NOT NULL,
                customer_name VARCHAR(100),
                phone VARCHAR(20) NOT NULL,
                status ENUM('PENDING', 'SUCCESS', 'FAILED') DEFAULT 'PENDING',
                keterangan TEXT,
                sent_at TIMESTAMP NULL,
                FOREIGN KEY (broadcast_id) REFERENCES broadcasts(id) ON DELETE CASCADE
            )
        `);

    console.log("✅ Database MySQL & Seluruh Tabel Multi-User Siap!");
    connection.release();
  } catch (err) {
    console.error("❌ Error Inisialisasi Database:", err.message);
  }
}

initDB();
module.exports = pool;
