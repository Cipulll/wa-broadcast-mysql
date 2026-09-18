const express = require("express");
const router = express.Router();
const pool = require("../db");
const { client, getStatus } = require("../whatsapp");
const { formatPhoneNumber } = require("../utils/formatter");
const verifyToken = require("../middleware/auth");

router.use(verifyToken);

// Helper Jeda Waktu (Delay)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 1. Buat & Jalankan Broadcast Campaign
router.post("/send", async (req, res) => {
  try {
    if (getStatus() !== "CONNECTED") {
      return res.status(400).json({ message: "WhatsApp belum terhubung!" });
    }

    const { title, message, targets, delay_seconds = 5 } = req.body;

    if (!title || !message || !Array.isArray(targets) || targets.length === 0) {
      return res.status(400).json({ message: "Data broadcast tidak lengkap!" });
    }

    // Ambil ID user dari payload token JWT (middleware verifyToken)
    const userId = req.user ? req.user.id || req.user.userId : null;

    if (!userId) {
      return res
        .status(401)
        .json({ message: "Sesi user tidak valid. Silakan login ulang." });
    }

    // Insert ke tabel broadcasts dengan user_id
    const [broadcastResult] = await pool.execute(
      "INSERT INTO broadcasts (user_id, title, message, total_contacts, status) VALUES (?, ?, ?, ?, ?)",
      [userId, title, message, targets.length, "PROCESSING"],
    );
    const broadcastId = broadcastResult.insertId;

    // Insert ke tabel broadcast_logs
    for (const target of targets) {
      await pool.execute(
        "INSERT INTO broadcast_logs (broadcast_id, customer_name, phone, status) VALUES (?, ?, ?, ?)",
        [broadcastId, target.name || "Customer", target.phone, "PENDING"],
      );
    }

    // Kirim respon balik ke frontend
    res.json({
      message: "Broadcast campaign berhasil dibuat dan sedang diproses",
      broadcast_id: broadcastId,
    });

    // Jalankan pengiriman di background worker
    processBroadcastQueue(broadcastId, message, targets, delay_seconds);
  } catch (err) {
    console.error("Error Send Broadcast:", err);
    res
      .status(500)
      .json({ message: err.message || "Gagal memproses broadcast" });
  }
});

// Async Worker Pengiriman Pesan Bertahap
async function processBroadcastQueue(
  broadcastId,
  rawMessage,
  targets,
  delaySeconds,
) {
  for (const target of targets) {
    let status = "FAILED";
    let keterangan = "";

    try {
      const formattedPhone = formatPhoneNumber(target.phone);

      // Replace variabel dinamis ({name}, {phone})
      let parsedMessage = rawMessage
        .replace(/{name}/g, target.name || "")
        .replace(/{phone}/g, target.phone || "");

      // Kirim via whatsapp-web.js client
      await client.sendMessage(formattedPhone, parsedMessage);
      status = "SUCCESS";
      keterangan = "Pesan berhasil terkirim";
    } catch (err) {
      status = "FAILED";
      keterangan = err.message || "Gagal mengirim pesan";
    }

    // Update status per kontak di DB
    await pool.execute(
      "UPDATE broadcast_logs SET status = ?, keterangan = ?, sent_at = NOW() WHERE broadcast_id = ? AND phone = ?",
      [status, keterangan, broadcastId, target.phone],
    );

    // Jeda antar pengiriman
    await sleep(delaySeconds * 1000);
  }

  // Update status campaign utama setelah selesai
  await pool.execute(
    "UPDATE broadcasts SET status = 'COMPLETED' WHERE id = ?",
    [broadcastId],
  );
}

// 2. Tampilkan Riwayat Broadcast (Filter berdasarkan user jika perlu)
router.get("/history", async (req, res) => {
  try {
    const userId = req.user ? req.user.id || req.user.userId : null;

    let query = "SELECT * FROM broadcasts ORDER BY id DESC";
    let params = [];

    if (userId) {
      query = "SELECT * FROM broadcasts WHERE user_id = ? ORDER BY id DESC";
      params = [userId];
    }

    const [rows] = await pool.execute(query, params);
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 3. Detail Broadcast & Logs
router.get("/detail/:id", async (req, res) => {
  try {
    const [broadcast] = await pool.execute(
      "SELECT * FROM broadcasts WHERE id = ?",
      [req.params.id],
    );
    const [logs] = await pool.execute(
      "SELECT * FROM broadcast_logs WHERE broadcast_id = ?",
      [req.params.id],
    );

    if (broadcast.length === 0) {
      return res.status(404).json({ message: "Broadcast tidak ditemukan!" });
    }

    res.json({
      broadcast: broadcast[0],
      logs: logs,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 4. Retry Failed (Kirim Ulang Pesan Gagal)
router.post("/retry-failed/:id", async (req, res) => {
  try {
    const broadcastId = req.params.id;

    const [broadcast] = await pool.execute(
      "SELECT * FROM broadcasts WHERE id = ?",
      [broadcastId],
    );
    const [failedLogs] = await pool.execute(
      "SELECT * FROM broadcast_logs WHERE broadcast_id = ? AND status = 'FAILED'",
      [broadcastId],
    );

    if (failedLogs.length === 0) {
      return res
        .status(400)
        .json({ message: "Tidak ada pesan gagal yang perlu dikirim ulang" });
    }

    res.json({
      message: `Memulai pengiriman ulang untuk ${failedLogs.length} pesan gagal`,
    });

    const failedTargets = failedLogs.map((l) => ({
      name: l.customer_name,
      phone: l.phone,
    }));
    processBroadcastQueue(broadcastId, broadcast[0].message, failedTargets, 5);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
