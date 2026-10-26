# WA Broadcast MySQL

Aplikasi backend Node.js untuk mengelola user, kontak, koneksi WhatsApp, dan broadcast pesan massal via WhatsApp Web. Project ini menggunakan Express.js, MySQL, JWT, dan `whatsapp-web.js`.

## Fitur Utama

- Registrasi dan login user
- Autentikasi dengan JWT
- Manajemen kontak (tambah manual dan import CSV)
- Koneksi WhatsApp dengan QR Code
- Broadcast pesan ke banyak kontak secara berurutan
- Riwayat broadcast dan log status per kontak
- Retry untuk pesan yang gagal terkirim
- Multi-user basis data per `user_id`

## Stack Teknologi

- Node.js
- Express.js
- MySQL 8+
- `mysql2`
- `whatsapp-web.js`
- `bcrypt`
- `jsonwebtoken`
- `dotenv`
- `multer` dan `csv-parser`

## Struktur Project

- `index.js` – entry point server
- `db.js` – konfigurasi pool MySQL dan inisialisasi tabel
- `whatsapp.js` – konfigurasi client WhatsApp dan status koneksi
- `routes/` – endpoint API untuk auth, contacts, WA, dan broadcast
- `middleware/` – middleware autentikasi JWT
- `utils/` – helper seperti formatter nomor telepon
- `public/` – file frontend statis (jika digunakan)
- `uploads/` – folder upload file CSV saat runtime
- `sessions/` – session WhatsApp Web lokal

## Prasyarat

- Node.js LTS
- MySQL Server aktif
- Browser/OS yang dapat menjalankan Puppeteer/WhatsApp Web
- Akses ke terminal/CLI

## Instalasi

1. Clone repository
2. Masuk ke folder project
3. Install dependency:

```bash
npm install
```

4. Buat file `.env` di root project dan sesuaikan konfigurasi berikut:

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=wa-engine-db
JWT_SECRET=your_super_secret_key
```

5. Pastikan database MySQL sudah dibuat. Jika belum, buat database secara manual:

```sql
CREATE DATABASE wa-engine-db;
```

6. Jalankan aplikasi:

```bash
npm start
```

Untuk mode development dengan auto-reload:

```bash
npm run dev
```

## Endpoint API

### Autentikasi

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`

### WhatsApp

- `GET /api/wa/status`

### Kontak

- `POST /api/contacts/`
- `GET /api/contacts/`
- `DELETE /api/contacts/:id`
- `POST /api/contacts/import`

### Broadcast

- `POST /api/broadcast/send`
- `GET /api/broadcast/history`
- `GET /api/broadcast/detail/:id`
- `POST /api/broadcast/retry-failed/:id`

## Cara Menggunakan

1. Register user baru melalui endpoint `/api/auth/register`.
2. Login dan ambil token JWT.
3. Gunakan token pada header `Authorization` untuk request yang membutuhkan autentikasi.
4. Hubungkan WhatsApp melalui endpoint status WA dan scan QR code yang tampil.
5. Tambahkan kontak atau impor CSV.
6. Buat broadcast dan tunggu proses pengiriman berjalan.

## Catatan Penting

- File `.env` berisi konfigurasi sensitif, jangan di-share secara publik.
- Folder `sessions/` dan `uploads/` dibuat saat runtime.
- Proses broadcast berjalan secara asinkron dan dapat memakan waktu tergantung jumlah kontak dan delay yang dikonfigurasi.

## Lisensi

ISC
