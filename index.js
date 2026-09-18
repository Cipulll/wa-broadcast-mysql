const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const waRoutes = require("./routes/wa");
const contactsRoutes = require("./routes/contacts");
const broadcastRoutes = require("./routes/broadcast");
const verifyToken = require("./middleware/auth");

const app = express();

// 1. MIDDLEWARE PARSER (Wajib di paling atas)
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. REGISTER ROUTES API (Wajib SEBELUM static files)
app.use("/api/auth", authRoutes);
app.use("/api/wa", waRoutes);
app.use("/api/contacts", contactsRoutes);
app.use("/api/broadcast", broadcastRoutes);

app.get("/api/profile", verifyToken, (req, res) => {
  res.json({
    message: "Akses berhasil ke data rahasia!",
    userData: req.user,
  });
});

// 3. SAJIKAN FOLDER PUBLIC (Taruh di bagian paling bawah route)
app.use(express.static(path.join(__dirname, "public")));

// 4. JALANKAN SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});
