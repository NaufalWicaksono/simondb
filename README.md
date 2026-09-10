# 🚀 SiMonDB — Self-Service Operations & Data Analytics Platform

Platform monitoring dan analitik operasional terpadu yang dirancang untuk **menjembatani kebutuhan tim administrasi dan tim teknisi**. 

Dengan platform ini, tim administrasi dapat melakukan eksplorasi data, melihat visualisasi analitik, serta mengekspor laporan secara mandiri melalui web tanpa perlu meminta bantuan atau mengajukan tiket query manual ke tim teknisi/database administrator.

---

## 🎯 Latar Belakang & Tujuan

Dalam alur kerja operasional, tim administrasi sering kali membutuhkan data terbaru untuk rekapitulasi, evaluasi wilayah, atau laporan berkala. Sebelumnya, proses ini memerlukan tim teknisi untuk menuliskan query database ad-hoc secara manual setiap kali ada permintaan data.

**SiMonDB hadir sebagai solusi *Self-Service Data Platform*:**
- ⏱️ **Efisiensi Waktu**: Tim administrasi dapat langsung mengakses dan memfilter data yang dibutuhkan dalam hitungan detik.
- 📉 **Mengurangi Beban Kerja Teknisi**: Tim teknisi tidak lagi terbebani oleh permintaan query berulang dan dapat berfokus pada pengembangan sistem inti.
- 📊 **Visualisasi Intuitif**: Penyajian data tidak hanya berbentuk tabel mentah, melainkan grafik interaktif (Bar, Line, Donut) serta peta sebaran fasilitas di 38 provinsi.
- 📥 **Ekspor Mandiri**: Fitur download ke format Excel (.xlsx) dan CSV dengan pemilihan kolom kustom yang fleksibel.

---

## ✨ Fitur Utama

1. **Dynamic Query Builder & Data Explorer**:
   - Filter bertingkat (*cascading filters*) yang mudah digunakan tanpa perlu pemahaman SQL.
   - Pilihan agregasi dinamis (`COUNT`, `SUM`, `AVG`).
   - Visualisasi grafik interaktif (Bar Chart, Line Chart, Pie/Donut Chart) dan tabel data.
   - Ekspor visualisasi ke gambar PNG atau file CSV.

2. **Interactive Geo-Spatial Map**:
   - Pemetaan sebaran fasilitas hub dan rantai distribusi di 38 provinsi di seluruh Indonesia.
   - Fitur clustering marker interaktif dan peralihan gaya peta (Street View & Satellite).

3. **Self-Service Data Warehouse Export**:
   - Tim administrasi dapat mengunduh dataset lengkap atau terfilter ke format Excel (`.xlsx`) dan CSV.
   - Pilihan kolom kustom sesuai kebutuhan rekapitulasi.

4. **Multi-Role Access Control & Manajemen Pengguna**:
   - Keamanan berbasis JWT Authentication & Role-Based Access Control (RBAC).
   - Pengelolaan hak akses pengguna (Super Admin, Regional Admin, Analyst).
   - Fitur undangan pendaftaran dengan token (*Invitation Tokens*) dan reset password.

5. **Arsitektur Zero-Config & Siap Dijalankan**:
   - Berjalan langsung tanpa konfigurasi server database eksternal yang rumit.
   - Mendukung container Docker untuk kemudahan deployment.

---

## 🔑 Kredensial Default Login

| Peran (Role) | Email / Username | Password | Hak Akses |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@simondb.demo` *(atau `superadmin`)* | `Admin123!` | Akses Penuh Sistem, Pengguna, & Konfigurasi |
| **Regional Admin** | `admin.ops@simondb.demo` *(atau `regional_admin`)* | `Admin123!` | Manajemen Wilayah, Analisis, & Ekspor Data |
| **Analyst / Viewer** | `analyst@simondb.demo` *(atau `analyst_viewer`)* | `Admin123!` | Akses Read-Only Dashboard & Peta |

---

## 🛠️ Cara Menjalankan Aplikasi

### Opsi 1: Docker Compose (Rekomendasi)
Jalankan perintah berikut di root direktori project:
```bash
docker compose up -d --build
```
- **Aplikasi Web**: [http://localhost:5177](http://localhost:5177)
- **API Docs (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)

Untuk menghentikan:
```bash
docker compose down
```

---

### Opsi 2: One-Click Launcher (Windows)
Cukup jalankan file batch:
```cmd
start_demo.bat
```
Script ini akan otomatis menginisialisasi dependensi dan menjalankan backend FastAPI (port 8000) serta frontend Vite React (port 5177).

---

### Opsi 3: Manual Setup

#### 1. Backend (FastAPI + Python)
```bash
cd backend

# Buat virtual environment (opsional tapi disarankan)
python -m venv venv
venv\Scripts\activate  # Windows (atau source venv/bin/activate di Linux/Mac)

# Install dependensi
pip install -r requirements.txt

# Inisialisasi & generate data dummy:
python seed_demo_data.py

# Jalankan server API:
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 2. Frontend (React + Vite + Tailwind CSS)
```bash
cd frontend

# Install dependensi:
npm install

# Jalankan server pengembangan:
npm run dev
```
Buka browser di [http://localhost:5173](http://localhost:5173) (atau port yang tertera pada terminal).

---

## 📁 Struktur Direktori

```text
simondb_demo/
├── backend/
│   ├── app/
│   │   ├── core/               # Konfigurasi aplikasi, JWT, & Security
│   │   ├── database/           # Engine database & koneksi
│   │   ├── models/             # SQLAlchemy Models (User, Role, Facility, dll.)
│   │   ├── repositories/       # Data Access Layer
│   │   ├── routers/            # API Endpoints (Auth, Visualisasi, Export, dll.)
│   │   ├── schemas/            # Pydantic Schemas & Validasi
│   │   ├── services/           # Business Logic Layer
│   │   └── main.py             # FastAPI App Entry Point
│   ├── simondb.sqlite          # Database Standalone
│   ├── seed_demo_data.py       # Generator Data Dummy Realistis
│   ├── requirements.txt        # Dependensi Python
│   └── run_backend.bat         # Runner Backend Windows
├── frontend/
│   ├── src/
│   │   ├── components/         # Komponen UI, Peta (Leaflet), Cascading Filter
│   │   ├── context/            # AuthContext & State Management
│   │   ├── pages/              # Dashboard, Fasilitas Operasional, Ekspor, Auth
│   │   ├── services/           # HTTP API Services
│   │   └── App.jsx             # Routing Aplikasi
│   ├── package.json
│   ├── vite.config.js
│   └── run_frontend.bat        # Runner Frontend Windows
├── docker-compose.yml          # Konfigurasi Docker Multi-Container
├── start_demo.bat              # Launcher Satu-Klik Semua Servis
└── README.md
```

---

## 🔒 Catatan Keamanan
Projek ini menggunakan data dummy mandiri dan aman untuk dipublikasikan ke GitHub publik tanpa mengandung data atau kredensial rahasia instansi manapun.
