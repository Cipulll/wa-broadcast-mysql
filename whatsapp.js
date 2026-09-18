const { Client, LocalAuth } = require("whatsapp-web.js");
const QRCode = require("qrcode");

let qrCodeDataUrl = "";
let connectionStatus = "DISCONNECTED";

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: "./sessions" }),
  puppeteer: {
    headless: true,
    // Parameter wajib agar Puppeteer tidak cepat crash/disconnect
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--disable-gpu",
    ],
  },
});

client.on("qr", async (qr) => {
  connectionStatus = "DISCONNECTED";
  try {
    qrCodeDataUrl = await QRCode.toDataURL(qr);
    console.log("📱 QR Code baru siap! Silakan scan di dashboard.");
  } catch (err) {
    console.error("Gagal generate QR Code:", err.message);
  }
});

client.on("ready", () => {
  connectionStatus = "CONNECTED";
  qrCodeDataUrl = "";
  console.log("✅ WhatsApp Berhasil Terhubung!");
});

client.on("authenticated", () => {
  console.log("🔑 Autentikasi WhatsApp Berhasil!");
});

client.on("auth_failure", (msg) => {
  connectionStatus = "DISCONNECTED";
  console.error("❌ Autentikasi Gagal:", msg);
});

client.on("disconnected", (reason) => {
  connectionStatus = "DISCONNECTED";
  qrCodeDataUrl = "";
  console.log("❌ WhatsApp Terputus. Alasan:", reason);
});

client.initialize();

module.exports = {
  client,
  getStatus: () => connectionStatus,
  getQR: () => qrCodeDataUrl,
};
