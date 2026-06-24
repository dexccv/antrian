# Queue Hub - Sistem Informasi Manajemen Antrean Terintegrasi

Queue Hub adalah platform manajemen antrean berbasis web yang dirancang untuk kebutuhan instansi pelayanan mahasiswa (loket BAAK) dan instansi kesehatan (klinik/rumah sakit). Aplikasi ini menerapkan dua konsep struktur data utama secara real-time, yaitu Circular Queue (Antrean Sirkular) dan Single Linked List (Senarai Berantai Tunggal).

Sistem ini diimplementasikan menggunakan React, Vite, dan Tailwind CSS v4, serta disinkronisasikan ke Firebase Cloud Firestore untuk pelacakan data secara real-time dan Firebase Authentication untuk sistem otorisasi multi-peran (Role-Based Access Control).

---

## Fitur Utama

### 1. Layanan Loket Pengambilan KTM (Circular Queue)
Sistem antrean loket pengambilan Kartu Tanda Mahasiswa (KTM) yang menyimulasikan antrean melingkar dengan kapasitas maksimal 100 elemen.
* **Mekanisme Sirkular**: Memanfaatkan rumus modulo untuk memutar indeks antrean secara dinamis guna efisiensi memori.
* **Panggilan Loket**: Petugas dapat memanggil antrean terdepan.
* **Penanganan Kehadiran**: Jika mahasiswa yang dipanggil hadir, data akan dikeluarkan dari antrean (dequeue). Jika mahasiswa absen/belum hadir, data dipindahkan secara melingkar ke urutan paling belakang.
* **Visualisasi Circular Ring**: Representasi visual melingkar yang memperlihatkan pergerakan pointer FRONT dan REAR secara real-time.

### 2. Layanan Antrean Klinik (Single Linked List)
Sistem antrean pasien klinik/rumah sakit berbasis alokasi dinamis.
* **Verifikasi Administrasi Kasir**: Pasien baru berstatus belum bayar. Petugas Kasir dapat memperbarui status pasien menjadi sudah bayar berdasarkan ID registrasi untuk menerbitkan nomor antrean dokter.
* **Penanganan Auto-Skip**: Dokter memanggil pasien terdepan yang sudah lunas. Jika pasien terdepan dipanggil tetapi belum membayar administrasi, sistem secara otomatis memindahkan pasien tersebut ke urutan paling belakang (akhir node linked list).
* **Visualisasi Linked List Chain**: Menampilkan rangkaian node pasien yang terhubung dengan petunjuk arah pointer Next secara interaktif.
* **Pencarian Data**: Mencari data pasien secara real-time berdasarkan ID registrasi unik untuk mengetahui letak antrean.

### 3. Sistem Otorisasi Multi-Peran (RBAC)
Membatasi akses kontrol operasional antrean untuk menjaga integritas data pelayanan:
* **Publik (Tanpa Login)**: Hanya dapat mendaftarkan diri secara mandiri dan memantau monitor visualisasi antrean.
* **Petugas BAAK (baak_officer)**: Mengoperasikan menu panggilan loket KTM sirkular.
* **Kasir Klinik (cashier)**: Mengoperasikan administrasi pembayaran pasien klinik.
* **Dokter Klinik (doctor)**: Mengoperasikan pemanggilan pasien lunas ke ruang periksa.
* **Super Admin (admin)**: Mengoperasikan seluruh panel kontrol, memiliki otorisasi menghapus antrean pasien tertentu (manipulasi node), dan melakukan reset sistem antrean global.

---

## Teknologi

* **Frontend**: React 18, Vite
* **Styling**: Tailwind CSS v4 (Clay Design System - Warm Cream background)
* **Database & Auth**: Firebase Cloud Firestore & Firebase Authentication
* **Offline Mode Support**: Menyediakan fallback otomatis ke LocalStorage jika kredensial Firebase tidak dikonfigurasi, sehingga aplikasi dapat berjalan offline untuk demo.

---

## Konfigurasi Lingkungan (Environment Variables)

Salin berkas konfigurasi Firebase dari Firebase Console Anda ke file `.env` di direktori utama proyek:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

---

## Panduan Instalasi Lokal

1. **Unduh Dependensi**:
   ```bash
   npm install
   ```

2. **Jalankan Aplikasi Mode Development**:
   ```bash
   npm run dev
   ```

3. **Kompilasi Siap Produksi**:
   ```bash
   npm run build
   ```

---

## Struktur Proyek

* `src/firebase.js`: Inisialisasi Firebase Auth & Firestore dengan sistem pendeteksi mode demo.
* `src/dbService.js`: Layer abstraksi database (Firestore & LocalStorage fallback).
* `src/components/KtmQueue.jsx`: Komponen sistem antrean sirkular KTM.
* `src/components/HospitalQueue.jsx`: Komponen sistem antrean linked list Klinik.
* `src/components/Login.jsx`: Halaman autentikasi petugas instansi.
* `src/index.css`: Pengaturan gaya global berbasis variabel desain Clay.
* `vercel.json`: Pengaturan pengalihan rute (redirects) untuk kesiapan deploy ke Vercel.
