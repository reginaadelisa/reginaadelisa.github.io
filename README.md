# Portofolio Regina Adelisa

Website portofolio profesional berbasis GitHub Pages dengan sistem manajemen konten menggunakan **Pages CMS**.

---

## Daftar Isi

1. [Struktur Folder dan File](#struktur-folder-dan-file)
2. [Cara Menjalankan Website Secara Lokal](#cara-menjalankan-website-secara-lokal)
3. [Cara Menghubungkan Pages CMS ke Repository](#cara-menghubungkan-pages-cms-ke-repository)
4. [Alur Penggunaan Pages CMS](#alur-penggunaan-pages-cms)
5. [Cara Mengelola Konten](#cara-mengelola-konten)
6. [Cara Mengunggah Foto, Galeri, dan Dokumen](#cara-mengunggah-foto-galeri-dan-dokumen)
7. [Cara Menambahkan Video YouTube](#cara-menambahkan-video-youtube)
8. [Cara Memperbarui Website](#cara-memperbarui-website)
9. [Pemecahan Masalah](#pemecahan-masalah)

---

## Struktur Folder dan File

```
reginaadelisa.github.io/
│
├── index.html              ← Halaman utama website (satu halaman, 10 section)
├── .pages.yml              ← Konfigurasi Pages CMS
├── README.md               ← Panduan penggunaan ini
│
├── assets/
│   ├── css/
│   │   └── style.css       ← Semua tampilan/desain website
│   ├── js/
│   │   └── main.js         ← Logika website, membaca dan menampilkan data JSON
│   ├── images/
│   │   ├── profile/        ← Foto profil
│   │   ├── projects/       ← Thumbnail & galeri proyek
│   │   ├── work/           ← Galeri foto pengalaman kerja
│   │   ├── organizations/  ← Galeri foto kegiatan organisasi
│   │   ├── achievements/   ← Foto dokumentasi prestasi
│   │   └── publications/   ← Foto dokumentasi penelitian
│   ├── certificates/       ← Foto atau PDF sertifikat & pelatihan
│   └── documents/          ← CV dan dokumen lainnya
│
└── content/
    ├── profile/
    │   └── profile.json         ← Profil, hero, tombol CTA
    ├── skills/
    │   └── skills.json          ← Hard skills (3 kategori) + soft skills
    ├── work-experiences/
    │   └── work-experiences.json← Pengalaman kerja + galeri foto
    ├── organizations/
    │   └── organizations.json   ← Pengalaman organisasi + galeri foto
    ├── projects/
    │   └── projects.json        ← Proyek + galeri + semua media
    ├── certificates/
    │   └── certificates.json    ← Sertifikasi
    ├── trainings/
    │   └── trainings.json       ← Pelatihan (terpisah dari sertifikasi)
    ├── achievements/
    │   └── achievements.json    ← Prestasi
    ├── publications/
    │   └── publications.json    ← Publikasi + galeri + video YouTube
    └── contact/
        └── contact.json         ← Kontak
```

**Prinsip kerja:**
- `index.html` adalah kerangka, tidak perlu diedit.
- `main.js` membaca semua JSON dan merender konten secara dinamis.
- Perubahan di Pages CMS → commit ke GitHub → GitHub Pages rebuild → tampil di website (1–3 menit).

---

## Cara Menjalankan Website Secara Lokal

Website menggunakan `fetch()`, sehingga **tidak bisa dibuka langsung dengan klik dua kali `index.html`**.

### Pilihan 1: Python
```bash
python -m http.server 8080
# Buka: http://localhost:8080
```

### Pilihan 2: VS Code Live Server
Instal ekstensi **Live Server** → klik kanan `index.html` → Open with Live Server.

### Pilihan 3: Node.js
```bash
npx serve .
```

---

## Cara Menghubungkan Pages CMS ke Repository

1. Buka [https://app.pagescms.org](https://app.pagescms.org)
2. Klik **Sign in with GitHub** dan izinkan akses.
3. Klik **Add repository** → cari `reginaadelisa/reginaadelisa.github.io` → branch: `main`
4. Izinkan akses → Pages CMS membaca `.pages.yml` otomatis.
5. Semua bagian konten muncul di panel kiri — siap diedit.

---

## Alur Penggunaan Pages CMS

```
Buka app.pagescms.org
    ↓
Login dengan GitHub
    ↓
Pilih repository & branch main
    ↓
Pilih bagian konten (misal: Profil, Projects, dll.)
    ↓
Isi / ubah data → klik Save
    ↓
Pages CMS commit otomatis ke GitHub
    ↓
GitHub Pages rebuild (1–3 menit)
    ↓
Website menampilkan konten terbaru
```

---

## Cara Mengelola Konten

### Profil & Beranda
- **Profil & Beranda** di Pages CMS
- Isi: nama, headline, pendidikan, kalimat perkenalan, deskripsi, tagline, foto profil, CV
- Isi label dan link **Tombol Utama** (misal: "Unduh CV" → path CV) dan **Tombol Kedua** (misal: "Hubungi Saya" → `#kontak`)
- Tombol akan disembunyikan otomatis jika label atau link masih kosong

### Keahlian
- **Keahlian** di Pages CMS
- **Hard Skills**: tambah/edit kategori (Programming & Data Tools, Analytical Competencies, AI & Development Tools) dan item di dalamnya
- **Soft Skills**: tambah soft skill baru — hanya akan tampil jika sudah diisi
- Logo tools bersifat opsional; jika kosong, inisial nama ditampilkan sebagai pengganti

### Pengalaman Kerja
- **Pengalaman Kerja** di Pages CMS
- Isi posisi, institusi, periode, deskripsi, tanggung jawab, kontribusi
- **Galeri Foto**: upload beberapa foto di field **Galeri Foto Dokumentasi** — semua foto akan tampil di modal detail saat kartu diklik
- Klik kartu di website untuk melihat detail lengkap

### Pengalaman Organisasi
- **Pengalaman Organisasi** di Pages CMS — konsep sama dengan pengalaman kerja
- Isi nama organisasi, jabatan, periode, deskripsi, tanggung jawab, kontribusi, galeri foto

### Projects
- **Projects** di Pages CMS
- Isi judul, kategori, deskripsi singkat, latar belakang, metodologi, hasil, tools, peran
- **Galeri Screenshot**: upload foto/screenshot di field **Galeri Screenshot / Foto Proyek**
- Isi tautan media: GitHub, Google Colab, Kaggle, YouTube, Tableau, Looker Studio, dll.
- Media yang tidak diisi akan disembunyikan otomatis

### Sertifikasi
- **Sertifikasi** di Pages CMS (terpisah dari Pelatihan)
- Isi nama sertifikasi, lembaga penerbit, tanggal, nomor sertifikat, URL verifikasi
- Upload foto sertifikat dan/atau PDF

### Pelatihan
- **Pelatihan** di Pages CMS (section dan menu baru, terpisah dari Sertifikasi)
- Isi nama pelatihan, penyelenggara, periode, deskripsi, topik/materi
- Upload foto dokumentasi dan foto sertifikat pelatihan

### Prestasi
- **Prestasi** di Pages CMS
- Isi nama kompetisi, penyelenggara, tahun, pencapaian, deskripsi, foto, sertifikat

### Riset & Publikasi
- **Riset & Publikasi Ilmiah** di Pages CMS
- Isi judul, penulis, tahun, jurnal/prosiding, abstrak, latar belakang, metode, ringkasan hasil
- Upload poster dan galeri foto penelitian
- Isi DOI, URL publikasi, PDF, dan URL video YouTube
- Klik kartu publikasi di website untuk membuka detail + video YouTube embed

### Kontak
- **Kontak** di Pages CMS
- Isi email, URL LinkedIn, URL GitHub, dan tautan profesional lainnya

---

## Cara Mengunggah Foto, Galeri, dan Dokumen

### Cara upload file di Pages CMS
1. Buka bagian konten yang ingin diedit (misal: Projects)
2. Klik proyek yang ingin ditambah foto
3. Temukan field **Galeri Screenshot / Foto Proyek** (atau Galeri Foto Dokumentasi)
4. Klik **Add item** → klik ikon upload → pilih file dari komputer
5. Ulangi untuk setiap foto yang ingin ditambahkan
6. Klik **Save** ketika selesai

### Panduan lokasi file (otomatis ditangani Pages CMS)

| Jenis File | Folder Upload di Pages CMS |
|---|---|
| Foto profil | Foto Profil |
| Thumbnail proyek | Gambar Proyek |
| Galeri proyek | Gambar Proyek |
| Galeri pengalaman kerja | Gambar Pengalaman Kerja |
| Galeri organisasi | Gambar Organisasi |
| Foto prestasi | Gambar Prestasi |
| Galeri penelitian | Gambar Publikasi / Riset |
| Foto sertifikat | Foto Sertifikat |
| PDF sertifikat | Dokumen (CV, PDF) |
| CV | Dokumen (CV, PDF) |

**Tips penamaan file:**
- Gunakan huruf kecil dan tanda hubung: `foto-kerja-1.jpg`
- Hindari spasi, karakter khusus, atau emoji
- Gunakan JPG atau WEBP untuk foto (ukuran lebih kecil)
- Rekomendasi ukuran galeri: 1200×800px atau rasio 4:3

### Cara kerja galeri di website
Ketika foto diunggah ke field galeri, semua foto akan tampil sebagai grid di modal detail.
Pengunjung dapat mengklik foto untuk memperbesar menggunakan lightbox.

---

## Cara Menambahkan Video YouTube

Masukkan **URL lengkap YouTube** ke field yang sesuai. Contoh format yang didukung:

```
https://www.youtube.com/watch?v=xxxxxxxxxxx
https://youtu.be/xxxxxxxxxxx
https://www.youtube.com/shorts/xxxxxxxxxxx
```

Video akan otomatis diembed di modal detail proyek atau detail publikasi.
Jika URL kosong atau tidak diisi, bagian video tidak akan tampil.

---

## Cara Memperbarui Website

1. Edit konten di Pages CMS → klik **Save**
2. Pages CMS commit otomatis ke GitHub
3. Tunggu 1–3 menit untuk GitHub Pages memproses
4. Hard refresh browser: **Ctrl+Shift+R** (Windows) / **Cmd+Shift+R** (Mac)
5. Buka `https://reginaadelisa.github.io` untuk melihat hasilnya

Cek status build: buka repository GitHub → tab **Actions**.

---

## Pemecahan Masalah

### Gambar tidak tampil
- Pastikan nama file tanpa spasi/karakter khusus
- Cek path di JSON cocok dengan lokasi file di repository
- Tekan F12 → Console untuk melihat error 404
- Gambar yang belum diunggah digantikan placeholder otomatis

### PDF tidak tampil (preview)
- Tombol unduh PDF tetap tersedia sebagai alternatif
- Gunakan Chrome/Firefox untuk embed PDF terbaik

### Video YouTube tidak tampil
- Pastikan URL lengkap dan valid
- Pastikan video tidak di-private atau di-restrict embed

### Soft skills tidak muncul di website
- Pastikan field nama soft skill sudah diisi (bukan masih `[...]`)
- Soft skills otomatis tersembunyi jika semua item masih placeholder

### Konten masih menampilkan `[...]`
- Ini normal — buka Pages CMS dan isi field tersebut

### Error JavaScript
- Tekan F12 → Console
- Validasi JSON di [https://jsonlint.com](https://jsonlint.com)
- Pastikan semua field array berupa array yang valid

### Pages CMS tidak menemukan konfigurasi
- Pastikan `.pages.yml` ada di root repository
- Pastikan branch yang dipilih adalah `main`

---

## Teknologi

- **HTML5** — struktur halaman
- **CSS3** — desain responsif dan animasi minimal
- **Vanilla JavaScript** — logika dinamis, fetch JSON, render konten
- **GitHub Pages** — hosting gratis
- **Pages CMS** — antarmuka manajemen konten

## Navigasi Website

| Menu | Section ID |
|---|---|
| Beranda | `#beranda` |
| Keahlian | `#keahlian` |
| Pengalaman Kerja | `#pengalaman-kerja` |
| Pengalaman Organisasi | `#pengalaman-organisasi` |
| Projects | `#projects` |
| Sertifikasi | `#sertifikasi` |
| Pelatihan | `#pelatihan` |
| Prestasi | `#prestasi` |
| Riset & Publikasi | `#publikasi` |
| Kontak | `#kontak` |

---

*Tidak memerlukan proses build atau instalasi paket apapun.*
