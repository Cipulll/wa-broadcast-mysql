const express = require("express");
const router = express.Router();
const pool = require("../db");
const verifyToken = require("../middleware/auth");
// --- PERBAIKAN SUDAH BENAR DI SINI ---
const { formatPhoneNumber } = require("../utils/formatter");
// -------------------------------------
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");

router.use(verifyToken);
const upload = multer({ dest: "uploads/" });

// 1. TAMBAH KONTAK MANUALLY
router.post("/", async (req, res) => {
  const { name, phone } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ message: "Nama dan Nomor HP wajib diisi!" });
  }

  // Proteksi jika user session tidak terbaca
  if (!req.user || !req.user.id) {
    return res
      .status(401)
      .json({ message: "Sesi tidak valid, silakan login ulang." });
  }

  try {
    // --- PERBAIKAN SUDAH BENAR DI SINI ---
    const formattedPhone = formatPhoneNumber(phone);
    // -------------------------------------
    const [result] = await pool.execute(
      "INSERT INTO contacts (user_id, name, phone) VALUES (?, ?, ?)",
      [req.user.id, name, formattedPhone],
    );
    res
      .status(201)
      .json({ message: "Kontak berhasil disimpan", id: result.insertId });
  } catch (err) {
    console.error("Error Tambah Kontak:", err.message);
    res.status(500).json({ message: "Gagal menyimpan kontak: " + err.message });
  }
});

// 2. TAMPILKAN DAFTAR KONTAK USER
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM contacts WHERE user_id = ? ORDER BY id DESC",
      [req.user.id],
    );
    res.json({ data: rows });
  } catch (err) {
    console.error("Error Get Kontak:", err.message);
    res.status(500).json({ message: "Gagal memuat kontak: " + err.message });
  }
});

// 3. HAPUS KONTAK
router.delete("/:id", async (req, res) => {
  try {
    const [result] = await pool.execute(
      "DELETE FROM contacts WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id],
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "Kontak tidak ditemukan atau bukan milik Anda" });
    }
    res.json({ message: "Kontak berhasil dihapus" });
  } catch (err) {
    console.error("Error Hapus Kontak:", err.message);
    res.status(500).json({ message: "Gagal menghapus kontak: " + err.message });
  }
});

// 4. IMPORT KONTAK VIA CSV
router.post("/import", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "File CSV wajib diunggah!" });
  }

  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on("data", (data) => results.push(data))
    .on("end", async () => {
      try {
        let count = 0;
        for (const row of results) {
          const name = row.name || row.Nama || row.NAMA;
          const phone = row.phone || row.Phone || row.Nomor || row.NOMOR;

          if (name && phone) {
            // --- PERBAIKAN SUDAH BENAR DI SINI ---
            const formattedPhone = formatPhoneNumber(phone);
            // -------------------------------------
            await pool.execute(
              "INSERT INTO contacts (user_id, name, phone) VALUES (?, ?, ?)",
              [req.user.id, name, formattedPhone],
            );
            count++;
          }
        }

        fs.unlinkSync(req.file.path);
        res.json({ message: `Berhasil mengimpor ${count} kontak.` });
      } catch (err) {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        console.error("Error Import Kontak:", err.message);
        res
          .status(500)
          .json({ message: "Gagal mengimpor kontak: " + err.message });
      }
    });
});

module.exports = router;
