const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt"); // TAMBAHAN: wajib import bcrypt
const pool = require("../db");
const verifyToken = require("../middleware/auth");

// Register
router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username dan Password wajib diisi" });
    }

    // Cek apakah username sudah dipakai
    const [existingUser] = await pool.execute(
      "SELECT id FROM users WHERE username = ?",
      [username],
    );

    if (existingUser.length > 0) {
      return res.status(400).json({ message: "Username sudah terdaftar!" });
    }

    // Hash password sebelum disimpan ke database
    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.execute(
      "INSERT INTO users (username, password) VALUES (?, ?)",
      [username, hashedPassword],
    );

    res
      .status(201)
      .json({ message: "User berhasil dibuat", userId: result.insertId });
  } catch (err) {
    console.error("Error Register:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const [users] = await pool.execute(
      "SELECT * FROM users WHERE username = ?",
      [username],
    );
    if (users.length === 0)
      return res.status(400).json({ message: "User tidak ditemukan" });

    const user = users[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword)
      return res.status(400).json({ message: "Password salah" });

    // Sign JWT Token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET || "secretkey",
      { expiresIn: "1d" },
    );

    res.json({ message: "Login berhasil", token });
  } catch (err) {
    console.error("Error Login:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// Logout
router.post("/logout", verifyToken, (req, res) => {
  res.json({ message: "Logout berhasil. Silakan hapus token dari client." });
});

module.exports = router;
