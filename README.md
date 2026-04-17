# server-wms

Backend API server untuk sistem **Warehouse Management System (WMS)** berbasis **Node.js** dan **Express.js**. Server ini melayani dua klien: aplikasi **Web** (dashboard admin) dan aplikasi **Mobile** (Android), keduanya terhubung ke basis data **PostgreSQL**.

---

## Daftar Isi

- [Tech Stack](#tech-stack)
- [Struktur Proyek](#struktur-proyek)
- [Konfigurasi Environment](#konfigurasi-environment)
- [Menjalankan Server](#menjalankan-server)
- [Autentikasi](#autentikasi)
- [API Endpoints — Web](#api-endpoints--web)
  - [Info](#info)
  - [Master ATK](#master-atk)
  - [Planogram ATK](#planogram-atk-web)
  - [Stock / Monitoring ATK](#stock--monitoring-atk)
- [API Endpoints — Mobile](#api-endpoints--mobile)
  - [Dashboard ATK](#dashboard-atk)
  - [Produk ATK](#produk-atk)
  - [Opname ATK](#opname-atk)
  - [Planogram ATK](#planogram-atk-mobile)
- [Format Respons API](#format-respons-api)
- [Utilities](#utilities)
- [Logging](#logging)

---

## Tech Stack

| Komponen | Teknologi |
|---|---|
| Runtime | Node.js |
| Framework | Express.js v5 |
| Database | PostgreSQL (via `pg` / node-postgres) |
| Auth | API Key + Kong Gateway header |
| File Upload | Multer |
| CSV Parsing | csv-parser |
| Logging | Winston |
| Env Config | dotenv |

---

## Struktur Proyek

```
server-wms/
├── public/                        # Static files (index.html)
├── logs/                          # Log files (auto-generated)
│   ├── error.log
│   └── combined.log
├── src/
│   ├── app.js                     # Entry point aplikasi
│   ├── config/
│   │   └── db.js                  # Konfigurasi & pool koneksi PostgreSQL
│   ├── middleware/
│   │   ├── authMiddleware.js      # Validasi API Key / Kong header
│   │   ├── corsConfig.js          # Whitelist domain CORS
│   │   └── errorHandler.js        # Global error handler
│   ├── routers/
│   │   ├── web/
│   │   │   ├── index.js           # Router utama Web
│   │   │   ├── app.route.js       # Rute publik (info)
│   │   │   ├── main.route.js      # Rute terproteksi Web
│   │   │   └── modules/
│   │   │       ├── info.route.js
│   │   │       ├── master-atk.route.js
│   │   │       ├── planogram-atk.route.js
│   │   │       └── stock-atk.route.js
│   │   └── mobile/
│   │       ├── index.js           # Router utama Mobile
│   │       ├── main.route.js      # Rute terproteksi Mobile
│   │       └── modules/
│   │           ├── dashboard-atk.route.js
│   │           ├── product-atk.route.js
│   │           ├── opname-atk.route.js
│   │           └── planogram-atk.route.js
│   ├── controllers/
│   │   ├── web/
│   │   │   ├── serverInfoController.js
│   │   │   ├── masterATKController.js
│   │   │   ├── planogramATKController.js
│   │   │   └── monitoringATKController.js
│   │   └── mobile/
│   │       ├── productATKController.js
│   │       ├── opnameATKController.js
│   │       └── planogramATKController.js
│   ├── models/
│   │   ├── web/
│   │   │   ├── masterATKModel.js
│   │   │   ├── planogramATKModel.js
│   │   │   └── monitoringATKModel.js
│   │   └── mobile/
│   │       ├── productATKModel.js
│   │       ├── opnameATKModel.js
│   │       └── planogramATKModel.js
│   └── utils/
│       ├── csvParser.js            # Helper parsing file CSV
│       ├── csvValidator.js         # Validasi baris CSV
│       ├── logger.js               # Konfigurasi Winston logger
│       ├── pagination.js           # Helper kalkulasi paginasi
│       ├── response.js             # Standarisasi format respons API
│       └── upload.js               # Konfigurasi Multer (file upload)
├── .env                            # Environment aktif (dari salah satu di bawah)
├── .env.development
├── .env.production
└── package.json
```

---

## Konfigurasi Environment

Buat file `.env` (atau salin dari template yang tersedia):

```env
# Database PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=wms
DB_USER=wms
DB_PASSWORD=your_password

# Opsional — Connection pool
DB_POOL_MAX=10
DB_POOL_MIN=2
DB_IDLE_TIMEOUT=30000
DB_CONNECT_TIMEOUT=2000

# Server
PORT=4100

# Base path API
PATH_API=/api-wms
PATH_API_MOBILE=/api-wmsmobile

# CORS whitelist (pisahkan dengan koma)
CORS_DOMAINS=http://localhost,http://your-frontend-domain

# API Key untuk autentikasi langsung (tanpa Kong)
API_KEY=your_secret_api_key
```

### Switch Environment

```bash
npm run env:dev   # Salin .env.development → .env
npm run env:prod  # Salin .env.production  → .env
```

---

## Menjalankan Server

```bash
# Install dependencies
npm install

# Development (hot-reload dengan nodemon)
npm run dev

# Production
npm start
```

Server berjalan di `http://localhost:PORT` sesuai nilai `PORT` pada `.env`.

---

## Autentikasi

Seluruh endpoint di bawah prefix `/main` dilindungi oleh `authMiddleware`.

| Sumber Request | Header yang Digunakan |
|---|---|
| **Kong API Gateway** | `x-consumer-username` (trusted header dari Kong) |
| **Frontend langsung** | `Authorization: ApiKey <key>`, `x-api-key: <key>`, atau `apikey: <key>` |

Jika API Key tidak valid atau tidak ditemukan, server mengembalikan `401 Unauthorized` atau `403 Forbidden`.

---

## API Endpoints — Web

Base URL: `{HOST}/api-wms`

### Info

> Endpoint publik, tidak memerlukan autentikasi.

| Method | Path | Deskripsi |
|---|---|---|
| `GET` | `/app/info` | Informasi server (versi, status) |

---

### Master ATK

> Base: `/main/atk/master` — Semua endpoint menerima `POST` dan dilindungi autentikasi.

| Method | Path | Deskripsi |
|---|---|---|
| `POST` | `/produk` | Ambil daftar produk ATK (dengan filter & paginasi) |
| `POST` | `/supplier` | Ambil daftar supplier ATK (dengan filter & paginasi) |
| `POST` | `/stock` | Ambil daftar stok ATK (dengan filter & paginasi) |
| `POST` | `/upload/produk` | Upload data produk via file CSV |
| `POST` | `/upload/supplier` | Upload data supplier via file CSV |
| `POST` | `/upload/stock` | Upload data stok via file CSV |

**Catatan upload:**
- Gunakan `multipart/form-data` dengan field `file`.
- Batasan ukuran file: **10 MB**.
- Hanya file CSV yang diizinkan.

---

### Planogram ATK (Web)

> Base: `/main/atk/planogram`

| Method | Path | Deskripsi |
|---|---|---|
| `GET` | `/types` | Ambil daftar tipe planogram |
| `GET` | `/masters` | Ambil daftar master planogram |
| `POST` | `/masters` | Buat master planogram baru |
| `PUT` | `/masters/:id` | Update master planogram berdasarkan ID |
| `DELETE` | `/masters/:id` | Hapus master planogram berdasarkan ID |
| `GET` | `/lines` | Ambil daftar line planogram |
| `POST` | `/lines` | Buat line planogram baru (single, JSON body) |
| `PUT` | `/lines/:id` | Update line planogram berdasarkan ID |
| `DELETE` | `/lines/:id` | Hapus line planogram berdasarkan ID |
| `POST` | `/lines/bulk` | Bulk insert line planogram via CSV upload **atau** JSON array |

**Catatan `/lines/bulk`:**
- Jika `Content-Type: multipart/form-data` → upload CSV dengan field `file`.
- Jika `Content-Type: application/json` → kirim array JSON langsung di body.

---

### Stock / Monitoring ATK

> Base: `/main/atk/stocks`

| Method | Path | Deskripsi |
|---|---|---|
| `GET` | `/` | Daftar stok dengan filter & paginasi |
| `GET` | `/export` | Seluruh data stok tanpa paginasi (untuk export Excel) |

---

## API Endpoints — Mobile

Base URL: `{HOST}/api-wmsmobile`

> Semua endpoint mobile berada di bawah `/main` dan dilindungi autentikasi.

---

### Dashboard ATK

> Base: `/main/atk/dashboard`

| Method | Path | Deskripsi |
|---|---|---|
| `GET` | `/summary` | Ringkasan statistik opname untuk dashboard mobile |

---

### Produk ATK

> Base: `/main/atk/products`

| Method | Path | Deskripsi |
|---|---|---|
| `GET` | `/` | Daftar semua produk ATK |
| `GET` | `/categories` | Daftar kategori produk |
| `GET` | `/:prdcd` | Detail produk berdasarkan kode produk |

---

### Opname ATK

> Base: `/main/atk/opname`

| Method | Path | Deskripsi |
|---|---|---|
| `POST` | `/item` | Simpan/update qty opname (upsert ke history & sinkron ke storage planogram) |
| `GET` | `/items/:id_plano` | Detail lokasi + daftar item opname di lokasi tersebut |
| `PUT` | `/item/:itemId` | Update item opname berdasarkan ID |
| `DELETE` | `/item/:itemId` | Hapus item opname berdasarkan ID |
| `GET` | `/by-product/:prdcd` | Daftar planogram yang terpasang produk tertentu beserta detail storage |
| `DELETE` | `/clear-plano/:id_plano` | Kosongkan semua storage di lokasi planogram tertentu |

---

### Planogram ATK (Mobile)

> Base: `/main/atk/planogram`

| Method | Path | Deskripsi |
|---|---|---|
| `GET` | `/` | Daftar semua master planogram |
| `GET` | `/:id` | Detail master planogram + daftar lines |
| `GET` | `/search?q=` | Cari lokasi planogram berdasarkan teks bebas (LINE, RAK, SHELF, CELL) |
| `GET` | `/types` | Daftar tipe planogram |
| `GET` | `/address?master_id=&rack=&shelf=&cell=&loc=` | Cari berdasarkan alamat lengkap |
| `GET` | `/line/:id` | Detail lokasi line + storage |
| `POST` | `/storage` | Upsert storage produk ke lokasi planogram |
| `DELETE` | `/storage/:id` | Hapus storage produk dari planogram |

---

## Format Respons API

Semua respons mengikuti struktur standar berikut:

**Sukses:**
```json
{
  "status": "success",
  "message": "...",
  "data": { ... }
}
```

**Sukses dengan Paginasi:**
```json
{
  "status": "success",
  "message": "...",
  "data": [ ... ],
  "meta": {
    "current_page": 1,
    "per_page": 15,
    "total": 100,
    "last_page": 7
  }
}
```

**Error:**
```json
{
  "status": "error",
  "message": "...",
  "errors": { "field": "pesan" }
}
```

| HTTP Status | Fungsi |
|---|---|
| `200` | OK — sukses |
| `201` | Created — data berhasil dibuat |
| `400` | Bad Request — validasi atau file error |
| `401` | Unauthorized — API Key tidak ditemukan |
| `403` | Forbidden — API Key tidak valid |
| `404` | Not Found |
| `409` | Conflict — data duplikat |
| `422` | Unprocessable Entity — validasi gagal |
| `500` | Internal Server Error |

---

## Utilities

| File | Fungsi |
|---|---|
| `utils/response.js` | Helper fungsi standarisasi respons (`success`, `paginated`, `error`, `notFound`, `created`, dll.) |
| `utils/pagination.js` | Kalkulasi offset, page, limit untuk query paginasi |
| `utils/csvParser.js` | Parsing file CSV yang diupload menjadi array objek |
| `utils/csvValidator.js` | Validasi baris CSV (header, tipe data, field wajib) |
| `utils/upload.js` | Konfigurasi Multer: filter tipe file & batas ukuran (10 MB) |
| `config/db.js` | PostgreSQL connection pool dengan helper `query()`, `withTransaction()`, dan `testConnection()` |

---

## Logging

Logger berbasis **Winston** dengan output ke:

| Transport | Detail |
|---|---|
| Console | Berwarna, format simple untuk development |
| `logs/error.log` | Hanya log level `error` |
| `logs/combined.log` | Semua log (info, warn, error, debug) |

Setiap request HTTP dicatat otomatis (`METHOD PATH`) beserta durasi query database.

---

## Author

**ridwanpurwanto** — [Personal Blog](https://ridwanpurwanto-blog.vercel.app)
