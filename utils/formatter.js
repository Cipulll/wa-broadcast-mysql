/**
 * Memformat nomor HP menjadi format standar whatsapp-web.js (contoh: 628123456789@c.us)
 * @param {string} phone - Nomor telepon mentah
 * @returns {string} Nomor telepon terformat
 */
function formatPhoneNumber(phone) {
  if (!phone) return "";

  // 1. Hapus semua karakter non-angka
  let cleaned = String(phone).replace(/\D/g, "");

  // 2. Ubah awalan '0' menjadi kode negara '62'
  if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.slice(1);
  }

  // 3. Tambahkan suffix @c.us jika belum ada
  if (!cleaned.endsWith("@c.us")) {
    cleaned = `${cleaned}@c.us`;
  }

  return cleaned;
}

module.exports = { formatPhoneNumber };
